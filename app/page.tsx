"use client";

export const dynamic = "force-dynamic";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Send, Bot, User, Zap, Shield, Cpu, Plus, Copy, Check, LogOut, MessageSquare, Trash2, Crown, X, Sparkles, ShoppingCart, Menu, Star } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import { FarmMindLogo } from "@/app/components/FarmMindLogo";
import { PromoBanner } from "@/app/components/PromoBanner";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  toolLoading?: boolean;
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  // ── DEMO CHAT COMPONENT ─────────────────────────────────────────
  const DemoChat = () => {
    const [demoMessages, setDemoMessages] = useState<{role: string; text: string}[]>([
      { role: "ai", text: "Hola! Soy TRUST MIND. Pregúntame sobre granjas de bots, proxies, servicios SMM o cómo automatizar tu crecimiento en redes sociales." }
    ]);
    const [demoInput, setDemoInput] = useState("");
    const [demoLoading, setDemoLoading] = useState(false);
    const demoChatRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (demoChatRef.current) {
        demoChatRef.current.scrollTop = demoChatRef.current.scrollHeight;
      }
    }, [demoMessages]);

    const sendDemoMessage = async () => {
      const text = demoInput.trim();
      if (!text || demoLoading) return;
      setDemoInput("");
      const newMessages = [...demoMessages, { role: "user", text }];
      setDemoMessages(newMessages);
      setDemoLoading(true);
      try {
        const apiMessages = newMessages.map(m => ({
          role: m.role === "ai" ? "assistant" : "user",
          content: m.text,
        }));
        const res = await fetch("/api/demo-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages }),
        });
        const data = await res.json();
        setDemoMessages(prev => [...prev, { role: "ai", text: data.reply || data.error || "Error al responder" }]);
      } catch {
        setDemoMessages(prev => [...prev, { role: "ai", text: "Error de conexión. Intenta de nuevo." }]);
      } finally {
        setDemoLoading(false);
      }
    };

    const suggestions = ["¿Cuántos followers puedo comprar?", "Delays seguros en Instagram", "¿Qué proxy recomiendas?"];

    return (
      <div style={{ position: "relative", maxWidth: "720px", margin: "70px auto 0" }}>
        <div style={{ background: "rgba(10,10,18,0.97)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "24px", backdropFilter: "blur(24px)", boxShadow: "0 0 80px rgba(0,122,191,0.12), 0 40px 80px rgba(0,0,0,0.5)", textAlign: "left", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle, #007ABF40, transparent)", filter: "blur(4px)" }} />
              <FarmMindLogo size={28} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34d399", boxShadow: "0 0 6px #34d399" }} />
              <span style={{ fontSize: "11px", color: "#64748b" }}>Demo en vivo · Pruébalo gratis</span>
            </div>
          </div>

          {/* Messages */}
          <div ref={demoChatRef} style={{ height: "280px", overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {demoMessages.map((msg, i) => (
              <div key={i} style={{ display: "flex", gap: "10px", flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                <div style={{ width: "30px", height: "30px", borderRadius: "12px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: msg.role === "user" ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg, #007ABF, #0050A0)" }}>
                  {msg.role === "user" ? <User size={14} color="#7dd3fc" /> : <Bot size={14} color="white" />}
                </div>
                <div style={{ maxWidth: "82%", background: msg.role === "user" ? "linear-gradient(135deg, #007ABF, #005A99)" : "rgba(255,255,255,0.04)", border: msg.role === "ai" ? "1px solid rgba(255,255,255,0.06)" : "none", borderRadius: msg.role === "user" ? "18px 6px 18px 18px" : "6px 18px 18px 18px", padding: "12px 16px", fontSize: "13.5px", lineHeight: 1.65, color: "#e2e8f0" }}
                  dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.+?)\*\*/g, "<strong style='color:white'>$1</strong>") }}
                />
              </div>
            ))}
            {demoLoading && (
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ width: "30px", height: "30px", borderRadius: "12px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #007ABF, #0050A0)" }}>
                  <Bot size={14} color="white" />
                </div>
                <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "6px 18px 18px 18px", padding: "14px 18px" }}>
                  <div style={{ display: "flex", gap: "4px" }}>
                    {[0,1,2].map(j => (
                      <div key={j} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#007ABF", animation: `glow-pulse 1.2s ease-in-out ${j * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick suggestions */}
          {demoMessages.length <= 1 && (
            <div style={{ padding: "0 24px 12px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => setDemoInput(s)} style={{ background: "rgba(0,122,191,0.1)", border: "1px solid rgba(0,122,191,0.25)", borderRadius: "20px", padding: "6px 14px", fontSize: "12px", color: "#7dd3fc", cursor: "pointer" }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="text"
              value={demoInput}
              onChange={e => setDemoInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendDemoMessage()}
              placeholder="Escribe tu pregunta..."
              style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "10px 16px", color: "white", fontSize: "14px", outline: "none" }}
            />
            <button
              onClick={sendDemoMessage}
              disabled={demoLoading || !demoInput.trim()}
              style={{ width: "40px", height: "40px", borderRadius: "12px", background: demoInput.trim() ? "linear-gradient(135deg, #007ABF, #0050A0)" : "rgba(255,255,255,0.05)", border: "none", cursor: demoInput.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}
            >
              <Send size={16} color={demoInput.trim() ? "white" : "#374151"} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#050508", color: "#f0efff", fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", overflowX: "hidden" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes fade-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes glow-pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
        @keyframes gradient-shift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes subtle-rotate { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes scale-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .feature-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .feature-card:hover { transform: translateY(-4px); border-color: rgba(0, 122, 191, 0.4) !important; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 60px rgba(0, 122, 191, 0.08); }
        .pricing-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .pricing-card:hover { transform: translateY(-2px); }
        .stat-item { transition: all 0.3s ease; }
        .stat-item:hover { transform: scale(1.05); }
        @media (max-width: 768px) { .hero-grid { grid-template-columns: 1fr !important; } .pricing-grid { grid-template-columns: 1fr !important; } .stats-grid { grid-template-columns: repeat(2, 1fr) !important; } .nav-links { display: none !important; } .nav-hamburger { display: flex !important; } }
        @media (min-width: 769px) { .nav-hamburger { display: none !important; } .nav-mobile-menu { display: none !important; } }
      `}</style>

      {/* === NAVBAR === */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(5,5,8,0.8)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 clamp(16px, 4vw, 48px)", height: "72px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", inset: "-4px", borderRadius: "50%", background: "radial-gradient(circle, #007ABF40, transparent 70%)", filter: "blur(6px)" }} />
            <FarmMindLogo size={32} />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <div className="nav-links" style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <a href="#features" style={{ fontSize: "13px", color: "#94a3b8", textDecoration: "none", fontWeight: 500, transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "#fff"} onMouseLeave={e => e.currentTarget.style.color = "#94a3b8"}>Features</a>
            <a href="#software" style={{ fontSize: "13px", color: "#94a3b8", textDecoration: "none", fontWeight: 500, transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "#fff"} onMouseLeave={e => e.currentTarget.style.color = "#94a3b8"}>Software</a>
            <a href="#pricing" style={{ fontSize: "13px", color: "#94a3b8", textDecoration: "none", fontWeight: 500, transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "#fff"} onMouseLeave={e => e.currentTarget.style.color = "#94a3b8"}>Precios</a>
            <a href="https://www.skool.com/artificial-humans-7653/about" target="_blank" rel="noreferrer" style={{ fontSize: "13px", color: "#94a3b8", textDecoration: "none", fontWeight: 500, transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "#fff"} onMouseLeave={e => e.currentTarget.style.color = "#94a3b8"}>Comunidad ↗</a>
          </div>
          <GoogleButton />
          {/* Hamburger — mobile only */}
          <button
            className="nav-hamburger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ display: "none", alignItems: "center", justifyContent: "center", width: "40px", height: "40px", borderRadius: "10px", background: mobileMenuOpen ? "#007ABF20" : "transparent", border: `1px solid ${mobileMenuOpen ? "#007ABF50" : "#2a2a42"}`, color: mobileMenuOpen ? "#56B4E0" : "#94a3b8", cursor: "pointer" }}
          >
            {mobileMenuOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            )}
          </button>
        </div>
      </nav>
      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="nav-mobile-menu" style={{ position: "sticky", top: "72px", zIndex: 49, background: "rgba(5,5,8,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "16px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <a href="#features" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: "14px", color: "#94a3b8", textDecoration: "none", fontWeight: 500, padding: "8px 0" }}>Features</a>
          <a href="#software" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: "14px", color: "#94a3b8", textDecoration: "none", fontWeight: 500, padding: "8px 0" }}>Software</a>
          <a href="#pricing" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: "14px", color: "#94a3b8", textDecoration: "none", fontWeight: 500, padding: "8px 0" }}>Precios</a>
          <a href="https://www.skool.com/artificial-humans-7653/about" target="_blank" rel="noreferrer" style={{ fontSize: "14px", color: "#94a3b8", textDecoration: "none", fontWeight: 500, padding: "8px 0" }}>Comunidad ↗</a>
          <div style={{ paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <GoogleButton large />
          </div>
        </div>
      )}

      {/* === HERO === */}
      <section style={{ position: "relative", overflow: "hidden", padding: "clamp(60px, 10vw, 120px) 32px clamp(60px, 8vw, 100px)", textAlign: "center" }}>
        {/* Animated background */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% -20%, #001d3d 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "20%", left: "10%", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, #007ABF12, transparent 60%)", filter: "blur(80px)", pointerEvents: "none", animation: "subtle-rotate 30s linear infinite" }} />
        <div style={{ position: "absolute", top: "30%", right: "5%", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, #00B4D815, transparent 60%)", filter: "blur(60px)", pointerEvents: "none", animation: "subtle-rotate 25s linear infinite reverse" }} />
        {/* Subtle grid */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none", maskImage: "radial-gradient(ellipse 60% 50% at 50% 50%, black, transparent)" }} />

        <div style={{ position: "relative", maxWidth: "900px", margin: "0 auto", animation: "fade-up 0.8s ease-out" }}>
          {/* Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "7px 18px", borderRadius: "100px", background: "rgba(0, 122, 191, 0.08)", border: "1px solid rgba(0, 122, 191, 0.25)", marginBottom: "32px", animation: "scale-in 0.5s ease-out" }}>
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#34d399", boxShadow: "0 0 8px #34d399", animation: "glow-pulse 2s ease-in-out infinite" }} />
            <span style={{ fontSize: "13px", color: "#7dd3fc", fontWeight: 600, letterSpacing: "0.3px" }}>Agente activo 24/7</span>
          </div>

          {/* Headline */}
          <h1 style={{ fontSize: "clamp(40px, 7vw, 76px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.045em", marginBottom: "28px" }}>
            <span style={{ color: "#ffffff" }}>Automatiza tu</span>
            <br />
            <span style={{ background: "linear-gradient(135deg, #00B4D8 0%, #007ABF 40%, #0050A0 100%)", backgroundSize: "200% 200%", animation: "gradient-shift 4s ease infinite", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>granja de bots</span>
            <br />
            <span style={{ color: "#ffffff" }}>con IA</span>
          </h1>

          <p style={{ fontSize: "clamp(16px, 2vw, 19px)", color: "#94a3b8", lineHeight: 1.7, maxWidth: "580px", margin: "0 auto 44px", fontWeight: 400 }}>
            GenFarmer, proxies, anti-deteccion y Growth Dashboard. Todo controlado desde un chat inteligente que entiende tu negocio.
          </p>

          {/* CTA */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "20px", flexWrap: "wrap" }}>
            <GoogleButton large />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "20px", marginTop: "16px", flexWrap: "wrap" }}>
            {["Gratis para empezar", "Sin tarjeta", "Setup en 30 seg"].map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Zap size={12} color="#34d399" />
                <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 500 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Demo Chat */}
        <DemoChat />
      </section>

      {/* === STATS / SOCIAL PROOF === */}
      <section style={{ padding: "40px 32px 60px", position: "relative" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "2px", background: "rgba(255,255,255,0.04)", borderRadius: "20px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
            {[
              { value: "+50M", label: "Servicios entregados" },
              { value: "24/7", label: "Agente activo" },
              { value: "+15", label: "Plataformas" },
              { value: "99.8%", label: "Uptime" },
            ].map((s, i) => (
              <div key={i} className="stat-item" style={{ padding: "28px 20px", textAlign: "center", background: "#0a0a12", cursor: "default" }}>
                <div style={{ fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 900, color: "white", letterSpacing: "-0.03em", marginBottom: "6px" }}>{s.value}</div>
                <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === FEATURES === */}
      <section id="features" style={{ padding: "60px 32px 80px", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "60px" }}>
          <div style={{ display: "inline-block", fontSize: "12px", fontWeight: 700, color: "#007ABF", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "16px", padding: "6px 14px", background: "rgba(0,122,191,0.08)", borderRadius: "6px" }}>Features</div>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, letterSpacing: "-0.035em", color: "white", marginBottom: "14px" }}>
            Todo para tu granja en un solo lugar
          </h2>
          <p style={{ color: "#64748b", fontSize: "16px", maxWidth: "500px", margin: "0 auto", lineHeight: 1.7 }}>Optimizacion de bots, pedidos SMM masivos y gestion de infraestructura.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
          {[
            { icon: <Cpu size={22} />, title: "Agente GenFarmer", desc: "Delays, rotacion de cuentas y estrategias anti-deteccion para cada plataforma. Configuracion asistida por IA.", color: "#007ABF" },
            { icon: <Shield size={22} />, title: "Gestion de proxies", desc: "Analisis de proveedores, rotacion optima, deteccion de IPs quemadas. Residenciales, moviles y datacenter.", color: "#00B4D8" },
            { icon: <ShoppingCart size={22} />, title: "Growth Dashboard", desc: "Seguidores, likes, views en +15 plataformas. Pide directo desde el chat. Pagos con crypto.", color: "#0891b2" },
            { icon: <Shield size={22} />, title: "Anti-deteccion", desc: "Fingerprinting, user-agent rotation, comportamiento humano simulado. Maxima supervivencia de cuentas.", color: "#059669" },
            { icon: <Sparkles size={22} />, title: "Analisis inteligente", desc: "Metricas de exito, tasa de baneo, rendimiento por plataforma. Alertas automaticas cuando algo falla.", color: "#d97706" },
            { icon: <Zap size={22} />, title: "Claude AI integrado", desc: "Respuestas instantaneas. Historial guardado. Aprende de tu granja y mejora sus recomendaciones.", color: "#a855f7" },
          ].map((f) => (
            <div key={f.title} className="feature-card" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "20px", padding: "32px", position: "relative", overflow: "hidden", cursor: "default" }}>
              <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "140px", height: "140px", borderRadius: "50%", background: `radial-gradient(circle, ${f.color}10, transparent 70%)`, pointerEvents: "none" }} />
              <div style={{ width: "44px", height: "44px", borderRadius: "14px", background: `${f.color}12`, border: `1px solid ${f.color}25`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "18px", color: f.color }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: "17px", fontWeight: 700, color: "white", marginBottom: "10px", letterSpacing: "-0.2px" }}>{f.title}</h3>
              <p style={{ fontSize: "14px", color: "#7a8599", lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* === SOFTWARE DESKTOP === */}
      <section id="software" style={{ padding: "60px 32px 80px", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "60px" }}>
          <div style={{ display: "inline-block", fontSize: "12px", fontWeight: 700, color: "#007ABF", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "16px", padding: "6px 14px", background: "rgba(0,122,191,0.08)", borderRadius: "6px" }}>Software Desktop</div>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, letterSpacing: "-0.035em", color: "white", marginBottom: "14px" }}>
            Herramientas para escalar
          </h2>
          <p style={{ color: "#64748b", fontSize: "16px", maxWidth: "550px", margin: "0 auto", lineHeight: 1.7 }}>Apps de escritorio profesionales para gestionar cuentas, automatizar y crecer en cada plataforma.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
          {[
            {
              name: "TrustInsta Desktop",
              desc: "Multi-Account Manager para Instagram. Perfiles aislados, anti-deteccion, warm-up inteligente, scraper de seguidores y verificador de shadowban.",
              icon: "TI",
              gradient: "linear-gradient(135deg, #E1306C, #F77737)",
              badge: "Instagram",
              badgeColor: "#E1306C",
              version: "v1.4.7",
              price: "$99/mes",
            },
            {
              name: "TrustFace Desktop",
              desc: "Multi-Account Manager para Facebook. Marketplace automation, Messenger masivo, gestion de grupos, engagement automatizado y scraper profundo.",
              icon: "TF",
              gradient: "linear-gradient(135deg, #1877F2, #0d5bc4)",
              badge: "Facebook",
              badgeColor: "#1877F2",
              version: "v1.4.5",
              price: "$99/mes",
            },
            {
              name: "TrustFarm Desktop",
              desc: "Phone Farm Manager. Controla cientos de dispositivos Android, screen mirroring, auto-login con 2FA y editor visual de automatizaciones.",
              icon: "TF",
              gradient: "linear-gradient(135deg, #7b9bff, #4f46e5)",
              badge: "Phone Farming",
              badgeColor: "#7b9bff",
              version: "v1.1.1",
              price: "Pronto",
            },
          ].map((app) => (
            <div key={app.name} className="feature-card" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "20px", padding: "32px", position: "relative", overflow: "hidden", cursor: "default" }}>
              <div style={{ position: "absolute", top: "-30px", right: "-30px", width: "160px", height: "160px", borderRadius: "50%", background: `radial-gradient(circle, ${app.badgeColor}15, transparent 70%)`, pointerEvents: "none" }} />
              <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "18px" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: app.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: 900, color: "white", letterSpacing: "-1px" }}>
                  {app.icon}
                </div>
                <div>
                  <h3 style={{ fontSize: "17px", fontWeight: 700, color: "white", letterSpacing: "-0.2px", marginBottom: "2px" }}>{app.name}</h3>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: app.badgeColor, textTransform: "uppercase", padding: "2px 8px", background: `${app.badgeColor}15`, borderRadius: "4px" }}>{app.badge}</span>
                    <span style={{ fontSize: "11px", color: "#64748b" }}>{app.version}</span>
                  </div>
                </div>
              </div>
              <p style={{ fontSize: "14px", color: "#7a8599", lineHeight: 1.65, marginBottom: "20px" }}>{app.desc}</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "18px", fontWeight: 800, color: "white" }}>{app.price}</span>
                <Link href="/downloads" style={{ fontSize: "13px", fontWeight: 600, color: "#007ABF", textDecoration: "none", padding: "8px 18px", borderRadius: "10px", border: "1px solid rgba(0,122,191,0.3)", background: "rgba(0,122,191,0.08)", transition: "all 0.2s" }} onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.background = "rgba(0,122,191,0.2)"; }} onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.background = "rgba(0,122,191,0.08)"; }}>
                  Descargar
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: "32px" }}>
          <Link href="/downloads" style={{ fontSize: "14px", fontWeight: 600, color: "#007ABF", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.color = "#00B4D8"; }} onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.color = "#007ABF"; }}>
            Ver todas las descargas y requisitos →
          </Link>
        </div>
      </section>

      {/* === TESTIMONIALS === */}
      <section style={{ padding: "60px 32px 80px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(0,122,191,0.04), transparent)", pointerEvents: "none" }} />
        <div style={{ maxWidth: "900px", margin: "0 auto", position: "relative" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 800, color: "white", letterSpacing: "-0.03em", marginBottom: "10px" }}>Lo que dicen nuestros usuarios</h2>
            <p style={{ color: "#64748b", fontSize: "15px" }}>Operadores de granjas reales usando TRUST MIND.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
            {[
              { name: "Carlos M.", role: "Operador de granja, Mexico", text: "Antes configuraba los delays a mano en cada dispositivo. Ahora TRUST MIND me da la config exacta en segundos. Mis baneos bajaron un 70%.", stars: 5 },
              { name: "Diego R.", role: "Growth Manager, Colombia", text: "El Growth Dashboard me ahorra horas. Pido followers y likes desde el chat, pago con crypto y en minutos ya esta activo.", stars: 5 },
              { name: "Ana L.", role: "Revendedora SMM, Peru", text: "Monte mi panel de reventa en un dia. Mis clientes compran directo y yo gano el margen automatico. Increible.", stars: 5 },
            ].map((t, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "20px", padding: "28px" }}>
                <div style={{ display: "flex", gap: "2px", marginBottom: "16px" }}>
                  {Array(t.stars).fill(0).map((_, j) => (
                    <Star key={j} size={14} fill="#fbbf24" color="#fbbf24" />
                  ))}
                </div>
                <p style={{ fontSize: "14px", color: "#c8d0dc", lineHeight: 1.7, marginBottom: "20px", fontStyle: "italic" }}>&ldquo;{t.text}&rdquo;</p>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "white" }}>{t.name}</div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === PRICING === */}
      <section id="pricing" style={{ padding: "60px 32px 80px" }}>
        <div style={{ maxWidth: "780px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <div style={{ display: "inline-block", fontSize: "12px", fontWeight: 700, color: "#007ABF", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "16px", padding: "6px 14px", background: "rgba(0,122,191,0.08)", borderRadius: "6px" }}>Pricing</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, letterSpacing: "-0.03em", color: "white", marginBottom: "10px" }}>Simple y transparente</h2>
            <p style={{ color: "#64748b", fontSize: "15px" }}>Empieza gratis. Escala cuando quieras.</p>
          </div>
          <div className="pricing-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {/* Free */}
            <div className="pricing-card" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "24px", padding: "36px" }}>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "16px" }}>Free</p>
              <div style={{ marginBottom: "28px" }}>
                <span style={{ fontSize: "52px", fontWeight: 900, color: "white", letterSpacing: "-0.04em" }}>$0</span>
                <span style={{ fontSize: "14px", color: "#475569", marginLeft: "4px" }}>/mes</span>
              </div>
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "24px" }}>
                {["30 mensajes / mes", "Historial basico", "Growth Dashboard", "Soporte comunidad"].map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                    <div style={{ width: "20px", height: "20px", borderRadius: "6px", background: "rgba(52,211,153,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Check size={12} color="#34d399" />
                    </div>
                    <span style={{ fontSize: "14px", color: "#94a3b8" }}>{f}</span>
                  </div>
                ))}
              </div>
              <button onClick={handleGoogleLogin} disabled={loading} style={{ marginTop: "24px", width: "100%", padding: "14px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#94a3b8", fontSize: "14px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#94a3b8"; }}>
                Empezar gratis
              </button>
            </div>
            {/* Pro */}
            <div className="pricing-card" style={{ background: "linear-gradient(160deg, #001830 0%, #000d1f 100%)", border: "1px solid rgba(0, 122, 191, 0.35)", borderRadius: "24px", padding: "36px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: "14px", right: "14px", padding: "4px 12px", borderRadius: "20px", background: "linear-gradient(135deg, #007ABF, #00B4D8)", fontSize: "11px", color: "white", fontWeight: 700, letterSpacing: "0.3px" }}>
                Popular
              </div>
              <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "200px", height: "200px", borderRadius: "50%", background: "radial-gradient(circle, #007ABF15, transparent 70%)", pointerEvents: "none" }} />
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#7dd3fc", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "16px" }}>Pro</p>
              <div style={{ marginBottom: "28px" }}>
                <span style={{ fontSize: "52px", fontWeight: 900, color: "white", letterSpacing: "-0.04em" }}>$19</span>
                <span style={{ fontSize: "14px", color: "#475569", marginLeft: "4px" }}>/mes</span>
              </div>
              <div style={{ borderTop: "1px solid rgba(0, 122, 191, 0.2)", paddingTop: "24px" }}>
                {["Mensajes ilimitados", "Historial completo", "Acceso prioritario", "Nuevas funciones primero", "Soporte directo"].map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                    <div style={{ width: "20px", height: "20px", borderRadius: "6px", background: "rgba(0, 180, 216, 0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Check size={12} color="#7dd3fc" />
                    </div>
                    <span style={{ fontSize: "14px", color: "#a5d8f3" }}>{f}</span>
                  </div>
                ))}
              </div>
              <button onClick={handleGoogleLogin} disabled={loading} style={{ marginTop: "24px", width: "100%", padding: "14px", borderRadius: "14px", border: "none", background: "linear-gradient(135deg, #007ABF, #00B4D8)", color: "white", fontSize: "14px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "all 0.2s", boxShadow: "0 4px 20px rgba(0, 122, 191, 0.3)" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 28px rgba(0, 122, 191, 0.4)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 122, 191, 0.3)"; }}>
                <Crown size={15} /> Comenzar con Pro
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* === FOOTER CTA === */}
      <section style={{ padding: "80px 32px 100px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 50% 60% at 50% 80%, rgba(0, 122, 191, 0.08), transparent)", pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: "600px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 900, letterSpacing: "-0.045em", color: "white", marginBottom: "18px", lineHeight: 1.1 }}>
            Listo para escalar<br />tu operacion?
          </h2>
          <p style={{ color: "#64748b", fontSize: "16px", marginBottom: "40px", lineHeight: 1.6 }}>Unete a la comunidad de operadores que ya usan TRUST MIND para automatizar sus granjas.</p>
          <GoogleButton large />
          <p style={{ fontSize: "12px", color: "#475569", marginTop: "16px" }}>Datos encriptados end-to-end</p>
        </div>
      </section>

      {/* === FOOTER === */}
      <footer style={{ padding: "28px clamp(16px, 4vw, 48px)", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <FarmMindLogo size={22} />
          <span style={{ fontSize: "13px", color: "#475569", fontWeight: 600 }}>TRUST MIND AI</span>
        </div>
        <span style={{ fontSize: "12px", color: "#333d4d" }}>© 2025 TRUST MIND</span>
      </footer>
    </div>
  );
}

export default function TrustMindChat() {
  const router = useRouter();
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
  const [showProfile, setShowProfile] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
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
            try {
              const parsed = JSON.parse(data);
              if (parsed.tool_loading === true) {
                setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, toolLoading: true } : m));
              } else if (parsed.tool_loading === false) {
                setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, toolLoading: false } : m));
              } else if (parsed.text) {
                fullContent += parsed.text;
                setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: fullContent, toolLoading: false } : m));
              }
            } catch {}
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

  // If user is a panel_client (registered via child panel), redirect to their panel
  const userRole = user.user_metadata?.role;
  const panelSlug = user.user_metadata?.panel_slug;
  if (userRole === "panel_client" && panelSlug) {
    router.replace(`/panel/${panelSlug}/services`);
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  // Authenticated users go directly to the services page
  router.replace("/smm/services");
  return (
    <div className="flex h-screen items-center justify-center" style={{ background: "var(--background)" }}>
      <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
    </div>
  );
}
