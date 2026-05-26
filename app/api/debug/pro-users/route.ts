import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/app/lib/admin";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // 1. Profiles con subscription
  const { data: profiles, error: pErr } = await admin
    .from("profiles")
    .select("id, stripe_customer_id, stripe_subscription_id, subscription_plan, subscription_status, subscription_period_end")
    .order("subscription_period_end", { ascending: false, nullsFirst: false })
    .limit(50);

  // 2. Stats por subscription_plan
  const { data: allProfiles } = await admin
    .from("profiles")
    .select("subscription_plan, subscription_status");

  const statsByPlan: Record<string, number> = {};
  const statsByStatus: Record<string, number> = {};
  (allProfiles || []).forEach((p) => {
    const plan = p.subscription_plan || "null";
    const status = p.subscription_status || "null";
    statsByPlan[plan] = (statsByPlan[plan] || 0) + 1;
    statsByStatus[status] = (statsByStatus[status] || 0) + 1;
  });

  // 3. Cantidad de Pro activos
  const { count: activeProCount } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("subscription_plan", "pro")
    .in("subscription_status", ["active", "trialing"]);

  // 4. Últimos 10 emails con Pro
  const { data: recentPro } = await admin
    .from("profiles")
    .select("id, subscription_plan, subscription_status, subscription_period_end, stripe_subscription_id")
    .eq("subscription_plan", "pro")
    .in("subscription_status", ["active", "trialing"])
    .order("subscription_period_end", { ascending: false })
    .limit(10);

  // 5. Buscar emails para esos user IDs
  const userIds = (recentPro || []).map((p) => p.id);
  const recentProWithEmails = await Promise.all(
    userIds.map(async (id) => {
      const { data: { user: u } } = await admin.auth.admin.getUserById(id);
      return { id, email: u?.email, created_at: u?.created_at };
    })
  );

  // 6. Últimos 5 payment_attempts succeeded
  const { data: recentPayments } = await admin
    .from("payment_attempts")
    .select("email, amount, currency, stripe_session_id, created_at")
    .eq("status", "succeeded")
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    summary: {
      totalProfiles: (allProfiles || []).length,
      activeProCount: activeProCount || 0,
      statsByPlan,
      statsByStatus,
    },
    recentActivePro: recentPro?.map((p, i) => ({
      ...p,
      email: recentProWithEmails[i]?.email,
      authCreatedAt: recentProWithEmails[i]?.created_at,
    })),
    last50ProfilesWithSub: profiles?.slice(0, 20),
    last10SucceededPayments: recentPayments,
    diagnostics: {
      profilesQueryError: pErr?.message || null,
      profilesQueryCount: profiles?.length || 0,
    },
  });
}
