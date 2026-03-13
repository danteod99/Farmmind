import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JAP_BASE = "https://justanotherpanel.com/api/v2";
const JAP_KEY  = process.env.JAP_API_KEY!;

// GET — list services from JAP + reseller's custom prices
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Get reseller
  const { data: reseller } = await supabaseAdmin
    .from("smm_resellers")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!reseller) return NextResponse.json({ error: "No eres reseller" }, { status: 403 });

  // Get reseller's custom prices
  const { data: prices } = await supabaseAdmin
    .from("smm_reseller_prices")
    .select("service_id, rate")
    .eq("reseller_id", reseller.id);

  const priceMap: Record<number, number> = {};
  for (const p of prices ?? []) priceMap[p.service_id] = parseFloat(p.rate);

  // Fetch JAP services
  let services: { service: number; name: string; category: string; rate: string }[] = [];
  try {
    const res = await fetch(JAP_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ key: JAP_KEY, action: "services" }),
    });
    services = await res.json();
  } catch (e) {
    console.error("JAP fetch error:", e);
  }

  // Merge
  const merged = services.slice(0, 500).map((s) => ({
    service_id:    s.service,
    name:          s.name,
    category:      s.category,
    jap_rate:      parseFloat(s.rate),
    reseller_rate: priceMap[s.service] ?? null,
  }));

  return NextResponse.json({ services: merged, reseller_id: reseller.id });
}

// POST — bulk save reseller prices
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: reseller } = await supabaseAdmin
    .from("smm_resellers")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!reseller) return NextResponse.json({ error: "No eres reseller" }, { status: 403 });

  const body = await req.json();
  // body.prices = [{ service_id, name, category, rate }]
  const prices = (body.prices ?? []).filter((p: { rate: number }) => p.rate > 0);

  if (!prices.length) return NextResponse.json({ ok: true });

  const rows = prices.map((p: { service_id: number; name: string; category: string; rate: number }) => ({
    reseller_id:   reseller.id,
    service_id:    p.service_id,
    service_name:  p.name ?? "",
    category:      p.category ?? "",
    rate:          p.rate,
    updated_at:    new Date().toISOString(),
  }));

  const { error } = await supabaseAdmin
    .from("smm_reseller_prices")
    .upsert(rows, { onConflict: "reseller_id,service_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, saved: rows.length });
}
