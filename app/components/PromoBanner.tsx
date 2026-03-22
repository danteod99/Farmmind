"use client";

import { useState } from "react";
import { X, Gift, Copy, Check } from "lucide-react";

export function PromoBanner() {
  const [visible, setVisible] = useState(true);
  const [copied, setCopied] = useState(false);

  if (!visible) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText("10DANTE");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        background: "linear-gradient(135deg, #007ABF 0%, #00B4D8 50%, #007ABF 100%)",
        backgroundSize: "200% 200%",
        animation: "bannerShimmer 3s ease infinite",
        padding: "12px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        flexWrap: "wrap",
        zIndex: 100,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <style>{`
        @keyframes bannerShimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      <Gift size={18} color="white" style={{ flexShrink: 0 }} />

      <span
        style={{
          color: "white",
          fontSize: "14px",
          fontWeight: 600,
          letterSpacing: "-0.2px",
          textAlign: "center",
        }}
      >
        Con el codigo{" "}
        <button
          onClick={handleCopy}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            background: "rgba(255,255,255,0.2)",
            border: "1px solid rgba(255,255,255,0.4)",
            borderRadius: "6px",
            padding: "3px 10px",
            color: "white",
            fontWeight: 800,
            fontSize: "14px",
            cursor: "pointer",
            letterSpacing: "0.5px",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.35)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; }}
          title="Copiar codigo"
        >
          10DANTE
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>{" "}
        obtienes <strong>$10 USD GRATIS</strong> para conseguir seguidores
      </span>

      <button
        onClick={() => setVisible(false)}
        style={{
          position: "absolute",
          right: "12px",
          top: "50%",
          transform: "translateY(-50%)",
          background: "rgba(255,255,255,0.15)",
          border: "none",
          borderRadius: "50%",
          width: "24px",
          height: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "white",
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.3)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
