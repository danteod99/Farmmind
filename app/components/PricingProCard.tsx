"use client";

import { Check, Crown } from "lucide-react";
import { whatsappUrl } from "@/app/lib/whatsapp";

const FEATURES = [
  "Agente IA ilimitado (sin límite de mensajes)",
  "+5,000 servicios SMM (Instagram, TikTok, Facebook, etc.)",
  "TrustInsta + TrustFace + TrustFarm (software desktop)",
  "Curso completo de granjas de bots",
  "Antidetect + proxies premium",
  "Historial completo y acceso prioritario",
  "Nuevas funciones primero",
  "Soporte directo por WhatsApp",
];

const WA_LINK = whatsappUrl(
  "Hola 👋 Quiero activar TRUST MIND Pro y usar los servicios. ¿Me ayudas?"
);

export function PricingProCard() {
  return (
    <div
      style={{
        background: "linear-gradient(160deg, #001830 0%, #000d1f 100%)",
        border: "1px solid rgba(0, 122, 191, 0.4)",
        borderRadius: "28px",
        padding: "44px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "16px",
          right: "16px",
          padding: "5px 14px",
          borderRadius: "20px",
          background: "linear-gradient(135deg, #007ABF, #00B4D8)",
          fontSize: "11px",
          color: "white",
          fontWeight: 700,
          letterSpacing: "0.3px",
        }}
      >
        TRUST MIND Pro
      </div>
      <div
        style={{
          position: "absolute",
          top: "-60px",
          right: "-60px",
          width: "200px",
          height: "200px",
          borderRadius: "50%",
          background: "radial-gradient(circle, #007ABF20, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <p
        style={{
          fontSize: "13px",
          fontWeight: 700,
          color: "#7dd3fc",
          textTransform: "uppercase",
          letterSpacing: "1px",
          marginBottom: "12px",
        }}
      >
        TRUST MIND Pro
      </p>
      <div style={{ marginBottom: "8px" }}>
        <span
          style={{
            fontSize: "48px",
            fontWeight: 900,
            color: "white",
            letterSpacing: "-0.03em",
          }}
        >
          Cuenta gratis
        </span>
      </div>
      <p
        style={{
          fontSize: "13px",
          color: "#7dd3fc",
          marginBottom: "28px",
          fontWeight: 500,
        }}
      >
        Crea tu cuenta sin costo · Activa los servicios por WhatsApp
      </p>

      <div
        style={{
          borderTop: "1px solid rgba(0, 122, 191, 0.2)",
          paddingTop: "24px",
          marginBottom: "28px",
        }}
      >
        {FEATURES.map((f) => (
          <div
            key={f}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "6px",
                background: "rgba(0, 180, 216, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Check size={12} color="#7dd3fc" />
            </div>
            <span style={{ fontSize: "14px", color: "#a5d8f3" }}>{f}</span>
          </div>
        ))}
      </div>

      <a
        href={WA_LINK}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          padding: "16px",
          borderRadius: "14px",
          color: "white",
          fontSize: "15px",
          fontWeight: 700,
          textDecoration: "none",
          background: "linear-gradient(135deg, #007ABF, #00B4D8)",
          boxShadow: "0 4px 20px rgba(0, 180, 216, 0.3)",
          transition: "all 0.2s",
        }}
      >
        <Crown size={16} />
        Activar por WhatsApp
      </a>
      <p
        style={{
          fontSize: "12px",
          color: "#64748b",
          textAlign: "center",
          marginTop: "12px",
        }}
      >
        Crea tu cuenta gratis · Activación y soporte por WhatsApp
      </p>
    </div>
  );
}
