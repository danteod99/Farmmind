import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { isAdmin, getAdminEmails } from "@/app/lib/admin";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();

  const sbCookies = cookieStore.getAll()
    .filter((c) => c.name.startsWith("sb-"))
    .map((c) => ({ name: c.name, hasValue: !!c.value, valueLength: c.value?.length || 0 }));

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    authenticated: !!user,
    user: user ? {
      id: user.id,
      email: user.email,
      provider: user.app_metadata?.provider,
    } : null,
    isAdmin: user ? isAdmin(user.email) : false,
    adminEmailsConfig: getAdminEmails(),
    error: error?.message || null,
    sbCookies,
  });
}
