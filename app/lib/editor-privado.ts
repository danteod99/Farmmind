import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { isAdmin } from "@/app/lib/admin";

// Herramienta privada: solo el equipo de edición de Dante (allowlist) y admin.
// Los videos en bruto y editados viven en el bucket privado `editor-privado`;
// el procesamiento lo hace la Mac de Dante vía editor-bridge (service role).

export const BUCKET = "editor-privado";

export function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function getAllowedUser(): Promise<{ email: string; admin: boolean } | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAll(cookiesToSet: any[]) {
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: unknown }) =>
            cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
          );
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;
  if (isAdmin(user.email)) return { email: user.email, admin: true };
  const { data } = await getAdmin()
    .from("editor_allowlist")
    .select("email")
    .eq("email", user.email.toLowerCase())
    .maybeSingle();
  return data ? { email: user.email, admin: false } : null;
}
