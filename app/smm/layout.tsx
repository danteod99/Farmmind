import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAdmin } from "@/app/lib/admin";

export default async function SmmLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAll(cookiesToSet: any[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/?required=1");
  }

  // Admins entran sin restricciones
  if (isAdmin(user.email)) {
    return <>{children}</>;
  }

  // Roles que no requieren Pro: panel_client (de child panels) y reseller
  const role = user.user_metadata?.role;
  if (role === "panel_client" || role === "reseller") {
    return <>{children}</>;
  }

  // Verificar Pro tier
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: profile } = await admin
    .from("profiles")
    .select("subscription_plan, subscription_status")
    .eq("id", user.id)
    .maybeSingle();

  // Verificar también tm_subscriptions (cubre auto-recarga y bundle)
  const { data: subs } = await admin
    .from("tm_subscriptions")
    .select("tier, expires_at")
    .eq("user_id", user.id)
    .eq("tier", "pro");

  const now = new Date();
  const hasActiveSub = (subs || []).some(s => s.expires_at && new Date(s.expires_at) > now);

  const isPro =
    hasActiveSub ||
    (profile?.subscription_plan === "pro" &&
      (profile?.subscription_status === "active" ||
        profile?.subscription_status === "trialing"));

  if (!isPro) {
    redirect("/oferta?gate=1");
  }

  return <>{children}</>;
}
