import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { rateLimitResponse } from "@/app/lib/rate-limit";
import { dsCall, normalizeProduct, getCategoryKeyById, ALLOWED_CATEGORY_IDS } from "../_lib";

export const runtime = "nodejs";
export const maxDuration = 60;

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const SLEEP = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Polling: dark.shopping puede tardar varios segundos en entregar.
// Probamos hasta ~30s con backoff suave.
const POLL_INTERVAL_MS = 2500;
const POLL_MAX_ATTEMPTS = 12; // ~30s

export async function POST(req: Request) {
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

    // Rate limit: 5 órdenes/min
    const rl = rateLimitResponse(`accounts_order:${user.id}`, 5);
    if (rl) return rl;

    const body = await req.json().catch(() => ({}));
    const productId = String(body.product_id || "").trim();
    const quantity = Math.max(1, parseInt(String(body.quantity || 1), 10) || 1);

    if (!productId) return Response.json({ error: "product_id requerido" }, { status: 400 });
    if (quantity > 100) return Response.json({ error: "Cantidad máxima 100" }, { status: 400 });

    // ── 1. Validar producto en dark.shopping ──
    const productRes = await dsCall<unknown>("product/view", { id: productId });
    if (!productRes.success) {
      return Response.json({ error: "Producto no encontrado en proveedor" }, { status: 404 });
    }
    const product = normalizeProduct(productRes.data as Parameters<typeof normalizeProduct>[0]);

    // Solo categorías permitidas
    const catIdRaw = (productRes.data as { category?: { id?: number } })?.category?.id;
    if (!catIdRaw || !ALLOWED_CATEGORY_IDS.includes(catIdRaw)) {
      return Response.json({ error: "Categoría no disponible" }, { status: 403 });
    }
    if (product.is_manual) {
      return Response.json({ error: "Este producto requiere entrega manual. Contacta soporte." }, { status: 400 });
    }
    if (product.qty_available < quantity) {
      return Response.json({ error: "Stock insuficiente" }, { status: 409 });
    }
    if (quantity < product.min_qty) {
      return Response.json({ error: `Cantidad mínima: ${product.min_qty}` }, { status: 400 });
    }

    const unitPriceUsd = product.price_usd;
    const totalCostUsd = Math.round(unitPriceUsd * quantity * 100) / 100;

    // ── 2. Crear fila pending ──
    const admin = getSupabaseAdmin();
    const idempotenceId = crypto.randomUUID();

    const { data: orderRow, error: insertErr } = await admin
      .from("accounts_orders")
      .insert({
        user_id: user.id,
        provider: "dark.shopping",
        product_id: productId,
        product_name: product.name,
        quantity,
        unit_price_usd: unitPriceUsd,
        total_cost_usd: totalCostUsd,
        status: "pending",
        idempotence_id: idempotenceId,
      })
      .select("id")
      .single();

    if (insertErr || !orderRow) {
      console.error("insert accounts_orders failed", insertErr);
      return Response.json({ error: "Error registrando pedido" }, { status: 500 });
    }

    const orderRowId = orderRow.id;

    // ── 3. Debitar saldo USD (atómico, falla si insufficient) ──
    const { error: debitErr } = await admin.rpc("decrement_balance", {
      p_user_id: user.id,
      p_amount: totalCostUsd,
    });
    if (debitErr) {
      await admin.from("accounts_orders")
        .update({ status: "failed", error_message: "Saldo insuficiente" })
        .eq("id", orderRowId);
      return Response.json({ error: "Saldo insuficiente. Recarga para continuar." }, { status: 402 });
    }

    // ── 4. Crear orden en dark.shopping ──
    let providerOrderId: string | null = null;
    try {
      const createRes = await dsCall<{ id?: number | string }>(
        "order/create",
        { product: productId, quantity, idempotence_id: idempotenceId },
        { method: "POST" }
      );
      if (!createRes.success) {
        // Refund: devolver saldo
        await admin.rpc("increment_balance", { p_user_id: user.id, p_amount: totalCostUsd });
        const errMsg = JSON.stringify((createRes as unknown as { data?: unknown }).data || createRes);
        await admin.from("accounts_orders")
          .update({ status: "refunded", error_message: `Proveedor rechazó: ${errMsg.slice(0, 500)}` })
          .eq("id", orderRowId);
        return Response.json({
          error: "El proveedor no pudo completar la orden. Saldo devuelto.",
        }, { status: 502 });
      }
      providerOrderId = String(createRes.data?.id || "");
    } catch (e) {
      await admin.rpc("increment_balance", { p_user_id: user.id, p_amount: totalCostUsd });
      await admin.from("accounts_orders")
        .update({ status: "refunded", error_message: `network: ${String(e).slice(0, 300)}` })
        .eq("id", orderRowId);
      return Response.json({ error: "Error de red con proveedor. Saldo devuelto." }, { status: 502 });
    }

    await admin.from("accounts_orders")
      .update({ status: "processing", provider_order_id: providerOrderId })
      .eq("id", orderRowId);

    // ── 5. Polling estado ──
    let finalStatus: string | null = null;
    for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
      await SLEEP(POLL_INTERVAL_MS);
      try {
        const st = await dsCall<{ status?: string }>("order/status", { id: providerOrderId });
        if (st.success) {
          const s = (st.data?.status || "").toLowerCase();
          if (s === "completed" || s === "complete" || s === "delivered" || s === "success") {
            finalStatus = "completed";
            break;
          }
          if (s === "cancelled" || s === "canceled" || s === "failed" || s === "error") {
            finalStatus = "failed";
            break;
          }
        }
      } catch {
        // sigue intentando
      }
    }

    // ── 6. Descargar credenciales si completed ──
    if (finalStatus === "completed") {
      try {
        const dl = await dsCall<{ items?: string[] | string; data?: string }>(
          "order/download",
          { id: providerOrderId }
        );
        let credentials = "";
        if (dl.success) {
          const raw = dl.data as unknown;
          if (typeof raw === "string") credentials = raw;
          else if (Array.isArray(raw)) credentials = (raw as string[]).join("\n");
          else if (raw && typeof raw === "object") {
            const r = raw as { items?: unknown; data?: unknown; text?: unknown };
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
          .eq("id", orderRowId);

        return Response.json({
          success: true,
          order_id: orderRowId,
          status: "completed",
          credentials,
          category: getCategoryKeyById(catIdRaw),
        });
      } catch (e) {
        // Quedó pagado pero no se descargó — el usuario verá "processing" en su lista
        await admin.from("accounts_orders")
          .update({ status: "processing", error_message: `download_pending: ${String(e).slice(0, 200)}` })
          .eq("id", orderRowId);
        return Response.json({
          success: true,
          order_id: orderRowId,
          status: "processing",
          message: "Pedido pagado. Las credenciales aparecerán en 'Mis pedidos' en breve.",
        });
      }
    }

    if (finalStatus === "failed") {
      await admin.rpc("increment_balance", { p_user_id: user.id, p_amount: totalCostUsd });
      await admin.from("accounts_orders")
        .update({ status: "refunded", error_message: "Proveedor canceló la orden" })
        .eq("id", orderRowId);
      return Response.json({
        error: "El proveedor canceló la orden. Saldo devuelto.",
      }, { status: 502 });
    }

    // Timeout — queda en processing, el user lo verá en su lista
    return Response.json({
      success: true,
      order_id: orderRowId,
      status: "processing",
      message: "Pedido en proceso. Aparecerán las credenciales en 'Mis pedidos' en breve.",
    });
  } catch (e) {
    console.error("[/api/accounts/order] error:", e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
