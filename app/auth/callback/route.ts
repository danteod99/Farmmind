import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/smm/services`);
  }

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
    return NextResponse.redirect(`${origin}?error=${encodeURIComponent(exchangeError.message)}`);
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

  // New user detection (no balance row yet = first login)
  let isNewUser = false;
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

      isNewUser = !bal;
      if (isNewUser) {
        await admin.from("smm_balances").insert({ user_id: session.user.id, balance: 0 });

        // Enqueue drip campaign. No await: corre en background.
        try {
          const { scheduleSignupDrip } = await import("@/app/lib/drip-scheduler");
          scheduleSignupDrip(session.user.id).catch((e) =>
            console.error("[Auth Callback] drip enqueue failed:", e)
          );
        } catch (dripErr) {
          console.error("[Auth Callback] drip import failed:", dripErr);
        }
      }
    } catch (e) {
      console.error("[Auth Callback] Error checking new user:", e);
    }
  }

  // Si es nuevo signup, agregar registered=1 para el Pixel CompleteRegistration.
  const qs = isNewUser ? "?registered=1" : "";
  return NextResponse.redirect(`${origin}/smm/services${qs}`);
}
