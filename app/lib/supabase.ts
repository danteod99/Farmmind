import { createBrowserClient } from "@supabase/ssr";

let _supabase: ReturnType<typeof createBrowserClient> | null = null;

function getSupabase() {
  if (!_supabase) {
    _supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key"
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
