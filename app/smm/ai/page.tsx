"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Send } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { FarmMindLogo } from "@/app/components/FarmMindLogo";
import { TrustFooter } from "@/app/components/TrustFooter";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolLoading?: boolean;
}

function renderMarkdown(content: string): string {
  let html = content;
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const escaped = code.trim().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<pre style="background:#07070e;border:1px solid #1e1e30;border-radius:8px;padding:10px;margin:6px 0;overflow-x:auto;font-size:12px;"><code>${escaped}</code></pre>`;
  });
  html = html.replace(/`([^`\n]+)`/g, '<code style="background:#07070e;border:1px solid #1e1e30;border-radius:4px;padding:1px 5px;font-size:12px;">$1</code>');
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/^[-•] (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*?<\/li>\n?)+/g, (match) => `<ul style="padding-left:16px;margin:4px 0;">${match}</ul>`);
  html = html.replace(/\n\n/g, "<br /><br />");
  html = html.replace(/\n/g, "<br />");
  return html;
}

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  content: "¡Hola! Soy el **Asistente IA de TRUST MIND**. Puedo ayudarte a buscar servicios, revisar tu saldo, hacer pedidos y responder cualquier duda. ¿En qué te ayudo hoy?",
};

const QUICK_QUESTIONS = [
  "¿Cuáles son los servicios más populares?",
  "¿Cómo funciona el proceso de pedido?",
  "¿Cuánto cuesta 1000 seguidores de Instagram?",
  "¿Cuánto saldo tengo?",
];

