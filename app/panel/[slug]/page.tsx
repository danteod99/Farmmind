"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePanel } from "./context";
import { ChildPanelNav } from "@/app/components/ChildPanelNav";
import { supabase } from "@/app/lib/supabase";
import {
  Zap, Shield, TrendingUp, Clock, Users, Star,
  ArrowRight, ChevronRight, Package,
  MessageCircle,
} from "lucide-react";

export default function ChildPanelLanding() {
  const { reseller, loading, slug, brandColor, panelName, logoUrl } = usePanel();
  const router = useRouter();
  const [isAuth, setIsAuth] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsAuth(true);
        // If authenticated, redirect to services
        router.replace(`/panel/${slug}/services`);
      }
      setCheckingAuth(false);
    })();
  }, [router, slug]);

  if (loading || checkingAuth) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#07070e" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${brandColor}30`, borderTopColor: brandColor, animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!reseller) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#07070e", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 48 }}>🔍</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f0efff" }}>Panel no encontrado</h1>
        <p style={{ fontSize: 14, color: "#5a6480" }}>El panel que buscas no existe o no está activo.</p>
      </div>
    );
  }

  const bc = brandColor;
  const features = [
    { icon: <Zap size={22} />, title: "Entrega rápida", desc: "Tus pedidos empiezan a procesarse inmediatamente después de la compra." },
    { icon: <Shield size={22} />, title: "100% Seguro", desc: "Plataforma segura con cifrado de datos y pagos protegidos." },
    { icon: <TrendingUp size={22} />, title: "Resultados reales", desc: "Crecimiento orgánico y natural para tus redes sociales." },
    { icon: <Clock size={22} />, title: "Soporte 24/7", desc: "Estamos disponibles para ayudarte en cualquier momento." },
    { icon: <Users size={22} />, title: "Miles de clientes", desc: "Únete a la comunidad de creadores que confían en nosotros." },
    { icon: <Package size={22} />, title: "+{count} Servicios", desc: "Amplio catálogo para todas las redes sociales principales." },
  ];

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fade-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes glow-pulse { 0%, 100% { box-shadow: 0 0 20px ${bc}40; } 50% { box-shadow: 0 0 40px ${bc}70; } }
        .cp-feature:hover { transform: translateY(-4px); box-shadow: 0 12px 40px #00000050 !important; }
        .cp-cta:hover { transform: translateY(-2px); box-shadow: 0 8px 30px ${bc}50 !important; }
        @media (max-width: 768px) {
          .cp-hero-grid { flex-direction: column !important; text-align: center !important; }
          .cp-features-grid { grid-template-columns: 1fr !important; }
          .cp-hero h1 { font-size: 32px !important; }
          .cp-plans-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <ChildPanelNav
        slug={slug}
        panelName={panelName}
        logoUrl={logoUrl}
        brandColor={bc}
        balance={0}
        isAuthenticated={false}
      />

      {/* ── HERO ── */}
      <section
        className="cp-hero"
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "80px 24px 60px",
          background: `linear-gradient(160deg, #000C18 0%, ${bc}12 35%, #07070e 100%)`,
          borderBottom: `1px solid ${bc}30`,
        }}
      >
        {/* Decorations */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div style={{ position: "absolute", top: "-100px", right: "10%", width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, ${bc}30, transparent 65%)`, filter: "blur(60px)" }} />
          <div style={{ position: "absolute", bottom: "-80px", left: "20%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, #a855f720, transparent 70%)", filter: "blur(50px)" }} />
        </div>

        <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div className="cp-hero-grid" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 40 }}>
            <div style={{ flex: 1, animation: "fade-up 0.6s ease-out" }}>
              {/* Badge */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 20, background: `${bc}20`, border: `1px solid ${bc}40`, marginBottom: 20 }}>
                <Zap size={12} color={bc} />
                <span style={{ fontSize: 11, fontWeight: 700, color: bc, letterSpacing: "0.8px", textTransform: "uppercase" }}>
                  Plataforma SMM
                </span>
              </div>

              <h1 style={{ fontSize: 48, fontWeight: 800, color: "white", letterSpacing: "-1.5px", lineHeight: 1.1, marginBottom: 16 }}>
                {reseller.hero_title ? (
                  <span>{reseller.hero_title}</span>
                ) : (
                  <>Haz crecer tus{" "}
                  <span style={{ background: `linear-gradient(90deg, ${bc}, #a855f7)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    redes sociales
                  </span></>
                )}
              </h1>

              <p style={{ fontSize: 16, color: "#94a3b8", lineHeight: 1.7, marginBottom: 28, maxWidth: 500 }}>
                {reseller.hero_subtitle || reseller.description || `${panelName} te ofrece los mejores servicios de crecimiento para Instagram, TikTok, YouTube y más. Resultados rápidos, precios competitivos.`}
              </p>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link
                  href={`/panel/${slug}/auth`}
                  className="cp-cta"
                  style={{
                    padding: "14px 32px",
                    borderRadius: 12,
                    background: `linear-gradient(135deg, ${bc}, ${bc}cc)`,
                    color: "white",
                    fontSize: 15,
                    fontWeight: 700,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    boxShadow: `0 0 24px ${bc}40`,
                    transition: "all 0.2s",
                  }}
                >
                  {reseller.cta_text || "Comenzar ahora"} <ArrowRight size={16} />
                </Link>
                <Link
                  href={`/panel/${slug}/auth`}
                  style={{
                    padding: "14px 28px",
                    borderRadius: 12,
                    background: "#0d0d18",
                    border: "1px solid #2a2a42",
                    color: "#94a3b8",
                    fontSize: 15,
                    fontWeight: 600,
                    textDecoration: "none",
                    transition: "all 0.2s",
                  }}
                >
                  {reseller.cta_secondary_text || "Ya tengo cuenta"}
                </Link>
              </div>
            </div>

            {/* Stats card */}
            <div style={{ background: "#0d0d18", border: `1px solid ${bc}30`, borderRadius: 20, padding: "28px 32px", minWidth: 240, animation: "fade-up 0.8s ease-out" }}>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                {logoUrl ? (
                  <img src={logoUrl} alt={panelName} style={{ width: 56, height: 56, borderRadius: 14, objectFit: "cover", margin: "0 auto 12px" }} />
                ) : (
                  <div style={{ width: 56, height: 56, borderRadius: 14, background: `${bc}20`, border: `1px solid ${bc}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: bc, margin: "0 auto 12px" }}>
                    {panelName.charAt(0)}
                  </div>
                )}
                <p style={{ fontSize: 16, fontWeight: 800, color: "white" }}>{panelName}</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { value: `${reseller.services_count}+`, label: "Servicios" },
                  { value: "24/7", label: "Soporte" },
                  { value: "Cripto", label: "Pagos" },
                ].map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderTop: i > 0 ? "1px solid #1e1e30" : "none" }}>
                    <span style={{ fontSize: 12, color: "#5a6480" }}>{s.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: bc }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      {reseller.show_features_section !== false && (
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: "white", marginBottom: 8 }}>
            ¿Por qué elegirnos?
          </h2>
          <p style={{ fontSize: 14, color: "#5a6480" }}>Todo lo que necesitas para crecer en redes sociales</p>
        </div>

        <div className="cp-features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {features.map((f, i) => (
            <div
              key={i}
              className="cp-feature"
              style={{
                background: "#0d0d18",
                border: "1px solid #1e1e30",
                borderRadius: 16,
                padding: 24,
                transition: "all 0.2s",
              }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${bc}15`, border: `1px solid ${bc}30`, display: "flex", alignItems: "center", justifyContent: "center", color: bc, marginBottom: 16 }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 6 }}>
                {f.title}
              </h3>
              <p style={{ fontSize: 13, color: "#5a6480", lineHeight: 1.6 }}>
                {f.desc.replace("{count}", String(reseller.services_count))}
              </p>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* ── PLANS (if any) ── */}
      {reseller.show_plans_section !== false && reseller.plans && reseller.plans.length > 0 && (
        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 60px" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: "white", marginBottom: 8 }}>
              Nuestros planes
            </h2>
            <p style={{ fontSize: 14, color: "#5a6480" }}>Elige el plan que mejor se ajuste a tus necesidades</p>
          </div>

          <div className="cp-plans-grid" style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(reseller.plans.length, 3)}, 1fr)`, gap: 16 }}>
            {reseller.plans.map((plan, i) => (
              <div
                key={plan.id}
                style={{
                  background: i === 0 ? `${bc}08` : "#0d0d18",
                  border: `1px solid ${i === 0 ? `${bc}40` : "#1e1e30"}`,
                  borderRadius: 18,
                  padding: 28,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {i === 0 && (
                  <div style={{ position: "absolute", top: 12, right: 12, padding: "3px 10px", borderRadius: 20, background: `${bc}20`, border: `1px solid ${bc}40`, fontSize: 10, fontWeight: 700, color: bc, textTransform: "uppercase" }}>
                    Popular
                  </div>
                )}
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "white", marginBottom: 6 }}>{plan.plan_name}</h3>
                <p style={{ fontSize: 13, color: "#5a6480", marginBottom: 16, lineHeight: 1.5 }}>{plan.description}</p>
                <div style={{ marginBottom: 20 }}>
                  <span style={{ fontSize: 36, fontWeight: 800, color: bc }}>${plan.price_usd}</span>
                  <span style={{ fontSize: 13, color: "#5a6480" }}> / {plan.period_days} días</span>
                </div>
                {plan.services_included && plan.services_included.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                    {plan.services_included.map((s: { service_name: string; quantity: number }, j: number) => (
                      <div key={j} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: bc }} />
                        <span style={{ fontSize: 13, color: "#94a3b8" }}>
                          {s.quantity.toLocaleString()} {s.service_name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <Link
                  href={`/panel/${slug}/auth`}
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "12px 20px",
                    borderRadius: 10,
                    background: i === 0 ? bc : "#1a1a2e",
                    border: `1px solid ${i === 0 ? bc : "#2a2a42"}`,
                    color: i === 0 ? "white" : "#94a3b8",
                    fontSize: 14,
                    fontWeight: 700,
                    textDecoration: "none",
                    transition: "all 0.15s",
                  }}
                >
                  Empezar ahora
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── CTA FINAL ── */}
      <section style={{ padding: "60px 24px", background: `linear-gradient(160deg, ${bc}08, #07070e)`, borderTop: `1px solid ${bc}15` }}>
        <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: "white", marginBottom: 12 }}>
            ¿Listo para crecer?
          </h2>
          <p style={{ fontSize: 15, color: "#94a3b8", marginBottom: 28, lineHeight: 1.7 }}>
            Crea tu cuenta gratis y empieza a impulsar tus redes sociales hoy mismo.
          </p>
          <Link
            href={`/panel/${slug}/auth`}
            className="cp-cta"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 36px",
              borderRadius: 12,
              background: bc,
              color: "white",
              fontSize: 15,
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: `0 0 24px ${bc}40`,
              transition: "all 0.2s",
            }}
          >
            {reseller.cta_text || "Crear cuenta gratis"} <ChevronRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: "24px", borderTop: "1px solid #1e1e30", textAlign: "center" }}>
        {/* Social links */}
        {(reseller.instagram_url || reseller.telegram_url || reseller.tiktok_url) && (
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 16 }}>
            {reseller.instagram_url && (
              <a href={reseller.instagram_url} target="_blank" rel="noopener noreferrer"
                style={{ width: 36, height: 36, borderRadius: 10, background: "#E4405F18", border: "1px solid #E4405F30", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", transition: "all 0.15s" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E4405F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
            )}
            {reseller.tiktok_url && (
              <a href={reseller.tiktok_url} target="_blank" rel="noopener noreferrer"
                style={{ width: 36, height: 36, borderRadius: 10, background: "#00f2ea18", border: "1px solid #00f2ea30", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", transition: "all 0.15s" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00f2ea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
              </a>
            )}
            {reseller.telegram_url && (
              <a href={reseller.telegram_url} target="_blank" rel="noopener noreferrer"
                style={{ width: 36, height: 36, borderRadius: 10, background: "#0088CC18", border: "1px solid #0088CC30", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", transition: "all 0.15s" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0088CC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </a>
            )}
          </div>
        )}

        <p style={{ fontSize: 12, color: "#3a3a5c" }}>
          © {new Date().getFullYear()} {panelName}. Todos los derechos reservados.
        </p>
        {reseller.show_powered_by !== false && (
          <p style={{ fontSize: 11, color: "#2a2a42", marginTop: 4 }}>
            Powered by Trust Mind
          </p>
        )}
      </footer>

      {/* ── WhatsApp floating button ── */}
      {reseller.whatsapp_number && (
        <a
          href={`https://wa.me/${reseller.whatsapp_number.replace(/[^0-9]/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "#25D366",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 20px rgba(37, 211, 102, 0.4)",
            zIndex: 999,
            textDecoration: "none",
            transition: "transform 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <MessageCircle size={26} color="white" fill="white" />
        </a>
      )}
    </>
  );
}
