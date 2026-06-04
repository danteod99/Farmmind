import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function verifyToken(userId: string, token: string): boolean {
  const secret = process.env.UNSUBSCRIBE_SECRET || "trustmind_unsub";
  const expected = crypto.createHmac("sha256", secret).update(userId).digest("hex").slice(0, 24);
  // timing-safe compare
  if (token.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

// Token de baja por DIRECCIÓN de email (carrito abandonado, invitados sin cuenta).
function verifyEmailToken(email: string, token: string): boolean {
  const secret = process.env.UNSUBSCRIBE_SECRET || "trustmind_unsub";
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`email:${email.toLowerCase()}`)
    .digest("hex")
    .slice(0, 24);
  if (token.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

function renderPage(title: string, message: string, color: string): Response {
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · TrustMind</title></head>
<body style="margin:0;background:#07070e;color:#f0efff;font-family:-apple-system,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px">
  <div style="max-width:480px;text-align:center;padding:32px;background:#0d0d18;border:1px solid rgba(255,255,255,0.08);border-radius:18px">
    <div style="display:inline-flex;padding:14px;border-radius:14px;background:${color}22;border:1px solid ${color}55;margin-bottom:18px;font-size:28px">✓</div>
    <h1 style="font-size:22px;font-weight:900;margin:0 0 10px;color:white">${title}</h1>
    <p style="font-size:14px;color:#94a3b8;line-height:1.55;margin:0 0 20px">${message}</p>
    <a href="https://www.trustmind.online" style="display:inline-block;padding:12px 22px;border-radius:12px;background:rgba(255,255,255,0.05);color:#7dd3fc;text-decoration:none;font-size:13px;font-weight:700">Volver a TrustMind</a>
  </div>
</body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("u");
  const token = url.searchParams.get("t");
  const emailParam = url.searchParams.get("e");
  const channel = (url.searchParams.get("c") || "all") as "all" | "email" | "whatsapp";

  // ── Baja por email (carrito abandonado / invitados sin cuenta) ──
  if (emailParam && token) {
    const email = emailParam.toLowerCase();
    if (!verifyEmailToken(email, token)) {
      return renderPage(
        "Enlace inválido",
        "Este enlace de cancelación no es válido o expiró. Si querés dejar de recibir mensajes, escribinos a soporte@trustmind.online.",
        "#ef4444"
      );
    }
    const sb = admin();
    await sb.from("email_suppressions").upsert(
      { email, reason: "unsubscribe link", source: "abandoned_cart" },
      { onConflict: "email" }
    );
    // Cerrar cualquier recuperación pendiente de ese email.
    await sb.from("payment_attempts")
      .update({ recovery_step: 99 })
      .eq("email", email)
      .lt("recovery_step", 99);
    return renderPage(
      "Listo, cancelado",
      "No vas a recibir más correos nuestros. Si fue un error o cambiás de opinión, escribinos a soporte@trustmind.online.",
      "#10b981"
    );
  }

  if (!userId || !token || !verifyToken(userId, token)) {
    return renderPage(
      "Enlace inválido",
      "Este enlace de cancelación no es válido o expiró. Si querés dejar de recibir mensajes, escribinos a soporte@trustmind.online.",
      "#ef4444"
    );
  }

  const sb = admin();

  // 1. Obtener email para guardar referencia
  const { data: userData } = await sb.auth.admin.getUserById(userId);
  const email = userData?.user?.email || null;

  // 2. Registrar unsubscribe
  await sb.from("email_unsubscribes").upsert({
    user_id: userId,
    email,
    channel,
    unsubscribed_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  // 3. Cancelar mensajes pendientes
  await sb.from("drip_messages")
    .update({ status: "canceled", error_message: "user unsubscribed" })
    .eq("user_id", userId)
    .eq("status", "pending");

  return renderPage(
    "Listo, cancelado",
    "Ya no vas a recibir más mensajes del nurture campaign. Si cambiás de opinión, podés escribirnos por WhatsApp.",
    "#10b981"
  );
}
