import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isAdmin } from "@/app/lib/admin";

const CUSTOM_DOMAIN = "www.trustmind.online";
const VERCEL_DOMAINS = ["farmmind-livid.vercel.app", "trustmind-livid.vercel.app"];

// ── Helper: create Supabase middleware client that forwards auth cookies ──
// This ensures PKCE code_verifier and session cookies are properly passed
// between browser ↔ middleware ↔ route handlers.
function createSupabaseMiddleware(request: NextRequest, response: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
          );
        },
      },
    }
  );
}

export async function middleware(request: NextRequest) {
  const host = (request.headers.get("host") || "").replace(/:\d+$/, "");
  const pathname = request.nextUrl.pathname;

  // ── Supabase Auth: refresh session & forward cookies ──
  const supabaseResponse = NextResponse.next({ request });
  const supabase = createSupabaseMiddleware(request, supabaseResponse);
  const { data: { user: authUser } } = await supabase.auth.getUser();

  // ── Protect /admin routes ──
  if (pathname.startsWith("/admin")) {
    if (!authUser) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    if (!isAdmin(authUser.email)) {
      const url = request.nextUrl.clone();
      url.pathname = "/smm/services";
      return NextResponse.redirect(url);
    }
  }

  // ── Redirect Vercel preview domains to custom domain ──
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

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
