import Stripe from "stripe";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || "sk_placeholder", {
    apiVersion: "2026-02-25.clover",
  });
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
              ({
                name,
                value,
                options,
              }: {
                name: string;
                value: string;
                options: unknown;
              }) =>
                cookieStore.set(
                  name,
                  value,
                  options as Parameters<typeof cookieStore.set>[2]
                )
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const { priceId } = await req.json();
    const origin = req.headers.get("origin") || "https://trustmind-livid.vercel.app";
    const stripe = getStripe();

    // Buscar o crear customer en Stripe
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

      await supabase
        .from("profiles")
        .upsert({ id: user.id, stripe_customer_id: customerId });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?payment=success`,
      cancel_url: `${origin}/?payment=cancel`,
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return Response.json({ error: "Error creando sesión de pago" }, { status: 500 });
  }
}
