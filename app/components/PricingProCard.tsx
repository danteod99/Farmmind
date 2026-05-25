"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Crown } from "lucide-react";

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

export function PricingProCard() {
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const price = cycle === "monthly" ? "50" : "20";
  const billingNote =
    cycle === "monthly"
      ? "Facturado mensualmente · cancela cuando quieras"
      : "Facturado anual · $240/año (ahorra 60%)";

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

      {/* Billing toggle */}
      <div style={{ marginBottom: "20px" }}>
        <div
          style={{
            display: "inline-flex",
            padding: "4px",
            borderRadius: "12px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <button
            onClick={() => setCycle("monthly")}
            style={{
              padding: "8px 18px",
              borderRadius: "9px",
              border: "none",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 700,
              transition: "all 0.2s",
              background:
                cycle === "monthly"
                  ? "linear-gradient(135deg, #007ABF, #00B4D8)"
                  : "transparent",
              color: cycle === "monthly" ? "white" : "#94a3b8",
            }}
          >
            Mensual
          </button>
          <button
            onClick={() => setCycle("yearly")}
            style={{
              padding: "8px 18px",
              borderRadius: "9px",
              border: "none",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 700,
              transition: "all 0.2s",
              position: "relative",
              background:
                cycle === "yearly"
                  ? "linear-gradient(135deg, #007ABF, #00B4D8)"
                  : "transparent",
              color: cycle === "yearly" ? "white" : "#94a3b8",
            }}
          >
            Anual
            <span
              style={{
                position: "absolute",
                top: "-7px",
                right: "-8px",
                padding: "2px 7px",
                borderRadius: "8px",
                background: "#34d399",
                color: "#003020",
                fontSize: "9px",
                fontWeight: 800,
                letterSpacing: "0.3px",
              }}
            >
              -60%
            </span>
          </button>
        </div>
      </div>

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
            fontSize: "56px",
            fontWeight: 900,
            color: "white",
            letterSpacing: "-0.04em",
          }}
        >
          ${price}
        </span>
        <span style={{ fontSize: "16px", color: "#475569", marginLeft: "6px" }}>
          /mes
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
        {billingNote}
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

      <Link
        href={`/chat?subscribe=${cycle}`}
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
        {cycle === "monthly"
          ? "Activar Pro — $50/mes"
          : "Activar Pro Anual — $240/año"}
      </Link>
      <p
        style={{
          fontSize: "12px",
          color: "#64748b",
          textAlign: "center",
          marginTop: "12px",
        }}
      >
        Cancela cuando quieras · Pago seguro con Stripe
      </p>
    </div>
  );
}
