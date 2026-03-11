import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setAll(cookiesToSet: any[]) {
            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }: {
                name: string;
                value: string;
                options: unknown;
              }) =>
                cookieStore.set(
                  name,
                  value,
                  options as Parameters<typeof cookieStore.set>[2]
                )
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    // Obtener o crear perfil
    let { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile) {
      const { data: newProfile } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          subscription_plan: "free",
          subscription_status: "active",
          messages_this_month: 0,
        })
        .select()
        .single();
      profile = newProfile;
    }

    // Contar mensajes del mes actual
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("role", "user")
      .gte("created_at", startOfMonth.toISOString());

    const FREE_LIMIT = 30;
    const isPro =
      profile?.subscription_plan === "pro" &&
      (profile?.subscription_status === "active" ||
        profile?.subscription_status === "trialing");

    return Response.json({
      plan: profile?.subscription_plan || "free",
      status: profile?.subscription_status || "active",
      messagesThisMonth: count || 0,
      messagesLimit: isPro ? null : FREE_LIMIT,
      isPro,
      canSendMessage: isPro || (count || 0) < FREE_LIMIT,
    });
  } catch (error) {
    console.error("Profile API error:", error);
    return Response.json({ error: "Error obteniendo perfil" }, { status: 500 });
  }
}
