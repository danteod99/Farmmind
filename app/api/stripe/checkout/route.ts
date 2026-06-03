import Stripe from "stripe";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { sendFbEvent } from "@/app/lib/fb-capi";

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

    const body = await req.json();
    const { priceId, fbEventId, fbPlan, fbValue } = body || {};
    if (!priceId || typeof priceId !== "string" || !priceId.startsWith("price_")) {
      return Response.json(
        { error: "Price ID inválido. Contacta a soporte (config de Stripe falta)." },
        { status: 400 }
      );
    }

    const origin = req.headers.get("origin") || "https://www.trustmind.online";
    const stripe = getStripe();

    // FB CAPI InitiateCheckout — pareado con Pixel client-side via fbEventId.
    // Lo enviamos en background (sin await) para no demorar el checkout.
    if (fbEventId) {
      const cookieHeader = req.headers.get("cookie") || "";
      const fbpMatch = cookieHeader.match(/_fbp=([^;]+)/);
      const fbcMatch = cookieHeader.match(/_fbc=([^;]+)/);
      sendFbEvent({
        eventName: "InitiateCheckout",
        eventId: String(fbEventId),
        email: user?.email,
        amount: typeof fbValue === "number" ? fbValue : undefined,
        currency: "USD",
        contentName: fbPlan === "yearly" ? "TRUST MIND Pro Anual" : "TRUST MIND Pro Mensual",
        contentType: "subscription",
        fbp: fbpMatch?.[1] || null,
        fbc: fbcMatch?.[1] || null,
        ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
        userAgent: req.headers.get("user-agent") || null,
        eventSourceUrl: req.headers.get("referer") || origin + "/oferta",
      }).catch(() => {});
    }

    // ─── Modo GUEST: sin sesión, Stripe Checkout recolecta email
    // En mode='subscription' Stripe siempre crea customer automático con el email,
    // no se necesita customer_creation (solo válido en mode='payment').
    if (!user) {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${origin}/welcome?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/?payment=cancel`,
        allow_promotion_codes: true,
        subscription_data: {
          metadata: { pending_account: "true" },
        },
        metadata: { pending_account: "true" },
      });
      return Response.json({ url: session.url });
    }

    // ─── Modo LOGUEADO: customer atado a supabase user
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

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
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    const message = error instanceof Error ? error.message : "Error creando sesión de pago";
    return Response.json({ error: message }, { status: 500 });
  }
}
