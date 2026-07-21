import Link from "next/link";
import { Bot, Cpu, Globe, MessageSquare, ShoppingCart, Sparkles, Star, Zap, ShieldCheck, Smartphone } from "lucide-react";
import { FarmMindLogo } from "@/app/components/FarmMindLogo";
import { TrustFooter } from "@/app/components/TrustFooter";
import { LoginButton } from "@/app/components/LoginButton";

export const metadata = {
  title: "TrustMind — IA que comanda 1,000 granjas de bots",
  description: "Plataforma de IA que automatiza granjas de bots. Controla 1,000 cuentas con un agente IA, software antidetect, +5,000 servicios SMM y cursos. Granjas llave en mano.",
  alternates: { canonical: "https://www.trustmind.online" },
  openGraph: {
    title: "TrustMind — IA que comanda 1,000 granjas de bots",
    description: "IA que automatiza granjas de bots. Software antidetect, +5,000 servicios SMM y curso completo. Granjas llave en mano.",
    url: "https://www.trustmind.online",
    siteName: "TrustMind",
    type: "website",
  },
};

const STATS = [
  { value: "1,000", label: "Cuentas por granja" },
  { value: "29", label: "Granjas vendidas/mes" },
  { value: "24/7", label: "IA activa" },
  { value: "$750K", label: "Facturado en 1 año" },
];

const FEATURES = [
  {
    icon: Bot,
    title: "Agente IA que opera por ti",
    desc: "Pídele aumentar seguidores, calentar cuentas, gestionar proxies o ejecutar campañas. La IA decide y actúa en tus herramientas.",
  },
  {
    icon: Smartphone,
    title: "Granja física de 1,000 cuentas",
    desc: "Compras una granja real (smartphones + cuentas precalentadas + proxies + software). Llave en mano, lista para escalar.",
  },
  {
    icon: ShieldCheck,
    title: "Antidetect + proxies premium",
    desc: "Software TrustInsta + TrustFace con stealth integrado. Proxies residenciales rotativos. Cero baneos masivos.",
  },
  {
    icon: ShoppingCart,
    title: "+5,000 servicios SMM",
    desc: "Seguidores, likes, views, comentarios en Instagram, TikTok, Facebook, YouTube y más. Precios mayoristas.",
  },
  {
    icon: Sparkles,
    title: "Curso completo incluido",
    desc: "Aprende a operar granjas de bots, escalar redes y monetizar tu operación. Guía paso a paso.",
  },
  {
    icon: Cpu,
    title: "Software desktop incluido",
    desc: "Acceso a TrustInsta (Instagram), TrustFace (Facebook) y TrustFarm (control de granjas Android). Mac y Windows.",
  },
];

const SOFTWARE = [
  {
    name: "TrustInsta",
    color: "#E1306C",
    desc: "Automatización Instagram. Follow/unfollow, likes, comentarios, DMs, multi-cuenta con stealth.",
    cta: "Descargar",
    href: "/downloads",
  },
  {
    name: "TrustFace",
    color: "#1877F2",
    desc: "Automatización Facebook. Comparte, comenta, reacciona en masa desde cientos de cuentas.",
    cta: "Descargar",
    href: "/downloads",
  },
  {
    name: "TrustFarm",
    color: "#9333EA",
    desc: "Control central de granjas Android. ADB, dispositivos físicos, orquestación de cientos de teléfonos.",
    cta: "Descargar",
    href: "/downloads",
  },
];

const TESTIMONIALS = [
  {
    name: "Carlos M.",
    role: "Agencia de marketing · Perú",
    text: "Compré la granja en abril y en 2 meses recuperé la inversión revendiendo seguidores. La IA me ahorra horas todos los días.",
  },
  {
    name: "Ana R.",
    role: "Reseller · Colombia",
    text: "Automatizo 50 cuentas en simultáneo y revendo seguidores a clientes. La IA me sugiere campañas y precios en segundos.",
  },
  {
    name: "Diego F.",
    role: "E-commerce · Argentina",
    text: "TrustInsta + TrustFace son una bestia. Estoy moviendo 200 cuentas sin baneos. El soporte responde al toque por WhatsApp.",
  },
];

