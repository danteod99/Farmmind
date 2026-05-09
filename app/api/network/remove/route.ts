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

// POST /api/network/remove
// Body: { user_id: string, scope?: 'pending' | 'placed' }
// Solo el sponsor puede remover. Si el target tiene downline, falla.
// Founders no se pueden remover.
export async function POST(req: Request) {
  const requesterId = await getCurrentUserId();
  if (!requesterId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: { user_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const targetUserId = body.user_id;
  if (!targetUserId) {
    return NextResponse.json({ error: "Falta user_id" }, { status: 400 });
  }

  if (targetUserId === requesterId) {
    return NextResponse.json({ error: "No puedes removerte a ti mismo" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();

  // Verificar que requester es sponsor del target (en pendings o positions)
  const { data: pendingRow } = await sb
    .from("network_pending_placements")
    .select("sponsor_id, status")
    .eq("user_id", targetUserId)
    .maybeSingle();

  const { data: positionRow } = await sb
    .from("network_positions")
    .select("sponsor_id, is_founder")
    .eq("user_id", targetUserId)
    .maybeSingle();

  const isSponsorViaPending = pendingRow?.sponsor_id === requesterId;
  const isSponsorViaPosition = positionRow?.sponsor_id === requesterId;

  if (!isSponsorViaPending && !isSponsorViaPosition) {
    return NextResponse.json(
      { error: "Solo puedes remover usuarios que tú invitaste" },
      { status: 403 }
    );
  }

  // No remover founders
  if (positionRow?.is_founder) {
    return NextResponse.json(
      { error: "Los fundadores no pueden ser removidos" },
      { status: 400 }
    );
  }

  // Si está colocado y tiene downline, no permitir delete (rompería el arbol)
  if (positionRow) {
    const { data: downline } = await sb
      .from("network_positions")
      .select("user_id")
      .eq("placement_parent_id", targetUserId)
      .limit(1);

    if (downline && downline.length > 0) {
      return NextResponse.json(
        {
          error:
            "No se puede remover a este usuario porque tiene gente debajo en su red. Contacta al equipo si necesitas reorganizar.",
        },
        { status: 400 }
      );
    }
  }

  // Eliminar de las 3 tablas (idempotente)
  await Promise.all([
    sb.from("network_positions").delete().eq("user_id", targetUserId),
    sb.from("network_pending_placements").delete().eq("user_id", targetUserId),
    sb.from("network_referral_codes").delete().eq("user_id", targetUserId),
  ]);

  return NextResponse.json({ success: true });
}
