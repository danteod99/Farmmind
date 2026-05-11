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

// GET ?course_id=... — listar módulos de un curso
export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("course_id");
  if (!courseId) return NextResponse.json({ error: "Falta course_id" }, { status: 400 });

  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("course_modules")
    .select("id, course_id, title, description, video_url, content, duration_min, display_order, is_free, created_at")
    .eq("course_id", courseId)
    .order("display_order", { ascending: true });
  return NextResponse.json({ modules: data || [] });
}

// POST — crear módulo
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const { course_id, title, description, video_url, content, duration_min, display_order, is_free } = body;
  if (!course_id || !title) {
    return NextResponse.json({ error: "course_id y title son requeridos" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("course_modules")
    .insert({
      course_id, title,
      description: description || "",
      video_url: video_url || "",
      content: content || "",
      duration_min: Number(duration_min) || 0,
      display_order: Number(display_order) || 0,
      is_free: is_free === true,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ module: data });
}

// PATCH — actualizar módulo
export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const sb = getSupabaseAdmin();
  const { data, error } = await sb.from("course_modules").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ module: data });
}

// DELETE ?id=...
export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const sb = getSupabaseAdmin();
  const { error } = await sb.from("course_modules").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
