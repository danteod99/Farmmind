import Stripe from "stripe";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || "sk_placeholder", {
    apiVersion: "2026-02-25.clover",
  });
}

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
          getAll() {
            return cookieStore.getAll();
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setAll(cookiesToSet: any[]) {
            cookiesToSet.forEach(
              ({ name, value, options }: { name: string; value: string; options: unknown }) =>
                cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const { amount, interval } = await req.json();
    const amountNum = parseFloat(amount);
    const intervalSafe: "month" | "year" = interval === "year" ? "year" : "month";

    // Mensual: $50–$500. Anual: pago fijo $240.
    if (intervalSafe === "month") {
      if (!amountNum || amountNum < 50 || amountNum > 500) {
        return Response.json(
          { error: "Monto mensual inválido (mínimo $50, máximo $500)" },
          { status: 400 }
        );
      }
    } else {
      if (amountNum !== 240) {
        return Response.json(
          { error: "El plan anual es de $240/año fijo" },
          { status: 400 }
        );
      }
    }

    const admin = getSupabaseAdmin();

    // Bloquear si ya existe auto-recarga activa para este usuario
    const { data: existing } = await admin
      .from("smm_autorecharge")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing && existing.status === "active") {
      return Response.json(
        { error: "Ya tienes una auto-recarga activa. Cancélala antes de crear una nueva." },
        { status: 409 }
      );
    }

    const stripe = getStripe();

    // Buscar o crear Stripe customer (reutiliza la lógica de /api/stripe/checkout)
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        name: user.user_metadata?.full_name || user.email!,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      await admin
        .from("profiles")
        .upsert({ id: user.id, stripe_customer_id: customerId });
    }

    const origin = req.headers.get("origin") || "https://www.trustmind.online";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: intervalSafe === "year"
                ? `Auto-recarga anual TrustMind SMM — $240/año ($20/mes)`
                : `Auto-recarga TrustMind SMM — $${amountNum}/mes`,
            },
            unit_amount: Math.round(amountNum * 100),
            recurring: { interval: intervalSafe },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/smm/funds?autorecharge=success`,
      cancel_url: `${origin}/smm/funds?autorecharge=cancel`,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: {
          purpose: "smm_autorecharge",
          supabase_user_id: user.id,
          amount_usd: amountNum.toString(),
          interval: intervalSafe,
        },
      },
      metadata: {
        purpose: "smm_autorecharge",
        supabase_user_id: user.id,
        amount_usd: amountNum.toString(),
        interval: intervalSafe,
      },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error("Stripe autorecharge checkout error:", error);
    const msg = error instanceof Error ? error.message : "Error creando sesión de pago";
    return Response.json({ error: msg }, { status: 500 });
  }
}
