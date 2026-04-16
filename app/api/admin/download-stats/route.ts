import { NextResponse } from "next/server";

const REPOS = [
  { name: "TrustInsta", repo: "danteod99/trustmind-releases" },
  { name: "TrustFace", repo: "danteod99/trustface-releases" },
  { name: "TrustFarm", repo: "danteod99/trustfarm-releases" },
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
    const results = await Promise.all(
      REPOS.map(async ({ name, repo }) => {
        const res = await fetch(`https://api.github.com/repos/${repo}/releases`, {
          headers: { Accept: "application/vnd.github+json" },
          next: { revalidate: 300 }, // cache 5 min
        });
        if (!res.ok) return { name, repo, total: 0, mac: 0, windows: 0, latest: null, releases: [] };

        const releases: Release[] = await res.json();
        let mac = 0;
        let windows = 0;

        const releaseSummary = releases.slice(0, 10).map((r) => {
          const rMac = r.assets
            .filter((a) => a.name.endsWith(".dmg"))
            .reduce((s, a) => s + a.download_count, 0);
          const rWin = r.assets
            .filter((a) => a.name.endsWith(".exe"))
            .reduce((s, a) => s + a.download_count, 0);
          mac += rMac;
          windows += rWin;
          return {
            version: r.tag_name,
            date: r.published_at,
            mac: rMac,
            windows: rWin,
            total: rMac + rWin,
          };
        });

        return {
          name,
          repo,
          total: mac + windows,
          mac,
          windows,
          latest: releases[0]?.tag_name || null,
          releases: releaseSummary,
        };
      })
    );

    const grandTotal = results.reduce((s, r) => s + r.total, 0);

    return NextResponse.json({ apps: results, grandTotal });
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch download stats" }, { status: 500 });
  }
}
