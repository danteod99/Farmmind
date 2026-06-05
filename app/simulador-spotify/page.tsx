import type { Metadata } from "next";
import SpotifySimulator from "./SpotifySimulator";

const TITLE = "Simulador de Ganancias en Spotify 2026 — Calculadora de Royalties por Streams";
const DESC =
  "Calcula gratis cuánto paga Spotify por stream en 2026. Simulador interactivo de ingresos por reproducciones según dispositivos, horas y tipo de cuenta (Free vs Premium). Tasas reales de pago.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: [
    "simulador ganancias spotify",
    "cuánto paga spotify por stream",
    "cuánto paga spotify por reproducción 2026",
    "calculadora royalties spotify",
    "calculadora ganancias spotify",
    "ingresos spotify streaming",
    "cuánto gana spotify por mil reproducciones",
    "monetización spotify granja",
    "genfarmer",
    "spotify farm earnings",
  ],
  alternates: { canonical: "https://www.trustmind.online/simulador-spotify" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "https://www.trustmind.online/simulador-spotify",
    siteName: "TrustMind",
    title: TITLE,
    description: DESC,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
  },
};

// JSON-LD: ayuda a Google a entender la página como una herramienta gratuita + FAQ.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Simulador de Ganancias en Spotify",
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      url: "https://www.trustmind.online/simulador-spotify",
      description: DESC,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "¿Cuánto paga Spotify por stream en 2026?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Las cuentas Free (ad-supported) pagan aprox. $0.0008 a $0.001 por reproducción, y las cuentas Premium de mercados de alto valor (USA/EU) entre $0.004 y $0.006 por stream. Un stream se contabiliza a los 30 segundos de reproducción.",
          },
        },
        {
          "@type": "Question",
          name: "¿El simulador es gratis?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Sí, el simulador de royalties de Spotify es 100% gratuito y no requiere registro. Ajustas dispositivos, horas de stream y duración de canción para proyectar ingresos diarios, mensuales y anuales.",
          },
        },
      ],
    },
  ],
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SpotifySimulator />
    </>
  );
}
