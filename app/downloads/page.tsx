"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Monitor,
  Smartphone,
  Download,
  Apple,
  Shield,
  Cpu,
  Globe,
  Bot,
  MousePointer,
  Eye,
  Zap,
  ArrowLeft,
  CheckCircle,
  Star,
} from "lucide-react";
import { FarmMindLogo } from "@/app/components/FarmMindLogo";

const APPS = [
  {
    id: "trustinsta",
    name: "TrustInsta Desktop",
    tagline: "Instagram Multi-Account Manager",
    description:
      "Gestiona multiples cuentas de Instagram con perfiles de navegador unicos. Anti-deteccion, proxies, fingerprints, warm-up automatico, verificador de shadowban y extraccion de seguidores.",
    icon: "TI",
    gradient: "from-pink-500 via-rose-500 to-orange-500",
    glowColor: "#E1306C",
    badge: "Instagram",
    features: [
      { icon: Globe, text: "Multi-cuenta Instagram con perfiles aislados" },
      { icon: Shield, text: "Anti-deteccion y fingerprints unicos" },
      { icon: Bot, text: "Warm-up inteligente de 14 dias con auto-launch" },
      { icon: Eye, text: "Verificador de shadowban automatico" },
      { icon: MousePointer, text: "Scraper de seguidores, emails y datos" },
      { icon: Zap, text: "CapSolver integrado para captchas" },
    ],
    downloads: {
      mac: { label: "macOS (Apple Silicon)", size: "113 MB", url: "https://github.com/danteod99/trustmind-releases/releases/latest/download/TrustInsta-Desktop-1.4.0-arm64.dmg" },
      macIntel: { label: "macOS (Intel)", size: "Proximamente", url: "#" },
      windows: { label: "Windows x64", size: "93 MB", url: "https://github.com/danteod99/trustmind-releases/releases/latest/download/TrustInsta-Desktop-Setup-1.4.0.exe" },
    },
    version: "1.4.0",
    requirements: ["macOS 12+ o Windows 10+", "4 GB RAM minimo", "500 MB espacio en disco"],
  },
  {
    id: "trustface",
    name: "TrustFace Desktop",
    tagline: "Facebook Multi-Account Manager",
    description:
      "Gestiona multiples cuentas de Facebook con perfiles aislados. Marketplace automation, Messenger masivo, gestion de grupos y engagement automatizado.",
    icon: "TF",
    gradient: "from-blue-600 to-blue-800",
    glowColor: "#1877F2",
    badge: "Facebook",
    features: [
      { icon: Globe, text: "Multi-cuenta Facebook con anti-deteccion" },
      { icon: Smartphone, text: "Marketplace: publicar, repostear, scrape" },
      { icon: Bot, text: "Messenger: DMs masivos con templates" },
      { icon: Eye, text: "Grupos: unirse, publicar, extraer miembros" },
      { icon: Zap, text: "Engagement: likes, comentarios, shares" },
      { icon: Shield, text: "Warm-up y programador de tareas" },
    ],
    downloads: {
      mac: { label: "macOS (Apple Silicon)", size: "113 MB", url: "https://github.com/danteod99/trustface-releases/releases/latest/download/TrustFace-Desktop-1.4.0-arm64.dmg" },
      macIntel: { label: "macOS (Intel)", size: "Proximamente", url: "#" },
      windows: { label: "Windows x64", size: "93 MB", url: "https://github.com/danteod99/trustface-releases/releases/latest/download/TrustFace-Desktop-Setup-1.4.0.exe" },
    },
    version: "1.4.0",
    requirements: ["macOS 12+ o Windows 10+", "4 GB RAM minimo", "500 MB espacio en disco"],
  },
  {
    id: "trustfarm",
    name: "TrustFarm Desktop",
    tagline: "Phone Farm Manager + TikTok Automation",
    description:
      "Controla y automatiza cientos de celulares Android desde tu computadora. Screen mirroring con scrcpy, automatizaciones TikTok con IA, scripts personalizados, warm-up de cuentas y whitelabel para distribuidores.",
    icon: "TK",
    gradient: "from-cyan-500 to-blue-600",
    glowColor: "#00e5ff",
    badge: "Phone Farming",
    features: [
      { icon: Smartphone, text: "Control de dispositivos USB, WiFi y OTG" },
      { icon: Monitor, text: "Screen mirroring en tiempo real con scrcpy" },
      { icon: Bot, text: "Automatizaciones TikTok, Instagram, Facebook, Spotify" },
      { icon: Zap, text: "AI Agent integrado con Claude para scripts" },
      { icon: Cpu, text: "Control masivo y acciones en lote" },
      { icon: Globe, text: "Whitelabel para distribuidores" },
    ],
    downloads: {
      mac: { label: "macOS (Apple Silicon)", size: "8.6 MB", url: "https://github.com/danteod99/trustfarm-releases/releases/download/v1.1.1/TrustFarm_1.0.9_aarch64.dmg" },
      macIntel: { label: "macOS (Intel)", size: "Proximamente", url: "#" },
      windows: { label: "Windows x64", size: "4.4 MB", url: "https://github.com/danteod99/trustfarm-releases/releases/download/v1.1.1/TrustFarm_1.0.9_x64-setup.exe" },
    },
    version: "1.1.1",
    requirements: [
      "macOS 12+ o Windows 10+",
      "4 GB RAM minimo",
      "ADB y scrcpy incluidos",
      "Celulares Android con Depuracion USB activada",
    ],
  },
];

