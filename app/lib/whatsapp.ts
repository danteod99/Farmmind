// Twilio wrapper para WhatsApp follow-ups del drip campaign.
// Si las credentials no están seteadas, retorna null grácilmente.
//
// Requiere ENV:
//   TWILIO_ACCOUNT_SID
//   TWILIO_AUTH_TOKEN
//   TWILIO_WHATSAPP_FROM   (ej: "whatsapp:+14155238886")

interface SendWhatsAppParams {
  to: string;             // formato: +51999... (sin "whatsapp:" prefix)
  body: string;
  contentSid?: string;    // opcional: usar template aprobado en Twilio
  contentVariables?: Record<string, string>;
}

interface SendWhatsAppResult {
  sid: string;
  status: string;
}

function normalize(num: string): string {
  const cleaned = num.replace(/[^0-9+]/g, "");
  if (cleaned.startsWith("+")) return `whatsapp:${cleaned}`;
  return `whatsapp:+${cleaned}`;
}

export async function sendWhatsApp(params: SendWhatsAppParams): Promise<SendWhatsAppResult | null> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!sid || !token || !from) {
    console.warn(`[whatsapp] credentials missing, skip send to ${params.to}`);
    return null;
  }

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

  const body = new URLSearchParams({
    From: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
    To: normalize(params.to),
  });

  if (params.contentSid) {
    body.set("ContentSid", params.contentSid);
    if (params.contentVariables) {
      body.set("ContentVariables", JSON.stringify(params.contentVariables));
    }
  } else {
    body.set("Body", params.body);
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("[whatsapp] twilio error:", res.status, data);
      throw new Error(data?.message || `Twilio HTTP ${res.status}`);
    }
    return { sid: data.sid, status: data.status };
  } catch (e) {
    console.error("[whatsapp] send exception:", e);
    throw e;
  }
}
