import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import Stripe from "stripe";

async function createCheckoutSessionUrl(
  userId: string,
  userEmail: string,
  userName: string,
  origin: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
): Promise<string | null> {
  const priceId =
    process.env.NEXT_PUBLIC_STRIPE_NETWORK_PRICE_ID ||
    process.env.STRIPE_NETWORK_PRICE_ID;
  if (!priceId || !process.env.STRIPE_SECRET_KEY) return null;

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-02-25.clover",
    });

    // Buscar/crear customer
    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();

    let customerId: string | undefined = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        name: userName,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;
      await admin.from("profiles").upsert({ id: userId, stripe_customer_id: customerId });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/network?payment=success`,
      cancel_url: `${origin}/network?payment=cancel`,
      subscription_data: {
        metadata: { supabase_user_id: userId, plan_type: "network" },
      },
    });

    return session.url;
  } catch (e) {
    console.error("[Auth Callback] Stripe checkout error:", e);
    return null;
  }
}

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

        const isNewUser = !bal;

        if (isNewUser) {
          // New user — create balance row
          await admin.from("smm_balances").insert({ user_id: session.user.id, balance: 0 });
        }

        // ── Network marketing: asignar sponsor ──
        // 1. Si vino con cookie 'ref' valida -> ese es el sponsor
        // 2. Si NO vino con ref -> CEO (founder al top) es el sponsor por default
        // Aplica solo a usuarios nuevos.
        let cameWithReferral = false;
        if (isNewUser) {
          try {
            const cookieHeader = request.headers.get("cookie") || "";
            const refMatch = cookieHeader.match(/(?:^|;\s*)ref=([^;]+)/);
            const refCode = refMatch
              ? decodeURIComponent(refMatch[1]).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12)
              : null;

            let sponsorId: string | null = null;
            let sponsorSource: "referral" | "ceo_default" = "ceo_default";

            // Intentar resolver sponsor via codigo de referido
            if (refCode) {
              const { data: refRow } = await admin
                .from("network_referral_codes")
                .select("user_id")
                .eq("code", refCode)
                .maybeSingle();
              if (refRow?.user_id && refRow.user_id !== session.user.id) {
                sponsorId = refRow.user_id;
                sponsorSource = "referral";
              }
            }

            // Fallback: si no hay sponsor valido, usar CEO (founder al top)
            if (!sponsorId) {
              const { data: ceo } = await admin
                .from("network_positions")
                .select("user_id")
                .eq("is_founder", true)
                .is("sponsor_id", null)
                .is("placement_parent_id", null)
                .order("created_at", { ascending: true })
                .limit(1)
                .maybeSingle();
              if (ceo?.user_id && ceo.user_id !== session.user.id) {
                sponsorId = ceo.user_id;
              }
            }

            if (sponsorId) {
              const { data: existingPending } = await admin
                .from("network_pending_placements")
                .select("user_id")
                .eq("user_id", session.user.id)
                .maybeSingle();

              const { data: existingPosition } = await admin
                .from("network_positions")
                .select("user_id")
                .eq("user_id", session.user.id)
                .maybeSingle();

              if (!existingPending && !existingPosition) {
                await admin.from("network_pending_placements").insert({
                  user_id: session.user.id,
                  sponsor_id: sponsorId,
                  status: "pending",
                });
                console.log(`[Network] Pending creado: user=${session.user.id}, sponsor=${sponsorId}, source=${sponsorSource}`);
                cameWithReferral = sponsorSource === "referral";
              }
            }
          } catch (e) {
            console.error("[Auth Callback] Error asignando sponsor:", e);
          }

          // Si vino con referido -> intentar mandar directo al Stripe Checkout.
          // Si falla la creacion del checkout, caemos a /network donde ve el paywall.
          let redirectUrl: string;
          if (cameWithReferral) {
            const checkoutUrl = await createCheckoutSessionUrl(
              session.user.id,
              session.user.email || "",
              session.user.user_metadata?.full_name || session.user.email || "Usuario",
              origin,
              admin,
            );
            redirectUrl = checkoutUrl || `${origin}/network?registered=1`;
          } else {
            redirectUrl = `${origin}/smm/services?registered=1`;
          }
          const response = NextResponse.redirect(redirectUrl);
          response.cookies.set("ref", "", { path: "/", maxAge: 0 });
          return response;
        }
      } catch (e) {
        console.error("[Auth Callback] Error checking new user:", e);
      }
    }

    return NextResponse.redirect(`${origin}/smm/services`);
  }

  return NextResponse.redirect(`${origin}/smm/services`);
}

