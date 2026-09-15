import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cuentas y Software para TikTok — TrustMind",
  description: "Cuentas de TikTok listas para usar, software de granjas de bots y herramientas de video con IA. Entrega rapida y soporte 24/7.",
  alternates: { canonical: "https://www.trustmind.online/landing/tiktok" },
  openGraph: {
    title: "Cuentas y Software para TikTok — TrustMind",
    description: "Cuentas de TikTok, software antidetect y herramientas de video con IA.",
    url: "https://www.trustmind.online/landing/tiktok",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
