import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Comprar Seguidores y Likes de TikTok — Panel SMM TrustMind",
  description: "Compra seguidores, likes, views y comentarios de TikTok reales. Entrega rapida, precios desde $0.01. Panel SMM automatizado con soporte 24/7.",
  alternates: { canonical: "https://www.trustmind.online/landing/tiktok" },
  openGraph: {
    title: "Comprar Seguidores TikTok — TrustMind",
    description: "Compra seguidores, likes y views de TikTok. Entrega rapida y precios bajos.",
    url: "https://www.trustmind.online/landing/tiktok",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
