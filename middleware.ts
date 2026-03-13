import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CUSTOM_DOMAIN = "www.trustmind.online";
const VERCEL_DOMAINS = ["farmmind-livid.vercel.app", "trustmind-livid.vercel.app"];

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";

  // Redirect Vercel deployment URLs to the custom domain
  if (VERCEL_DOMAINS.some((d) => host.includes(d))) {
    const url = request.nextUrl.clone();
    url.host = CUSTOM_DOMAIN;
    url.port = "";
    url.protocol = "https:";
    return NextResponse.redirect(url, { status: 301 });
  }

  return NextResponse.next();
}

export const config = {
  // Run on all routes except static files and api
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
