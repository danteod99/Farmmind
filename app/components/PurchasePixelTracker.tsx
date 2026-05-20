"use client";

import { useEffect } from "react";

/**
 * Dispara fbq("Purchase") cuando la URL trae ?purchase=cs_xxx&amount=50
 * El event_id es el session.id de Stripe (mismo que envió CAPI server-side)
 * → Facebook deduplica automático y prefiere CAPI cuando llegan ambos.
 */
export function PurchasePixelTracker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const purchaseId = params.get("purchase");
    const amount = parseFloat(params.get("amount") || "0");
    if (!purchaseId || amount <= 0) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    if (typeof w.fbq === "function") {
      w.fbq(
        "track",
        "Purchase",
        {
          value: amount,
          currency: "USD",
          content_name: "TRUST MIND Pro",
          content_type: "subscription",
        },
        { eventID: purchaseId } // dedupe con CAPI
      );
    }

    // Limpiar la URL para no re-disparar en refresh
    const url = new URL(window.location.href);
    url.searchParams.delete("purchase");
    url.searchParams.delete("amount");
    window.history.replaceState({}, "", url.toString());
  }, []);

  return null;
}
