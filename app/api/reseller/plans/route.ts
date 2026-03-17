/**
 * /api/reseller/plans
 * CRUD for reseller subscription plans.
 * GET — list plans for the authenticated reseller
 * POST — create a new plan
 * PATCH — update a plan
 * DELETE — delete a plan
 */

import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getResellerId() {
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
  if (!user) return null;

  const admin = getAdmin();
  const { data: reseller } = await admin
    .from("smm_resellers")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  return reseller?.id || null;
}

export async function GET() {
  const resellerId = await getResellerId();
  if (!resellerId) return Response.json({ error: "Not a reseller" }, { status: 403 });

  const admin = getAdmin();
  const { data: plans } = await admin
    .from("smm_reseller_plans")
    .select("*")
    .eq("reseller_id", resellerId)
    .order("price_usd", { ascending: true });

  return Response.json({ plans: plans || [] });
}

export async function POST(req: Request) {
  const resellerId = await getResellerId();
  if (!resellerId) return Response.json({ error: "Not a reseller" }, { status: 403 });

  const body = await req.json();
  const { plan_name, description, price_usd, services_included, period_days } = body;

  if (!plan_name || !price_usd) {
    return Response.json({ error: "plan_name and price_usd required" }, { status: 400 });
  }

  const admin = getAdmin();
  const { data, error } = await admin
    .from("smm_reseller_plans")
    .insert({
      reseller_id: resellerId,
      plan_name,
      description: description || "",
      price_usd: parseFloat(price_usd),
      services_included: services_included || [],
      period_days: period_days || 30,
      active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("[Plans]", error);
    return Response.json({ error: "Failed to create plan" }, { status: 500 });
  }

  return Response.json({ success: true, plan: data });
}

export async function PATCH(req: Request) {
  const resellerId = await getResellerId();
  if (!resellerId) return Response.json({ error: "Not a reseller" }, { status: 403 });

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) return Response.json({ error: "Plan id required" }, { status: 400 });

  const admin = getAdmin();
  const { error } = await admin
    .from("smm_reseller_plans")
    .update(updates)
    .eq("id", id)
    .eq("reseller_id", resellerId);

  if (error) {
    return Response.json({ error: "Failed to update plan" }, { status: 500 });
  }

  return Response.json({ success: true });
}

export async function DELETE(req: Request) {
  const resellerId = await getResellerId();
  if (!resellerId) return Response.json({ error: "Not a reseller" }, { status: 403 });

  const body = await req.json();
  const { id } = body;

  if (!id) return Response.json({ error: "Plan id required" }, { status: 400 });

  const admin = getAdmin();
  const { error } = await admin
    .from("smm_reseller_plans")
    .delete()
    .eq("id", id)
    .eq("reseller_id", resellerId);

  if (error) {
    return Response.json({ error: "Failed to delete plan" }, { status: 500 });
  }

  return Response.json({ success: true });
}
