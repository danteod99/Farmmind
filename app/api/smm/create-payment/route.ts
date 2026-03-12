import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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

    const { amount, currency } = await req.json();

    if (!amount || amount < 11 || amount > 500) {
      return Response.json({ error: "Monto inválido (mínimo $11, máximo $500)" }, { status: 400 });
    }
    if (!currency) {
      return Response.json({ error: "Selecciona un método de pago" }, { status: 400 });
    }

    const apiKey = process.env.NOWPAYMENTS_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "Pagos crypto no configurados aún. Contacta al administrador." }, { status: 503 });
    }

    const origin = "https://farmmind-livid.vercel.app";

    // Usar /v1/payment para obtener dirección crypto directa
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
        order_id: `farmmind_${user.id}_${Date.now()}`,
        order_description: `Recarga FarmMind SMM - $${amount} USD`,
        ipn_callback_url: `${origin}/api/smm/payment-webhook`,
      }),
    });

    if (!npRes.ok) {
      const errData = await npRes.json().catch(() => ({}));
      console.error("NOWPayments error:", errData);
      return Response.json({
        error: "Error al crear el pago. Intenta con otra criptomoneda.",
      }, { status: 400 });
    }

    const npData = await npRes.json();

    // Guardar transacción pendiente en Supabase
    const admin = getSupabaseAdmin();
    await admin.from("smm_transactions").insert({
      user_id: user.id,
      payment_id: npData.payment_id?.toString(),
      amount: parseFloat(amount),
      currency: currency,
      status: "waiting",
      nowpayments_data: npData,
    });

    return Response.json({
      payment_url: null,
      payment_id: npData.payment_id,
      pay_address: npData.pay_address || "",
      pay_amount: npData.pay_amount || amount,
      pay_currency: npData.pay_currency || currency,
      amount_usd: parseFloat(amount),
    });

  } catch (error) {
    console.error("Create payment error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
