import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { dsCall } from "../_lib";

export const runtime = "nodejs";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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

    const admin = getSupabaseAdmin();
    const { data: orders, error } = await admin
      .from("accounts_orders")
      .select("id, provider_order_id, product_id, product_name, quantity, unit_price_usd, total_cost_usd, status, credentials_text, error_message, created_at, completed_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("orders fetch err", error);
      return Response.json({ error: "Error consultando pedidos" }, { status: 500 });
    }

    // Re-poll pedidos en "processing" que no tienen credenciales — quizás ya están listos
    const toRefresh = (orders || []).filter(
      (o) => o.status === "processing" && o.provider_order_id && !o.credentials_text
    ).slice(0, 5); // máx 5 por request para no pegar rate limit

    for (const o of toRefresh) {
      try {
        const st = await dsCall<{ status?: string }>("order/status", { id: o.provider_order_id });
        if (!st.success) continue;
        const s = (st.data?.status || "").toLowerCase();
        if (s === "completed" || s === "complete" || s === "delivered" || s === "success") {
          // Bajar credenciales
          const dl = await dsCall<unknown>("order/download", { id: o.provider_order_id });
          let credentials = "";
          if (dl.success) {
            const raw = dl.data as unknown;
            if (typeof raw === "string") credentials = raw;
            else if (Array.isArray(raw)) credentials = (raw as string[]).join("\n");
            else if (raw && typeof raw === "object") {
              const r = raw as { items?: unknown; text?: unknown };
              if (Array.isArray(r.items)) credentials = (r.items as string[]).join("\n");
              else if (typeof r.text === "string") credentials = r.text;
              else credentials = JSON.stringify(raw);
            }
          }
          await admin.from("accounts_orders")
            .update({
              status: "completed",
              credentials_text: credentials || null,
              completed_at: new Date().toISOString(),
            })
            .eq("id", o.id);
          // Actualizar in-memory
          o.status = "completed";
          o.credentials_text = credentials || null;
          o.completed_at = new Date().toISOString();
        } else if (s === "cancelled" || s === "canceled" || s === "failed" || s === "error") {
          // Refund
          await admin.rpc("increment_balance", { p_user_id: user.id, p_amount: o.total_cost_usd });
          await admin.from("accounts_orders")
            .update({ status: "refunded", error_message: "Proveedor canceló" })
            .eq("id", o.id);
          o.status = "refunded";
        }
      } catch {
        // ignorar y seguir
      }
    }

    return Response.json({ orders: orders || [] });
  } catch (e) {
    console.error("[/api/accounts/orders] error:", e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
