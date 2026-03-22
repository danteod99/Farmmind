"use client";

import { useState } from "react";
import { User, Bot, Crown, MessageCircle, Phone, Zap, Shield, Check, Star, ArrowRight, Globe, TrendingUp } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import { FarmMindLogo } from "@/app/components/FarmMindLogo";
import { TrustFooter } from "@/app/components/TrustFooter";
import { PromoBanner } from "@/app/components/PromoBanner";

export interface LandingFeature {
  emoji: string;
  title: string;
  desc: string;
  color: string;
}

export interface LandingTestimonial {
  name: string;
  role: string;
  text: string;
  country?: string;
}

export interface LandingChatPreview {
  user: string;
  ai: string;
}

export interface LandingStats {
  value: string;
  label: string;
}

export interface LandingProps {
  // Hero
  badge: string;
  headlineTop: string;
  headlineBottom: string;
  subheadline: string;
  ctaText?: string;
  ctaSubtext?: string;

  // Chat preview
  chatPreview: LandingChatPreview;

  // Features
  featuresTitle: string;
  featuresSubtitle: string;
  features: LandingFeature[];

  // Stats
  stats?: LandingStats[];

  // Testimonials
  testimonials?: LandingTestimonial[];

  // Use cases section
  useCasesTitle?: string;
  useCases?: { icon: string; title: string; desc: string }[];

  // Final CTA
  finalCtaTitle: string;
  finalCtaSubtitle: string;

  // Meta
  accentColor?: string;
  secondaryColor?: string;
  countryFlag?: string;
}

