import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getResellerUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAll(s: any[]) { s.forEach(({ name, value, options }: any) => cookieStore.set(name, value, options)); },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Verify user is an active reseller
  const admin = getAdmin();
  const { data: reseller } = await admin
    .from("smm_resellers")
    .select("id, is_active")
    .eq("user_id", user.id)
    .single();

  if (!reseller || !reseller.is_active) return null;
  return { user, resellerId: reseller.id };
}

// GET — list reseller's own promo codes
export async function GET() {
  try {
    const ctx = await getResellerUser();
    if (!ctx) return Response.json({ error: "No autorizado" }, { status: 403 });

    const admin = getAdmin();
    const { data, error } = await admin
      .from("promo_codes")
      .select("*")
      .eq("reseller_id", ctx.resellerId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return Response.json({ codes: data });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST — create a new promo code for this reseller
export async function POST(req: Request) {
  try {
    const ctx = await getResellerUser();
    if (!ctx) return Response.json({ error: "No autorizado" }, { status: 403 });

    const body = await req.json();
    const { code, bonus_usd, min_recharge, max_uses, expires_at } = body;

    if (!code || !bonus_usd || bonus_usd <= 0) {
      return Response.json({ error: "Código y bono son requeridos" }, { status: 400 });
    }
    if (parseFloat(bonus_usd) > 50) {
      return Response.json({ error: "El bono máximo es $50 USD" }, { status: 400 });
    }

    const admin = getAdmin();
    const { data, error } = await admin
      .from("promo_codes")
      .insert({
        code: code.toUpperCase().trim(),
        bonus_usd: parseFloat(bonus_usd),
        min_recharge: parseFloat(min_recharge) || 20,
        max_uses: parseInt(max_uses) || 50,
        expires_at: expires_at || null,
        active: true,
        reseller_id: ctx.resellerId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") return Response.json({ error: "Ya existe un código con ese nombre" }, { status: 400 });
      throw error;
    }
    return Response.json({ success: true, code: data });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

// PATCH — toggle active or update fields (own codes only)
export async function PATCH(req: Request) {
  try {
    const ctx = await getResellerUser();
    if (!ctx) return Response.json({ error: "No autorizado" }, { status: 403 });

    const { id, ...updates } = await req.json();
    if (!id) return Response.json({ error: "id requerido" }, { status: 400 });

    // Prevent changing reseller_id
    delete updates.reseller_id;

    const admin = getAdmin();
    const { error } = await admin
      .from("promo_codes")
      .update(updates)
      .eq("id", id)
      .eq("reseller_id", ctx.resellerId);

    if (error) throw error;
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE — delete own code
export async function DELETE(req: Request) {
  try {
    const ctx = await getResellerUser();
    if (!ctx) return Response.json({ error: "No autorizado" }, { status: 403 });

    const { id } = await req.json();
    if (!id) return Response.json({ error: "id requerido" }, { status: 400 });

    const admin = getAdmin();
    const { error } = await admin
      .from("promo_codes")
      .delete()
      .eq("id", id)
      .eq("reseller_id", ctx.resellerId);

    if (error) throw error;
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
