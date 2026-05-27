import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { calculateCost, isValidAction, type DesktopApp } from "@/app/lib/desktopActionCosts";

/**
 * POST /api/desktop/charge
 * Cobra cierta cantidad de acciones del balance del user autenticado.
 *
 * Body: {
 *   action: "like" | "follow" | "comment" | ...,
 *   count: number,
 *   app: "trustinsta" | "trustface"
 * }
 *
 * Returns:
 *   200 { success: true, charged, newBalance } si se descontó OK
 *   402 { insufficient_balance: true, currentBalance, needed } si saldo insuficiente
 *   400 { error } si bad request
 *   401 { error } si no autenticado
 */

export async function POST(request: NextRequest) {
  // 1. Auth check via cookies
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // 2. Parse body
  let body: { action?: string; count?: number; app?: DesktopApp };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action, count, app } = body;
  if (!action || !isValidAction(action)) {
    return NextResponse.json({ error: `Action inválida: ${action}` }, { status: 400 });
  }
  if (typeof count !== "number" || count < 1 || count > 10000) {
    return NextResponse.json({ error: "Count debe ser 1-10000" }, { status: 400 });
  }
  if (app !== "trustinsta" && app !== "trustface") {
    return NextResponse.json({ error: "App inválida" }, { status: 400 });
  }

  // 3. Calculate cost
  const cost = calculateCost(action, count);

  // 4. Decrement balance atomically via RPC (existing)
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: newBalance, error: deductError } = await admin.rpc("decrement_balance", {
    p_user_id: user.id,
    p_amount: cost,
  });

  if (deductError) {
    if (deductError.message?.includes("insufficient_balance")) {
      const { data: balCheck } = await admin
        .from("smm_balances")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();
      const currentBalance = parseFloat(balCheck?.balance) || 0;
      return NextResponse.json(
        {
          insufficient_balance: true,
          currentBalance,
          needed: cost,
          message: "Saldo insuficiente para esta acción",
        },
        { status: 402 }
      );
    }
    console.error("[desktop/charge] decrement error:", deductError);
    return NextResponse.json({ error: "Error procesando cargo" }, { status: 500 });
  }

  // 5. Log audit (fire-and-forget, no bloquea response)
  admin.from("desktop_action_charges").insert({
    user_id: user.id,
    app,
    action,
    count,
    cost,
  }).then(({ error }) => {
    if (error) console.error("[desktop/charge] audit log failed:", error.message);
  });

  return NextResponse.json({
    success: true,
    charged: cost,
    newBalance: Number(newBalance),
  });
}

/**
 * GET /api/desktop/charge
 * Devuelve el balance actual del user (helper para refresh en desktop apps)
 */
export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: bal } = await admin
    .from("smm_balances")
    .select("balance")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({ balance: Number(bal?.balance) || 0 });
}