export default function HomePage() {
  return (
    <div style={{ minHeight: "100vh", background: "#050508", color: "#f0efff", fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", overflowX: "hidden" }}>
      <style>{`
        @keyframes pulse-glow { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
        @keyframes subtle-rotate { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .card-hover { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .card-hover:hover { transform: translateY(-4px); border-color: rgba(0, 122, 191, 0.4) !important; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 60px rgba(0, 122, 191, 0.08); }
        .btn-primary { background: linear-gradient(135deg, #007ABF, #00B4D8); transition: all 0.2s; box-shadow: 0 4px 20px rgba(0, 180, 216, 0.3); }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 28px rgba(0, 180, 216, 0.45); }
        .btn-ghost { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); transition: all 0.2s; }
        .btn-ghost:hover { border-color: rgba(0, 180, 216, 0.4); background: rgba(0, 122, 191, 0.08); }
        @media (max-width: 768px) {
          .hero-h1 { font-size: clamp(32px, 9vw, 48px) !important; line-height: 1.05 !important; }
          .grid-3 { grid-template-columns: 1fr !important; }
          .grid-4 { grid-template-columns: repeat(2, 1fr) !important; }
          .hero-cta { flex-direction: column !important; width: 100%; }
          .hero-cta > * { width: 100% !important; max-width: 360px !important; }
          .nav-links { display: none !important; }
          .home-section { padding: 48px 16px !important; }
        }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(5,5,8,0.85)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 clamp(16px, 4vw, 48px)", height: "72px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
          <FarmMindLogo size={36} />
        </Link>
        <div className="nav-links" style={{ display: "flex", alignItems: "center", gap: "28px" }}>
          <Link href="/granjas" style={{ fontSize: "14px", color: "#94a3b8", textDecoration: "none", fontWeight: 600 }}>Granjas</Link>
          <Link href="/smm" style={{ fontSize: "14px", color: "#94a3b8", textDecoration: "none", fontWeight: 600 }}>Servicios SMM</Link>
          <Link href="/downloads" style={{ fontSize: "14px", color: "#94a3b8", textDecoration: "none", fontWeight: 600 }}>Software</Link>
          <Link href="/cursos" style={{ fontSize: "14px", color: "#94a3b8", textDecoration: "none", fontWeight: 600 }}>Cursos</Link>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
          <LoginButton variant="nav" />
          <Link href="/chat" className="btn-primary" style={{ padding: "10px 18px", borderRadius: "12px", color: "white", fontSize: "13px", fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Bot size={14} /> Hablar con la IA
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="home-section" style={{ position: "relative", overflow: "hidden", padding: "clamp(60px, 10vw, 110px) 32px clamp(50px, 8vw, 80px)", textAlign: "center" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% -20%, #001d3d 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "20%", left: "10%", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, #007ABF12, transparent 60%)", filter: "blur(80px)", pointerEvents: "none", animation: "subtle-rotate 30s linear infinite" }} />

        <div style={{ position: "relative", maxWidth: "900px", margin: "0 auto" }}>
          {/* Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "7px 18px", borderRadius: "100px", background: "linear-gradient(135deg, rgba(0, 122, 191, 0.18), rgba(0, 180, 216, 0.15))", border: "1px solid rgba(0, 180, 216, 0.4)", marginBottom: "32px" }}>
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#34d399", boxShadow: "0 0 8px #34d399", animation: "pulse-glow 2s ease-in-out infinite" }} />
            <span style={{ fontSize: "13px", color: "#7dd3fc", fontWeight: 700, letterSpacing: "0.3px" }}>TRUST MIND — IA + granjas llave en mano</span>
          </div>

          {/* Headline */}
          <h1 className="hero-h1" style={{ fontSize: "clamp(40px, 7vw, 72px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.045em", marginBottom: "24px" }}>
            <span style={{ color: "#ffffff" }}>La IA que</span>
            <br />
            <span style={{ background: "linear-gradient(135deg, #00B4D8 0%, #007ABF 50%, #0050A0 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>comanda 1,000 granjas</span>
            <br />
            <span style={{ color: "#ffffff" }}>de bots por ti</span>
          </h1>

          <p style={{ fontSize: "clamp(16px, 2vw, 19px)", color: "#94a3b8", lineHeight: 1.7, maxWidth: "640px", margin: "0 auto 40px", fontWeight: 400 }}>
            Un <strong style={{ color: "#7dd3fc" }}>agente IA</strong> que opera Instagram, TikTok y Facebook por ti. Software antidetect (TrustInsta + TrustFace + TrustFarm), proxies premium, +5,000 servicios SMM y curso completo de granjas de bots. <strong style={{ color: "#7dd3fc" }}>Granjas llave en mano, listas para escalar.</strong>
          </p>

          {/* CTA */}
          <div className="hero-cta" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
            <Link href="/granjas" className="btn-primary" style={{ padding: "16px 28px", borderRadius: "14px", color: "white", fontSize: "15px", fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <Smartphone size={16} /> Quiero una granja
            </Link>
            <Link href="/chat" className="btn-ghost" style={{ padding: "16px 28px", borderRadius: "14px", color: "white", fontSize: "15px", fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <Bot size={16} /> Probar la IA gratis
            </Link>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "20px", marginTop: "20px", flexWrap: "wrap" }}>
            {["Sin mensualidades", "Pago seguro con Stripe", "Soporte WhatsApp"].map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Zap size={12} color="#34d399" />
                <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 500 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="home-section" style={{ padding: "20px 32px 60px" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div className="grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "2px", background: "rgba(255,255,255,0.04)", borderRadius: "20px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
            {STATS.map((s, i) => (
              <div key={i} style={{ padding: "28px 20px", textAlign: "center", background: "#0a0a12" }}>
                <div style={{ fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 900, color: "white", letterSpacing: "-0.03em", marginBottom: "6px" }}>{s.value}</div>
                <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VIDEO DEMO LOOM ── */}
      <section className="home-section" style={{ padding: "40px 32px 60px" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "#007ABF", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "10px" }}>Demo · 3 min</p>
            <h2 style={{ fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 800, color: "white", letterSpacing: "-0.02em" }}>
              Mira cómo la <span style={{ color: "#7dd3fc" }}>IA opera</span> una granja real
            </h2>
          </div>
          <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: "20px", overflow: "hidden", boxShadow: "0 24px 80px rgba(0, 122, 191, 0.25), 0 0 0 1px rgba(255,255,255,0.08)" }}>
            <iframe
              src="https://www.loom.com/embed/bf8ccb2d678342bcb7a0ed06f4316605"
              allowFullScreen
              loading="lazy"
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
            />
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="home-section" style={{ padding: "60px 32px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "#007ABF", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "10px" }}>Qué incluye</p>
            <h2 style={{ fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 900, color: "white", letterSpacing: "-0.03em", lineHeight: 1.15 }}>
              Todo lo que necesitas para<br /><span style={{ background: "linear-gradient(135deg, #00B4D8, #007ABF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>operar granjas a escala</span>
            </h2>
          </div>

          <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="card-hover" style={{ background: "linear-gradient(160deg, #0a0a14 0%, #06060c 100%)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "28px" }}>
                  <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(0, 122, 191, 0.15)", border: "1px solid rgba(0, 180, 216, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                    <Icon size={20} color="#7dd3fc" />
                  </div>
                  <h3 style={{ fontSize: "16px", fontWeight: 800, color: "white", marginBottom: "8px" }}>{f.title}</h3>
                  <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SOFTWARE DESKTOP ── */}
      <section className="home-section" style={{ padding: "60px 32px", background: "linear-gradient(180deg, transparent 0%, rgba(0,30,60,0.15) 100%)" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "#007ABF", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "10px" }}>Software descargable</p>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 900, color: "white", letterSpacing: "-0.03em" }}>
              Tu ecosistema de <span style={{ color: "#7dd3fc" }}>automatización</span>
            </h2>
          </div>
          <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            {SOFTWARE.map((s, i) => (
              <div key={i} className="card-hover" style={{ background: "linear-gradient(160deg, #0a0a14 0%, #06060c 100%)", border: `1px solid ${s.color}30`, borderRadius: "20px", padding: "28px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "120px", height: "120px", borderRadius: "50%", background: `radial-gradient(circle, ${s.color}20, transparent 70%)`, pointerEvents: "none" }} />
                <div style={{ position: "relative" }}>
                  <p style={{ fontSize: "12px", fontWeight: 700, color: s.color, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>{s.name}</p>
                  <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: 1.6, marginBottom: "20px", minHeight: "66px" }}>{s.desc}</p>
                  <Link href={s.href} className="btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "10px 18px", borderRadius: "10px", color: "white", fontSize: "13px", fontWeight: 700, textDecoration: "none" }}>
                    <Cpu size={14} /> {s.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="home-section" style={{ padding: "60px 32px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "#007ABF", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "10px" }}>Operadores reales</p>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 900, color: "white", letterSpacing: "-0.03em" }}>
              Construido con quienes <span style={{ color: "#7dd3fc" }}>ya escalan</span>
            </h2>
          </div>
          <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            {TESTIMONIALS.map((t, i) => (
              <div key={i} style={{ background: "linear-gradient(160deg, #0a0a14 0%, #06060c 100%)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "28px" }}>
                <div style={{ display: "flex", gap: "2px", marginBottom: "16px" }}>
                  {[0, 1, 2, 3, 4].map((j) => (<Star key={j} size={14} fill="#fbbf24" color="#fbbf24" />))}
                </div>
                <p style={{ fontSize: "14px", color: "#cbd5e1", lineHeight: 1.7, marginBottom: "20px" }}>&ldquo;{t.text}&rdquo;</p>
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "14px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "white" }}>{t.name}</p>
                  <p style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <section className="home-section" style={{ padding: "80px 32px 100px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 50% 60% at 50% 80%, rgba(0, 122, 191, 0.08), transparent)", pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: "600px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 900, letterSpacing: "-0.045em", color: "white", marginBottom: "18px", lineHeight: 1.1 }}>
            Listo para escalar<br />tu operación?
          </h2>
          <p style={{ color: "#64748b", fontSize: "16px", marginBottom: "36px", lineHeight: 1.6 }}>
            Únete a los operadores que ya facturan vendiendo granjas y servicios SMM con TRUST MIND.
          </p>
          <div className="hero-cta" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
            <Link href="/chat" className="btn-primary" style={{ padding: "16px 28px", borderRadius: "14px", color: "white", fontSize: "15px", fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <MessageSquare size={16} /> Hablar con la IA
            </Link>
            <Link href="/granjas" className="btn-ghost" style={{ padding: "16px 28px", borderRadius: "14px", color: "white", fontSize: "15px", fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <Globe size={16} /> Ver granjas
            </Link>
          </div>
        </div>
      </section>

      <TrustFooter />
    </div>
  );
}
