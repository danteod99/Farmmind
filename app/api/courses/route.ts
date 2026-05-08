import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// GET /api/courses — lista de cursos + estado de acceso
export async function GET() {
  const userId = await getCurrentUserId();
  const sb = getSupabaseAdmin();

  // Lista de cursos activos
  const { data: courses } = await sb
    .from("courses")
    .select("id, slug, title, description, cover_url, level, duration, display_order")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  // ¿El usuario tiene acceso?
  let hasAccess = false;
  let isFounder = false;
  let isSubscribed = false;

  if (userId) {
    const { data: pos } = await sb
      .from("network_positions")
      .select("is_founder")
      .eq("user_id", userId)
      .maybeSingle();
    isFounder = pos?.is_founder === true;

    const { data: profile } = await sb
      .from("profiles")
      .select("subscription_plan, subscription_status, stripe_subscription_id")
      .eq("id", userId)
      .maybeSingle();
    isSubscribed = (
      profile?.subscription_plan === "pro" &&
      Boolean(profile?.stripe_subscription_id) &&
      (profile?.subscription_status === "active" || profile?.subscription_status === "trialing")
    );

    hasAccess = isFounder || isSubscribed;
  }

  return Response.json({
    courses: courses || [],
    user_state: {
      authenticated: Boolean(userId),
      has_access: hasAccess,
      is_founder: isFounder,
      is_subscribed: isSubscribed,
    },
  });
}