export default function LandingTemplate({
  badge,
  headlineTop,
  headlineBottom,
  subheadline,
  ctaText = "Empezar gratis con Google",
  ctaSubtext = "30 mensajes gratis · Sin tarjeta",
  chatPreview,
  featuresTitle,
  featuresSubtitle,
  features,
  stats,
  testimonials,
  useCasesTitle,
  useCases,
  finalCtaTitle,
  finalCtaSubtitle,
  accentColor = "#007ABF",
  secondaryColor = "#56B4E0",
  countryFlag,
}: LandingProps) {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const GoogleButton = ({ large = false }: { large?: boolean }) => (
    <button
      onClick={handleGoogleLogin}
      disabled={loading}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "10px",
        padding: large ? "16px 32px" : "13px 24px",
        borderRadius: "14px", background: loading ? "#1e1e30" : "white",
        color: "#111", fontSize: large ? "15px" : "14px", fontWeight: 700,
        border: "none", cursor: loading ? "not-allowed" : "pointer",
        letterSpacing: "-0.1px", transition: "all 0.2s",
        boxShadow: large ? `0 0 40px ${accentColor}40` : "none",
      }}
      onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.opacity = "0.92"; e.currentTarget.style.transform = "translateY(-1px)"; }}}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "none"; }}
    >
      {loading ? (
        <><div style={{ width: "16px", height: "16px", border: `2px solid ${accentColor}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} /><span style={{ color: "#64748b" }}>Redirigiendo...</span></>
      ) : (
        <>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {large ? ctaText : "Continuar con Google"}
        </>
      )}
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#07070e", color: "#f0efff", fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", overflowX: "hidden" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        @keyframes fade-up { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes glow-pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes slide-in { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>

      {/* === PROMO BANNER === */}
      <PromoBanner />

      {/* === NAVBAR === */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(7,7,14,0.85)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${accentColor}15`, padding: "0 32px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ position: "relative", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", inset: "-3px", borderRadius: "50%", background: `radial-gradient(circle, ${accentColor}55, transparent 70%)`, filter: "blur(5px)" }} />
            <FarmMindLogo size={30} />
          </div>
          <span style={{ fontWeight: 800, fontSize: "15px", letterSpacing: "-0.3px" }}>TRUST MIND<span style={{ color: accentColor }}> AI</span></span>
          {countryFlag && <span style={{ fontSize: "18px", marginLeft: "4px" }}>{countryFlag}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <a href="https://www.scalinglatam.site" target="_blank" rel="noreferrer" style={{ fontSize: "13px", color: "#64748b", textDecoration: "none", fontWeight: 500 }}>Scaling Latam ↗</a>
          <GoogleButton />
        </div>
      </nav>

      {/* === HERO === */}
      <section style={{ position: "relative", overflow: "hidden", background: `linear-gradient(160deg, #000C18 0%, #001530 30%, #000A14 70%, #07070e 100%)`, padding: "100px 32px 80px", textAlign: "center" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${accentColor}08 1px, transparent 1px), linear-gradient(90deg, ${accentColor}08 1px, transparent 1px)`, backgroundSize: "40px 40px", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "-100px", left: "50%", transform: "translateX(-50%)", width: "700px", height: "500px", borderRadius: "50%", background: `radial-gradient(circle, ${accentColor}25, transparent 65%)`, filter: "blur(60px)", pointerEvents: "none" }} />

        <div style={{ position: "relative", maxWidth: "820px", margin: "0 auto", animation: "fade-up 0.7s ease-out" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "6px 16px", borderRadius: "100px", background: `${accentColor}15`, border: `1px solid ${accentColor}40`, marginBottom: "28px" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34d399", animation: "glow-pulse 2s ease-in-out infinite" }} />
            <span style={{ fontSize: "12px", color: secondaryColor, fontWeight: 600, letterSpacing: "0.5px" }}>{badge}</span>
          </div>

          <h1 style={{ fontSize: "clamp(44px, 8vw, 80px)", fontWeight: 900, lineHeight: 1.0, letterSpacing: "-0.04em", marginBottom: "24px" }}>
            <span style={{ background: `linear-gradient(135deg, #fff 0%, ${secondaryColor}80 40%, ${secondaryColor} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{headlineTop}</span>
            <br />
            <span style={{ background: `linear-gradient(135deg, ${secondaryColor} 0%, ${accentColor} 60%, ${accentColor}cc 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{headlineBottom}</span>
          </h1>

          <p style={{ fontSize: "18px", color: "#94a3b8", lineHeight: 1.7, maxWidth: "560px", margin: "0 auto 40px" }}>{subheadline}</p>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
            <GoogleButton large />
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34d399" }} />
              <span style={{ fontSize: "13px", color: "#64748b" }}>{ctaSubtext}</span>
            </div>
          </div>
        </div>

        {/* Chat preview */}
        <div style={{ position: "relative", maxWidth: "680px", margin: "60px auto 0", animation: "float 5s ease-in-out infinite" }}>
          <div style={{ background: "rgba(13,13,24,0.9)", border: `1px solid ${accentColor}30`, borderRadius: "20px", padding: "20px 24px", backdropFilter: "blur(20px)", boxShadow: `0 0 60px ${accentColor}20, 0 40px 80px rgba(0,0,0,0.6)`, textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", paddingBottom: "14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ position: "relative", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: `radial-gradient(circle, ${accentColor}50, transparent)`, filter: "blur(4px)" }} />
                <FarmMindLogo size={26} />
              </div>
              <div>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "white" }}>TRUST MIND AI</span>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#34d399" }} />
                  <span style={{ fontSize: "10px", color: "#64748b" }}>Agente activo</span>
                </div>
              </div>
            </div>
            {[
              { role: "user", text: chatPreview.user },
              { role: "ai", text: chatPreview.ai },
            ].map((msg, i) => (
              <div key={i} style={{ display: "flex", gap: "10px", flexDirection: msg.role === "user" ? "row-reverse" : "row", marginBottom: "10px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "10px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: msg.role === "user" ? "#1e1e30" : `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}>
                  {msg.role === "user" ? <User size={13} color={secondaryColor} /> : <Bot size={13} color="white" />}
                </div>
                <div style={{ maxWidth: "80%", background: msg.role === "user" ? `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` : "rgba(255,255,255,0.06)", border: msg.role === "ai" ? "1px solid rgba(255,255,255,0.08)" : "none", borderRadius: msg.role === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px", padding: "10px 14px", fontSize: "13px", lineHeight: 1.6, color: "#e2e8f0" }}
                  dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.+?)\*\*/g, "<strong style='color:white'>$1</strong>") }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === STATS === */}
      {stats && stats.length > 0 && (
        <section style={{ padding: "48px 32px", borderBottom: `1px solid ${accentColor}10` }}>
          <div style={{ maxWidth: "900px", margin: "0 auto", display: "grid", gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, 1fr)`, gap: "32px", textAlign: "center" }}>
            {stats.map((s, i) => (
              <div key={i}>
                <p style={{ fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 900, color: secondaryColor, letterSpacing: "-0.03em", lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: "13px", color: "#64748b", marginTop: "8px" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* === FEATURES === */}
      <section style={{ padding: "80px 32px", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, letterSpacing: "-0.03em", background: `linear-gradient(135deg, #fff, ${secondaryColor})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "12px" }}>
            {featuresTitle}
          </h2>
          <p style={{ color: "#64748b", fontSize: "15px", maxWidth: "440px", margin: "0 auto", lineHeight: 1.6 }}>{featuresSubtitle}</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
          {features.map((f) => (
            <div key={f.title} style={{ background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: "20px", padding: "28px", position: "relative", overflow: "hidden", transition: "border-color 0.2s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = f.color + "50"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#1e1e30"; }}>
              <div style={{ position: "absolute", top: 0, right: 0, width: "120px", height: "120px", borderRadius: "50%", background: `radial-gradient(circle, ${f.color}15, transparent 70%)`, pointerEvents: "none" }} />
              <div style={{ fontSize: "32px", marginBottom: "14px" }}>{f.emoji}</div>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "white", marginBottom: "8px" }}>{f.title}</h3>
              <p style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* === USE CASES === */}
      {useCases && useCases.length > 0 && (
        <section style={{ padding: "80px 32px", background: `linear-gradient(180deg, transparent, ${accentColor}05, transparent)` }}>
          <div style={{ maxWidth: "900px", margin: "0 auto" }}>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 800, color: "white", textAlign: "center", marginBottom: "48px" }}>
              {useCasesTitle || "Casos de uso"}
            </h2>
            <div style={{ display: "grid", gap: "16px" }}>
              {useCases.map((uc, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "20px", padding: "24px", background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: "16px", transition: "border-color 0.2s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = `${accentColor}40`; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#1e1e30"; }}>
                  <span style={{ fontSize: "28px", flexShrink: 0 }}>{uc.icon}</span>
                  <div>
                    <h3 style={{ fontSize: "15px", fontWeight: 700, color: "white", marginBottom: "6px" }}>{uc.title}</h3>
                    <p style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.6 }}>{uc.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* === TESTIMONIALS === */}
      {testimonials && testimonials.length > 0 && (
        <section style={{ padding: "80px 32px" }}>
          <div style={{ maxWidth: "900px", margin: "0 auto" }}>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 800, color: "white", textAlign: "center", marginBottom: "48px" }}>
              Lo que dicen nuestros usuarios
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px" }}>
              {testimonials.map((t, i) => (
                <div key={i} style={{ background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: "20px", padding: "28px", position: "relative" }}>
                  <div style={{ display: "flex", gap: "4px", marginBottom: "16px" }}>
                    {[1,2,3,4,5].map((s) => <Star key={s} size={14} fill={secondaryColor} color={secondaryColor} />)}
                  </div>
                  <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: 1.7, marginBottom: "20px", fontStyle: "italic" }}>"{t.text}"</p>
                  <div style={{ borderTop: "1px solid #1e1e30", paddingTop: "16px" }}>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: "white" }}>{t.name} {t.country && <span style={{ fontSize: "14px" }}>{t.country}</span>}</p>
                    <p style={{ fontSize: "12px", color: "#64748b" }}>{t.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* === PRICING QUICK === */}
      <section style={{ padding: "80px 32px", background: `linear-gradient(180deg, transparent, ${accentColor}05, transparent)` }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, letterSpacing: "-0.03em", color: "white", marginBottom: "10px" }}>Planes simples</h2>
            <p style={{ color: "#64748b", fontSize: "15px" }}>Empieza gratis, escala cuando quieras.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div style={{ background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: "24px", padding: "32px" }}>
              <p style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>Free</p>
              <div style={{ marginBottom: "24px" }}>
                <span style={{ fontSize: "48px", fontWeight: 900, color: "white" }}>$0</span>
                <span style={{ fontSize: "14px", color: "#64748b" }}> / mes</span>
              </div>
              <div style={{ borderTop: "1px solid #1e1e30", paddingTop: "20px" }}>
                {["30 mensajes / mes", "Historial básico", "Growth Dashboard", "Soporte comunidad"].map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                    <span style={{ color: "#34d399", fontSize: "14px" }}>✓</span>
                    <span style={{ fontSize: "13px", color: "#94a3b8" }}>{f}</span>
                  </div>
                ))}
              </div>
              <button onClick={handleGoogleLogin} disabled={loading} style={{ marginTop: "20px", width: "100%", padding: "12px", borderRadius: "12px", border: "1px solid #2d2d44", background: "transparent", color: "#94a3b8", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
                Empezar gratis
              </button>
            </div>
            <div style={{ background: `linear-gradient(135deg, #001528, #001020)`, border: `1px solid ${accentColor}50`, borderRadius: "24px", padding: "32px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: "12px", right: "12px", padding: "3px 10px", borderRadius: "20px", background: `${accentColor}20`, border: `1px solid ${accentColor}40`, fontSize: "11px", color: secondaryColor, fontWeight: 700 }}>
                Popular
              </div>
              <p style={{ fontSize: "12px", fontWeight: 700, color: secondaryColor, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>Pro</p>
              <div style={{ marginBottom: "24px" }}>
                <span style={{ fontSize: "48px", fontWeight: 900, color: "white" }}>$19</span>
                <span style={{ fontSize: "14px", color: "#64748b" }}> / mes</span>
              </div>
              <div style={{ borderTop: `1px solid ${accentColor}20`, paddingTop: "20px" }}>
                {["Mensajes ilimitados", "Historial completo", "Acceso prioritario", "Nuevas funciones primero", "Soporte directo"].map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                    <span style={{ color: secondaryColor, fontSize: "14px" }}>✓</span>
                    <span style={{ fontSize: "13px", color: `${secondaryColor}cc` }}>{f}</span>
                  </div>
                ))}
              </div>
              <button onClick={handleGoogleLogin} disabled={loading} style={{ marginTop: "20px", width: "100%", padding: "12px", borderRadius: "12px", border: "none", background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: "white", fontSize: "14px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                <Crown size={14} className="text-yellow-300" /> Comenzar con Pro
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* === FINAL CTA === */}
      <section style={{ padding: "80px 32px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "600px", height: "400px", borderRadius: "50%", background: `radial-gradient(circle, ${accentColor}15, transparent 70%)`, filter: "blur(60px)", pointerEvents: "none" }} />
        <div style={{ position: "relative" }}>
          <h2 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 900, letterSpacing: "-0.04em", background: `linear-gradient(135deg, #fff, ${secondaryColor})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "16px", lineHeight: 1.1 }}>
            {finalCtaTitle}
          </h2>
          <p style={{ color: "#64748b", fontSize: "15px", marginBottom: "36px" }}>{finalCtaSubtitle}</p>
          <GoogleButton large />
        </div>
      </section>

      {/* === FOOTER === */}
      <TrustFooter />
    </div>
  );
}
