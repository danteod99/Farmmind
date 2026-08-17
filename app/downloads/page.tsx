"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  Crown,
  Lock,
} from "lucide-react";
import { FarmMindLogo } from "@/app/components/FarmMindLogo";
import { supabase } from "@/app/lib/supabase";

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
      mac: { label: "macOS (Apple Silicon)", size: "113 MB", url: "https://github.com/danteod99/trustmind-releases/releases/download/v1.6.6/TrustInsta-Desktop-1.6.6-arm64.dmg" },
      macIntel: { label: "macOS (Intel)", size: "Proximamente", url: "#" },
      windows: { label: "Windows x64", size: "95 MB", url: "https://github.com/danteod99/trustmind-releases/releases/download/v1.6.6/TrustInsta-Desktop-Setup-1.6.6.exe" },
    },
    version: "1.6.6",
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
      mac: { label: "macOS (Apple Silicon)", size: "113 MB", url: "https://github.com/danteod99/trustface-releases/releases/download/v1.6.6/TrustFace-Desktop-1.6.6-arm64.dmg" },
      macIntel: { label: "macOS (Intel)", size: "Proximamente", url: "#" },
      windows: { label: "Windows x64", size: "95 MB", url: "https://github.com/danteod99/trustface-releases/releases/download/v1.6.6/TrustFace-Desktop-Setup-1.6.6.exe" },
    },
    version: "1.6.6",
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
      mac: { label: "macOS (Apple Silicon)", size: "Proximamente", url: "#" },
      macIntel: { label: "macOS (Intel)", size: "Proximamente", url: "#" },
      windows: { label: "Windows x64", size: "39 MB", url: "https://github.com/danteod99/trustfarm-releases/releases/download/v2.24.0/TrustFarm_2.24.0_x64-setup.exe" },
    },
    version: "2.24.0",
    requirements: [
      "macOS 12+ o Windows 10+",
      "4 GB RAM minimo",
      "ADB y scrcpy incluidos",
      "Celulares Android con Depuracion USB activada",
    ],
  },
];

// Apps que se descargan SIN cuenta ni suscripcion (decision 2026-08-17).
// TrustFarm se entrega libre: el limite gratis/pro vive DENTRO del software
// (tope de 4 equipos salvo correo de la allowlist), asi que no hace falta
// candado en la web. TrustInsta y TrustFace siguen siendo Pro hasta que se
// defina su modelo.
const IDS_LIBRES = ["trustfarm"];
const APPS_LIBRES = APPS.filter((a) => IDS_LIBRES.includes(a.id));
const APPS_PRO = APPS.filter((a) => !IDS_LIBRES.includes(a.id));

