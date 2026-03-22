"use client";

import LandingTemplate from "@/app/components/LandingTemplate";

export default function LandingSpotify() {
  return (
    <LandingTemplate
      accentColor="#1DB954"
      secondaryColor="#1ED760"
      badge="Especialistas en Spotify Growth · +50M streams entregados"
      headlineTop="Monetiza tu"
      headlineBottom="música en Spotify"
      subheadline="Más streams, más oyentes mensuales, más playlists. La plataforma que usan artistas independientes en toda Latam para vivir de su música."
      ctaText="Empezar a crecer en Spotify — Gratis"
      ctaSubtext="30 consultas gratis · Sin tarjeta · Resultados en 24h"
      chatPreview={{
        user: "Acabo de subir mi EP y quiero llegar a 10K oyentes mensuales en Spotify, ¿cómo lo hago?",
        ai: "Para llegar a 10K oyentes mensuales te recomiendo una estrategia en 3 fases: **Fase 1** — Streams orgánicos en tus mejores tracks (5K-10K por canción). **Fase 2** — Inclusión en playlists editoriales y algorítmicas. **Fase 3** — Saves y follows para que Spotify te recomiende más. Con $50 puedes arrancar la Fase 1 esta semana. ¿Le entramos?",
      }}
      stats={[
        { value: "50M+", label: "Streams entregados" },
        { value: "2,000+", label: "Artistas activos" },
        { value: "500+", label: "Playlists disponibles" },
        { value: "98%", label: "Tasa de retención" },
      ]}
      featuresTitle="Todo para crecer en Spotify"
      featuresSubtitle="Streams, playlists, saves, followers — todo lo que necesitas para monetizar tu música."
      features={[
        { emoji: "🎵", title: "Streams de calidad", desc: "Streams con retención alta que cuentan para royalties. Proveedores premium verificados. Tu música genera ingresos reales.", color: "#1DB954" },
        { emoji: "📋", title: "Playlisting profesional", desc: "Acceso a playlists orgánicas y editoriales. Inclusión en playlists con miles de seguidores que impulsan tu alcance.", color: "#8B5CF6" },
        { emoji: "💰", title: "Monetización real", desc: "Streams que cuentan para royalties en Spotify. Cada reproducción es dinero. Recupera tu inversión y más.", color: "#F59E0B" },
        { emoji: "🤖", title: "IA especializada en música", desc: "El agente Scaling Latam conoce las mejores estrategias para Spotify. Te arma un plan personalizado según tu género y presupuesto.", color: "#007ABF" },
        { emoji: "📊", title: "Analytics en tiempo real", desc: "Ve cómo crecen tus streams, oyentes mensuales y saves. Dashboard completo con métricas que importan.", color: "#EF4444" },
        { emoji: "🔄", title: "Multi-plataforma", desc: "No solo Spotify — también YouTube Music, Apple Music, SoundCloud, Deezer y más. Crece en todas las plataformas.", color: "#0891b2" },
      ]}
      useCasesTitle="¿Cómo usan Scaling Latam los artistas?"
      useCases={[
        { icon: "🎤", title: "Artistas independientes", desc: "Sube tu música y empieza a generar streams reales. Sin discográfica, sin intermediarios. Tú controlas tu crecimiento." },
        { icon: "🎹", title: "Productores y beatmakers", desc: "Promociona tus beats y producciones. Más plays = más clientes que te buscan para colaborar." },
        { icon: "📀", title: "Sellos discográficos pequeños", desc: "Maneja el crecimiento de todos tus artistas desde un solo panel. Precios mayoristas para múltiples releases." },
        { icon: "🎧", title: "DJs y curadores de playlists", desc: "Crece tus playlists para atraer artistas que quieren ser incluidos. Monetiza tu curación musical." },
        { icon: "🌎", title: "Música latina en general", desc: "Reggaetón, trap, cumbia, dembow, salsa, bachata — servicios optimizados para todos los géneros latinos." },
      ]}
      testimonials={[
        { name: "Sebastián T.", role: "Artista trap · Colombia", text: "En 2 meses pasé de 500 a 15K oyentes mensuales. Ya estoy generando royalties reales. La IA me armó toda la estrategia.", country: "🇨🇴" },
        { name: "Camila F.", role: "Cantante indie · México", text: "Mi single entró en 3 playlists algorítmicas gracias al impulso inicial. Ahora Spotify me recomienda sola. Increíble.", country: "🇲🇽" },
        { name: "Los Primates", role: "Banda de cumbia · Perú", text: "Nuestro álbum llegó a 200K streams en el primer mes. El ROI fue brutal. Ahora toda la banda vive de la música.", country: "🇵🇪" },
      ]}
      finalCtaTitle={"¿Listo para vivir\nde tu música?"}
      finalCtaSubtitle="Más de 2,000 artistas ya monetizan con Scaling Latam · Empieza gratis hoy"
    />
  );
}
