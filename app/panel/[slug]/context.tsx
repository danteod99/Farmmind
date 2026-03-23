"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface ResellerInfo {
  id: string;
  slug: string;
  panel_name: string;
  logo_url: string;
  brand_color: string;
  description: string;
  custom_domain: string;
  services_count: number;
  plans: {
    id: string;
    plan_name: string;
    description: string;
    price_usd: number;
    period_days: number;
    services_included: { service_id: number; service_name: string; quantity: number }[];
  }[];
  // Storefront customization
  hero_title: string;
  hero_subtitle: string;
  cta_text: string;
  cta_secondary_text: string;
  whatsapp_number: string;
  instagram_url: string;
  telegram_url: string;
  tiktok_url: string;
  facebook_pixel_id: string;
  show_features_section: boolean;
  show_plans_section: boolean;
  show_powered_by: boolean;
}

interface PanelContextType {
  reseller: ResellerInfo | null;
  loading: boolean;
  slug: string;
  brandColor: string;
  panelName: string;
  logoUrl: string;
}

const PanelContext = createContext<PanelContextType>({
  reseller: null,
  loading: true,
  slug: "",
  brandColor: "#007ABF",
  panelName: "SMM Panel",
  logoUrl: "",
});

export function PanelProvider({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  const [reseller, setReseller] = useState<ResellerInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/panel/${slug}/info`);
        if (res.ok) {
          const data = await res.json();
          setReseller(data);
        }
      } catch (e) {
        console.error("Failed to load panel info:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  return (
    <PanelContext.Provider
      value={{
        reseller,
        loading,
        slug,
        brandColor: reseller?.brand_color || "#007ABF",
        panelName: reseller?.panel_name || "SMM Panel",
        logoUrl: reseller?.logo_url || "",
      }}
    >
      {children}
    </PanelContext.Provider>
  );
}

export function usePanel() {
  return useContext(PanelContext);
}
