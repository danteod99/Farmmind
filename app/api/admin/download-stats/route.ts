import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const REPOS = [
  { name: "TrustInsta", product: "trustinsta", repo: "danteod99/trustmind-releases" },
  { name: "TrustFace", product: "trustface", repo: "danteod99/trustface-releases" },
  { name: "TrustFarm", product: "trustfarm", repo: "danteod99/trustfarm-releases" },
];

interface Asset {
  name: string;
  download_count: number;
  size: number;
}

interface Release {
  tag_name: string;
  published_at: string;
  assets: Asset[];
}

export async function GET() {
  try {
    const sb = getSupabaseAdmin();

    // Fetch all active subscriptions
    const { data: allSubs } = await sb
      .from("tm_subscriptions")
      .select("user_id, product, tier, expires_at")
      .eq("tier", "pro");

    const now = new Date();
    const activeSubs = (allSubs || []).filter((s) => new Date(s.expires_at) > now);

    // Count unique paying users per product
    const paidByProduct: Record<string, Set<string>> = {};
    const allPaidUsers = new Set<string>();

    for (const sub of activeSubs) {
      const p = (sub.product || "").toLowerCase();
      allPaidUsers.add(sub.user_id);
      // Map product to app names
      if (p === "trustinsta" || p === "bundle" || p === "all" || !p) {
        if (!paidByProduct["TrustInsta"]) paidByProduct["TrustInsta"] = new Set();
        paidByProduct["TrustInsta"].add(sub.user_id);
      }
      if (p === "trustface" || p === "bundle" || p === "all" || !p) {
        if (!paidByProduct["TrustFace"]) paidByProduct["TrustFace"] = new Set();
        paidByProduct["TrustFace"].add(sub.user_id);
      }
      if (p === "trustfarm" || p === "bundle" || p === "all") {
        if (!paidByProduct["TrustFarm"]) paidByProduct["TrustFarm"] = new Set();
        paidByProduct["TrustFarm"].add(sub.user_id);
      }
    }

    // Total registered users in tm_subscriptions (including expired)
    const { count: totalSubUsers } = await sb
      .from("tm_subscriptions")
      .select("user_id", { count: "exact", head: true });

    // Unique users who ever had a subscription
    const uniquePaidEver = new Set((allSubs || []).map((s) => s.user_id));

    // Fetch GitHub download stats
    const results = await Promise.all(
      REPOS.map(async ({ name, repo }) => {
        const res = await fetch(`https://api.github.com/repos/${repo}/releases`, {
          headers: { Accept: "application/vnd.github+json" },
          next: { revalidate: 300 },
        });
        if (!res.ok) return { name, repo, total: 0, mac: 0, windows: 0, latest: null, releases: [], paid: 0, paidActive: 0 };

        const releases: Release[] = await res.json();
        let mac = 0;
        let windows = 0;

        const releaseSummary = releases.slice(0, 10).map((r) => {
          const rMac = r.assets.filter((a) => a.name.endsWith(".dmg")).reduce((s, a) => s + a.download_count, 0);
          const rWin = r.assets.filter((a) => a.name.endsWith(".exe")).reduce((s, a) => s + a.download_count, 0);
          mac += rMac;
          windows += rWin;
          return { version: r.tag_name, date: r.published_at, mac: rMac, windows: rWin, total: rMac + rWin };
        });

        return {
          name,
          repo,
          total: mac + windows,
          mac,
          windows,
          latest: releases[0]?.tag_name || null,
          releases: releaseSummary,
          paidActive: paidByProduct[name]?.size || 0,
        };
      })
    );

    const grandTotal = results.reduce((s, r) => s + r.total, 0);
    const totalPaidActive = allPaidUsers.size;
    const totalPaidEver = uniquePaidEver.size;

    return NextResponse.json({
      apps: results,
      grandTotal,
      subscriptions: {
        totalActive: totalPaidActive,
        totalEver: totalPaidEver,
        conversionRate: grandTotal > 0 ? ((totalPaidActive / grandTotal) * 100).toFixed(1) : "0",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch download stats" }, { status: 500 });
  }
}
