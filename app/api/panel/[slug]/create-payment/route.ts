/**
 * POST /api/panel/[slug]/create-payment
 * Creates a NOWPayments crypto payment for a child panel client.
 * Same logic as /api/smm/create-payment but tracks reseller_id.
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
    const { slug } = await params;
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

    const admin = getAdmin();

    // Find reseller
    const { data: reseller } = await admin
      .from("smm_resellers")
      .select("id")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (!reseller) {
      return Response.json({ error: "Panel not found" }, { status: 404 });
    }

    const { amount, currency, promo_code } = await req.json();

    if (!amount || amount < 11 || amount > 500) {
      return Response.json({ error: "Monto inválido (mínimo $11, máximo $500)" }, { status: 400 });
    }
    if (!currency) {
      return Response.json({ error: "Selecciona un método de pago" }, { status: 400 });
    }

    const apiKey = process.env.NOWPAYMENTS_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "Pagos crypto no configurados" }, { status: 503 });
    }

    const origin = "https://www.trustmind.online";
    const orderId = `trustmind_${user.id}_${Date.now()}`;

    const npRes = await fetch("https://api.nowpayments.io/v1/payment", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        price_amount: amount,
        price_currency: "usd",
        pay_currency: currency,
        order_id: orderId,
        order_description: `Recarga ${slug} panel - $${amount} USD`,
        ipn_callback_url: `${origin}/api/smm/payment-webhook`,
      }),
    });

    if (!npRes.ok) {
      const errData = await npRes.json().catch(() => ({}));
      console.error("[Panel Payment] NOWPayments error:", errData);
      return Response.json({ error: "Error creando pago" }, { status: 500 });
    }

    const npData = await npRes.json();

    // Save transaction with reseller_id
    await admin.from("smm_transactions").insert({
      user_id: user.id,
      payment_id: String(npData.payment_id),
      amount,
      currency,
      status: "waiting",
      credited: false,
      promo_code: promo_code || null,
      promo_applied: false,
      reseller_id: reseller.id,
      nowpayments_data: npData,
    });

    return Response.json({
      payment_id: npData.payment_id,
      pay_address: npData.pay_address,
      pay_amount: npData.pay_amount,
      pay_currency: npData.pay_currency,
      amount_usd: amount,
    });
  } catch (e) {
    console.error("[Panel Payment]", e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
