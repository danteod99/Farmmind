"use client";

import LandingTemplate from "@/app/components/LandingTemplate";

export default function LandingTikTok() {
  return (
    <LandingTemplate
      accentColor="#FF0050"
      secondaryColor="#FF7AA8"
      badge="Especialistas en TikTok Growth · +100M views entregados"
      headlineTop="Explota en"
      headlineBottom="TikTok"
      subheadline="Views, seguidores, likes y shares que activan el algoritmo. La plataforma que usan creadores en toda Latam para viralizar su contenido."
      ctaText="Empezar a crecer en TikTok — Gratis"
      ctaSubtext="30 consultas gratis · Sin tarjeta · Resultados inmediatos"
      chatPreview={{
        user: "Mis TikToks no pasan de 500 views, ¿cómo hago para llegar al FYP?",
        ai: "Para llegar al FYP necesitas **señales de engagement rápido**. Te recomiendo: **views con retención alta** (mínimo 70%) en las primeras 2 horas, **likes rápidos** para activar el algoritmo, y **shares** que son la métrica que más pesa. Con **$5 puedes impulsar 10 videos** y ver cuál conecta. El algoritmo hace el resto.",
      }}
      stats={[
        { value: "100M+", label: "Views entregados" },
        { value: "5,000+", label: "Creadores activos" },
        { value: "70%+", label: "Retención promedio" },
        { value: "$0.10", label: "Precio desde / 1K views" },
      ]}
      featuresTitle="Todo para dominar TikTok"
      featuresSubtitle="Views, seguidores, likes, shares y comentarios — todo lo que el algoritmo necesita para empujarte."
      features={[
        { emoji: "👁️", title: "Views con retención alta", desc: "Views reales con 70%+ de retención. Esto es lo que le dice al algoritmo que tu contenido vale la pena. Resultados en minutos.", color: "#FF0050" },
        { emoji: "❤️", title: "Likes y engagement", desc: "Likes rápidos que activan el efecto bola de nieve. Mientras más rápido llegas al umbral, más te empuja el FYP.", color: "#EF4444" },
        { emoji: "🔄", title: "Shares y saves", desc: "Las dos métricas que TikTok más valora. Shares = viralidad. Saves = contenido de valor. Ambos disparan tu alcance.", color: "#8B5CF6" },
        { emoji: "🤖", title: "IA especializada en TikTok", desc: "El agente TRUST MIND conoce el algoritmo de TikTok al detalle. Te dice cuándo publicar, qué impulsar y cómo escalar.", color: "#007ABF" },
        { emoji: "👥", title: "Seguidores reales", desc: "Seguidores que se quedan y aumentan tu credibilidad. Perfiles reales con fotos y actividad. Cero bots obvios.", color: "#059669" },
        { emoji: "💬", title: "Comentarios personalizados", desc: "Comentarios relevantes en español que generan conversación y empujan el video en el algoritmo. Tú eliges los textos.", color: "#F59E0B" },
      ]}
      useCasesTitle="¿Cómo usan TRUST MIND para TikTok?"
      useCases={[
        { icon: "🎭", title: "Creadores de contenido", desc: "Impulsa tus mejores videos para que el algoritmo los note. Un push inicial inteligente puede convertir un video normal en viral." },
        { icon: "🏪", title: "Negocios y marcas", desc: "TikTok es la red de mayor conversión para comercios. Más views = más clientes. Impulsa tus videos de productos." },
        { icon: "🎵", title: "Artistas y músicos", desc: "Un TikTok viral puede cambiar tu carrera. Impulsa videos con tu música para que el sonido se vuelva tendencia." },
        { icon: "💡", title: "Educadores y coaches", desc: "Posiciónate como experto en tu nicho. Más alcance en tus videos educativos = más alumnos y clientes." },
        { icon: "📈", title: "Agencias de marketing", desc: "Ofrece servicios de TikTok growth a tus clientes. Panel de reseller con precios mayoristas y marca blanca." },
      ]}
      testimonials={[
        { name: "Daniela M.", role: "Creadora de contenido · México", text: "Un video que tenía 200 views lo impulsé y llegó a 500K. Gané 8K seguidores en una semana. El ROI es brutal.", country: "🇲🇽" },
        { name: "Roberto S.", role: "Tienda de ropa · Colombia", text: "Mis TikToks de productos ahora llegan al FYP. Las ventas por TikTok Shop subieron 5x. Vale cada centavo.", country: "🇨🇴" },
        { name: "Fer G.", role: "Músico · Argentina", text: "Mi canción se volvió tendencia en TikTok gracias al push inicial. De 0 a 2M de plays en un mes. Una locura.", country: "🇦🇷" },
      ]}
      finalCtaTitle={"¿Listo para ser\nviral en TikTok?"}
      finalCtaSubtitle="Más de 5,000 creadores ya crecen con TRUST MIND · Empieza gratis hoy"
    />
  );
}
