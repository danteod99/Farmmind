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
      if (hmac !== signature) {
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

    // Solo acreditar cuando el pago está FINALIZADO y no se ha acreditado antes
    if (
      (payment_status === "finished" || payment_status === "confirmed") &&
      tx.status !== "finished" && tx.status !== "confirmed"
    ) {
      const amountToCredit = parseFloat(price_amount) || tx.amount;

      // Acreditar balance al usuario
      const { data: balance } = await admin
        .from("smm_balances")
        .select("balance")
        .eq("user_id", tx.user_id)
        .single();

      const currentBalance = balance?.balance || 0;
      const newBalance = currentBalance + amountToCredit;

      await admin
        .from("smm_balances")
        .upsert({
          user_id: tx.user_id,
          balance: newBalance,
          updated_at: new Date().toISOString(),
        });

      // Marcar transacción como acreditada
      await admin
        .from("smm_transactions")
        .update({ status: "finished", credited: true })
        .eq("id", tx.id);

      console.log(`✅ Balance acreditado: user=${tx.user_id}, +$${amountToCredit}, nuevo balance=$${newBalance}`);
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
