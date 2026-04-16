import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isAdmin } from "@/app/lib/admin";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const searchQuery = searchParams.get("search") || "";
    const filterType = searchParams.get("filter") || "all";

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setAll(cookiesToSet: any[]) {
            cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: unknown }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdmin(user.email)) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }

    const admin = getSupabaseAdmin();

    // 1. Get all auth users
    const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const authUsers = authData?.users || [];

    // 2. Get all SMM balances
    const { data: balances } = await admin
      .from("smm_balances")
      .select("user_id, balance, updated_at");

    // 3. Get order counts & total spent per user
    const { data: orders } = await admin
      .from("smm_orders")
      .select("user_id, charge, status, created_at, service_name, category");

    // 4. Get software device registrations (users who installed the desktop app)
    const { data: devices } = await admin
      .from("tm_devices")
      .select("user_id, device_name, last_seen, created_at");

    // 5. Get software subscriptions
    const { data: subs } = await admin
      .from("tm_subscriptions")
      .select("user_id, product, tier, expires_at");

    // 6. Get recharge transactions per user
    const { data: transactions } = await admin
      .from("smm_transactions")
      .select("user_id, amount, status, credited, created_at");

    // Build lookup maps
    const balanceMap: Record<string, number> = {};
    (balances || []).forEach((b) => { balanceMap[b.user_id] = Number(b.balance); });

    const ordersByUser: Record<string, typeof orders extends (infer T)[] | null ? T[] : never[]> = {};
    (orders || []).forEach((o) => {
      if (!ordersByUser[o.user_id]) ordersByUser[o.user_id] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ordersByUser[o.user_id] as any[]).push(o);
    });

    const txByUser: Record<string, typeof transactions extends (infer T)[] | null ? T[] : never[]> = {};
    (transactions || []).forEach((t) => {
      if (!txByUser[t.user_id]) txByUser[t.user_id] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (txByUser[t.user_id] as any[]).push(t);
    });

    // Software device map: user_id -> device info
    const deviceUsers = new Set<string>();
    (devices || []).forEach((d) => deviceUsers.add(d.user_id));

    // Software subscription map: user_id -> sub info
    const now = new Date();
    const subMap: Record<string, { product: string; active: boolean }> = {};
    (subs || []).forEach((s) => {
      const active = new Date(s.expires_at) > now;
      if (!subMap[s.user_id] || active) {
        subMap[s.user_id] = { product: s.product || "all", active };
      }
    });

    // Compose user list
    const users = authUsers.map((u) => {
      const userOrders = ordersByUser[u.id] || [];
      const userTx = txByUser[u.id] || [];

      const totalOrders = userOrders.length;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalSpent = userOrders.reduce((sum: number, o: any) => sum + Number(o.charge || 0), 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalRecharged = userTx.filter((t: any) => t.credited).reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lastOrder = userOrders.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

      return {
        id: u.id,
        email: u.email || "",
        name: u.user_metadata?.full_name || u.email?.split("@")[0] || "Usuario",
        avatar: u.user_metadata?.avatar_url || "",
        created_at: u.created_at,
        last_sign_in: u.last_sign_in_at || null,
        balance: balanceMap[u.id] ?? 0,
        total_orders: totalOrders,
        total_spent: totalSpent,
        total_recharged: totalRecharged,
        last_order_at: lastOrder?.created_at || null,
        last_order_name: lastOrder?.service_name || null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recent_orders: userOrders.slice(0, 3).map((o: any) => ({
          service_name: o.service_name,
          charge: Number(o.charge),
          status: o.status,
          created_at: o.created_at,
        })),
        has_software: deviceUsers.has(u.id),
        software_sub: subMap[u.id] || null,
      };
    });

    // Global stats (computed on full dataset before filtering/pagination)
    const totalUsers = users.length;
    const buyers = users.filter((u) => u.total_orders > 0).length;
    const nonBuyers = totalUsers - buyers;
    const totalRevenue = users.reduce((sum, u) => sum + u.total_spent, 0);
    const totalRecharged = users.reduce((sum, u) => sum + u.total_recharged, 0);

    // Calculate real vs promo recharges from transactions
    let realRecharges = 0;
    let promoRecharges = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (transactions || []).forEach((t: any) => {
      if (t.credited) {
        if (t.promo_code) promoRecharges += Number(t.amount || 0);
        else realRecharges += Number(t.amount || 0);
      }
    });

    // New users this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const newThisWeek = users.filter((u) => new Date(u.created_at) > weekAgo).length;
    const softwareUsers = users.filter((u) => u.has_software).length;

    // Server-side filtering
    let filteredUsers = [...users];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filteredUsers = filteredUsers.filter(
        (u) => u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)
      );
    }
    if (filterType === "buyers") filteredUsers = filteredUsers.filter((u) => u.total_orders > 0);
    if (filterType === "non-buyers") filteredUsers = filteredUsers.filter((u) => u.total_orders === 0);
    if (filterType === "software") filteredUsers = filteredUsers.filter((u) => u.has_software);
    if (filterType === "new") {
      filteredUsers = filteredUsers.filter((u) => new Date(u.created_at) > weekAgo);
    }

    const totalFiltered = filteredUsers.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / limit));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * limit;
    const paginatedUsers = filteredUsers.slice(offset, offset + limit);

    return Response.json({
      stats: { totalUsers, buyers, nonBuyers, totalRevenue, totalRecharged, realRecharges, promoRecharges, newThisWeek, softwareUsers },
      users: paginatedUsers,
      pagination: { page: safePage, limit, totalFiltered, totalPages },
    });
  } catch (error) {
    console.error("Admin SMM users error:", error);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
