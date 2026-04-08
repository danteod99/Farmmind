import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Servicios SMM en Argentina — Compra Seguidores, Likes y Views",
  description: "Panel SMM para Argentina. Compra seguidores de Instagram, likes de TikTok, views de YouTube y mas. Pago en pesos con Mercado Pago. Entrega inmediata.",
  alternates: { canonical: "https://www.trustmind.online/landing/argentina" },
  openGraph: {
    title: "Servicios SMM en Argentina — TrustMind",
    description: "Panel SMM para Argentina. Compra seguidores, likes y views. Pago con Mercado Pago.",
    url: "https://www.trustmind.online/landing/argentina",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
