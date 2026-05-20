import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const fullUrl = request.url;
  const { searchParams, origin } = new URL(fullUrl);
  const code = searchParams.get("code");

  // Determine panel slug from multiple sources (in priority order):
  // 1. Query param ?panel=slug
  // 2. Subdomain detection (lovesocial.trustmind.online → lovesocial)
  // 3. Cookie fallback
  let panelSlug = searchParams.get("panel");
  if (!panelSlug) {
    const reqHost = (request.headers.get("host") || "").replace(/:\d+$/, "");
    const subMatch = reqHost.match(/^([a-z0-9][a-z0-9-]+)\.trustmind\.online$/);
    if (subMatch && subMatch[1] !== "www") {
      panelSlug = subMatch[1];
    }
  }
  if (!panelSlug) {
    const cookieHeader = request.headers.get("cookie") || "";
    const match = cookieHeader.match(/panel_auth_slug=([^;]+)/);
    if (match) panelSlug = decodeURIComponent(match[1]);
  }
  console.log("[Auth Callback]", { panelSlug, hasCode: !!code });

  if (code) {
    const cookieStore = await cookies();
    const host = (request.headers.get("host") || "").replace(/:\d+$/, "");
    const isTrustmind = host.endsWith(".trustmind.online") || host === "trustmind.online";

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
            cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: unknown }) => {
              const opts = options as Record<string, unknown>;
              if (isTrustmind) {
                opts.domain = ".trustmind.online";
              }
              cookieStore.set(name, value, opts as Parameters<typeof cookieStore.set>[2]);
            });
          },
        },
      }
    );
    const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("[Auth Callback] exchangeCodeForSession failed:", exchangeError.message);
      // Redirect back with error so the user sees feedback
      const errorRedirect = panelSlug
        ? `https://${panelSlug}.trustmind.online/panel/${panelSlug}/auth?error=${encodeURIComponent(exchangeError.message)}`
        : `${origin}?error=${encodeURIComponent(exchangeError.message)}`;
      return NextResponse.redirect(errorRedirect);
    }

    // Desktop app login: redirect to /auth/desktop with tokens in hash
    const isDesktop = searchParams.get("desktop") === "1";
    if (isDesktop && session) {
      const hashParams = new URLSearchParams({
        access_token: session.access_token,
        refresh_token: session.refresh_token || "",
        token_type: "bearer",
      });
      return NextResponse.redirect(`${origin}/auth/desktop#${hashParams.toString()}`);
    }

    // If coming from a child panel, link user as reseller client
    if (panelSlug && session?.user) {
      try {
        const admin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Find reseller by slug
        const { data: reseller } = await admin
          .from("smm_resellers")
          .select("id, slug, custom_domain")
          .eq("slug", panelSlug)
          .eq("is_active", true)
          .single();

        if (reseller) {
          // Upsert client record
          const { data: existing } = await admin
            .from("smm_reseller_clients")
            .select("id")
            .eq("reseller_id", reseller.id)
            .eq("user_id", session.user.id)
            .single();

          if (!existing) {
            await admin.from("smm_reseller_clients").insert({
              reseller_id: reseller.id,
              user_id: session.user.id,
              email: session.user.email || "",
              auth_method: "google",
              balance: 0,
              last_login: new Date().toISOString(),
            });
          } else {
            await admin
              .from("smm_reseller_clients")
              .update({ last_login: new Date().toISOString() })
              .eq("id", existing.id);
          }

          // Ensure balance record exists
          const { data: balExists } = await admin
            .from("smm_balances")
            .select("id")
            .eq("user_id", session.user.id)
            .single();

          if (!balExists) {
            await admin.from("smm_balances").insert({
              user_id: session.user.id,
              balance: 0,
            });
          }

          // Mark user as panel_client — but only if they're NOT already a reseller
          const { data: isReseller } = await admin
            .from("smm_resellers")
            .select("id")
            .eq("user_id", session.user.id)
            .single();

          if (!isReseller) {
            await admin.auth.admin.updateUserById(session.user.id, {
              user_metadata: {
                ...session.user.user_metadata,
                role: "panel_client",
                panel_slug: panelSlug,
                reseller_id: reseller.id,
              },
            });
          }
        }
      } catch (e) {
        console.error("[Auth Callback] Error linking to child panel:", e);
      }

      // Redirect to the child panel services page.
      // Since the callback runs on the same subdomain (slug.trustmind.online),
      // cookies are already set on the correct domain — no sharing needed.
      const response = NextResponse.redirect(`${origin}/panel/${panelSlug}/services`);
      // Clear the panel auth cookie after use
      response.cookies.set("panel_auth_slug", "", { path: "/", maxAge: 0 });
      return response;
    }

    // Check if this is a new user (no balance record yet = first login)
    if (session?.user) {
      try {
        const admin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const { data: bal } = await admin
          .from("smm_balances")
          .select("id")
          .eq("user_id", session.user.id)
          .single();

        // Persistir attribution si viene cookie tm_attr (first-touch, solo si no existe ya)
        try {
          const cookieHeader = request.headers.get("cookie") || "";
          const attrMatch = cookieHeader.match(/tm_attr=([^;]+)/);
          if (attrMatch) {
            const attr = JSON.parse(decodeURIComponent(attrMatch[1]));
            const { data: existingAttr } = await admin
              .from("user_attribution")
              .select("user_id")
              .eq("user_id", session.user.id)
              .maybeSingle();
            if (!existingAttr) {
              await admin.from("user_attribution").insert({
                user_id: session.user.id,
                utm_source: attr.utm_source || null,
                utm_medium: attr.utm_medium || null,
                utm_campaign: attr.utm_campaign || null,
                utm_content: attr.utm_content || null,
                utm_term: attr.utm_term || null,
                fbclid: attr.fbclid || null,
                gclid: attr.gclid || null,
                ttclid: attr.ttclid || null,
                msclkid: attr.msclkid || null,
                referrer: attr.referrer || null,
                landing_page: attr.landing_page || null,
                user_agent: attr.user_agent || null,
              });
            }
          }
        } catch (attrErr) {
          console.error("[Auth Callback] Error persisting attribution:", attrErr);
        }

        if (!bal) {
          // New user — create balance
          await admin.from("smm_balances").insert({ user_id: session.user.id, balance: 0 });
        }
      } catch (e) {
        console.error("[Auth Callback] Error checking new user:", e);
      }
    }

    // ?subscribe=monthly|yearly → ir a /?subscribe=... que dispara Stripe checkout
    const subscribePlan = searchParams.get("subscribe");
    if (subscribePlan === "monthly" || subscribePlan === "yearly") {
      return NextResponse.redirect(`${origin}/?subscribe=${subscribePlan}`);
    }

    // ?purchase= y ?amount= vienen del flow post-pago para disparar Pixel client
    const purchaseId = searchParams.get("purchase");
    const purchaseAmount = searchParams.get("amount");

    // GATE: solo usuarios Pro pueden acceder a /smm/*. Free → forzar paywall.
    // Admins, panel_clients y resellers entran sin restricción.
    if (session?.user) {
      const adminEmails = (process.env.ADMIN_EMAILS || "danteod99@gmail.com").split(",").map(e => e.trim().toLowerCase());
      const isAdminUser = adminEmails.includes((session.user.email || "").toLowerCase());
      const role = session.user.user_metadata?.role;
      const isExemptRole = role === "panel_client" || role === "reseller";

      if (!isAdminUser && !isExemptRole) {
        try {
          const admin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          );
          const { data: profile } = await admin
            .from("profiles")
            .select("subscription_plan, subscription_status, stripe_customer_id")
            .eq("id", session.user.id)
            .maybeSingle();
          const { data: subs } = await admin
            .from("tm_subscriptions")
            .select("tier, expires_at")
            .eq("user_id", session.user.id)
            .eq("tier", "pro");
          const now = new Date();
          const hasActiveSub = (subs || []).some(s => s.expires_at && new Date(s.expires_at) > now);
          const isPro =
            hasActiveSub ||
            (profile?.subscription_plan === "pro" &&
              (profile?.subscription_status === "active" ||
                profile?.subscription_status === "trialing"));

          // Si NO es Pro pero tiene stripe_customer_id, intentar reconciliar contra Stripe
          // (cubre race condition: pagó pero webhook aún no procesa)
          if (!isPro && profile?.stripe_customer_id) {
            try {
              const Stripe = (await import("stripe")).default;
              const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_placeholder", { apiVersion: "2026-02-25.clover" });
              const stripeSubs = await stripe.subscriptions.list({
                customer: profile.stripe_customer_id,
                status: "active",
                limit: 5,
              });
              if (stripeSubs.data.length > 0) {
                // Hay sub activa en Stripe pero DB no la refleja — activar Pro y dejar entrar
                const activeSub = stripeSubs.data[0];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const subAny = activeSub as any;
                const periodEndUnix = subAny.current_period_end
                  || subAny.items?.data?.[0]?.current_period_end
                  || Math.floor(Date.now() / 1000) + 30 * 24 * 3600;
                const periodEndIso = new Date(periodEndUnix * 1000).toISOString();
                await admin.from("profiles").upsert({
                  id: session.user.id,
                  subscription_status: "active",
                  stripe_subscription_id: activeSub.id,
                  subscription_plan: "pro",
                  subscription_period_end: periodEndIso,
                });
                await admin.from("tm_subscriptions").upsert(
                  { user_id: session.user.id, product: "bundle", tier: "pro", expires_at: periodEndIso, stripe_subscription_id: activeSub.id },
                  { onConflict: "user_id,product" }
                );
                console.log(`[Auth Callback] Pro reconciliado via Stripe para ${session.user.email}`);
                return NextResponse.redirect(`${origin}/smm/services?welcome=1`);
              }
            } catch (reconcileErr) {
              console.error("[Auth Callback] Stripe reconcile failed:", reconcileErr);
            }
          }

          if (!isPro) {
            return NextResponse.redirect(`${origin}/oferta?gate=1`);
          }
        } catch (e) {
          console.error("[Auth Callback] Pro gate check failed:", e);
          return NextResponse.redirect(`${origin}/oferta?gate=1`);
        }
      }
    }

    // Si vino de un pago, propaga los params para que /smm/services dispare Pixel
    const finalDestination = purchaseId && purchaseAmount
      ? `${origin}/smm/services?purchase=${encodeURIComponent(purchaseId)}&amount=${encodeURIComponent(purchaseAmount)}`
      : `${origin}/smm/services`;
    return NextResponse.redirect(finalDestination);
  }

  return NextResponse.redirect(`${origin}/smm/services`);
}

