"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Download,
  Shield,
  Bot,
  Zap,
  Eye,
  Globe,
  Users,
  Clock,
  ChevronDown,
  ChevronUp,
  Star,
  CheckCircle,
  ArrowRight,
  Smartphone,
  Lock,
  BarChart3,
  Calendar,
  MessageSquare,
  Hash,
  Heart,
  UserPlus,
  Search,
} from "lucide-react";
import { FarmMindLogo } from "@/app/components/FarmMindLogo";

/* ------------------------------------------------------------------ */
/*  DATA                                                               */
/* ------------------------------------------------------------------ */

const PROBLEMS = [
  {
    icon: Lock,
    title: "Baneado por usar varias cuentas",
    desc: "Instagram y Facebook detectan multiples cuentas desde el mismo dispositivo. Fingerprint, IP, cookies — todo te delata. Resultado: baneos masivos.",
    color: "#f87171",
  },
  {
    icon: Eye,
    title: "VPNs y proxies no son suficientes",
    desc: "Cambiar tu IP no basta. Las plataformas verifican fingerprint del navegador, resolucion de pantalla, zona horaria, fuentes y WebGL. Shadowban garantizado.",
    color: "#fbbf24",
  },
  {
    icon: Clock,
    title: "Gestion manual imposible de escalar",
    desc: "Abrir y cerrar sesion, cambiar proxies, manejar 10-50 cuentas a mano... No escala. Pierdes tiempo y las cuentas se caen.",
    color: "#fb923c",
  },
];

const FEATURES = [
  {
    icon: Shield,
    title: "Anti-Deteccion Total",
    desc: "Cada perfil tiene su propio fingerprint unico: Canvas, WebGL, User-Agent, fuentes, resolucion. Indetectable.",
    color: "#007ABF",
  },
  {
    icon: Bot,
    title: "19 Automatizaciones",
    desc: "Like, follow, unfollow, comentar con IA, DMs masivos, ver stories, reels, extraer seguidores, subir posts y mas.",
    color: "#34d399",
  },
  {
    icon: Calendar,
    title: "Programador de Tareas",
    desc: "Programa pipelines de automatizacion que se ejecutan solos. Configura una vez, corre para siempre.",
    color: "#a78bfa",
  },
  {
    icon: BarChart3,
    title: "Warm-up Inteligente",
    desc: "14 dias de actividad natural automatizada para que tus cuentas nuevas no levanten sospechas.",
    color: "#fbbf24",
  },
  {
    icon: Search,
    title: "Scraper Profesional",
    desc: "Extrae seguidores, emails, datos de perfiles y hashtags. Exporta en CSV para tus campanas.",
    color: "#f472b6",
  },
  {
    icon: Globe,
    title: "Proxies Integrados",
    desc: "Importa tus proxies HTTP/SOCKS5, asignalos por perfil. Cada cuenta navega desde una IP diferente.",
    color: "#38bdf8",
  },
];

const PRICING = [
  {
    name: "Free",
    price: "$0",
    period: "para siempre",
    profiles: "5 perfiles",
    highlight: false,
    features: [
      "Automatizaciones basicas (like, follow, unfollow, stories, reels)",
      "Fingerprints unicos por perfil",
      "Proxies ilimitados",
      "Anti-deteccion completa",
    ],
    cta: "Descargar Gratis",
  },
  {
    name: "Pro",
    price: "$99",
    period: "/mes",
    profiles: "Perfiles ilimitados",
    highlight: true,
    features: [
      "Todo lo del plan Free",
      "Comentar con IA (OpenAI / Claude)",
      "DMs masivos personalizados",
      "Extraer seguidores y emails",
      "Scraper profesional",
      "Programador de tareas",
      "Warm-up inteligente (14 dias)",
      "Verificador de shadowban",
    ],
    cta: "Obtener Pro",
  },
  {
    name: "Lifetime",
    price: "$499",
    period: "pago unico",
    profiles: "Perfiles ilimitados",
    highlight: false,
    features: [
      "Todo lo del plan Pro",
      "Acceso de por vida",
      "Actualizaciones incluidas",
      "Sin pagos recurrentes",
      "Soporte prioritario",
    ],
    cta: "Comprar Lifetime",
  },
];

