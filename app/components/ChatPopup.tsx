"use client";

import { useState, useRef, useEffect } from "react";
import { Send, X, User, Minus } from "lucide-react";
import { FarmMindLogo } from "@/app/components/FarmMindLogo";

interface PopupMessage {
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

const WELCOME: PopupMessage = {
  id: "welcome",
  role: "assistant",
  content: "¡Hola! Soy **TRUST MIND**. Puedo buscar servicios, revisar tu saldo y hacer pedidos. ¿En qué te ayudo?",
};

export default function ChatPopup() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<PopupMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && !minimized) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open, minimized]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isStreaming) return;
    setInput("");
    setIsStreaming(true);

    const userMsg: PopupMessage = { id: Date.now().toString(), role: "user", content: msg };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);

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
            } catch {}
          }
        }
      }
    } catch {
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: "❌ Error de conexión. Intenta de nuevo." } : m));
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes popup-in {
          from { opacity: 0; transform: scale(0.92) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        @keyframes spin-popup { to { transform: rotate(360deg); } }
        @keyframes typing-dot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%           { transform: translateY(-5px); opacity: 1; }
        }
        .popup-typing-dot { animation: typing-dot 1.2s ease-in-out infinite; }
        .popup-typing-dot:nth-child(2) { animation-delay: 0.15s; }
        .popup-typing-dot:nth-child(3) { animation-delay: 0.3s; }
        .popup-msg-scroll::-webkit-scrollbar { width: 3px; }
        .popup-msg-scroll::-webkit-scrollbar-thumb { background: #2a2a42; border-radius: 99px; }
      `}</style>

      {/* ── Floating trigger button ── */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: "fixed", bottom: "24px", right: "24px", zIndex: 60,
            display: "flex", alignItems: "center", gap: "10px",
            padding: "12px 20px", borderRadius: "100px",
            background: "linear-gradient(135deg, #007ABF, #005FA4)",
            boxShadow: "0 0 0 1px #007ABF80, 0 8px 32px #007ABF50",
            color: "white", fontWeight: 700, fontSize: "14px",
            border: "none", cursor: "pointer", fontFamily: "inherit",
            animation: "pulse-glow 2.5s ease-in-out infinite",
          }}>
          <FarmMindLogo size={22} />
          <span>Hablar con AI</span>
        </button>
      )}

      {/* ── Chat window ── */}
      {open && (
        <div style={{
          position: "fixed", bottom: "24px", right: "24px", zIndex: 60,
          width: "380px", borderRadius: "20px",
          background: "#0d0d18", border: "1px solid #1e1e30",
          boxShadow: "0 24px 80px #00000090, 0 0 0 1px #007ABF30",
          display: "flex", flexDirection: "column",
          maxHeight: minimized ? "56px" : "520px",
          overflow: "hidden",
          transition: "max-height 0.3s ease",
          animation: "popup-in 0.2s ease",
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        }}>

          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 16px", borderBottom: minimized ? "none" : "1px solid #1a1a2e",
            background: "linear-gradient(135deg, #001020, #000818)",
            borderRadius: minimized ? "20px" : "20px 20px 0 0",
            flexShrink: 0, cursor: minimized ? "pointer" : "default",
          }}
            onClick={minimized ? () => setMinimized(false) : undefined}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "linear-gradient(135deg, #007ABF, #005FA4)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 12px #007ABF50" }}>
                <FarmMindLogo size={18} />
              </div>
              <div>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "white", lineHeight: 1 }}>TRUST MIND</p>
                <p style={{ fontSize: "10px", color: "#34d399", fontWeight: 600, marginTop: "2px" }}>
                  {isStreaming ? "Pensando..." : "● Agente activo"}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                onClick={(e) => { e.stopPropagation(); setMinimized(!minimized); }}
                style={{ width: "28px", height: "28px", borderRadius: "8px", background: "#1a1a2e", border: "1px solid #2a2a42", color: "#5a6480", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Minus size={12} />
              </button>
              <button
                onClick={() => setOpen(false)}
                style={{ width: "28px", height: "28px", borderRadius: "8px", background: "#1a1a2e", border: "1px solid #2a2a42", color: "#5a6480", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={12} />
              </button>
            </div>
          </div>

          {/* Messages */}
          {!minimized && (
            <>
              <div className="popup-msg-scroll" style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: "14px" }}>
                {messages.map((m) => (
                  <div key={m.id} style={{ display: "flex", gap: "8px", flexDirection: m.role === "user" ? "row-reverse" : "row", alignItems: "flex-end" }}>
                    {/* Avatar */}
                    <div style={{ width: "26px", height: "26px", borderRadius: "8px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: m.role === "user" ? "#1a1a2e" : "linear-gradient(135deg, #007ABF, #005FA4)" }}>
                      {m.role === "user" ? <User size={12} color="#56B4E0" /> : <FarmMindLogo size={13} />}
                    </div>

                    {/* Bubble */}
                    <div style={{
                      maxWidth: "78%",
                      borderRadius: m.role === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                      padding: "10px 13px",
                      fontSize: "13px", lineHeight: "1.6",
                      ...(m.role === "user"
                        ? { background: "linear-gradient(135deg, #007ABF, #005F96)", color: "white" }
                        : { background: "#141428", border: "1px solid #1e1e30", color: "#dde3ef" }
                      )
                    }}>
                      {m.toolLoading ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {m.content && <span dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />}
                          <div style={{ display: "flex", alignItems: "center", gap: "7px", padding: "5px 8px", borderRadius: "8px", background: "#007ABF12", border: "1px solid #007ABF30" }}>
                            <div style={{ width: "12px", height: "12px", borderRadius: "50%", border: "2px solid #007ABF40", borderTopColor: "#56B4E0", animation: "spin-popup 0.7s linear infinite", flexShrink: 0 }} />
                            <span style={{ fontSize: "11px", color: "#56B4E0", fontWeight: 500 }}>Consultando datos...</span>
                          </div>
                        </div>
                      ) : m.content === "" && isStreaming ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "2px 0" }}>
                          <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#56B4E0" }} className="popup-typing-dot" />
                          <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#56B4E0" }} className="popup-typing-dot" />
                          <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#56B4E0" }} className="popup-typing-dot" />
                        </div>
                      ) : (
                        <span dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />
                      )}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Quick actions (only when empty) */}
              {messages.length === 1 && (
                <div style={{ padding: "0 14px 10px", display: "flex", flexDirection: "column", gap: "5px" }}>
                  {["Ver mi saldo", "Buscar seguidores Instagram", "¿Qué servicios tienen?"].map((q) => (
                    <button key={q} onClick={() => sendMessage(q)}
                      style={{ padding: "7px 12px", borderRadius: "10px", background: "#0d0d18", border: "1px solid #1e1e30", color: "#8892a4", fontSize: "11px", fontWeight: 500, cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "all 0.1s" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#007ABF50"; (e.currentTarget as HTMLButtonElement).style.color = "#88D0F0"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#1e1e30"; (e.currentTarget as HTMLButtonElement).style.color = "#8892a4"; }}>
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div style={{ padding: "12px 14px", borderTop: "1px solid #1a1a2e", display: "flex", gap: "8px", alignItems: "flex-end", flexShrink: 0 }}>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Escribe tu mensaje..."
                  rows={1}
                  style={{ flex: 1, background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: "12px", padding: "9px 12px", color: "white", fontSize: "13px", outline: "none", fontFamily: "inherit", resize: "none", lineHeight: "1.4", maxHeight: "80px", overflowY: "auto" }}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isStreaming}
                  style={{ width: "36px", height: "36px", borderRadius: "10px", background: input.trim() && !isStreaming ? "linear-gradient(135deg, #007ABF, #005F96)" : "#1a1a2e", border: "none", color: input.trim() && !isStreaming ? "white" : "#3d4a5c", cursor: input.trim() && !isStreaming ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                  {isStreaming
                    ? <div style={{ width: "14px", height: "14px", borderRadius: "50%", border: "2px solid #3d4a5c", borderTopColor: "#56B4E0", animation: "spin-popup 0.7s linear infinite" }} />
                    : <Send size={14} />
                  }
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
