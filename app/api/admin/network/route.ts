import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/app/lib/admin";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function requireAdmin() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "No autenticado", status: 401 };
  if (!isAdmin(data.user.email)) return { error: "Solo admins", status: 403 };
  return { user: data.user, error: null, status: 200 };
}

// GET — listar TODOS los miembros de la red + pendings
export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const sb = getSupabaseAdmin();

  const [posResult, pendResult] = await Promise.all([
    sb.from("network_positions").select("user_id, sponsor_id, placement_parent_id, leg, position_path, display_name, is_founder, created_at").order("created_at", { ascending: true }),
    sb.from("network_pending_placements").select("user_id, sponsor_id, status, created_at").eq("status", "pending"),
  ]);

  const allUserIds = new Set<string>();
  (posResult.data || []).forEach((p) => {
    allUserIds.add(p.user_id);
    if (p.sponsor_id) allUserIds.add(p.sponsor_id);
  });
  (pendResult.data || []).forEach((p) => {
    allUserIds.add(p.user_id);
    if (p.sponsor_id) allUserIds.add(p.sponsor_id);
  });

  const userInfo: Record<string, { email: string; name: string }> = {};
  const ids = Array.from(allUserIds);
  if (ids.length > 0) {
    const results = await Promise.all(ids.map((id) => sb.auth.admin.getUserById(id).catch(() => null)));
    results.forEach((r, idx) => {
      const u = r?.data?.user;
      if (u) {
        userInfo[ids[idx]] = {
          email: u.email || "",
          name: u.user_metadata?.full_name || u.user_metadata?.name || (u.email?.split("@")[0]) || "",
        };
      }
    });
  }

  // Estado de pago
  const { data: profiles } = await sb
    .from("profiles")
    .select("id, subscription_plan, subscription_status, stripe_subscription_id")
    .in("id", ids);
  const paidMap: Record<string, boolean> = {};
  (profiles || []).forEach((p) => {
    paidMap[p.id] = (
      p.subscription_plan === "pro" &&
      Boolean(p.stripe_subscription_id) &&
      (p.subscription_status === "active" || p.subscription_status === "trialing")
    );
  });

  return NextResponse.json({
    positions: (posResult.data || []).map((p) => ({
      ...p,
      email: userInfo[p.user_id]?.email || "",
      name: userInfo[p.user_id]?.name || "",
      sponsor_email: p.sponsor_id ? (userInfo[p.sponsor_id]?.email || "") : "",
      sponsor_name: p.sponsor_id ? (userInfo[p.sponsor_id]?.name || "") : "",
      has_paid: paidMap[p.user_id] === true,
    })),
    pendings: (pendResult.data || []).map((p) => ({
      ...p,
      email: userInfo[p.user_id]?.email || "",
      name: userInfo[p.user_id]?.name || "",
      sponsor_email: p.sponsor_id ? (userInfo[p.sponsor_id]?.email || "") : "",
      sponsor_name: p.sponsor_id ? (userInfo[p.sponsor_id]?.name || "") : "",
      has_paid: paidMap[p.user_id] === true,
    })),
  });
}

// POST — agregar usuario a la red manualmente (founder o como referido de alguien)
// Body: { email, as_founder?, sponsor_email?, leg?, display_name? }
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const { email, as_founder, sponsor_email, leg, display_name } = body;
  if (!email) return NextResponse.json({ error: "email es requerido" }, { status: 400 });

  const sb = getSupabaseAdmin();

  // Buscar al usuario por email
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: usersList } = await sb.auth.admin.listUsers({ perPage: 1000 } as any);
  const target = (usersList?.users || []).find((u) => (u.email || "").toLowerCase() === email.toLowerCase());
  if (!target) {
    return NextResponse.json({ error: `Usuario con email ${email} no encontrado en auth.users` }, { status: 404 });
  }

  // Generar código de referido si no tiene
  await sb.rpc("network_generate_referral_code", { p_user_id: target.id });

  // Caso 1: founder al top (sin sponsor)
  if (as_founder) {
    const { data: existing } = await sb.from("network_positions").select("user_id").eq("user_id", target.id).maybeSingle();
    if (existing) {
      // Actualizar como founder
      await sb.from("network_positions").update({ is_founder: true, display_name: display_name || "" }).eq("user_id", target.id);
    } else {
      // Insertar como top
      await sb.from("network_positions").insert({
        user_id: target.id,
        sponsor_id: null,
        placement_parent_id: null,
        leg: null,
        position_path: "",
        display_name: display_name || "",
        is_founder: true,
      });
    }
    return NextResponse.json({ success: true, message: `${email} agregado como fundador` });
  }

  // Caso 2: agregar como referido de otro sponsor
  if (sponsor_email && leg) {
    if (!["left", "right"].includes(leg)) {
      return NextResponse.json({ error: "leg debe ser left o right" }, { status: 400 });
    }
    const sponsor = (usersList?.users || []).find((u) => (u.email || "").toLowerCase() === sponsor_email.toLowerCase());
    if (!sponsor) {
      return NextResponse.json({ error: `Sponsor con email ${sponsor_email} no encontrado` }, { status: 404 });
    }
    // Crear pending y luego place (saltarse validación de pago — admin override)
    await sb.from("network_pending_placements").upsert({
      user_id: target.id,
      sponsor_id: sponsor.id,
      status: "pending",
    });
    // Llamar directo a la lógica del RPC: pero como queremos saltarnos el chequeo de pago,
    // hacemos la inserción manual con spillover.
    // Buscar primer espacio libre
    let parentId = sponsor.id;
    let path = "";
    const { data: sponsorPos } = await sb.from("network_positions").select("position_path").eq("user_id", sponsor.id).maybeSingle();
    path = sponsorPos?.position_path || "";

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data: occupied } = await sb
        .from("network_positions")
        .select("user_id")
        .eq("placement_parent_id", parentId)
        .eq("leg", leg)
        .maybeSingle();
      if (!occupied) break;
      parentId = occupied.user_id;
      path = path + (leg === "left" ? "L" : "R");
    }

    const { error: insertErr } = await sb.from("network_positions").insert({
      user_id: target.id,
      sponsor_id: sponsor.id,
      placement_parent_id: parentId,
      leg,
      position_path: path + (leg === "left" ? "L" : "R"),
      display_name: display_name || "",
      is_founder: false,
    });
    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 400 });
    }
    await sb.from("network_pending_placements").update({ status: "placed", placed_at: new Date().toISOString() }).eq("user_id", target.id);
    return NextResponse.json({ success: true, message: `${email} agregado a la red bajo ${sponsor_email} (${leg})` });
  }

  return NextResponse.json({ error: "Especifica as_founder=true O (sponsor_email + leg)" }, { status: 400 });
}

// DELETE ?user_id=... — admin puede remover cualquier usuario
export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id");
  const force = searchParams.get("force") === "1";
  if (!userId) return NextResponse.json({ error: "Falta user_id" }, { status: 400 });

  const sb = getSupabaseAdmin();

  // Check downline
  const { data: downline } = await sb.from("network_positions").select("user_id").eq("placement_parent_id", userId).limit(1);
  if (downline && downline.length > 0 && !force) {
    return NextResponse.json(
      { error: "Tiene downline. Usa force=1 para eliminar de todos modos (los hijos quedarán huérfanos)" },
      { status: 400 }
    );
  }

  await Promise.all([
    sb.from("network_positions").delete().eq("user_id", userId),
    sb.from("network_pending_placements").delete().eq("user_id", userId),
    sb.from("network_referral_codes").delete().eq("user_id", userId),
  ]);

  return NextResponse.json({ success: true });
}
