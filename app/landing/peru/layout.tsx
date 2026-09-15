import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Servicios SMM en Peru — Compra Seguidores, Likes y Views",
  description: "Software de granjas de bots para Peru. Cuentas de Instagram, TikTok y Facebook listas para usar, software antidetect y herramientas de video con IA. Pago en soles con Yape y Plin.",
  alternates: { canonical: "https://www.trustmind.online/landing/peru" },
  openGraph: {
    title: "Servicios SMM en Peru — TrustMind",
    description: "Software de granjas de bots para Peru. Cuentas listas para usar y software antidetect. Pago con Yape y Plin.",
    url: "https://www.trustmind.online/landing/peru",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
