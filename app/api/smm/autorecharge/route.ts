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

async function getAuthedUser() {
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
  return user;
}

// GET → estado actual de auto-recarga del usuario
export async function GET() {
  try {
    const user = await getAuthedUser();
    if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("smm_autorecharge")
      .select("status, amount_usd, interval, next_charge_at, last_charged_at, stripe_subscription_id, created_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Autorecharge GET error:", error);
      return Response.json({ error: "Error al consultar auto-recarga" }, { status: 500 });
    }

    if (!data) {
      return Response.json({ active: false });
    }

    return Response.json({
      active: data.status === "active",
      status: data.status,
      amount_usd: data.amount_usd,
      interval: data.interval,
      next_charge_at: data.next_charge_at,
      last_charged_at: data.last_charged_at,
      created_at: data.created_at,
    });
  } catch (error) {
    console.error("Autorecharge GET exception:", error);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE → cancela la auto-recarga inmediatamente
export async function DELETE() {
  try {
    const user = await getAuthedUser();
    if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });

    const admin = getSupabaseAdmin();
    const { data: row, error: selErr } = await admin
      .from("smm_autorecharge")
      .select("stripe_subscription_id, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (selErr || !row) {
      return Response.json({ error: "No hay auto-recarga configurada" }, { status: 404 });
    }

    if (row.status === "canceled") {
      return Response.json({ ok: true, already_canceled: true });
    }

    if (!row.stripe_subscription_id) {
      // estado inconsistente; marcar canceled localmente
      await admin
        .from("smm_autorecharge")
        .update({ status: "canceled" })
        .eq("user_id", user.id);
      return Response.json({ ok: true });
    }

    const stripe = getStripe();
    await stripe.subscriptions.cancel(row.stripe_subscription_id);

    // El webhook customer.subscription.deleted también va a marcar canceled.
    // Lo hacemos aquí para que la UI refleje el estado inmediatamente.
    await admin
      .from("smm_autorecharge")
      .update({ status: "canceled" })
      .eq("user_id", user.id);

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Autorecharge DELETE error:", error);
    const msg = error instanceof Error ? error.message : "Error cancelando";
    return Response.json({ error: msg }, { status: 500 });
  }
}
