"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/app/lib/supabase";
import {
  Check, X as XIcon, Zap, Clock, Bot, ChevronDown, Sparkles, ShoppingBag, DollarSign, Repeat
} from "lucide-react";

const FB_BLUE = "#1877F2";
const FB_CYAN = "#00B0FF";

export default function MarketplacePage() {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"yearly" | "monthly">("yearly");
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
      window.history.replaceState({}, "", "/marketplace");
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
          0%, 100% { box-shadow: 0 0 0 0 ${FB_CYAN}90; }
          50% { box-shadow: 0 0 0 18px ${FB_CYAN}00; }
        }
        @keyframes fade-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .mk-section { animation: fade-up 0.7s ease-out backwards; }

        @media (max-width: 768px) {
          .mk-hero { padding: 24px 16px 20px !important; }
          .mk-hero h1 { font-size: clamp(28px, 8vw, 40px) !important; line-height: 1.1 !important; }
          .mk-hero h2 { font-size: clamp(20px, 6vw, 28px) !important; }
          .mk-stats-grid { grid-template-columns: 1fr !important; gap: 10px !important; }
          .mk-stat-card { padding: 14px 16px !important; }
          .mk-cta-primary { padding: 14px 22px !important; font-size: 14px !important; width: 100% !important; max-width: 340px !important; }
          .mk-section { padding-left: 16px !important; padding-right: 16px !important; padding-top: 48px !important; padding-bottom: 48px !important; }
          .mk-section h2 { font-size: clamp(22px, 5vw, 28px) !important; }
          .mk-features-grid { grid-template-columns: 1fr !important; }
          .mk-pricing-card { padding: 24px 18px !important; border-radius: 18px !important; }
          .mk-pricing-price { font-size: 56px !important; }
          .mk-toggle-btn { padding: 8px 16px !important; font-size: 11px !important; }
        }
        @media (max-width: 420px) {
          .mk-hero h1 { font-size: 26px !important; }
          .mk-pricing-price { font-size: 48px !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#07070e" }}>

        {/* HERO */}
        <section className="mk-section mk-hero" style={{
          position: "relative", padding: "44px 20px 36px",
          background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${FB_BLUE}25 0%, transparent 60%)`,
          textAlign: "center",
        }}>
          <div style={{ maxWidth: "880px", margin: "0 auto" }}>

            {/* Image */}
            <div style={{
              position: "relative",
              maxWidth: "640px",
              margin: "0 auto 32px",
              borderRadius: "20px",
              overflow: "hidden",
              boxShadow: `0 24px 80px ${FB_BLUE}40, 0 0 0 1px rgba(255,255,255,0.08)`,
              background: "linear-gradient(135deg, #001830, #000810)",
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/marketplace/hero.png"
                alt="Vende en automático en Facebook Marketplace 24/7"
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>

            <h1 style={{
              fontSize: "clamp(34px, 6.5vw, 60px)",
              fontWeight: 900,
              lineHeight: 1.02,
              letterSpacing: "-0.04em",
              marginBottom: "14px",
              color: "white",
              textTransform: "uppercase",
            }}>
              Vende en automático
            </h1>
            <h2 style={{
              fontSize: "clamp(22px, 4vw, 36px)",
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              marginBottom: "24px",
              background: `linear-gradient(135deg, ${FB_CYAN}, ${FB_BLUE})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textTransform: "uppercase",
              fontStyle: "italic",
            }}>
              en Facebook Marketplace
            </h2>
            <p style={{ fontSize: "18px", fontWeight: 700, color: "white", marginBottom: "32px" }}>24/7.</p>

            {/* STATS BAR */}
            <div className="mk-stats-grid" style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "12px",
              marginBottom: "28px",
              maxWidth: "720px", margin: "0 auto 28px",
            }}>
              {[
                { value: "+1,200", label: "BOTS Activos hoy", icon: <Bot size={18} /> },
                { value: "+S/ 480K", label: "Vendido este mes", icon: <DollarSign size={18} /> },
                { value: "24/7", label: "Operación continua", icon: <Repeat size={18} /> },
              ].map((s, i) => (
                <div key={i} className="mk-stat-card" style={{
                  padding: "16px 18px",
                  borderRadius: "14px",
                  background: `linear-gradient(135deg, #001830, #00081A)`,
                  border: `1px solid ${FB_BLUE}50`,
                  textAlign: "center",
                  position: "relative",
                  overflow: "hidden",
                }}>
                  <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, borderRadius: "50%", background: `radial-gradient(circle, ${FB_CYAN}20, transparent 70%)`, pointerEvents: "none" }} />
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <div style={{ color: FB_CYAN, marginBottom: 4, display: "flex", justifyContent: "center" }}>{s.icon}</div>
                    <div style={{ fontSize: "clamp(20px, 4vw, 24px)", fontWeight: 900, color: "white", letterSpacing: "-0.02em" }}>{s.value}</div>
                    <div style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600, marginTop: 2 }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA primary — botón pill estilo creativo */}
            <button onClick={scrollToCta} className="mk-cta-primary"
              style={{
                padding: "18px 44px",
                borderRadius: "100px",
                border: "none",
                background: `linear-gradient(135deg, ${FB_CYAN}, ${FB_BLUE})`,
                color: "white",
                fontSize: "16px",
                fontWeight: 900,
                cursor: "pointer",
                boxShadow: `0 8px 32px ${FB_CYAN}50`,
                animation: "pulse-cta 2.5s ease-out infinite",
                letterSpacing: "1px",
                textTransform: "uppercase",
              }}>
              OBTENER ACCESO VIP →
            </button>
            <p style={{ fontSize: "12px", color: "#64748b", marginTop: "14px" }}>
              Activación inmediata · 30 días de garantía · Cancela cuando quieras
            </p>
          </div>
        </section>

        {/* DEMO VIDEO */}
        <section className="mk-section" style={{ padding: "32px 20px 48px", background: "#08080f" }}>
          <div style={{ maxWidth: "900px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: FB_CYAN, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "8px" }}>Demo · 3 min</p>
              <h2 style={{ fontSize: "clamp(22px, 4vw, 30px)", fontWeight: 800, color: "white", letterSpacing: "-0.02em", textTransform: "uppercase" }}>
                Marketplace <span style={{ color: FB_CYAN }}>en acción</span>
              </h2>
            </div>
            <div style={{ position: "relative", paddingBottom: "65.06%", height: 0, borderRadius: "20px", overflow: "hidden", boxShadow: `0 24px 80px ${FB_BLUE}40` }}>
              <iframe src="https://www.loom.com/embed/e0a161991f3f4be0abd1376df0270895" allowFullScreen style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }} />
            </div>
          </div>
        </section>

        {/* PROBLEMA vs SOLUCIÓN visual breakdown */}
        <section className="mk-section" style={{ padding: "60px 20px", background: "#08080f" }}>
          <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
            <div className="mk-features-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              {/* Problema */}
              <div style={{ padding: "28px", borderRadius: "20px", background: "rgba(239, 68, 68, 0.04)", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                <p style={{ fontSize: "12px", fontWeight: 800, color: "#ef4444", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "16px" }}>el problema</p>
                {[
                  "Vender uno por uno",
                  "Sin ventas todos los días",
                  "Sin tiempo para escalar",
                  "Cada cuenta te toma horas",
                  "Compradores que no responden",
                ].map((p, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 0", borderTop: i === 0 ? "none" : "1px solid rgba(239,68,68,0.1)" }}>
                    <XIcon size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 3 }} />
                    <p style={{ fontSize: "14px", color: "#e2e8f0", lineHeight: 1.5 }}>{p}</p>
                  </div>
                ))}
              </div>

              {/* Solución */}
              <div style={{ padding: "28px", borderRadius: "20px", background: `${FB_BLUE}10`, border: `1px solid ${FB_BLUE}40`, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: `radial-gradient(circle, ${FB_CYAN}25, transparent 70%)`, pointerEvents: "none" }} />
                <div style={{ position: "relative", zIndex: 1 }}>
                  <p style={{ fontSize: "12px", fontWeight: 800, color: FB_CYAN, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "16px" }}>la solución</p>
                  {[
                    "El software vende por ti — 24/7",
                    "Publica en cientos de cuentas a la vez",
                    "Auto-respuesta inteligente a compradores",
                    "Reposteo automático para mantener feed activo",
                    "Scrapea Marketplace para encontrar productos hot",
                  ].map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 0", borderTop: i === 0 ? "none" : `1px solid ${FB_BLUE}20` }}>
                      <Check size={16} color={FB_CYAN} style={{ flexShrink: 0, marginTop: 3 }} />
                      <p style={{ fontSize: "14px", color: "#e2e8f0", lineHeight: 1.5 }}>{s}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="mk-section" style={{ padding: "72px 20px", background: "linear-gradient(180deg, #08080f, #07070e)" }}>
          <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
            <p style={{ textAlign: "center", fontSize: "12px", fontWeight: 700, color: FB_CYAN, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "12px" }}>El software</p>
            <h2 style={{ textAlign: "center", fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 900, color: "white", marginBottom: "16px", lineHeight: 1.2, letterSpacing: "-0.02em", textTransform: "uppercase" }}>
              Marketplace en <span style={{ color: FB_CYAN }}>piloto automático</span>
            </h2>
            <p style={{ textAlign: "center", fontSize: "15px", color: "#94a3b8", maxWidth: "600px", margin: "0 auto 40px" }}>
              TrustFace Desktop maneja cientos de cuentas Facebook a la vez. Tú duermes, él vende.
            </p>

            <div className="mk-features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
              {[
                { icon: <ShoppingBag size={22} />, title: "Publicación masiva", desc: "Sube el mismo producto en 50, 100 o 500 cuentas a la vez con variaciones automáticas de título y descripción para evitar duplicados." },
                { icon: <Repeat size={22} />, title: "Reposteo automático", desc: "Cada listing se republica cada X horas para mantener tu feed siempre arriba en los resultados de Marketplace." },
                { icon: <Bot size={22} />, title: "Auto-respuesta inteligente", desc: "Cuando un comprador escribe, el bot responde con tu template, le pide datos y te avisa cuando hay venta cerrada." },
                { icon: <Zap size={22} />, title: "Multi-cuenta sin baneos", desc: "Anti-detección de nivel enterprise: proxies residenciales, fingerprints únicos, comportamiento humano simulado." },
                { icon: <Bot size={22} />, title: "Scraper de listings hot", desc: "Encuentra qué se está vendiendo más en tu ciudad y replícalo en automático en tus cuentas." },
                { icon: <DollarSign size={22} />, title: "Métricas en vivo", desc: "Dashboard con ventas, conversaciones, mejores productos y proyección mensual. Sabes cuánto facturas en cada momento." },
              ].map((f) => (
                <div key={f.title} style={{ padding: "22px", borderRadius: "16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: `${FB_BLUE}20`, border: `1px solid ${FB_BLUE}40`, display: "flex", alignItems: "center", justifyContent: "center", color: FB_CYAN, marginBottom: 12 }}>
                    {f.icon}
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 6 }}>{f.title}</h3>
                  <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section ref={ctaRef} className="mk-section" style={{ padding: "80px 20px", background: `linear-gradient(180deg, #08080f, ${FB_BLUE}15 50%, #08080f)` }}>
          <div style={{ maxWidth: "640px", margin: "0 auto" }}>
            <p style={{ textAlign: "center", fontSize: "12px", fontWeight: 700, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "16px" }}>Acceso VIP</p>
            <h2 style={{ textAlign: "center", fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 900, color: "white", marginBottom: "16px", letterSpacing: "-0.02em", textTransform: "uppercase" }}>
              Empieza a <span style={{ color: FB_CYAN }}>vender hoy</span>
            </h2>
            <p style={{ textAlign: "center", fontSize: "15px", color: "#94a3b8", marginBottom: "32px" }}>
              Software completo + soporte directo · <strong style={{ color: "white" }}>$50/mes</strong> o <strong style={{ color: "white" }}>$20/mes</strong> facturado anual.
            </p>

            <div className="mk-pricing-card" style={{
              position: "relative",
              padding: "40px 32px",
              borderRadius: "24px",
              background: `linear-gradient(160deg, ${FB_BLUE}15 0%, #000810 100%)`,
              border: `2px solid ${FB_CYAN}`,
              boxShadow: `0 24px 80px ${FB_CYAN}30`,
              overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: "-80px", right: "-80px", width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle, ${FB_CYAN}30, transparent 70%)`, filter: "blur(40px)" }} />

              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                  <span style={{ padding: "5px 14px", borderRadius: "100px", background: "linear-gradient(135deg, #fbbf24, #f59e0b)", color: "#1a1a00", fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>🔥 Acceso VIP limitado</span>
                </div>

                <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                  <div style={{ display: "inline-flex", padding: 4, borderRadius: 12, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)", gap: 3 }}>
                    <button onClick={() => setSelectedPlan("yearly")} className="mk-toggle-btn"
                      style={{ padding: "9px 20px", borderRadius: 9, border: "none",
                        background: selectedPlan === "yearly" ? "linear-gradient(135deg, #fbbf24, #f59e0b)" : "transparent",
                        color: selectedPlan === "yearly" ? "#1a1a00" : "#94a3b8",
                        fontSize: 12, fontWeight: 800, cursor: "pointer", position: "relative", letterSpacing: 0.3,
                      }}>
                      ANUAL
                      <span style={{ position: "absolute", top: -9, right: -12, padding: "2px 7px", borderRadius: 20, background: "#ef4444", color: "white", fontSize: 9, fontWeight: 800 }}>-60%</span>
                    </button>
                    <button onClick={() => setSelectedPlan("monthly")} className="mk-toggle-btn"
                      style={{ padding: "9px 20px", borderRadius: 9, border: "none",
                        background: selectedPlan === "monthly" ? `linear-gradient(135deg, ${FB_CYAN}, ${FB_BLUE})` : "transparent",
                        color: selectedPlan === "monthly" ? "white" : "#94a3b8",
                        fontSize: 12, fontWeight: 800, cursor: "pointer", letterSpacing: 0.3,
                      }}>
                      MENSUAL
                    </button>
                  </div>
                </div>

                <p style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: FB_CYAN, textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>
                  Acceso VIP · {selectedPlan === "yearly" ? "Plan Anual" : "Plan Mensual"}
                </p>

                <div style={{ textAlign: "center", marginBottom: 24 }}>
                  {selectedPlan === "yearly" ? (
                    <>
                      <div style={{ display: "inline-flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
                        <span style={{ fontSize: 20, color: "#64748b", textDecoration: "line-through" }}>$50/mes</span>
                        <span style={{ padding: "2px 8px", borderRadius: 6, background: "rgba(239, 68, 68, 0.15)", color: "#fca5a5", fontSize: 11, fontWeight: 700 }}>-60%</span>
                      </div>
                      <div>
                        <span className="mk-pricing-price" style={{ fontSize: 72, fontWeight: 900, color: "white", letterSpacing: "-0.04em", lineHeight: 1 }}>$20</span>
                        <span style={{ fontSize: 20, color: FB_CYAN, marginLeft: 4, fontWeight: 600 }}>/mes</span>
                      </div>
                      <p style={{ fontSize: 14, color: "#94a3b8", marginTop: 8 }}>
                        Pago único <strong style={{ color: "white" }}>$240/año</strong> · Ahorras $360
                      </p>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="mk-pricing-price" style={{ fontSize: 72, fontWeight: 900, color: "white", letterSpacing: "-0.04em", lineHeight: 1 }}>$50</span>
                        <span style={{ fontSize: 20, color: FB_CYAN, marginLeft: 4, fontWeight: 600 }}>/mes</span>
                      </div>
                      <p style={{ fontSize: 14, color: "#94a3b8", marginTop: 8 }}>Cancela cuando quieras</p>
                    </>
                  )}
                </div>

                <div style={{ padding: 20, borderRadius: 14, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 24 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: FB_CYAN, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>✦ Incluye:</p>
                  <div style={{ display: "grid", gap: 10 }}>
                    {[
                      "TrustFace Desktop (Marketplace automation)",
                      "Multi-cuenta ilimitada con anti-detección",
                      "Auto-respuesta a compradores",
                      "Reposteo automático cada X horas",
                      "Scraper de productos hot en tu ciudad",
                      "Templates personalizables por nicho",
                      "Soporte directo en menos de 1 hora",
                      "TrustInsta + Panel SMM también incluidos",
                    ].map((b) => (
                      <div key={b} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <Check size={16} color={FB_CYAN} style={{ flexShrink: 0, marginTop: 2 }} />
                        <p style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.5 }}>{b}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={() => handleCheckout()} disabled={loading}
                  style={{
                    width: "100%", padding: 18, borderRadius: 100, border: "none",
                    background: loading ? "#1a1a2e" : selectedPlan === "yearly"
                      ? "linear-gradient(135deg, #fbbf24, #f59e0b)"
                      : `linear-gradient(135deg, ${FB_CYAN}, ${FB_BLUE})`,
                    color: loading ? "#64748b" : selectedPlan === "yearly" ? "#1a1a00" : "white",
                    fontSize: 16, fontWeight: 900, cursor: loading ? "not-allowed" : "pointer", letterSpacing: 1, textTransform: "uppercase",
                    boxShadow: loading ? "none" : `0 8px 32px ${FB_CYAN}60`,
                    animation: loading ? "none" : "pulse-cta 2.5s ease-out infinite",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  }}>
                  {loading ? "Procesando..." : "OBTENER ACCESO VIP →"}
                </button>
                <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
                  {["🔒 Pago seguro Stripe", "✓ 30 días de garantía", "⚡ Acceso inmediato"].map((t) => (
                    <span key={t} style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mk-section" style={{ padding: "72px 20px" }}>
          <div style={{ maxWidth: "720px", margin: "0 auto" }}>
            <h2 style={{ textAlign: "center", fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 800, color: "white", marginBottom: 32, letterSpacing: "-0.02em" }}>Preguntas frecuentes</h2>
            <div style={{ display: "grid", gap: 10 }}>
              {[
                { q: "¿Realmente funciona sin baneos?", a: "Sí. Usamos anti-detección de nivel enterprise: proxies residenciales únicos por cuenta, fingerprints distintos, delays humanos. Tasa de baneo histórica <0.5% con uso correcto." },
                { q: "¿Cuántas cuentas FB necesito?", a: "Mínimo 5-10 para empezar a ver resultados serios. Lo ideal: 50-200 cuentas distribuidas en 2-3 ciudades para no saturar Marketplace local." },
                { q: "¿Funciona en Perú/México/Colombia?", a: "Sí. Hemos validado en Perú, México, Colombia, Argentina, Chile, Ecuador, RD, Bolivia y USA. Marketplace funciona similar en todos los países." },
                { q: "¿Y si no tengo producto?", a: "El scraper te muestra qué productos están vendiéndose más en tu ciudad. Puedes hacer dropshipping desde proveedores locales o importar desde China." },
                { q: "¿Cuánto facturo en el primer mes?", a: "Usuarios con 10-20 cuentas y producto correcto facturan $1,500-$5,000 USD el primer mes. Lo que rentas depende del producto, ciudad y horas invertidas." },
                { q: "¿Software para Mac y Windows?", a: "Sí. TrustFace Desktop funciona en macOS Apple Silicon y Windows x64. Mac Intel próximamente." },
              ].map((f, i) => {
                const isOpen = openFaq === i;
                return (
                  <div key={i} style={{ borderRadius: 14, background: "rgba(255,255,255,0.02)", border: `1px solid ${isOpen ? `${FB_CYAN}40` : "rgba(255,255,255,0.06)"}`, overflow: "hidden" }}>
                    <button onClick={() => setOpenFaq(isOpen ? null : i)}
                      style={{ width: "100%", padding: "18px 20px", background: "transparent", border: "none", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                      {f.q}
                      <ChevronDown size={18} color={FB_CYAN} style={{ flexShrink: 0, transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
                    </button>
                    {isOpen && <div style={{ padding: "0 20px 18px", fontSize: 14, color: "#94a3b8", lineHeight: 1.6 }}>{f.a}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="mk-section" style={{ padding: "60px 20px 80px", textAlign: "center", background: `linear-gradient(180deg, #07070e, ${FB_BLUE}20)` }}>
          <h2 style={{ fontSize: "clamp(24px, 4vw, 34px)", fontWeight: 900, color: "white", marginBottom: 12, letterSpacing: "-0.02em", textTransform: "uppercase" }}>
            El software vende <span style={{ color: FB_CYAN }}>por ti</span>
          </h2>
          <p style={{ fontSize: 15, color: "#94a3b8", marginBottom: 24 }}>$240/año (= $20/mes) o $50/mes · Acceso VIP inmediato</p>
          <button onClick={() => handleCheckout()} disabled={loading} className="mk-cta-primary"
            style={{
              padding: "18px 44px", borderRadius: 100, border: "none",
              background: `linear-gradient(135deg, ${FB_CYAN}, ${FB_BLUE})`,
              color: "white", fontSize: 16, fontWeight: 900, cursor: loading ? "not-allowed" : "pointer",
              boxShadow: `0 8px 32px ${FB_CYAN}60`,
              letterSpacing: 1, textTransform: "uppercase",
              display: "inline-flex", alignItems: "center", gap: 10,
            }}>
            <Sparkles size={18} /> {loading ? "..." : "OBTENER ACCESO VIP →"}
          </button>
        </section>

        <footer style={{ padding: "32px 20px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.04)", background: "#040410" }}>
          <p style={{ fontSize: 13, color: "#94a3b8", fontWeight: 700, letterSpacing: 3, marginBottom: 8 }}>TRUST MIND</p>
          <p style={{ fontSize: 11, color: "#475569" }}>© {new Date().getFullYear()} TRUST MIND · OLIVEROS MKT EIRL · Todos los derechos reservados</p>
        </footer>
      </div>
    </>
  );
}
