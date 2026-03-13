import { createClient } from "@supabase/supabase-js";

// Public (no auth required) — returns global order count per service_id
// Used for popularity sorting on the services page
export async function GET() {
  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Count orders per service across all users
    const { data } = await admin
      .from("smm_orders")
      .select("service_id");

    const counts: Record<string, number> = {};
    (data || []).forEach((row: { service_id: string | number }) => {
      const id = String(row.service_id);
      counts[id] = (counts[id] || 0) + 1;
    });

    return Response.json({ counts });
  } catch (error) {
    console.error("Service stats error:", error);
    return Response.json({ counts: {} });
  }
}
