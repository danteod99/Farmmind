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

// GET /api/network/me — info de mi red:
// codigo de referido, link, mi posicion, directos izq/der, pendings, total comisiones, ultimas 10
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const sb = getSupabaseAdmin();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://trustmind.online";

  // Codigo (lo crea si no existe)
  const { data: code } = await sb.rpc("network_generate_referral_code", {
    p_user_id: userId,
  });

  // Mi posicion
  const { data: myPos } = await sb
    .from("network_positions")
    .select("user_id, sponsor_id, placement_parent_id, leg, position_path, display_name, is_founder")
    .eq("user_id", userId)
    .maybeSingle();

  // Directos (sponsoreados por mi y ya colocados)
  const { data: directs } = await sb
    .from("network_positions")
    .select("user_id, leg, placement_parent_id, created_at")
    .eq("sponsor_id", userId);

  // Frontales en mi posicion (lo que cuelga directamente debajo de mi)
  const { data: frontals } = await sb
    .from("network_positions")
    .select("user_id, leg")
    .eq("placement_parent_id", userId);

  // Pendings esperando colocacion
  const { data: pendings } = await sb
    .from("network_pending_placements")
    .select("user_id, created_at")
    .eq("sponsor_id", userId)
    .eq("status", "pending");

  // Emails de los user_ids relacionados (para mostrarlos)
  const allUserIds = new Set<string>();
  (directs || []).forEach((d) => allUserIds.add(d.user_id));
  (frontals || []).forEach((f) => allUserIds.add(f.user_id));
  (pendings || []).forEach((p) => allUserIds.add(p.user_id));

  const emailsMap: Record<string, string> = {};
  if (allUserIds.size > 0) {
    const { data: usersList } = await sb.auth.admin.listUsers();
    (usersList?.users || []).forEach((u) => {
      if (allUserIds.has(u.id)) emailsMap[u.id] = u.email || "";
    });
  }

  // Comisiones: total acumulado y ultimas 10
  const { data: totals } = await sb
    .from("network_commissions")
    .select("type, amount, status")
    .eq("user_id", userId);

  let totalApproved = 0;
  let totalPending = 0;
  let totalPaid = 0;
  (totals || []).forEach((t) => {
    const amt = Number(t.amount || 0);
    if (t.status === "approved") totalApproved += amt;
    else if (t.status === "pending") totalPending += amt;
    else if (t.status === "paid") totalPaid += amt;
  });

  const { data: recent } = await sb
    .from("network_commissions")
    .select("id, type, amount, status, source_user_id, created_at, period")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    code,
    link: `${baseUrl}/r/${code}`,
    position: myPos,
    directs: (directs || []).map((d) => ({ ...d, email: emailsMap[d.user_id] || "" })),
    frontals: (frontals || []).map((f) => ({ ...f, email: emailsMap[f.user_id] || "" })),
    pendings: (pendings || []).map((p) => ({ ...p, email: emailsMap[p.user_id] || "" })),
    commissions: {
      total_approved: totalApproved,
      total_pending: totalPending,
      total_paid: totalPaid,
      total_all: totalApproved + totalPending + totalPaid,
      recent: recent || [],
    },
  });
}
