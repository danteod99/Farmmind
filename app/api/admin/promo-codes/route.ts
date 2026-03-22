import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { isAdmin } from "@/app/lib/admin";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getAuthUser() {
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
  return user;
}

// GET — list all promo codes (admin only)
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user || !isAdmin(user.email)) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }
    const admin = getAdmin();
    const { data, error } = await admin
      .from("promo_codes")
      .select("*")
      .is("reseller_id", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return Response.json({ codes: data });
  } catch (e) {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST — create a new promo code (admin only)
export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user || !isAdmin(user.email)) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }
    const body = await req.json();
    const { code, bonus_usd, min_recharge, max_uses, expires_at } = body;

    if (!code || !bonus_usd || bonus_usd <= 0) {
      return Response.json({ error: "Código y bono son requeridos" }, { status: 400 });
    }

    const admin = getAdmin();
    const { data, error } = await admin
      .from("promo_codes")
      .insert({
        code: code.toUpperCase().trim(),
        bonus_usd: parseFloat(bonus_usd),
        min_recharge: parseFloat(min_recharge) || 20,
        max_uses: parseInt(max_uses) || 100,
        expires_at: expires_at || null,
        active: true,
        reseller_id: null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") return Response.json({ error: "Ya existe un código con ese nombre" }, { status: 400 });
      throw error;
    }
    return Response.json({ success: true, code: data });
  } catch (e) {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

// PATCH — update (toggle active, or any field)
export async function PATCH(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user || !isAdmin(user.email)) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }
    const { id, ...updates } = await req.json();
    if (!id) return Response.json({ error: "id requerido" }, { status: 400 });

    const admin = getAdmin();
    const { error } = await admin
      .from("promo_codes")
      .update(updates)
      .eq("id", id)
      .is("reseller_id", null);

    if (error) throw error;
    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE — remove a promo code
export async function DELETE(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user || !isAdmin(user.email)) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }
    const { id } = await req.json();
    if (!id) return Response.json({ error: "id requerido" }, { status: 400 });

    const admin = getAdmin();
    const { error } = await admin
      .from("promo_codes")
      .delete()
      .eq("id", id)
      .is("reseller_id", null);

    if (error) throw error;
    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
