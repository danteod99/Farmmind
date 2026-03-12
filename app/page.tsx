"use client";

export const dynamic = "force-dynamic";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Zap, Shield, Cpu, Plus, Copy, Check, LogOut, MessageSquare, Trash2, Crown, X, Sparkles, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
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
  content: "¡Hola! Soy **FarmMind**, tu agente AI para granjas de bots. 🤖\n\nPuedo ayudarte con GenFarmer, Xiaowei, proxies y anti-detección. También puedo ejecutar acciones directamente en tus herramientas.\n\n¿Qué necesitas hoy?",
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
      <div className="relative rounded-2xl p-8 max-w-md w-full mx-4 text-center" style={{ background: "var(--surface)", border: "1px solid #7c3aed" }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
          <X size={18} />
        </button>

        {/* Icono */}
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}>
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
          <div className="rounded-xl p-4 text-left" style={{ background: "linear-gradient(135deg, #2e1065, #1e1b4b)", border: "1px solid #7c3aed" }}>
            <div className="flex items-center gap-1 mb-2">
              <p className="text-xs font-semibold" style={{ color: "#a78bfa" }}>PRO</p>
              <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "#7c3aed20", color: "#a78bfa" }}>Popular</span>
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
          style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}
        >
          <Sparkles size={15} />
          Obtener FarmMind Pro — $19/mes
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
  return (
    <div className="flex h-screen items-center justify-center" style={{ background: "var(--background)" }}>
      <div className="rounded-2xl p-10 text-center max-w-sm w-full mx-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: "var(--accent)" }}>
          <Bot size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">FarmMind AI</h1>
        <p className="text-sm text-gray-400 mb-8">Tu agente AI para granjas de bots</p>
        <button onClick={handleGoogleLogin} disabled={loading} className="w-full flex items-center justify-center gap-3 py-3 px-5 rounded-xl font-medium text-sm transition-all" style={{ background: loading ? "var(--surface-2)" : "white", color: "#1a1a2e", cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? <span className="text-gray-500">Redirigiendo...</span> : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Iniciar sesión con Google
            </>
          )}
        </button>
        <p className="text-xs text-gray-600 mt-6">Solo para miembros de Artificial Humans</p>
      </div>
    </div>
  );
}

