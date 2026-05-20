import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

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

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  if (!session_id) {
    redirect("/?error=no_session");
  }

  const hdrs = await headers();
  const host = hdrs.get("host") || "www.trustmind.online";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;

  const stripe = getStripe();
  const supabaseAdmin = getSupabaseAdmin();

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id!, {
      expand: ["customer", "subscription"],
    });

    if (session.payment_status !== "paid") {
      return (
        <ErrorScreen
          title="Pago aún no confirmado"
          message="Tu pago se está procesando. Refresca esta página en unos segundos."
        />
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customer = session.customer as any;
    const email =
      customer?.email ||
      session.customer_details?.email ||
      session.customer_email;

    if (!email) {
      return <ErrorScreen title="Error" message="No se pudo recuperar tu email del pago. Contacta soporte." />;
    }

    // ─── 1. Crear o encontrar user ───
    let userId: string;
    const { data: existingList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const existing = existingList.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
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
        console.error("[/welcome] createUser error:", createErr);
        return <ErrorScreen title="Error" message={createErr?.message || "No se pudo crear tu cuenta"} />;
      }
      userId = created.user.id;
      await supabaseAdmin
        .from("smm_balances")
        .insert({ user_id: userId, balance: 0 })
        .select()
        .maybeSingle();
    }

    // ─── 2. Activar Pro + bundle + saldo ───
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscription = session.subscription as any;
    if (subscription) {
      const periodEndUnix =
        subscription.current_period_end ||
        subscription.items?.data?.[0]?.current_period_end ||
        Math.floor(Date.now() / 1000) + 30 * 24 * 3600;
      const periodEndIso = new Date(periodEndUnix * 1000).toISOString();
      const customerId =
        typeof session.customer === "string" ? session.customer : session.customer?.id;

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

      // Acreditar saldo SMM equivalente al monto pagado (idempotente)
      try {
        const amountPaid = (session.amount_total || 0) / 100;
        const invoiceId = (subscription.latest_invoice as string) || `cs_${session.id}`;
        if (amountPaid > 0) {
          const { data: existingTx } = await supabaseAdmin
            .from("smm_transactions")
            .select("id")
            .eq("stripe_invoice_id", invoiceId)
            .maybeSingle();
          if (!existingTx) {
            await supabaseAdmin.rpc("increment_balance", {
              p_user_id: userId,
              p_amount: amountPaid,
            });
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
          }
        }
      } catch (creditErr) {
        console.error("[/welcome] Error acreditando saldo:", creditErr);
      }

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
        console.warn("[/welcome] no se pudo actualizar metadata del sub:", metaErr);
      }
    }

    // ─── 3. Generar magic link + redirect directo ───
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });

    if (linkErr || !linkData?.properties?.action_link) {
      console.error("[/welcome] generateLink error:", linkErr);
      return (
        <ManualLoginScreen
          email={email}
        />
      );
    }

    // Redirect inmediato server-side al magic link → /auth/callback → /smm/services
    redirect(linkData.properties.action_link);
  } catch (e) {
    // Next.js redirect lanza un error especial: dejarlo propagar
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((e as any)?.digest?.startsWith("NEXT_REDIRECT")) throw e;
    console.error("[/welcome] error:", e);
    return (
      <ErrorScreen
        title="Algo no salió bien"
        message={e instanceof Error ? e.message : "Error procesando tu pago. Tu pago se procesó correctamente, contacta soporte."}
      />
    );
  }
}

function ErrorScreen({ title, message }: { title: string; message: string }) {
  return (
    <div style={{ minHeight: "100vh", background: "#07070e", color: "#f0efff", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ maxWidth: "520px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", padding: "18px", borderRadius: "20px", background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", marginBottom: "24px", fontSize: "32px" }}>⚠️</div>
        <h1 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "12px" }}>{title}</h1>
        <p style={{ fontSize: "14px", color: "#94a3b8", marginBottom: "24px", lineHeight: 1.6 }}>{message}</p>
        <p style={{ fontSize: "13px", color: "#64748b" }}>
          Contacta soporte:{" "}
          <a href="https://wa.me/51931119176" style={{ color: "#7dd3fc", textDecoration: "underline" }}>
            WhatsApp +51 931 119 176
          </a>
        </p>
      </div>
    </div>
  );
}

function ManualLoginScreen({ email }: { email: string }) {
  return (
    <div style={{ minHeight: "100vh", background: "#07070e", color: "#f0efff", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ maxWidth: "520px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", padding: "18px", borderRadius: "20px", background: "rgba(52, 211, 153, 0.12)", border: "1px solid rgba(52, 211, 153, 0.3)", marginBottom: "24px", fontSize: "36px" }}>🎉</div>
        <h1 style={{ fontSize: "clamp(28px, 4vw, 36px)", fontWeight: 900, marginBottom: "16px" }}>¡Pago confirmado!</h1>
        <p style={{ fontSize: "15px", color: "#94a3b8", marginBottom: "28px", lineHeight: 1.6 }}>
          Tu suscripción a <strong style={{ color: "white" }}>TRUST MIND Pro</strong> está activa.
          Ingresa al panel con tu cuenta de Google usando <strong style={{ color: "#7dd3fc" }}>{email}</strong>.
        </p>
        <a href="/" style={{ display: "inline-block", padding: "16px 28px", borderRadius: "14px", background: "linear-gradient(135deg, #007ABF, #00B4D8)", color: "white", fontSize: "15px", fontWeight: 800, textDecoration: "none" }}>
          Ir al panel →
        </a>
      </div>
    </div>
  );
}
