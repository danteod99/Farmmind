import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// POST /api/network/place
// Body: { user_id: string, leg: 'left' | 'right' }
// El sponsor (auth) coloca un usuario pending en su izq o der.
export async function POST(req: Request) {
  const sponsorId = await getCurrentUserId();
  if (!sponsorId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: { user_id?: string; leg?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const { user_id, leg } = body;
  if (!user_id || !leg || !["left", "right"].includes(leg)) {
    return NextResponse.json(
      { error: "user_id y leg (left|right) son requeridos" },
      { status: 400 }
    );
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb.rpc("network_place_user", {
    p_sponsor_id: sponsorId,
    p_user_id: user_id,
    p_leg: leg,
  });

  if (error) {
    // Mensajes amigables segun el tipo de error
    const msg = error.message || "";
    if (msg.includes("user_not_paid")) {
      return NextResponse.json(
        { error: "Este usuario aún no ha pagado su suscripción. No puede ser colocado en la red hasta que active su cuenta." },
        { status: 400 }
      );
    }
    if (msg.includes("pending_not_found")) {
      return NextResponse.json(
        { error: "No se encontró el usuario pendiente o ya fue colocado." },
        { status: 404 }
      );
    }
    if (msg.includes("invalid_leg")) {
      return NextResponse.json({ error: "Pata inválida (debe ser left o right)." }, { status: 400 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json({ success: true, placement_parent_id: data });
}
