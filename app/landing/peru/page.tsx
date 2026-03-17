"use client";

import LandingTemplate from "@/app/components/LandingTemplate";

export default function LandingPeru() {
  return (
    <LandingTemplate
      countryFlag="🇵🇪"
      accentColor="#D91023"
      secondaryColor="#FF6B7A"
      badge="Hecho en Perú · Plataforma #1 en Social Media Marketing"
      headlineTop="Crece en redes"
      headlineBottom="desde Perú"
      subheadline="La plataforma de Social Media Marketing creada por peruanos, para toda Latinoamérica. Crece en Instagram, TikTok, YouTube y Spotify con IA."
      ctaText="Empezar gratis — Es gratuito"
      ctaSubtext="30 mensajes gratis · Sin tarjeta · Soporte local"
      chatPreview={{
        user: "Tengo un negocio en Miraflores y quiero más seguidores en Instagram, ¿qué me recomiendas?",
        ai: "Para tu negocio en Miraflores te recomiendo: **seguidores peruanos reales** con engagement alto, **likes automáticos** en cada post para impulsar el algoritmo, y **comentarios en español** para generar confianza. Desde el panel podés pedir todo junto. Precios desde **$0.45 por 1K seguidores**. ¿Empezamos pe?",
      }}
      stats={[
        { value: "3,800+", label: "Usuarios en Perú" },
        { value: "20M+", label: "Seguidores entregados" },
        { value: "Lima", label: "Oficina principal" },
        { value: "5,000+", label: "Servicios disponibles" },
      ]}
      featuresTitle="Hecho en Perú, para toda Latam"
      featuresSubtitle="Nuestra oficina está en Lima. Soporte local, precios accesibles, resultados garantizados."
      features={[
        { emoji: "📱", title: "Redes sociales completas", desc: "Instagram, TikTok, YouTube, Facebook, Twitter y más. Seguidores, likes, views y engagement para todas las plataformas.", color: "#E1306C" },
        { emoji: "🇵🇪", title: "Soporte peruano", desc: "Nuestro equipo está en Lima. Atención por WhatsApp, soporte en español y conocemos el mercado local a la perfección.", color: "#D91023" },
        { emoji: "🤖", title: "Agente IA inteligente", desc: "TRUST MIND AI te asesora sobre estrategias, configuración de bots, proxies y optimización. Respuestas inmediatas.", color: "#007ABF" },
        { emoji: "💳", title: "Múltiples formas de pago", desc: "Crypto, tarjeta de crédito/débito, transferencia. Precios en USD accesibles para el mercado peruano.", color: "#F59E0B" },
        { emoji: "📊", title: "Dashboard profesional", desc: "+5,000 servicios en un solo panel. Monitorea pedidos, historial completo y estadísticas en tiempo real.", color: "#8B5CF6" },
        { emoji: "🏢", title: "Empresa formal", desc: "OLIVEROS MKT EIRL — RUC: 20605576550. Empresa registrada en Perú. Factura y todo en regla.", color: "#059669" },
      ]}
      useCasesTitle="¿Para quién es TRUST MIND en Perú?"
      useCases={[
        { icon: "🏪", title: "Negocios locales", desc: "Restaurantes en Miraflores, tiendas en Gamarra, servicios en todo Lima — crece tu presencia digital con seguidores peruanos reales." },
        { icon: "🎵", title: "Artistas y músicos", desc: "Cumbia, salsa, reggaetón peruano — promociona tu música con streams y views. Llega a más oyentes sin gastar una millonada." },
        { icon: "📸", title: "Influencers peruanos", desc: "Mejora tus métricas para conseguir mejores deals con marcas. Engagement automatizado que te posiciona mejor." },
        { icon: "🏢", title: "Agencias y resellers", desc: "Panel de reventa con marca blanca. Precios mayoristas para ofrecer servicios SMM a tus clientes. Soporte directo en Lima." },
      ]}
      testimonials={[
        { name: "Andrea C.", role: "Restaurante · Miraflores", text: "Mi Instagram pasó de 3K a 20K seguidores. Ahora tenemos reservas todos los días. El soporte por WhatsApp es increíble.", country: "🇵🇪" },
        { name: "Diego V.", role: "Músico · Barranco", text: "Puse mis canciones con TRUST MIND y en un mes ya tenía 100K streams en Spotify. La IA me recomendó la mejor estrategia.", country: "🇵🇪" },
        { name: "Lucía R.", role: "Agencia de marketing · San Isidro", text: "Llevo 6 meses revendiendo servicios y la ganancia es excelente. El panel es súper fácil y el soporte responde al toque.", country: "🇵🇪" },
      ]}
      finalCtaTitle={"¿Listo para crecer\nen Perú?"}
      finalCtaSubtitle="Empresa peruana con soporte local · Únete a miles de usuarios · Empieza gratis"
    />
  );
}
