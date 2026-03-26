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
    const host = (request.headers.get("host") || "").replace(/:\d+$/, "");
    const subMatch = host.match(/^([a-z0-9][a-z0-9-]+)\.trustmind\.online$/);
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
            cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: unknown }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            );
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
  }

  return NextResponse.redirect(`${origin}/smm/services`);
}
