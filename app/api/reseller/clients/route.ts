import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — fetch reseller's clients + their orders stats
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Get reseller record
  const { data: reseller } = await supabaseAdmin
    .from("smm_resellers")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!reseller) return NextResponse.json({ error: "No eres reseller" }, { status: 403 });

  // Fetch orders placed via this reseller
  const { data: orders } = await supabaseAdmin
    .from("smm_orders")
    .select("id, service_name, link, quantity, charge, reseller_rate, status, created_at, user_id")
    .eq("reseller_id", reseller.id)
    .order("created_at", { ascending: false })
    .limit(200);

  // Aggregate per client
  const clientMap: Record<string, {
    user_id: string;
    total_orders: number;
    total_revenue: number;
    last_order: string;
  }> = {};

  for (const o of orders ?? []) {
    if (!clientMap[o.user_id]) {
      clientMap[o.user_id] = { user_id: o.user_id, total_orders: 0, total_revenue: 0, last_order: o.created_at };
    }
    clientMap[o.user_id].total_orders++;
    clientMap[o.user_id].total_revenue += parseFloat(o.reseller_rate ?? o.charge ?? 0);
    if (o.created_at > clientMap[o.user_id].last_order) clientMap[o.user_id].last_order = o.created_at;
  }

  // Totals
  const totalOrders  = orders?.length ?? 0;
  const totalRevenue = (orders ?? []).reduce((s, o) => s + parseFloat(o.reseller_rate ?? o.charge ?? 0), 0);

  return NextResponse.json({
    orders:   orders ?? [],
    clients:  Object.values(clientMap),
    stats:    { total_orders: totalOrders, total_revenue: totalRevenue, total_clients: Object.keys(clientMap).length },
  });
}
