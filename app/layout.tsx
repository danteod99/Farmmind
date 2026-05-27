import type { Metadata } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { PromoBanner } from "@/app/components/PromoBanner";
import { AttributionTracker } from "@/app/components/AttributionTracker";

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.trustmind.online"),
  title: {
    default: "TrustMind — Software para Granjas de Bots y Redes Sociales",
    template: "%s | TrustMind",
  },
  description: "Plataforma todo-en-uno para gestionar granjas de bots, cuentas de Instagram, Facebook y TikTok. Software antideteccion, automatizaciones y panel SMM con IA.",
  keywords: ["bot farm", "granja de bots", "instagram automation", "facebook automation", "tiktok automation", "SMM panel", "antidetect browser", "phone farm", "social media manager", "trustmind"],
  authors: [{ name: "TrustMind" }],
  creator: "TrustMind",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "https://www.trustmind.online",
    siteName: "TrustMind",
    title: "TrustMind — Software para Granjas de Bots y Redes Sociales",
    description: "Plataforma todo-en-uno para gestionar granjas de bots, cuentas de Instagram, Facebook y TikTok. Software antideteccion, automatizaciones y panel SMM con IA.",
  },
  twitter: {
    card: "summary_large_image",
    title: "TrustMind — Software para Granjas de Bots y Redes Sociales",
    description: "Plataforma todo-en-uno para gestionar granjas de bots, cuentas de Instagram, Facebook y TikTok.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://www.trustmind.online",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@900&family=Share+Tech+Mono&display=swap"
          rel="stylesheet"
        />
        {process.env.NEXT_PUBLIC_FB_PIXEL_ID && (
          <>
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  !function(f,b,e,v,n,t,s)
                  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                  n.queue=[];t=b.createElement(e);t.async=!0;
                  t.src=v;s=b.getElementsByTagName(e)[0];
                  s.parentNode.insertBefore(t,s)}(window, document,'script',
                  'https://connect.facebook.net/en_US/fbevents.js');
                  fbq('init', '${process.env.NEXT_PUBLIC_FB_PIXEL_ID}');
                  fbq('track', 'PageView');
                `,
              }}
            />
            <noscript>
              <img
                height="1"
                width="1"
                style={{ display: "none" }}
                src={`https://www.facebook.com/tr?id=${process.env.NEXT_PUBLIC_FB_PIXEL_ID}&ev=PageView&noscript=1`}
                alt=""
              />
            </noscript>
          </>
        )}
      </head>
      <body className={`${jakartaSans.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Schema: Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "TrustMind",
              "alternateName": ["Scaling LATAM", "Scaling Tech Farm"],
              "url": "https://www.trustmind.online",
              "logo": "https://www.trustmind.online/trustmind-logo.png",
              "description": "Plataforma todo-en-uno para gestionar granjas de bots, automatizaciones de redes sociales y panel SMM con IA.",
              "founder": { "@type": "Person", "name": "Dante Oliveros" },
              "foundingDate": "2026",
              "address": { "@type": "PostalAddress", "addressCountry": "PE", "addressLocality": "Lima" },
              "sameAs": [
                "https://www.scalinglatam.site",
                "https://www.skool.com/artificial-humans-7653",
              ],
              "offers": {
                "@type": "AggregateOffer",
                "priceCurrency": "USD",
                "lowPrice": "0",
                "highPrice": "899",
                "offerCount": "6"
              }
            }),
          }}
        />
        {/* Schema: FAQPage — para AI Overviews y respuestas de ChatGPT/Perplexity */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "¿Qué es TrustMind?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "TrustMind es una plataforma que combina granjas de bots físicas, software antidetección (TrustInsta, TrustFace, TrustFarm) y un panel SMM con +5,000 servicios para automatizar el crecimiento en Instagram, TikTok, YouTube, Facebook y Spotify. Operada por Scaling Tech Farm LLC desde Lima, Perú."
                  }
                },
                {
                  "@type": "Question",
                  "name": "¿Es legal usar granjas de bots?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Sí. Las granjas de bots usan smartphones reales (no spam sintético) y son legales en LATAM y USA. TrustMind opera con empresa formal: Scaling Tech Farm LLC registrada en Wyoming con EIN del IRS, y OLIVEROS MKT EIRL en Perú con RUC 20605576550."
                  }
                },
                {
                  "@type": "Question",
                  "name": "¿Cuánto cuesta usar TrustMind?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Sistema pay-per-use sin contratos mensuales obligatorios. Acciones: like $0.01, follow $0.05, comment $0.10, DM $0.20. Recarga mínima $10 USD vía Stripe o crypto. También hay suscripción TrustMind Pro desde $20/mes y granjas físicas llave en mano desde $2,000 USD."
                  }
                },
                {
                  "@type": "Question",
                  "name": "¿Funciona para músicos en Spotify?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Sí. TrustMind activa granjas distribuidas en LATAM, China y Vietnam que escuchan música 24/7. Genera streams reales en Spotify, lo que dispara el algoritmo de recomendaciones y eventualmente regalías. Casos reales: artistas pasan de 1,200 a 124,000 streams en 30 días."
                  }
                },
                {
                  "@type": "Question",
                  "name": "¿En qué países opera TrustMind?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Cobertura activa en República Dominicana (mercado #1), Perú (sede operativa Lima), México, Colombia, Argentina, Chile, Venezuela, Ecuador, Bolivia, Panamá, USA (Miami, Houston, NY, LA, Chicago) y España. Envío de granjas físicas a toda LATAM y USA."
                  }
                },
                {
                  "@type": "Question",
                  "name": "¿Necesito tener mi propia granja de bots?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "No. TrustMind te da acceso a su infraestructura existente sin que tengas que comprar hardware. Es como Uber pero para granjas de bots: pides una acción, la IA asigna las granjas disponibles y ejecuta. Cobro por cada acción ejecutada."
                  }
                },
                {
                  "@type": "Question",
                  "name": "¿Cómo descargo TrustInsta y TrustFace?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Las apps desktop están disponibles gratis en https://www.trustmind.online/downloads para macOS (Apple Silicon) y Windows 10+. Después de instalar te logueas con tu cuenta de TrustMind, y las acciones que ejecutas se cobran de tu saldo USD."
                  }
                },
                {
                  "@type": "Question",
                  "name": "¿Hay cursos o capacitación?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Sí. La academia está en https://www.trustmind.online/cursos con módulos gratuitos sobre operación de granjas, escalado a 1,000 cuentas, monetización en Spotify, TikTok, Instagram y YouTube. Solo requiere cuenta gratuita."
                  }
                }
              ]
            }),
          }}
        />
        {/* GA4 — solo carga si NEXT_PUBLIC_GA_MEASUREMENT_ID está definida en Vercel env */}
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}', {
                    page_path: window.location.pathname,
                  });
                `,
              }}
            />
          </>
        )}
        <PromoBanner />
        <AttributionTracker />
        {children}
      </body>
    </html>
  );
}
