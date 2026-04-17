import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Verifica el estado actual de un pago en NOWPayments y acredita si está completado
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setAll(cookiesToSet: any[]) {
            cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: unknown }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });

    const { payment_id } = await req.json();
    if (!payment_id) return Response.json({ error: "payment_id requerido" }, { status: 400 });

    const admin = getSupabaseAdmin();

    // Verificar que la transacción pertenece al usuario
    const { data: tx } = await admin
      .from("smm_transactions")
      .select("*")
      .eq("payment_id", payment_id.toString())
      .eq("user_id", user.id)
      .single();

    if (!tx) {
      return Response.json({ error: "Transacción no encontrada" }, { status: 404 });
    }

    // Si ya fue acreditada, devolver el estado actual
    if (tx.credited === true) {
      return Response.json({ status: "credited", message: "Pago ya acreditado", credited: true });
    }

    // Consultar estado en NOWPayments
    const apiKey = process.env.NOWPAYMENTS_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "Servicio no configurado" }, { status: 503 });
    }

    const npRes = await fetch(`https://api.nowpayments.io/v1/payment/${payment_id}`, {
      headers: { "x-api-key": apiKey },
    });

    if (!npRes.ok) {
      return Response.json({ error: "Error al consultar NOWPayments" }, { status: 502 });
    }

    const npData = await npRes.json();
    const { payment_status, price_amount, actually_paid } = npData;

    // Actualizar estado en DB
    await admin
      .from("smm_transactions")
      .update({
        status: payment_status,
        actually_paid: actually_paid || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tx.id);

    // Acreditar si el pago está finalizado o parcialmente pagado (>= 90% del monto)
    const actuallyPaidUsd = parseFloat(npData.actually_paid_at_fiat || "0") || parseFloat(npData.outcome_amount || "0") || 0;
    const targetAmount = parseFloat(price_amount) || tx.amount;
    const paidEnough = payment_status === "partially_paid" && actuallyPaidUsd >= targetAmount * 0.9;
    const shouldCredit =
      (payment_status === "finished" || payment_status === "confirmed" || paidEnough) &&
      tx.credited !== true;

    if (shouldCredit) {
      const amountToCredit = parseFloat(price_amount) || tx.amount;
      let bonusAmount = 0;

      // Apply promo code bonus if present and not yet applied
      if (tx.promo_code && !tx.promo_applied) {
        // First, atomically mark the transaction as promo_applied to prevent double-application
        const { data: lockResult } = await admin
          .from("smm_transactions")
          .update({ promo_applied: true })
          .eq("id", tx.id)
          .eq("promo_applied", false)
          .select("id")
          .single();

        // Only apply promo if we successfully "locked" it (prevents race condition)
        if (lockResult) {
          const { data: promo } = await admin
            .from("promo_codes")
            .select("*")
            .eq("code", tx.promo_code)
            .eq("active", true)
            .single();

          if (
            promo &&
            amountToCredit >= promo.min_recharge &&
            promo.current_uses < promo.max_uses &&
            (!promo.expires_at || new Date(promo.expires_at) >= new Date())
          ) {
            bonusAmount = parseFloat(promo.bonus_usd) || 0;

            // Increment promo usage count atomically using RPC to prevent race conditions
            // where parallel requests read the same current_uses and both write +1
            const { error: promoIncError } = await admin.rpc("increment_promo_uses", {
              p_promo_id: promo.id,
              p_max_uses: promo.max_uses,
            });

            if (promoIncError) {
              // If increment failed (e.g., max uses reached), revert the promo lock
              console.error("Failed to increment promo uses:", promoIncError);
              await admin
                .from("smm_transactions")
                .update({ promo_applied: false })
                .eq("id", tx.id);
              bonusAmount = 0;
            } else {
              console.log(`Promo "${tx.promo_code}" applied: +$${bonusAmount} bonus for user=${tx.user_id}`);
            }
          }
        }
      }

      const totalToCredit = amountToCredit + bonusAmount;

      // Increment balance atomically via RPC (no fallback — RPC must exist)
      const { data: newBalance, error: rpcError } = await admin.rpc("increment_balance", {
        p_user_id: tx.user_id,
        p_amount: totalToCredit,
      });

      if (rpcError) {
        console.error("Error incrementing balance via RPC:", rpcError);
        return Response.json({ error: "Error al acreditar saldo" }, { status: 500 });
      }

      const finalBalance = parseFloat(newBalance) || 0;

      await admin
        .from("smm_transactions")
        .update({
          status: "finished",
          credited: true,
          // Don't overwrite promo_applied here — it was already set atomically by the lock above.
          // Setting it to false here would undo the lock and re-open the race condition.
        })
        .eq("id", tx.id);

      console.log(`✅ Pago verificado y acreditado: user=${tx.user_id}, +$${amountToCredit}${bonusAmount > 0 ? ` + $${bonusAmount} bono` : ""}`);

      const message = bonusAmount > 0
        ? `¡Pago confirmado! Se acreditaron $${amountToCredit.toFixed(2)} USD + $${bonusAmount.toFixed(2)} USD de bono 🎉`
        : `¡Pago confirmado! Se acreditaron $${amountToCredit.toFixed(2)} USD a tu cuenta.`;

      return Response.json({
        status: "credited",
        message,
        credited: true,
        new_balance: finalBalance,
        amount_credited: amountToCredit,
        bonus_applied: bonusAmount,
      });
    }

    // Mapear status a mensaje en español
    const statusMessages: Record<string, string> = {
      waiting: "Esperando pago — aún no se detectó la transacción en la blockchain.",
      confirming: "Pago detectado, esperando confirmaciones de la red.",
      confirmed: "Pago confirmado.",
      sending: "Procesando acreditación.",
      partially_paid: "Pago parcialmente recibido.",
      finished: "Pago completado.",
      failed: "Pago fallido.",
      refunded: "Pago devuelto.",
      expired: "El tiempo de pago expiró. Genera un nuevo pago.",
    };

    return Response.json({
      status: payment_status,
      message: statusMessages[payment_status] || `Estado: ${payment_status}`,
      credited: false,
    });

  } catch (error) {
    console.error("Check payment error:", error);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