export default function AIPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [userAvatar, setUserAvatar] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [balance, setBalance] = useState(0);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { checkAuth(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }
    setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuario");
    setUserAvatar(user.user_metadata?.avatar_url || "");
    setUserEmail(user.email || "");
    const res = await fetch("/api/smm/orders");
    if (res.ok) { const d = await res.json(); setBalance(d.balance || 0); }
  };

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || isStreaming) return;
    setInput("");

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: msg };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setIsStreaming(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    try {
      const apiMessages = allMessages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      const reader = res.body!.getReader();
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
            } catch { /* ignore */ }
          }
        }
      }
    } catch {
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: "❌ Error de conexión. Intenta de nuevo." } : m));
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const NAV_LINKS = [
    { href: "/smm/services", label: "Servicios" },
    { href: "/smm/orders", label: "Pedidos" },
    { href: "/smm/funds", label: "Recargar" },
    { href: "/smm/ai", label: "🤖 Asistente IA", active: true },
    
    { href: "https://www.scalinglatam.site", label: "🌐 Scaling Latam", external: true },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#07070e", color: "white", fontFamily: "system-ui,-apple-system,sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #07070e; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes typing-dot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
        .td { animation: typing-dot 1.2s ease-in-out infinite; }
        .td:nth-child(2) { animation-delay: 0.15s; }
        .td:nth-child(3) { animation-delay: 0.3s; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #2a2a42; border-radius: 99px; }
        textarea:focus { outline: none; }
      `}</style>

      {/* ━━━ NAVBAR ━━━ */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "#07070eee", backdropFilter: "blur(12px)", borderBottom: "1px solid #1e1e30", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "60px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
          <Link href="/smm/services" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
            <FarmMindLogo size={24} />
            <span style={{ fontSize: "15px", fontWeight: 800, color: "white", letterSpacing: "-0.3px" }}>TRUST MIND</span>
          </Link>
          <div style={{ display: "flex", gap: "4px" }}>
            {NAV_LINKS.map(({ href, label, active, external }) => (
              <Link key={href} href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                style={{ padding: "6px 13px", borderRadius: "10px", fontSize: "13px", fontWeight: active ? 700 : 500, color: active ? "#56B4E0" : "#5a6480", background: active ? "#007ABF15" : "transparent", border: `1px solid ${active ? "#007ABF30" : "transparent"}`, textDecoration: "none", transition: "all 0.15s", whiteSpace: "nowrap" }}>
                {label}
              </Link>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link href="/smm/funds" style={{ padding: "7px 14px", borderRadius: "10px", background: "#34d39912", border: "1px solid #34d39935", display: "flex", alignItems: "center", gap: "7px", textDecoration: "none" }}>
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#34d399", boxShadow: "0 0 8px #34d399" }} />
            <span style={{ fontSize: "13px", color: "#34d399", fontWeight: 700 }}>${balance.toFixed(2)} USD</span>
          </Link>
          {userEmail === "danteod99@gmail.com" && (
            <Link href="/admin" style={{ padding: "6px 12px", borderRadius: "8px", background: "#1a0a2e", border: "1px solid #3a1a5e", color: "#a78bfa", fontSize: "12px", fontWeight: 700, textDecoration: "none" }}>⚙️ Admin</Link>
          )}
          <Link href="/profile" style={{ width: "36px", height: "36px", borderRadius: "50%", overflow: "hidden", border: "2px solid #2a2a42", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1a2e", flexShrink: 0, textDecoration: "none" }}>
            {userAvatar ? <img src={userAvatar} alt={userName} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>}
          </Link>
          <button onClick={async () => { await supabase.auth.signOut(); router.push("/"); }} style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#1a1a2e", border: "1px solid #1e1e30", color: "#5a6480", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </nav>

      {/* ━━━ CHAT AREA ━━━ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", maxWidth: "760px", width: "100%", margin: "0 auto", padding: "0 16px", minHeight: 0 }}>

        {/* Header */}
        <div style={{ padding: "28px 0 20px", textAlign: "center" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "18px", background: "linear-gradient(135deg, #007ABF, #005FA4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", boxShadow: "0 0 32px #007ABF40" }}>
            <FarmMindLogo size={30} />
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "white", letterSpacing: "-0.5px" }}>Asistente IA</h1>
          <p style={{ fontSize: "13px", color: "#5a6480", marginTop: "4px" }}>Búsqueda de servicios, pedidos, saldo y más</p>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {messages.map((m) => (
            <div key={m.id} style={{ display: "flex", gap: "10px", alignItems: "flex-start", flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
              {/* Avatar */}
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: m.role === "assistant" ? "linear-gradient(135deg,#007ABF,#005FA4)" : "#1a1a2e", border: "1px solid #2a2a42" }}>
                {m.role === "assistant"
                  ? <FarmMindLogo size={18} />
                  : (userAvatar ? <img src={userAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>)
                }
              </div>

              {/* Bubble */}
              <div style={{
                maxWidth: "72%", padding: "12px 16px", borderRadius: m.role === "user" ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
                background: m.role === "user" ? "linear-gradient(135deg,#007ABF,#005FA4)" : "#0d0d18",
                border: m.role === "assistant" ? "1px solid #1e1e30" : "none",
                fontSize: "14px", lineHeight: "1.6", color: "white",
                boxShadow: m.role === "user" ? "0 4px 16px #007ABF30" : "none",
              }}>
                {m.toolLoading ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#56B4E0", fontSize: "13px" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    Consultando servicios...
                  </div>
                ) : m.content === "" && m.role === "assistant" ? (
                  <div style={{ display: "flex", gap: "4px", alignItems: "center", height: "20px" }}>
                    {[0, 1, 2].map((i) => <span key={i} className="td" style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#56B4E0", display: "inline-block", animationDelay: `${i * 0.15}s` }} />)}
                  </div>
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Quick questions (only shown at start) */}
        {messages.length === 1 && (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", paddingBottom: "16px" }}>
            {QUICK_QUESTIONS.map((q) => (
              <button key={q} onClick={() => sendMessage(q)}
                style={{ padding: "8px 14px", borderRadius: "20px", background: "#0d0d18", border: "1px solid #1e1e30", color: "#94a3b8", fontSize: "13px", cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit" }}>
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input bar */}
        <div style={{ padding: "12px 0 20px", position: "sticky", bottom: 0, background: "#07070e" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: "16px", padding: "10px 12px 10px 16px" }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu pregunta... (Enter para enviar)"
              rows={1}
              style={{ flex: 1, background: "transparent", border: "none", color: "white", fontSize: "14px", resize: "none", lineHeight: "1.5", maxHeight: "120px", fontFamily: "inherit", paddingTop: "2px" }}
            />
            <button onClick={() => sendMessage()} disabled={!input.trim() || isStreaming}
              style={{ width: "38px", height: "38px", borderRadius: "12px", background: input.trim() && !isStreaming ? "linear-gradient(135deg,#007ABF,#005FA4)" : "#1a1a2e", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: input.trim() && !isStreaming ? "pointer" : "not-allowed", flexShrink: 0, transition: "all 0.15s", boxShadow: input.trim() && !isStreaming ? "0 0 16px #007ABF40" : "none" }}>
              {isStreaming
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#56B4E0" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                : <Send size={15} color={input.trim() ? "white" : "#3a3a5c"} />
              }
            </button>
          </div>
          <p style={{ textAlign: "center", fontSize: "11px", color: "#3a3a5c", marginTop: "8px" }}>Enter para enviar · Shift+Enter para nueva línea</p>
        </div>
      </div>
    <TrustFooter />
    </div>
  );
}