export default function FarmMindChat() {
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
        .code-block { background: #0d0d14; border: 1px solid #2d2d44; border-radius: 8px; margin: 8px 0; overflow: hidden; }
        .code-lang { display: block; background: #1a1a2e; color: #7c3aed; font-size: 11px; font-family: monospace; padding: 4px 12px; border-bottom: 1px solid #2d2d44; }
        .code-block pre { margin: 0; padding: 12px; font-family: 'Menlo', 'Monaco', monospace; font-size: 12px; color: #e2e8f0; overflow-x: auto; white-space: pre; }
        .inline-code { background: #1e1b4b; padding: 1px 6px; border-radius: 4px; color: #a78bfa; font-size: 0.85em; font-family: monospace; }
        .msg-h1 { font-size: 1.1em; font-weight: 700; color: #f1f5f9; margin: 8px 0 4px; }
        .msg-h2 { font-size: 1em; font-weight: 700; color: #e2e8f0; margin: 6px 0 3px; border-bottom: 1px solid #2d2d44; padding-bottom: 3px; }
        .msg-h3 { font-size: 0.95em; font-weight: 600; color: #a78bfa; margin: 4px 0 2px; }
        ul { padding-left: 16px; margin: 4px 0; }
        ol { padding-left: 16px; margin: 4px 0; }
        li { margin: 2px 0; color: #cbd5e1; }
        li.numbered { list-style: decimal; }
        hr { border: none; border-top: 1px solid #2d2d44; margin: 8px 0; }
        strong { color: #f1f5f9; font-weight: 600; }
        .typing-dot { animation: blink 1.4s infinite both; }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes blink { 0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }
        .conv-item:hover .conv-delete { opacity: 1; }
        .conv-delete { opacity: 0; transition: opacity 0.2s; }
      `}</style>

      {showUpgrade && (
        <UpgradeModal
          onClose={() => setShowUpgrade(false)}
          onUpgrade={handleUpgrade}
        />
      )}

      <div className="flex h-screen" style={{ background: "var(--background)" }}>
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 flex flex-col border-r" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>

          {/* Logo + New Chat */}
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--accent)" }}><Bot size={16} className="text-white" /></div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="font-bold text-white text-sm">FarmMind</h1>
                  {isPro && <Crown size={11} className="text-yellow-400" />}
                </div>
                <p className="text-xs" style={{ color: "var(--accent-light)" }}>Bot Farm AI Agent</p>
              </div>
            </div>
            <button onClick={newChat} disabled={isStreaming} title="Nueva conversación" className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors" style={{ background: "var(--surface-2)", color: "#94a3b8" }} onMouseEnter={(e) => (e.currentTarget.style.color = "#a78bfa")} onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}><Plus size={14} /></button>
          </div>

          {/* Nav: Panel SMM */}
          <div className="px-3 pt-3 pb-1">
            <Link href="/smm"
              className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl transition-all group"
              style={{ background: "linear-gradient(135deg, #2e1065, #1e1b4b)", border: "1px solid #7c3aed50" }}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#7c3aed" }}>
                <ShoppingCart size={12} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white leading-none">Panel SMM</p>
                <p className="text-xs mt-0.5" style={{ color: "#a78bfa" }}>Servicios & pedidos</p>
              </div>
              <span className="text-xs px-1.5 py-0.5 rounded-md font-semibold" style={{ background: "#7c3aed30", color: "#a78bfa" }}>→</span>
            </Link>
          </div>

          {/* Historial de conversaciones */}
          <div className="flex-1 overflow-y-auto">
            {conversations.length > 0 && (
              <div className="p-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Conversaciones</p>
                <div className="space-y-0.5">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => loadConversation(conv)}
                      className="conv-item flex items-center gap-2 p-2 rounded-lg cursor-pointer group"
                      style={{
                        background: conversationId === conv.id ? "var(--surface-2)" : "transparent",
                        border: conversationId === conv.id ? "1px solid var(--border)" : "1px solid transparent",
                      }}
                      onMouseEnter={(e) => { if (conversationId !== conv.id) e.currentTarget.style.background = "var(--surface-2)"; }}
                      onMouseLeave={(e) => { if (conversationId !== conv.id) e.currentTarget.style.background = "transparent"; }}
                    >
                      <MessageSquare size={11} className="flex-shrink-0 text-gray-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-300 truncate">{conv.title}</p>
                        <p className="text-xs text-gray-600">{formatDate(conv.created_at)}</p>
                      </div>
                      <button
                        onClick={(e) => deleteConversation(e, conv.id)}
                        className="conv-delete w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                        style={{ color: "#64748b" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}
                        title="Eliminar"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                </div>
                {loadingConvs && <p className="text-xs text-gray-600 text-center py-2">Cargando...</p>}
              </div>
            )}

            {conversations.length === 0 && !loadingConvs && (
              <div className="p-4">
                <div className="rounded-xl p-3" style={{ background: "var(--surface-2)" }}>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Estado</p>
                  <div className="space-y-2">
                    <StatusItem icon={<Zap size={12} />} label="Claude API" status="online" />
                    <StatusItem icon={<Shield size={12} />} label="GenFarmer" status="pending" />
                    <StatusItem icon={<Cpu size={12} />} label="Proxies" status="pending" />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Acciones rápidas</p>
                  <div className="space-y-1">
                    {["¿Cuánto delay usar en GenFarmer?", "Mis cuentas están siendo baneadas", "¿Qué proxies para TikTok?"].map((action, i) => (
                      <button key={i} onClick={() => sendMessage(action)} className="w-full text-left text-xs p-2 rounded-lg transition-colors" style={{ color: "#94a3b8" }} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>{action}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {conversations.length > 0 && (
              <div className="px-3 pb-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Acciones rápidas</p>
                <div className="space-y-0.5">
                  {["¿Cuánto delay en GenFarmer?", "Cuentas baneadas, ¿qué hago?", "Proxies para TikTok"].map((action, i) => (
                    <button key={i} onClick={() => { newChat(); setTimeout(() => sendMessage(action), 100); }} className="w-full text-left text-xs p-2 rounded-lg transition-colors" style={{ color: "#94a3b8" }} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>{action}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Upgrade banner (solo para free) */}
          {!isPro && userProfile && (
            <div className="px-3 pb-2">
              <div className="rounded-xl p-3" style={{ background: "linear-gradient(135deg, #1e1b4b, #2e1065)", border: "1px solid #4c1d95" }}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-semibold text-purple-300">Plan Free</p>
                  <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "#7c3aed30", color: "#c4b5fd" }}>
                    {messagesLeft} restantes
                  </span>
                </div>
                {/* Barra de progreso */}
                <div className="h-1 rounded-full mb-2.5" style={{ background: "#2d2d44" }}>
                  <div
                    className="h-1 rounded-full transition-all"
                    style={{
                      background: "linear-gradient(90deg, #7c3aed, #a78bfa)",
                      width: `${Math.min(100, (userProfile.messagesThisMonth / (userProfile.messagesLimit || 30)) * 100)}%`,
                    }}
                  />
                </div>
                <button
                  onClick={() => setShowUpgrade(true)}
                  className="w-full py-1.5 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}
                >
                  <Crown size={11} className="text-yellow-300" />
                  Upgrade a Pro — $19/mes
                </button>
              </div>
            </div>
          )}

          {/* User */}
          <div className="p-4 border-t" style={{ borderColor: "var(--border)" }}>
            {saveStatus === "saving" && <p className="text-xs text-gray-500 mb-2 text-center">Guardando...</p>}
            {saveStatus === "saved" && <p className="text-xs text-green-500 mb-2 text-center">Guardado ✓</p>}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {userAvatar ? <img src={userAvatar} alt={userName} className="w-7 h-7 rounded-full flex-shrink-0" /> : <div className="w-7 h-7 rounded-full bg-purple-700 flex items-center justify-center flex-shrink-0"><User size={12} className="text-white" /></div>}
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-medium text-white truncate">{userName}</p>
                    {isPro && <Crown size={10} className="text-yellow-400 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {isPro ? (
                      <button onClick={handleManageBilling} className="hover:text-purple-400 transition-colors">Gestionar plan Pro ↗</button>
                    ) : user.email}
                  </p>
                </div>
              </div>
              <button onClick={handleLogout} title="Cerrar sesión" className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors" style={{ color: "#64748b" }} onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")} onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}><LogOut size={13} /></button>
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="flex-1 flex flex-col">
          <div className="px-6 py-4 border-b flex items-center justify-between" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--accent)" }}><Bot size={16} className="text-white" /></div>
              <div><h2 className="font-semibold text-white text-sm">FarmMind</h2><div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-green-400" /><span className="text-xs text-gray-400">Agente activo</span></div></div>
            </div>
            <div className="flex items-center gap-2">
              {isPro ? (
                <span className="text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1" style={{ background: "linear-gradient(135deg, #2e1065, #1e1b4b)", color: "#c4b5fd", border: "1px solid #7c3aed" }}>
                  <Crown size={11} className="text-yellow-400" /> Pro
                </span>
              ) : (
                <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: "var(--surface-2)", color: "var(--accent-light)" }}>🤖 Fase 1 — Chat Expert</span>
              )}
              {upgradingToStripe && <div className="w-4 h-4 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 group ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: "var(--accent)" }}>
                  {msg.role === "user" ? <User size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
                </div>
                <div className="flex flex-col gap-1 max-w-2xl" style={{ alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm"}`} style={msg.role === "user" ? { background: "var(--accent)", color: "white" } : { background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)" }}>
                    {msg.content === "" && isStreaming ? (
                      <div className="flex items-center gap-1.5 py-1"><div className="w-1.5 h-1.5 rounded-full bg-purple-400 typing-dot" /><div className="w-1.5 h-1.5 rounded-full bg-purple-400 typing-dot" /><div className="w-1.5 h-1.5 rounded-full bg-purple-400 typing-dot" /></div>
                    ) : <span dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />}
                  </div>
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-xs text-gray-600">{formatTime(msg.timestamp)}</span>
                    {msg.role === "assistant" && msg.content && <CopyButton text={msg.content} />}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            {/* Alerta de límite próximo */}
            {!isPro && messagesLeft !== null && messagesLeft <= 5 && messagesLeft > 0 && (
              <div className="mb-3 px-3 py-2 rounded-xl flex items-center justify-between text-xs" style={{ background: "#2e1065", border: "1px solid #7c3aed" }}>
                <span className="text-purple-300">⚠️ Solo te quedan <strong>{messagesLeft} mensajes</strong> este mes</span>
                <button onClick={() => setShowUpgrade(true)} className="text-yellow-400 font-semibold hover:underline ml-2">Upgrade →</button>
              </div>
            )}
            {/* Bloqueado */}
            {!isPro && messagesLeft === 0 && (
              <div className="mb-3 px-3 py-2 rounded-xl flex items-center justify-between text-xs" style={{ background: "#2e1065", border: "1px solid #7c3aed" }}>
                <span className="text-purple-300">🔒 Límite mensual alcanzado</span>
                <button onClick={() => setShowUpgrade(true)} className="text-yellow-400 font-semibold hover:underline ml-2">Upgrade a Pro →</button>
              </div>
            )}
            <div className="flex items-end gap-3 rounded-2xl p-3" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={messagesLeft === 0 && !isPro ? "Límite alcanzado — Upgrade a Pro para continuar..." : "Pregúntame algo o pídeme ejecutar una acción en tu farm..."}
                disabled={messagesLeft === 0 && !isPro}
                rows={1}
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 resize-none outline-none"
                style={{ maxHeight: "120px", cursor: messagesLeft === 0 && !isPro ? "not-allowed" : "text" }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isStreaming || (messagesLeft === 0 && !isPro)}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
                style={{ background: input.trim() && !isStreaming && (isPro || messagesLeft !== 0) ? "var(--accent)" : "var(--border)", cursor: input.trim() && !isStreaming && (isPro || messagesLeft !== 0) ? "pointer" : "not-allowed" }}
              >
                <Send size={15} className="text-white" />
              </button>
            </div>
            <p className="text-center text-xs text-gray-600 mt-2">Enter para enviar · Shift+Enter para nueva línea</p>
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
