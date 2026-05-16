import Stripe from "stripe";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || "sk_placeholder", {
    apiVersion: "2026-02-25.clover",
  });
}

// POST /api/network/checkout
// Crea Stripe Checkout para la suscripcion de $200/mes que da acceso a la red.
// Usa NEXT_PUBLIC_STRIPE_NETWORK_PRICE_ID o cae a STRIPE_PRO_PRICE_ID si no existe.
export async function POST() {
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

    const priceId =
      process.env.NEXT_PUBLIC_STRIPE_NETWORK_PRICE_ID ||
      process.env.STRIPE_NETWORK_PRICE_ID ||
      process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID;

    if (!priceId) {
      return Response.json(
        { error: "Falta configurar NEXT_PUBLIC_STRIPE_NETWORK_PRICE_ID en Vercel" },
        { status: 500 }
      );
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://www.trustmind.online";
    const stripe = getStripe();

    // Buscar/crear customer
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
      await supabase.from("profiles").upsert({ id: user.id, stripe_customer_id: customerId });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/bienvenida?payment=success`,
      cancel_url: `${origin}/network?payment=cancel`,
      subscription_data: {
        metadata: { supabase_user_id: user.id, plan_type: "network" },
      },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error("Network checkout error:", error);
    return Response.json({ error: "Error creando sesion de pago" }, { status: 500 });
  }
}
