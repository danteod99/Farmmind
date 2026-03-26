/**
 * Admin API — Reseller Prices
 *
 * GET  /api/admin/reseller-prices?reseller_id=xxx   → get prices for a reseller
 * POST /api/admin/reseller-prices                    → bulk upsert prices
 *      body: { reseller_id, prices: [{ service_id, service_name, category, rate }] }
 * DELETE /api/admin/reseller-prices                  → delete a price
 *      body: { reseller_id, service_id }
 */

import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getServices } from "@/app/lib/jap";
import { isAdmin } from "@/app/lib/admin";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function verifyAdmin() {
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
  if (!user || !isAdmin(user.email)) return null;
  return user;
}

// ── GET: prices + JAP services list ─────────────────────────────────────────

export async function GET(req: Request) {
  const admin = await verifyAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const resellerId = searchParams.get("reseller_id");
  if (!resellerId) return Response.json({ error: "reseller_id required" }, { status: 400 });

  const db = getSupabaseAdmin();

  // Get JAP services (original prices)
  let japServices: { service: number; name: string; category: string; rate: string; min: string; max: string }[] = [];
  try {
    japServices = await getServices();
  } catch {
    // if JAP fails just return existing prices
  }

  // Get existing reseller prices
  const { data: prices } = await db
    .from("smm_reseller_prices")
    .select("id, service_id, service_name, category, rate")
    .eq("reseller_id", resellerId)
    .order("service_id");

  const priceMap: Record<number, { id: string; rate: number }> = {};
  (prices ?? []).forEach((p) => {
    priceMap[p.service_id] = { id: p.id, rate: parseFloat(p.rate) };
  });

  // Merge: each JAP service with reseller price (if set)
  const merged = japServices.map((s) => ({
    service_id: s.service,
    service_name: s.name,
    category: s.category,
    jap_rate: parseFloat(s.rate),
    reseller_rate: priceMap[s.service]?.rate ?? null,
    price_id: priceMap[s.service]?.id ?? null,
  }));

  return Response.json({ services: merged, count: merged.length });
}

// ── POST: bulk upsert prices ─────────────────────────────────────────────────

export async function POST(req: Request) {
  const admin = await verifyAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { reseller_id, prices } = await req.json();
  if (!reseller_id || !Array.isArray(prices)) {
    return Response.json({ error: "reseller_id and prices[] required" }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  // Upsert all prices
  const rows = prices.map((p: { service_id: number; service_name: string; category: string; rate: number }) => ({
    reseller_id,
    service_id: p.service_id,
    service_name: p.service_name,
    category: p.category,
    rate: p.rate,
  }));

  const { error } = await db
    .from("smm_reseller_prices")
    .upsert(rows, { onConflict: "reseller_id,service_id" });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true, count: rows.length });
}

// ── DELETE: remove a price ───────────────────────────────────────────────────

export async function DELETE(req: Request) {
  const admin = await verifyAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { reseller_id, service_id } = await req.json();
  if (!reseller_id || !service_id) {
    return Response.json({ error: "reseller_id and service_id required" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { error } = await db
    .from("smm_reseller_prices")
    .delete()
    .eq("reseller_id", reseller_id)
    .eq("service_id", service_id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
