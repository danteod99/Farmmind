"use client";

import { useState, useEffect } from "react";
import { KeyRound, ChevronDown, CheckCircle2, ExternalLink } from "lucide-react";
import { getApiKeys, setApiKeys } from "@/app/lib/apiKeys";

// Tarjeta para que el usuario ponga SUS propias API Keys (BYOK).
// need: "anthropic" | "groq" | "both" — qué keys pide esta herramienta.
export function ApiKeysCard({ need = "both" }: { need?: "anthropic" | "groq" | "both" }) {
  const [open, setOpen] = useState(false);
  const [anthropic, setA] = useState("");
  const [groq, setG] = useState("");
  const [saved, setSaved] = useState(false);
  const [hasKeys, setHasKeys] = useState(false);

  useEffect(() => {
    const k = getApiKeys();
    setA(k.anthropic); setG(k.groq);
    setHasKeys(!!(k.anthropic || k.groq));
  }, []);

  const showA = need === "anthropic" || need === "both";
  const showG = need === "groq" || need === "both";

  const save = () => {
    setApiKeys(anthropic, groq);
    setHasKeys(!!(anthropic.trim() || groq.trim()));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const input: React.CSSProperties = {
    width: "100%", background: "#0a0a12", border: "1px solid #2a2a44", borderRadius: 9,
    color: "white", padding: "9px 11px", fontSize: 13, fontFamily: "monospace",
  };
  const label: React.CSSProperties = { fontSize: 12.5, color: "#c4cadd", fontWeight: 600, marginBottom: 5, display: "block" };

  return (
    <div style={{ background: "#0d0d16", border: "1px solid #1a1a2a", borderRadius: 14, marginTop: 14, overflow: "hidden" }}>
      <button onClick={() => setOpen((v) => !v)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", background: "none", border: "none", cursor: "pointer", color: "white", fontFamily: "inherit" }}>
        <KeyRound size={17} color="#a78bfa" />
        <span style={{ fontSize: 14, fontWeight: 600, flex: 1, textAlign: "left" }}>
          Usar mi propia API Key
          {hasKeys && <span style={{ marginLeft: 8, fontSize: 11, color: "#22c55e", fontWeight: 700 }}>● configurada</span>}
        </span>
        <span style={{ fontSize: 12, color: "#5a6480" }}>opcional</span>
        <ChevronDown size={16} color="#8a92ad" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </button>

      {open && (
        <div style={{ padding: "4px 16px 18px", borderTop: "1px solid #14141f" }}>
          <p style={{ fontSize: 12.5, color: "#8a92ad", lineHeight: 1.6, margin: "10px 0 14px" }}>
            Si pones tu propia API Key, la IA usa <b style={{ color: "#a78bfa" }}>tu cuenta</b> (no la del sistema). Se guarda solo en <b>tu navegador</b>, nunca en nuestros servidores.
          </p>

          {showA && (
            <div style={{ marginBottom: 14 }}>
              <label style={label}>
                API Key de Anthropic (Claude) — análisis / retomas
                <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" style={{ marginLeft: 8, color: "#22d3ee", textDecoration: "none", fontSize: 11.5, fontWeight: 500 }}>obtener <ExternalLink size={10} style={{ display: "inline", verticalAlign: "middle" }} /></a>
              </label>
              <input type="password" value={anthropic} onChange={(e) => setA(e.target.value)} placeholder="sk-ant-..." style={input} autoComplete="off" />
            </div>
          )}

          {showG && (
            <div style={{ marginBottom: 14 }}>
              <label style={label}>
                API Key de Groq — transcripción
                <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" style={{ marginLeft: 8, color: "#22d3ee", textDecoration: "none", fontSize: 11.5, fontWeight: 500 }}>obtener <ExternalLink size={10} style={{ display: "inline", verticalAlign: "middle" }} /></a>
              </label>
              <input type="password" value={groq} onChange={(e) => setG(e.target.value)} placeholder="gsk_..." style={input} autoComplete="off" />
            </div>
          )}

          <button onClick={save}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, background: saved ? "#16351f" : "linear-gradient(135deg,#7c3aed,#00d4ff)", color: "white", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
            {saved ? <><CheckCircle2 size={15} /> Guardado</> : "Guardar mis keys"}
          </button>
        </div>
      )}
    </div>
  );
}
