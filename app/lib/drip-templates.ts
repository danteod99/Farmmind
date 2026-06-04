// Templates del drip "signup_nurture" — educacional + cierre directo.
// 6 emails distribuidos en 7 días. WhatsApp desactivado (aún no configurado).
// Las primeras 24h son las clave para que el user recargue: 2 emails ahí
// (bienvenida ~5 min + push de recarga ~6 h).
// Schedule offsets: hours from signup.

export interface DripStep {
  step: number;
  channel: "email" | "whatsapp";
  offsetHours: number;
  // Subject solo aplica a email
  subject?: (ctx: TemplateCtx) => string;
  // Email: html y text. WhatsApp: body único.
  render: (ctx: TemplateCtx) => { html?: string; text?: string; body?: string };
}

export interface TemplateCtx {
  firstName: string;
  email: string;
  panelUrl: string;          // https://www.trustmind.online/smm/services
  fundsUrl: string;          // https://www.trustmind.online/smm/funds (recarga de saldo)
  ofertaUrl: string;         // https://www.trustmind.online/oferta
  cursosUrl: string;
  unsubscribeUrl: string;
}

// ── Helpers HTML ──
function wrap(inner: string, ctx: TemplateCtx, options: { hidePreview?: boolean } = {}): string {
  const preview = options.hidePreview ? "" : `<div style="display:none;max-height:0;overflow:hidden">​</div>`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TrustMind</title></head><body style="margin:0;padding:0;background:#07070e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#f0efff;">
${preview}
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
      Recibís este email porque te registraste en TrustMind.<br/>
      <a href="${ctx.unsubscribeUrl}" style="color:#64748b;text-decoration:underline">Cancelar suscripción</a>
      · <a href="${ctx.panelUrl}" style="color:#64748b;text-decoration:underline">Ir al panel</a>
    </p>
  </td></tr>
</table>
</body></html>`;
}

function ctaButton(label: string, url: string, color = "#007ABF"): string {
  return `<a href="${url}" style="display:inline-block;padding:14px 22px;background:linear-gradient(135deg,${color},#00B4D8);color:white;text-decoration:none;border-radius:12px;font-weight:800;font-size:14px;margin:8px 0">${label}</a>`;
}

// ── PASOS ──

export const DRIP_STEPS: DripStep[] = [
  // ───── STEP 0 — Día 0 (5 min) — Email — Bienvenida ─────
  {
    step: 0,
    channel: "email",
    offsetHours: 0.083,  // ~5 min
    subject: (c) => `Bienvenido a TrustMind, ${c.firstName}`,
    render: (c) => ({
      html: wrap(`
        <p style="font-size:22px;font-weight:900;color:white;line-height:1.2;margin:0 0 12px">Tu cuenta está lista.</p>
        <p style="margin:0 0 18px">Acabás de unirte a la red de emprendedores que comandan miles de cuentas sin invertir en hardware físico.</p>
        <p style="margin:0 0 18px">En los próximos minutos vas a poder:</p>
        <ul style="margin:0 0 18px;padding-left:18px;color:#cbd5e1">
          <li style="margin-bottom:6px">Pedir tu primer servicio (likes, seguidores, views) desde el panel</li>
          <li style="margin-bottom:6px">Explorar las cuentas premium con entrega instantánea</li>
          <li style="margin-bottom:6px">Acceder a la academia (cursos, no solo videos sueltos)</li>
        </ul>
        <p style="margin:0 0 22px">Entrá ahora y dale el primer vistazo:</p>
        ${ctaButton("Entrar al panel →", c.panelUrl)}
        <p style="margin:24px 0 0;font-size:13px;color:#94a3b8">Mañana te mando un caso real de cómo Braulio escaló a $7,275 con esta misma infra.</p>
        <p style="margin:14px 0 0;font-size:13px;color:#94a3b8">— Dante, fundador</p>
      `, c),
      text: `Tu cuenta TrustMind está lista, ${c.firstName}. Entra al panel: ${c.panelUrl}`,
    }),
  },

  // ───── STEP 7 — Día 0 (~6 h) — Email — Push de recarga (2º email en las 24h clave) ─────
  {
    step: 7,
    channel: "email",
    offsetHours: 6,
    subject: (c) => `${c.firstName}, así arrancás hoy (toma 2 minutos)`,
    render: (c) => ({
      html: wrap(`
        <p style="font-size:21px;font-weight:900;color:white;line-height:1.22;margin:0 0 12px">Las primeras 24 horas deciden todo.</p>
        <p style="margin:0 0 14px">El dato real: quien hace su <strong style="color:white">primer pedido el día 1</strong> tiene 4× más chance de quedarse y escalar. Quien lo deja para "después" casi nunca vuelve.</p>
        <p style="margin:0 0 14px">Y para pedir tu primer servicio solo necesitás <strong style="color:#10b981">saldo en el panel</strong>. Con <strong style="color:white">$3-5 USD</strong> ya probás likes, seguidores o views y ves resultados en minutos.</p>
        <p style="margin:0 0 14px">Recargás en 2 minutos (tarjeta o cripto), sin mínimos absurdos:</p>
        ${ctaButton("Recargar saldo y pedir →", c.fundsUrl, "#10b981")}
        <p style="margin:22px 0 0;font-size:13px;color:#94a3b8">¿Querés ver primero el catálogo? Está acá: <a href="${c.panelUrl}" style="color:#7dd3fc;text-decoration:underline">los servicios del panel</a>.</p>
        <p style="margin:14px 0 0;font-size:13px;color:#94a3b8">— Dante, fundador</p>
      `, c),
      text: `${c.firstName}, las primeras 24h deciden todo. Recargá $3-5 y hacé tu primer pedido: ${c.fundsUrl}`,
    }),
  },

  // ───── STEP 1 — Día 1 — Email — Caso de éxito ─────
  {
    step: 1,
    channel: "email",
    offsetHours: 24,
    subject: (c) => `${c.firstName}, así Braulio facturó $7,275 con la granja`,
    render: (c) => ({
      html: wrap(`
        <p style="font-size:20px;font-weight:900;color:white;line-height:1.25;margin:0 0 14px">$7,275 en 6 meses sin comprar un solo teléfono.</p>
        <p style="margin:0 0 14px">Braulio Espíritu se metió a TrustMind en enero. No tenía equipo, no tenía dispositivos, no tenía experiencia.</p>
        <p style="margin:0 0 14px">Lo único que hizo:</p>
        <ol style="margin:0 0 16px;padding-left:18px;color:#cbd5e1">
          <li style="margin-bottom:6px">Compró su primer paquete de cuentas Express ($30)</li>
          <li style="margin-bottom:6px">Las conectó al panel y pidió crecimiento orgánico</li>
          <li style="margin-bottom:6px">Empezó a vender el servicio a otros</li>
        </ol>
        <p style="margin:0 0 14px"><strong style="color:white">$7,275 procesados</strong> y subiendo. Sin equipo de soporte, sin cursos pagos externos, sin agencias.</p>
        <p style="margin:0 0 22px">La diferencia entre Braulio y la mayoría es simple: él hizo el primer pedido. No esperó a "tener todo claro".</p>
        ${ctaButton("Ver mi panel y empezar →", c.panelUrl, "#10b981")}
        <p style="margin:24px 0 0;font-size:13px;color:#94a3b8">— Dante</p>
      `, c),
      text: `Braulio facturó $7,275 con TrustMind. Tu panel: ${c.panelUrl}`,
    }),
  },

  // ───── STEP 3 — Día 3 — Email — Educacional + soft pitch ─────
  {
    step: 3,
    channel: "email",
    offsetHours: 72,
    subject: (c) => `El error #1 que veo en TrustMind`,
    render: (c) => ({
      html: wrap(`
        <p style="font-size:20px;font-weight:900;color:white;line-height:1.25;margin:0 0 14px">El error #1 que comete el 73% de la gente.</p>
        <p style="margin:0 0 14px">Después de analizar 600+ cuentas en TrustMind, este es el patrón:</p>
        <p style="margin:0 0 14px">La gente entra al panel, mira los servicios, pero <strong style="color:white">no hace el primer pedido</strong>. Esperan a "entender todo" antes de probar.</p>
        <p style="margin:0 0 14px">El problema: nunca terminan de entender porque <strong style="color:#fbbf24">la única forma de entender es probando</strong>.</p>
        <p style="margin:0 0 14px">Los que sí pagaron y se quedaron tienen algo en común:</p>
        <ul style="margin:0 0 16px;padding-left:18px;color:#cbd5e1">
          <li style="margin-bottom:6px">Pidieron un servicio chico en el día 1 (≈$3 USD)</li>
          <li style="margin-bottom:6px">Vieron resultados en horas</li>
          <li style="margin-bottom:6px">Escalaron desde ahí</li>
        </ul>
        <p style="margin:0 0 22px">Si todavía no probaste, andá ahora. El panel te muestra los <strong style="color:white">top 10 servicios</strong> ordenados por uso real.</p>
        ${ctaButton("Hacer mi primer pedido →", c.panelUrl, "#007ABF")}
        <p style="margin:24px 0 0;font-size:13px;color:#94a3b8">El plan anual te baja todo a costo base y te incluye la academia completa. Pero antes: probá el panel.</p>
        <p style="margin:14px 0 0;font-size:13px;color:#94a3b8">— Dante</p>
      `, c),
      text: `El error #1 en TrustMind: no probar. Panel: ${c.panelUrl}`,
    }),
  },

  // ───── STEP 4 — Día 5 — Email — Cierre directo: plan anual ─────
  {
    step: 4,
    channel: "email",
    offsetHours: 120,
    subject: (c) => `${c.firstName}: oferta del plan anual`,
    render: (c) => ({
      html: wrap(`
        <p style="font-size:22px;font-weight:900;color:white;line-height:1.2;margin:0 0 14px">Plan anual: $240 / año</p>
        <p style="margin:0 0 14px">Comparado con el plan mensual ($50/mes = $600/año), te ahorrás <strong style="color:#10b981">$360 al año</strong>. Es 60% off.</p>
        <p style="margin:0 0 18px">Qué incluye el plan anual:</p>
        <ul style="margin:0 0 18px;padding-left:18px;color:#cbd5e1">
          <li style="margin-bottom:6px"><strong style="color:white">Panel SMM</strong> con 5,000+ servicios a precio base</li>
          <li style="margin-bottom:6px"><strong style="color:white">Academia completa</strong>: granjas, GenFarmer, monetización IG/TikTok/YT</li>
          <li style="margin-bottom:6px"><strong style="color:white">TrustInsta + TrustFace</strong> (apps desktop bundle)</li>
          <li style="margin-bottom:6px"><strong style="color:white">Cuentas Express</strong> con auto-entrega de credenciales</li>
          <li style="margin-bottom:6px">Soporte WhatsApp directo (no formularios)</li>
        </ul>
        <p style="margin:0 0 22px">$240 una vez. Sin comisiones, sin contratos. Si en 7 días no es para vos, te devolvemos el dinero.</p>
        ${ctaButton("Activar plan anual ahora →", c.ofertaUrl, "#fbbf24")}
        <p style="margin:24px 0 0;font-size:13px;color:#94a3b8">El precio sube a $297 la próxima semana. Si dudás, ahora es el mejor momento.</p>
        <p style="margin:14px 0 0;font-size:13px;color:#94a3b8">— Dante</p>
      `, c),
      text: `Plan anual TrustMind: $240/año. ${c.ofertaUrl}`,
    }),
  },

  // ───── STEP 6 — Día 7 — Email — Última llamada ─────
  {
    step: 6,
    channel: "email",
    offsetHours: 168,
    subject: (c) => `${c.firstName}, cierro el precio a las 23:59`,
    render: (c) => ({
      html: wrap(`
        <p style="font-size:22px;font-weight:900;color:white;line-height:1.2;margin:0 0 14px">Último día.</p>
        <p style="margin:0 0 14px">A las 23:59 de hoy el plan anual deja de costar $240 y pasa a $297.</p>
        <p style="margin:0 0 14px">Si ya tomaste la decisión de NO entrar, no pasa nada. Te agradezco que hayas probado el panel y te deseo lo mejor.</p>
        <p style="margin:0 0 18px">Si estás dudando porque "no es el mejor momento": <strong style="color:white">nunca lo es</strong>. Los $240 los recuperás con una sola operación bien hecha.</p>
        ${ctaButton("Activar plan anual antes de las 23:59 →", c.ofertaUrl, "#ef4444")}
        <p style="margin:24px 0 0;font-size:13px;color:#94a3b8">Después de hoy no te mando más emails sobre esto. Te lo prometo.</p>
        <p style="margin:14px 0 0;font-size:13px;color:#94a3b8">— Dante</p>
      `, c),
      text: `Último día del plan anual a $240. Después sube a $297. ${c.ofertaUrl}`,
    }),
  },
];
