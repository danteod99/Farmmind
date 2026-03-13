/**
 * Trust Mind — Public SMM Reseller API v2
 * Compatible with the standard SMM panel API format.
 *
 * Endpoint: POST https://trustmind.online/api/v2
 * Content-Type: application/x-www-form-urlencoded
 *
 * Actions:
 *   services  — lista de servicios con precios del reseller
 *   balance   — balance del reseller
 *   add       — crear pedido
 *   status    — estado de un pedido
 *   orders    — listado de pedidos del reseller
 */

import { createClient } from "@supabase/supabase-js";
import { addOrder, getOrderStatus } from "@/app/lib/jap";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function err(msg: string, status = 400) {
  return Response.json({ error: msg }, { status });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function resolveReseller(apiKey: string) {
  const admin = getAdmin();
  const { data } = await admin
    .from("smm_resellers")
    .select("id, user_id, balance, is_active, custom_domain")
    .eq("api_key", apiKey)
    .single();
  return data;
}

async function parseBody(req: Request): Promise<Record<string, string>> {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return req.json();
  }
  // application/x-www-form-urlencoded (standard SMM panel format)
  const text = await req.text();
  return Object.fromEntries(new URLSearchParams(text));
}

// ── Action handlers ───────────────────────────────────────────────────────────

async function actionServices(resellerId: string) {
  const admin = getAdmin();
  const { data: prices } = await admin
    .from("smm_reseller_prices")
    .select("service_id, service_name, category, rate")
    .eq("reseller_id", resellerId);

  if (!prices || prices.length === 0) {
    return Response.json([]);
  }

  const services = prices.map((p) => ({
    service: p.service_id,
    name: p.service_name,
    category: p.category,
    type: "Default",
    rate: parseFloat(p.rate).toFixed(4),
    min: "10",
    max: "100000",
    dripfeed: false,
    refill: false,
    cancel: false,
  }));

  return Response.json(services);
}

async function actionBalance(resellerId: string) {
  const admin = getAdmin();
  const { data } = await admin
    .from("smm_resellers")
    .select("balance")
    .eq("id", resellerId)
    .single();

  return Response.json({
    balance: parseFloat(data?.balance ?? 0).toFixed(4),
    currency: "USD",
  });
}

async function actionAdd(
  resellerId: string,
  resellerUserId: string,
  params: Record<string, string>
) {
  const { service, link, quantity } = params;

  if (!service || !link || !quantity) {
    return err("Missing required fields: service, link, quantity");
  }

  const serviceId = parseInt(service);
  const qty = parseInt(quantity);

  if (isNaN(serviceId) || isNaN(qty) || qty <= 0) {
    return err("Invalid service or quantity");
  }

  const admin = getAdmin();

  // Get reseller price for this service
  const { data: priceRow } = await admin
    .from("smm_reseller_prices")
    .select("rate, service_name, category")
    .eq("reseller_id", resellerId)
    .eq("service_id", serviceId)
    .single();

  if (!priceRow) {
    return err("Service not available for your account");
  }

  const resellerRate = parseFloat(priceRow.rate);
  const orderCost = (resellerRate / 1000) * qty;

  // Check reseller balance
  const { data: resellerData } = await admin
    .from("smm_resellers")
    .select("balance")
    .eq("id", resellerId)
    .single();

  const balance = parseFloat(resellerData?.balance ?? 0);
  if (balance < orderCost) {
    return err(
      `Insufficient balance. Required: $${orderCost.toFixed(4)}, Available: $${balance.toFixed(4)}`
    );
  }

  // Place order on parent panel (JAP)
  const japResult = await addOrder({ service: serviceId, link, quantity: qty });
  if (japResult.error || !japResult.order) {
    return err(japResult.error || "Failed to place order on provider");
  }

  // Deduct from reseller balance
  await admin.rpc("decrement_reseller_balance", {
    p_reseller_id: resellerId,
    p_amount: orderCost,
  });

  // Save order
  await admin.from("smm_orders").insert({
    user_id: resellerUserId,
    jap_order_id: japResult.order,
    service_id: serviceId,
    service_name: priceRow.service_name,
    category: priceRow.category,
    link,
    quantity: qty,
    rate: resellerRate,
    charge: orderCost,
    status: "pending",
    reseller_id: resellerId,
    reseller_rate: resellerRate,
  });

  return Response.json({ order: japResult.order });
}

async function actionStatus(params: Record<string, string>) {
  const { order } = params;
  if (!order) return err("Missing order field");

  const orderId = parseInt(order);
  if (isNaN(orderId)) return err("Invalid order ID");

  const statusData = await getOrderStatus(orderId);

  if ("error" in statusData) {
    return err(String((statusData as Record<string, unknown>).error));
  }

  return Response.json({
    charge: parseFloat(String(statusData.charge)).toFixed(4),
    start_count: statusData.start_count,
    status: statusData.status,
    remains: statusData.remains,
    currency: "USD",
  });
}

async function actionOrders(resellerId: string) {
  const admin = getAdmin();
  const { data: orders } = await admin
    .from("smm_orders")
    .select(
      "jap_order_id, service_id, service_name, link, quantity, charge, status, created_at"
    )
    .eq("reseller_id", resellerId)
    .order("created_at", { ascending: false })
    .limit(100);

  const formatted = (orders ?? []).map((o) => ({
    id: o.jap_order_id,
    service: o.service_id,
    link: o.link,
    quantity: o.quantity,
    charge: parseFloat(o.charge).toFixed(4),
    status: o.status,
    currency: "USD",
  }));

  return Response.json(formatted);
}

// ── Main handler ──────────────────────────────────────────────────────────────

async function handle(req: Request): Promise<Response> {
  try {
    const params = await parseBody(req);
    const { key, action } = params;

    if (!key) return err("API key required");
    if (!action) return err("Action required");

    const reseller = await resolveReseller(key);
    if (!reseller) return err("Invalid API key", 401);
    if (!reseller.is_active) return err("Account suspended", 403);

    switch (action) {
      case "services":
        return actionServices(reseller.id);
      case "balance":
        return actionBalance(reseller.id);
      case "add":
        return actionAdd(reseller.id, reseller.user_id, params);
      case "status":
        return actionStatus(params);
      case "orders":
        return actionOrders(reseller.id);
      default:
        return err(`Unknown action: ${action}`);
    }
  } catch (e) {
    console.error("[API v2]", e);
    return err("Internal server error", 500);
  }
}

export const POST = handle;
// Also allow GET for easy testing
export const GET = handle;
