/**
 * GET /api/panel/[slug]/orders
 * Returns orders for the authenticated user on this child panel.
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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const user = await getUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

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

  // Get orders for this user on this reseller's panel
  const { data: orders } = await admin
    .from("smm_orders")
    .select("id, jap_order_id, service_name, category, link, quantity, charge, status, created_at")
    .eq("user_id", user.id)
    .eq("reseller_id", reseller.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return Response.json({ orders: orders || [] });
}
