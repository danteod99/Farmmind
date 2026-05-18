"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import {
  Check, X as XIcon, Crown, Shield, Zap, Clock,
  TrendingUp, Users, ChevronDown, Sparkles, Download, MessageCircle, Globe, Smartphone, Eye, Bot
} from "lucide-react";

const COUNTDOWN_HOURS = 24;

const FB_BLUE = "#1877F2";

export default function TrustFacePage() {
  const router = useRouter();
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
      if (res.status === 401) {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${window.location.origin}/auth/callback?subscribe=${plan}` },
        });
        if (error) alert("Error iniciando sesión: " + error.message);
        return;
      }
      const data = await res.json();
      if (data.url) { window.location.href = data.url; return; }
      alert(data.error || "Error conectando con Stripe. Intenta más tarde.");
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
      window.history.replaceState({}, "", "/trustface");
      handleCheckout(plan);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const FEATURES = [
    { icon: <Globe size={22} />, title: "Multi-cuenta con anti-detección", desc: "Maneja decenas de cuentas Facebook simultáneamente con perfiles aislados, fingerprinting único y proxies por cuenta. Cero baneos." },
    { icon: <Smartphone size={22} />, title: "Marketplace Automation", desc: "Publica, repostea y scrapea listings de Marketplace masivamente. Auto-respuesta a compradores con templates personalizables." },
    { icon: <MessageCircle size={22} />, title: "Messenger Mass DM", desc: "Envía DMs masivos con templates dinámicos y variables. Soporta personalización por destinatario y warm-up automático." },
    { icon: <Users size={22} />, title: "Gestión de grupos", desc: "Une cuentas a grupos, publica contenido, scrapea miembros para targeting y crece tu red en automático." },
    { icon: <TrendingUp size={22} />, title: "Engagement automatizado", desc: "Likes, comentarios y shares con delays humanos. Aumenta autoridad social orgánicamente sin riesgo." },
    { icon: <Shield size={22} />, title: "Warm-up + Scheduler", desc: "Calentamiento automático de cuentas nuevas siguiendo protocolos seguros. Programa tareas días/semanas adelante." },
  ];

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #07070e; color: #f0efff; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; }
        a { text-decoration: none; color: inherit; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-cta {
          0%, 100% { box-shadow: 0 0 0 0 ${FB_BLUE}80; }
          50% { box-shadow: 0 0 0 18px ${FB_BLUE}00; }
        }
        @keyframes fade-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes glow-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .tf-section { animation: fade-up 0.7s ease-out backwards; }

        @media (max-width: 768px) {
          .tf-urgency { font-size: 11px !important; padding: 8px 10px !important; }
          .tf-hero { padding: 24px 16px 20px !important; }
          .tf-hero h1 { font-size: clamp(26px, 7.5vw, 36px) !important; line-height: 1.1 !important; }
          .tf-hero p { font-size: 14px !important; }
          .tf-hero-image { aspect-ratio: 4/3 !important; border-radius: 14px !important; }
          .tf-cta-primary { padding: 14px 22px !important; font-size: 15px !important; width: 100% !important; max-width: 320px !important; }
          .tf-section { padding-left: 16px !important; padding-right: 16px !important; padding-top: 48px !important; padding-bottom: 48px !important; }
          .tf-section h2 { font-size: clamp(22px, 5vw, 28px) !important; }
          .tf-section p { font-size: 14px !important; }
          .tf-feature-grid { grid-template-columns: 1fr !important; }
          .tf-feature-card { padding: 18px !important; }
          .tf-result-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
          .tf-pricing-card { padding: 24px 18px !important; border-radius: 18px !important; }
          .tf-pricing-price { font-size: 56px !important; }
          .tf-toggle-btn { padding: 8px 16px !important; font-size: 11px !important; }
          .tf-final-cta { padding: 16px 24px !important; font-size: 15px !important; width: 100% !important; max-width: 360px !important; }
        }
        @media (max-width: 420px) {
          .tf-hero h1 { font-size: 24px !important; }
          .tf-pricing-price { font-size: 48px !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#07070e" }}>

        {/* URGENCY BAR */}
        <div className="tf-urgency" style={{
          position: "sticky", top: 0, zIndex: 50,
          background: `linear-gradient(90deg, ${FB_BLUE}, #0F5DBC, ${FB_BLUE})`,
          padding: "10px 16px", textAlign: "center",
          fontSize: "13px", fontWeight: 700, color: "white",
          letterSpacing: "0.3px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
        }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
            <Clock size={14} /> OFERTA TRUSTFACE PRO TERMINA EN
            <strong style={{ fontFamily: "monospace", fontSize: "14px", padding: "2px 6px", borderRadius: "4px", background: "rgba(0,0,0,0.25)" }}>{formatTime(secondsLeft)}</strong>
            <span style={{ opacity: 0.85 }}>· Ahorra 60% · Solo HOY</span>
          </span>
        </div>

        {/* HERO */}
        <section className="tf-section tf-hero" style={{
          position: "relative", padding: "48px 20px 32px",
          background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${FB_BLUE}30 0%, transparent 60%)`,
          textAlign: "center",
        }}>
          <div style={{ maxWidth: "780px", margin: "0 auto" }}>

            {/* Logo + Badge */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "24px" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill={FB_BLUE}>
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span style={{ fontSize: "20px", fontWeight: 900, color: "white", letterSpacing: "1px" }}>TRUSTFACE</span>
            </div>

            <h1 style={{
              fontSize: "clamp(32px, 6vw, 56px)",
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: "-0.035em",
              marginBottom: "20px",
            }}>
              <span style={{ color: "white" }}>Maneja </span>
              <span style={{ color: FB_BLUE }}>cientos de cuentas</span>
              <span style={{ color: "white" }}> de Facebook desde tu computadora — </span>
              <span style={{ background: `linear-gradient(135deg, #4d8cf7, ${FB_BLUE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>sin baneos</span>
            </h1>

            <p style={{
              fontSize: "clamp(16px, 2vw, 19px)",
              color: "#94a3b8",
              maxWidth: "620px",
              margin: "0 auto 32px",
              lineHeight: 1.6,
            }}>
              <strong style={{ color: "white" }}>Marketplace automation, DMs masivos, gestión de grupos, engagement automatizado</strong> — todo desde un solo software con anti-detección de nivel enterprise.
            </p>

            {/* HERO IMAGE */}
            <div className="tf-hero-image" style={{
              position: "relative",
              maxWidth: "820px",
              margin: "0 auto 32px",
              borderRadius: "20px",
              overflow: "hidden",
              boxShadow: `0 24px 80px ${FB_BLUE}40, 0 0 0 1px rgba(255,255,255,0.08)`,
              aspectRatio: "16/9",
              background: `linear-gradient(135deg, #001830, #000810)`,
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/oferta/ejercito-bots.png"
                alt="Granja de cuentas Facebook con TrustFace"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)",
                padding: "24px 22px 18px", textAlign: "left",
              }}>
                <p style={{ fontSize: "13px", fontWeight: 700, color: FB_BLUE, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "4px" }}>
                  📘 +500 cuentas Facebook activas simultáneamente
                </p>
                <p style={{ fontSize: "14px", color: "#e2e8f0", fontWeight: 500 }}>
                  Operación real de Marketplace + Mass DM con TrustFace Desktop
                </p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
              <button onClick={scrollToCta} className="tf-cta-primary"
                style={{
                  padding: "18px 36px", borderRadius: "14px", border: "none",
                  background: `linear-gradient(135deg, ${FB_BLUE}, #4d8cf7)`,
                  color: "white", fontSize: "17px", fontWeight: 800, cursor: "pointer",
                  boxShadow: `0 8px 32px ${FB_BLUE}50`,
                  animation: "pulse-cta 2.5s ease-out infinite",
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "10px",
                }}>
                <Sparkles size={18} /> QUIERO TRUSTFACE PRO →
              </button>
              <a href="/downloads" style={{
                padding: "12px 20px", borderRadius: "12px",
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                color: "#94a3b8", fontSize: "13px", fontWeight: 600,
                display: "inline-flex", alignItems: "center", gap: "6px",
              }}>
                <Download size={14} /> Descargar TrustFace Desktop
              </a>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "16px", flexWrap: "wrap" }}>
              {["Mac + Windows", "Sin permanencia", "30 días de garantía"].map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Zap size={12} color="#34d399" />
                  <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 500 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PROBLEMA */}
        <section className="tf-section" style={{ padding: "80px 20px", background: "#08080f" }}>
          <div style={{ maxWidth: "780px", margin: "0 auto" }}>
            <p style={{ textAlign: "center", fontSize: "12px", fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "16px" }}>El problema con Facebook</p>
            <h2 style={{ textAlign: "center", fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 800, color: "white", marginBottom: "32px", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
              Manejar varias cuentas FB <span style={{ color: "#ef4444" }}>te está costando demasiado tiempo</span>
            </h2>
            <div style={{ display: "grid", gap: "12px", maxWidth: "600px", margin: "0 auto" }}>
              {[
                "Cada cuenta requiere otro navegador, otro perfil, otra VPN",
                "Te banean cuentas porque Facebook detecta el mismo dispositivo",
                "Pasas horas copiando mensajes en Messenger uno por uno",
                "Publicar el mismo listing en 50 cuentas Marketplace = todo el día",
                "Las extensiones \"automation\" se rompen cada update de FB",
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
        <section className="tf-section" style={{ padding: "80px 20px", background: "linear-gradient(180deg, #08080f, #07070e)" }}>
          <div style={{ maxWidth: "900px", margin: "0 auto" }}>
            <p style={{ textAlign: "center", fontSize: "12px", fontWeight: 700, color: "#34d399", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "16px" }}>La solución</p>
            <h2 style={{ textAlign: "center", fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 800, color: "white", marginBottom: "16px", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
              <span style={{ color: "white" }}>TRUSTFACE Desktop</span>
            </h2>
            <p style={{ textAlign: "center", fontSize: "17px", color: "#94a3b8", maxWidth: "620px", margin: "0 auto 48px", lineHeight: 1.6 }}>
              Software profesional para escalar operaciones de Facebook sin contratar equipo ni alquilar oficina.
            </p>
            <div className="tf-feature-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
              {FEATURES.map((f) => (
                <div key={f.title} className="tf-feature-card" style={{ padding: "24px", borderRadius: "16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: `${FB_BLUE}20`, border: `1px solid ${FB_BLUE}40`, display: "flex", alignItems: "center", justifyContent: "center", color: FB_BLUE, marginBottom: "14px" }}>
                    {f.icon}
                  </div>
                  <h3 style={{ fontSize: "15px", fontWeight: 700, color: "white", marginBottom: "6px" }}>{f.title}</h3>
                  <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* RESULTADOS REALES */}
        <section className="tf-section" style={{ padding: "80px 20px", background: "#08080f" }}>
          <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
            <p style={{ textAlign: "center", fontSize: "12px", fontWeight: 700, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "16px" }}>Resultados reales · sin actores</p>
            <h2 style={{ textAlign: "center", fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 800, color: "white", marginBottom: "48px", letterSpacing: "-0.02em" }}>
              Lo que están generando con nuestro stack
            </h2>
            <div className="tf-result-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
              {[
                { src: "/resultados/testimonio-braulio.png", name: "Braulio Espíritu", result: "$7,275.80 procesados", quote: "Ahora yo también soy granjero, gracias Dante por la asesoría." },
                { src: "/resultados/testimonio-ricardo.png", name: "Ricardo Sayas", result: "$3,466 · Canal FB explotó", quote: "No puedo creer lo que estoy logrando con mi granja de bots. El canal de Facebook explotó." },
                { src: "/resultados/testimonio-isaac.png", name: "Isaac Zaak", result: "Primera granja recibida", quote: "Hoy recibí mi primera granja, el lunes empiezo el montaje." },
              ].map((t, i) => (
                <div key={i} style={{ borderRadius: "20px", background: "linear-gradient(160deg, #0d0d18, #07070e)", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  <div style={{ position: "relative", aspectRatio: "1/1", overflow: "hidden", background: "#0a0a14", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.src} alt={`Testimonio ${t.name}`} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
                  </div>
                  <div style={{ padding: "20px" }}>
                    <div style={{ display: "flex", gap: "2px", marginBottom: "10px" }}>
                      {[1,2,3,4,5].map(s => <span key={s} style={{ color: "#fbbf24", fontSize: "14px" }}>★</span>)}
                    </div>
                    <p style={{ fontSize: "13px", color: "#e2e8f0", fontStyle: "italic", lineHeight: 1.5, marginBottom: "14px" }}>&ldquo;{t.quote}&rdquo;</p>
                    <div style={{ paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <p style={{ fontSize: "13px", fontWeight: 700, color: "white", marginBottom: "6px" }}>{t.name}</p>
                      <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "20px", background: "rgba(52, 211, 153, 0.1)", border: "1px solid rgba(52, 211, 153, 0.25)", color: "#34d399", fontSize: "11px", fontWeight: 700 }}>
                        ✓ {t.result}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section ref={ctaRef} className="tf-section" style={{ padding: "80px 20px", background: `linear-gradient(180deg, #08080f, ${FB_BLUE}20 50%, #08080f)` }}>
          <div style={{ maxWidth: "640px", margin: "0 auto" }}>
            <p style={{ textAlign: "center", fontSize: "12px", fontWeight: 700, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "16px" }}>La oferta</p>
            <h2 style={{ textAlign: "center", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 900, color: "white", marginBottom: "16px", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
              TrustFace + TrustInsta <span style={{ color: "#fbbf24" }}>incluidos</span>
            </h2>
            <p style={{ textAlign: "center", fontSize: "15px", color: "#94a3b8", marginBottom: "32px" }}>
              Tu suscripción <strong style={{ color: "white" }}>Pro</strong> desbloquea ambos desktop apps + el panel SMM completo.
            </p>

            <div className="tf-pricing-card" style={{
              position: "relative",
              padding: "40px 32px",
              borderRadius: "24px",
              background: `linear-gradient(160deg, ${FB_BLUE}15 0%, #000810 100%)`,
              border: `2px solid ${FB_BLUE}`,
              boxShadow: `0 24px 80px ${FB_BLUE}30`,
              overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: "-80px", right: "-80px", width: "300px", height: "300px", borderRadius: "50%", background: `radial-gradient(circle, ${FB_BLUE}30, transparent 70%)`, filter: "blur(40px)" }} />

              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
                  <span style={{ padding: "5px 14px", borderRadius: "100px", background: "linear-gradient(135deg, #fbbf24, #f59e0b)", color: "#1a1a00", fontSize: "11px", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" }}>🔥 Oferta de lanzamiento</span>
                </div>

                {/* Toggle */}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
                  <div style={{ display: "inline-flex", padding: "4px", borderRadius: "12px", background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.08)", gap: "3px" }}>
                    <button onClick={() => setSelectedPlan("yearly")} className="tf-toggle-btn"
                      style={{ padding: "9px 20px", borderRadius: "9px", border: "none",
                        background: selectedPlan === "yearly" ? "linear-gradient(135deg, #fbbf24, #f59e0b)" : "transparent",
                        color: selectedPlan === "yearly" ? "#1a1a00" : "#94a3b8",
                        fontSize: "12px", fontWeight: 800, cursor: "pointer", position: "relative", letterSpacing: "0.3px",
                      }}>
                      ANUAL
                      <span style={{ position: "absolute", top: "-9px", right: "-12px", padding: "2px 7px", borderRadius: "20px", background: "#ef4444", color: "white", fontSize: "9px", fontWeight: 800 }}>-60%</span>
                    </button>
                    <button onClick={() => setSelectedPlan("monthly")} className="tf-toggle-btn"
                      style={{ padding: "9px 20px", borderRadius: "9px", border: "none",
                        background: selectedPlan === "monthly" ? `linear-gradient(135deg, ${FB_BLUE}, #4d8cf7)` : "transparent",
                        color: selectedPlan === "monthly" ? "white" : "#94a3b8",
                        fontSize: "12px", fontWeight: 800, cursor: "pointer", letterSpacing: "0.3px",
                      }}>
                      MENSUAL
                    </button>
                  </div>
                </div>

                <p style={{ textAlign: "center", fontSize: "13px", fontWeight: 700, color: FB_BLUE, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "8px" }}>
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
                        <span className="tf-pricing-price" style={{ fontSize: "72px", fontWeight: 900, color: "white", letterSpacing: "-0.04em", lineHeight: 1 }}>$20</span>
                        <span style={{ fontSize: "20px", color: FB_BLUE, marginLeft: "4px", fontWeight: 600 }}>/mes</span>
                      </div>
                      <p style={{ fontSize: "14px", color: "#94a3b8", marginTop: "8px" }}>
                        Pago único <strong style={{ color: "white" }}>$240/año</strong> · Ahorras $360
                      </p>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="tf-pricing-price" style={{ fontSize: "72px", fontWeight: 900, color: "white", letterSpacing: "-0.04em", lineHeight: 1 }}>$50</span>
                        <span style={{ fontSize: "20px", color: FB_BLUE, marginLeft: "4px", fontWeight: 600 }}>/mes</span>
                      </div>
                      <p style={{ fontSize: "14px", color: "#94a3b8", marginTop: "8px" }}>Sin compromiso · Cancela cuando quieras</p>
                    </>
                  )}
                </div>

                <div style={{ padding: "20px", borderRadius: "14px", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: "24px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: FB_BLUE, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "14px" }}>✦ Incluye:</p>
                  <div style={{ display: "grid", gap: "10px" }}>
                    {[
                      "TrustFace Desktop (Facebook) — Mac + Windows",
                      "TrustInsta Desktop (Instagram) — Mac + Windows",
                      "Panel SMM con +5,000 servicios",
                      "Marketplace, Mass DM, Grupos automation",
                      "Anti-detección + proxies premium",
                      "Warm-up automático y scheduler",
                      "Acceso prioritario y soporte directo",
                      "Updates gratuitos mientras seas Pro",
                    ].map((b) => (
                      <div key={b} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                        <Check size={16} color="#34d399" style={{ flexShrink: 0, marginTop: 2 }} />
                        <p style={{ fontSize: "13px", color: "#e2e8f0", lineHeight: 1.5 }}>{b}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={() => handleCheckout()} disabled={loading} className="tf-final-cta"
                  style={{
                    width: "100%", padding: "18px", borderRadius: "14px", border: "none",
                    background: loading ? "#1a1a2e" : selectedPlan === "yearly"
                      ? "linear-gradient(135deg, #fbbf24, #f59e0b)"
                      : `linear-gradient(135deg, ${FB_BLUE}, #4d8cf7)`,
                    color: loading ? "#64748b" : selectedPlan === "yearly" ? "#1a1a00" : "white",
                    fontSize: "17px", fontWeight: 900, cursor: loading ? "not-allowed" : "pointer",
                    letterSpacing: "0.3px",
                    boxShadow: loading ? "none" : selectedPlan === "yearly"
                      ? "0 8px 32px rgba(251, 191, 36, 0.4)"
                      : `0 8px 32px ${FB_BLUE}60`,
                    animation: loading ? "none" : "pulse-cta 2.5s ease-out infinite",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                  }}>
                  {loading ? "Procesando..." : selectedPlan === "yearly" ? "🚀 ACTIVAR ANUAL — $240/AÑO" : "🚀 ACTIVAR MENSUAL — $50/MES"}
                </button>
                <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "16px", flexWrap: "wrap" }}>
                  {["🔒 Pago seguro Stripe", "✓ 30 días de garantía", "⚡ Descarga inmediata"].map((t) => (
                    <span key={t} style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="tf-section" style={{ padding: "80px 20px" }}>
          <div style={{ maxWidth: "720px", margin: "0 auto" }}>
            <h2 style={{ textAlign: "center", fontSize: "clamp(24px, 4vw, 34px)", fontWeight: 800, color: "white", marginBottom: "40px", letterSpacing: "-0.02em" }}>Preguntas frecuentes</h2>
            <div style={{ display: "grid", gap: "10px" }}>
              {[
                { q: "¿Mis cuentas se baneann?", a: "No. TrustFace usa anti-detección de nivel enterprise: fingerprinting único por perfil, proxies residenciales/móviles, comportamiento humano simulado. Llevamos más de 500K cuentas operadas con tasa de baneo <0.5%." },
                { q: "¿Funciona en Mac y Windows?", a: "Sí. Disponible para macOS (Apple Silicon arm64) y Windows x64. La versión Mac Intel está próxima." },
                { q: "¿Puedo cancelar cuando quiera?", a: "Sí, sin permanencia. Si cancelas dentro de los 30 días te devolvemos el 100%." },
                { q: "¿Cuántas cuentas puedo manejar?", a: "Ilimitadas. Lo único que necesitas son proxies (puedes usar los nuestros). Usuarios reales manejan 50-500 cuentas a la vez sin problemas." },
                { q: "¿Qué incluye además de TrustFace?", a: "Tu suscripción Pro también desbloquea TrustInsta Desktop (mismo para Instagram) y acceso completo al panel SMM con +5,000 servicios." },
                { q: "¿Soporte en español?", a: "Sí. Equipo en Perú, respuesta menor a 1 hora en horario laboral." },
              ].map((f, i) => {
                const isOpen = openFaq === i;
                return (
                  <div key={i} style={{ borderRadius: "14px", background: "rgba(255,255,255,0.02)", border: `1px solid ${isOpen ? `${FB_BLUE}40` : "rgba(255,255,255,0.06)"}`, overflow: "hidden" }}>
                    <button onClick={() => setOpenFaq(isOpen ? null : i)}
                      style={{ width: "100%", padding: "18px 20px", background: "transparent", border: "none", color: "white", fontSize: "15px", fontWeight: 700, cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                      {f.q}
                      <ChevronDown size={18} color={FB_BLUE} style={{ flexShrink: 0, transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
                    </button>
                    {isOpen && <div style={{ padding: "0 20px 18px", fontSize: "14px", color: "#94a3b8", lineHeight: 1.6 }}>{f.a}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* FOOTER CTA */}
        <section className="tf-section" style={{ padding: "60px 20px 80px", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 900, color: "white", marginBottom: "12px", letterSpacing: "-0.02em" }}>Empieza hoy con TRUSTFACE Pro</h2>
          <p style={{ fontSize: "15px", color: "#94a3b8", marginBottom: "24px" }}>$240/año (= $20/mes) o $50/mes · Cancela cuando quieras</p>
          <button onClick={() => handleCheckout()} disabled={loading} className="tf-final-cta"
            style={{
              padding: "18px 36px", borderRadius: "14px", border: "none",
              background: `linear-gradient(135deg, ${FB_BLUE}, #4d8cf7)`,
              color: "white", fontSize: "16px", fontWeight: 900, cursor: "pointer",
              boxShadow: `0 8px 32px ${FB_BLUE}60`,
              display: "inline-flex", alignItems: "center", gap: "10px",
            }}>
            <Bot size={18} /> {loading ? "..." : "QUIERO TRUSTFACE PRO →"}
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
