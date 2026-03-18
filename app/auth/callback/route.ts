import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const panelSlug = searchParams.get("panel"); // Child panel redirect

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
              // Set cookies with shared domain so they work on both
              // www.trustmind.online AND any slug.trustmind.online subdomain
              cookieStore.set(name, value, {
                ...(options as Parameters<typeof cookieStore.set>[2]),
                domain: ".trustmind.online",
              })
            );
          },
        },
      }
    );
    const { data: { session } } = await supabase.auth.exchangeCodeForSession(code);

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

      // Redirect to the child panel's own domain (subdomain or custom domain).
      // Cookies were set with domain .trustmind.online so they'll be readable
      // on slug.trustmind.online even though this callback ran on www.trustmind.online.
      const targetDomain =
        (reseller as { id: string; slug: string; custom_domain: string | null })?.custom_domain ||
        `${panelSlug}.trustmind.online`;
      return NextResponse.redirect(`https://${targetDomain}/panel/${panelSlug}/services`);
    }
  }

  return NextResponse.redirect(origin);
}
