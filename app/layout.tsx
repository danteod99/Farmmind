import type { Metadata } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { PromoBanner } from "@/app/components/PromoBanner";

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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "TrustMind",
              "url": "https://www.trustmind.online",
              "description": "Plataforma todo-en-uno para gestionar granjas de bots, automatizaciones de redes sociales y panel SMM con IA.",
              "sameAs": [],
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
        <PromoBanner />
        {children}
      </body>
    </html>
  );
}
