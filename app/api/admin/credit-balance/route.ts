import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { isAdmin } from "@/app/lib/admin";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Admin: acreditar saldo manualmente a un usuario
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
    if (!user || !isAdmin(user.email)) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }

    const { target_user_id, amount, note } = await req.json();

    if (!target_user_id || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return Response.json({ error: "user_id y monto válido requeridos" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const creditAmount = parseFloat(amount);

    // Increment balance atomically via RPC (handles upsert internally, prevents race conditions)
    const { data: newBalance, error: rpcError } = await admin.rpc("increment_balance", {
      p_user_id: target_user_id,
      p_amount: creditAmount,
    });

    if (rpcError) {
      console.error("Error actualizando balance:", rpcError);
      return Response.json({ error: "Error al actualizar balance: " + rpcError.message }, { status: 500 });
    }

    const newBal = parseFloat(newBalance) || 0;
    const previousBalance = newBal - creditAmount;

    // Registrar transacción manual
    await admin
      .from("smm_transactions")
      .insert({
        user_id: target_user_id,
        payment_id: `admin_manual_${Date.now()}`,
        amount: creditAmount,
        currency: "usd",
        status: "finished",
        credited: true,
        nowpayments_data: { note: note || "Acreditación manual por administrador", admin: user.email },
      });

    console.log(`Admin credit OK: user=${target_user_id}, +$${creditAmount}, prev=$${previousBalance.toFixed(2)}, new=$${newBal.toFixed(2)}, admin=${user.email}`);

    return Response.json({
      success: true,
      previous_balance: previousBalance,
      new_balance: newBal,
      credited: creditAmount,
    });

  } catch (error) {
    console.error("Admin credit error:", error);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
