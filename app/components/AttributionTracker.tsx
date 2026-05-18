"use client";

import { useEffect } from "react";

/**
 * Captura UTMs / click IDs / referrer en la PRIMERA visita y los guarda en cookie
 * `tm_attr` (TTL 30 días). El auth callback los lee al primer signup y persiste
 * en la tabla user_attribution (first-touch attribution).
 *
 * Inyectar en layout raíz para que corra en todas las páginas.
 */
export function AttributionTracker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      // Si ya tenemos cookie, no sobreescribir (first-touch)
      const hasCookie = document.cookie.split(";").some((c) => c.trim().startsWith("tm_attr="));
      if (hasCookie) return;

      const params = new URLSearchParams(window.location.search);

      const data: Record<string, string> = {
        utm_source: params.get("utm_source") || "",
        utm_medium: params.get("utm_medium") || "",
        utm_campaign: params.get("utm_campaign") || "",
        utm_content: params.get("utm_content") || "",
        utm_term: params.get("utm_term") || "",
        fbclid: params.get("fbclid") || "",
        gclid: params.get("gclid") || "",
        ttclid: params.get("ttclid") || "",
        msclkid: params.get("msclkid") || "",
        referrer: document.referrer || "",
        landing_page: window.location.pathname || "/",
        user_agent: navigator.userAgent.slice(0, 250),
      };

      // Si no hay NADA relevante (visita directa sin referrer ni UTMs), igual guardamos
      // para tener landing_page registrada — pero marcamos source = "direct".
      const hasAnySignal = Object.entries(data).some(([k, v]) =>
        ["utm_source", "utm_medium", "utm_campaign", "fbclid", "gclid", "ttclid", "msclkid"].includes(k) && v
      );
      if (!hasAnySignal && !data.referrer) {
        data.utm_source = "direct";
      } else if (!hasAnySignal && data.referrer) {
        // Inferir fuente del referrer
        try {
          const host = new URL(data.referrer).hostname.toLowerCase();
          if (host.includes("facebook")) data.utm_source = "facebook_organic";
          else if (host.includes("instagram")) data.utm_source = "instagram_organic";
          else if (host.includes("tiktok")) data.utm_source = "tiktok_organic";
          else if (host.includes("google") || host.includes("bing.")) data.utm_source = "search";
          else if (host.includes("youtube")) data.utm_source = "youtube";
          else data.utm_source = "referral";
        } catch { data.utm_source = "referral"; }
      }

      // Guardar cookie 30 días, accesible sólo desde el dominio
      const payload = encodeURIComponent(JSON.stringify(data));
      const maxAge = 60 * 60 * 24 * 30;
      const isTrustmind = window.location.hostname.endsWith(".trustmind.online") || window.location.hostname === "trustmind.online";
      const domain = isTrustmind ? "; Domain=.trustmind.online" : "";
      document.cookie = `tm_attr=${payload}; Max-Age=${maxAge}; Path=/${domain}; SameSite=Lax`;
    } catch {
      // silently ignore
    }
  }, []);

  return null;
}
