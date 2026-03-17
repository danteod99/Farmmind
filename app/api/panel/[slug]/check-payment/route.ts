/**
 * POST /api/panel/[slug]/check-payment
 * Manual payment verification for child panel clients.
 * Reuses same NOWPayments check logic.
 */

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });

    const { payment_id } = await req.json();
    if (!payment_id) return Response.json({ error: "payment_id requerido" }, { status: 400 });

    const admin = getAdmin();
    const apiKey = process.env.NOWPAYMENTS_API_KEY;
    if (!apiKey) return Response.json({ error: "Pagos no configurados" }, { status: 503 });

    // Check payment status at NOWPayments
    const npRes = await fetch(`https://api.nowpayments.io/v1/payment/${payment_id}`, {
      headers: { "x-api-key": apiKey },
    });

    if (!npRes.ok) {
      return Response.json({ error: "No se pudo verificar el pago" }, { status: 500 });
    }

    const npData = await npRes.json();

    // Update transaction
    await admin
      .from("smm_transactions")
      .update({
        status: npData.payment_status,
        actually_paid: npData.actually_paid || 0,
        nowpayments_data: npData,
      })
      .eq("payment_id", String(payment_id))
      .eq("user_id", user.id);

    // Credit balance if finished/confirmed
    const creditStatuses = ["finished", "confirmed", "partially_paid"];
    if (creditStatuses.includes(npData.payment_status)) {
      // Get the transaction
      const { data: tx } = await admin
        .from("smm_transactions")
        .select("id, amount, credited, promo_code, promo_applied")
        .eq("payment_id", String(payment_id))
        .eq("user_id", user.id)
        .single();

      if (tx && !tx.credited) {
        let creditAmount = parseFloat(tx.amount);

        // Apply promo code bonus if applicable
        if (tx.promo_code && !tx.promo_applied) {
          const { data: promo } = await admin
            .from("promo_codes")
            .select("id, bonus_usd, min_recharge, max_uses, current_uses, active, expires_at")
            .eq("code", tx.promo_code)
            .single();

          if (promo && promo.active && promo.current_uses < promo.max_uses) {
            const notExpired = !promo.expires_at || new Date(promo.expires_at) > new Date();
            if (notExpired && creditAmount >= promo.min_recharge) {
              creditAmount += parseFloat(promo.bonus_usd);
              await admin.from("promo_codes").update({ current_uses: promo.current_uses + 1 }).eq("id", promo.id);
              await admin.from("smm_transactions").update({ promo_applied: true }).eq("id", tx.id);
            }
          }
        }

        // Credit balance
        const { data: existing } = await admin
          .from("smm_balances")
          .select("balance")
          .eq("user_id", user.id)
          .single();

        if (existing) {
          await admin
            .from("smm_balances")
            .update({ balance: parseFloat(existing.balance) + creditAmount })
            .eq("user_id", user.id);
        } else {
          await admin.from("smm_balances").insert({ user_id: user.id, balance: creditAmount });
        }

        // Mark as credited
        await admin.from("smm_transactions").update({ credited: true, status: "finished" }).eq("id", tx.id);

        // Get new balance
        const { data: newBal } = await admin
          .from("smm_balances")
          .select("balance")
          .eq("user_id", user.id)
          .single();

        return Response.json({
          credited: true,
          amount: creditAmount,
          new_balance: parseFloat(newBal?.balance ?? 0),
          message: `$${creditAmount.toFixed(2)} USD acreditados a tu cuenta`,
        });
      }
    }

    return Response.json({
      credited: false,
      status: npData.payment_status,
      message: `Estado del pago: ${npData.payment_status}`,
    });
  } catch (e) {
    console.error("[Panel Check Payment]", e);
    return Response.json({ error: "Error verificando pago" }, { status: 500 });
  }
}
