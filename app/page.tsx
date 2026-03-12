"use client";

export const dynamic = "force-dynamic";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Zap, Shield, Cpu, Plus, Copy, Check, LogOut, MessageSquare, Trash2, Crown, X, Sparkles, ShoppingCart, Menu } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import { FarmMindLogo } from "@/app/components/FarmMindLogo";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

interface UserProfile {
  plan: "free" | "pro";
  status: string;
  messagesThisMonth: number;
  messagesLimit: number | null;
  isPro: boolean;
  canSendMessage: boolean;
}

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content: "¡Hola! Soy **TRUST MIND**, tu agente AI para granjas de bots. 🤖\n\nPuedo ayudarte con GenFarmer, Xiaowei, proxies y anti-detección. También puedo ejecutar acciones directamente en tus herramientas.\n\n¿Qué necesitas hoy?",
  timestamp: new Date(),
};

function renderMarkdown(content: string): string {
  let html = content;
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const escaped = code.trim().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<div class="code-block"><span class="code-lang">${lang || "code"}</span><pre>${escaped}</pre></div>`;
  });
  html = html.replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>');
  html = html.replace(/^### (.+)$/gm, '<p class="msg-h3">$1</p>');
  html = html.replace(/^## (.+)$/gm, '<p class="msg-h2">$1</p>');
  html = html.replace(/^# (.+)$/gm, '<p class="msg-h1">$1</p>');
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/^[-•] (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*?<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="numbered">$1</li>');
  html = html.replace(/(<li class="numbered">.*?<\/li>\n?)+/g, (match) => `<ol>${match}</ol>`);
  html = html.replace(/^---$/gm, "<hr />");
  html = html.replace(/\n\n/g, "<br /><br />");
  html = html.replace(/\n/g, "<br />");
  return html;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <button onClick={handleCopy} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded" style={{ color: "#64748b" }} title="Copiar">
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days} días`;
  return date.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

function UpgradeModal({ onClose, onUpgrade }: { onClose: () => void; onUpgrade: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="relative rounded-2xl p-8 max-w-md w-full mx-4 text-center" style={{ background: "var(--surface)", border: "1px solid #007ABF" }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
          <X size={18} />
        </button>

        {/* Icono */}
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: "linear-gradient(135deg, #007ABF, #005F96)" }}>
          <Crown size={28} className="text-yellow-300" />
        </div>

        <h2 className="text-xl font-bold text-white mb-2">Límite alcanzado</h2>
        <p className="text-sm text-gray-400 mb-6">
          Usaste tus <strong className="text-white">30 mensajes gratuitos</strong> de este mes.<br />
          Pasa a Pro para continuar sin límites.
        </p>

        {/* Plan free vs pro */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-xl p-4 text-left" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <p className="text-xs font-semibold text-gray-400 mb-2">FREE</p>
            <p className="text-2xl font-bold text-white mb-3">$0</p>
            <div className="space-y-1.5 text-xs text-gray-400">
              <p>✓ 30 mensajes/mes</p>
              <p>✓ Historial básico</p>
              <p className="text-gray-600">✗ Mensajes ilimitados</p>
              <p className="text-gray-600">✗ Acceso prioritario</p>
            </div>
          </div>
          <div className="rounded-xl p-4 text-left" style={{ background: "linear-gradient(135deg, #2e1065, #1e1b4b)", border: "1px solid #007ABF" }}>
            <div className="flex items-center gap-1 mb-2">
              <p className="text-xs font-semibold" style={{ color: "#56B4E0" }}>PRO</p>
              <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "#007ABF20", color: "#56B4E0" }}>Popular</span>
            </div>
            <p className="text-2xl font-bold text-white mb-3">$19<span className="text-sm font-normal text-gray-400">/mes</span></p>
            <div className="space-y-1.5 text-xs text-gray-300">
              <p>✓ Mensajes ilimitados</p>
              <p>✓ Historial completo</p>
              <p>✓ Acceso prioritario</p>
              <p>✓ Nuevas funciones</p>
            </div>
          </div>
        </div>

        <button
          onClick={onUpgrade}
          className="w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #007ABF, #005F96)" }}
        >
          <Sparkles size={15} />
          Obtener TRUST MIND Pro — $19/mes
        </button>
        <p className="text-xs text-gray-600 mt-3">Cancela cuando quieras • Pago seguro con Stripe</p>
      </div>
    </div>
  );
}