export default function DownloadsPage() {
  const [os, setOs] = useState<"mac" | "windows" | "unknown">("unknown");

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("mac")) setOs("mac");
    else if (ua.includes("win")) setOs("windows");
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--foreground)" }}>
      <nav style={{ padding: "16px 32px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 50 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12 }}><FarmMindLogo size={28} /></Link>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <Link href="/downloads" style={{ fontSize: 14, color: "var(--accent)", fontWeight: 600 }}>Descargas</Link>
        </div>
      </nav>

      <header style={{ textAlign: "center", padding: "80px 24px 40px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 999, border: "1px solid var(--border-2)", background: "var(--surface-2)", fontSize: 13, color: "var(--text-2)", marginBottom: 24 }}>
          <Download size={14} style={{ color: "var(--accent)" }} />
          Aplicaciones de escritorio
        </div>
        <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 800, lineHeight: 1.1, marginBottom: 16 }}>
          Descarga las herramientas<br />
          <span style={{ color: "var(--accent)" }}>del ecosistema Trust</span>
        </h1>
        <p style={{ fontSize: 17, color: "var(--text-2)", maxWidth: 600, margin: "0 auto", lineHeight: 1.6 }}>
          Software profesional para gestionar granjas de navegadores y celulares. Descarga, instala y conecta con tu cuenta Trust Mind.
        </p>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 100px" }}>
        {/* Video Demo */}
        <div style={{ marginBottom: 48 }}>
          <div
            style={{ position: "relative", paddingBottom: "65.06%", height: 0 }}
            dangerouslySetInnerHTML={{ __html: '<iframe src="https://www.loom.com/embed/e0a161991f3f4be0abd1376df0270895" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe>' }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
          {APPS.map((app) => <AppCard key={app.id} app={app} detectedOs={os} />)}
        </div>

        <div style={{ marginTop: 80, textAlign: "center", padding: "40px 24px", border: "1px solid var(--border)", borderRadius: 16, background: "var(--surface)" }}>
          <Shield size={32} style={{ color: "var(--accent)", margin: "0 auto 16px" }} />
          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Seguridad y privacidad</h3>
          <p style={{ fontSize: 14, color: "var(--text-2)", maxWidth: 500, margin: "0 auto", lineHeight: 1.6 }}>
            Todas las credenciales se almacenan encriptadas con AES-256-GCM en tu maquina local. Las apps no envian datos a servidores externos.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 32, marginTop: 24, flexWrap: "wrap" }}>
            {["Encriptacion AES-256", "Sin telemetria", "Actualizaciones automaticas", "Soporte incluido"].map((item) => (
              <span key={item} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-2)" }}>
                <CheckCircle size={14} style={{ color: "var(--green)" }} />{item}
              </span>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function AppCard({ app, detectedOs }: { app: (typeof APPS)[number]; detectedOs: "mac" | "windows" | "unknown" }) {
  const [expanded, setExpanded] = useState(false);
  const primaryDownload = detectedOs === "mac" ? app.downloads.mac : detectedOs === "windows" ? app.downloads.windows : app.downloads.mac;

  return (
    <div style={{ border: "1px solid var(--border-2)", borderRadius: 20, background: "var(--surface)", overflow: "hidden", transition: "border-color 0.3s" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = app.glowColor + "40")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-2)")}>
      <div style={{ padding: "40px 40px 32px", display: "flex", gap: 40, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ width: 88, height: 88, borderRadius: 22, background: `linear-gradient(135deg, ${app.glowColor}, ${app.glowColor}88)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 900, color: "#fff", flexShrink: 0, boxShadow: `0 8px 32px ${app.glowColor}30` }}>
          {app.icon}
        </div>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800 }}>{app.name}</h2>
            <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 999, background: app.glowColor + "15", color: app.glowColor, fontWeight: 600 }}>{app.badge}</span>
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>v{app.version}</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 4 }}>{app.tagline}</p>
          <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.6, maxWidth: 520 }}>{app.description}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8, marginTop: 20 }}>
            {app.features.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-2)" }}>
                <f.icon size={14} style={{ color: app.glowColor, flexShrink: 0 }} />{f.text}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 220 }}>
          <a href={primaryDownload.url} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "14px 24px", borderRadius: 12, background: app.glowColor, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", textDecoration: "none", boxShadow: `0 4px 20px ${app.glowColor}40` }}>
            <Download size={18} />Descargar {detectedOs === "windows" ? "para Windows" : "para Mac"}
          </a>
          <span style={{ fontSize: 11, color: "var(--text-3)", textAlign: "center" }}>{primaryDownload.size} — {primaryDownload.label}</span>
          <button onClick={() => setExpanded(!expanded)} style={{ background: "none", border: "1px solid var(--border-2)", borderRadius: 10, padding: "10px 16px", color: "var(--text-2)", fontSize: 13, cursor: "pointer", marginTop: 4 }}>
            {expanded ? "Ocultar" : "Otras plataformas"}
          </button>
          {expanded && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
              {Object.entries(app.downloads).map(([key, dl]) => (
                <a key={key} href={dl.url} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-2)", fontSize: 12, textDecoration: "none", cursor: "pointer" }}>
                  <span>{dl.label}</span><span style={{ color: "var(--text-3)" }}>{dl.size}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
      <div style={{ padding: "12px 40px", borderTop: "1px solid var(--border)", background: "var(--surface-2)", display: "flex", gap: 24, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 600 }}>Requisitos:</span>
        {app.requirements.map((req, i) => <span key={i} style={{ fontSize: 12, color: "var(--text-3)" }}>{req}</span>)}
      </div>
    </div>
  );
}
