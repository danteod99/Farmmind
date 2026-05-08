import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getMultipleOrders } from "@/app/lib/jap";

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

    // Obtener pedidos del usuario
    const { data: orders } = await admin
      .from("smm_orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    // Sincronizar estados con JAP para pedidos activos
    const activeOrders = (orders || []).filter(
      (o) => o.status === "pending" || o.status === "processing" || o.status === "inprogress"
    );

    if (activeOrders.length > 0) {
      try {
        const japIds = activeOrders.map((o) => o.jap_order_id);
        const statuses = await getMultipleOrders(japIds);

        for (const order of activeOrders) {
          const japStatus = statuses[order.jap_order_id];
          if (japStatus && japStatus.status !== order.status) {
            await admin
              .from("smm_orders")
              .update({
                status: japStatus.status,
                start_count: japStatus.start_count,
                remains: japStatus.remains,
                updated_at: new Date().toISOString(),
              })
              .eq("id", order.id);
          }
        }
      } catch { /* Continuar aunque falle la sincronización */ }
    }

    // Obtener balance del usuario
    const { data: balanceData } = await admin
      .from("smm_balances")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    // Re-obtener pedidos actualizados
    const { data: updatedOrders } = await admin
      .from("smm_orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    // ¿Tiene descuento de red? (founder o suscrito)
    const [{ data: pos }, { data: profile }] = await Promise.all([
      admin.from("network_positions").select("is_founder").eq("user_id", user.id).maybeSingle(),
      admin.from("profiles")
        .select("subscription_plan, subscription_status, stripe_subscription_id")
        .eq("id", user.id).maybeSingle(),
    ]);
    const isFounder = pos?.is_founder === true;
    const isSubscribed = (
      profile?.subscription_plan === "pro" &&
      Boolean(profile?.stripe_subscription_id) &&
      (profile?.subscription_status === "active" || profile?.subscription_status === "trialing")
    );
    const networkDiscount = isFounder || isSubscribed ? 0.30 : 0;

    return Response.json({
      orders: updatedOrders || [],
      balance: balanceData?.balance || 0,
      network_discount: networkDiscount,
      is_founder: isFounder,
      is_subscribed: isSubscribed,
    });
  } catch (error) {
    console.error("SMM orders error:", error);
    return Response.json({ error: "Error obteniendo pedidos" }, { status: 500 });
  }
}
