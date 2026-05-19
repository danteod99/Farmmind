"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/app/lib/supabase";
import {
  Check, X as XIcon, Zap, Bot, ChevronDown, Sparkles, ShoppingCart, TrendingUp, DollarSign, Layers, Globe
} from "lucide-react";

const ACCENT = "#007ABF";
const ACCENT_LIGHT = "#00B4D8";

export default function PanelSmmPage() {
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
      window.history.replaceState({}, "", "/panel-smm");
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
          0%, 100% { box-shadow: 0 0 0 0 ${ACCENT_LIGHT}90; }
          50% { box-shadow: 0 0 0 18px ${ACCENT_LIGHT}00; }
        }
        @keyframes fade-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .ps-section { animation: fade-up 0.7s ease-out backwards; }

        @media (max-width: 768px) {
          .ps-hero { padding: 32px 16px 24px !important; }
          .ps-hero h1 { font-size: clamp(28px, 7vw, 40px) !important; line-height: 1.1 !important; }
          .ps-hero p { font-size: 14px !important; }
          .ps-cta { padding: 14px 22px !important; font-size: 14px !important; width: 100% !important; max-width: 320px !important; }
          .ps-section { padding-left: 16px !important; padding-right: 16px !important; padding-top: 48px !important; padding-bottom: 48px !important; }
          .ps-section h2 { font-size: clamp(22px, 5vw, 28px) !important; }
          .ps-features-grid { grid-template-columns: 1fr !important; }
          .ps-pricing-card { padding: 24px 18px !important; }
          .ps-pricing-price { font-size: 56px !important; }
          .ps-toggle-btn { padding: 8px 16px !important; font-size: 11px !important; }
        }
        @media (max-width: 420px) {
          .ps-hero h1 { font-size: 26px !important; }
          .ps-pricing-price { font-size: 48px !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#07070e" }}>

        {/* HERO */}
        <section className="ps-section ps-hero" style={{
          position: "relative", padding: "56px 24px 32px",
          background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${ACCENT}30 0%, transparent 60%)`,
          textAlign: "center",
        }}>
          <div style={{ maxWidth: "880px", margin: "0 auto" }}>

            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "5px 14px", borderRadius: "100px", background: `${ACCENT}15`, border: `1px solid ${ACCENT}40`, marginBottom: "24px", fontSize: "11px", color: "#7dd3fc", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.5px" }}>
              <Bot size={11} />
              IA + Granjas de bots · desde $50
            </div>

            <h1 style={{
              fontSize: "clamp(34px, 6.5vw, 60px)",
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: "-0.04em",
              marginBottom: "20px",
            }}>
              <span style={{ color: "white" }}>Haz que la </span>
              <span style={{ background: `linear-gradient(135deg, ${ACCENT_LIGHT}, ${ACCENT})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>IA controle</span>
              <span style={{ color: "white" }}> granjas de bots por ti </span>
              <span style={{ color: "#fbbf24" }}>desde $50</span>
            </h1>

            <p style={{
              fontSize: "clamp(16px, 2vw, 19px)",
              color: "#94a3b8",
              maxWidth: "640px",
              margin: "0 auto 32px",
              lineHeight: 1.6,
            }}>
              Un agente IA que <strong style={{ color: "white" }}>gestiona miles de cuentas en automático</strong> en Instagram, TikTok, YouTube, Facebook, Spotify y +10 plataformas. Tú duermes, ella vende y crece tus redes.
            </p>

            {/* VIDEO DEMO HERO */}
            <div style={{
              position: "relative",
              maxWidth: "820px",
              margin: "0 auto 32px",
              paddingBottom: "56.25%",
              height: 0,
              borderRadius: "20px",
              overflow: "hidden",
              boxShadow: `0 24px 80px ${ACCENT}40, 0 0 0 1px rgba(255,255,255,0.08)`,
            }}>
              <iframe
                src="https://www.loom.com/embed/bf8ccb2d678342bcb7a0ed06f4316605"
                allowFullScreen
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
              />
            </div>

            <button onClick={scrollToCta} className="ps-cta"
              style={{
                padding: "18px 36px", borderRadius: "14px", border: "none",
                background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_LIGHT})`,
                color: "white", fontSize: "16px", fontWeight: 900, cursor: "pointer",
                boxShadow: `0 8px 32px ${ACCENT_LIGHT}50`,
                animation: "pulse-cta 2.5s ease-out infinite",
                display: "inline-flex", alignItems: "center", gap: "10px",
                letterSpacing: "0.2px",
              }}>
              <Sparkles size={18} /> ACTIVAR MI IA →
            </button>
            <p style={{ fontSize: "12px", color: "#64748b", marginTop: "14px" }}>
              Activación inmediata · 30 días de garantía · Cancela cuando quieras
            </p>
          </div>
        </section>

        {/* QUÉ HACE EL PANEL */}
        <section className="ps-section" style={{ padding: "72px 24px", background: "linear-gradient(180deg, #08080f, #07070e)" }}>
          <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
            <p style={{ textAlign: "center", fontSize: "12px", fontWeight: 700, color: ACCENT_LIGHT, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "12px" }}>Qué hace tu IA</p>
            <h2 style={{ textAlign: "center", fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 800, color: "white", marginBottom: "16px", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
              Tu granja de bots <span style={{ color: ACCENT_LIGHT }}>en piloto automático</span>
            </h2>
            <p style={{ textAlign: "center", fontSize: "15px", color: "#94a3b8", maxWidth: "600px", margin: "0 auto 40px" }}>
              Le hablas a la IA en español. Ella ejecuta. Tú ves resultados al día siguiente.
            </p>

            <div className="ps-features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
              {[
                { icon: <Layers size={22} />, title: "+5,000 servicios", desc: "Seguidores, likes, views, comments, saves, shares — en IG, TikTok, YouTube, FB, Spotify, Twitter, Telegram, Twitch y más." },
                { icon: <DollarSign size={22} />, title: "Saldo recargable", desc: "Recarga con Stripe (tarjeta) o cripto (USDT, BTC, ETH). Auto-recarga mensual disponible si quieres olvidarte de cargar." },
                { icon: <Bot size={22} />, title: "Agente IA integrado", desc: "Chatea con el AI: 'Quiero +500 seguidores en mi IG' — él busca el servicio, lo cobra del saldo y lo entrega. Sin clicks." },
                { icon: <TrendingUp size={22} />, title: "Entrega automática", desc: "Los servicios empiezan en 1-15 minutos. Dashboard en vivo con velocidad, restante y estado de cada pedido." },
                { icon: <Globe size={22} />, title: "Multi-plataforma", desc: "Mismo panel sirve para crecer tu Instagram personal, monetizar Spotify, viralizar TikTok o vender en Facebook." },
                { icon: <Zap size={22} />, title: "API + Child Panels", desc: "Si revendes servicios, accede al API y crea tu propio panel hijo con tu marca, precios y dominio." },
              ].map((f) => (
                <div key={f.title} style={{ padding: "22px", borderRadius: "16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: `${ACCENT}20`, border: `1px solid ${ACCENT}40`, display: "flex", alignItems: "center", justifyContent: "center", color: ACCENT_LIGHT, marginBottom: 12 }}>
                    {f.icon}
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 6 }}>{f.title}</h3>
                  <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PLATAFORMAS */}
        <section className="ps-section" style={{ padding: "60px 24px", background: "#08080f" }}>
          <div style={{ maxWidth: "960px", margin: "0 auto", textAlign: "center" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "24px" }}>Funciona en tus plataformas favoritas</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: "12px", alignItems: "center", justifyItems: "center" }}>
              {[
                { name: "Instagram", color: "#E4405F" },
                { name: "TikTok", color: "#ffffff" },
                { name: "YouTube", color: "#FF0000" },
                { name: "Facebook", color: "#1877F2" },
                { name: "Spotify", color: "#1ED760" },
                { name: "X", color: "#ffffff" },
                { name: "Telegram", color: "#26A5E4" },
                { name: "Twitch", color: "#9146FF" },
              ].map((p) => (
                <div key={p.name} style={{ padding: "12px 6px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", width: "100%", maxWidth: 110, fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>
                  <span style={{ color: p.color, fontSize: 22, fontWeight: 900, display: "block", marginBottom: 4 }}>●</span>
                  {p.name}
                </div>
              ))}
            </div>
            <p style={{ marginTop: 20, fontSize: 13, color: "#64748b" }}>
              Y <strong style={{ color: "#7dd3fc" }}>+10 plataformas más</strong>
            </p>
          </div>
        </section>

        {/* PRICING */}
        <section ref={ctaRef} className="ps-section" style={{ padding: "80px 20px", background: `linear-gradient(180deg, #08080f, ${ACCENT}15 50%, #08080f)` }}>
          <div style={{ maxWidth: "640px", margin: "0 auto" }}>
            <p style={{ textAlign: "center", fontSize: "12px", fontWeight: 700, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "16px" }}>Precio</p>
            <h2 style={{ textAlign: "center", fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 900, color: "white", marginBottom: "16px", letterSpacing: "-0.02em" }}>
              Tu granja con IA desde <span style={{ color: ACCENT_LIGHT }}>$50/mes</span>
            </h2>
            <p style={{ textAlign: "center", fontSize: "15px", color: "#94a3b8", marginBottom: "32px" }}>
              Acceso al agente IA + TrustInsta + TrustFace Desktop + +5,000 servicios SMM.
            </p>

            <div className="ps-pricing-card" style={{
              position: "relative",
              padding: "40px 32px",
              borderRadius: "24px",
              background: `linear-gradient(160deg, ${ACCENT}15 0%, #000810 100%)`,
              border: `2px solid ${ACCENT_LIGHT}`,
              boxShadow: `0 24px 80px ${ACCENT_LIGHT}30`,
              overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle, ${ACCENT_LIGHT}30, transparent 70%)`, filter: "blur(40px)" }} />

              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                  <div style={{ display: "inline-flex", padding: 4, borderRadius: 12, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)", gap: 3 }}>
                    <button onClick={() => setSelectedPlan("yearly")} className="ps-toggle-btn"
                      style={{ padding: "9px 20px", borderRadius: 9, border: "none",
                        background: selectedPlan === "yearly" ? "linear-gradient(135deg, #fbbf24, #f59e0b)" : "transparent",
                        color: selectedPlan === "yearly" ? "#1a1a00" : "#94a3b8",
                        fontSize: 12, fontWeight: 800, cursor: "pointer", position: "relative", letterSpacing: 0.3,
                      }}>
                      ANUAL
                      <span style={{ position: "absolute", top: -9, right: -12, padding: "2px 7px", borderRadius: 20, background: "#ef4444", color: "white", fontSize: 9, fontWeight: 800 }}>-60%</span>
                    </button>
                    <button onClick={() => setSelectedPlan("monthly")} className="ps-toggle-btn"
                      style={{ padding: "9px 20px", borderRadius: 9, border: "none",
                        background: selectedPlan === "monthly" ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT_LIGHT})` : "transparent",
                        color: selectedPlan === "monthly" ? "white" : "#94a3b8",
                        fontSize: 12, fontWeight: 800, cursor: "pointer", letterSpacing: 0.3,
                      }}>
                      MENSUAL
                    </button>
                  </div>
                </div>

                <div style={{ textAlign: "center", marginBottom: 24 }}>
                  {selectedPlan === "yearly" ? (
                    <>
                      <div style={{ display: "inline-flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
                        <span style={{ fontSize: 20, color: "#64748b", textDecoration: "line-through" }}>$50/mes</span>
                        <span style={{ padding: "2px 8px", borderRadius: 6, background: "rgba(239, 68, 68, 0.15)", color: "#fca5a5", fontSize: 11, fontWeight: 700 }}>-60%</span>
                      </div>
                      <div>
                        <span className="ps-pricing-price" style={{ fontSize: 72, fontWeight: 900, color: "white", letterSpacing: "-0.04em", lineHeight: 1 }}>$20</span>
                        <span style={{ fontSize: 20, color: ACCENT_LIGHT, marginLeft: 4, fontWeight: 600 }}>/mes</span>
                      </div>
                      <p style={{ fontSize: 14, color: "#94a3b8", marginTop: 8 }}>
                        Pago único <strong style={{ color: "white" }}>$240/año</strong> · Ahorras $360
                      </p>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="ps-pricing-price" style={{ fontSize: 72, fontWeight: 900, color: "white", letterSpacing: "-0.04em", lineHeight: 1 }}>$50</span>
                        <span style={{ fontSize: 20, color: ACCENT_LIGHT, marginLeft: 4, fontWeight: 600 }}>/mes</span>
                      </div>
                      <p style={{ fontSize: 14, color: "#94a3b8", marginTop: 8 }}>Cancela cuando quieras</p>
                    </>
                  )}
                </div>

                <div style={{ padding: 20, borderRadius: 14, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 24 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: ACCENT_LIGHT, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>✦ Incluye:</p>
                  <div style={{ display: "grid", gap: 10 }}>
                    {[
                      "Acceso completo al panel SMM (+5,000 servicios)",
                      "Saldo recargable Stripe + cripto",
                      "Auto-recarga mensual opcional",
                      "Agente IA 24/7 dentro del panel",
                      "TrustInsta + TrustFace Desktop",
                      "API y child panels para revender",
                      "Soporte directo (<1 hora)",
                    ].map((b) => (
                      <div key={b} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <Check size={16} color={ACCENT_LIGHT} style={{ flexShrink: 0, marginTop: 2 }} />
                        <p style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.5 }}>{b}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={() => handleCheckout()} disabled={loading}
                  style={{
                    width: "100%", padding: 18, borderRadius: 14, border: "none",
                    background: loading ? "#1a1a2e" : selectedPlan === "yearly"
                      ? "linear-gradient(135deg, #fbbf24, #f59e0b)"
                      : `linear-gradient(135deg, ${ACCENT}, ${ACCENT_LIGHT})`,
                    color: loading ? "#64748b" : selectedPlan === "yearly" ? "#1a1a00" : "white",
                    fontSize: 16, fontWeight: 900, cursor: loading ? "not-allowed" : "pointer", letterSpacing: 0.3,
                    boxShadow: loading ? "none" : `0 8px 32px ${ACCENT_LIGHT}60`,
                    animation: loading ? "none" : "pulse-cta 2.5s ease-out infinite",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  }}>
                  {loading ? "Procesando..." : selectedPlan === "yearly" ? "🚀 ACTIVAR ANUAL — $240/AÑO" : "🚀 ACTIVAR MENSUAL — $50/MES"}
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
        <section className="ps-section" style={{ padding: "72px 20px" }}>
          <div style={{ maxWidth: "720px", margin: "0 auto" }}>
            <h2 style={{ textAlign: "center", fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 800, color: "white", marginBottom: 32, letterSpacing: "-0.02em" }}>Preguntas frecuentes</h2>
            <div style={{ display: "grid", gap: 10 }}>
              {[
                { q: "¿Qué es exactamente un panel SMM?", a: "Es un marketplace de servicios de redes sociales. Tú entras al panel, eliges 'quiero 1,000 seguidores Instagram', pagas con tu saldo y el sistema te los entrega en automático. Existen +5,000 servicios distintos cubriendo todas las plataformas mayores." },
                { q: "¿Cómo recargo el saldo?", a: "Con Stripe (tarjeta), cripto (USDT, BTC, ETH) o configurando auto-recarga mensual fija. Mínimo $11 USD para cripto, $20 para tarjeta. Acreditación inmediata." },
                { q: "¿Cuánto cuesta cada servicio?", a: "Varía. Ej: 1,000 seguidores IG desde $0.50, 1,000 views TikTok desde $0.40. Verás precios al entrar al panel — los más bajos del mercado en LATAM." },
                { q: "¿Los seguidores/views son reales?", a: "Tenemos servicios de todos los niveles: bot baratos, mid-quality con engagement, y premium con retención real (cuentas activas). Cada uno tiene su precio y label claro." },
                { q: "¿Puedo revender los servicios?", a: "Sí. Con tu Pro tienes acceso a la API y al sistema de child panels. Creas tu propio panel con tu marca + tu dominio y pones precios mayoristas/minoristas." },
                { q: "¿Funciona para mi negocio?", a: "Si vendes algo en redes sociales, sí. Creators, agencias, e-commerce, artistas, restaurantes, tiendas locales — todos usan el panel para boostear su presencia." },
              ].map((f, i) => {
                const isOpen = openFaq === i;
                return (
                  <div key={i} style={{ borderRadius: 14, background: "rgba(255,255,255,0.02)", border: `1px solid ${isOpen ? `${ACCENT_LIGHT}40` : "rgba(255,255,255,0.06)"}`, overflow: "hidden" }}>
                    <button onClick={() => setOpenFaq(isOpen ? null : i)}
                      style={{ width: "100%", padding: "18px 20px", background: "transparent", border: "none", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                      {f.q}
                      <ChevronDown size={18} color={ACCENT_LIGHT} style={{ flexShrink: 0, transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
                    </button>
                    {isOpen && <div style={{ padding: "0 20px 18px", fontSize: 14, color: "#94a3b8", lineHeight: 1.6 }}>{f.a}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="ps-section" style={{ padding: "60px 20px 80px", textAlign: "center", background: `linear-gradient(180deg, #07070e, ${ACCENT}20)` }}>
          <h2 style={{ fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 900, color: "white", marginBottom: 12, letterSpacing: "-0.02em" }}>
            Empieza con el <span style={{ color: ACCENT_LIGHT }}>panel SMM</span> hoy
          </h2>
          <p style={{ fontSize: 15, color: "#94a3b8", marginBottom: 24 }}>$240/año ($20/mes) o $50/mes · Acceso inmediato</p>
          <button onClick={() => handleCheckout()} disabled={loading} className="ps-cta"
            style={{
              padding: "18px 36px", borderRadius: 14, border: "none",
              background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_LIGHT})`,
              color: "white", fontSize: 16, fontWeight: 900,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: `0 8px 32px ${ACCENT_LIGHT}60`,
              display: "inline-flex", alignItems: "center", gap: 10,
            }}>
            <Sparkles size={18} /> {loading ? "..." : "ACTIVAR MI IA →"}
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
