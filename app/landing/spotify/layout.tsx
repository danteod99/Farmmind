import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Comprar Plays y Seguidores de Spotify — Panel SMM TrustMind",
  description: "Compra reproducciones, seguidores y listeners de Spotify. Impulsa tu musica con entrega rapida y precios accesibles.",
  alternates: { canonical: "https://www.trustmind.online/landing/spotify" },
  openGraph: {
    title: "Comprar Plays Spotify — TrustMind",
    description: "Compra reproducciones y seguidores de Spotify. Entrega rapida.",
    url: "https://www.trustmind.online/landing/spotify",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
