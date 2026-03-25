import { addOrder, getOrderStatus } from "@/app/lib/jap";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { rateLimitResponse } from "@/app/lib/rate-limit";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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

    // Rate limit: max 10 orders per minute per user
    const rl = rateLimitResponse(`order:${user.id}`, 10);
    if (rl) return rl;

    const { serviceId, serviceName, category, link, quantity, rate } = await req.json();

    if (!serviceId || !link || !quantity) {
      return Response.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    // Validate inputs
    const parsedQuantity = parseInt(quantity);
    const parsedRate = parseFloat(rate);
    if (isNaN(parsedQuantity) || parsedQuantity <= 0 || parsedQuantity > 1000000) {
      return Response.json({ error: "Cantidad inválida" }, { status: 400 });
    }
    if (isNaN(parsedRate) || parsedRate <= 0) {
      return Response.json({ error: "Rate inválido" }, { status: 400 });
    }
    try {
      new URL(link);
    } catch {
      return Response.json({ error: "Link debe ser una URL válida" }, { status: 400 });
    }

    const orderCost = (parsedRate / 1000) * parsedQuantity;

    // Descontar balance atómicamente via RPC (evita race conditions)
    const admin = getSupabaseAdmin();
    const { data: deductResult, error: deductError } = await admin.rpc("decrement_balance", {
      p_user_id: user.id,
      p_amount: orderCost,
    });

    if (deductError) {
      if (deductError.message?.includes("insufficient_balance")) {
        const { data: balCheck } = await admin.from("smm_balances").select("balance").eq("user_id", user.id).single();
        const currentBal = parseFloat(balCheck?.balance) || 0;
        return Response.json({
          error: `Balance insuficiente. Necesitas $${orderCost.toFixed(4)}, tienes $${currentBal.toFixed(4)}`
        }, { status: 400 });
      }
      console.error("Decrement balance error:", deductError);
      return Response.json({
        error: `Error al procesar el pago. Intenta de nuevo.`
      }, { status: 400 });
    }

    // Hacer el pedido en JAP
    const japResult = await addOrder({ service: serviceId, link, quantity: parsedQuantity });

    if (japResult.error) {
      // Revertir el balance deducido
      await admin.rpc("increment_balance", { p_user_id: user.id, p_amount: orderCost });
      return Response.json({ error: japResult.error }, { status: 400 });
    }

    // Guardar pedido en Supabase
    const { data: order } = await admin
      .from("smm_orders")
      .insert({
        user_id: user.id,
        jap_order_id: japResult.order,
        service_id: serviceId,
        service_name: serviceName,
        category,
        link,
        quantity: parsedQuantity,
        rate: parsedRate,
        charge: orderCost,
        status: "pending",
      })
      .select()
      .single();

    return Response.json({ success: true, order, japOrderId: japResult.order });
  } catch (error) {
    console.error("SMM order error:", error);
    return Response.json({ error: "Error procesando pedido" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("id");

    if (!orderId) return Response.json({ error: "Se requiere ID del pedido" }, { status: 400 });

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

    const status = await getOrderStatus(parseInt(orderId));
    return Response.json(status);
  } catch (error) {
    console.error("SMM order status error:", error);
    return Response.json({ error: "Error obteniendo estado" }, { status: 500 });
  }
}
