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

// Logos de plataformas (SVG paths de simpleicons.org)
const PLATFORMS = [
  { name: "Instagram", color: "#E4405F", path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" },
  { name: "TikTok", color: "#ffffff", path: "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" },
  { name: "YouTube", color: "#FF0000", path: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" },
  { name: "Facebook", color: "#1877F2", path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" },
  { name: "X", color: "#ffffff", path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
  { name: "Spotify", color: "#1ED760", path: "M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" },
  { name: "Telegram", color: "#26A5E4", path: "M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" },
  { name: "Twitch", color: "#9146FF", path: "M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" },
];

export default function OfertaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_HOURS * 3600);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"yearly" | "monthly">("yearly");
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

  const handleCheckout = async (planOverride?: "yearly" | "monthly") => {
    const plan = planOverride || selectedPlan;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${window.location.origin}/oferta?signin=1&plan=${plan}` },
        });
        if (error) alert("Error iniciando sesión: " + error.message);
        return;
      }
      const priceId = plan === "yearly"
        ? process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID
        : process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID;
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

  // Si vuelve del signin, recuperar plan y disparar checkout con plan correcto
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("signin") === "1") {
      const planFromUrl = params.get("plan");
      const plan: "yearly" | "monthly" = planFromUrl === "monthly" ? "monthly" : "yearly";
      setSelectedPlan(plan);
      window.history.replaceState({}, "", "/oferta");
      handleCheckout(plan);
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

        {/* ── PLATAFORMAS SOPORTADAS ── */}
        <section className="vsl-section" style={{
          padding: "32px 20px 48px",
          background: "linear-gradient(180deg, #07070e, #060610)",
          borderTop: "1px solid rgba(255,255,255,0.04)",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}>
          <div style={{ maxWidth: "960px", margin: "0 auto" }}>
            <p style={{
              textAlign: "center",
              fontSize: "11px",
              fontWeight: 700,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "2px",
              marginBottom: "24px",
            }}>
              Funciona en tus plataformas favoritas
            </p>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))",
              gap: "12px",
              alignItems: "center",
              justifyItems: "center",
            }}>
              {PLATFORMS.map((p) => (
                <div key={p.name}
                  title={p.name}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                    padding: "14px 8px",
                    borderRadius: "14px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    transition: "all 0.2s",
                    width: "100%",
                    maxWidth: "120px",
                  }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill={p.color} aria-label={p.name}>
                    <path d={p.path} />
                  </svg>
                  <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>{p.name}</span>
                </div>
              ))}
            </div>
            <p style={{
              textAlign: "center",
              fontSize: "13px",
              color: "#64748b",
              marginTop: "20px",
            }}>
              Y <strong style={{ color: "#7dd3fc" }}>+10 plataformas más</strong> · Más de 5,000 servicios disponibles
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

                {/* Plan toggle */}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
                  <div style={{ display: "inline-flex", padding: "4px", borderRadius: "12px", background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.08)", gap: "3px" }}>
                    <button onClick={() => setSelectedPlan("yearly")}
                      style={{
                        padding: "9px 20px", borderRadius: "9px", border: "none",
                        background: selectedPlan === "yearly" ? "linear-gradient(135deg, #fbbf24, #f59e0b)" : "transparent",
                        color: selectedPlan === "yearly" ? "#1a1a00" : "#94a3b8",
                        fontSize: "12px", fontWeight: 800, cursor: "pointer",
                        position: "relative", letterSpacing: "0.3px",
                      }}>
                      ANUAL
                      <span style={{ position: "absolute", top: "-9px", right: "-12px", padding: "2px 7px", borderRadius: "20px", background: "#ef4444", color: "white", fontSize: "9px", fontWeight: 800 }}>-60%</span>
                    </button>
                    <button onClick={() => setSelectedPlan("monthly")}
                      style={{
                        padding: "9px 20px", borderRadius: "9px", border: "none",
                        background: selectedPlan === "monthly" ? "linear-gradient(135deg, #007ABF, #00B4D8)" : "transparent",
                        color: selectedPlan === "monthly" ? "white" : "#94a3b8",
                        fontSize: "12px", fontWeight: 800, cursor: "pointer",
                        letterSpacing: "0.3px",
                      }}>
                      MENSUAL
                    </button>
                  </div>
                </div>

                {/* Producto */}
                <p style={{ textAlign: "center", fontSize: "13px", fontWeight: 700, color: "#7dd3fc", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "8px" }}>
                  TRUST MIND Pro · {selectedPlan === "yearly" ? "Plan Anual" : "Plan Mensual"}
                </p>

                {/* Precio */}
                <div style={{ textAlign: "center", marginBottom: "24px" }}>
                  {selectedPlan === "yearly" ? (
                    <>
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
                    </>
                  ) : (
                    <>
                      <div>
                        <span style={{ fontSize: "72px", fontWeight: 900, color: "white", letterSpacing: "-0.04em", lineHeight: 1 }}>$50</span>
                        <span style={{ fontSize: "20px", color: "#7dd3fc", marginLeft: "4px", fontWeight: 600 }}>/mes</span>
                      </div>
                      <p style={{ fontSize: "14px", color: "#94a3b8", marginTop: "8px" }}>
                        Sin compromiso · Cancela cuando quieras · Sin descuento por pago único
                      </p>
                      <p style={{ fontSize: "12px", color: "#fbbf24", marginTop: "8px", fontWeight: 600 }}>
                        💡 ¿Lo quieres por $20/mes? Cambia a <span onClick={() => setSelectedPlan("yearly")} style={{ textDecoration: "underline", cursor: "pointer" }}>plan anual</span>
                      </p>
                    </>
                  )}
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
                <button onClick={() => handleCheckout()} disabled={loading}
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
                  ) : selectedPlan === "yearly" ? (
                    <>🚀 ACTIVAR ANUAL — $240/AÑO</>
                  ) : (
                    <>🚀 ACTIVAR MENSUAL — $50/MES</>
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
              <button onClick={() => handleCheckout()} disabled={loading}
                style={{
                  padding: "20px 44px",
                  borderRadius: "14px",
                  border: "none",
                  background: loading ? "#1a1a2e" : selectedPlan === "yearly"
                    ? "linear-gradient(135deg, #fbbf24, #f59e0b)"
                    : "linear-gradient(135deg, #007ABF, #00B4D8)",
                  color: loading ? "#64748b" : selectedPlan === "yearly" ? "#1a1a00" : "white",
                  fontSize: "18px",
                  fontWeight: 900,
                  cursor: loading ? "not-allowed" : "pointer",
                  letterSpacing: "0.3px",
                  boxShadow: loading ? "none" : selectedPlan === "yearly"
                    ? "0 8px 32px rgba(251, 191, 36, 0.4)"
                    : "0 8px 32px rgba(0, 180, 216, 0.4)",
                  animation: loading ? "none" : "pulse-cta 2.5s ease-out infinite",
                  display: "inline-flex", alignItems: "center", gap: "10px",
                }}>
                {loading
                  ? "Procesando..."
                  : selectedPlan === "yearly"
                  ? "🚀 SÍ, QUIERO ANUAL — $240/AÑO →"
                  : "🚀 SÍ, QUIERO MENSUAL — $50/MES →"}
              </button>
              <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "12px" }}>
                {selectedPlan === "yearly"
                  ? "60% de descuento · Ahorra $360"
                  : <>¿Prefieres ahorrar 60%? <span onClick={() => setSelectedPlan("yearly")} style={{ color: "#fbbf24", cursor: "pointer", textDecoration: "underline", fontWeight: 700 }}>Cambiar a anual ($20/mes)</span></>}
              </p>
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
