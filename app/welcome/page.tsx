import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { sendFbPurchaseEvent } from "@/app/lib/fb-capi";

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

    // ─── 1. Crear o encontrar user (resistente a race con webhook) ───
    // El webhook Stripe puede ejecutarse en paralelo y crear el mismo user.
    // Estrategia: buscar primero; si no existe intentar crear; si colisiona,
    // re-buscar (caso race).
    const findByEmail = async (target: string): Promise<{ id: string } | null> => {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const found = list.users.find((u) => u.email?.toLowerCase() === target.toLowerCase());
      return found ? { id: found.id } : null;
    };

    let userId: string;
    const initial = await findByEmail(email);
    if (initial) {
      userId = initial.id;
    } else {
      const fullName = (customer?.name as string) || email.split("@")[0];
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

      if (created?.user) {
        userId = created.user.id;
        await supabaseAdmin
          .from("smm_balances")
          .insert({ user_id: userId, balance: 0 })
          .select()
          .maybeSingle();
      } else {
        // Race: el webhook probablemente lo creó entre nuestra búsqueda y este insert
        const isAlreadyExists =
          createErr?.message?.toLowerCase().includes("already") ||
          (createErr as { code?: string })?.code === "email_exists";
        if (isAlreadyExists) {
          const retry = await findByEmail(email);
          if (!retry) {
            console.error("[/welcome] createUser said exists pero no lo encuentro:", createErr);
            return <ErrorScreen title="Error" message="Conflicto creando tu cuenta. Refresca esta página en unos segundos." />;
          }
          userId = retry.id;
        } else {
          console.error("[/welcome] createUser error:", createErr);
          return <ErrorScreen title="Error" message={createErr?.message || "No se pudo crear tu cuenta"} />;
        }
      }
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

    // ─── 3. Enviar evento Purchase a Facebook Conversions API ───
    try {
      const amountPaid = (session.amount_total || 0) / 100;
      if (amountPaid > 0) {
        const cookieStore = await cookies();
        const fbp = cookieStore.get("_fbp")?.value || null;
        const fbc = cookieStore.get("_fbc")?.value || null;
        // Recuperar fbclid del attribution si existe
        let fbclid: string | null = null;
        try {
          const { data: attr } = await supabaseAdmin
            .from("user_attribution")
            .select("fbclid")
            .eq("user_id", userId)
            .maybeSingle();
          fbclid = attr?.fbclid || null;
        } catch { /* ignore */ }

        const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim()
          || hdrs.get("x-real-ip")
          || null;
        const userAgent = hdrs.get("user-agent") || null;

        // No await: dispara en background, no bloquear redirect
        sendFbPurchaseEvent({
          email,
          amount: amountPaid,
          eventId: session.id, // mismo que el Pixel client-side
          fbp,
          fbc,
          fbclid,
          ipAddress: ip,
          userAgent,
          eventSourceUrl: `${origin}/welcome`,
        }).catch((e) => console.error("[/welcome] CAPI fail:", e));
      }
    } catch (capiErr) {
      console.error("[/welcome] CAPI setup error:", capiErr);
    }

    // ─── 4. Generar magic link + redirect directo (params para Pixel client) ───
    const amountForPixel = (session.amount_total || 0) / 100;
    // registered=1 → /smm/services dispara fbq CompleteRegistration
    const callbackUrl = `${origin}/auth/callback?purchase=${session.id}&amount=${amountForPixel}&registered=1`;
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: callbackUrl,
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

    // Mostrar página de éxito con CTAs claros + auto-redirect via magic link
    // tras 6s (en caso que el user no haga click). Esto evita la "pantalla
    // en blanco" durante el redirect y le da al user contexto visual.
    return (
      <SuccessScreen
        email={email}
        magicLink={linkData.properties.action_link}
        amountPaid={(session.amount_total || 0) / 100}
      />
    );
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

function SuccessScreen({ email, magicLink, amountPaid }: { email: string; magicLink: string; amountPaid: number }) {
  // Escape para inyectar en script inline (server-safe)
  const safeUrl = JSON.stringify(magicLink);
  return (
    <>
      {/* Auto-redirect tras 6s si el user no hace click — fallback de UX */}
      <script
        dangerouslySetInnerHTML={{
          __html: `setTimeout(function(){ window.location.href = ${safeUrl}; }, 6000);`,
        }}
      />
      <div style={{ background: "radial-gradient(ellipse at top, rgba(0,180,216,0.15), transparent 60%), #07070e", minHeight: "100vh", padding: "56px 20px", color: "#f0efff", fontFamily: "'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>

            {/* Confirmación */}
            <div style={{ textAlign: "center", marginBottom: "40px" }}>
              <div style={{ display: "inline-flex", padding: "20px", borderRadius: "24px", background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.35)", marginBottom: "20px", fontSize: "48px", lineHeight: 1 }}>✓</div>
              <h1 style={{ fontSize: "clamp(28px, 4.5vw, 42px)", fontWeight: 900, marginBottom: "10px", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                ¡Pago confirmado!
              </h1>
              <p style={{ fontSize: "16px", color: "#94a3b8", lineHeight: 1.55, marginBottom: "6px" }}>
                Tu suscripción a <strong style={{ color: "white" }}>TRUST MIND Pro</strong> está activa.
              </p>
              {amountPaid > 0 && (
                <p style={{ fontSize: "13px", color: "#10b981", fontWeight: 700 }}>
                  +${amountPaid.toFixed(2)} acreditados a tu saldo SMM
                </p>
              )}
            </div>

            {/* CTA principal */}
            <a href={magicLink} style={{
              display: "block",
              padding: "18px 24px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #007ABF, #00B4D8)",
              color: "white",
              fontSize: "16px",
              fontWeight: 800,
              textDecoration: "none",
              textAlign: "center",
              boxShadow: "0 12px 40px rgba(0, 180, 216, 0.4)",
              marginBottom: "12px",
            }}>
              Entrar al panel ahora →
            </a>
            <p style={{ fontSize: "12px", color: "#5a6480", textAlign: "center", marginBottom: "40px" }}>
              Te redirigimos automáticamente en 6 segundos. Cuenta: {email}
            </p>

            {/* Próximos pasos / Upsells */}
            <div>
              <p style={{ fontSize: "11px", color: "#5a6480", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 700, marginBottom: "16px", textAlign: "center" }}>
                Qué hacer ahora dentro del panel
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
                <div style={{ padding: "18px", borderRadius: "16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ fontSize: "22px", marginBottom: "8px" }}>⚡</div>
                  <p style={{ fontSize: "14px", fontWeight: 800, color: "white", marginBottom: "4px" }}>Lanza tu primer pedido SMM</p>
                  <p style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.4 }}>Saldo activo. Likes, seguidores y views desde el primer minuto.</p>
                </div>
                <div style={{ padding: "18px", borderRadius: "16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ fontSize: "22px", marginBottom: "8px" }}>🎓</div>
                  <p style={{ fontSize: "14px", fontWeight: 800, color: "white", marginBottom: "4px" }}>Academia desbloqueada</p>
                  <p style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.4 }}>Cursos de granjas, GenFarmer y monetización en cada plataforma.</p>
                </div>
                <div style={{ padding: "18px", borderRadius: "16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ fontSize: "22px", marginBottom: "8px" }}>📥</div>
                  <p style={{ fontSize: "14px", fontWeight: 800, color: "white", marginBottom: "4px" }}>Cuentas Express</p>
                  <p style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.4 }}>Gmail, IG, TikTok, Telegram listas en segundos — usá tu saldo.</p>
                </div>
              </div>
            </div>

            {/* Soporte */}
            <p style={{ fontSize: "12px", color: "#64748b", textAlign: "center", marginTop: "40px" }}>
              ¿Algo no funciona? Escribinos a{" "}
              <a href="https://wa.me/51931119176" style={{ color: "#7dd3fc", textDecoration: "underline" }}>WhatsApp +51 931 119 176</a>
            </p>
          </div>
        </div>
    </>
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
