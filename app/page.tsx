"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Zap, Shield, Cpu, Plus, Copy, Check } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content: "¡Hola! Soy **FarmMind**, tu agente AI para granjas de bots. 🤖\n\nPuedo ayudarte con GenFarmer, Xiaowei, proxies y anti-detección. También puedo ejecutar acciones directamente en tus herramientas.\n\n¿Qué necesitas hoy?",
  timestamp: new Date(),
};

const QUICK_ACTIONS = [
  "¿Cuánto delay usar en GenFarmer para Instagram?",
  "Mis cuentas están siendo baneadas, ¿qué hago?",
  "¿Qué proxies son mejores para TikTok?",
  "¿Cómo configuro el warmup de cuentas nuevas?",
];

// Markdown renderer
function renderMarkdown(content: string): string {
  let html = content;

  // Code blocks
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const escaped = code.trim().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<div class="code-block"><span class="code-lang">${lang || "code"}</span><pre>${escaped}</pre></div>`;
  });

  // Inline code
  html = html.replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<p class="msg-h3">$1</p>');
  html = html.replace(/^## (.+)$/gm, '<p class="msg-h2">$1</p>');
  html = html.replace(/^# (.+)$/gm, '<p class="msg-h1">$1</p>');

  // Bold + italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Bullet lists
  html = html.replace(/^[-•] (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*?<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);

  // Numbered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="numbered">$1</li>');
  html = html.replace(/(<li class="numbered">.*?<\/li>\n?)+/g, (match) => `<ol>${match}</ol>`);

  // Horizontal rule
  html = html.replace(/^---$/gm, "<hr />");

  // Line breaks
  html = html.replace(/\n\n/g, "<br /><br />");
  html = html.replace(/\n/g, "<br />");

  return html;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
      style={{ color: "#64748b" }}
      title="Copiar"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

export default function FarmMindChat() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const newChat = useCallback(() => {
    if (isStreaming) return;
    setMessages([{ ...WELCOME_MESSAGE, timestamp: new Date() }]);
    setInput("");
  }, [isStreaming]);

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isStreaming) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsStreaming(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", timestamp: new Date() },
    ]);

    try {
      const apiMessages = updatedMessages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

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
              fullContent += JSON.parse(data).text;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: fullContent } : m
                )
              );
            } catch {}
          }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "❌ Error conectando con la API. Verifica tu ANTHROPIC_API_KEY." }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

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
      `}</style>

      <div className="flex h-screen" style={{ background: "var(--background)" }}>
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 flex flex-col border-r"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}>

          {/* Logo + New Chat */}
          <div className="p-4 border-b flex items-center justify-between"
            style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "var(--accent)" }}>
                <Bot size={16} className="text-white" />
              </div>
              <div>
                <h1 className="font-bold text-white text-sm">FarmMind</h1>
                <p className="text-xs" style={{ color: "var(--accent-light)" }}>Bot Farm AI Agent</p>
              </div>
            </div>
            <button
              onClick={newChat}
              disabled={isStreaming}
              title="Nueva conversación"
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: "var(--surface-2)", color: "#94a3b8" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#a78bfa")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Status */}
          <div className="p-4">
            <div className="rounded-xl p-3" style={{ background: "var(--surface-2)" }}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Estado</p>
              <div className="space-y-2">
                <StatusItem icon={<Zap size={12} />} label="Claude API" status="online" />
                <StatusItem icon={<Shield size={12} />} label="GenFarmer" status="pending" />
                <StatusItem icon={<Cpu size={12} />} label="Proxies" status="pending" />
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="p-4 flex-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Acciones rápidas</p>
            <div className="space-y-1">
              {QUICK_ACTIONS.map((action, i) => (
                <button key={i} onClick={() => sendMessage(action)}
                  className="w-full text-left text-xs p-2.5 rounded-lg transition-colors"
                  style={{ color: "#94a3b8" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  {action}
                </button>
              ))}
            </div>
          </div>

          {/* User */}
          <div className="p-4 border-t" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-purple-700 flex items-center justify-center">
                <User size={12} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-medium text-white">Dante</p>
                <p className="text-xs text-gray-500">Plan Starter</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b flex items-center justify-between"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: "var(--accent)" }}>
                <Bot size={16} className="text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-white text-sm">FarmMind</h2>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <span className="text-xs text-gray-400">Agente activo</span>
                </div>
              </div>
            </div>
            <span className="text-xs px-3 py-1 rounded-full font-medium"
              style={{ background: "var(--surface-2)", color: "var(--accent-light)" }}>
              🤖 Fase 1 — Chat Expert
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {messages.map((msg) => (
              <div key={msg.id}
                className={`flex gap-3 group ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
                  style={{ background: "var(--accent)" }}>
                  {msg.role === "user"
                    ? <User size={14} className="text-white" />
                    : <Bot size={14} className="text-white" />}
                </div>
                <div className="flex flex-col gap-1 max-w-2xl" style={{ alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm"}`}
                    style={msg.role === "user"
                      ? { background: "var(--accent)", color: "white" }
                      : { background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)" }}>
                    {msg.content === "" && isStreaming ? (
                      <div className="flex items-center gap-1.5 py-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400 typing-dot" />
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400 typing-dot" />
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400 typing-dot" />
                      </div>
                    ) : (
                      <span dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                    )}
                  </div>
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-xs text-gray-600">{formatTime(msg.timestamp)}</span>
                    {msg.role === "assistant" && msg.content && (
                      <CopyButton text={msg.content} />
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="flex items-end gap-3 rounded-2xl p-3"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pregúntame algo o pídeme ejecutar una acción en tu farm..."
                rows={1}
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 resize-none outline-none"
                style={{ maxHeight: "120px" }}
              />
              <button onClick={() => sendMessage()}
                disabled={!input.trim() || isStreaming}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
                style={{
                  background: input.trim() && !isStreaming ? "var(--accent)" : "var(--border)",
                  cursor: input.trim() && !isStreaming ? "pointer" : "not-allowed",
                }}>
                <Send size={15} className="text-white" />
              </button>
            </div>
            <p className="text-center text-xs text-gray-600 mt-2">
              Enter para enviar · Shift+Enter para nueva línea
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function StatusItem({ icon, label, status }: {
  icon: React.ReactNode;
  label: string;
  status: "online" | "pending" | "offline";
}) {
  const colors = { online: "#4ade80", pending: "#facc15", offline: "#f87171" };
  const labels = { online: "Conectado", pending: "Pendiente", offline: "Offline" };
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-gray-400">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: colors[status] }} />
        <span className="text-xs" style={{ color: colors[status] }}>{labels[status]}</span>
      </div>
    </div>
  );
}
