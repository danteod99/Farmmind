"use client";

import { useState, useEffect } from "react";
import { X, Gift, Copy, Check } from "lucide-react";

const PROMO_CODE = "10DANTE";
const STORAGE_KEY = "promo_banner_dismissed_10dante";

export function PromoBanner() {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Don't show if user already dismissed it
    const dismissed = sessionStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(PROMO_CODE).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "linear-gradient(90deg, #007ABF 0%, #00b4c5 50%, #007ABF 100%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 3s ease-in-out infinite",
        padding: "10px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        boxShadow: "0 2px 12px rgba(0,122,191,0.4)",
      }}
    >
      <style>{`
        @keyframes shimmer {
          0% { background-position: 100% 0; }
          50% { background-position: 0% 0; }
          100% { background-position: 100% 0; }
        }
        .promo-code-btn:hover { opacity: 0.85; transform: scale(1.03); }
      `}</style>

      {/* Icon */}
      <Gift size={16} color="white" style={{ flexShrink: 0 }} />

      {/* Text */}
      <span style={{ fontSize: 13, fontWeight: 600, color: "white", letterSpacing: "-0.1px" }}>
        🎁 Usa el código{" "}
        <strong style={{ fontWeight: 800, letterSpacing: "0.5px" }}>{PROMO_CODE}</strong>
        {" "}y recibe{" "}
        <strong style={{ fontWeight: 800 }}>$10 de regalo</strong>
        {" "}en tu primera recarga
      </span>

      {/* Copy button */}
      <button
        className="promo-code-btn"
        onClick={copyCode}
        title="Copiar código"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "4px 12px",
          borderRadius: 6,
          background: "rgba(255,255,255,0.2)",
          border: "1px solid rgba(255,255,255,0.4)",
          color: "white",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          letterSpacing: "0.5px",
          transition: "all 0.15s",
          fontFamily: "inherit",
          flexShrink: 0,
        }}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? "¡Copiado!" : PROMO_CODE}
      </button>

      {/* Close button */}
      <button
        onClick={dismiss}
        title="Cerrar"
        style={{
          position: "absolute",
          right: 14,
          top: "50%",
          transform: "translateY(-50%)",
          background: "none",
          border: "none",
          color: "rgba(255,255,255,0.7)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 4,
          borderRadius: 4,
          transition: "color 0.15s",
        }}
      >
        <X size={15} />
      </button>
    </div>
  );
}
