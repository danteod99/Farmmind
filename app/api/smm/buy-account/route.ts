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

    const { accountId, accountTitle, price } = await req.json();

    if (!accountId || !accountTitle || !price) {
      return Response.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const orderPrice = parseFloat(price);

    // Deduct balance atomically via RPC (prevents race conditions)
    const { data: newBalance, error: deductError } = await admin.rpc("decrement_balance", {
      p_user_id: user.id,
      p_amount: orderPrice,
    });

    if (deductError) {
      if (deductError.message?.includes("insufficient_balance")) {
        const { data: balCheck } = await admin.from("smm_balances").select("balance").eq("user_id", user.id).single();
        const currentBal = parseFloat(balCheck?.balance) || 0;
        return Response.json({
          error: `Saldo insuficiente. Necesitas $${orderPrice.toFixed(2)} USD, tienes $${currentBal.toFixed(2)} USD`
        }, { status: 400 });
      }
      console.error("Buy account deduct error:", deductError);
      return Response.json({ error: "Error procesando el pago" }, { status: 500 });
    }

    // Create order record in smm_orders (jap_order_id = 0 for manual orders)
    const { data: order, error: orderError } = await admin
      .from("smm_orders")
      .insert({
        user_id: user.id,
        jap_order_id: 0,
        service_id: `premium-${accountId}`,
        service_name: accountTitle,
        category: "Cuenta Premium",
        link: user.email || "manual",
        quantity: 1,
        rate: orderPrice,
        charge: orderPrice,
        status: "pending",
      })
      .select()
      .single();

    if (orderError) {
      // Refund balance on order creation failure
      await admin.rpc("increment_balance", { p_user_id: user.id, p_amount: orderPrice });
      console.error("Buy account insert error:", orderError);
      return Response.json({ error: "Error guardando el pedido. Saldo reembolsado." }, { status: 500 });
    }

    return Response.json({ success: true, order });
  } catch (error) {
    console.error("Buy account error:", error);
    return Response.json({ error: "Error procesando compra" }, { status: 500 });
  }
}
