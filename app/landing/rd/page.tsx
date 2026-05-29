"use client";

import LandingTemplate from "@/app/components/LandingTemplate";

export default function LandingRD() {
  return (
    <LandingTemplate
      countryFlag="🇩🇴"
      accentColor="#007ABF"
      secondaryColor="#56B4E0"
      badge="Hub Caribe · Mercado #1 de Scaling LATAM"
      headlineTop="Tu cuenta crece"
      headlineBottom="desde RD"
      subheadline="Somos la primera IA que comanda 1,000 granjas de bots reales para hacer crecer tu cuenta. RD es nuestro mercado más fuerte — operamos directo en el Caribe, con soporte y entrega local."
      ctaText="Empezar gratis ahora"
      ctaSubtext="Demo gratis · Sin tarjeta · Soporte local en español"
      chatPreview={{
        user: "Tengo una página de dembow en Instagram con 800 seguidores. ¿Me ayudas a crecerla con la IA?",
        ai: "Claro, mi pana. **Activando 3 granjas en Santo Domingo y 1 en Puerto Plata** especializadas en nicho urbano dominicano. La IA va a empujar tus reels, dar likes y comentarios en español caribeño. **Resultados visibles en 24-48 horas**. ¿Le damos?",
      }}
      stats={[
        { value: "19.2%", label: "De nuestra audiencia es RD" },
        { value: "3,597", label: "Dominicanos activos este mes" },
        { value: "1,000+", label: "Granjas comandadas por IA" },
        { value: "67h", label: "Watch time semanal en RD" },
      ]}
      featuresTitle="Operamos en el Caribe, no desde afuera"
      featuresSubtitle="Granjas reales en el Caribe + IA que las comanda. Hecho para artistas, negocios e influencers dominicanos."
      features={[
        { emoji: "🤖", title: "IA que comanda granjas reales", desc: "No compras seguidores fake. La IA activa granjas de bots físicas en RD, Caribe y LATAM. Engagement real, no números muertos.", color: "#007ABF" },
        { emoji: "🎵", title: "Dembow, bachata, urbano latino", desc: "Promociona tu música en Spotify, YouTube Music y TikTok. La IA activa granjas dominicanas que escuchan en loop tu canción.", color: "#1DB954" },
        { emoji: "🏪", title: "Negocios locales SD y Santiago", desc: "Restaurantes, salones, tiendas, colmados. Crece tu Instagram con audiencia dominicana real que se convierte en cliente que paga.", color: "#E1306C" },
        { emoji: "🛡️", title: "La IA rota granjas anti-baneo", desc: "Tu cuenta nunca usa la misma granja dos veces seguidas. La IA distribuye el trabajo entre 1,000 granjas. Cero baneos.", color: "#10B981" },
        { emoji: "💵", title: "Pago en USD desde RD", desc: "Stripe, crypto, transferencia. Operación legal a través de Scaling Tech Farm LLC en USA. Facturas formales.", color: "#F59E0B" },
        { emoji: "🇩🇴", title: "Soporte local 24/7", desc: "Equipo dominicano atiende por WhatsApp en horario RD. Entendemos el mercado, hablamos como local.", color: "#8B5CF6" },
      ]}
      useCasesTitle="¿Para quién es Scaling LATAM en RD?"
      useCases={[
        { icon: "🎤", title: "Artistas urbanos dominicanos", desc: "Dembowseros, raperos, traperos, bachateros. La IA activa granjas que escuchan tu música 24/7. Streams reales, regalías reales en Spotify." },
        { icon: "💈", title: "Negocios locales en Santo Domingo, Santiago y Punta Cana", desc: "Barbershops, salones, restaurantes, colmados. Llena tu Instagram con dominicanos reales que viven cerca de ti." },
        { icon: "📸", title: "Influencers y creadores RD", desc: "Sube tu autoridad para cobrar mejor a marcas. La IA te da seguidores, likes y comentarios en español dominicano." },
        { icon: "🏢", title: "Resellers y agencias dominicanas", desc: "Construye tu propio negocio sobre nuestra infraestructura. Panel reseller con tu marca, margen 60-70%, sin armar nada físico." },
      ]}
      testimonials={[
        { name: "Carlos M.", role: "Artista urbano · Santo Domingo", text: "Subí mi último tema y la IA activó granjas que lo escucharon en loop. 47K streams en 2 semanas. Cobré $312 en regalías. Esto es real.", country: "🇩🇴" },
        { name: "María P.", role: "Dueña de salón · Santiago", text: "Mi Instagram pasó de 2,400 a 18,000 seguidores reales en 30 días. Ahora tengo lista de espera para citas. Vale cada centavo.", country: "🇩🇴" },
        { name: "Junior R.", role: "Influencer · Punta Cana", text: "Antes me pagaban $50 por post. Ahora $400. La IA me dio la autoridad que necesitaba para subir el ticket. Brutal.", country: "🇩🇴" },
      ]}
      finalCtaTitle={"¿Listo para crecer\ncomo dominicano?"}
      finalCtaSubtitle="Empresa formal · Soporte 100% en español caribeño · Únete a 3,500+ dominicanos que ya usan la IA"
    />
  );
}