function LoginScreen() {
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
        boxShadow: large ? "0 0 40px #007ABF40" : "none",
      }}
      onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.opacity = "0.92"; e.currentTarget.style.transform = "translateY(-1px)"; }}}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "none"; }}
    >
      {loading ? (
        <><div style={{ width: "16px", height: "16px", border: "2px solid #94a3b8", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} /><span style={{ color: "#64748b" }}>Redirigiendo...</span></>
      ) : (
        <>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {large ? "Entrar con Google — Es gratis" : "Continuar con Google"}
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
      `}</style>

      {/* === NAVBAR === */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(7,7,14,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(124,58,237,0.15)", padding: "0 32px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ position: "relative", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", inset: "-3px", borderRadius: "50%", background: "radial-gradient(circle, #007ABF55, transparent 70%)", filter: "blur(5px)" }} />
            <FarmMindLogo size={30} />
          </div>
          <span style={{ fontWeight: 800, fontSize: "15px", letterSpacing: "-0.3px" }}>TRUST MIND<span style={{ color: "#007ABF" }}> AI</span></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <a href="https://skool.com/artificial-humans" target="_blank" rel="noreferrer" style={{ fontSize: "13px", color: "#64748b", textDecoration: "none", fontWeight: 500 }}>Artificial Humans ↗</a>
          <GoogleButton />
        </div>
      </nav>

      {/* === HERO === */}
      <section style={{ position: "relative", overflow: "hidden", background: "linear-gradient(160deg, #000C18 0%, #001530 30%, #000A14 70%, #07070e 100%)", padding: "100px 32px 80px", textAlign: "center" }}>
        {/* Grid overlay */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(124,58,237,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.06) 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" }} />
        {/* Orbs */}
        <div style={{ position: "absolute", top: "-100px", left: "50%", transform: "translateX(-50%)", width: "700px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, #007ABF25, transparent 65%)", filter: "blur(60px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-60px", right: "5%", width: "300px", height: "300px", borderRadius: "50%", background: "radial-gradient(circle, #005FA420, transparent 70%)", filter: "blur(40px)", pointerEvents: "none" }} />

        <div style={{ position: "relative", maxWidth: "820px", margin: "0 auto", animation: "fade-up 0.7s ease-out" }}>
          {/* Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "6px 16px", borderRadius: "100px", background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.4)", marginBottom: "28px" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34d399", animation: "glow-pulse 2s ease-in-out infinite" }} />
            <span style={{ fontSize: "12px", color: "#88D0F0", fontWeight: 600, letterSpacing: "0.5px" }}>Agente activo · Claude API · Solo para Artificial Humans</span>
          </div>

          {/* Headline */}
          <h1 style={{ fontSize: "clamp(44px, 8vw, 80px)", fontWeight: 900, lineHeight: 1.0, letterSpacing: "-0.04em", marginBottom: "24px" }}>
            <span style={{ background: "linear-gradient(135deg, #fff 0%, #C0E8F8 40%, #56B4E0 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Tu agente AI</span>
            <br />
            <span style={{ background: "linear-gradient(135deg, #88D0F0 0%, #007ABF 60%, #005FA4 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>para bot farms</span>
          </h1>

          <p style={{ fontSize: "18px", color: "#94a3b8", lineHeight: 1.7, maxWidth: "560px", margin: "0 auto 40px" }}>
            Controla GenFarmer, gestiona proxies, detecta anomalías y pide servicios SMM — todo desde una sola conversación con IA.
          </p>

          {/* CTA */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
            <GoogleButton large />
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34d399" }} />
              <span style={{ fontSize: "13px", color: "#64748b" }}>30 mensajes gratis · Sin tarjeta</span>
            </div>
          </div>
        </div>

        {/* Floating preview card */}
        <div style={{ position: "relative", maxWidth: "680px", margin: "60px auto 0", animation: "float 5s ease-in-out infinite" }}>
          <div style={{ background: "rgba(13,13,24,0.9)", border: "1px solid rgba(124,58,237,0.3)", borderRadius: "20px", padding: "20px 24px", backdropFilter: "blur(20px)", boxShadow: "0 0 60px rgba(124,58,237,0.2), 0 40px 80px rgba(0,0,0,0.6)", textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", paddingBottom: "14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ position: "relative", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle, #007ABF50, transparent)", filter: "blur(4px)" }} />
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
              { role: "user", text: "¿Cuántos delays poner en GenFarmer para TikTok sin que me baneen?" },
              { role: "ai", text: "Para TikTok con GenFarmer, recomiendo **3-7 segundos** entre acciones y **25-40 min** entre sesiones. Usa proxies residenciales rotativos y limita a **4-6 cuentas por IP**. Con esos parámetros tu tasa de baneo debería bajar al ~3%." },
            ].map((msg, i) => (
              <div key={i} style={{ display: "flex", gap: "10px", flexDirection: msg.role === "user" ? "row-reverse" : "row", marginBottom: "10px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "10px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: msg.role === "user" ? "#1e1e30" : "linear-gradient(135deg, #007ABF, #005FA4)" }}>
                  {msg.role === "user" ? <User size={13} color="#56B4E0" /> : <Bot size={13} color="white" />}
                </div>
                <div style={{ maxWidth: "80%", background: msg.role === "user" ? "linear-gradient(135deg, #007ABF, #005F96)" : "rgba(255,255,255,0.06)", border: msg.role === "ai" ? "1px solid rgba(255,255,255,0.08)" : "none", borderRadius: msg.role === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px", padding: "10px 14px", fontSize: "13px", lineHeight: 1.6, color: "#e2e8f0" }}
                  dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.+?)\*\*/g, "<strong style='color:white'>$1</strong>") }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === FEATURES === */}
      <section style={{ padding: "80px 32px", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, letterSpacing: "-0.03em", background: "linear-gradient(135deg, #fff, #56B4E0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "12px" }}>
            Todo lo que necesita tu granja
          </h2>
          <p style={{ color: "#64748b", fontSize: "15px", maxWidth: "440px", margin: "0 auto", lineHeight: 1.6 }}>Desde optimización de bots hasta pedidos SMM masivos — TRUST MIND lo gestiona todo.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
          {[
            { emoji: "🤖", title: "Agente para GenFarmer", desc: "Configuración de delays, rotación de cuentas, estrategias anti-detección específicas para cada plataforma.", color: "#007ABF" },
            { emoji: "🌐", title: "Gestión de proxies", desc: "Análisis de proveedores, rotación óptima, detección de IPs quemadas y recomendaciones por plataforma.", color: "#005FA4" },
            { emoji: "📦", title: "Panel SMM integrado", desc: "Pide seguidores, likes, views y más en +15 plataformas directamente desde TRUST MIND. Pagos con crypto.", color: "#0891b2" },
            { emoji: "🛡️", title: "Anti-detección", desc: "Fingerprinting, user-agent rotation, patrones de comportamiento humano para máxima supervivencia de cuentas.", color: "#059669" },
            { emoji: "📊", title: "Análisis en tiempo real", desc: "Métricas de éxito, tasa de baneo, rendimiento por plataforma y alertas automáticas de anomalías.", color: "#d97706" },
            { emoji: "⚡", title: "Respuestas al instante", desc: "Powered by Claude (Anthropic). Historial de conversaciones guardado. Aprende de tu granja específica.", color: "#db2777" },
          ].map((f) => (
            <div key={f.title} style={{ background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: "20px", padding: "28px", position: "relative", overflow: "hidden" }}
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

      {/* === PRICING === */}
      <section style={{ padding: "80px 32px", background: "linear-gradient(180deg, transparent, rgba(124,58,237,0.05), transparent)" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, letterSpacing: "-0.03em", color: "white", marginBottom: "10px" }}>Planes simples</h2>
            <p style={{ color: "#64748b", fontSize: "15px" }}>Empieza gratis, escala cuando quieras.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            {/* Free */}
            <div style={{ background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: "24px", padding: "32px" }}>
              <p style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>Free</p>
              <div style={{ marginBottom: "24px" }}>
                <span style={{ fontSize: "48px", fontWeight: 900, color: "white" }}>$0</span>
                <span style={{ fontSize: "14px", color: "#64748b" }}> / mes</span>
              </div>
              <div style={{ borderTop: "1px solid #1e1e30", paddingTop: "20px" }}>
                {["30 mensajes / mes", "Historial básico", "Acceso al Panel SMM", "Soporte de comunidad"].map((f) => (
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
            {/* Pro */}
            <div style={{ background: "linear-gradient(135deg, #001528, #001020)", border: "1px solid #007ABF50", borderRadius: "24px", padding: "32px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: "12px", right: "12px", padding: "3px 10px", borderRadius: "20px", background: "#007ABF20", border: "1px solid #007ABF40", fontSize: "11px", color: "#56B4E0", fontWeight: 700 }}>
                Popular
              </div>
              <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "200px", height: "200px", borderRadius: "50%", background: "radial-gradient(circle, #007ABF20, transparent 70%)", pointerEvents: "none" }} />
              <p style={{ fontSize: "12px", fontWeight: 700, color: "#56B4E0", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>Pro</p>
              <div style={{ marginBottom: "24px" }}>
                <span style={{ fontSize: "48px", fontWeight: 900, color: "white" }}>$19</span>
                <span style={{ fontSize: "14px", color: "#64748b" }}> / mes</span>
              </div>
              <div style={{ borderTop: "1px solid rgba(124,58,237,0.2)", paddingTop: "20px" }}>
                {["Mensajes ilimitados", "Historial completo", "Acceso prioritario", "Nuevas funciones primero", "Soporte directo"].map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                    <span style={{ color: "#56B4E0", fontSize: "14px" }}>✓</span>
                    <span style={{ fontSize: "13px", color: "#88D0F0" }}>{f}</span>
                  </div>
                ))}
              </div>
              <button onClick={handleGoogleLogin} disabled={loading} style={{ marginTop: "20px", width: "100%", padding: "12px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg, #007ABF, #005F96)", color: "white", fontSize: "14px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                <Crown size={14} className="text-yellow-300" /> Comenzar con Pro
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* === FOOTER CTA === */}
      <section style={{ padding: "80px 32px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "600px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, #007ABF15, transparent 70%)", filter: "blur(60px)", pointerEvents: "none" }} />
        <div style={{ position: "relative" }}>
          <h2 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 900, letterSpacing: "-0.04em", background: "linear-gradient(135deg, #fff, #56B4E0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "16px", lineHeight: 1.1 }}>
            Listo para automatizar<br />tu granja?
          </h2>
          <p style={{ color: "#64748b", fontSize: "15px", marginBottom: "36px" }}>Solo para miembros de Artificial Humans · Exclusivo · Potenciado por Claude</p>
          <GoogleButton large />
        </div>
      </section>

      {/* === FOOTER === */}
      <footer style={{ padding: "24px 32px", borderTop: "1px solid #1e1e30", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <FarmMindLogo size={22} />
          <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>TRUST MIND AI</span>
        </div>
        <span style={{ fontSize: "12px", color: "#475569" }}>© 2025 Artificial Humans · Powered by Anthropic Claude</span>
      </footer>
    </div>
  );
}

export default function TrustMindChat() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradingToStripe, setUpgradingToStripe] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoadingAuth(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Check URL params for payment result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      window.history.replaceState({}, "", "/");
      fetchUserProfile();
    }
  }, []);

  const fetchUserProfile = async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data);
      }
    } catch { /* silencioso */ }
  };

  useEffect(() => {
    if (user) {
      loadConversations();
      fetchUserProfile();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = async () => {
    setLoadingConvs(true);
    const { data } = await supabase
      .from("conversations")
      .select("id, title, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setConversations(data);
    setLoadingConvs(false);
  };

  const loadConversation = async (conv: Conversation) => {
    if (isStreaming) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });

    if (data && data.length > 0) {
      const loaded: Message[] = data.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        timestamp: new Date(m.created_at),
      }));
      setMessages(loaded);
      setConversationId(conv.id);
    }
  };

  const deleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    await supabase.from("messages").delete().eq("conversation_id", convId);
    await supabase.from("conversations").delete().eq("id", convId);
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (conversationId === convId) {
      setMessages([{ ...WELCOME_MESSAGE, timestamp: new Date() }]);
      setConversationId(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMessages([{ ...WELCOME_MESSAGE, timestamp: new Date() }]);
    setConversationId(null);
    setConversations([]);
    setUserProfile(null);
  };

  const handleUpgrade = async () => {
    setUpgradingToStripe(true);
    try {
      const priceId = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID;
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      alert("Error conectando con Stripe. Intenta más tarde.");
    } finally {
      setUpgradingToStripe(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.open(data.url, "_blank");
    } catch {
      alert("Error abriendo portal de facturación.");
    }
  };

  const saveConversation = useCallback(async (msgs: Message[]) => {
    if (!user) return;
    setSaveStatus("saving");
    try {
      const realMessages = msgs.filter((m) => m.id !== "welcome");
      if (realMessages.length === 0) return;
      let convId = conversationId;
      if (!convId) {
        const { data } = await supabase.from("conversations")
          .insert({ user_id: user.id, title: realMessages[0]?.content.slice(0, 60) || "Nueva conversación" })
          .select("id, title, created_at").single();
        convId = data?.id ?? null;
        setConversationId(convId);
        if (data) setConversations((prev) => [data, ...prev]);
      }
      if (convId) {
        await supabase.from("messages").delete().eq("conversation_id", convId);
        await supabase.from("messages").insert(
          realMessages.map((m) => ({ conversation_id: convId, user_id: user.id, role: m.role, content: m.content }))
        );
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch { setSaveStatus("idle"); }
  }, [user, conversationId]);

  const newChat = useCallback(() => {
    if (isStreaming) return;
    setMessages([{ ...WELCOME_MESSAGE, timestamp: new Date() }]);
    setInput("");
    setConversationId(null);
  }, [isStreaming]);

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isStreaming) return;

    // Verificar límite de mensajes
    if (userProfile && !userProfile.canSendMessage) {
      setShowUpgrade(true);
      return;
    }

    const userMessage: Message = { id: Date.now().toString(), role: "user", content: messageText, timestamp: new Date() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsStreaming(true);

    // Actualizar contador local optimistamente
    if (userProfile && !userProfile.isPro) {
      setUserProfile((prev) => prev ? {
        ...prev,
        messagesThisMonth: prev.messagesThisMonth + 1,
        canSendMessage: prev.messagesThisMonth + 1 < (prev.messagesLimit || 30),
      } : prev);
    }

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", timestamp: new Date() }]);
    try {
      const apiMessages = updatedMessages.filter((m) => m.id !== "welcome").map((m) => ({ role: m.role, content: m.content }));
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: apiMessages }) });
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try { fullContent += JSON.parse(data).text; setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: fullContent } : m)); } catch {}
          }
        }
      }
      const finalMessages = [...updatedMessages, { id: assistantId, role: "assistant" as const, content: fullContent, timestamp: new Date() }];
      if (user) saveConversation(finalMessages);
    } catch {
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: "❌ Error conectando con la API. Verifica tu ANTHROPIC_API_KEY." } : m));
    } finally { setIsStreaming(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  if (loadingAuth) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  const userName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuario";
  const userAvatar = user.user_metadata?.avatar_url;
  const isPro = userProfile?.isPro ?? false;
  const messagesLeft = userProfile
    ? userProfile.isPro
      ? null
      : Math.max(0, (userProfile.messagesLimit || 30) - userProfile.messagesThisMonth)
    : null;

  return (
    <>
      <style>{`
        .code-block { background: #070710; border: 1px solid #1e1e30; border-radius: 10px; margin: 10px 0; overflow: hidden; }
        .code-lang { display: block; background: #0d0d18; color: #56B4E0; font-size: 11px; font-family: monospace; padding: 5px 14px; border-bottom: 1px solid #1e1e30; font-weight: 600; letter-spacing: 0.5px; }
        .code-block pre { margin: 0; padding: 14px; font-family: 'Menlo', 'Monaco', monospace; font-size: 12px; color: #e2e8f0; overflow-x: auto; white-space: pre; }
        .inline-code { background: #1e1e38; padding: 2px 7px; border-radius: 5px; color: #56B4E0; font-size: 0.85em; font-family: monospace; }
        .msg-h1 { font-size: 1.15em; font-weight: 800; color: #f0efff; margin: 10px 0 5px; letter-spacing: -0.3px; }
        .msg-h2 { font-size: 1.02em; font-weight: 700; color: #e2e8f0; margin: 8px 0 4px; border-bottom: 1px solid #1e1e30; padding-bottom: 4px; }
        .msg-h3 { font-size: 0.95em; font-weight: 700; color: #56B4E0; margin: 6px 0 3px; }
        ul { padding-left: 18px; margin: 5px 0; }
        ol { padding-left: 18px; margin: 5px 0; }
        li { margin: 3px 0; color: #c8d3e8; }
        li.numbered { list-style: decimal; }
        hr { border: none; border-top: 1px solid #1e1e30; margin: 10px 0; }
        strong { color: #f0efff; font-weight: 700; }
        .conv-item:hover .conv-delete { opacity: 1; }
        .conv-delete { opacity: 0; transition: opacity 0.2s; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Mobile responsive ── */
        .sidebar-panel {
          transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
        }
        .mobile-menu-btn { display: none; }
        .sidebar-overlay { display: none; }

        @media (max-width: 768px) {
          .sidebar-panel {
            position: fixed !important;
            top: 0; left: 0; bottom: 0;
            z-index: 100;
            transform: translateX(-100%);
            width: 260px !important;
            box-shadow: 8px 0 40px rgba(0,0,0,0.6);
          }
          .sidebar-panel.open {
            transform: translateX(0);
          }
          .sidebar-overlay {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.6);
            z-index: 99;
            backdrop-filter: blur(2px);
          }
          .mobile-menu-btn { display: flex !important; }
          .chat-messages { padding: 16px 14px !important; }
          .chat-input-area { padding: 12px 14px !important; }
          .chat-header { padding: 12px 16px !important; }
        }
      `}</style>

      {showUpgrade && (
        <UpgradeModal
          onClose={() => setShowUpgrade(false)}
          onUpgrade={handleUpgrade}
        />
      )}

      <div className="flex h-screen" style={{ background: "var(--bg)" }}>

        {/* Mobile overlay backdrop */}
        {sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <div className={`sidebar-panel w-64 flex-shrink-0 flex flex-col border-r${sidebarOpen ? " open" : ""}`} style={{ background: "var(--surface)", borderColor: "var(--border)" }}>

          {/* Logo + New Chat */}
          <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div style={{ position: "relative", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <div style={{ position: "absolute", inset: "-2px", borderRadius: "50%", background: "radial-gradient(circle, #007ABF50, transparent 70%)", filter: "blur(5px)" }} />
                  <FarmMindLogo size={30} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h1 style={{ fontWeight: 800, color: "white", fontSize: "15px", letterSpacing: "-0.3px" }}>TRUST MIND</h1>
                    {isPro && <Crown size={11} className="text-yellow-400" />}
                  </div>
                  <p style={{ fontSize: "11px", color: "var(--accent-light)", fontWeight: 500 }}>Bot Farm AI Agent</p>
                </div>
              </div>
              <button onClick={newChat} disabled={isStreaming} title="Nueva conversación"
                className="w-7 h-7 rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
                style={{ background: "var(--surface-2)", color: "var(--text-3)", border: "1px solid var(--border)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#56B4E0"; e.currentTarget.style.borderColor = "#007ABF50"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-3)"; e.currentTarget.style.borderColor = "var(--border)"; }}>
                <Plus size={13} />
              </button>
            </div>
          </div>

          {/* Nav: Panel SMM */}
          <div className="px-3 pt-3 pb-1">
            <Link href="/smm"
              className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-2xl transition-all"
              style={{ background: "linear-gradient(135deg, #001528, #001020)", border: "1px solid #007ABF40" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#007ABF80"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#007ABF40"; }}>
              <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #007ABF, #005F96)" }}>
                <ShoppingCart size={13} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: "12px", fontWeight: 700, color: "white", letterSpacing: "-0.1px" }}>Panel SMM</p>
                <p style={{ fontSize: "10px", color: "#1E90D4", marginTop: "1px" }}>Servicios & pedidos</p>
              </div>
              <span style={{ fontSize: "12px", color: "#007ABF" }}>›</span>
            </Link>
          </div>

          {/* Historial de conversaciones */}
          <div className="flex-1 overflow-y-auto">
            {conversations.length > 0 && (
              <div className="p-3">
                <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px", paddingLeft: "4px" }}>Conversaciones</p>
                <div className="space-y-0.5">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => loadConversation(conv)}
                      className="conv-item flex items-center gap-2 p-2 rounded-xl cursor-pointer group"
                      style={{
                        background: conversationId === conv.id ? "var(--surface-2)" : "transparent",
                        border: conversationId === conv.id ? "1px solid var(--border)" : "1px solid transparent",
                      }}
                      onMouseEnter={(e) => { if (conversationId !== conv.id) e.currentTarget.style.background = "var(--surface-2)"; }}
                      onMouseLeave={(e) => { if (conversationId !== conv.id) e.currentTarget.style.background = "transparent"; }}
                    >
                      <MessageSquare size={11} style={{ flexShrink: 0, color: "var(--text-3)" }} />
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: "12px", color: "#c8d3e8", fontWeight: 500 }} className="truncate">{conv.title}</p>
                        <p style={{ fontSize: "10px", color: "var(--text-3)" }}>{formatDate(conv.created_at)}</p>
                      </div>
                      <button
                        onClick={(e) => deleteConversation(e, conv.id)}
                        className="conv-delete w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ color: "var(--text-3)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-3)")}
                        title="Eliminar"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                </div>
                {loadingConvs && <p style={{ fontSize: "11px", color: "var(--text-3)", textAlign: "center", paddingTop: "8px" }}>Cargando...</p>}
              </div>
            )}

            {conversations.length === 0 && !loadingConvs && (
              <div className="p-3">
                <div className="mt-0">
                  <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px", paddingLeft: "4px" }}>Acciones rápidas</p>
                  <div className="space-y-0.5">
                    {["¿Cuánto delay usar en GenFarmer?", "Mis cuentas están siendo baneadas", "¿Qué proxies para TikTok?"].map((action, i) => (
                      <button key={i} onClick={() => sendMessage(action)} className="w-full text-left p-2 rounded-xl transition-colors" style={{ fontSize: "12px", color: "var(--text-2)" }} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>{action}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {conversations.length > 0 && (
              <div className="px-3 pb-3">
                <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px", paddingLeft: "4px" }}>Acciones rápidas</p>
                <div className="space-y-0.5">
                  {["¿Cuánto delay en GenFarmer?", "Cuentas baneadas, ¿qué hago?", "Proxies para TikTok"].map((action, i) => (
                    <button key={i} onClick={() => { newChat(); setTimeout(() => sendMessage(action), 100); }} className="w-full text-left p-2 rounded-xl transition-colors" style={{ fontSize: "12px", color: "var(--text-2)" }} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>{action}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Upgrade banner (solo para free) */}
          {!isPro && userProfile && (
            <div className="px-3 pb-2">
              <div className="rounded-2xl p-3" style={{ background: "linear-gradient(135deg, #001020, #001528)", border: "1px solid #002860" }}>
                <div className="flex items-center justify-between mb-2">
                  <p style={{ fontSize: "11px", fontWeight: 700, color: "#88D0F0" }}>Plan Free</p>
                  <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "20px", background: "#007ABF25", color: "#56B4E0", fontWeight: 600 }}>
                    {messagesLeft} restantes
                  </span>
                </div>
                <div className="h-1 rounded-full mb-2.5" style={{ background: "var(--border-2)" }}>
                  <div
                    className="h-1 rounded-full transition-all"
                    style={{
                      background: "linear-gradient(90deg, #007ABF, #56B4E0)",
                      width: `${Math.min(100, (userProfile.messagesThisMonth / (userProfile.messagesLimit || 30)) * 100)}%`,
                    }}
                  />
                </div>
                <button
                  onClick={() => setShowUpgrade(true)}
                  style={{ width: "100%", padding: "8px 0", borderRadius: "10px", fontSize: "12px", fontWeight: 700, color: "white", background: "linear-gradient(135deg, #007ABF, #005F96)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                >
                  <Crown size={11} className="text-yellow-300" />
                  Upgrade a Pro — $19/mes
                </button>
              </div>
            </div>
          )}

          {/* User */}
          <div className="p-3 border-t" style={{ borderColor: "var(--border)" }}>
            {saveStatus === "saving" && <p style={{ fontSize: "11px", color: "var(--text-3)", textAlign: "center", marginBottom: "8px" }}>Guardando...</p>}
            {saveStatus === "saved" && <p style={{ fontSize: "11px", color: "var(--green)", textAlign: "center", marginBottom: "8px" }}>Guardado ✓</p>}
            <div className="flex items-center justify-between gap-2 rounded-2xl p-2" style={{ background: "var(--surface-2)" }}>
              <div className="flex items-center gap-2 min-w-0">
                {userAvatar ? <img src={userAvatar} alt={userName} style={{ width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0 }} /> : <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#007ABF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><User size={12} color="white" /></div>}
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <p style={{ fontSize: "12px", fontWeight: 700, color: "white" }} className="truncate">{userName}</p>
                    {isPro && <Crown size={10} className="text-yellow-400 flex-shrink-0" />}
                  </div>
                  <p style={{ fontSize: "10px", color: "var(--text-3)" }} className="truncate">
                    {isPro ? (
                      <button onClick={handleManageBilling} style={{ color: "var(--text-3)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "#56B4E0"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-3)"; }}>
                        Plan Pro ↗
                      </button>
                    ) : user.email}
                  </p>
                </div>
              </div>
              <button onClick={handleLogout} title="Cerrar sesión" style={{ width: "28px", height: "28px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: "var(--text-3)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#f87171"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-3)"; }}>
                <LogOut size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="flex-1 flex flex-col" style={{ overflow: "hidden" }}>
          {/* Chat header */}
          <div className="chat-header" style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {/* Hamburger — solo mobile */}
              <button
                className="mobile-menu-btn"
                onClick={() => setSidebarOpen(true)}
                style={{ display: "none", width: "34px", height: "34px", alignItems: "center", justifyContent: "center", borderRadius: "10px", background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-2)", cursor: "pointer" }}>
                <Menu size={16} />
              </button>
              <div style={{ position: "relative", width: "38px", height: "38px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ position: "absolute", inset: "-3px", borderRadius: "50%", background: "radial-gradient(circle, #007ABF50, transparent 70%)", filter: "blur(5px)" }} />
                <FarmMindLogo size={32} />
              </div>
              <div>
                <h2 style={{ fontSize: "15px", fontWeight: 800, color: "white", letterSpacing: "-0.3px" }}>TRUST MIND</h2>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34d399", boxShadow: "0 0 6px #34d39960" }} />
                  <span style={{ fontSize: "11px", color: "var(--text-3)", fontWeight: 500 }}>Agente activo</span>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {isPro ? (
                <span style={{ fontSize: "11px", padding: "4px 12px", borderRadius: "20px", fontWeight: 700, background: "linear-gradient(135deg, #001528, #000E1C)", color: "#88D0F0", border: "1px solid #007ABF50", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Crown size={10} className="text-yellow-400" /> Pro
                </span>
              ) : (
                <span style={{ fontSize: "11px", padding: "4px 12px", borderRadius: "20px", fontWeight: 600, background: "var(--surface-2)", color: "var(--accent-light)", border: "1px solid var(--border)" }}>🤖 Fase 1</span>
              )}
              {upgradingToStripe && <div style={{ width: "16px", height: "16px", borderRadius: "50%", border: "2px solid #007ABF", borderTopColor: "transparent", animation: "spin 0.6s linear infinite" }} />}
            </div>
          </div>

          {/* Messages */}
          <div className="chat-messages flex-1 overflow-y-auto" style={{ padding: "28px 28px", display: "flex", flexDirection: "column", gap: "20px" }}>
            {messages.map((msg) => (
              <div key={msg.id} style={{ display: "flex", gap: "12px", flexDirection: msg.role === "user" ? "row-reverse" : "row" }} className="group">
                <div style={{ width: "32px", height: "32px", borderRadius: "12px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: msg.role === "user" ? "var(--surface-3)" : "linear-gradient(135deg, #007ABF, #005FA4)" }}>
                  {msg.role === "user" ? <User size={14} color="#56B4E0" /> : <FarmMindLogo size={16} />}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxWidth: "min(680px, 75%)", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    borderRadius: msg.role === "user" ? "20px 6px 20px 20px" : "6px 20px 20px 20px",
                    padding: "12px 16px",
                    fontSize: "14px",
                    lineHeight: "1.65",
                    ...(msg.role === "user"
                      ? { background: "linear-gradient(135deg, #007ABF, #005F96)", color: "white" }
                      : { background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)" }
                    )
                  }}>
                    {msg.content === "" && isStreaming ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "5px", padding: "4px 0" }}>
                        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#56B4E0" }} className="typing-dot" />
                        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#56B4E0" }} className="typing-dot" />
                        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#56B4E0" }} className="typing-dot" />
                      </div>
                    ) : <span dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0 4px" }}>
                    <span style={{ fontSize: "10px", color: "var(--text-3)" }}>{formatTime(msg.timestamp)}</span>
                    {msg.role === "assistant" && msg.content && <CopyButton text={msg.content} />}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="chat-input-area" style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", background: "var(--surface)", flexShrink: 0 }}>
            {!isPro && messagesLeft !== null && messagesLeft <= 5 && messagesLeft > 0 && (
              <div style={{ marginBottom: "12px", padding: "9px 14px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#001020", border: "1px solid #007ABF50" }}>
                <span style={{ fontSize: "12px", color: "#88D0F0" }}>⚠️ Solo te quedan <strong style={{ color: "white" }}>{messagesLeft} mensajes</strong> este mes</span>
                <button onClick={() => setShowUpgrade(true)} style={{ fontSize: "11px", color: "#fbbf24", fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}>Upgrade →</button>
              </div>
            )}
            {!isPro && messagesLeft === 0 && (
              <div style={{ marginBottom: "12px", padding: "9px 14px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#001020", border: "1px solid #007ABF50" }}>
                <span style={{ fontSize: "12px", color: "#88D0F0" }}>🔒 Límite mensual alcanzado</span>
                <button onClick={() => setShowUpgrade(true)} style={{ fontSize: "11px", color: "#fbbf24", fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}>Upgrade a Pro →</button>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", borderRadius: "20px", padding: "10px 12px", background: "var(--surface-2)", border: "1px solid var(--border-2)" }}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={messagesLeft === 0 && !isPro ? "Límite alcanzado — Upgrade a Pro..." : "Pregúntame algo sobre tu farm..."}
                disabled={messagesLeft === 0 && !isPro}
                rows={1}
                style={{ flex: 1, background: "transparent", fontSize: "14px", color: "white", resize: "none", outline: "none", border: "none", maxHeight: "120px", cursor: messagesLeft === 0 && !isPro ? "not-allowed" : "text", fontFamily: "inherit" }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isStreaming || (messagesLeft === 0 && !isPro)}
                style={{
                  width: "36px", height: "36px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "none",
                  background: input.trim() && !isStreaming && (isPro || messagesLeft !== 0) ? "linear-gradient(135deg, #007ABF, #005F96)" : "var(--border)",
                  cursor: input.trim() && !isStreaming && (isPro || messagesLeft !== 0) ? "pointer" : "not-allowed",
                  transition: "background 0.15s",
                }}
              >
                <Send size={14} color="white" />
              </button>
            </div>
            <p style={{ textAlign: "center", fontSize: "11px", color: "var(--text-3)", marginTop: "8px" }}>Enter para enviar · Shift+Enter nueva línea</p>
          </div>
        </div>
      </div>
    </>
  );
}

function StatusItem({ icon, label, status }: { icon: React.ReactNode; label: string; status: "online" | "pending" | "offline" }) {
  const colors = { online: "#4ade80", pending: "#facc15", offline: "#f87171" };
  const labels = { online: "Conectado", pending: "Pendiente", offline: "Offline" };
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-gray-400">{icon}<span className="text-xs">{label}</span></div>
      <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full" style={{ background: colors[status] }} /><span className="text-xs" style={{ color: colors[status] }}>{labels[status]}</span></div>
    </div>
  );
}
