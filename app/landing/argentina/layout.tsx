import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Servicios SMM en Argentina — Compra Seguidores, Likes y Views",
  description: "Software de granjas de bots para Argentina. Cuentas de Instagram, TikTok y Facebook listas para usar, software antidetect y herramientas de video con IA. Pago en pesos con Mercado Pago.",
  alternates: { canonical: "https://www.trustmind.online/landing/argentina" },
  openGraph: {
    title: "Servicios SMM en Argentina — TrustMind",
    description: "Software de granjas de bots para Argentina. Cuentas listas para usar y software antidetect. Pago con Mercado Pago.",
    url: "https://www.trustmind.online/landing/argentina",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
