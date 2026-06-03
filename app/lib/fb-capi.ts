import crypto from "crypto";

function sha256(str: string): string {
  return crypto.createHash("sha256").update(str.toLowerCase().trim()).digest("hex");
}

interface FbEventParams {
  eventName: "Purchase" | "InitiateCheckout" | "Lead" | "ViewContent" | "CompleteRegistration" | "AddPaymentInfo";
  eventId: string;            // mismo que el Pixel client-side para dedupe
  email?: string;
  amount?: number;
  currency?: string;
  contentName?: string;
  contentType?: string;
  fbp?: string | null;        // cookie _fbp (browser id)
  fbc?: string | null;        // cookie _fbc (click id)
  fbclid?: string | null;     // del query string (fallback)
  ipAddress?: string | null;
  userAgent?: string | null;
  eventSourceUrl?: string;
}

/**
 * Envía un evento a Facebook Conversions API.
 * No tira si falla: solo loguea. Trabaja en paralelo al Pixel client-side
 * con el mismo event_id para que Facebook deduplique.
 */
export async function sendFbEvent(params: FbEventParams): Promise<void> {
  const pixelId = process.env.NEXT_PUBLIC_FB_PIXEL_ID;
  const accessToken = process.env.FB_CAPI_ACCESS_TOKEN;
  if (!pixelId || !accessToken) {
    console.warn("[FB CAPI] Faltan NEXT_PUBLIC_FB_PIXEL_ID o FB_CAPI_ACCESS_TOKEN, skip");
    return;
  }

  const {
    eventName, eventId, email, amount, currency = "USD",
    contentName, contentType,
    fbp = null, fbc = null, fbclid = null,
    ipAddress = null, userAgent = null,
    eventSourceUrl = "https://www.trustmind.online/oferta",
  } = params;

  let fbcFinal = fbc;
  if (!fbcFinal && fbclid) fbcFinal = `fb.1.${Date.now()}.${fbclid}`;

  const url = `https://graph.facebook.com/v19.0/${pixelId}/events`;
  const userData: Record<string, unknown> = {};
  if (email) userData.em = [sha256(email)];
  if (fbp) userData.fbp = fbp;
  if (fbcFinal) userData.fbc = fbcFinal;
  if (ipAddress) userData.client_ip_address = ipAddress;
  if (userAgent) userData.client_user_agent = userAgent;

  const customData: Record<string, unknown> = {};
  if (amount !== undefined) customData.value = amount;
  if (amount !== undefined) customData.currency = currency;
  if (contentName) customData.content_name = contentName;
  if (contentType) customData.content_type = contentType;

  const body = {
    data: [{
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: "website",
      event_source_url: eventSourceUrl,
      user_data: userData,
      custom_data: customData,
    }],
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
      console.error(`[FB CAPI ${eventName}] Error:`, JSON.stringify(data));
      return;
    }
    console.log(`[FB CAPI ${eventName}] enviado:`, JSON.stringify(data));
  } catch (e) {
    console.error(`[FB CAPI ${eventName}] Exception:`, e);
  }
}

// Backwards-compat alias (lo usa /api/stripe/webhook para Purchase)
export async function sendFbPurchaseEvent(params: {
  email: string;
  amount: number;
  eventId: string;
  currency?: string;
  fbp?: string | null;
  fbc?: string | null;
  fbclid?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  eventSourceUrl?: string;
}): Promise<void> {
  return sendFbEvent({
    eventName: "Purchase",
    contentName: "TRUST MIND Pro",
    contentType: "subscription",
    ...params,
  });
}
