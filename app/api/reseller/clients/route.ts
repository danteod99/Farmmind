import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — fetch reseller's clients (registered + orders stats)
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

  // Fetch ALL registered clients from smm_reseller_clients
  const { data: registeredClients } = await supabaseAdmin
    .from("smm_reseller_clients")
    .select("user_id, email, created_at, last_login")
    .eq("reseller_id", reseller.id)
    .order("created_at", { ascending: false });

  // Fetch orders placed via this reseller
  const { data: orders } = await supabaseAdmin
    .from("smm_orders")
    .select("id, service_name, link, quantity, charge, reseller_rate, status, created_at, user_id")
    .eq("reseller_id", reseller.id)
    .order("created_at", { ascending: false })
    .limit(500);

  // Build client map starting from registered clients
  const clientMap: Record<string, {
    user_id: string;
    email: string;
    registered_at: string;
    last_login: string | null;
    total_orders: number;
    total_revenue: number;
    last_order: string | null;
  }> = {};

  // First: add all registered clients
  for (const c of registeredClients ?? []) {
    clientMap[c.user_id] = {
      user_id: c.user_id,
      email: c.email || "",
      registered_at: c.created_at,
      last_login: c.last_login || null,
      total_orders: 0,
      total_revenue: 0,
      last_order: null,
    };
  }

  // Then: aggregate orders on top
  for (const o of orders ?? []) {
    if (!clientMap[o.user_id]) {
      // Client with orders but not in smm_reseller_clients (legacy)
      clientMap[o.user_id] = {
        user_id: o.user_id,
        email: "",
        registered_at: o.created_at,
        last_login: null,
        total_orders: 0,
        total_revenue: 0,
        last_order: null,
      };
    }
    clientMap[o.user_id].total_orders++;
    clientMap[o.user_id].total_revenue += parseFloat(o.reseller_rate ?? o.charge ?? 0);
    if (!clientMap[o.user_id].last_order || o.created_at > clientMap[o.user_id].last_order!) {
      clientMap[o.user_id].last_order = o.created_at;
    }
  }

  // Totals
  const totalOrders  = orders?.length ?? 0;
  const totalRevenue = (orders ?? []).reduce((s, o) => s + parseFloat(o.reseller_rate ?? o.charge ?? 0), 0);
  const allClients = Object.values(clientMap);

  return NextResponse.json({
    orders:   orders ?? [],
    clients:  allClients,
    stats:    {
      total_orders: totalOrders,
      total_revenue: totalRevenue,
      total_clients: allClients.length,
      total_registered: registeredClients?.length ?? 0,
    },
  });
}
