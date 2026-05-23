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

async function getCurrentUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data } = await supabase.auth.getUser();
  return data.user;
}

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { error: "No autenticado", status: 401, user: null };
  if (!isAdmin(user.email)) return { error: "Solo admins", status: 403, user: null };
  return { user, error: null, status: 200 };
}

// GET — lista cursos + cantidad de modulos
export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const sb = getSupabaseAdmin();
  const { data: courses } = await sb
    .from("courses")
    .select("id, slug, title, description, cover_url, level, duration, is_active, display_order, created_at")
    .order("display_order", { ascending: true });

  // Contar módulos por curso
  const ids = (courses || []).map((c) => c.id);
  const modulesMap: Record<string, number> = {};
  if (ids.length > 0) {
    const { data: mods } = await sb
      .from("course_modules")
      .select("course_id")
      .in("course_id", ids);
    (mods || []).forEach((m) => {
      modulesMap[m.course_id] = (modulesMap[m.course_id] || 0) + 1;
    });
  }

  return NextResponse.json({
    courses: (courses || []).map((c) => ({ ...c, module_count: modulesMap[c.id] || 0 })),
  });
}

// POST — crear curso
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const { slug, title, description, cover_url, level, duration, display_order, is_active } = body;
  if (!slug || !title) {
    return NextResponse.json({ error: "slug y title son requeridos" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("courses")
    .insert({
      slug, title,
      description: description || "",
      cover_url: cover_url || "",
      level: level || "principiante",
      duration: duration || "",
      display_order: Number(display_order) || 0,
      is_active: is_active !== false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ course: data });
}

// PATCH — actualizar curso
export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const sb = getSupabaseAdmin();
  const { data, error } = await sb.from("courses").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ course: data });
}

// DELETE — eliminar curso
export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const sb = getSupabaseAdmin();
  const { error } = await sb.from("courses").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
