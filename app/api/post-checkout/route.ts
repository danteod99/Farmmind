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
      expand: ["customer", "subscription"],
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

    // ─── 1. Crear o encontrar user Supabase (idempotente) ───
    let userId: string;
    const { data: existingList } = await supabaseAdmin.auth.admin.listUsers();
    const existing = existingList.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (existing) {
      userId = existing.id;
    } else {
      const fullName = (customer?.name as string) || email.split("@")[0];
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (createErr || !created?.user) {
        console.error("[Post-checkout] createUser error:", createErr);
        return Response.json({ error: createErr?.message || "No se pudo crear la cuenta" }, { status: 500 });
      }
      userId = created.user.id;
      // Crear smm_balance row para nuevo user
      await supabaseAdmin.from("smm_balances").insert({ user_id: userId, balance: 0 }).select().maybeSingle();
    }

    // ─── 2. Activar Pro tier + bundle (no esperar al webhook) ───
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscription = session.subscription as any;
    if (subscription) {
      const periodEndUnix = subscription.current_period_end
        || subscription.items?.data?.[0]?.current_period_end
        || Math.floor(Date.now() / 1000) + 30 * 24 * 3600; // fallback 30 días
      const periodEndIso = new Date(periodEndUnix * 1000).toISOString();
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;

      await supabaseAdmin.from("profiles").upsert({
        id: userId,
        stripe_customer_id: customerId,
        subscription_status: subscription.status || "active",
        stripe_subscription_id: subscription.id,
        subscription_plan: "pro",
        subscription_period_end: periodEndIso,
      });

      await supabaseAdmin.from("tm_subscriptions").upsert(
        {
          user_id: userId,
          product: "bundle",
          tier: "pro",
          expires_at: periodEndIso,
          stripe_subscription_id: subscription.id,
        },
        { onConflict: "user_id,product" }
      );

      // Actualizar metadata del sub para futuras webhooks
      try {
        await stripe.subscriptions.update(subscription.id, {
          metadata: {
            ...(subscription.metadata || {}),
            supabase_user_id: userId,
            pending_account: "false",
          },
        });
      } catch (metaErr) {
        console.warn("[Post-checkout] no se pudo actualizar metadata del sub:", metaErr);
      }

      // ─── Acreditar saldo SMM equivalente al monto pagado ───
      // Idempotente vía stripe_invoice_id (no duplica si el webhook también acredita)
      try {
        const amountPaid = (session.amount_total || 0) / 100;
        const invoiceId = (subscription.latest_invoice as string) || `cs_${session.id}`;
        if (amountPaid > 0) {
          const { data: existing } = await supabaseAdmin
            .from("smm_transactions")
            .select("id")
            .eq("stripe_invoice_id", invoiceId)
            .maybeSingle();
          if (!existing) {
            const { error: rpcErr } = await supabaseAdmin.rpc("increment_balance", {
              p_user_id: userId,
              p_amount: amountPaid,
            });
            if (!rpcErr) {
              await supabaseAdmin.from("smm_transactions").insert({
                user_id: userId,
                payment_id: invoiceId,
                amount: amountPaid,
                currency: "usd_card",
                status: "finished",
                credited: true,
                payment_provider: "stripe",
                stripe_invoice_id: invoiceId,
                stripe_subscription_id: subscription.id,
              });
              console.log(`[Post-checkout] +$${amountPaid} acreditados a ${email}`);
            }
          }
        }
      } catch (creditErr) {
        console.error("[Post-checkout] Error acreditando saldo:", creditErr);
      }
    }

    // ─── 3. Generar magic link (Supabase) para login automático ───
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });

    if (linkErr) {
      console.error("[Post-checkout] generateLink error:", linkErr);
      return Response.json({ email, redirect_url: null });
    }

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
