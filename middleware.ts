import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CUSTOM_DOMAIN = "www.trustmind.online";
const MAIN_DOMAINS = [
  "www.trustmind.online",
  "trustmind.online",
  "farmmind-livid.vercel.app",
  "trustmind-livid.vercel.app",
  "localhost",
];
const VERCEL_DOMAINS = ["farmmind-livid.vercel.app", "trustmind-livid.vercel.app"];

// ── In-memory cache for domain → slug mapping ──
// TTL: 5 minutes. Avoids querying Supabase on every request.
const domainCache = new Map<string, { slug: string; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

async function resolveCustomDomain(domain: string): Promise<string | null> {
  // Check cache first
  const cached = domainCache.get(domain);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.slug;
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) return null;

    const res = await fetch(
      `${supabaseUrl}/rest/v1/smm_resellers?custom_domain=eq.${encodeURIComponent(domain)}&is_active=eq.true&select=slug,custom_domain&limit=1`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      }
    );

    if (!res.ok) return null;
    const data = await res.json();

    if (data.length > 0 && data[0].slug) {
      domainCache.set(domain, { slug: data[0].slug, ts: Date.now() });
      return data[0].slug;
    }
  } catch (e) {
    console.error("[Middleware] Error resolving custom domain:", e);
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const host = (request.headers.get("host") || "").replace(/:\d+$/, ""); // Strip port
  const pathname = request.nextUrl.pathname;

  // Skip non-page routes (API, Next internals, auth, static files)
  const isPageRoute =
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/_next/") &&
    !pathname.startsWith("/auth/") &&
    !pathname.includes(".");

  // ── 1. Redirect Vercel preview domains to custom domain ──
  if (isPageRoute && VERCEL_DOMAINS.some((d) => host.includes(d))) {
    const url = request.nextUrl.clone();
    url.host = CUSTOM_DOMAIN;
    url.port = "";
    url.protocol = "https:";
    return NextResponse.redirect(url, { status: 301 });
  }

  // ── 2. Subdomain detection for child panels (slug.trustmind.online) ──
  // Exclude www and other known subdomains
  const subdomainMatch = host.match(/^([a-z0-9][a-z0-9-]+)\.trustmind\.online$/);
  if (subdomainMatch && isPageRoute && subdomainMatch[1] !== "www") {
    const subSlug = subdomainMatch[1];
    // Rewrite subdomain to /panel/[slug]
    const url = request.nextUrl.clone();
    if (pathname === "/" || pathname === "") {
      url.pathname = `/panel/${subSlug}`;
    } else if (!pathname.startsWith(`/panel/${subSlug}`)) {
      url.pathname = `/panel/${subSlug}${pathname}`;
    }
    const response = pathname.startsWith(`/panel/${subSlug}`) ? NextResponse.next() : NextResponse.rewrite(url);
    response.headers.set("X-Reseller-Slug", subSlug);
    response.cookies.set("reseller_slug", subSlug, { path: "/", maxAge: 86400, sameSite: "lax", secure: true, httpOnly: true });
    return response;
  }

  // ── 3. Custom domain detection for child panels ──
  // If the host is NOT a known main domain, check if it's a reseller's custom domain
  // Note: subdomains of trustmind.online are handled in step 2 above
  const isMainDomain = MAIN_DOMAINS.some((d) => host === d) || host === "www.trustmind.online";

  if (!isMainDomain && isPageRoute) {
    const slug = await resolveCustomDomain(host);

    if (slug) {
      // Rewrite to /panel/[slug] internally, keeping the custom domain in the browser
      const url = request.nextUrl.clone();

      // If already on /panel/[slug], pass through
      if (pathname.startsWith(`/panel/${slug}`)) {
        const response = NextResponse.next();
        response.headers.set("X-Reseller-Slug", slug);
        response.cookies.set("reseller_slug", slug, {
          path: "/",
          maxAge: 86400,
          sameSite: "lax",
          secure: true,
          httpOnly: true,
        });
        return response;
      }

      // Rewrite root or other paths to /panel/[slug]
      if (pathname === "/" || pathname === "") {
        url.pathname = `/panel/${slug}`;
      } else {
        url.pathname = `/panel/${slug}${pathname}`;
      }

      const response = NextResponse.rewrite(url);
      response.headers.set("X-Reseller-Slug", slug);
      response.cookies.set("reseller_slug", slug, {
        path: "/",
        maxAge: 86400,
        sameSite: "lax",
        secure: true,
        httpOnly: true,
      });
      return response;
    }
  }

  // ── 4. /panel/[slug] routes — set reseller context ──
  if (pathname.startsWith("/panel/")) {
    const slugMatch = pathname.match(/^\/panel\/([^/]+)/);
    if (slugMatch) {
      const slug = slugMatch[1];
      const response = NextResponse.next();
      response.headers.set("X-Reseller-Slug", slug);
      response.cookies.set("reseller_slug", slug, {
        path: "/",
        maxAge: 86400,
        sameSite: "lax",
        secure: true,
        httpOnly: true,
      });
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
