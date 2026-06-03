import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PurchasePixelTracker } from "@/app/components/PurchasePixelTracker";

// Layout del panel SMM.
// Política: cualquier user logueado puede entrar (modelo freemium —
// "Probar Gratis" del 2026-06-03). El gating por Pro se hace por feature
// dentro de cada página (cursos requiere anual, recargar=Stripe, etc).
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

  return <><PurchasePixelTracker />{children}</>;
}
