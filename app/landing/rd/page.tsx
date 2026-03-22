"use client";

import LandingTemplate from "@/app/components/LandingTemplate";

export default function LandingRD() {
  return (
    <LandingTemplate
      countryFlag="🇩🇴"
      accentColor="#007ABF"
      secondaryColor="#56B4E0"
      badge="Plataforma #1 en República Dominicana · Activo 24/7"
      headlineTop="Domina las redes"
      headlineBottom="desde RD"
      subheadline="La herramienta de Social Media Marketing preferida por emprendedores dominicanos. Crece en Instagram, TikTok, YouTube y más — todo automatizado con IA."
      ctaText="Empezar gratis — Es de gratis"
      ctaSubtext="30 mensajes gratis · Sin tarjeta · Pago en USD"
      chatPreview={{
        user: "Quiero crecer mi página de dembow en Instagram desde Santo Domingo, ¿qué me recomiendas?",
        ai: "Para crecer tu página de dembow en IG desde RD, te recomiendo: **seguidores dominicanos reales** con engagement alto, **likes automáticos** en cada post, y **views para Reels**. Con nuestro panel puedes pedir todo junto. Los precios arrancan desde **$0.50 por 1K seguidores**. ¿Empezamos?",
      }}
      stats={[
        { value: "2,500+", label: "Usuarios en RD" },
        { value: "15M+", label: "Seguidores entregados" },
        { value: "$0.50", label: "Precio desde / 1K" },
        { value: "24/7", label: "Soporte en español" },
      ]}
      featuresTitle="Hecho para el mercado dominicano"
      featuresSubtitle="Servicios optimizados para crecer en RD y todo el Caribe."
      features={[
        { emoji: "📱", title: "Instagram & TikTok Growth", desc: "Seguidores, likes, views y comentarios optimizados para cuentas dominicanas. Engagement real que impulsa el algoritmo.", color: "#E1306C" },
        { emoji: "🎵", title: "Promoción musical", desc: "Impulsa tu dembow, bachata o trap dominicano. Streams en Spotify, views en YouTube y promoción en todas las plataformas.", color: "#1DB954" },
        { emoji: "🤖", title: "Agente IA en español", desc: "Pregúntale cualquier cosa sobre growth hacking, estrategias anti-baneo y optimización. Responde al instante en español.", color: "#007ABF" },
        { emoji: "💳", title: "Pagos accesibles", desc: "Acepta crypto, tarjeta y más. Precios en USD accesibles para el mercado dominicano. Sin mínimos altos.", color: "#F59E0B" },
        { emoji: "📊", title: "Dashboard completo", desc: "+5,000 servicios disponibles. Monitorea tus pedidos en tiempo real. Historial completo de todas tus órdenes.", color: "#8B5CF6" },
        { emoji: "🔥", title: "Resultados rápidos", desc: "Entrega en minutos para la mayoría de servicios. Tu cuenta empieza a crecer desde el primer pedido.", color: "#EF4444" },
      ]}
      useCasesTitle="¿Para quién es Scaling Latam en RD?"
      useCases={[
        { icon: "🎤", title: "Artistas de dembow y urbano", desc: "Promociona tu música en Spotify, YouTube y TikTok. Gana streams y visibilidad sin gastar una fortuna en publicidad tradicional." },
        { icon: "🏪", title: "Negocios locales en Santo Domingo", desc: "Restaurantes, barbershops, tiendas — crece tu Instagram con seguidores dominicanos reales que se convierten en clientes." },
        { icon: "📸", title: "Influencers y creadores de contenido", desc: "Impulsa tus métricas para conseguir mejores deals con marcas. Likes, views y engagement automatizado." },
        { icon: "🏢", title: "Agencias de marketing", desc: "Revende nuestros servicios a tus clientes. Panel de reseller con precios especiales y marca blanca." },
      ]}
      testimonials={[
        { name: "Carlos M.", role: "Artista urbano · Santo Domingo", text: "Desde que uso Scaling Latam mis tracks tienen 3x más streams. El agente IA me ayudó a configurar todo en minutos.", country: "🇩🇴" },
        { name: "María P.", role: "Dueña de salón · Santiago", text: "Mi Instagram pasó de 2K a 15K seguidores en un mes. Ahora tengo más clientes que nunca. Súper recomendado.", country: "🇩🇴" },
        { name: "Juan R.", role: "Agencia digital · Punta Cana", text: "Revendo los servicios a mis clientes de turismo. Los precios son imbatibles y la calidad es consistente.", country: "🇩🇴" },
      ]}
      finalCtaTitle={"¿Listo para crecer\nen RD?"}
      finalCtaSubtitle="Únete a miles de dominicanos que ya usan Scaling Latam · Empieza gratis hoy"
    />
  );
}
