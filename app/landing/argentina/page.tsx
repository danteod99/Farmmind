"use client";

import LandingTemplate from "@/app/components/LandingTemplate";

export default function LandingArgentina() {
  return (
    <LandingTemplate
      countryFlag="🇦🇷"
      accentColor="#007ABF"
      secondaryColor="#75CFFF"
      badge="Plataforma #1 para creadores argentinos · Activo 24/7"
      headlineTop="Hacé crecer"
      headlineBottom="tus redes, pa"
      subheadline="La herramienta de Social Media Marketing que usan los creadores argentinos. Crecé en Instagram, TikTok, YouTube y Spotify — todo automatizado con IA."
      ctaText="Empezar gratis — Es gratis, posta"
      ctaSubtext="30 mensajes gratis · Sin tarjeta · Sin humo"
      chatPreview={{
        user: "Quiero meter más views a mis Reels de trap argentino, ¿cómo hago?",
        ai: "Para boostear tus Reels de trap, te recomiendo: **views argentinos con retención alta** para que el algoritmo te empuje, **likes automáticos** en cada publicación, y **saves** que son lo que más pesa en IG. Podés pedir todo junto desde el panel. Los precios arrancan desde **$0.40 por 1K views**. ¿Le damos?",
      }}
      stats={[
        { value: "4,200+", label: "Usuarios en Argentina" },
        { value: "25M+", label: "Seguidores entregados" },
        { value: "$0.40", label: "Precio desde / 1K" },
        { value: "< 5min", label: "Tiempo de entrega" },
      ]}
      featuresTitle="Pensado para el mercado argentino"
      featuresSubtitle="Servicios optimizados para crecer en Argentina y toda Latam."
      features={[
        { emoji: "📱", title: "Instagram & TikTok Growth", desc: "Seguidores, likes, views y comentarios. Engagement real optimizado para cuentas argentinas. El algoritmo te va a amar.", color: "#E1306C" },
        { emoji: "🎵", title: "Spotify & YouTube", desc: "Streams para tu trap, cumbia 420 o lo que sea. Views en YouTube. Hacé que tu música llegue a más gente sin gastar una fortuna.", color: "#1DB954" },
        { emoji: "🤖", title: "IA que habla tu idioma", desc: "El agente IA te responde al toque en español. Preguntale sobre estrategias, anti-baneo, proxies, lo que necesites.", color: "#007ABF" },
        { emoji: "💰", title: "Precios en USD, accesibles", desc: "Pagá con crypto o tarjeta. Precios competitivos pensados para el bolsillo argentino. Sin mínimos ridículos.", color: "#F59E0B" },
        { emoji: "🔄", title: "Panel de reseller", desc: "Revendé servicios a tus clientes. Marca blanca, precios mayoristas y panel independiente. Ideal para agencias.", color: "#8B5CF6" },
        { emoji: "⚡", title: "Entrega inmediata", desc: "La mayoría de servicios se entregan en minutos. Sin esperas, sin vueltas. Tu cuenta crece desde el primer pedido.", color: "#EF4444" },
      ]}
      useCasesTitle="¿Para quién es TRUST MIND en Argentina?"
      useCases={[
        { icon: "🎤", title: "Artistas de trap y urbano", desc: "Duki, Bizarrap... la movida argentina explota. Promocioná tu música con streams reales y views que te posicionen en las playlists." },
        { icon: "🛍️", title: "Emprendedores y marcas", desc: "Tiendas de ropa, gastronomía, servicios — crecé tu Instagram con seguidores argentinos que se convierten en ventas reales." },
        { icon: "📹", title: "Streamers y YouTubers", desc: "Más subs, más views, más watch time. Impulsá tu canal para monetizar más rápido y conseguir mejores sponsors." },
        { icon: "📊", title: "Agencias de marketing digital", desc: "Usá nuestro panel de reseller para ofrecer servicios SMM a tus clientes. Precios mayoristas y soporte dedicado." },
      ]}
      testimonials={[
        { name: "Nico F.", role: "Productor musical · Buenos Aires", text: "Metí 50K streams en un mes a mi último track. La IA me ayudó a elegir los mejores servicios. Una masa.", country: "🇦🇷" },
        { name: "Valentina S.", role: "Tienda online · Córdoba", text: "Pasé de 5K a 30K seguidores en Instagram. Las ventas se triplicaron. Lo mejor es que es re fácil de usar.", country: "🇦🇷" },
        { name: "Matías L.", role: "Agencia digital · Rosario", text: "El panel de reseller me salvó. Revendo a mis clientes y la ganancia es excelente. El soporte responde al toque.", country: "🇦🇷" },
      ]}
      finalCtaTitle={"¿Listo para crecer\nen Argentina?"}
      finalCtaSubtitle="Unite a miles de argentinos que ya usan TRUST MIND · Empezá gratis hoy"
    />
  );
}
