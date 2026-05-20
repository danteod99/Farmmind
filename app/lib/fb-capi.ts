import crypto from "crypto";

function sha256(str: string): string {
  return crypto.createHash("sha256").update(str.toLowerCase().trim()).digest("hex");
}

interface PurchaseEventParams {
  email: string;
  amount: number;
  eventId: string;            // mismo que el Pixel client-side para dedupe
  currency?: string;
  fbp?: string | null;        // cookie _fbp (browser id)
  fbc?: string | null;        // cookie _fbc (click id)
  fbclid?: string | null;     // del query string (fallback)
  ipAddress?: string | null;
  userAgent?: string | null;
  eventSourceUrl?: string;
}

/**
 * Envía Purchase event a Facebook Conversions API.
 * No tira si falla: solo loguea. Trabaja en paralelo al Pixel client-side
 * con el mismo event_id para que Facebook deduplique.
 */
export async function sendFbPurchaseEvent({
  email,
  amount,
  eventId,
  currency = "USD",
  fbp = null,
  fbc = null,
  fbclid = null,
  ipAddress = null,
  userAgent = null,
  eventSourceUrl = "https://www.trustmind.online/welcome",
}: PurchaseEventParams): Promise<void> {
  const pixelId = process.env.NEXT_PUBLIC_FB_PIXEL_ID;
  const accessToken = process.env.FB_CAPI_ACCESS_TOKEN;
  if (!pixelId || !accessToken) {
    console.warn("[FB CAPI] Faltan NEXT_PUBLIC_FB_PIXEL_ID o FB_CAPI_ACCESS_TOKEN, skip");
    return;
  }

  // Generar fbc desde fbclid si no viene cookie (formato: fb.1.<unixms>.<fbclid>)
  let fbcFinal = fbc;
  if (!fbcFinal && fbclid) {
    fbcFinal = `fb.1.${Date.now()}.${fbclid}`;
  }

  const url = `https://graph.facebook.com/v19.0/${pixelId}/events`;
  const body = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: "website",
        event_source_url: eventSourceUrl,
        user_data: {
          em: [sha256(email)],
          ...(fbp ? { fbp } : {}),
          ...(fbcFinal ? { fbc: fbcFinal } : {}),
          ...(ipAddress ? { client_ip_address: ipAddress } : {}),
          ...(userAgent ? { client_user_agent: userAgent } : {}),
        },
        custom_data: {
          currency,
          value: amount,
          content_name: "TRUST MIND Pro",
          content_type: "subscription",
        },
      },
    ],
    access_token: accessToken,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("[FB CAPI] Error:", JSON.stringify(data));
      return;
    }
    console.log("[FB CAPI] Purchase enviado:", JSON.stringify(data));
  } catch (e) {
    console.error("[FB CAPI] Exception:", e);
  }
}
