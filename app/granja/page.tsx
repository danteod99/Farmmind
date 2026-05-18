"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/app/lib/supabase";
import {
  Check, Crown, Shield, Zap, Bot, Users,
  TrendingUp, Sparkles, ChevronDown
} from "lucide-react";

export default function GranjaPage() {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"yearly" | "monthly">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

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
          options: { redirectTo: `${window.location.origin}/granja?signin=1&plan=${plan}` },
        });
        if (error) alert("Error iniciando sesión: " + error.message);
        return;
      }
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
      const plan: "yearly" | "monthly" = planFromUrl === "yearly" ? "yearly" : "monthly";
      setSelectedPlan(plan);
      window.history.replaceState({}, "", "/granja");
      handleCheckout(plan);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const INCLUYE = [
    { icon: <Bot size={22} />, title: "TrustInsta Desktop", desc: "Instagram automation: multi-cuenta, anti-detección, scraper, warm-up. Mac + Windows." },
    { icon: <Users size={22} />, title: "TrustFace Desktop", desc: "Facebook automation: Marketplace, Mass DM, grupos. Mac + Windows." },
    { icon: <TrendingUp size={22} />, title: "Panel SMM", desc: "+5,000 servicios SMM: seguidores reales en IG, TikTok, FB, YouTube, Spotify y más." },
    { icon: <Shield size={22} />, title: "Anti-detección incluida", desc: "Proxies premium, fingerprints únicos, comportamiento humano. Cero baneos." },
    { icon: <Sparkles size={22} />, title: "Agente IA 24/7", desc: "Chat con asistente IA que ejecuta acciones directo en tus herramientas y resuelve dudas." },
    { icon: <Crown size={22} />, title: "Actualizaciones gratis", desc: "Cada feature nueva, mientras seas Pro. Soporte prioritario en menos de 1 hora." },
  ];

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
        @keyframes fade-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .gj-section { animation: fade-up 0.7s ease-out backwards; }

        @media (max-width: 768px) {
          .gj-hero { padding: 32px 16px 24px !important; }
          .gj-hero h1 { font-size: clamp(28px, 7.5vw, 40px) !important; line-height: 1.1 !important; }
          .gj-hero-cta { width: 100% !important; max-width: 320px !important; padding: 14px 22px !important; font-size: 15px !important; }
          .gj-section { padding-left: 16px !important; padding-right: 16px !important; padding-top: 48px !important; padding-bottom: 48px !important; }
          .gj-section h2 { font-size: clamp(22px, 5vw, 28px) !important; }
          .gj-feature-grid { grid-template-columns: 1fr !important; }
          .gj-feature-card { padding: 18px !important; }
          .gj-pricing-card { padding: 24px 18px !important; }
          .gj-pricing-price { font-size: 60px !important; }
          .gj-toggle-btn { padding: 8px 16px !important; font-size: 11px !important; }
        }
        @media (max-width: 420px) {
          .gj-hero h1 { font-size: 26px !important; }
          .gj-pricing-price { font-size: 52px !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#07070e" }}>

        {/* HERO */}
        <section className="gj-section gj-hero" style={{
          position: "relative", padding: "64px 24px 48px",
          background: "radial-gradient(ellipse 80% 50% at 50% 0%, #001830 0%, transparent 60%)",
          textAlign: "center",
        }}>
          <div style={{ maxWidth: "820px", margin: "0 auto" }}>

            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "6px 16px", borderRadius: "100px", background: "rgba(251, 191, 36, 0.1)", border: "1px solid rgba(251, 191, 36, 0.3)", marginBottom: "28px", fontSize: "12px", color: "#fbbf24", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.5px" }}>
              <Sparkles size={12} />
              Pago único de $50/mes — sin sorpresas
            </div>

            <h1 style={{
              fontSize: "clamp(36px, 7vw, 64px)",
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: "-0.04em",
              marginBottom: "24px",
            }}>
              <span style={{ color: "#ffffff" }}>Obtén tu </span>
              <span style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>granja de bots</span>
              <br />
              <span style={{ color: "#ffffff" }}>completa por </span>
              <span style={{ background: "linear-gradient(135deg, #00B4D8, #007ABF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>$50</span>
            </h1>

            <p style={{
              fontSize: "clamp(16px, 2vw, 19px)",
              color: "#94a3b8",
              maxWidth: "620px",
              margin: "0 auto 32px",
              lineHeight: 1.6,
            }}>
              <strong style={{ color: "white" }}>TrustInsta + TrustFace + Panel SMM + Agente IA</strong> — todo el ecosistema TRUST MIND en un solo precio. Sin contratar agencia, sin perder cuentas.
            </p>

            {/* HERO IMAGE */}
            <div style={{
              position: "relative",
              maxWidth: "780px",
              margin: "0 auto 32px",
              borderRadius: "20px",
              overflow: "hidden",
              boxShadow: "0 24px 80px rgba(251, 191, 36, 0.25), 0 0 0 1px rgba(255,255,255,0.08)",
              aspectRatio: "16/9",
              background: "linear-gradient(135deg, #001830, #000810)",
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/oferta/ejercito-bots.png"
                alt="Granja de bots TrustMind"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)",
                padding: "24px 22px 16px", textAlign: "left",
              }}>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "2px" }}>
                  ⚡ TODO el ecosistema · 1 solo precio
                </p>
              </div>
            </div>

            <button onClick={scrollToCta} className="gj-hero-cta"
              style={{
                padding: "18px 36px",
                borderRadius: "14px",
                border: "none",
                background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                color: "#1a1a00",
                fontSize: "17px",
                fontWeight: 900,
                cursor: "pointer",
                boxShadow: "0 8px 32px rgba(251, 191, 36, 0.4)",
                animation: "pulse-cta 2.5s ease-out infinite",
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "10px",
                letterSpacing: "0.2px",
              }}>
              <Sparkles size={18} /> QUIERO MI GRANJA POR $50 →
            </button>

            <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "16px", flexWrap: "wrap" }}>
              {["Acceso inmediato", "Cancela cuando quieras", "30 días de garantía"].map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Zap size={12} color="#34d399" />
                  <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 500 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* QUÉ INCLUYE */}
        <section className="gj-section" style={{ padding: "72px 24px", background: "linear-gradient(180deg, #08080f, #07070e)" }}>
          <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
            <p style={{ textAlign: "center", fontSize: "12px", fontWeight: 700, color: "#34d399", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "16px" }}>Por $50/mes recibes</p>
            <h2 style={{ textAlign: "center", fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 800, color: "white", marginBottom: "16px", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
              Tu <span style={{ color: "#fbbf24" }}>granja de bots</span> lista para escalar
            </h2>
            <p style={{ textAlign: "center", fontSize: "16px", color: "#94a3b8", maxWidth: "600px", margin: "0 auto 48px", lineHeight: 1.6 }}>
              Otros venden estos productos por separado a $200+ al mes. Nosotros te lo damos todo por uno solo.
            </p>

            <div className="gj-feature-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
              {INCLUYE.map((f) => (
                <div key={f.title} className="gj-feature-card" style={{ padding: "24px", borderRadius: "16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(251, 191, 36, 0.12)", border: "1px solid rgba(251, 191, 36, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fbbf24", marginBottom: "14px" }}>
                    {f.icon}
                  </div>
                  <h3 style={{ fontSize: "15px", fontWeight: 700, color: "white", marginBottom: "6px" }}>{f.title}</h3>
                  <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* COMPARACIÓN */}
        <section className="gj-section" style={{ padding: "72px 24px", background: "#08080f" }}>
          <div style={{ maxWidth: "780px", margin: "0 auto" }}>
            <p style={{ textAlign: "center", fontSize: "12px", fontWeight: 700, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "16px" }}>El verdadero costo</p>
            <h2 style={{ textAlign: "center", fontSize: "clamp(24px, 4vw, 34px)", fontWeight: 800, color: "white", marginBottom: "32px", letterSpacing: "-0.02em" }}>
              Compara los precios del mercado
            </h2>

            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "20px", overflow: "hidden" }}>
              {[
                { label: "Software multi-cuenta Instagram", others: "$79/mes", ours: "Incluido" },
                { label: "Software multi-cuenta Facebook", others: "$79/mes", ours: "Incluido" },
                { label: "Panel SMM con +5,000 servicios", others: "$50 setup", ours: "Incluido" },
                { label: "Anti-detección + proxies premium", others: "$40/mes", ours: "Incluido" },
                { label: "Asistente IA dedicado 24/7", others: "$30/mes", ours: "Incluido" },
              ].map((row, i) => (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr",
                  padding: "14px 20px",
                  borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.04)",
                  alignItems: "center",
                  gap: "10px",
                }}>
                  <span style={{ fontSize: "14px", color: "#e2e8f0" }}>{row.label}</span>
                  <span style={{ fontSize: "13px", color: "#94a3b8", textDecoration: "line-through" }}>{row.others}</span>
                  <span style={{ fontSize: "13px", color: "#34d399", fontWeight: 700 }}>✓ {row.ours}</span>
                </div>
              ))}
              <div style={{
                display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr",
                padding: "18px 20px",
                borderTop: "2px solid rgba(251, 191, 36, 0.25)",
                background: "rgba(251, 191, 36, 0.04)",
                alignItems: "center",
                gap: "10px",
              }}>
                <span style={{ fontSize: "15px", color: "white", fontWeight: 800 }}>Total mensual</span>
                <span style={{ fontSize: "15px", color: "#ef4444", fontWeight: 700, textDecoration: "line-through" }}>~$280/mes</span>
                <span style={{ fontSize: "20px", color: "#fbbf24", fontWeight: 900 }}>$50/mes</span>
              </div>
            </div>
            <p style={{ textAlign: "center", fontSize: "13px", color: "#94a3b8", marginTop: "16px" }}>
              Ahorras <strong style={{ color: "white" }}>$230 cada mes</strong> respecto a comprar las herramientas por separado.
            </p>
          </div>
        </section>

        {/* PRICING (CTA principal) */}
        <section ref={ctaRef} className="gj-section" style={{ padding: "72px 24px", background: "linear-gradient(180deg, #08080f, #001830 50%, #08080f)" }}>
          <div style={{ maxWidth: "640px", margin: "0 auto" }}>
            <p style={{ textAlign: "center", fontSize: "12px", fontWeight: 700, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "16px" }}>Tu granja por</p>
            <h2 style={{ textAlign: "center", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 900, color: "white", marginBottom: "32px", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
              <span style={{ color: "#fbbf24" }}>$50/mes</span> — todo incluido
            </h2>

            <div className="gj-pricing-card" style={{
              position: "relative",
              padding: "40px 32px",
              borderRadius: "24px",
              background: "linear-gradient(160deg, #001830 0%, #000810 100%)",
              border: "2px solid #fbbf24",
              boxShadow: "0 24px 80px rgba(251, 191, 36, 0.18)",
              overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: "-80px", right: "-80px", width: "300px", height: "300px", borderRadius: "50%", background: "radial-gradient(circle, rgba(251,191,36,0.25), transparent 70%)", filter: "blur(40px)", pointerEvents: "none" }} />

              <div style={{ position: "relative", zIndex: 1 }}>
                {/* Toggle */}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
                  <div style={{ display: "inline-flex", padding: "4px", borderRadius: "12px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)", gap: "3px" }}>
                    <button onClick={() => setSelectedPlan("monthly")} className="gj-toggle-btn"
                      style={{
                        padding: "10px 22px", borderRadius: "10px", border: "none",
                        background: selectedPlan === "monthly" ? "linear-gradient(135deg, #fbbf24, #f59e0b)" : "transparent",
                        color: selectedPlan === "monthly" ? "#1a1a00" : "#94a3b8",
                        fontSize: "12px", fontWeight: 800, cursor: "pointer", letterSpacing: "0.3px",
                      }}>
                      MENSUAL
                    </button>
                    <button onClick={() => setSelectedPlan("yearly")} className="gj-toggle-btn"
                      style={{
                        padding: "10px 22px", borderRadius: "10px", border: "none",
                        background: selectedPlan === "yearly" ? "linear-gradient(135deg, #007ABF, #00B4D8)" : "transparent",
                        color: selectedPlan === "yearly" ? "white" : "#94a3b8",
                        fontSize: "12px", fontWeight: 800, cursor: "pointer", position: "relative", letterSpacing: "0.3px",
                      }}>
                      ANUAL
                      <span style={{ position: "absolute", top: "-9px", right: "-12px", padding: "2px 7px", borderRadius: "20px", background: "#34d399", color: "#003020", fontSize: "9px", fontWeight: 800 }}>-60%</span>
                    </button>
                  </div>
                </div>

                {/* Precio */}
                <div style={{ textAlign: "center", marginBottom: "24px" }}>
                  {selectedPlan === "monthly" ? (
                    <>
                      <div>
                        <span className="gj-pricing-price" style={{ fontSize: "80px", fontWeight: 900, color: "white", letterSpacing: "-0.04em", lineHeight: 1 }}>$50</span>
                        <span style={{ fontSize: "22px", color: "#fbbf24", marginLeft: "4px", fontWeight: 700 }}>/mes</span>
                      </div>
                      <p style={{ fontSize: "14px", color: "#94a3b8", marginTop: "10px" }}>
                        Acceso completo a todo el ecosistema · Cancela cuando quieras
                      </p>
                    </>
                  ) : (
                    <>
                      <div style={{ marginBottom: "8px" }}>
                        <span style={{ fontSize: "18px", color: "#64748b", textDecoration: "line-through" }}>$50/mes</span>
                        <span style={{ marginLeft: "10px", padding: "2px 8px", borderRadius: "6px", background: "rgba(239, 68, 68, 0.15)", color: "#fca5a5", fontSize: "11px", fontWeight: 700 }}>-60%</span>
                      </div>
                      <div>
                        <span className="gj-pricing-price" style={{ fontSize: "80px", fontWeight: 900, color: "white", letterSpacing: "-0.04em", lineHeight: 1 }}>$20</span>
                        <span style={{ fontSize: "22px", color: "#7dd3fc", marginLeft: "4px", fontWeight: 700 }}>/mes</span>
                      </div>
                      <p style={{ fontSize: "14px", color: "#94a3b8", marginTop: "10px" }}>
                        Pago único de <strong style={{ color: "white" }}>$240/año</strong> · Ahorras $360
                      </p>
                    </>
                  )}
                </div>

                {/* Bullets */}
                <div style={{ padding: "20px", borderRadius: "14px", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: "24px" }}>
                  <p style={{ fontSize: "12px", fontWeight: 700, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "14px" }}>✦ Incluye:</p>
                  <div style={{ display: "grid", gap: "10px" }}>
                    {[
                      "TrustInsta Desktop (Instagram automation)",
                      "TrustFace Desktop (Facebook automation)",
                      "Panel SMM con +5,000 servicios",
                      "Proxies premium y anti-detección",
                      "Agente IA 24/7",
                      "Soporte directo (<1 hora)",
                      "Actualizaciones gratis siempre",
                    ].map((b) => (
                      <div key={b} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                        <Check size={16} color="#34d399" style={{ flexShrink: 0, marginTop: 2 }} />
                        <p style={{ fontSize: "13px", color: "#e2e8f0", lineHeight: 1.5 }}>{b}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={() => handleCheckout()} disabled={loading}
                  style={{
                    width: "100%", padding: "18px", borderRadius: "14px", border: "none",
                    background: loading ? "#1a1a2e" : selectedPlan === "monthly"
                      ? "linear-gradient(135deg, #fbbf24, #f59e0b)"
                      : "linear-gradient(135deg, #007ABF, #00B4D8)",
                    color: loading ? "#64748b" : selectedPlan === "monthly" ? "#1a1a00" : "white",
                    fontSize: "17px", fontWeight: 900,
                    cursor: loading ? "not-allowed" : "pointer", letterSpacing: "0.3px",
                    boxShadow: loading ? "none" : selectedPlan === "monthly"
                      ? "0 8px 32px rgba(251, 191, 36, 0.45)"
                      : "0 8px 32px rgba(0, 180, 216, 0.45)",
                    animation: loading ? "none" : "pulse-cta 2.5s ease-out infinite",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                  }}>
                  {loading ? "Procesando..." : selectedPlan === "monthly" ? "🚀 OBTENER MI GRANJA — $50/MES" : "🚀 OBTENER ANUAL — $240/AÑO"}
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
        <section className="gj-section" style={{ padding: "72px 24px" }}>
          <div style={{ maxWidth: "720px", margin: "0 auto" }}>
            <h2 style={{ textAlign: "center", fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 800, color: "white", marginBottom: "40px", letterSpacing: "-0.02em" }}>Preguntas frecuentes</h2>
            <div style={{ display: "grid", gap: "10px" }}>
              {[
                { q: "¿$50/mes incluye REALMENTE todo?", a: "Sí, todo el ecosistema: TrustInsta Desktop, TrustFace Desktop, panel SMM con +5,000 servicios, proxies, anti-detección y agente IA. Es el bundle completo, sin add-ons ocultos." },
                { q: "¿Cuántas cuentas puedo manejar?", a: "Ilimitadas. Lo único que necesitas son proxies (usamos los nuestros). Usuarios reales manejan 50-500 cuentas activas simultáneamente." },
                { q: "¿Puedo cancelar cuando quiera?", a: "Sí, sin permanencia. Si cancelas en los primeros 30 días te devolvemos el 100% del dinero." },
                { q: "¿Mac y Windows?", a: "TrustInsta y TrustFace funcionan en Mac (Apple Silicon arm64) y Windows x64. Mac Intel próximamente." },
                { q: "¿Cómo es el soporte?", a: "Equipo en Perú con respuesta menor a 1 hora en horario laboral. Acceso prioritario para usuarios Pro." },
                { q: "¿Por qué es tan barato?", a: "Porque no somos una agencia con oficinas y empleados costosos. Somos un equipo pequeño que ya tiene la infraestructura — el precio es real, no subsidiado." },
              ].map((f, i) => {
                const isOpen = openFaq === i;
                return (
                  <div key={i} style={{ borderRadius: "14px", background: "rgba(255,255,255,0.02)", border: `1px solid ${isOpen ? "rgba(251, 191, 36, 0.4)" : "rgba(255,255,255,0.06)"}`, overflow: "hidden" }}>
                    <button onClick={() => setOpenFaq(isOpen ? null : i)}
                      style={{ width: "100%", padding: "18px 20px", background: "transparent", border: "none", color: "white", fontSize: "15px", fontWeight: 700, cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                      {f.q}
                      <ChevronDown size={18} color="#fbbf24" style={{ flexShrink: 0, transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
                    </button>
                    {isOpen && <div style={{ padding: "0 20px 18px", fontSize: "14px", color: "#94a3b8", lineHeight: 1.6 }}>{f.a}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="gj-section" style={{ padding: "60px 24px 80px", textAlign: "center", background: "linear-gradient(180deg, #07070e, #001830)" }}>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 900, color: "white", marginBottom: "12px", letterSpacing: "-0.02em" }}>
            Empieza tu granja de bots por <span style={{ color: "#fbbf24" }}>$50</span>
          </h2>
          <p style={{ fontSize: "15px", color: "#94a3b8", marginBottom: "24px" }}>Sin permanencia · 30 días de garantía · Acceso inmediato</p>
          <button onClick={() => handleCheckout()} disabled={loading} className="gj-hero-cta"
            style={{
              padding: "18px 36px", borderRadius: "14px", border: "none",
              background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
              color: "#1a1a00", fontSize: "16px", fontWeight: 900,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 8px 32px rgba(251, 191, 36, 0.4)",
              display: "inline-flex", alignItems: "center", gap: "10px",
            }}>
            {loading ? "..." : "QUIERO MI GRANJA AHORA →"}
          </button>
        </section>

        {/* FOOTER */}
        <footer style={{ padding: "32px 20px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.04)", background: "#040410" }}>
          <p style={{ fontSize: "13px", color: "#94a3b8", fontWeight: 700, letterSpacing: "3px", marginBottom: "8px" }}>TRUST MIND</p>
          <p style={{ fontSize: "11px", color: "#475569" }}>© {new Date().getFullYear()} TRUST MIND · OLIVEROS MKT EIRL · Todos los derechos reservados</p>
        </footer>
      </div>
    </>
  );
}
