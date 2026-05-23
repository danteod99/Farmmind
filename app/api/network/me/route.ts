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

  // Estado de pago de cada pending (para mostrar badge en UI)
  const pendingIds = (pendings || []).map((p) => p.user_id);
  const paidStateMap: Record<string, boolean> = {};
  if (pendingIds.length > 0) {
    const { data: pendingProfiles } = await sb
      .from("profiles")
      .select("id, subscription_plan, subscription_status, stripe_subscription_id")
      .in("id", pendingIds);
    (pendingProfiles || []).forEach((p) => {
      paidStateMap[p.id] = (
        p.subscription_plan === "pro" &&
        Boolean(p.stripe_subscription_id) &&
        (p.subscription_status === "active" || p.subscription_status === "trialing")
      );
    });
  }

  // Emails y nombres de los user_ids relacionados.
  // Usamos getUserById en paralelo (no listUsers, que solo trae primeros 50).
  const allUserIds = new Set<string>();
  (directs || []).forEach((d) => allUserIds.add(d.user_id));
  (frontals || []).forEach((f) => allUserIds.add(f.user_id));
  (pendings || []).forEach((p) => allUserIds.add(p.user_id));

  const emailsMap: Record<string, string> = {};
  const namesMap: Record<string, string> = {};
  if (allUserIds.size > 0) {
    const ids = Array.from(allUserIds);
    const results = await Promise.all(
      ids.map((id) => sb.auth.admin.getUserById(id).catch(() => null))
    );
    results.forEach((r, idx) => {
      const u = r?.data?.user;
      if (u) {
        emailsMap[ids[idx]] = u.email || "";
        namesMap[ids[idx]] =
          u.user_metadata?.full_name ||
          u.user_metadata?.name ||
          (u.email ? u.email.split("@")[0] : "Usuario");
      }
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

  // Saldo disponible (smm_balances) — alimentado por trigger network_auto_credit_on_approve
  const { data: balanceRow } = await sb
    .from("smm_balances")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();

  // Estado de suscripcion + sponsor info para el paywall
  const { data: profile } = await sb
    .from("profiles")
    .select("subscription_status, subscription_plan, stripe_subscription_id")
    .eq("id", userId)
    .maybeSingle();

  // Solo cuenta como suscrito si tiene plan 'pro' Y un stripe_subscription_id activo.
  // El default de subscription_status en BD es 'active' aunque NO haya pagado,
  // por eso no podemos confiar solo en eso.
  const isSubscribed = (
    profile?.subscription_plan === "pro" &&
    Boolean(profile?.stripe_subscription_id) &&
    (profile?.subscription_status === "active" || profile?.subscription_status === "trialing")
  );
  const isFounder = myPos?.is_founder === true;

  // Si tiene un pending placement, traer info del sponsor (para mostrar quien lo invito)
  const { data: myPending } = await sb
    .from("network_pending_placements")
    .select("sponsor_id, status, created_at")
    .eq("user_id", userId)
    .eq("status", "pending")
    .maybeSingle();

  let sponsorInfo: { user_id: string; display_name: string; email: string } | null = null;
  if (myPending?.sponsor_id) {
    const { data: sponsorPos } = await sb
      .from("network_positions")
      .select("user_id, display_name")
      .eq("user_id", myPending.sponsor_id)
      .maybeSingle();
    if (sponsorPos) {
      const { data: u } = await sb.auth.admin.getUserById(sponsorPos.user_id);
      sponsorInfo = {
        user_id: sponsorPos.user_id,
        display_name: sponsorPos.display_name || "Sponsor",
        email: u.user?.email || "",
      };
    }
  }

  return NextResponse.json({
    code,
    link: `${baseUrl}/r/${code}`,
    position: myPos,
    directs: (directs || []).map((d) => ({
      ...d,
      email: emailsMap[d.user_id] || "",
      name: namesMap[d.user_id] || "",
    })),
    frontals: (frontals || []).map((f) => ({
      ...f,
      email: emailsMap[f.user_id] || "",
      name: namesMap[f.user_id] || "",
    })),
    pendings: (pendings || []).map((p) => ({
      ...p,
      email: emailsMap[p.user_id] || "",
      name: namesMap[p.user_id] || "",
      has_paid: paidStateMap[p.user_id] === true,
    })),
    available_balance: Number(balanceRow?.balance || 0),
    is_subscribed: Boolean(isSubscribed),
    is_founder: isFounder,
    has_pending_placement: Boolean(myPending),
    sponsor_info: sponsorInfo,
    commissions: {
      total_approved: totalApproved,
      total_pending: totalPending,
      total_paid: totalPaid,
      total_all: totalApproved + totalPending + totalPaid,
      recent: recent || [],
    },
  });
}
