import { getAllowedUser, getAdmin, BUCKET } from "@/app/lib/editor-privado";

// GET: lista los trabajos del usuario (admin ve todos).
export async function GET() {
  const who = await getAllowedUser();
  if (!who) return Response.json({ error: "Sin acceso" }, { status: 403 });
  const admin = getAdmin();
  let q = admin.from("editor_jobs").select("id, created_at, updated_at, nombre, status, error, user_email")
    .order("created_at", { ascending: false }).limit(50);
  if (!who.admin) q = q.eq("user_email", who.email.toLowerCase());
  const { data, error } = await q;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ jobs: data || [] });
}

// POST: crea un trabajo y devuelve URL firmada para subir el video en bruto
// directo al bucket (sin pasar por Vercel — archivos de cientos de MB).
export async function POST(req: Request) {
  const who = await getAllowedUser();
  if (!who) return Response.json({ error: "Sin acceso" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const nombre = String(body.nombre || "video").replace(/[^a-zA-Z0-9-_ ]/g, "").slice(0, 60) || "video";
  const ext = ["mp4", "mov", "m4v", "webm"].includes(String(body.ext).toLowerCase())
    ? String(body.ext).toLowerCase() : "mp4";
  const flags: Record<string, boolean> = {};
  for (const f of ["no_music", "no_sfx", "no_broll", "no_motion"]) flags[f] = !!body[f];

  const admin = getAdmin();
  const { data: job, error } = await admin.from("editor_jobs").insert({
    user_email: who.email.toLowerCase(),
    nombre,
    status: "subiendo",
    flags,
  }).select("id").single();
  if (error || !job) return Response.json({ error: error?.message || "No se pudo crear" }, { status: 500 });

  const inputPath = `in/${job.id}.${ext}`;
  const { data: signed, error: sErr } = await admin.storage.from(BUCKET)
    .createSignedUploadUrl(inputPath);
  if (sErr || !signed) {
    await admin.from("editor_jobs").update({ status: "error", error: "No se pudo firmar la subida" }).eq("id", job.id);
    return Response.json({ error: sErr?.message || "No se pudo firmar la subida" }, { status: 500 });
  }
  await admin.from("editor_jobs").update({ input_path: inputPath }).eq("id", job.id);
  return Response.json({ jobId: job.id, path: inputPath, token: signed.token });
}