const TESTIMONIALS = [
  {
    name: "Carlos M.",
    role: "Bot Farmer - Peru",
    text: "Manejo 30 cuentas de Instagram sin ningun baneo. El warm-up es clave, las cuentas crecen organicamente.",
    stars: 5,
  },
  {
    name: "Andrea R.",
    role: "Agencia de Marketing - Argentina",
    text: "Antes usabamos VPN y nos baneaban cada semana. Con TrustInsta llevamos 3 meses sin problemas.",
    stars: 5,
  },
  {
    name: "Miguel D.",
    role: "Emprendedor Digital - RD",
    text: "El scraper me ahorra horas de trabajo. Extraigo seguidores, filtro por nicho y lanzo DMs automaticos.",
    stars: 5,
  },
  {
    name: "Laura P.",
    role: "Social Media Manager - Colombia",
    text: "Los comentarios con IA son increibles. Parecen escritos por una persona real. Mis clientes estan felices.",
    stars: 4,
  },
];

const FAQ = [
  {
    q: "¿Es seguro usar TrustInsta?",
    a: "Si. Cada perfil tiene un fingerprint unico que replica un dispositivo real. Las plataformas no pueden distinguir entre un usuario real y un perfil de TrustInsta.",
  },
  {
    q: "¿Necesito proxies?",
    a: "Recomendado pero no obligatorio. Para escalar a mas de 5 cuentas, necesitas proxies para que cada perfil tenga una IP diferente. Soportamos HTTP, HTTPS y SOCKS5.",
  },
  {
    q: "¿Funciona en Windows y Mac?",
    a: "Si. TrustInsta esta disponible para macOS (Apple Silicon) y Windows x64. La version para macOS Intel esta en desarrollo.",
  },
  {
    q: "¿Que pasa si me banean una cuenta?",
    a: "El warm-up inteligente reduce drasticamente el riesgo de baneo. Si una cuenta es restringida, las demas no se ven afectadas porque cada perfil esta completamente aislado.",
  },
  {
    q: "¿Puedo usar la IA para comentarios y DMs?",
    a: "Si, en el plan Pro. Puedes conectar tu API Key de OpenAI o Anthropic (Claude) para generar comentarios y mensajes personalizados automaticamente.",
  },
  {
    q: "¿Cuantas cuentas puedo manejar?",
    a: "En el plan Free hasta 5 perfiles. En Pro y Lifetime, ilimitado. Hemos visto usuarios manejando 100+ cuentas sin problemas.",
  },
  {
    q: "¿Hay reembolso?",
    a: "Ofrecemos 7 dias de garantia en el plan Pro mensual. Si no estas satisfecho, te devolvemos el 100%.",
  },
];

const STATS = [
  { value: "2,500+", label: "Usuarios activos" },
  { value: "50K+", label: "Perfiles creados" },
  { value: "10M+", label: "Automatizaciones ejecutadas" },
  { value: "99.2%", label: "Uptime" },
];

