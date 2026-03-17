/**
 * POST /api/panel/[slug]/order
 * Creates an order on the child panel.
 * Deducts from client balance AND reseller balance.
 */

import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { addOrder } from "@/app/lib/jap";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const user = await getUser();
    if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

    const body = await req.json();
    const { service_id, link, quantity } = body;

    if (!service_id || !link || !quantity) {
      return Response.json({ error: "Missing fields: service_id, link, quantity" }, { status: 400 });
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      return Response.json({ error: "Invalid quantity" }, { status: 400 });
    }

    const admin = getAdmin();

    // Find reseller
    const { data: reseller } = await admin
      .from("smm_resellers")
      .select("id, user_id, balance, is_active")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (!reseller) {
      return Response.json({ error: "Panel not found" }, { status: 404 });
    }

    // Verify user is a client of this reseller
    const { data: client } = await admin
      .from("smm_reseller_clients")
      .select("id")
      .eq("reseller_id", reseller.id)
      .eq("user_id", user.id)
      .single();

    if (!client) {
      return Response.json({ error: "Not a client of this panel" }, { status: 403 });
    }

    // Get reseller price for this service
    const { data: priceRow } = await admin
      .from("smm_reseller_prices")
      .select("rate, service_name, category")
      .eq("reseller_id", reseller.id)
      .eq("service_id", service_id)
      .single();

    if (!priceRow) {
      return Response.json({ error: "Service not available" }, { status: 404 });
    }

    const resellerRate = parseFloat(priceRow.rate);
    const orderCost = (resellerRate / 1000) * qty;

    // Check client balance
    const { data: balanceData } = await admin
      .from("smm_balances")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    const clientBalance = parseFloat(balanceData?.balance ?? 0);
    if (clientBalance < orderCost) {
      return Response.json({
        error: `Saldo insuficiente. Necesitas: $${orderCost.toFixed(4)}, Disponible: $${clientBalance.toFixed(4)}`,
      }, { status: 400 });
    }

    // Check reseller balance (JAP cost)
    // For now, use the same rate — in the future, reseller's cost may differ
    const resellerBalance = parseFloat(reseller.balance);
    if (resellerBalance < orderCost) {
      return Response.json({
        error: "El panel no tiene fondos suficientes. Contacta al administrador.",
      }, { status: 400 });
    }

    // Place order on JAP
    const japResult = await addOrder({ service: service_id, link, quantity: qty });
    if (japResult.error || !japResult.order) {
      return Response.json({ error: japResult.error || "Failed to place order" }, { status: 500 });
    }

    // Deduct from client balance
    await admin.rpc("decrement_balance", {
      p_user_id: user.id,
      p_amount: orderCost,
    });

    // Deduct from reseller balance
    await admin.rpc("decrement_reseller_balance", {
      p_reseller_id: reseller.id,
      p_amount: orderCost,
    });

    // Save order
    await admin.from("smm_orders").insert({
      user_id: user.id,
      jap_order_id: japResult.order,
      service_id,
      service_name: priceRow.service_name,
      category: priceRow.category,
      link,
      quantity: qty,
      rate: resellerRate,
      charge: orderCost,
      status: "pending",
      reseller_id: reseller.id,
      reseller_rate: resellerRate,
    });

    return Response.json({
      success: true,
      order: japResult.order,
      charge: orderCost.toFixed(4),
    });
  } catch (e) {
    console.error("[Panel Order]", e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
