/**
 * GET /api/panel/[slug]/services
 * Returns services with reseller's custom pricing.
 */

import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const admin = getAdmin();

  // Find reseller
  const { data: reseller } = await admin
    .from("smm_resellers")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!reseller) {
    return Response.json({ error: "Panel not found" }, { status: 404 });
  }

  // Get reseller's custom prices
  const { data: prices } = await admin
    .from("smm_reseller_prices")
    .select("service_id, service_name, category, rate")
    .eq("reseller_id", reseller.id)
    .order("category", { ascending: true });

  if (!prices || prices.length === 0) {
    return Response.json({ services: [] });
  }

  const services = prices.map((p) => ({
    service: p.service_id,
    name: p.service_name,
    category: p.category,
    rate: parseFloat(String(p.rate)).toFixed(4),
    min: "10",
    max: "100000",
    type: "Default",
  }));

  return Response.json({ services });
}
