"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/app/lib/supabase";
import {
  Check, X as XIcon, Crown, Shield, Zap, Clock,
  TrendingUp, Music, Headphones, ListMusic, ChevronDown, Sparkles, DollarSign
} from "lucide-react";

const COUNTDOWN_HOURS = 24;
const SP_GREEN = "#1ED760";
const SP_GREEN_DARK = "#1DB954";

export default function SpotifyPage() {
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_HOURS * 3600);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<"yearly" | "monthly">("yearly");
  const ctaRef = useRef<HTMLDivElement>(null);

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

  const handleCheckout = async (planOverride?: "yearly" | "monthly") => {
    const plan = planOverride || selectedPlan;
    setLoading(true);
    try {
      const priceId = plan === "yearly"
        ? process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID
        : process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID;
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; return; }
      alert(data.error || "Error conectando con Stripe");
    } catch (err) {
      alert("Error: " + (err instanceof Error ? err.message : "desconocido"));
    } finally {
      setLoading(false);
    }
  };

  const scrollToCta = () => ctaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("signin") === "1") {
      const planFromUrl = params.get("plan");
      const plan: "yearly" | "monthly" = planFromUrl === "monthly" ? "monthly" : "yearly";
      setSelectedPlan(plan);
      window.history.replaceState({}, "", "/spotify");
      handleCheckout(plan);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const FEATURES = [
    { icon: <Headphones size={22} />, title: "Streams reales con retención", desc: "Reproducciones de cuentas activas con escucha completa. Cuentan para royalties y disparan el algoritmo de Spotify." },
    { icon: <ListMusic size={22} />, title: "Inclusión en playlists", desc: "Acceso a playlists orgánicas y editoriales con miles de seguidores. Tu música llega a oyentes nuevos cada día." },
    { icon: <TrendingUp size={22} />, title: "Oyentes mensuales", desc: "Crecimiento sostenido de tus monthly listeners. Más seguidores en tu perfil de artista, más credibilidad." },
    { icon: <DollarSign size={22} />, title: "Royalties reales", desc: "Cada stream cuenta para tus regalías. Recuperas tu inversión a través del pago de Spotify a tu distribuidora." },
    { icon: <Sparkles size={22} />, title: "Saves & Follows", desc: "Saves en tu música y follows en tu perfil. Las dos métricas que más pesan para el algoritmo Discover Weekly." },
    { icon: <Shield size={22} />, title: "100% seguro", desc: "Trabajamos solo con proveedores premium verificados. Cero riesgo de takedown o flags por bots." },
  ];

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #07070e; color: #f0efff; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; }
        a { text-decoration: none; color: inherit; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-cta {
          0%, 100% { box-shadow: 0 0 0 0 ${SP_GREEN}80; }
          50% { box-shadow: 0 0 0 18px ${SP_GREEN}00; }
        }
        @keyframes fade-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes equalizer {
          0%, 100% { height: 30%; }
          50% { height: 100%; }
        }
        .sp-section { animation: fade-up 0.7s ease-out backwards; }

        @media (max-width: 768px) {
          .sp-urgency { font-size: 11px !important; padding: 8px 10px !important; }
          .sp-hero { padding: 24px 16px 20px !important; }
          .sp-hero h1 { font-size: clamp(26px, 7.5vw, 36px) !important; line-height: 1.1 !important; }
          .sp-hero p { font-size: 14px !important; }
          .sp-hero-image { aspect-ratio: 4/3 !important; border-radius: 14px !important; }
          .sp-cta-primary { padding: 14px 22px !important; font-size: 15px !important; width: 100% !important; max-width: 320px !important; }
          .sp-section { padding-left: 16px !important; padding-right: 16px !important; padding-top: 48px !important; padding-bottom: 48px !important; }
          .sp-section h2 { font-size: clamp(22px, 5vw, 28px) !important; }
          .sp-feature-grid { grid-template-columns: 1fr !important; }
          .sp-feature-card { padding: 18px !important; }
          .sp-pricing-card { padding: 24px 18px !important; border-radius: 18px !important; }
          .sp-pricing-price { font-size: 56px !important; }
          .sp-toggle-btn { padding: 8px 16px !important; font-size: 11px !important; }
          .sp-final-cta { padding: 16px 24px !important; font-size: 15px !important; width: 100% !important; max-width: 360px !important; }
          .sp-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 420px) {
          .sp-hero h1 { font-size: 24px !important; }
          .sp-pricing-price { font-size: 48px !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#07070e" }}>

        {/* URGENCY BAR */}
        <div className="sp-urgency" style={{
          position: "sticky", top: 0, zIndex: 50,
          background: `linear-gradient(90deg, ${SP_GREEN_DARK}, ${SP_GREEN}, ${SP_GREEN_DARK})`,
          padding: "10px 16px", textAlign: "center",
          fontSize: "13px", fontWeight: 700, color: "#012e15",
          letterSpacing: "0.3px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
        }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
            <Clock size={14} /> OFERTA SPOTIFY GROWTH TERMINA EN
            <strong style={{ fontFamily: "monospace", fontSize: "14px", padding: "2px 6px", borderRadius: "4px", background: "rgba(0,0,0,0.25)", color: "white" }}>{formatTime(secondsLeft)}</strong>
            <span style={{ opacity: 0.85 }}>· Ahorra 60% · Solo HOY</span>
          </span>
        </div>

        {/* HERO */}
        <section className="sp-section sp-hero" style={{
          position: "relative", padding: "48px 20px 32px",
          background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${SP_GREEN}25 0%, transparent 60%)`,
          textAlign: "center",
        }}>
          <div style={{ maxWidth: "780px", margin: "0 auto" }}>

            {/* Logo + Badge */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "24px" }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill={SP_GREEN}>
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
              <span style={{ fontSize: "20px", fontWeight: 900, color: "white", letterSpacing: "1px" }}>SPOTIFY GROWTH</span>
            </div>

            <h1 style={{
              fontSize: "clamp(32px, 6vw, 56px)",
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: "-0.035em",
              marginBottom: "20px",
            }}>
              <span style={{ color: "white" }}>Obtén </span>
              <span style={{ background: `linear-gradient(135deg, ${SP_GREEN}, ${SP_GREEN_DARK})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>miles de reproducciones</span>
              <span style={{ color: "white" }}> en Spotify </span>
              <span style={{ color: SP_GREEN }}>con este software</span>
            </h1>

            <p style={{
              fontSize: "clamp(16px, 2vw, 19px)",
              color: "#94a3b8",
              maxWidth: "640px",
              margin: "0 auto 28px",
              lineHeight: 1.6,
            }}>
              <strong style={{ color: "white" }}>Streams con retención real, playlists editoriales, oyentes mensuales y royalties</strong> — todo desde un solo panel. Lo que más de <strong style={{ color: SP_GREEN }}>2,000 artistas en Latam</strong> usan para vivir de su música.
            </p>

            {/* HERO STAT VISUAL — equalizer animation */}
            <div className="sp-hero-image" style={{
              position: "relative",
              maxWidth: "820px",
              margin: "0 auto 32px",
              borderRadius: "20px",
              overflow: "hidden",
              boxShadow: `0 24px 80px ${SP_GREEN}30, 0 0 0 1px rgba(255,255,255,0.08)`,
              aspectRatio: "16/9",
              background: `linear-gradient(135deg, #012e15, #001a0c)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "20px",
            }}>
              {/* Grid pattern */}
              <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${SP_GREEN}08 1px, transparent 1px), linear-gradient(90deg, ${SP_GREEN}08 1px, transparent 1px)`, backgroundSize: "40px 40px" }} />

              <div style={{ position: "relative", textAlign: "center", width: "100%", zIndex: 1 }}>
                {/* Big numbers */}
                <div className="sp-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
                  {[
                    { value: "50M+", label: "Streams entregados" },
                    { value: "2,000+", label: "Artistas activos" },
                    { value: "500+", label: "Playlists" },
                    { value: "98%", label: "Retención" },
                  ].map((s, i) => (
                    <div key={i}>
                      <div style={{ fontSize: "clamp(20px, 4vw, 34px)", fontWeight: 900, color: SP_GREEN, letterSpacing: "-0.02em", lineHeight: 1 }}>{s.value}</div>
                      <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "6px", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Equalizer animado */}
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "4px", height: "60px", marginTop: "12px" }}>
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} style={{
                      width: "6px",
                      background: `linear-gradient(to top, ${SP_GREEN_DARK}, ${SP_GREEN})`,
                      borderRadius: "3px",
                      animation: `equalizer ${0.8 + (i % 4) * 0.2}s ease-in-out ${(i * 0.05) % 0.6}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
              <button onClick={scrollToCta} className="sp-cta-primary"
                style={{
                  padding: "18px 36px", borderRadius: "14px", border: "none",
                  background: `linear-gradient(135deg, ${SP_GREEN}, ${SP_GREEN_DARK})`,
                  color: "#012e15", fontSize: "17px", fontWeight: 900, cursor: "pointer",
                  boxShadow: `0 8px 32px ${SP_GREEN}50`,
                  animation: "pulse-cta 2.5s ease-out infinite",
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "10px",
                }}>
                <Music size={18} /> QUIERO MILES DE REPRODUCCIONES →
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "16px", flexWrap: "wrap" }}>
              {["Acceso inmediato", "Streams reales con royalties", "30 días de garantía"].map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Zap size={12} color={SP_GREEN} />
                  <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 500 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* DEMO VIDEO */}
        <section className="sp-section" style={{ padding: "32px 20px 48px", background: "#08080f" }}>
          <div style={{ maxWidth: "900px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: SP_GREEN, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "8px" }}>Demo · 3 min</p>
              <h2 style={{ fontSize: "clamp(22px, 4vw, 30px)", fontWeight: 800, color: "white", letterSpacing: "-0.02em" }}>
                Spotify Growth <span style={{ color: SP_GREEN }}>en acción</span>
              </h2>
            </div>
            <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: "20px", overflow: "hidden", boxShadow: `0 24px 80px ${SP_GREEN}25` }}>
              <iframe src="https://www.loom.com/embed/bf8ccb2d678342bcb7a0ed06f4316605" allowFullScreen style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }} />
            </div>
          </div>
        </section>

        {/* PROBLEMA */}
        <section className="sp-section" style={{ padding: "80px 20px", background: "#08080f" }}>
          <div style={{ maxWidth: "780px", margin: "0 auto" }}>
            <p style={{ textAlign: "center", fontSize: "12px", fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "16px" }}>El problema</p>
            <h2 style={{ textAlign: "center", fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 800, color: "white", marginBottom: "32px", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
              Sin streams nadie te <span style={{ color: "#ef4444" }}>descubre en Spotify</span>
            </h2>
            <div style={{ display: "grid", gap: "12px", maxWidth: "600px", margin: "0 auto" }}>
              {[
                "Subes tu música y nadie te escucha — el algoritmo no te empuja",
                "Pagas distribuidoras como DistroKid pero tus regalías son centavos",
                "Promotores de playlists te cobran $500 sin garantizar nada",
                "Las páginas de IG/TikTok que prometen virales son pura humo",
                "No tienes presupuesto para una agencia de PR musical real",
              ].map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px 18px", background: "rgba(239, 68, 68, 0.05)", borderLeft: "3px solid #ef4444", borderRadius: "8px" }}>
                  <XIcon size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontSize: "15px", color: "#e2e8f0", lineHeight: 1.5 }}>{p}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SOLUCIÓN / FEATURES */}
        <section className="sp-section" style={{ padding: "80px 20px", background: "linear-gradient(180deg, #08080f, #07070e)" }}>
          <div style={{ maxWidth: "900px", margin: "0 auto" }}>
            <p style={{ textAlign: "center", fontSize: "12px", fontWeight: 700, color: SP_GREEN, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "16px" }}>La solución</p>
            <h2 style={{ textAlign: "center", fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 800, color: "white", marginBottom: "16px", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
              Software de Spotify Growth <span style={{ color: SP_GREEN }}>todo-en-uno</span>
            </h2>
            <p style={{ textAlign: "center", fontSize: "17px", color: "#94a3b8", maxWidth: "620px", margin: "0 auto 48px", lineHeight: 1.6 }}>
              No solo streams. Crecimiento integral para artistas independientes.
            </p>
            <div className="sp-feature-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
              {FEATURES.map((f) => (
                <div key={f.title} className="sp-feature-card" style={{ padding: "24px", borderRadius: "16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: `${SP_GREEN}15`, border: `1px solid ${SP_GREEN}40`, display: "flex", alignItems: "center", justifyContent: "center", color: SP_GREEN, marginBottom: "14px" }}>
                    {f.icon}
                  </div>
                  <h3 style={{ fontSize: "15px", fontWeight: 700, color: "white", marginBottom: "6px" }}>{f.title}</h3>
                  <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PARA QUIÉN ES */}
        <section className="sp-section" style={{ padding: "80px 20px", background: "#08080f" }}>
          <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
            <h2 style={{ textAlign: "center", fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 800, color: "white", marginBottom: "40px", letterSpacing: "-0.02em" }}>
              ¿Para quién es <span style={{ color: SP_GREEN }}>Spotify Growth</span>?
            </h2>
            <div className="sp-feature-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
              {[
                { icon: "🎤", title: "Artistas independientes", desc: "Sube tu música y empieza a generar streams reales. Sin discográfica, sin intermediarios — tú controlas tu crecimiento." },
                { icon: "🎹", title: "Productores y beatmakers", desc: "Promociona tus beats. Más plays = más clientes que te buscan para colaborar y comprar tu trabajo." },
                { icon: "📀", title: "Sellos pequeños", desc: "Maneja el crecimiento de todos tus artistas desde un solo panel. Precios mayoristas para múltiples releases." },
                { icon: "🎬", title: "Productoras de música para video", desc: "Posicionar la música que usas en tu contenido para que también monetice por su lado." },
              ].map((u, i) => (
                <div key={i} style={{ padding: "24px", borderRadius: "16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: "32px", marginBottom: "12px" }}>{u.icon}</div>
                  <h3 style={{ fontSize: "15px", fontWeight: 700, color: "white", marginBottom: "6px" }}>{u.title}</h3>
                  <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.6 }}>{u.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section ref={ctaRef} className="sp-section" style={{ padding: "80px 20px", background: `linear-gradient(180deg, #08080f, ${SP_GREEN}15 50%, #08080f)` }}>
          <div style={{ maxWidth: "640px", margin: "0 auto" }}>
            <p style={{ textAlign: "center", fontSize: "12px", fontWeight: 700, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "16px" }}>La oferta</p>
            <h2 style={{ textAlign: "center", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 900, color: "white", marginBottom: "16px", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
              Spotify Growth <span style={{ color: SP_GREEN }}>incluido</span> en TRUST MIND Pro
            </h2>
            <p style={{ textAlign: "center", fontSize: "15px", color: "#94a3b8", marginBottom: "32px" }}>
              Por <strong style={{ color: "white" }}>$50/mes</strong> obtienes acceso al panel SMM completo + Spotify + IG + TikTok + FB.
            </p>

            <div className="sp-pricing-card" style={{
              position: "relative",
              padding: "40px 32px",
              borderRadius: "24px",
              background: `linear-gradient(160deg, ${SP_GREEN}15 0%, #000810 100%)`,
              border: `2px solid ${SP_GREEN}`,
              boxShadow: `0 24px 80px ${SP_GREEN}30`,
              overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: "-80px", right: "-80px", width: "300px", height: "300px", borderRadius: "50%", background: `radial-gradient(circle, ${SP_GREEN}30, transparent 70%)`, filter: "blur(40px)" }} />

              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
                  <span style={{ padding: "5px 14px", borderRadius: "100px", background: "linear-gradient(135deg, #fbbf24, #f59e0b)", color: "#1a1a00", fontSize: "11px", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" }}>🔥 Oferta de lanzamiento</span>
                </div>

                {/* Toggle */}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
                  <div style={{ display: "inline-flex", padding: "4px", borderRadius: "12px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)", gap: "3px" }}>
                    <button onClick={() => setSelectedPlan("yearly")} className="sp-toggle-btn"
                      style={{ padding: "9px 20px", borderRadius: "9px", border: "none",
                        background: selectedPlan === "yearly" ? "linear-gradient(135deg, #fbbf24, #f59e0b)" : "transparent",
                        color: selectedPlan === "yearly" ? "#1a1a00" : "#94a3b8",
                        fontSize: "12px", fontWeight: 800, cursor: "pointer", position: "relative", letterSpacing: "0.3px",
                      }}>
                      ANUAL
                      <span style={{ position: "absolute", top: "-9px", right: "-12px", padding: "2px 7px", borderRadius: "20px", background: "#ef4444", color: "white", fontSize: "9px", fontWeight: 800 }}>-60%</span>
                    </button>
                    <button onClick={() => setSelectedPlan("monthly")} className="sp-toggle-btn"
                      style={{ padding: "9px 20px", borderRadius: "9px", border: "none",
                        background: selectedPlan === "monthly" ? `linear-gradient(135deg, ${SP_GREEN}, ${SP_GREEN_DARK})` : "transparent",
                        color: selectedPlan === "monthly" ? "#012e15" : "#94a3b8",
                        fontSize: "12px", fontWeight: 800, cursor: "pointer", letterSpacing: "0.3px",
                      }}>
                      MENSUAL
                    </button>
                  </div>
                </div>

                <p style={{ textAlign: "center", fontSize: "13px", fontWeight: 700, color: SP_GREEN, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "8px" }}>
                  TRUST MIND Pro · {selectedPlan === "yearly" ? "Plan Anual" : "Plan Mensual"}
                </p>

                <div style={{ textAlign: "center", marginBottom: "24px" }}>
                  {selectedPlan === "yearly" ? (
                    <>
                      <div style={{ display: "inline-flex", alignItems: "baseline", gap: "12px", marginBottom: "8px" }}>
                        <span style={{ fontSize: "20px", color: "#64748b", textDecoration: "line-through" }}>$50/mes</span>
                        <span style={{ padding: "2px 8px", borderRadius: "6px", background: "rgba(239, 68, 68, 0.15)", color: "#fca5a5", fontSize: "11px", fontWeight: 700 }}>-60%</span>
                      </div>
                      <div>
                        <span className="sp-pricing-price" style={{ fontSize: "72px", fontWeight: 900, color: "white", letterSpacing: "-0.04em", lineHeight: 1 }}>$20</span>
                        <span style={{ fontSize: "20px", color: SP_GREEN, marginLeft: "4px", fontWeight: 600 }}>/mes</span>
                      </div>
                      <p style={{ fontSize: "14px", color: "#94a3b8", marginTop: "8px" }}>
                        Pago único <strong style={{ color: "white" }}>$240/año</strong> · Ahorras $360
                      </p>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="sp-pricing-price" style={{ fontSize: "72px", fontWeight: 900, color: "white", letterSpacing: "-0.04em", lineHeight: 1 }}>$50</span>
                        <span style={{ fontSize: "20px", color: SP_GREEN, marginLeft: "4px", fontWeight: 600 }}>/mes</span>
                      </div>
                      <p style={{ fontSize: "14px", color: "#94a3b8", marginTop: "8px" }}>Sin compromiso · Cancela cuando quieras</p>
                    </>
                  )}
                </div>

                <div style={{ padding: "20px", borderRadius: "14px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: "24px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: SP_GREEN, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "14px" }}>✦ Acceso completo a:</p>
                  <div style={{ display: "grid", gap: "10px" }}>
                    {[
                      "Streams Spotify premium con royalties",
                      "Playlists editoriales y orgánicas",
                      "Saves, follows, oyentes mensuales",
                      "También YouTube Music, Apple Music, Deezer",
                      "Panel SMM con +5,000 servicios (IG, TikTok, FB)",
                      "TrustInsta + TrustFace Desktop incluidos",
                      "Agente IA 24/7 especializado en música",
                      "Soporte directo en menos de 1 hora",
                    ].map((b) => (
                      <div key={b} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                        <Check size={16} color={SP_GREEN} style={{ flexShrink: 0, marginTop: 2 }} />
                        <p style={{ fontSize: "13px", color: "#e2e8f0", lineHeight: 1.5 }}>{b}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={() => handleCheckout()} disabled={loading} className="sp-final-cta"
                  style={{
                    width: "100%", padding: "18px", borderRadius: "14px", border: "none",
                    background: loading ? "#1a1a2e" : selectedPlan === "yearly"
                      ? "linear-gradient(135deg, #fbbf24, #f59e0b)"
                      : `linear-gradient(135deg, ${SP_GREEN}, ${SP_GREEN_DARK})`,
                    color: loading ? "#64748b" : selectedPlan === "yearly" ? "#1a1a00" : "#012e15",
                    fontSize: "17px", fontWeight: 900, cursor: loading ? "not-allowed" : "pointer",
                    letterSpacing: "0.3px",
                    boxShadow: loading ? "none" : selectedPlan === "yearly"
                      ? "0 8px 32px rgba(251, 191, 36, 0.4)"
                      : `0 8px 32px ${SP_GREEN}60`,
                    animation: loading ? "none" : "pulse-cta 2.5s ease-out infinite",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                  }}>
                  {loading ? "Procesando..." : selectedPlan === "yearly" ? "🚀 ACTIVAR ANUAL — $240/AÑO" : "🚀 ACTIVAR MENSUAL — $50/MES"}
                </button>
                <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "16px", flexWrap: "wrap" }}>
                  {["🔒 Pago seguro Stripe", "✓ 30 días de garantía", "⚡ Acceso inmediato"].map((t) => (
                    <span key={t} style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="sp-section" style={{ padding: "80px 20px" }}>
          <div style={{ maxWidth: "720px", margin: "0 auto" }}>
            <h2 style={{ textAlign: "center", fontSize: "clamp(24px, 4vw, 34px)", fontWeight: 800, color: "white", marginBottom: "40px", letterSpacing: "-0.02em" }}>Preguntas frecuentes</h2>
            <div style={{ display: "grid", gap: "10px" }}>
              {[
                { q: "¿Los streams cuentan para royalties?", a: "Sí. Trabajamos solo con streams de cuentas reales en países con royalty pool alto (US, UK, Alemania, etc.). Cada stream te genera regalías reales pagadas por tu distribuidora." },
                { q: "¿Spotify me puede flagear o quitar la música?", a: "Cero takedowns en miles de tracks entregados. Usamos proveedores premium verificados con patrones de escucha humanos, jamás bots toscos." },
                { q: "¿Cuánto tardan los streams?", a: "Los streams se entregan progresivamente en 3-15 días para mantenerlo natural (no de golpe). Esto es CRÍTICO para no levantar flags." },
                { q: "¿Funciona en otras plataformas además de Spotify?", a: "Sí, también tenemos streams para YouTube Music, Apple Music, SoundCloud, Deezer y Tidal. Todos están en el mismo panel." },
                { q: "¿Cuánto recupero por cada $50?", a: "Depende del país: $50 te dan ~50K streams premium en mercados altos, lo cual genera entre $100-$200 en royalties. ROI positivo en 60-90 días." },
                { q: "¿Puedo promocionar varios releases al mes?", a: "Ilimitado. La suscripción Pro te da acceso al panel — pides los servicios que quieras con tu saldo recargable." },
              ].map((f, i) => {
                const isOpen = openFaq === i;
                return (
                  <div key={i} style={{ borderRadius: "14px", background: "rgba(255,255,255,0.02)", border: `1px solid ${isOpen ? `${SP_GREEN}40` : "rgba(255,255,255,0.06)"}`, overflow: "hidden" }}>
                    <button onClick={() => setOpenFaq(isOpen ? null : i)}
                      style={{ width: "100%", padding: "18px 20px", background: "transparent", border: "none", color: "white", fontSize: "15px", fontWeight: 700, cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                      {f.q}
                      <ChevronDown size={18} color={SP_GREEN} style={{ flexShrink: 0, transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
                    </button>
                    {isOpen && <div style={{ padding: "0 20px 18px", fontSize: "14px", color: "#94a3b8", lineHeight: 1.6 }}>{f.a}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="sp-section" style={{ padding: "60px 20px 80px", textAlign: "center", background: "linear-gradient(180deg, #07070e, #012e15)" }}>
          <h2 style={{ fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 900, color: "white", marginBottom: "12px", letterSpacing: "-0.02em" }}>
            Empieza a sumar <span style={{ color: SP_GREEN }}>miles de streams</span> hoy
          </h2>
          <p style={{ fontSize: "15px", color: "#94a3b8", marginBottom: "24px" }}>$240/año (= $20/mes) o $50/mes · Cancela cuando quieras</p>
          <button onClick={() => handleCheckout()} disabled={loading} className="sp-final-cta"
            style={{
              padding: "18px 36px", borderRadius: "14px", border: "none",
              background: `linear-gradient(135deg, ${SP_GREEN}, ${SP_GREEN_DARK})`,
              color: "#012e15", fontSize: "16px", fontWeight: 900, cursor: loading ? "not-allowed" : "pointer",
              boxShadow: `0 8px 32px ${SP_GREEN}60`,
              display: "inline-flex", alignItems: "center", gap: "10px",
            }}>
            <Music size={18} /> {loading ? "..." : "QUIERO MI SPOTIFY GROWTH →"}
          </button>
        </section>

        {/* Footer */}
        <footer style={{ padding: "32px 20px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.04)", background: "#040410" }}>
          <p style={{ fontSize: "13px", color: "#94a3b8", fontWeight: 700, letterSpacing: "3px", marginBottom: "8px" }}>TRUST MIND</p>
          <p style={{ fontSize: "11px", color: "#475569" }}>© {new Date().getFullYear()} TRUST MIND · OLIVEROS MKT EIRL · Todos los derechos reservados</p>
        </footer>
      </div>
    </>
  );
}
