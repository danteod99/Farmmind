import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// NOWPayments IPN webhook — acredita saldo cuando el pago se confirma
export async function POST(req: Request) {
  try {
    const body = await req.text();
    const data = JSON.parse(body);

    // Verificar firma HMAC si está configurada
    const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
    if (ipnSecret) {
      const signature = req.headers.get("x-nowpayments-sig");
      if (!signature) {
        return new Response("Missing signature", { status: 401 });
      }
      // NOWPayments ordena las claves del payload alfabéticamente para la firma
      const sorted = JSON.stringify(sortObjectKeys(data));
      const hmac = crypto.createHmac("sha512", ipnSecret).update(sorted).digest("hex");
      // Use timing-safe comparison to prevent timing attacks
      const hmacBuf = Buffer.from(hmac, "hex");
      const sigBuf = Buffer.from(signature, "hex");
      if (hmacBuf.length !== sigBuf.length || !crypto.timingSafeEqual(hmacBuf, sigBuf)) {
        console.error("IPN signature mismatch");
        return new Response("Invalid signature", { status: 401 });
      }
    }

    const { payment_id, payment_status, order_id, price_amount, actually_paid } = data;

    console.log(`IPN recibido: payment_id=${payment_id}, status=${payment_status}, order=${order_id}`);

    const admin = getSupabaseAdmin();

    // Buscar transacción por payment_id
    const { data: tx } = await admin
      .from("smm_transactions")
      .select("*")
      .eq("payment_id", payment_id?.toString())
      .single();

    if (!tx) {
      // También intentar por order_id si el payment_id no coincide
      console.warn("Transacción no encontrada por payment_id:", payment_id);
      return new Response("OK", { status: 200 }); // Siempre devolver 200 a NOWPayments
    }

    // Actualizar estado de la transacción
    await admin
      .from("smm_transactions")
      .update({
        status: payment_status,
        actually_paid: actually_paid || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tx.id);

    // Acreditar cuando el pago está FINALIZADO, CONFIRMADO o PARCIALMENTE PAGADO (y no se ha acreditado antes)
    const shouldCredit =
      (payment_status === "finished" || payment_status === "confirmed" || payment_status === "partially_paid") &&
      tx.credited !== true &&
      tx.status !== "finished" && tx.status !== "confirmed";

    if (shouldCredit) {
      // Para partially_paid usamos lo que realmente fue recibido en USD (price_amount fue el objetivo)
      // Si actually_paid existe y es >= 90% del objetivo, acreditamos el precio original
      // de lo contrario acreditamos proporcionalmente
      let amountToCredit = parseFloat(price_amount) || tx.amount;
      if (payment_status === "partially_paid" && actually_paid) {
        // Acreditamos el monto original (price_amount) ya que el usuario pagó en crypto y
        // la diferencia es mínima (fees de red, slippage). Si quisieras ser estricto usa actually_paid_in_usd del webhook.
        amountToCredit = parseFloat(price_amount) || tx.amount;
      }

      // Acreditar balance al usuario (atómico via RPC para evitar race conditions)
      const { error: rpcError } = await admin.rpc("increment_balance", {
        p_user_id: tx.user_id,
        p_amount: amountToCredit,
      });

      if (rpcError) {
        console.error("Error incrementing balance via RPC:", rpcError);
        // No fallback — RPC must exist. Log error for manual resolution.
        return new Response("Balance credit failed", { status: 500 });
      }

      // Marcar transacción como acreditada
      await admin
        .from("smm_transactions")
        .update({ status: "finished", credited: true })
        .eq("id", tx.id);

      console.log(`Balance acreditado: user=${tx.user_id}, +$${amountToCredit}`);
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Error", { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sortObjectKeys(obj: Record<string, any>): Record<string, any> {
  return Object.keys(obj).sort().reduce((result: Record<string, any>, key: string) => {
    result[key] = obj[key] && typeof obj[key] === "object" && !Array.isArray(obj[key])
      ? sortObjectKeys(obj[key])
      : obj[key];
    return result;
  }, {});
}
