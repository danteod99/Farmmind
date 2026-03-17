/**
 * GET /api/panel/[slug]/info
 * Returns public reseller branding info for a child panel.
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

  if (!slug) {
    return Response.json({ error: "Slug required" }, { status: 400 });
  }

  const admin = getAdmin();

  const { data: reseller, error } = await admin
    .from("smm_resellers")
    .select(
      "id, slug, panel_name, logo_url, brand_color, description, custom_domain, is_active, hero_title, hero_subtitle, cta_text, cta_secondary_text, whatsapp_number, instagram_url, telegram_url, tiktok_url, show_features_section, show_plans_section, show_powered_by"
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error || !reseller) {
    return Response.json({ error: "Panel not found" }, { status: 404 });
  }

  // Count available services
  const { count: servicesCount } = await admin
    .from("smm_reseller_prices")
    .select("id", { count: "exact", head: true })
    .eq("reseller_id", reseller.id);

  // Count active plans
  const { data: plans } = await admin
    .from("smm_reseller_plans")
    .select("id, plan_name, description, price_usd, period_days, services_included")
    .eq("reseller_id", reseller.id)
    .eq("active", true)
    .order("price_usd", { ascending: true });

  return Response.json({
    id: reseller.id,
    slug: reseller.slug,
    panel_name: reseller.panel_name || "SMM Panel",
    logo_url: reseller.logo_url || "",
    brand_color: reseller.brand_color || "#007ABF",
    description: reseller.description || "",
    custom_domain: reseller.custom_domain || "",
    services_count: servicesCount || 0,
    plans: plans || [],
    // Storefront customization
    hero_title: reseller.hero_title || "",
    hero_subtitle: reseller.hero_subtitle || "",
    cta_text: reseller.cta_text || "Comenzar ahora",
    cta_secondary_text: reseller.cta_secondary_text || "Ya tengo cuenta",
    whatsapp_number: reseller.whatsapp_number || "",
    instagram_url: reseller.instagram_url || "",
    telegram_url: reseller.telegram_url || "",
    tiktok_url: reseller.tiktok_url || "",
    show_features_section: reseller.show_features_section !== false,
    show_plans_section: reseller.show_plans_section !== false,
    show_powered_by: reseller.show_powered_by !== false,
  });
}
