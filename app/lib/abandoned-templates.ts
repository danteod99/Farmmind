// Templates de recuperación de carrito abandonado (checkout Pro iniciado y no pagado).
// 2 emails: #1 inmediato (al detectar abandono) y #2 a las 48 h.
// Branding consistente con el drip nurture, pero con unsubscribe por EMAIL
// (los invitados no tienen user_id).

import crypto from "crypto";

export const RECOVERY_MAX_STEP = 2;
export const RECOVERY_STEP2_DELAY_HOURS = 48;

export interface RecoveryCtx {
  firstName: string;
  email: string;
  planLabel: string;      // "anual" | "mensual"
  ofertaUrl: string;      // https://www.trustmind.online/oferta
  unsubscribeUrl: string;
}

// ── Unsubscribe por dirección de email (namespace distinto al de userId) ──
export function emailUnsubToken(email: string): string {
  const secret = process.env.UNSUBSCRIBE_SECRET || "trustmind_unsub";
  return crypto
    .createHmac("sha256", secret)
    .update(`email:${email.toLowerCase()}`)
    .digest("hex")
    .slice(0, 24);
}

export function buildEmailUnsubscribeUrl(origin: string, email: string): string {
  const t = emailUnsubToken(email);
  return `${origin}/api/email/unsubscribe?e=${encodeURIComponent(email.toLowerCase())}&t=${t}`;
}

// ── Helpers HTML (shell consistente con el drip) ──
function wrap(inner: string, ctx: RecoveryCtx): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TrustMind</title></head><body style="margin:0;padding:0;background:#07070e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#f0efff;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#07070e;padding:32px 16px">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0d0d18;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden">
      <tr><td style="padding:24px 28px 0">
        <p style="margin:0;font-size:13px;color:#7dd3fc;font-weight:800;letter-spacing:1.5px;text-transform:uppercase">TRUST MIND</p>
      </td></tr>
      <tr><td style="padding:18px 28px 28px;color:#e2e8f0;font-size:15px;line-height:1.6">
${inner}
      </td></tr>
    </table>
    <p style="margin:18px 0 0;font-size:11px;color:#5a6480;text-align:center;max-width:560px;line-height:1.55">
      Recibís este email porque empezaste a activar tu plan en TrustMind.<br/>
      <a href="${ctx.unsubscribeUrl}" style="color:#64748b;text-decoration:underline">No me interesa, no me escribas más</a>
    </p>
  </td></tr>
</table>
</body></html>`;
}

function ctaButton(label: string, url: string, color = "#10b981"): string {
  return `<a href="${url}" style="display:inline-block;padding:14px 22px;background:linear-gradient(135deg,${color},#00B4D8);color:white;text-decoration:none;border-radius:12px;font-weight:800;font-size:14px;margin:8px 0">${label}</a>`;
}

export function renderRecovery(
  step: number,
  ctx: RecoveryCtx
): { subject: string; html: string; text: string } {
  if (step === 1) {
    return {
      subject: `${ctx.firstName}, te quedó el acceso a TrustMind a un paso`,
      html: wrap(`
        <p style="font-size:21px;font-weight:900;color:white;line-height:1.22;margin:0 0 12px">¿Algo te frenó al pagar?</p>
        <p style="margin:0 0 14px">Vi que empezaste a activar tu <strong style="color:white">plan ${ctx.planLabel}</strong> pero no llegaste a terminar. Pasa seguido y casi siempre es una de dos cosas:</p>
        <ul style="margin:0 0 16px;padding-left:18px;color:#cbd5e1">
          <li style="margin-bottom:6px">La <strong style="color:white">tarjeta no pasó</strong> (común si no está habilitada para compras internacionales).</li>
          <li style="margin-bottom:6px">Te distrajiste y lo dejaste para después.</li>
        </ul>
        <p style="margin:0 0 14px">Si fue la tarjeta: <strong style="color:#10b981">tenemos otras formas de pago</strong> (incluida cripto). Respondé este email o escribinos y te paso el link directo.</p>
        <p style="margin:0 0 22px">Si solo fue el momento, retomás donde lo dejaste en un clic:</p>
        ${ctaButton("Completar mi acceso →", ctx.ofertaUrl)}
        <p style="margin:24px 0 0;font-size:13px;color:#94a3b8">Cualquier duda, me respondés a este mismo correo.</p>
        <p style="margin:14px 0 0;font-size:13px;color:#94a3b8">— Dante, fundador</p>
      `, ctx),
      text: `${ctx.firstName}, dejaste tu plan ${ctx.planLabel} a medias. Si la tarjeta no pasó tenemos otras formas de pago (incluida cripto), respondé este email. O retomá acá: ${ctx.ofertaUrl}`,
    };
  }

  // step 2 — 48 h después
  return {
    subject: `${ctx.firstName}, ¿lo dejamos para otro momento?`,
    html: wrap(`
      <p style="font-size:21px;font-weight:900;color:white;line-height:1.22;margin:0 0 12px">Última vez que te escribo por esto.</p>
      <p style="margin:0 0 14px">No quiero ser pesado. Si ya decidiste que no es para vos, todo bien — con el link de abajo te saco de la lista y listo.</p>
      <p style="margin:0 0 14px">Pero si seguís dándole vueltas, recordá lo que incluye el plan:</p>
      <ul style="margin:0 0 16px;padding-left:18px;color:#cbd5e1">
        <li style="margin-bottom:6px">Panel SMM con 5,000+ servicios a precio base</li>
        <li style="margin-bottom:6px">Academia completa (granjas, monetización IG/TikTok/YT)</li>
        <li style="margin-bottom:6px">Apps desktop (TrustInsta + TrustFace) y cuentas Express</li>
        <li style="margin-bottom:6px">Soporte directo por WhatsApp</li>
      </ul>
      <p style="margin:0 0 14px">Y si lo que te frenó fue la tarjeta, te lo repito: <strong style="color:#10b981">hay otras formas de pagar, cripto incluida</strong>. Solo respondé este email.</p>
      <p style="margin:0 0 22px">Lo recuperás con una sola operación bien hecha.</p>
      ${ctaButton("Activar mi plan ahora →", ctx.ofertaUrl, "#fbbf24")}
      <p style="margin:24px 0 0;font-size:13px;color:#94a3b8">— Dante</p>
    `, ctx),
    text: `${ctx.firstName}, último recordatorio. Si la tarjeta te frenó, hay otras formas de pago (cripto incluida): respondé este email. O activá acá: ${ctx.ofertaUrl}`,
  };
}