export default function DownloadsPage() {
  const router = useRouter();
  const [os, setOs] = useState<"mac" | "windows" | "unknown">("unknown");
  const [authChecking, setAuthChecking] = useState(true);
  const [isLogged, setIsLogged] = useState(false);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("mac")) setOs("mac");
    else if (ua.includes("win")) setOs("windows");
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setIsLogged(false); setIsPro(false); return; }
        setIsLogged(true);
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          setIsPro(!!data.isPro);
        }
      } finally {
        setAuthChecking(false);
      }
    })();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/downloads` },
      });
      if (error) alert("Error iniciando sesión: " + error.message);
    } catch {
      alert("Error de conexión");
    }
  };

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

        {/* DESCARGA LIBRE: no espera al chequeo de sesion, se ve al instante. */}
        <div style={{ marginBottom: 24, padding: "12px 18px", borderRadius: 12, background: "rgba(0, 229, 255, 0.08)", border: "1px solid rgba(0, 229, 255, 0.25)", display: "inline-flex", alignItems: "center", gap: 10 }}>
          <Download size={16} color="#00e5ff" />
          <span style={{ fontSize: 13, color: "#00e5ff", fontWeight: 600 }}>Descarga libre · sin cuenta ni suscripción</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 48, marginBottom: 48 }}>
          {APPS_LIBRES.map((app) => <AppCard key={app.id} app={app} detectedOs={os} />)}
        </div>

        {/* PAYWALL: TrustInsta y TrustFace siguen siendo solo para Pro */}
        {authChecking ? (
          <div style={{ padding: "60px", textAlign: "center" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", border: "2px solid var(--accent)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : !isPro ? (
          <div style={{
            position: "relative",
            overflow: "hidden",
            border: "2px solid #007ABF",
            borderRadius: 20,
            padding: "48px 32px",
            background: "linear-gradient(160deg, #001830 0%, #000810 100%)",
            textAlign: "center",
            marginBottom: 48,
          }}>
            <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,180,216,0.25), transparent 70%)", filter: "blur(40px)", pointerEvents: "none" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "inline-flex", padding: 14, borderRadius: 16, background: "rgba(0, 180, 216, 0.12)", border: "1px solid rgba(0, 180, 216, 0.35)", marginBottom: 20 }}>
                <Lock size={28} color="#7dd3fc" />
              </div>
              <h2 style={{ fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 800, color: "white", marginBottom: 12, letterSpacing: "-0.02em" }}>
                Descargas exclusivas para usuarios <span style={{ color: "#7dd3fc" }}>TRUST MIND Pro</span>
              </h2>
              <p style={{ fontSize: 15, color: "#94a3b8", maxWidth: 540, margin: "0 auto 28px", lineHeight: 1.6 }}>
                TrustInsta y TrustFace Desktop están incluidos en tu suscripción Pro. Suscríbete una vez y desbloquea ambos para Mac y Windows.
              </p>

              {!isLogged ? (
                <button onClick={handleGoogleLogin}
                  style={{ padding: "16px 28px", borderRadius: 14, border: "none", background: "white", color: "#111", fontSize: 15, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 10, boxShadow: "0 4px 20px rgba(0, 180, 216, 0.2)" }}>
                  <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.836.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
                  Inicia sesión con Google
                </button>
              ) : (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center", marginBottom: 16 }}>
                    <a href="https://wa.me/51931119176?text=Hola%2C%20quiero%20activar%20mi%20plan%20Pro%20para%20descargar%20TrustInsta%20y%20TrustFace%20Desktop"
                      target="_blank" rel="noopener noreferrer"
                      style={{ padding: "18px 36px", borderRadius: 14, border: "none",
                        background: "linear-gradient(135deg, #25D366, #128C7E)",
                        color: "white",
                        fontSize: 16, fontWeight: 900, cursor: "pointer",
                        boxShadow: "0 8px 32px rgba(37, 211, 102, 0.4)",
                        textDecoration: "none",
                        display: "inline-flex", alignItems: "center", gap: 10, minWidth: 280, justifyContent: "center" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.359.101 11.944c0 2.096.547 4.142 1.588 5.945L0 24l6.305-1.654a11.94 11.94 0 005.71 1.455h.005c6.585 0 11.946-5.36 11.949-11.945A11.86 11.86 0 0020.52 3.449"/></svg>
                      Activar Pro por WhatsApp
                    </a>
                  </div>
                  <p style={{ fontSize: 12, color: "#64748b" }}>
                    Activación rápida · Te atendemos al instante · Soporte directo
                  </p>
                </>
              )}

              {/* Beneficios incluidos */}
              <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.06)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, textAlign: "left" }}>
                {[
                  "TrustInsta Desktop (Instagram)",
                  "TrustFace Desktop (Facebook)",
                  "Panel SMM con +5,000 servicios",
                  "Soporte directo y prioritario",
                ].map((b) => (
                  <div key={b} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <CheckCircle size={14} color="#34d399" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: "#e2e8f0" }}>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 24, padding: "12px 18px", borderRadius: 12, background: "rgba(52, 211, 153, 0.08)", border: "1px solid rgba(52, 211, 153, 0.25)", display: "inline-flex", alignItems: "center", gap: 10 }}>
              <Crown size={16} color="#34d399" />
              <span style={{ fontSize: 13, color: "#34d399", fontWeight: 600 }}>Pro activo · Descargas desbloqueadas</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
              {APPS_PRO.map((app) => <AppCard key={app.id} app={app} detectedOs={os} />)}
            </div>
          </>
        )}

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
