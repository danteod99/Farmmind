import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isAdmin } from "@/app/lib/admin";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function inferSource(attr: {
  utm_source: string | null; fbclid: string | null; gclid: string | null;
  ttclid: string | null; referrer: string | null;
} | null): string {
  if (!attr) return "Pre-tracking (sin data)";
  if (attr.fbclid) return "Facebook Ads";
  if (attr.gclid) return "Google Ads";
  if (attr.ttclid) return "TikTok Ads";
  if (attr.utm_source) {
    const s = attr.utm_source.toLowerCase();
    if (s === "direct") return "Directo";
    if (s.includes("facebook")) return "Facebook orgánico";
    if (s.includes("instagram")) return "Instagram orgánico";
    if (s.includes("tiktok")) return "TikTok orgánico";
    if (s.includes("youtube")) return "YouTube";
    if (s === "search") return "Búsqueda";
    if (s === "referral") return "Referencia";
    return attr.utm_source;
  }
  if (attr.referrer) {
    try {
      const host = new URL(attr.referrer).hostname.replace("www.", "");
      return `Ref: ${host}`;
    } catch { return "Referencia"; }
  }
  return "Desconocida";
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setAll(cookiesToSet: any[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            );
          },
        },
      }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdmin(user.email)) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }

    const admin = getSupabaseAdmin();

    // Users con Pro activo
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, subscription_plan, subscription_status, subscription_period_end")
      .eq("subscription_plan", "pro")
      .in("subscription_status", ["active", "trialing"]);

    const userIds = (profiles || []).map(p => p.id);
    if (userIds.length === 0) {
      return Response.json({ users: [], stats: { totalPaid: 0, bySource: {}, totalRevenue: 0 } });
    }

    // Auth users
    const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const usersById = new Map(authData.users.map(u => [u.id, u]));

    // Attribution
    const { data: attrs } = await admin
      .from("user_attribution")
      .select("user_id, utm_source, utm_medium, utm_campaign, utm_content, fbclid, gclid, ttclid, referrer, landing_page, created_at")
      .in("user_id", userIds);
    const attrById = new Map((attrs || []).map(a => [a.user_id, a]));

    // Balances
    const { data: bals } = await admin
      .from("smm_balances")
      .select("user_id, balance")
      .in("user_id", userIds);
    const balById = new Map((bals || []).map(b => [b.user_id, Number(b.balance)]));

    // Total revenue from Stripe transactions
    const { data: txs } = await admin
      .from("smm_transactions")
      .select("user_id, amount, payment_provider, status")
      .in("user_id", userIds)
      .eq("payment_provider", "stripe")
      .eq("status", "finished");
    const revenueByUser: Record<string, number> = {};
    (txs || []).forEach(t => {
      revenueByUser[t.user_id] = (revenueByUser[t.user_id] || 0) + Number(t.amount);
    });

    // Build response
    const users = (profiles || []).map(p => {
      const u = usersById.get(p.id);
      const attr = attrById.get(p.id) || null;
      return {
        id: p.id,
        email: u?.email || "",
        name: u?.user_metadata?.full_name || u?.email?.split("@")[0] || "Usuario",
        created_at: u?.created_at || null,
        subscription_period_end: p.subscription_period_end,
        balance: balById.get(p.id) ?? 0,
        revenue: revenueByUser[p.id] || 0,
        source: inferSource(attr),
        attribution: attr,
      };
    });

    // Stats agregadas
    const bySource: Record<string, { count: number; revenue: number }> = {};
    let totalRevenue = 0;
    users.forEach(u => {
      if (!bySource[u.source]) bySource[u.source] = { count: 0, revenue: 0 };
      bySource[u.source].count++;
      bySource[u.source].revenue += u.revenue;
      totalRevenue += u.revenue;
    });

    return Response.json({
      users: users.sort((a, b) => b.revenue - a.revenue),
      stats: {
        totalPaid: users.length,
        totalRevenue,
        bySource,
      },
    });
  } catch (error) {
    console.error("paid-attribution error:", error);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
