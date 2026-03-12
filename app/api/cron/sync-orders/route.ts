import { createClient } from "@supabase/supabase-js";
import { getMultipleOrders } from "@/app/lib/jap";
import { NextRequest } from "next/server";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Called by Vercel cron or external scheduler every 5–10 minutes
// Protected by CRON_SECRET env var
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Reject if secret is set and header doesn't match
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();

  try {
    // Fetch all active orders across all users (not finished/cancelled)
    const { data: activeOrders, error } = await admin
      .from("smm_orders")
      .select("id, jap_order_id, status, user_id")
      .in("status", ["pending", "processing", "inprogress", "active"])
      .limit(100);

    if (error) throw error;
    if (!activeOrders || activeOrders.length === 0) {
      return Response.json({ message: "No active orders to sync", synced: 0 });
    }

    // Get unique JAP order IDs
    const japIds = activeOrders.map((o) => o.jap_order_id).filter(Boolean);
    if (japIds.length === 0) {
      return Response.json({ message: "No JAP IDs found", synced: 0 });
    }

    // Batch fetch statuses from JAP
    const statuses = await getMultipleOrders(japIds);

    let updatedCount = 0;

    for (const order of activeOrders) {
      const japStatus = statuses[String(order.jap_order_id)];
      if (!japStatus) continue;

      const newStatus = japStatus.status?.toLowerCase();
      if (!newStatus || newStatus === order.status) continue;

      await admin
        .from("smm_orders")
        .update({
          status: newStatus,
          start_count: japStatus.start_count ? parseInt(japStatus.start_count) : null,
          remains: japStatus.remains ? parseInt(japStatus.remains) : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      updatedCount++;
    }

    console.log(`[cron/sync-orders] Synced ${updatedCount}/${activeOrders.length} orders`);

    return Response.json({
      message: "Sync complete",
      checked: activeOrders.length,
      updated: updatedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[cron/sync-orders] Error:", err);
    return Response.json({ error: "Sync failed" }, { status: 500 });
  }
}
