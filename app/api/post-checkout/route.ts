import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

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

export async function GET(req: Request) {
  try {
    const { searchParams, origin } = new URL(req.url);
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      return Response.json({ error: "Falta session_id" }, { status: 400 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["customer"],
    });

    if (session.payment_status !== "paid") {
      return Response.json(
        { error: "El pago aún no se confirma. Espera unos segundos y refresca." },
        { status: 402 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customer = session.customer as any;
    const email = customer?.email || session.customer_details?.email || session.customer_email;
    if (!email) {
      return Response.json({ error: "No se pudo recuperar el email del pago" }, { status: 500 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Generar magic link (Supabase) para login automático
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });

    if (linkErr) {
      console.error("[Post-checkout] generateLink error:", linkErr);
      // Si genera error porque ya está logueado u otro motivo, devolvemos solo el email
      return Response.json({ email, redirect_url: null });
    }

    // Devolver el magic link directamente — el cliente redirige a él para login automático
    const magicLink = linkData?.properties?.action_link;
    return Response.json({
      email,
      redirect_url: magicLink || null,
    });
  } catch (error) {
    console.error("Post-checkout error:", error);
    const msg = error instanceof Error ? error.message : "Error procesando pago";
    return Response.json({ error: msg }, { status: 500 });
  }
}
