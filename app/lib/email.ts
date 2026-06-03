// Resend wrapper para emails transaccionales y drip campaigns.
// Si RESEND_API_KEY no está set, las funciones loguean y retornan null
// (degradación grácil: deploy no rompe sin las credentials).

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromOverride?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
}

interface SendEmailResult {
  id: string;
}

const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL || "TrustMind <hola@trustmind.online>";
const REPLY_TO = process.env.RESEND_REPLY_TO || "soporte@trustmind.online";

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult | null> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(`[email] RESEND_API_KEY missing, skip send to ${params.to}`);
    return null;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: params.fromOverride || DEFAULT_FROM,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
        reply_to: params.replyTo || REPLY_TO,
        tags: params.tags,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("[email] resend error:", res.status, data);
      throw new Error(data?.message || `Resend HTTP ${res.status}`);
    }
    return { id: data.id };
  } catch (e) {
    console.error("[email] send exception:", e);
    throw e;
  }
}
