import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CUSTOM_DOMAIN = "www.trustmind.online";
const VERCEL_DOMAINS = ["farmmind-livid.vercel.app", "trustmind-livid.vercel.app"];

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;

  // Don't redirect API routes, auth callbacks, or Next.js internals
  // Only redirect actual page navigations to avoid breaking auth cookies and API calls
  const isPageRoute =
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/_next/") &&
    !pathname.startsWith("/auth/") &&
    !pathname.includes(".");

  if (isPageRoute && VERCEL_DOMAINS.some((d) => host.includes(d))) {
    const url = request.nextUrl.clone();
    url.host = CUSTOM_DOMAIN;
    url.port = "";
    url.protocol = "https:";
    return NextResponse.redirect(url, { status: 301 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
