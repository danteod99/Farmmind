import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Servicios SMM en Peru — Compra Seguidores, Likes y Views",
  description: "Panel SMM para Peru. Compra seguidores de Instagram, likes de TikTok, views de YouTube y mas. Pago en soles con Yape y Plin. Entrega inmediata.",
  alternates: { canonical: "https://www.trustmind.online/landing/peru" },
  openGraph: {
    title: "Servicios SMM en Peru — TrustMind",
    description: "Panel SMM para Peru. Compra seguidores, likes y views. Pago con Yape y Plin.",
    url: "https://www.trustmind.online/landing/peru",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
