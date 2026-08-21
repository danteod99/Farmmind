import { getAllowedUser, getAdmin, BUCKET } from "@/app/lib/editor-privado";

// POST {action}: "confirmar" (la subida terminó → encolar) | "descargar" (URL firmada del resultado)
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const who = await getAllowedUser();
  if (!who) return Response.json({ error: "Sin acceso" }, { status: 403 });
  const { id } = await ctx.params;
  const { action } = await req.json().catch(() => ({}));
  const admin = getAdmin();

  const { data: job } = await admin.from("editor_jobs").select("*").eq("id", id).maybeSingle();
  if (!job) return Response.json({ error: "Trabajo no encontrado" }, { status: 404 });
  if (!who.admin && job.user_email !== who.email.toLowerCase()) {
    return Response.json({ error: "Sin acceso" }, { status: 403 });
  }

  if (action === "confirmar") {
    if (job.status !== "subiendo") return Response.json({ error: "Estado inválido" }, { status: 409 });
    await admin.from("editor_jobs").update({ status: "pendiente", updated_at: new Date().toISOString() }).eq("id", id);
    return Response.json({ ok: true });
  }

  if (action === "descargar") {
    if (job.status !== "listo" || !job.output_path) {
      return Response.json({ error: "Aún no está listo" }, { status: 409 });
    }
    const { data, error } = await admin.storage.from(BUCKET)
      .createSignedUrl(job.output_path, 3600, { download: `${job.nombre}-editado.mp4` });
    if (error || !data) return Response.json({ error: error?.message || "No se pudo firmar" }, { status: 500 });
    return Response.json({ url: data.signedUrl });
  }

  return Response.json({ error: "Acción desconocida" }, { status: 400 });
}
