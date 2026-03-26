import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isAdmin } from "@/app/lib/admin";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  try {
    // Verificar que el usuario es admin
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

    const admin = getSupabaseAdmin();

    // Total usuarios (desde auth.users via admin API)
    const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const totalUsers = authUsers?.users?.length || 0;

    // Usuarios con perfil Pro
    const { count: proUsers } = await admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("subscription_plan", "pro")
      .eq("subscription_status", "active");

    // Total mensajes
    const { count: totalMessages } = await admin
      .from("messages")
      .select("*", { count: "exact", head: true });

    // Mensajes este mes
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const { count: messagesThisMonth } = await admin
      .from("messages")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfMonth.toISOString());

    // Total conversaciones
    const { count: totalConversations } = await admin
      .from("conversations")
      .select("*", { count: "exact", head: true });

    // Lista de usuarios con sus perfiles
    const users = authUsers?.users || [];
    const { data: profiles } = await admin
      .from("profiles")
      .select("*");

    // Contar mensajes por usuario este mes
    const { data: msgCounts } = await admin
      .from("messages")
      .select("user_id")
      .eq("role", "user")
      .gte("created_at", startOfMonth.toISOString());

    const msgCountByUser: Record<string, number> = {};
    (msgCounts || []).forEach((m) => {
      msgCountByUser[m.user_id] = (msgCountByUser[m.user_id] || 0) + 1;
    });

    const profileMap: Record<string, typeof profiles extends (infer T)[] | null ? T : never> = {};
    (profiles || []).forEach((p) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      profileMap[p.id] = p as any;
    });

    const userList = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.user_metadata?.full_name || u.email?.split("@")[0],
      avatar: u.user_metadata?.avatar_url,
      created_at: u.created_at,
      plan: profileMap[u.id]?.subscription_plan || "free",
      subscription_status: profileMap[u.id]?.subscription_status || "active",
      messages_this_month: msgCountByUser[u.id] || 0,
      last_sign_in: u.last_sign_in_at,
    }));

    // Ingresos estimados
    const estimatedRevenue = (proUsers || 0) * 19;

    return Response.json({
      stats: {
        totalUsers,
        proUsers: proUsers || 0,
        freeUsers: totalUsers - (proUsers || 0),
        totalMessages: totalMessages || 0,
        messagesThisMonth: messagesThisMonth || 0,
        totalConversations: totalConversations || 0,
        estimatedRevenue,
      },
      users: userList,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return Response.json({ error: "Error obteniendo estadísticas" }, { status: 500 });
  }
}
