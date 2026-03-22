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

export async function GET() {
  try {
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

    // 4. Get recharge transactions per user
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
      };
    });

    // Global stats
    const totalUsers = users.length;
    const buyers = users.filter((u) => u.total_orders > 0).length;
    const nonBuyers = totalUsers - buyers;
    const totalRevenue = users.reduce((sum, u) => sum + u.total_spent, 0);
    const totalRecharged = users.reduce((sum, u) => sum + u.total_recharged, 0);

    // New users this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const newThisWeek = users.filter((u) => new Date(u.created_at) > weekAgo).length;

    return Response.json({
      stats: { totalUsers, buyers, nonBuyers, totalRevenue, totalRecharged, newThisWeek },
      users,
    });
  } catch (error) {
    console.error("Admin SMM users error:", error);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
