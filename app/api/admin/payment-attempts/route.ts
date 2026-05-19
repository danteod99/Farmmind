import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isAdmin } from "@/app/lib/admin";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: Request) {
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
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            );
          },
        },
      }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdmin(user.email)) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // 'abandoned' | 'failed' | 'succeeded' | null=all
    const limit = Math.min(500, parseInt(searchParams.get("limit") || "100", 10));

    const admin = getSupabaseAdmin();
    let query = admin
      .from("payment_attempts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status && ["abandoned", "failed", "succeeded", "initiated"].includes(status)) {
      query = query.eq("status", status);
    }

    const { data: attempts, error } = await query;
    if (error) {
      console.error("payment-attempts error:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Stats agregadas
    const all = attempts || [];
    const stats = {
      total: all.length,
      abandoned: all.filter((a) => a.status === "abandoned").length,
      failed: all.filter((a) => a.status === "failed").length,
      succeeded: all.filter((a) => a.status === "succeeded").length,
      lostRevenue: all
        .filter((a) => a.status === "abandoned" || a.status === "failed")
        .reduce((sum, a) => sum + (Number(a.amount) || 0), 0),
    };

    return Response.json({ attempts: all, stats });
  } catch (error) {
    console.error("payment-attempts exception:", error);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
