import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import Stripe from "stripe";

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

// Resuelve el interval de la suscripción. Si está null en DB pero el user
// tiene una sub activa en Stripe, hacemos backfill (self-heal).
async function resolveInterval(
  sb: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  profile: { subscription_interval?: string | null; stripe_subscription_id?: string | null }
): Promise<string | null> {
  if (profile.subscription_interval) return profile.subscription_interval;
  if (!profile.stripe_subscription_id) return null;
  if (!process.env.STRIPE_SECRET_KEY) return null;

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    const interval = sub.items?.data?.[0]?.price?.recurring?.interval || null;
    if (interval) {
      await sb.from("profiles").update({ subscription_interval: interval }).eq("id", userId);
    }
    return interval;
  } catch {
    return null;
  }
}

// GET /api/courses — lista de cursos + estado de acceso
export async function GET() {
  const userId = await getCurrentUserId();
  const sb = getSupabaseAdmin();

  const { data: courses } = await sb
    .from("courses")
    .select("id, slug, title, description, cover_url, level, duration, display_order")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  let hasAccess = false;
  let isFounder = false;
  let isSubscribed = false;
  let isAnnual = false;

  if (userId) {
    const { data: pos } = await sb
      .from("network_positions")
      .select("is_founder")
      .eq("user_id", userId)
      .maybeSingle();
    isFounder = pos?.is_founder === true;

    const { data: profile } = await sb
      .from("profiles")
      .select("subscription_plan, subscription_status, stripe_subscription_id, subscription_interval")
      .eq("id", userId)
      .maybeSingle();

    isSubscribed = (
      profile?.subscription_plan === "pro" &&
      Boolean(profile?.stripe_subscription_id) &&
      (profile?.subscription_status === "active" || profile?.subscription_status === "trialing")
    );

    if (isSubscribed && profile) {
      const interval = await resolveInterval(sb, userId, profile);
      isAnnual = interval === "year";
    }

    // Solo founders o suscriptores anuales tienen acceso a cursos.
    hasAccess = isFounder || isAnnual;
  }

  return Response.json({
    courses: courses || [],
    user_state: {
      authenticated: Boolean(userId),
      has_access: hasAccess,
      is_founder: isFounder,
      is_subscribed: isSubscribed,
      is_annual: isAnnual,
    },
  });
}
