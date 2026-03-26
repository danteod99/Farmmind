"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Send, ImagePlus, X } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { FarmMindLogo } from "@/app/components/FarmMindLogo";
import { SmmNav } from "@/app/components/SmmNav";

interface PendingImage {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  preview: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  image?: { base64: string; mediaType: string };
  toolLoading?: boolean;
}

function renderMarkdown(content: string): string {
  let html = content;
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_: string, lang: string, code: string) => {
    const escaped = code.trim().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    void lang;
    return `<pre style="background:#07070e;border:1px solid #1e1e30;border-radius:8px;padding:10px;margin:6px 0;overflow-x:auto;font-size:12px;"><code>${escaped}</code></pre>`;
  });
  html = html.replace(/`([^`\n]+)`/g, '<code style="background:#07070e;border:1px solid #1e1e30;border-radius:4px;padding:1px 5px;font-size:12px;">$1</code>');
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/^[-•] (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*?<\/li>\n?)+/g, (match: string) => `<ul style="padding-left:16px;margin:4px 0;">${match}</ul>`);
  html = html.replace(/\n\n/g, "<br /><br />");
  html = html.replace(/\n/g, "<br />");
  return html;
}

/**
 * Comprime y redimensiona una imagen usando Canvas.
 * Esto asegura que las fotos de PC (que suelen ser grandes) no excedan
 * el límite del body ni gasten tokens innecesarios en la API de Claude.
 * Máximo 1280px en cualquier dimensión, calidad JPEG 0.7 (~200-400KB resultado).
 */
function compressImage(file: File, maxDim = 1280, quality = 0.7): Promise<{ base64: string; mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      // Siempre convertimos a JPEG para comprimir (excepto PNG con transparencia)
      const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
      const dataUrl = canvas.toDataURL(outputType, quality);
      const [header, base64] = dataUrl.split(",");
      const mediaType = header.split(":")[1].split(";")[0] as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
      resolve({ base64, mediaType });
    };
    img.onerror = () => reject(new Error("No se pudo leer la imagen"));
    img.src = URL.createObjectURL(file);
  });
}

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  content: "¡Hola! Soy el **Asistente IA de TRUST MIND**.\n\nPuedo buscar servicios, revisar tu saldo y hacer pedidos.\n\n📸 **Nuevo:** Envíame un screenshot de cualquier perfil de Instagram, TikTok o YouTube y detectaré el usuario automáticamente para hacer tu pedido.",
};

const LS_KEY = "farmmind_chat_messages";
const MAX_STORED_MESSAGES = 50;

const QUICK_QUESTIONS = [
  "¿Cuáles son los servicios más populares?",
  "¿Cuánto cuesta 1000 seguidores de Instagram?",
  "¿Cuánto saldo tengo?",
  "¿Cómo funciona el proceso de pedido?",
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
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { checkAuth(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Restore messages from localStorage after auth check
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) {
        const parsed: Message[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages([WELCOME, ...parsed]);
        }
      }
    } catch { /* corrupted data, ignore */ }
  }, []);

  // Save messages to localStorage (debounced), skip welcome message
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const toSave = messages
        .filter((m) => m.id !== "welcome")
        .slice(-MAX_STORED_MESSAGES)
        .map(({ id, role, content }) => ({ id, role, content })); // strip images to save space
      if (toSave.length === 0) {
        localStorage.removeItem(LS_KEY);
      } else {
        try { localStorage.setItem(LS_KEY, JSON.stringify(toSave)); } catch { /* quota exceeded */ }
      }
    }, 500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [messages]);

  // Clear localStorage on logout (auth state change)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        localStorage.removeItem(LS_KEY);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Solo hacer scroll dentro del contenedor de mensajes, no de toda la página
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) { alert("Solo JPG, PNG, GIF o WebP."); return; }
    if (file.size > 20 * 1024 * 1024) { alert("La imagen debe ser menor a 20MB."); return; }
    try {
      const { base64, mediaType } = await compressImage(file);
      setPendingImage({ base64, mediaType, preview: URL.createObjectURL(file) });
    } catch {
      alert("Error al procesar la imagen. Intenta con otra.");
    }
    e.target.value = "";
  };

  const removePendingImage = () => {
    if (pendingImage) URL.revokeObjectURL(pendingImage.preview);
    setPendingImage(null);
  };

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim();
    if ((!msg && !pendingImage) || isStreaming) return;
    setInput("");
    const capturedImage = pendingImage;
    setPendingImage(null);
    if (capturedImage) URL.revokeObjectURL(capturedImage.preview);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: msg || "📸 Analiza este perfil",
      ...(capturedImage ? { image: { base64: capturedImage.base64, mediaType: capturedImage.mediaType } } : {}),
    };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setIsStreaming(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    try {
      const apiMessages = allMessages
        .filter((m) => m.id !== "welcome")
        .map((m) => {
          if (m.image) {
            const blocks: object[] = [
              { type: "image", source: { type: "base64", media_type: m.image.mediaType, data: m.image.base64 } },
              { type: "text", text: m.content && m.content !== "📸 Analiza este perfil" ? m.content : "Analiza este screenshot. Detecta el perfil social (usuario, plataforma, seguidores) y sugiere el servicio más adecuado." },
            ];
            return { role: m.role, content: blocks };
          }
          return { role: m.role, content: m.content };
        });

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.ok) {
        const errText = res.status === 429
          ? "⚠️ Demasiadas solicitudes. Espera un momento e intenta de nuevo."
          : "❌ Error del servidor. Intenta de nuevo.";
        setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: errText } : m));
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
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
          } catch { /* incomplete chunk, will be completed in next read */ }
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

  const canSend = (input.trim().length > 0 || pendingImage !== null) && !isStreaming;

  const NAV_LINKS: { href: string; label: string; active?: boolean; external?: boolean }[] = [
    { href: "/smm/services", label: "Servicios" },
    { href: "/smm/orders", label: "Pedidos" },
    { href: "/smm/funds", label: "Recargar" },
    { href: "/smm/ai", label: "🤖 Asistente IA", active: true },
    { href: "https://www.scalinglatam.site", label: "🌐 Scaling Latam", external: true },
  ];

  return (
    <div style={{ height: "100vh", background: "#07070e", color: "white", fontFamily: "system-ui,-apple-system,sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>
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
        .img-btn:hover { background: #007ABF20 !important; border-color: #007ABF60 !important; color: #56B4E0 !important; }
      `}</style>

      {/* NAVBAR */}
      <SmmNav
        balance={balance}
        userAvatar={userAvatar}
        userName={userName}
        userEmail={userEmail}
        links={NAV_LINKS}
      />

      {/* CHAT AREA */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", maxWidth: "760px", width: "100%", margin: "0 auto", padding: "0 16px", minHeight: 0 }}>

        {/* Header */}
        <div style={{ padding: "28px 0 20px", textAlign: "center" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "18px", background: "linear-gradient(135deg, #007ABF, #005FA4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", boxShadow: "0 0 32px #007ABF40" }}>
            <FarmMindLogo size={30} />
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "white", letterSpacing: "-0.5px" }}>Asistente IA</h1>
          <p style={{ fontSize: "13px", color: "#5a6480", marginTop: "4px" }}>Servicios · Pedidos · Saldo · 📸 Análisis de perfiles</p>
        </div>

        {/* Messages */}
        <div ref={messagesContainerRef} style={{ flex: 1, overflowY: "auto", paddingBottom: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {messages.map((m) => (
            <div key={m.id} style={{ display: "flex", gap: "10px", alignItems: "flex-start", flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: m.role === "assistant" ? "linear-gradient(135deg,#007ABF,#005FA4)" : "#1a1a2e", border: "1px solid #2a2a42" }}>
                {m.role === "assistant"
                  ? <FarmMindLogo size={18} />
                  : (userAvatar ? <img src={userAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>)
                }
              </div>

              <div style={{
                maxWidth: "72%", padding: "12px 16px", borderRadius: m.role === "user" ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
                background: m.role === "user" ? "linear-gradient(135deg,#007ABF,#005FA4)" : "#0d0d18",
                border: m.role === "assistant" ? "1px solid #1e1e30" : "none",
                fontSize: "14px", lineHeight: "1.6", color: "white",
                boxShadow: m.role === "user" ? "0 4px 16px #007ABF30" : "none",
              }}>
                {/* Image thumbnail */}
                {m.image && (
                  <div style={{ marginBottom: "8px" }}>
                    <img
                      src={`data:${m.image.mediaType};base64,${m.image.base64}`}
                      alt="Screenshot"
                      style={{ maxWidth: "220px", maxHeight: "280px", borderRadius: "10px", display: "block", border: "1px solid #ffffff20", objectFit: "cover" }}
                    />
                  </div>
                )}

                {m.toolLoading ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#56B4E0", fontSize: "13px" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    Consultando servicios...
                  </div>
                ) : m.content === "" && m.role === "assistant" ? (
                  <div style={{ display: "flex", gap: "4px", alignItems: "center", height: "20px" }}>
                    {[0, 1, 2].map((i) => <span key={i} className="td" style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#56B4E0", display: "inline-block", animationDelay: `${i * 0.15}s` }} />)}
                  </div>
                ) : m.content && m.content !== "📸 Analiza este perfil" ? (
                  <div dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />
                ) : null}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Quick questions */}
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

        {/* Input area */}
        <div style={{ padding: "12px 0 20px", position: "sticky", bottom: 0, background: "#07070e" }}>

          {/* Image preview */}
          {pendingImage && (
            <div style={{ marginBottom: "10px", display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: "#0a0a18", border: "1px solid #007ABF40", borderRadius: "12px" }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <img src={pendingImage.preview} alt="preview" style={{ width: "56px", height: "56px", borderRadius: "8px", objectFit: "cover", border: "1px solid #2a2a42", display: "block" }} />
                <button onClick={removePendingImage} style={{ position: "absolute", top: "-6px", right: "-6px", width: "18px", height: "18px", borderRadius: "50%", background: "#ef4444", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <X size={10} color="white" />
                </button>
              </div>
              <div>
                <p style={{ fontSize: "12px", color: "#56B4E0", fontWeight: 600 }}>📸 Imagen lista</p>
                <p style={{ fontSize: "11px", color: "#5a6480", marginTop: "2px" }}>La IA detectará el perfil automáticamente</p>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", background: "#0d0d18", border: `1px solid ${pendingImage ? "#007ABF50" : "#1e1e30"}`, borderRadius: "16px", padding: "10px 12px", transition: "border-color 0.15s" }}>

            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleFileSelect} style={{ display: "none" }} />

            {/* Camera/image button */}
            <button
              className="img-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={isStreaming}
              title="Adjuntar screenshot de perfil social"
              style={{
                width: "36px", height: "36px", borderRadius: "10px", flexShrink: 0,
                background: pendingImage ? "#007ABF25" : "transparent",
                border: `1px solid ${pendingImage ? "#007ABF60" : "#2a2a42"}`,
                color: pendingImage ? "#56B4E0" : "#5a6480",
                cursor: isStreaming ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
              }}>
              <ImagePlus size={16} />
            </button>

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={pendingImage ? "Agrega un comentario (opcional)..." : "Escribe tu pregunta... (Enter para enviar)"}
              rows={1}
              style={{ flex: 1, background: "transparent", border: "none", color: "white", fontSize: "14px", resize: "none", lineHeight: "1.5", maxHeight: "120px", fontFamily: "inherit", paddingTop: "2px" }}
            />

            <button onClick={() => sendMessage()} disabled={!canSend}
              style={{ width: "38px", height: "38px", borderRadius: "12px", background: canSend ? "linear-gradient(135deg,#007ABF,#005FA4)" : "#1a1a2e", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: canSend ? "pointer" : "not-allowed", flexShrink: 0, transition: "all 0.15s", boxShadow: canSend ? "0 0 16px #007ABF40" : "none" }}>
              {isStreaming
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#56B4E0" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                : <Send size={15} color={canSend ? "white" : "#3a3a5c"} />
              }
            </button>
          </div>
          <p style={{ textAlign: "center", fontSize: "11px", color: "#3a3a5c", marginTop: "8px" }}>Enter para enviar · Shift+Enter para nueva línea · 📸 Adjunta screenshots de perfiles</p>
        </div>
      </div>
    </div>
  );
}
