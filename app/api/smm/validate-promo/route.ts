import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Validates a promo code and returns the bonus amount
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

    const { code, amount } = await req.json();

    if (!code || typeof code !== "string") {
      return Response.json({ valid: false, message: "Código inválido" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // Look up the promo code (case-insensitive)
    const { data: promo, error } = await admin
      .from("promo_codes")
      .select("*")
      .eq("code", code.toUpperCase().trim())
      .eq("active", true)
      .single();

    if (error || !promo) {
      return Response.json({ valid: false, message: "Código no válido o inactivo" });
    }

    // Check expiry
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      return Response.json({ valid: false, message: "Este código ha expirado" });
    }

    // Check max uses
    if (promo.current_uses >= promo.max_uses) {
      return Response.json({ valid: false, message: "Este código ya alcanzó su límite de usos" });
    }

    // Check if the recharge amount meets minimum
    const rechargeAmount = parseFloat(amount) || 0;
    if (rechargeAmount < promo.min_recharge) {
      return Response.json({
        valid: false,
        message: `Este código requiere una recarga mínima de $${promo.min_recharge.toFixed(2)} USD`,
      });
    }

    // Check if user already used this code
    const { data: alreadyUsed } = await admin
      .from("smm_transactions")
      .select("id")
      .eq("user_id", user.id)
      .eq("promo_code", code.toUpperCase().trim())
      .eq("promo_applied", true)
      .limit(1);

    if (alreadyUsed && alreadyUsed.length > 0) {
      return Response.json({ valid: false, message: "Ya usaste este código anteriormente" });
    }

    return Response.json({
      valid: true,
      bonus_usd: promo.bonus_usd,
      min_recharge: promo.min_recharge,
      message: `🎉 ¡Código válido! Recibirás $${promo.bonus_usd.toFixed(2)} USD extra`,
    });

  } catch (error) {
    console.error("Validate promo error:", error);
    return Response.json({ valid: false, message: "Error al validar el código" }, { status: 500 });
  }
}
