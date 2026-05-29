"use client";

import LandingTemplate from "@/app/components/LandingTemplate";

export default function LandingEspana() {
  return (
    <LandingTemplate
      countryFlag="🇪🇸"
      accentColor="#dc2626"
      secondaryColor="#fbbf24"
      badge="La primera IA que comanda 1.000 granjas de bots"
      headlineTop="Posiciona tu marca"
      headlineBottom="en redes con IA"
      subheadline="Una nueva categoría de inteligencia artificial: en lugar de generar contenido, comanda 1.000 granjas de bots reales para hacer crecer tu cuenta. Pensada para creators, marcas y agencias en España."
      ctaText="Solicitar acceso anticipado"
      ctaSubtext="Demo gratuita · Sin tarjeta · Cumplimiento GDPR · Soporte en horario CET"
      chatPreview={{
        user: "Llevo una marca de moda sostenible en Barcelona con 1.500 seguidores. ¿Cómo me ayuda vuestra IA?",
        ai: "Perfecto. **Activando 5 granjas en España y 2 en Italia** especializadas en moda y lifestyle premium. La IA va a posicionar tu marca con audiencia local, dar engagement orgánico y empujar tus reels al algoritmo. **Objetivo: 12.000 seguidores cualificados en 45 días**. ¿Lo arrancamos?",
      }}
      stats={[
        { value: "1.000+", label: "Granjas comandadas por IA" },
        { value: "47M", label: "Usuarios España objetivo" },
        { value: "GDPR", label: "Cumplimiento total" },
        { value: "CET", label: "Soporte horario europeo" },
      ]}
      featuresTitle="Una nueva categoría de IA, pensada para creators serios"
      featuresSubtitle="No es un panel SMM más. Es la primera IA del mundo que comanda granjas físicas reales en múltiples países."
      features={[
        { emoji: "🧠", title: "IA que ejecuta, no que genera", desc: "Mientras ChatGPT escribe y Midjourney dibuja, TrustMind comanda granjas reales para que tu contenido lo vea quien tiene que verlo. Una nueva categoría.", color: "#dc2626" },
        { emoji: "🌍", title: "Granjas distribuidas globalmente", desc: "1.000 granjas físicas en LATAM, Caribe, China y Vietnam. La IA decide automáticamente qué granja usar según tu nicho y geografía objetivo.", color: "#0891b2" },
        { emoji: "🛡️", title: "Cumplimiento GDPR y RGPD", desc: "Política de privacidad clara, opt-in explícito, datos cifrados, procesador certificado en UE. Sin trucos, sin riesgo legal para tu marca.", color: "#22c55e" },
        { emoji: "💳", title: "Facturación en EUR", desc: "Pagos en euros mediante Stripe, SEPA o transferencia bancaria. Facturación con IVA correspondiente. IRPF si eres autónomo.", color: "#f59e0b" },
        { emoji: "📊", title: "Métricas de calidad, no de vanity", desc: "Engagement real, retención de audiencia, conversión a venta. La IA optimiza KPIs que importan, no solo seguidores muertos.", color: "#8b5cf6" },
        { emoji: "🏢", title: "Soporte profesional CET", desc: "Equipo en horario europeo (9.00-18.00 CET). Atención por WhatsApp, email y videollamada. Acuerdo de servicio firmado.", color: "#ec4899" },
      ]}
      useCasesTitle="¿Para quién es TrustMind en España?"
      useCases={[
        { icon: "🎨", title: "Marcas DTC y e-commerce", desc: "Moda, belleza, hogar, food. La IA construye la autoridad social que necesitas para que el algoritmo de Instagram y TikTok te muestre a más personas." },
        { icon: "🎵", title: "Artistas y productores musicales", desc: "Indie, urbano, electrónica, flamenco urbano. La IA activa granjas que escuchan tu música en Spotify. Stripe Europa paga regalías en euros." },
        { icon: "💼", title: "Coaches, consultores y agencias", desc: "Si vives de tu marca personal, la autoridad social cierra ventas. La IA te posiciona como referente sin años de trabajo orgánico." },
        { icon: "📺", title: "Creators de contenido emergentes", desc: "Llega al tier verificado, consigue colaboraciones con marcas, multiplica tu ticket medio. La IA acelera lo que el algoritmo te haría esperar años." },
      ]}
      testimonials={[
        { name: "Marta L.", role: "Marca de moda · Barcelona", text: "Pasé de 1.500 a 23.000 seguidores en dos meses. Mis ventas en Shopify subieron un 340 por ciento. La IA está optimizada de verdad para mi nicho.", country: "🇪🇸" },
        { name: "Javier R.", role: "Productor musical · Madrid", text: "Subí un EP electrónico y la IA activó granjas que lo escucharon en bucle. 89.000 streams en 30 días. Recibí 612 euros en regalías. Negocio real.", country: "🇪🇸" },
        { name: "Laia M.", role: "Coach financiera · Valencia", text: "Antes nadie me conocía. Hoy lleno mis cursos a 600 euros la plaza. La IA me dio autoridad en menos tiempo del que esperaba. Recomendable.", country: "🇪🇸" },
      ]}
      finalCtaTitle={"¿Listo para activar\nla IA en España?"}
      finalCtaSubtitle="Cumplimiento GDPR · Soporte CET · Empresa registrada · Solicita acceso anticipado al programa europeo"
    />
  );
}
