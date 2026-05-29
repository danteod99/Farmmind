"use client";

import LandingTemplate from "@/app/components/LandingTemplate";

export default function LandingMiami() {
  return (
    <LandingTemplate
      countryFlag="🇺🇸"
      accentColor="#0891b2"
      secondaryColor="#22d3ee"
      badge="Made for Latinos in USA · Pago en USD"
      headlineTop="La IA que hace crecer"
      headlineBottom="tu marca en USA"
      subheadline="Eres latino en USA y necesitas autoridad real en redes. Te conectamos con una IA que comanda 1,000 granjas de bots reales. Operación legal vía Scaling Tech Farm LLC (Wyoming). Cobras y pagas en dólares."
      ctaText="Empezar gratis ahora"
      ctaSubtext="Demo gratis · Sin tarjeta · Pago en USD · LLC USA"
      chatPreview={{
        user: "Soy dominicano viviendo en Miami. Tengo un food truck con 1,200 seguidores en IG. ¿Me puedes ayudar a llenar el local?",
        ai: "Por supuesto. **Activando 4 granjas en Miami-Dade y 2 en Hialeah** especializadas en nicho gastronómico latino. La IA va a seguir tu cuenta, dar likes, comentar en español y empujar tus videos al For You de TikTok. **Goal: 8,000 seguidores locales en 30 días + reservas reales**. ¿Arrancamos?",
      }}
      stats={[
        { value: "$50K-80K", label: "Ingreso promedio latino USA" },
        { value: "60M+", label: "Latinos en USA con tu español" },
        { value: "1,000+", label: "Granjas comandadas por IA" },
        { value: "LLC USA", label: "Empresa formal Wyoming" },
      ]}
      featuresTitle="Hecho para latinos profesionales en USA"
      featuresSubtitle="Empresa formal en Wyoming · Pagos en USD · Soporte en español · IA que opera 24/7"
      features={[
        { emoji: "🤖", title: "IA que comanda granjas reales", desc: "Detrás de TrustMind hay 1,000 granjas de bots físicas. La IA decide cuál usar para tu nicho. Cero fake followers, todo dispositivos reales.", color: "#0891b2" },
        { emoji: "🇺🇸", title: "Operación legal en USA", desc: "Scaling Tech Farm LLC en Wyoming, EIN aprobado por el IRS, cuenta Mercury Bank, Stripe activado. Empresa formal, no proyecto improvisado.", color: "#1d4ed8" },
        { emoji: "💵", title: "Pagas en dólares, recibes valor", desc: "Stripe USA, tarjetas internacionales, transferencias ACH. Facturas formales que te sirven para impuestos y deducciones.", color: "#22c55e" },
        { emoji: "🏙️", title: "Audiencia geo-segmentada", desc: "La IA activa granjas en tu ciudad: Miami, Houston, NY, LA, Chicago, Orlando. Tu cuenta crece con audiencia local que sí puede ir a tu negocio.", color: "#f59e0b" },
        { emoji: "🎬", title: "Música y creators latinos", desc: "Reggaeton, urban, salsa, regional mexicano. La IA activa granjas que escuchan tu música. Stripe USA paga regalías en dólares.", color: "#ec4899" },
        { emoji: "📈", title: "Ticket premium = ROI premium", desc: "El latino en USA paga 3-5x más que el de LATAM. La IA está optimizada para nichos premium: bienes raíces, salud, finance, food.", color: "#8b5cf6" },
      ]}
      useCasesTitle="¿Para quién es Scaling LATAM en USA?"
      useCases={[
        { icon: "🍽️", title: "Negocios latinos en USA", desc: "Restaurantes, food trucks, salones, talleres, contratistas. La IA llena tu Instagram con audiencia local que paga en dólares y deja review en Google." },
        { icon: "🎤", title: "Artistas latinos en USA", desc: "Bachateros, reggaetoneros, salseros, urban latino. Streams en Spotify USA, views en YouTube USA. Regalías cobradas en dólares directo a tu cuenta." },
        { icon: "💼", title: "Coaches y consultores latinos", desc: "Tienes conocimiento que vale, pero nadie te conoce. La IA te posiciona como referente. Cobras consultorías en dólares premium." },
        { icon: "🏘️", title: "Realtors, brokers, agentes", desc: "Mercado inmobiliario latino USA cierra con confianza social. La IA construye tu autoridad para que el cliente te elija sobre la competencia." },
      ]}
      testimonials={[
        { name: "Ana V.", role: "Realtor · Miami", text: "Cerré 3 propiedades en mes 1 después de activar la IA. Mi Instagram pasó de 800 a 14K seguidores latinos en Miami. Mi comisión: $42,000. ROI brutal.", country: "🇺🇸" },
        { name: "Pedro G.", role: "Food truck · Houston", text: "Mi food truck siempre vacío entre semana. Después de TrustMind, fila de 30 personas hasta los martes. El local empezó a llenarse solo.", country: "🇺🇸" },
        { name: "Luz F.", role: "Coach financiera · NYC", text: "Cobraba $200/sesión y nadie me conocía. Hoy cobro $1,500/sesión, agenda llena 3 meses. La IA me dio la autoridad que necesitaba.", country: "🇺🇸" },
      ]}
      finalCtaTitle={"¿Listo para crecer\nen el mercado USA?"}
      finalCtaSubtitle="Empresa formal en Wyoming · Pago en USD · 60M latinos esperándote · Tu primera consulta es gratis"
    />
  );
}
