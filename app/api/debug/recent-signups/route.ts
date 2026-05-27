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

  // 1. Last 20 signups
  const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const sorted = (authData?.users || []).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 20);

  // 2. Get balances + recharges for each
  const userIds = sorted.map((u) => u.id);
  const { data: balances } = await admin
    .from("smm_balances")
    .select("user_id, balance")
    .in("user_id", userIds);
  const { data: txs } = await admin
    .from("smm_transactions")
    .select("user_id, amount, credited")
    .in("user_id", userIds)
    .eq("credited", true);

  const balMap = new Map((balances || []).map((b) => [b.user_id, Number(b.balance)]));
  const rechargedMap = new Map<string, number>();
  (txs || []).forEach((t) => {
    rechargedMap.set(t.user_id, (rechargedMap.get(t.user_id) || 0) + Number(t.amount));
  });

  const recent = sorted.map((u) => {
    const ageHours = (Date.now() - new Date(u.created_at).getTime()) / 3600000;
    const balance = balMap.get(u.id) ?? null;
    const recharged = rechargedMap.get(u.id) || 0;
    return {
      email: u.email,
      created_at: u.created_at,
      age_hours: Math.round(ageHours * 10) / 10,
      last_sign_in: u.last_sign_in_at,
      hasBalanceRow: balance !== null,
      balance: balance ?? 0,
      total_recharged: recharged,
      canUseApps: (balance ?? 0) > 0,
    };
  });

  const summary = {
    total: recent.length,
    with_balance: recent.filter((u) => u.canUseApps).length,
    zero_balance: recent.filter((u) => !u.canUseApps).length,
    have_recharged: recent.filter((u) => u.total_recharged > 0).length,
  };

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    summary,
    recent_signups: recent,
  });
}
