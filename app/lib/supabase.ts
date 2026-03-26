import { createBrowserClient } from "@supabase/ssr";

let _supabase: ReturnType<typeof createBrowserClient> | null = null;

function getSupabase() {
  if (!_supabase) {
    // Share cookies (including the PKCE code_verifier) across all
    // *.trustmind.online subdomains.  Without this, Google OAuth fails
    // because the sign-in starts on slug.trustmind.online but the
    // callback runs on www.trustmind.online and can't read the verifier.
    const isTrustmind =
      typeof window !== "undefined" &&
      (window.location.hostname.endsWith(".trustmind.online") ||
        window.location.hostname === "trustmind.online");

    _supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key",
      isTrustmind
        ? {
            cookieOptions: {
              domain: ".trustmind.online",
              path: "/",
              sameSite: "lax" as const,
              secure: true,
            },
          }
        : undefined
    );
  }
  return _supabase;
}

// Proxy que inicializa de forma lazy
export const supabase = new Proxy({} as ReturnType<typeof createBrowserClient>, {
  get(_target, prop) {
    return getSupabase()[prop as keyof ReturnType<typeof createBrowserClient>];
  },
});