/* ------------------------------------------------------------------ */
/*  COMPONENTS                                                         */
/* ------------------------------------------------------------------ */

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        background: "var(--surface-2)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 16,
        overflow: "hidden",
        transition: "border-color 0.2s",
        borderColor: open ? "var(--accent)" : "rgba(255,255,255,0.06)",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: "20px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "none",
          border: "none",
          color: "var(--foreground)",
          fontSize: 16,
          fontWeight: 600,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        {q}
        {open ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>
      {open && (
        <div
          style={{
            padding: "0 24px 20px",
            color: "var(--text-2)",
            fontSize: 14,
            lineHeight: 1.7,
          }}
        >
          {a}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN PAGE                                                          */
/* ------------------------------------------------------------------ */

export default function SoftwarePage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--foreground)" }}>
      {/* NAV */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(5,5,8,0.85)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "14px 0",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <FarmMindLogo size={28} />
          </Link>
          <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
            <a href="#features" style={{ color: "var(--text-2)", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>Features</a>
            <a href="#pricing" style={{ color: "var(--text-2)", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>Pricing</a>
            <a href="#reviews" style={{ color: "var(--text-2)", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>Reviews</a>
            <a href="#faq" style={{ color: "var(--text-2)", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>FAQ</a>
            <Link
              href="/downloads"
              style={{
                background: "var(--accent)",
                color: "#fff",
                padding: "8px 20px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Descargar
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ padding: "100px 24px 60px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            top: -200,
            left: "50%",
            transform: "translateX(-50%)",
            width: 800,
            height: 800,
            borderRadius: "50%",
            background: "radial-gradient(circle, var(--accent-glow), transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ maxWidth: 800, margin: "0 auto", position: "relative" }}>
          <div
            style={{
              display: "inline-block",
              background: "rgba(0,122,191,0.1)",
              border: "1px solid rgba(0,122,191,0.3)",
              borderRadius: 50,
              padding: "6px 18px",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--accent-light)",
              marginBottom: 24,
            }}
          >
            TrustInsta Desktop + TrustFace Desktop
          </div>
          <h1
            style={{
              fontSize: "clamp(36px, 5vw, 60px)",
              fontWeight: 800,
              lineHeight: 1.1,
              marginBottom: 20,
              letterSpacing: "-0.02em",
            }}
          >
            Escala cuentas de Instagram y Facebook{" "}
            <span style={{ color: "var(--accent-light)" }}>sin baneos</span>
          </h1>
          <p style={{ fontSize: 18, color: "var(--text-2)", maxWidth: 600, margin: "0 auto 36px", lineHeight: 1.6 }}>
            Perfiles anti-deteccion con fingerprints unicos, 19 automatizaciones, warm-up inteligente y scraping profesional. Todo desde un solo software.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/downloads"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                background: "var(--accent)",
                color: "#fff",
                padding: "14px 32px",
                borderRadius: 14,
                fontSize: 16,
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 0 30px var(--accent-glow)",
              }}
            >
              <Download size={20} /> Descargar Gratis
            </Link>
            <a
              href="https://www.scalinglatam.site/agendar"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                background: "var(--surface-2)",
                color: "var(--foreground)",
                padding: "14px 32px",
                borderRadius: 14,
                fontSize: 16,
                fontWeight: 600,
                textDecoration: "none",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              Agendar Asesoria <ArrowRight size={18} />
            </a>
          </div>
          {/* Stats bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 48,
              marginTop: 50,
              flexWrap: "wrap",
            }}
          >
            {STATS.map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent-light)" }}>{s.value}</div>
                <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section style={{ padding: "80px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--accent-light)", textTransform: "uppercase", letterSpacing: 2 }}>El problema</p>
        </div>
        <h2 style={{ textAlign: "center", fontSize: 36, fontWeight: 800, marginBottom: 12 }}>
          Publicas. Creces. Pero las plataformas te limitan.
        </h2>
        <p style={{ textAlign: "center", color: "var(--text-2)", fontSize: 16, maxWidth: 600, margin: "0 auto 50px" }}>
          Escalar cuentas manualmente es una batalla perdida. Asi es como te detectan:
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          {PROBLEMS.map((p) => (
            <div
              key={p.title}
              style={{
                background: "var(--surface)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 20,
                padding: 32,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -40,
                  right: -40,
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${p.color}15, transparent 70%)`,
                  pointerEvents: "none",
                }}
              />
              <p.icon size={28} color={p.color} style={{ marginBottom: 16 }} />
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{p.title}</h3>
              <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.7 }}>{p.desc}</p>
            </div>
          ))}
        </div>
        <p
          style={{
            textAlign: "center",
            marginTop: 50,
            fontSize: 22,
            fontWeight: 700,
            color: "var(--accent-light)",
          }}
        >
          Hay una mejor forma.
        </p>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ padding: "80px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--accent-light)", textTransform: "uppercase", letterSpacing: 2 }}>Features</p>
        </div>
        <h2 style={{ textAlign: "center", fontSize: 36, fontWeight: 800, marginBottom: 12 }}>
          Todo lo que necesitas para escalar
        </h2>
        <p style={{ textAlign: "center", color: "var(--text-2)", fontSize: 16, maxWidth: 600, margin: "0 auto 50px" }}>
          Un navegador anti-deteccion con automatizaciones integradas. No necesitas 5 herramientas diferentes.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 24 }}>
          {FEATURES.map((f) => (
            <div
              key={f.title}
              style={{
                background: "var(--surface)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 20,
                padding: 32,
                transition: "border-color 0.2s, transform 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = f.color + "60";
                (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: f.color + "15",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 18,
                }}
              >
                <f.icon size={24} color={f.color} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: "80px 24px", background: "var(--surface)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--accent-light)", textTransform: "uppercase", letterSpacing: 2 }}>Como funciona</p>
          </div>
          <h2 style={{ textAlign: "center", fontSize: 36, fontWeight: 800, marginBottom: 50 }}>
            Empieza en 3 minutos
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 32 }}>
            {[
              { step: "1", title: "Descarga e instala", desc: "Disponible para macOS y Windows. Instalacion en 1 clic.", icon: Download },
              { step: "2", title: "Crea tus perfiles", desc: "Cada perfil tiene fingerprint unico, proxy y cookies aisladas.", icon: Users },
              { step: "3", title: "Configura automatizaciones", desc: "Elige que acciones ejecutar: likes, follows, DMs, scraping.", icon: Bot },
              { step: "4", title: "Escala sin limites", desc: "Agrega mas cuentas, programa pipelines y deja que corra solo.", icon: Zap },
            ].map((s) => (
              <div key={s.step} style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: "var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 18px",
                    fontSize: 22,
                    fontWeight: 800,
                    color: "#fff",
                    boxShadow: "0 0 30px var(--accent-glow)",
                  }}
                >
                  {s.step}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ padding: "80px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--accent-light)", textTransform: "uppercase", letterSpacing: 2 }}>Pricing</p>
        </div>
        <h2 style={{ textAlign: "center", fontSize: 36, fontWeight: 800, marginBottom: 12 }}>
          Elige tu plan
        </h2>
        <p style={{ textAlign: "center", color: "var(--text-2)", fontSize: 16, maxWidth: 500, margin: "0 auto 50px" }}>
          Empieza gratis. Escala cuando estes listo.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, alignItems: "stretch" }}>
          {PRICING.map((plan) => (
            <div
              key={plan.name}
              style={{
                background: plan.highlight ? "linear-gradient(135deg, rgba(0,122,191,0.1), rgba(0,122,191,0.03))" : "var(--surface)",
                border: plan.highlight ? "2px solid var(--accent)" : "1px solid rgba(255,255,255,0.06)",
                borderRadius: 24,
                padding: 36,
                display: "flex",
                flexDirection: "column",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {plan.highlight && (
                <div
                  style={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                    background: "var(--accent)",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "4px 12px",
                    borderRadius: 50,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Popular
                </div>
              )}
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{plan.name}</h3>
              <div style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 42, fontWeight: 800 }}>{plan.price}</span>
                <span style={{ fontSize: 14, color: "var(--text-2)", marginLeft: 4 }}>{plan.period}</span>
              </div>
              <p style={{ fontSize: 14, color: "var(--accent-light)", fontWeight: 600, marginBottom: 24 }}>{plan.profiles}</p>
              <div style={{ flex: 1, marginBottom: 28 }}>
                {plan.features.map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                    <CheckCircle size={16} color="var(--green)" style={{ marginTop: 2, flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.5 }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/downloads"
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "14px 24px",
                  borderRadius: 14,
                  fontSize: 15,
                  fontWeight: 700,
                  textDecoration: "none",
                  background: plan.highlight ? "var(--accent)" : "var(--surface-3)",
                  color: "#fff",
                  border: plan.highlight ? "none" : "1px solid rgba(255,255,255,0.1)",
                  boxShadow: plan.highlight ? "0 0 30px var(--accent-glow)" : "none",
                }}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="reviews" style={{ padding: "80px 24px", background: "var(--surface)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--accent-light)", textTransform: "uppercase", letterSpacing: 2 }}>Reviews</p>
          </div>
          <h2 style={{ textAlign: "center", fontSize: 36, fontWeight: 800, marginBottom: 50 }}>
            Lo que dicen nuestros usuarios
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 20,
                  padding: 28,
                }}
              >
                <div style={{ display: "flex", gap: 2, marginBottom: 14 }}>
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} size={16} fill="#fbbf24" color="#fbbf24" />
                  ))}
                </div>
                <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.7, marginBottom: 18 }}>
                  &ldquo;{t.text}&rdquo;
                </p>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-3)" }}>{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ padding: "80px 24px", maxWidth: 800, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--accent-light)", textTransform: "uppercase", letterSpacing: 2 }}>FAQ</p>
        </div>
        <h2 style={{ textAlign: "center", fontSize: 36, fontWeight: 800, marginBottom: 50 }}>
          Preguntas frecuentes
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {FAQ.map((f) => (
            <FaqItem key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ padding: "80px 24px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            bottom: -200,
            left: "50%",
            transform: "translateX(-50%)",
            width: 800,
            height: 800,
            borderRadius: "50%",
            background: "radial-gradient(circle, var(--accent-glow), transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ maxWidth: 600, margin: "0 auto", position: "relative" }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 16 }}>
            Empieza a escalar hoy
          </h2>
          <p style={{ fontSize: 16, color: "var(--text-2)", marginBottom: 36, lineHeight: 1.6 }}>
            Descarga gratis, crea tu primer perfil en minutos y automatiza tu crecimiento en Instagram y Facebook.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/downloads"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                background: "var(--accent)",
                color: "#fff",
                padding: "14px 32px",
                borderRadius: 14,
                fontSize: 16,
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 0 30px var(--accent-glow)",
              }}
            >
              <Download size={20} /> Descargar Gratis
            </Link>
            <a
              href="https://www.scalinglatam.site/agendar"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                background: "var(--surface-2)",
                color: "var(--foreground)",
                padding: "14px 32px",
                borderRadius: 14,
                fontSize: 16,
                fontWeight: 600,
                textDecoration: "none",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              Hablar con un Asesor <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "32px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "var(--text-3)" }}>
          &copy; {new Date().getFullYear()} TrustMind &mdash; Scaling Tech Farm LLC. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
}
