import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Descargas — TrustInsta, TrustFace y TrustFarm Desktop",
  description: "Descarga el software del ecosistema TrustMind: TrustInsta para Instagram, TrustFace para Facebook y TrustFarm para phone farming. Disponible para Mac y Windows.",
  alternates: {
    canonical: "https://www.trustmind.online/downloads",
  },
  openGraph: {
    title: "Descargas — Software TrustMind",
    description: "Descarga TrustInsta, TrustFace y TrustFarm. Software profesional para gestionar granjas de navegadores y celulares.",
    url: "https://www.trustmind.online/downloads",
  },
};

export default function DownloadsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
