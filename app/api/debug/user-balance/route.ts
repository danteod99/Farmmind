import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/app/lib/admin";

export async function GET(request: NextRequest) {
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

  const email = request.nextUrl.searchParams.get("email")?.toLowerCase();
  if (!email) return NextResponse.json({ error: "Missing ?email=" }, { status: 400 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // 1. Find user by email
  const { data: authList } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const target = authList?.users.find((u) => u.email?.toLowerCase() === email);
  if (!target) return NextResponse.json({ error: `User ${email} not found` }, { status: 404 });

  // 2. Balance current
  const { data: balanceRow } = await admin
    .from("smm_balances")
    .select("user_id, balance, updated_at")
    .eq("user_id", target.id)
    .maybeSingle();

  // 3. All transactions (recharges, etc)
  const { data: txs } = await admin
    .from("smm_transactions")
    .select("*")
    .eq("user_id", target.id)
    .order("created_at", { ascending: false });

  // 4. All orders (consumes balance)
  const { data: orders } = await admin
    .from("smm_orders")
    .select("user_id, service_name, charge, status, created_at")
    .eq("user_id", target.id)
    .order("created_at", { ascending: false });

  // 5. Sum credited recharges (should equal balance + spent)
  const creditedRecharges = (txs || [])
    .filter((t) => t.credited === true)
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const promoRecharges = (txs || [])
    .filter((t) => t.credited === true && t.promo_code)
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const realRecharges = (txs || [])
    .filter((t) => t.credited === true && !t.promo_code)
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const totalOrderCharge = (orders || [])
    .reduce((s, o) => s + Number(o.charge || 0), 0);

  return NextResponse.json({
    user: {
      id: target.id,
      email: target.email,
      created_at: target.created_at,
      last_sign_in: target.last_sign_in_at,
    },
    balance: {
      current: balanceRow?.balance ?? 0,
      updatedAt: balanceRow?.updated_at,
    },
    math: {
      creditedRechargesTotal: creditedRecharges,
      realRecharges,
      promoRecharges,
      totalOrderCharge,
      expectedBalance: creditedRecharges - totalOrderCharge,
      mismatch: Math.abs((balanceRow?.balance ?? 0) - (creditedRecharges - totalOrderCharge)) > 0.01,
    },
    transactions: (txs || []).map((t) => ({
      id: t.id,
      amount: t.amount,
      currency: t.currency,
      status: t.status,
      credited: t.credited,
      promo_code: t.promo_code,
      method: t.payment_method,
      provider_payment_id: t.provider_payment_id,
      created_at: t.created_at,
    })),
    orders: (orders || []).slice(0, 20),
  });
}
