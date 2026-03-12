import { getServices } from "@/app/lib/jap";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET() {
  try {
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
    if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });

    // Markup sobre precio de JAP: 200% de ganancia = precio × 3
    const MARKUP_MULTIPLIER = 3.0;

    const rawServices = await getServices();
    const services = rawServices.map((s) => ({
      ...s,
      rate: (parseFloat(s.rate) * MARKUP_MULTIPLIER).toFixed(2),
    }));

    return Response.json({ services });
  } catch (error) {
    console.error("SMM services error:", error);
    return Response.json({ error: "Error obteniendo servicios" }, { status: 500 });
  }
}
