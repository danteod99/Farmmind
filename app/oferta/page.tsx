"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import {
  Play, Check, X as XIcon, Crown, Shield, Zap, Clock,
  TrendingUp, Users, Award, ChevronDown, Sparkles
} from "lucide-react";

const COUNTDOWN_HOURS = 24;

export default function OfertaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_HOURS * 3600);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);

  // Countdown timer
  useEffect(() => {
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const handleCheckout = async () => {
    setLoading(true);
    try {
      // Verificar auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Sin login, mandar a Google OAuth con redirect post-login a esta misma página
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${window.location.origin}/oferta?signin=1` },
        });
        if (error) alert("Error iniciando sesión: " + error.message);
        return;
      }
      // Con login, abrir Stripe Checkout anual
      const priceId = process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID;
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert("Error conectando con Stripe. Intenta más tarde.");
    } catch {
      alert("Error. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const scrollToCta = () => ctaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

  // Si vuelve del signin, dispara el checkout
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("signin") === "1") {
      window.history.replaceState({}, "", "/oferta");
      handleCheckout();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #07070e; color: #f0efff; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; }
        a { text-decoration: none; color: inherit; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-cta {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0, 180, 216, 0.5); }
          50% { box-shadow: 0 0 0 18px rgba(0, 180, 216, 0); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px currentColor; }
          50% { opacity: 0.5; box-shadow: 0 0 14px currentColor; }
        }
        .vsl-section { animation: fade-up 0.7s ease-out backwards; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#07070e" }}>

        {/* ── URGENCY BAR (sticky top) ── */}
        <div style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "linear-gradient(90deg, #b91c1c, #dc2626, #b91c1c)",
          padding: "10px 16px",
          textAlign: "center",
          fontSize: "13px", fontWeight: 700,
          color: "white",
          letterSpacing: "0.3px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
        }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <Clock size={14} /> OFERTA LIMITADA TERMINA EN <strong style={{ fontFamily: "monospace", fontSize: "14px", padding: "2px 6px", borderRadius: "4px", background: "rgba(0,0,0,0.25)" }}>{formatTime(secondsLeft)}</strong>
            <span style={{ marginLeft: "12px", opacity: 0.85 }}>· Ahorra 60% · Solo HOY</span>
          </span>
        </div>

        {/* ── HERO + VIDEO ── */}
        <section className="vsl-section" style={{
          position: "relative", padding: "48px 20px 32px",
          background: "radial-gradient(ellipse 80% 50% at 50% 0%, #001830 0%, transparent 60%)",
          textAlign: "center",
        }}>
          <div style={{ maxWidth: "760px", margin: "0 auto" }}>

            {/* Badge */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "5px 14px", borderRadius: "100px", background: "rgba(220, 38, 38, 0.1)", border: "1px solid rgba(220, 38, 38, 0.3)", marginBottom: "24px", fontSize: "12px", color: "#fca5a5", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ef4444", animation: "glow-pulse 1.5s ease-in-out infinite", color: "#ef4444" }} />
              Atención: Solo para los próximos 50 usuarios
            </div>

            {/* HEADLINE */}
            <h1 style={{
              fontSize: "clamp(32px, 6vw, 56px)",
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: "-0.035em",
              marginBottom: "20px",
            }}>
              <span style={{ color: "white" }}>Cómo conseguí </span>
              <span style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>+50,000 seguidores reales</span>
              <span style={{ color: "white" }}> en Instagram, TikTok y Facebook con un agente IA — </span>
              <span style={{ color: "#7dd3fc" }}>en piloto automático</span>
            </h1>

            <p style={{
              fontSize: "clamp(16px, 2vw, 19px)",
              color: "#94a3b8",
              maxWidth: "620px",
              margin: "0 auto 32px",
              lineHeight: 1.6,
            }}>
              Mira este video corto y descubre el sistema que más de <strong style={{ color: "white" }}>4,200 emprendedores en Latam</strong> usan para escalar redes sociales sin contratar agencia.
            </p>

            {/* VIDEO PLAYER */}
            <div style={{
              position: "relative",
              maxWidth: "720px",
              margin: "0 auto 32px",
              borderRadius: "20px",
              overflow: "hidden",
              boxShadow: "0 24px 80px rgba(0, 122, 191, 0.25), 0 0 0 1px rgba(255,255,255,0.08)",
              aspectRatio: "16/9",
              background: "linear-gradient(135deg, #001830, #000810)",
              cursor: videoPlaying ? "default" : "pointer",
            }}
              onClick={() => !videoPlaying && setVideoPlaying(true)}>

              {/* Placeholder con grid pattern */}
              <div style={{
                position: "absolute", inset: 0,
                backgroundImage: "linear-gradient(rgba(0,122,191,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,122,191,0.06) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }} />
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.4) 70%)" }} />

              {!videoPlaying ? (
                <>
                  {/* Play button */}
                  <div style={{
                    position: "absolute", top: "50%", left: "50%",
                    transform: "translate(-50%, -50%)",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "16px",
                  }}>
                    <div style={{
                      width: "92px", height: "92px", borderRadius: "50%",
                      background: "linear-gradient(135deg, #007ABF, #00B4D8)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 8px 32px rgba(0, 180, 216, 0.5)",
                      animation: "pulse-cta 2s ease-out infinite",
                    }}>
                      <Play size={42} color="white" fill="white" style={{ marginLeft: "6px" }} />
                    </div>
                    <p style={{ fontSize: "14px", color: "#94a3b8", fontWeight: 600 }}>
                      ▶ Reproducir video · 8 min
                    </p>
                  </div>

                  {/* Bottom overlay */}
                  <div style={{
                    position: "absolute", bottom: 0, left: 0, right: 0,
                    background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
                    padding: "16px 20px",
                    textAlign: "left",
                  }}>
                    <p style={{ fontSize: "13px", color: "#e2e8f0", fontWeight: 600 }}>📺 Caso de estudio: De 0 a 50K seguidores en 6 meses</p>
                  </div>
                </>
              ) : (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: "14px" }}>
                  Video VSL pronto disponible · Mientras tanto, mira la oferta abajo ↓
                </div>
              )}
            </div>

            {/* CTA principal */}
            <button onClick={scrollToCta}
              style={{
                padding: "18px 36px",
                borderRadius: "14px",
                border: "none",
                background: "linear-gradient(135deg, #007ABF, #00B4D8)",
                color: "white",
                fontSize: "17px",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 8px 32px rgba(0, 180, 216, 0.4)",
                animation: "pulse-cta 2.5s ease-out infinite",
                display: "inline-flex", alignItems: "center", gap: "10px",
                letterSpacing: "0.2px",
              }}>
              <Sparkles size={18} /> QUIERO ESTA OFERTA AHORA →
            </button>
            <p style={{ fontSize: "12px", color: "#64748b", marginTop: "12px" }}>
              ⚡ Acceso inmediato · Sin permanencia · 30 días de garantía
            </p>
          </div>
        </section>

        {/* ── PROBLEMA / DOLOR ── */}
        <section className="vsl-section" style={{ padding: "80px 20px", background: "#08080f" }}>
          <div style={{ maxWidth: "780px", margin: "0 auto" }}>
            <p style={{ textAlign: "center", fontSize: "12px", fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "16px" }}>El problema</p>
            <h2 style={{ textAlign: "center", fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 800, color: "white", marginBottom: "32px", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
              ¿Cansado de invertir <span style={{ color: "#ef4444" }}>horas todos los días</span> sin que tus redes crezcan?
            </h2>
            <div style={{ display: "grid", gap: "12px", maxWidth: "600px", margin: "0 auto" }}>
              {[
                "Publicas contenido y nadie lo ve",
                "Sigues a gente esperando que te sigan de vuelta… y nada",
                "Los servicios SMM baratos te dan seguidores fake que después caen",
                "Las agencias cobran $500-$2000/mes y los resultados son lentos",
                "No tienes tiempo de estar todo el día metido en cada cuenta",
              ].map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px 18px", background: "rgba(239, 68, 68, 0.05)", borderLeft: "3px solid #ef4444", borderRadius: "8px" }}>
                  <XIcon size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontSize: "15px", color: "#e2e8f0", lineHeight: 1.5 }}>{p}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SOLUCIÓN ── */}
        <section className="vsl-section" style={{ padding: "80px 20px", background: "linear-gradient(180deg, #08080f, #07070e)" }}>
          <div style={{ maxWidth: "900px", margin: "0 auto" }}>
            <p style={{ textAlign: "center", fontSize: "12px", fontWeight: 700, color: "#34d399", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "16px" }}>La solución</p>
            <h2 style={{ textAlign: "center", fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 800, color: "white", marginBottom: "16px", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
              Presentamos <span style={{ background: "linear-gradient(135deg, #00B4D8, #007ABF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>TRUST MIND Pro</span>
            </h2>
            <p style={{ textAlign: "center", fontSize: "17px", color: "#94a3b8", maxWidth: "620px", margin: "0 auto 48px", lineHeight: 1.6 }}>
              El primer agente IA que automatiza el crecimiento de tus redes sociales — sin que muevas un dedo.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
              {[
                { icon: <Users size={22} />, title: "Seguidores reales en automático", desc: "Aumenta tu audiencia en Instagram, TikTok y Facebook con engagement orgánico real. Sin bots fake." },
                { icon: <Zap size={22} />, title: "+5,000 servicios SMM", desc: "Likes, views, comments, saves en todas las plataformas — todo desde un solo panel con saldo." },
                { icon: <Shield size={22} />, title: "Proxies premium incluidos", desc: "Anti-detección configurada, proxies residenciales y móviles. Cero baneos en tus cuentas." },
                { icon: <Sparkles size={22} />, title: "Agente IA 24/7", desc: "Le dices qué quieres y el agente lo ejecuta. Sin aprender herramientas técnicas." },
                { icon: <TrendingUp size={22} />, title: "Growth Dashboard", desc: "Métricas en tiempo real de tus campañas. Sabes exactamente cuánto creces cada día." },
                { icon: <Crown size={22} />, title: "Soporte directo", desc: "Acceso prioritario a nuestro equipo. Respuesta en menos de 1 hora en horario laboral." },
              ].map((f) => (
                <div key={f.title} style={{ padding: "24px", borderRadius: "16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(0, 180, 216, 0.12)", border: "1px solid rgba(0, 180, 216, 0.25)", display: "flex", alignItems: "center", justifyContent: "center", color: "#7dd3fc", marginBottom: "14px" }}>
                    {f.icon}
                  </div>
                  <h3 style={{ fontSize: "15px", fontWeight: 700, color: "white", marginBottom: "6px" }}>{f.title}</h3>
                  <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section className="vsl-section" style={{ padding: "80px 20px", background: "#08080f" }}>
          <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
            <p style={{ textAlign: "center", fontSize: "12px", fontWeight: 700, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "16px" }}>Resultados reales</p>
            <h2 style={{ textAlign: "center", fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 800, color: "white", marginBottom: "48px", letterSpacing: "-0.02em" }}>
              Mira lo que dicen los que ya están dentro
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
              {[
                { name: "Carlos M.", city: "Lima, Perú", result: "+12,400 seguidores en 3 meses", text: "Pasé de 3K a 15K en mi IG de gastronomía. El agente me sugirió hashtags y campañas que jamás se me hubieran ocurrido. Insano." },
                { name: "Valentina R.", city: "Bogotá, CO", result: "$8,200 vendidos con TikTok", text: "Yo solo subo videos. El sistema se encarga del resto. Mis vídeos pasan de 200 views a 50K en horas." },
                { name: "Diego A.", city: "Buenos Aires, AR", result: "+85K seguidores totales", text: "Manejo 4 cuentas para clientes. Antes me tomaba 6 horas al día. Ahora dejo TRUST corriendo y reviso resultados al final del día." },
              ].map((t, i) => (
                <div key={i} style={{
                  padding: "28px",
                  borderRadius: "20px",
                  background: "linear-gradient(160deg, #0d0d18, #07070e)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <div style={{ display: "flex", gap: "2px", marginBottom: "14px" }}>
                    {[1,2,3,4,5].map(s => <span key={s} style={{ color: "#fbbf24", fontSize: "16px" }}>★</span>)}
                  </div>
                  <p style={{ fontSize: "14px", color: "#e2e8f0", fontStyle: "italic", lineHeight: 1.6, marginBottom: "20px" }}>
                    "{t.text}"
                  </p>
                  <div style={{ paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: "white" }}>{t.name}</p>
                    <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "8px" }}>{t.city}</p>
                    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "20px", background: "rgba(52, 211, 153, 0.1)", border: "1px solid rgba(52, 211, 153, 0.25)", color: "#34d399", fontSize: "11px", fontWeight: 700 }}>
                      ✓ {t.result}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── OFERTA / PRICING (CTA principal) ── */}
        <section ref={ctaRef} className="vsl-section" style={{ padding: "80px 20px", background: "linear-gradient(180deg, #08080f, #001830 50%, #08080f)" }}>
          <div style={{ maxWidth: "640px", margin: "0 auto" }}>
            <p style={{ textAlign: "center", fontSize: "12px", fontWeight: 700, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "16px" }}>La oferta</p>
            <h2 style={{ textAlign: "center", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 900, color: "white", marginBottom: "32px", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
              Hoy puedes acceder por <span style={{ color: "#fbbf24" }}>60% menos</span>
            </h2>

            <div style={{
              position: "relative",
              padding: "40px 32px",
              borderRadius: "24px",
              background: "linear-gradient(160deg, #001830 0%, #000810 100%)",
              border: "2px solid #00B4D8",
              boxShadow: "0 24px 80px rgba(0, 180, 216, 0.25)",
              overflow: "hidden",
            }}>
              {/* Glow */}
              <div style={{ position: "absolute", top: "-80px", right: "-80px", width: "300px", height: "300px", borderRadius: "50%", background: "radial-gradient(circle, rgba(0,180,216,0.25), transparent 70%)", filter: "blur(40px)", pointerEvents: "none" }} />

              <div style={{ position: "relative", zIndex: 1 }}>
                {/* Badge */}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
                  <span style={{ padding: "5px 14px", borderRadius: "100px", background: "linear-gradient(135deg, #fbbf24, #f59e0b)", color: "#1a1a00", fontSize: "11px", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" }}>
                    🔥 Oferta de lanzamiento
                  </span>
                </div>

                {/* Producto */}
                <p style={{ textAlign: "center", fontSize: "13px", fontWeight: 700, color: "#7dd3fc", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "8px" }}>TRUST MIND Pro · Plan Anual</p>

                {/* Precio */}
                <div style={{ textAlign: "center", marginBottom: "24px" }}>
                  <div style={{ display: "inline-flex", alignItems: "baseline", gap: "12px", marginBottom: "8px" }}>
                    <span style={{ fontSize: "20px", color: "#64748b", textDecoration: "line-through" }}>$50/mes</span>
                    <span style={{ padding: "2px 8px", borderRadius: "6px", background: "rgba(239, 68, 68, 0.15)", color: "#fca5a5", fontSize: "11px", fontWeight: 700 }}>-60%</span>
                  </div>
                  <div>
                    <span style={{ fontSize: "72px", fontWeight: 900, color: "white", letterSpacing: "-0.04em", lineHeight: 1 }}>$20</span>
                    <span style={{ fontSize: "20px", color: "#7dd3fc", marginLeft: "4px", fontWeight: 600 }}>/mes</span>
                  </div>
                  <p style={{ fontSize: "14px", color: "#94a3b8", marginTop: "8px" }}>
                    Pago único de <strong style={{ color: "white" }}>$240/año</strong> · Ahorras $360
                  </p>
                </div>

                {/* Lo que incluye */}
                <div style={{ padding: "20px", borderRadius: "14px", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: "24px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "#7dd3fc", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "14px" }}>✦ Esto incluye:</p>
                  <div style={{ display: "grid", gap: "10px" }}>
                    {[
                      "Mensajes ilimitados con el Agente IA",
                      "Crecimiento automático en IG, TikTok y FB",
                      "+5,000 servicios SMM con descuento",
                      "Proxies premium + anti-detección",
                      "Growth Dashboard con métricas en vivo",
                      "Historial completo de conversaciones",
                      "Acceso prioritario y nuevas funciones primero",
                      "Soporte directo con respuesta en <1 hora",
                    ].map((b) => (
                      <div key={b} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                        <Check size={16} color="#34d399" style={{ flexShrink: 0, marginTop: 2 }} />
                        <p style={{ fontSize: "13px", color: "#e2e8f0", lineHeight: 1.5 }}>{b}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Timer */}
                <div style={{ padding: "12px 16px", borderRadius: "12px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", marginBottom: "20px", textAlign: "center" }}>
                  <p style={{ fontSize: "12px", color: "#fca5a5", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>⏰ Oferta termina en:</p>
                  <p style={{ fontFamily: "monospace", fontSize: "22px", fontWeight: 800, color: "#fca5a5", letterSpacing: "2px" }}>{formatTime(secondsLeft)}</p>
                </div>

                {/* CTA */}
                <button onClick={handleCheckout} disabled={loading}
                  style={{
                    width: "100%",
                    padding: "18px",
                    borderRadius: "14px",
                    border: "none",
                    background: loading ? "#1a1a2e" : "linear-gradient(135deg, #fbbf24, #f59e0b)",
                    color: loading ? "#64748b" : "#1a1a00",
                    fontSize: "17px",
                    fontWeight: 900,
                    cursor: loading ? "not-allowed" : "pointer",
                    letterSpacing: "0.3px",
                    boxShadow: loading ? "none" : "0 8px 32px rgba(251, 191, 36, 0.4)",
                    animation: loading ? "none" : "pulse-cta 2.5s ease-out infinite",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                  }}>
                  {loading ? (
                    <><div style={{ width: "16px", height: "16px", borderRadius: "50%", border: "2px solid #64748b", borderTopColor: "transparent", animation: "spin 0.6s linear infinite" }} /> Procesando...</>
                  ) : (
                    <>🚀 ACTIVAR MI ACCESO AHORA</>
                  )}
                </button>

                {/* Trust signals */}
                <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "16px", flexWrap: "wrap" }}>
                  {["🔒 Pago seguro Stripe", "✓ 30 días de garantía", "⚡ Acceso inmediato"].map((t) => (
                    <span key={t} style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── GARANTÍA ── */}
        <section className="vsl-section" style={{ padding: "60px 20px", background: "#08080f" }}>
          <div style={{ maxWidth: "640px", margin: "0 auto", textAlign: "center" }}>
            <div style={{ display: "inline-flex", padding: "16px", borderRadius: "20px", background: "rgba(52, 211, 153, 0.08)", border: "1px solid rgba(52, 211, 153, 0.3)", marginBottom: "20px" }}>
              <Award size={36} color="#34d399" />
            </div>
            <h2 style={{ fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 800, color: "white", marginBottom: "16px", letterSpacing: "-0.02em" }}>
              Garantía de devolución total — 30 días
            </h2>
            <p style={{ fontSize: "15px", color: "#94a3b8", lineHeight: 1.7, maxWidth: "540px", margin: "0 auto" }}>
              Si en 30 días no estás 100% satisfecho con TRUST MIND Pro, te devolvemos el dinero. <strong style={{ color: "white" }}>Sin preguntas, sin trámites complicados.</strong> Confiamos tanto en el sistema que asumimos todo el riesgo.
            </p>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="vsl-section" style={{ padding: "80px 20px" }}>
          <div style={{ maxWidth: "720px", margin: "0 auto" }}>
            <h2 style={{ textAlign: "center", fontSize: "clamp(24px, 4vw, 34px)", fontWeight: 800, color: "white", marginBottom: "40px", letterSpacing: "-0.02em" }}>
              Preguntas frecuentes
            </h2>
            <div style={{ display: "grid", gap: "10px" }}>
              {[
                { q: "¿Realmente son seguidores reales?", a: "Sí. TRUST MIND Pro combina engagement orgánico real con servicios SMM de alta retención. No usamos bots fake que después caen — son cuentas con interacción humana real." },
                { q: "¿Puedo cancelar cuando quiera?", a: "Por supuesto. No hay permanencia. Si pagaste el anual y cancelas dentro de los primeros 30 días, te devolvemos el 100% del dinero." },
                { q: "¿Necesito conocimientos técnicos?", a: "Cero. El agente IA hace todo. Le dices en español qué quieres lograr (ej: 'quiero +500 seguidores en Instagram esta semana') y él ejecuta los servicios necesarios." },
                { q: "¿En qué plataformas funciona?", a: "Instagram, TikTok, Facebook, YouTube, Spotify, Twitter/X, Telegram, Twitch y +10 más. Más de 5,000 servicios distintos disponibles." },
                { q: "¿Mi cuenta puede ser baneada?", a: "No. Usamos proxies residenciales y anti-detección de nivel enterprise. Llevamos +50M de servicios entregados con menos del 0.1% de incidencias." },
                { q: "¿Qué pasa después del primer año?", a: "Se renueva automáticamente al mismo precio promocional ($240/año) mientras tu suscripción esté activa. Puedes cancelar cuando quieras desde tu cuenta." },
              ].map((f, i) => {
                const isOpen = openFaq === i;
                return (
                  <div key={i} style={{
                    borderRadius: "14px",
                    background: "rgba(255,255,255,0.02)",
                    border: `1px solid ${isOpen ? "rgba(0, 180, 216, 0.3)" : "rgba(255,255,255,0.06)"}`,
                    overflow: "hidden",
                  }}>
                    <button onClick={() => setOpenFaq(isOpen ? null : i)}
                      style={{
                        width: "100%",
                        padding: "18px 20px",
                        background: "transparent",
                        border: "none",
                        color: "white",
                        fontSize: "15px",
                        fontWeight: 700,
                        cursor: "pointer",
                        textAlign: "left",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "12px",
                      }}>
                      {f.q}
                      <ChevronDown size={18} color="#7dd3fc" style={{ flexShrink: 0, transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
                    </button>
                    {isOpen && (
                      <div style={{ padding: "0 20px 18px", fontSize: "14px", color: "#94a3b8", lineHeight: 1.6 }}>
                        {f.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── CTA FINAL ── */}
        <section className="vsl-section" style={{ padding: "80px 20px 100px", background: "linear-gradient(180deg, #07070e, #001830)" }}>
          <div style={{ maxWidth: "640px", margin: "0 auto", textAlign: "center" }}>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 900, color: "white", marginBottom: "16px", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              Última oportunidad de entrar con <span style={{ color: "#fbbf24" }}>60% de descuento</span>
            </h2>
            <p style={{ fontSize: "16px", color: "#94a3b8", marginBottom: "32px", lineHeight: 1.6 }}>
              Esta oferta no se repite. Cuando termine el contador, el precio vuelve a $50/mes.
            </p>

            <div style={{ marginBottom: "20px", display: "inline-block", padding: "14px 22px", borderRadius: "14px", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
              <p style={{ fontFamily: "monospace", fontSize: "26px", fontWeight: 900, color: "#fca5a5", letterSpacing: "3px" }}>{formatTime(secondsLeft)}</p>
              <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>Tiempo restante</p>
            </div>

            <div>
              <button onClick={handleCheckout} disabled={loading}
                style={{
                  padding: "20px 44px",
                  borderRadius: "14px",
                  border: "none",
                  background: loading ? "#1a1a2e" : "linear-gradient(135deg, #fbbf24, #f59e0b)",
                  color: loading ? "#64748b" : "#1a1a00",
                  fontSize: "18px",
                  fontWeight: 900,
                  cursor: loading ? "not-allowed" : "pointer",
                  letterSpacing: "0.3px",
                  boxShadow: loading ? "none" : "0 8px 32px rgba(251, 191, 36, 0.4)",
                  animation: loading ? "none" : "pulse-cta 2.5s ease-out infinite",
                  display: "inline-flex", alignItems: "center", gap: "10px",
                }}>
                {loading ? "Procesando..." : "🚀 SÍ, QUIERO MI ACCESO PRO →"}
              </button>
            </div>

            <p style={{ fontSize: "12px", color: "#475569", marginTop: "20px" }}>
              30 días de garantía · Pago seguro con Stripe · Cancela cuando quieras
            </p>
          </div>
        </section>

        {/* ── FOOTER mínimo ── */}
        <footer style={{ padding: "32px 20px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.04)", background: "#040410" }}>
          <p style={{ fontSize: "13px", color: "#94a3b8", fontWeight: 700, letterSpacing: "3px", marginBottom: "8px" }}>TRUST MIND</p>
          <p style={{ fontSize: "11px", color: "#475569" }}>© {new Date().getFullYear()} TRUST MIND · OLIVEROS MKT EIRL · Todos los derechos reservados</p>
        </footer>
      </div>
    </>
  );
}
