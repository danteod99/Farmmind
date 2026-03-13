import { addOrder, getOrderStatus } from "@/app/lib/jap";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

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

    const { serviceId, serviceName, category, link, quantity, rate } = await req.json();

    if (!serviceId || !link || !quantity) {
      return Response.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    // Verificar balance del usuario en Supabase
    const admin = getSupabaseAdmin();
    const { data: profile } = await admin
      .from("smm_balances")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    const userBalance = profile?.balance || 0;
    const orderCost = (parseFloat(rate) / 1000) * quantity;

    if (userBalance < orderCost) {
      return Response.json({
        error: `Balance insuficiente. Necesitas $${orderCost.toFixed(4)}, tienes $${userBalance.toFixed(4)}`
      }, { status: 400 });
    }

    // Hacer el pedido en JAP
    const japResult = await addOrder({ service: serviceId, link, quantity });

    if (japResult.error) {
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
        quantity,
        rate: parseFloat(rate),
        charge: orderCost,
        status: "pending",
      })
      .select()
      .single();

    // Descontar balance — UPDATE directo para evitar bug de upsert sin onConflict
    await admin
      .from("smm_balances")
      .update({ balance: userBalance - orderCost, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

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
