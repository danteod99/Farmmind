"use client";

import Link from "next/link";
import { Phone, MapPin, Building2, FileText, Zap, Shield, MessageCircle } from "lucide-react";
import { FarmMindLogo } from "@/app/components/FarmMindLogo";

export function TrustFooter() {
  const year = new Date().getFullYear();

  return (
    <footer style={{ position: "relative", background: "linear-gradient(180deg, #07070e 0%, #040410 100%)", borderTop: "1px solid #007ABF25", overflow: "hidden", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Background glows */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", bottom: 0, left: "20%", width: "500px", height: "300px", background: "radial-gradient(ellipse, #007ABF08, transparent 70%)", filter: "blur(60px)" }} />
        <div style={{ position: "absolute", bottom: 0, right: "20%", width: "400px", height: "250px", background: "radial-gradient(ellipse, #56B4E008, transparent 70%)", filter: "blur(50px)" }} />
      </div>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "56px 28px 32px", position: "relative", zIndex: 1 }}>

        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "40px", marginBottom: "48px" }}>

          {/* Brand */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <FarmMindLogo size={32} />
              <span style={{ fontSize: "20px", fontWeight: 900, letterSpacing: "0.15em", color: "white" }}>TRUST MIND</span>
            </div>
            <p style={{ margin: 0, fontSize: "13px", color: "#5a6480", lineHeight: 1.7, maxWidth: "260px" }}>
              La plataforma de Social Media Marketing más completa de Latam. +5,000 servicios para impulsar tu presencia digital.
            </p>
            <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
              {[
                { href: "https://wa.me/51931119176", label: "WhatsApp", icon: <MessageCircle size={14} /> },
              ].map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noreferrer"
                  style={{ padding: "7px 14px", borderRadius: "8px", background: "#007ABF15", border: "1px solid #007ABF30", color: "#56B4E0", fontSize: "12px", fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: "5px", transition: "background 0.15s" }}>
                  {s.icon}{s.label}
                </a>
              ))}
            </div>
          </div>

          {/* Services */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <h3 style={{ margin: 0, fontSize: "11px", fontWeight: 700, color: "#8892a4", letterSpacing: "0.08em", textTransform: "uppercase" }}>Servicios</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { href: "/smm/services",        label: "Social Media Marketing" },
                { href: "/smm/services#premium", label: "Cuentas Premium" },
                { href: "/smm/funds",            label: "Recargar saldo" },
                { href: "/smm/ai",               label: "Asistente IA" },
                { href: "/profile#childpanel",   label: "Child Panel / API" },
              ].map((l) => (
                <Link key={l.href} href={l.href}
                  style={{ fontSize: "13px", color: "#5a6480", textDecoration: "none", display: "flex", alignItems: "center", gap: "6px", transition: "color 0.15s" }}
                  onMouseEnter={(e) => e.currentTarget.style.color = "#56B4E0"}
                  onMouseLeave={(e) => e.currentTarget.style.color = "#5a6480"}>
                  <Zap size={11} color="#007ABF30" />{l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <h3 style={{ margin: 0, fontSize: "11px", fontWeight: 700, color: "#8892a4", letterSpacing: "0.08em", textTransform: "uppercase" }}>Contacto</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <a href="tel:+51931119176" style={{ display: "flex", alignItems: "center", gap: "10px", color: "#5a6480", textDecoration: "none", fontSize: "13px", transition: "color 0.15s" }}
                onMouseEnter={(e) => e.currentTarget.style.color = "#56B4E0"}
                onMouseLeave={(e) => e.currentTarget.style.color = "#5a6480"}>
                <Phone size={14} color="#007ABF" style={{ flexShrink: 0 }} />
                +51 931 119 176
              </a>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", color: "#5a6480", fontSize: "13px" }}>
                <MapPin size={14} color="#007ABF" style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ lineHeight: 1.6 }}>Eduardo del Castillo 2355,<br />Cercado de Lima, Perú</span>
              </div>
              <a href="https://www.scalinglatam.site" target="_blank" rel="noreferrer"
                style={{ display: "flex", alignItems: "center", gap: "10px", color: "#5a6480", textDecoration: "none", fontSize: "13px", transition: "color 0.15s" }}
                onMouseEnter={(e) => e.currentTarget.style.color = "#56B4E0"}
                onMouseLeave={(e) => e.currentTarget.style.color = "#5a6480"}>
                <Zap size={14} color="#007ABF" style={{ flexShrink: 0 }} />
                scalinglatam.site
              </a>
            </div>
          </div>

          {/* Legal */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <h3 style={{ margin: 0, fontSize: "11px", fontWeight: 700, color: "#8892a4", letterSpacing: "0.08em", textTransform: "uppercase" }}>Legal</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#5a6480", fontSize: "13px" }}>
                <Building2 size={14} color="#007ABF" style={{ flexShrink: 0 }} />
                OLIVEROS MKT EIRL
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#5a6480", fontSize: "13px" }}>
                <FileText size={14} color="#007ABF" style={{ flexShrink: 0 }} />
                RUC: 20605576550
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
                {[
                  { href: "/politica-privacidad", label: "Política de Privacidad" },
                  { href: "/terminos-servicio",   label: "Términos de Servicio" },
                ].map((l) => (
                  <Link key={l.href} href={l.href}
                    style={{ fontSize: "12px", color: "#5a6480", textDecoration: "none", display: "flex", alignItems: "center", gap: "5px", transition: "color 0.15s" }}
                    onMouseEnter={(e) => e.currentTarget.style.color = "#56B4E0"}
                    onMouseLeave={(e) => e.currentTarget.style.color = "#5a6480"}>
                    <Shield size={11} color="#007ABF30" />{l.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: "1px solid #007ABF15", paddingTop: "28px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", justifyContent: "center" }}>
            {[
              { href: "/politica-privacidad", label: "Privacidad" },
              { href: "/terminos-servicio",   label: "Términos" },
              { href: "/smm/services",        label: "Servicios" },
              { href: "https://www.scalinglatam.site", label: "Scaling Latam", ext: true },
            ].map((l) => (
              l.ext ? (
                <a key={l.label} href={l.href} target="_blank" rel="noreferrer"
                  style={{ fontSize: "12px", color: "#3a3a5c", textDecoration: "none" }}>{l.label}</a>
              ) : (
                <Link key={l.href} href={l.href}
                  style={{ fontSize: "12px", color: "#3a3a5c", textDecoration: "none" }}>{l.label}</Link>
              )
            ))}
          </div>
          <p style={{ margin: 0, fontSize: "12px", color: "#2a2a40", textAlign: "center" }}>
            © {year} TRUST MIND · OLIVEROS MKT EIRL · Todos los derechos reservados
          </p>
        </div>
      </div>
    </footer>
  );
}
