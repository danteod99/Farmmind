"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamicImport from "next/dynamic";
import { supabase } from "@/app/lib/supabase";
import { ShoppingCart, X, Crown } from "lucide-react";
import { SmmNav } from "@/app/components/SmmNav";

const TrustFooter = dynamicImport(() => import("@/app/components/TrustFooter").then(m => ({ default: m.TrustFooter })), { ssr: false, loading: () => null });
const ExpressTab = dynamicImport(() => import("./_ExpressTab"), {
  ssr: false,
  loading: () => <div style={{ padding: 60, textAlign: "center", color: "#5a6480", fontSize: 13 }}>Cargando catálogo…</div>,
});

const PREMIUM_ACCOUNTS = [
  // ─── YOUTUBE ───────────────────────────────────────────────
  {
    id: "yt-monetized",
    title: "YouTube Monetizada",
    description: "Canal con +1,000 suscriptores y 4,000 horas de watch time. Lista para monetización AdSense.",
    price: 35,
    icon: "▶",
    color: "#ff4444",
    border: "#ff444430",
    bg: "#ff444412",
    badges: ["1K+ Subs", "4K Horas", "AdSense Ready"],
    whatsapp: "Hola, quiero comprar una Cuenta YouTube Monetizada ($35 USD)",
  },
  {
    id: "yt-10k",
    title: "YouTube 10K Suscriptores",
    description: "Canal establecido con 10,000 suscriptores reales y monetización activa. Niche variado disponible.",
    price: 85,
    icon: "▶",
    color: "#ff4444",
    border: "#ff444430",
    bg: "#ff444412",
    badges: ["10K Subs", "Monetizada", "Historial real"],
    whatsapp: "Hola, quiero comprar una Cuenta YouTube 10K Suscriptores ($85 USD)",
  },
  {
    id: "yt-20k",
    title: "YouTube 20K Suscriptores",
    description: "Canal consolidado con 20,000 suscriptores. Autoridad, engagement y monetización verificada.",
    price: 150,
    icon: "▶",
    color: "#ff4444",
    border: "#ff444430",
    bg: "#ff444412",
    badges: ["20K Subs", "Monetizada", "Alta autoridad"],
    whatsapp: "Hola, quiero comprar una Cuenta YouTube 20K Suscriptores ($150 USD)",
  },
  // ─── FACEBOOK ──────────────────────────────────────────────
  {
    id: "fb-account",
    title: "Facebook Aged",
    description: "Cuenta con historial real, foto y actividad. Ideal para ads, grupos y automatización.",
    price: 12,
    icon: "f",
    color: "#4f8ff7",
    border: "#4f8ff730",
    bg: "#4f8ff712",
    badges: ["Aged 2+ años", "Verificada", "Perfil completo"],
    whatsapp: "Hola, quiero comprar una Cuenta Facebook Aged ($12 USD)",
  },
  {
    id: "fb-friends-50",
    title: "Facebook 50-100 Amigos",
    description: "Perfil con 50 a 100 amigos reales, actividad orgánica y antigüedad. Lista para uso inmediato.",
    price: 8,
    icon: "f",
    color: "#4f8ff7",
    border: "#4f8ff730",
    bg: "#4f8ff712",
    badges: ["50-100 Amigos", "Actividad real", "Perfil activo"],
    whatsapp: "Hola, quiero comprar una Cuenta Facebook 50-100 Amigos ($8 USD)",
  },
  {
    id: "fb-page-10k",
    title: "Página Facebook 10K",
    description: "Página de Facebook con 10,000 seguidores reales. Ideal para marketing, ads y credibilidad de marca.",
    price: 40,
    icon: "f",
    color: "#4f8ff7",
    border: "#4f8ff730",
    bg: "#4f8ff712",
    badges: ["10K Seguidores", "Página verificable", "Lista para ads"],
    whatsapp: "Hola, quiero comprar una Página Facebook 10K ($40 USD)",
  },
  {
    id: "fb-page-20k",
    title: "Página Facebook 20K",
    description: "Página con 20,000 seguidores. Mayor alcance orgánico, credibilidad y potencial de monetización.",
    price: 70,
    icon: "f",
    color: "#4f8ff7",
    border: "#4f8ff730",
    bg: "#4f8ff712",
    badges: ["20K Seguidores", "Alta autoridad", "Monetizable"],
    whatsapp: "Hola, quiero comprar una Página Facebook 20K ($70 USD)",
  },
  {
    id: "fb-friends-500",
    title: "Facebook 500+ Amigos",
    description: "Perfil con más de 500 amigos reales, alta interacción y antigüedad. Ideal para marketing orgánico y grupos.",
    price: 25,
    icon: "f",
    color: "#4f8ff7",
    border: "#4f8ff730",
    bg: "#4f8ff712",
    badges: ["500+ Amigos", "Antigüedad real", "Alta interacción"],
    whatsapp: "Hola, quiero comprar una Cuenta Facebook 500+ Amigos ($25 USD)",
  },
  {
    id: "fb-page-50k",
    title: "Página Facebook 50K",
    description: "Página establecida con 50,000 seguidores reales. Máxima autoridad, alcance y potencial de monetización.",
    price: 150,
    icon: "f",
    color: "#4f8ff7",
    border: "#4f8ff730",
    bg: "#4f8ff712",
    badges: ["50K Seguidores", "Top autoridad", "Premium ad-ready"],
    whatsapp: "Hola, quiero comprar una Página Facebook 50K ($150 USD)",
  },
  {
    id: "fb-ads-manager",
    title: "Facebook Ads Manager",
    description: "Business Manager limpio con Ads Manager habilitado, métodos de pago y sin restricciones. Listo para campañas.",
    price: 30,
    icon: "f",
    color: "#4f8ff7",
    border: "#4f8ff730",
    bg: "#4f8ff712",
    badges: ["BM limpio", "Ads habilitado", "Sin restricciones"],
    whatsapp: "Hola, quiero comprar un Facebook Ads Manager ($30 USD)",
  },
  {
    id: "fb-bm-credit",
    title: "BM con Línea de Crédito",
    description: "Business Manager con línea de crédito aprobada de $250 spending power. Empieza a gastar de inmediato sin recargas.",
    price: 60,
    icon: "f",
    color: "#4f8ff7",
    border: "#4f8ff730",
    bg: "#4f8ff712",
    badges: ["Crédito $250", "Aprobado", "Sin pre-pago"],
    whatsapp: "Hola, quiero comprar un BM con Línea de Crédito ($60 USD)",
  },
  {
    id: "fb-bm-green",
    title: "BM Verde Verificado",
    description: "Business Manager con estatus 'green' verificado por Facebook. Mínimo riesgo de baneo, máxima estabilidad.",
    price: 80,
    icon: "f",
    color: "#4f8ff7",
    border: "#4f8ff730",
    bg: "#4f8ff712",
    badges: ["Status verde", "Verificado FB", "Anti-ban"],
    whatsapp: "Hola, quiero comprar un BM Verde Verificado ($80 USD)",
  },
  {
    id: "fb-bm-agency",
    title: "BM Agency Premium",
    description: "Cuenta de agencia con múltiples sub-perfiles, alto límite de gasto y soporte prioritario. Para escalar campañas grandes.",
    price: 120,
    icon: "f",
    color: "#4f8ff7",
    border: "#4f8ff730",
    bg: "#4f8ff712",
    badges: ["Multi-perfil", "Alto spend", "Premium"],
    whatsapp: "Hola, quiero comprar un BM Agency Premium ($120 USD)",
  },
  // ─── INSTAGRAM ─────────────────────────────────────────────
  {
    id: "ig-1k",
    title: "Instagram 1K Seguidores",
    description: "Cuenta con 1,000 seguidores reales y perfil activo. Perfecta para crecer rápido con bots.",
    price: 15,
    icon: "◎",
    color: "#f43f8e",
    border: "#f43f8e30",
    bg: "#f43f8e12",
    badges: ["1K Seguidores", "Perfil activo", "Engagement real"],
    whatsapp: "Hola, quiero comprar una Cuenta Instagram 1K Seguidores ($15 USD)",
  },
  {
    id: "ig-5k",
    title: "Instagram 5K Seguidores",
    description: "Cuenta establecida con 5,000 seguidores reales. Mayor credibilidad y alcance orgánico.",
    price: 35,
    icon: "◎",
    color: "#f43f8e",
    border: "#f43f8e30",
    bg: "#f43f8e12",
    badges: ["5K Seguidores", "Cuenta activa", "Alta calidad"],
    whatsapp: "Hola, quiero comprar una Cuenta Instagram 5K Seguidores ($35 USD)",
  },
  {
    id: "ig-10k",
    title: "Instagram 10K Seguidores",
    description: "Cuenta con 10,000 seguidores reales. Desbloquea el link en bio y mayor alcance.",
    price: 65,
    icon: "◎",
    color: "#f43f8e",
    border: "#f43f8e30",
    bg: "#f43f8e12",
    badges: ["10K Seguidores", "Link en bio", "Autoridad"],
    whatsapp: "Hola, quiero comprar una Cuenta Instagram 10K Seguidores ($65 USD)",
  },
  {
    id: "ig-20k",
    title: "Instagram 20K Seguidores",
    description: "Cuenta premium con 20,000 seguidores. Ideal para influencer marketing o reventa.",
    price: 110,
    icon: "◎",
    color: "#f43f8e",
    border: "#f43f8e30",
    bg: "#f43f8e12",
    badges: ["20K Seguidores", "Alta influencia", "Premium"],
    whatsapp: "Hola, quiero comprar una Cuenta Instagram 20K Seguidores ($110 USD)",
  },
  // ─── TIKTOK ────────────────────────────────────────────────
  {
    id: "tiktok-500",
    title: "TikTok 500+ Seguidores",
    description: "Cuenta con seguidores reales y engagement. Perfecta para bots o crecimiento rápido.",
    price: 18,
    icon: "♪",
    color: "#00e5ff",
    border: "#00e5ff30",
    bg: "#00e5ff12",
    badges: ["500+ Seguidores", "Engagement real", "Lista para usar"],
    whatsapp: "Hola, quiero comprar una Cuenta TikTok 500+ Seguidores ($18 USD)",
  },
  {
    id: "tiktok-5k",
    title: "TikTok 5K Seguidores",
    description: "Cuenta consolidada con 5,000 seguidores. Apta para live, enlaces y mayor alcance viral.",
    price: 35,
    icon: "♪",
    color: "#00e5ff",
    border: "#00e5ff30",
    bg: "#00e5ff12",
    badges: ["5K Seguidores", "Live habilitado", "Viral reach"],
    whatsapp: "Hola, quiero comprar una Cuenta TikTok 5K Seguidores ($35 USD)",
  },
  {
    id: "tiktok-10k",
    title: "TikTok 10K Seguidores",
    description: "Cuenta con 10,000 seguidores reales. Acceso a TikTok Creator Fund y link en bio.",
    price: 60,
    icon: "♪",
    color: "#00e5ff",
    border: "#00e5ff30",
    bg: "#00e5ff12",
    badges: ["10K Seguidores", "Creator Fund", "Link bio"],
    whatsapp: "Hola, quiero comprar una Cuenta TikTok 10K Seguidores ($60 USD)",
  },
  {
    id: "tiktok-20k",
    title: "TikTok 20K Seguidores",
    description: "Cuenta premium con 20,000 seguidores. Alta credibilidad, alcance masivo y monetizable.",
    price: 100,
    icon: "♪",
    color: "#00e5ff",
    border: "#00e5ff30",
    bg: "#00e5ff12",
    badges: ["20K Seguidores", "Alta autoridad", "Monetizable"],
    whatsapp: "Hola, quiero comprar una Cuenta TikTok 20K Seguidores ($100 USD)",
  },
];

export default function ServicesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [userName, setUserName] = useState("");
  const [userAvatar, setUserAvatar] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [accountModal, setAccountModal] = useState<typeof PREMIUM_ACCOUNTS[0] | null>(null);
  const [buyingAccount, setBuyingAccount] = useState(false);
  const [buySuccess, setBuySuccess] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"express" | "cuentas">("express");

  useEffect(() => { checkAuth(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Facebook Pixel: CompleteRegistration for new users
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("registered") === "1") {
      if ((window as /* eslint-disable-line @typescript-eslint/no-explicit-any */ any).fbq) {
        (window as any).fbq("track", "CompleteRegistration");
      }
      window.history.replaceState({}, "", "/smm/services");
    }
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }
    setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuario");
    setUserAvatar(user.user_metadata?.avatar_url || "");
    setUserEmail(user.email || "");
    await refreshBalance();
    setLoading(false);
  };

  const refreshBalance = async () => {
    try {
      const r = await fetch("/api/smm/balance");
      if (r.ok) {
        const d = await r.json();
        setBalance(d.balance || 0);
      }
    } catch { /* no-op */ }
  };

  const buyAccount = async () => {
    if (!accountModal) return;
    setBuyingAccount(true); setBuyError(null);
    try {
      const res = await fetch("/api/smm/buy-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: accountModal.id,
          accountTitle: accountModal.title,
          price: accountModal.price,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBuyError(data.error || "Error al procesar la compra");
      } else {
        setBuySuccess(true);
        setBalance((prev) => Math.max(0, prev - accountModal.price));
        setTimeout(() => {
          setAccountModal(null);
          setBuySuccess(false);
          setBuyError(null);
        }, 3000);
      }
    } catch {
      setBuyError("Error de conexión. Intenta de nuevo.");
    } finally {
      setBuyingAccount(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "#050508", flexDirection: "column", gap: "16px" }}>
        <div style={{ width: "40px", height: "40px", borderRadius: "50%", border: "2px solid rgba(0,122,191,0.15)", borderTopColor: "#007ABF", animation: "spin 0.7s linear infinite" }} />
        <p style={{ color: "#475569", fontSize: "13px", fontWeight: 500 }}>Cargando...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #050508; color: #f0efff; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
        a { text-decoration: none; color: inherit; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a42; border-radius: 99px; }

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 12px #007ABF40; }
          50% { box-shadow: 0 0 28px #007ABF80, 0 0 50px #007ABF25; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .nav-link:hover { color: #88D0F0 !important; background: #007ABF15 !important; }
        .premium-card { transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important; }
        .premium-card:hover { transform: translateY(-4px) !important; box-shadow: 0 16px 48px rgba(0,0,0,0.35) !important; }
        .whatsapp-btn:hover { background: #20bd5a !important; box-shadow: 0 4px 20px #25d36650 !important; }

        @media (max-width: 768px) {
          .svc-nav-links { display: none !important; }
          .svc-hero { padding: 40px 20px 32px !important; }
          .svc-hero h1 { font-size: 28px !important; }
          .svc-premium-grid { grid-template-columns: 1fr !important; }
          .svc-content { padding: 20px 16px !important; }
          nav { padding: 0 16px !important; }


            overflow-x: auto !important; flex-wrap: nowrap !important;
            max-width: 100% !important; -webkit-overflow-scrolling: touch;
            scrollbar-width: none; padding-bottom: 4px; width: 100%;
          }


            overflow-x: auto !important; flex-wrap: nowrap !important;
            -webkit-overflow-scrolling: touch; scrollbar-width: none;
            padding-bottom: 2px;
          }
        }
        @media (max-width: 480px) {
          .svc-hero h1 { font-size: 22px !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#050508" }}>

        {/* ━━━ NAVBAR ━━━ */}
        <SmmNav balance={balance} userAvatar={userAvatar} userName={userName} userEmail={userEmail} />

        {/* ━━━ SOFTWARE BANNER ━━━ */}
        <a href="/downloads" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "10px 20px", background: "linear-gradient(90deg, #E1306C, #8134AF, #4d7cff, #1877F2)", color: "white", fontSize: 13, fontWeight: 700, textDecoration: "none", letterSpacing: "0.3px", cursor: "pointer" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 10px", borderRadius: 6, background: "rgba(255,255,255,0.2)", fontSize: 11, fontWeight: 800 }}>NUEVO</span>
          <span>TrustInsta & TrustFace Desktop — Gestiona cientos de cuentas con anti-deteccion</span>
          <span style={{ fontSize: 16 }}>→</span>
          <span style={{ fontSize: 11, opacity: 0.8, textDecoration: "underline" }}>Descargar gratis</span>
        </a>

        {/* ━━━ HERO ━━━ */}
        <div className="svc-hero" style={{ position: "relative", overflow: "hidden", background: "#050508", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "48px 28px 40px" }}>
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <div style={{ position: "absolute", top: "-120px", right: "10%", width: "500px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, rgba(0,122,191,0.08) 0%, transparent 60%)", filter: "blur(80px)" }} />
          </div>
          <div style={{ maxWidth: "1200px", margin: "0 auto", position: "relative", zIndex: 1 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "5px 14px", borderRadius: "8px", background: "rgba(0,122,191,0.08)", marginBottom: "16px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34d399", boxShadow: "0 0 6px #34d399" }} />
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#7dd3fc", letterSpacing: "0.8px", textTransform: "uppercase" }}>Marketplace de cuentas</span>
            </div>
            <h1 style={{ fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 800, color: "white", letterSpacing: "-1.5px", lineHeight: "1.05", marginBottom: "14px" }}>
              Cuentas listas<br />
              <span style={{ background: "linear-gradient(135deg, #00B4D8 0%, #007ABF 50%, #0050A0 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                para tu granja
              </span>
            </h1>
            <p style={{ fontSize: "15px", color: "#7a8599", lineHeight: "1.7", maxWidth: "520px" }}>
              Cuentas express con entrega automática y cuentas premium verificadas. Se pagan con tu saldo.
            </p>
          </div>
        </div>

        {/* ━━━ MAIN CONTENT ━━━ */}
        <div className="svc-content" style={{ maxWidth: "1200px", margin: "0 auto", padding: "36px 24px" }}>

          {/* ── TABS ── */}
          <div style={{ display: "flex", gap: "4px", marginBottom: "32px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "5px" }}>
            {[
              { id: "express", label: "Cuentas Express", count: null as number | null },
              { id: "cuentas", label: "Cuentas Premium", count: PREMIUM_ACCOUNTS.length },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as "cuentas" | "express")}
                style={{ flex: 1, padding: "11px 20px", borderRadius: "12px", border: "none", background: activeTab === tab.id ? "rgba(255,255,255,0.08)" : "transparent", color: activeTab === tab.id ? "white" : "#5a6480", fontSize: "14px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: "none" }}>
                {tab.label}
                {tab.count !== null && (
                  <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "20px", background: activeTab === tab.id ? "#ffffff20" : "#1a1a2e", fontWeight: 600 }}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {activeTab === "express" && (
            <ExpressTab balance={balance} onRefreshBalance={refreshBalance} />
          )}

          {/* ━━━ CUENTAS PREMIUM TAB ━━━ */}
          {activeTab === "cuentas" && <section style={{ marginBottom: "52px" }}>
            {/* Section header */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "24px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "linear-gradient(135deg, #f59e0b, #d97706)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px #f59e0b50", flexShrink: 0 }}>
                <Crown size={18} color="white" />
              </div>
              <div>
                <h2 style={{ fontSize: "24px", fontWeight: 800, color: "white", letterSpacing: "-0.5px", lineHeight: "1.1" }}>Cuentas Premium</h2>
                <p style={{ fontSize: "12px", color: "#5a6480", marginTop: "2px", fontWeight: 500 }}>Cuentas verificadas listas para usar — entrega en menos de 24h</p>
              </div>
              <span style={{ marginLeft: "6px", fontSize: "10px", color: "#f59e0b", background: "linear-gradient(135deg, #f59e0b18, transparent)", border: "1px solid #f59e0b40", padding: "5px 12px", borderRadius: "20px", fontWeight: 800, letterSpacing: "0.8px", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                ✦ Exclusivo
              </span>
            </div>

            <div className="svc-premium-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))", gap: "20px" }}>
              {PREMIUM_ACCOUNTS.map((acc) => (
                <div key={acc.id} className="premium-card"
                  style={{ background: "#0d0d18", border: `1px solid ${acc.border}`, borderRadius: "22px", overflow: "hidden", cursor: "pointer" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = acc.color;
                    (e.currentTarget as HTMLDivElement).style.boxShadow = `0 12px 40px ${acc.color}25, 0 0 0 1px ${acc.color}20`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = acc.border;
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                  }}>

                  {/* Card header band */}
                  <div style={{ position: "relative", overflow: "hidden", padding: "22px 22px 18px", background: `linear-gradient(135deg, ${acc.color}18 0%, ${acc.color}06 100%)`, borderBottom: `1px solid ${acc.border}` }}>
                    <div style={{ position: "absolute", top: "-30px", right: "-30px", width: "120px", height: "120px", borderRadius: "50%", background: `radial-gradient(circle, ${acc.color}35 0%, transparent 70%)`, filter: "blur(20px)" }} />
                    <div style={{ position: "absolute", bottom: "-20px", left: "40%", width: "80px", height: "80px", borderRadius: "50%", background: `radial-gradient(circle, ${acc.color}20 0%, transparent 70%)`, filter: "blur(16px)" }} />

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", zIndex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        <div style={{ width: "52px", height: "52px", borderRadius: "16px", background: `linear-gradient(135deg, ${acc.color}35, ${acc.color}18)`, border: `1.5px solid ${acc.color}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", boxShadow: `0 4px 20px ${acc.color}25` }}>
                          {acc.icon}
                        </div>
                        <div>
                          <p style={{ fontSize: "15px", fontWeight: 800, color: "white", letterSpacing: "-0.3px", lineHeight: "1.2" }}>{acc.title}</p>
                          <p style={{ fontSize: "11px", color: `${acc.color}cc`, fontWeight: 600, marginTop: "2px" }}>Cuenta verificada</p>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: "28px", fontWeight: 800, color: acc.color, letterSpacing: "-0.5px", lineHeight: "1", textShadow: `0 0 20px ${acc.color}50` }}>${acc.price}</p>
                        <p style={{ fontSize: "10px", color: "#5a6480", fontWeight: 500, marginTop: "2px" }}>USD</p>
                      </div>
                    </div>
                  </div>

                  {/* Card body */}
                  <div style={{ padding: "18px 22px" }}>
                    <p style={{ fontSize: "13px", color: "#8892a4", lineHeight: "1.65", marginBottom: "16px" }}>{acc.description}</p>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "18px" }}>
                      {acc.badges.map((badge) => (
                        <span key={badge} style={{ fontSize: "11px", fontWeight: 700, color: acc.color, background: `${acc.color}14`, border: `1px solid ${acc.color}35`, padding: "4px 10px", borderRadius: "8px" }}>
                          ✓ {badge}
                        </span>
                      ))}
                    </div>

                    <button onClick={() => { setAccountModal(acc); setBuySuccess(false); setBuyError(null); }} className="buy-btn"
                      style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "none", background: `linear-gradient(135deg, ${acc.color}, ${acc.color}cc)`, color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: `0 4px 20px ${acc.color}40`, transition: "all 0.15s", fontFamily: "inherit" }}>
                      <ShoppingCart size={15} /> Comprar ahora — ${acc.price} USD
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>}
        </div>
      </div>

      {/* ━━━ ACCOUNT MODAL ━━━ */}
      {/* ━━━ ACCOUNT MODAL ━━━ */}
      {accountModal && (
        <div style={{ position: "fixed", inset: 0, background: "#00000095", backdropFilter: "blur(8px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ background: "#0d0d18", border: `1px solid ${accountModal.border}`, borderRadius: "24px", width: "100%", maxWidth: "440px", overflow: "hidden", boxShadow: `0 24px 80px #00000080, 0 0 40px ${accountModal.color}15` }}>

            {/* Modal header */}
            <div style={{ position: "relative", overflow: "hidden", padding: "24px", background: `linear-gradient(135deg, ${accountModal.color}18 0%, ${accountModal.color}06 100%)`, borderBottom: `1px solid ${accountModal.border}` }}>
              <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "150px", height: "150px", borderRadius: "50%", background: `radial-gradient(circle, ${accountModal.color}35, transparent)`, filter: "blur(25px)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div style={{ width: "54px", height: "54px", borderRadius: "16px", background: `linear-gradient(135deg, ${accountModal.color}35, ${accountModal.color}18)`, border: `1.5px solid ${accountModal.color}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>
                    {accountModal.icon}
                  </div>
                  <div>
                    <h3 style={{ fontSize: "17px", fontWeight: 800, color: "white", letterSpacing: "-0.3px" }}>{accountModal.title}</h3>
                    <p style={{ fontSize: "22px", fontWeight: 800, color: accountModal.color, marginTop: "2px", textShadow: `0 0 20px ${accountModal.color}50` }}>${accountModal.price} USD</p>
                  </div>
                </div>
                <button onClick={() => setAccountModal(null)} style={{ background: "#07070e", border: `1px solid ${accountModal.border}`, color: "#64748b", cursor: "pointer", borderRadius: "8px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <X size={16} />
                </button>
              </div>
            </div>

            <div style={{ padding: "22px 24px" }}>
              <p style={{ fontSize: "14px", color: "#8892a4", lineHeight: "1.65", marginBottom: "16px" }}>{accountModal.description}</p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "7px", marginBottom: "20px" }}>
                {accountModal.badges.map((badge) => (
                  <span key={badge} style={{ fontSize: "12px", fontWeight: 700, color: accountModal.color, background: `${accountModal.color}14`, border: `1px solid ${accountModal.color}35`, padding: "5px 12px", borderRadius: "8px" }}>
                    ✓ {badge}
                  </span>
                ))}
              </div>

              {/* Balance + cost */}
              <div style={{ background: "#07070e", borderRadius: "12px", padding: "14px 16px", marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "13px", color: "#8892a4" }}>Precio</span>
                  <span style={{ fontSize: "15px", fontWeight: 800, color: accountModal.color }}>${accountModal.price} USD</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "13px", color: "#8892a4" }}>Tu saldo</span>
                  <span style={{ fontSize: "15px", fontWeight: 700, color: balance >= accountModal.price ? "#34d399" : "#f87171" }}>${balance.toFixed(2)} USD</span>
                </div>
                {balance < accountModal.price && (
                  <div style={{ marginTop: "10px", padding: "8px 12px", borderRadius: "8px", background: "#f8717110", border: "1px solid #f8717130", fontSize: "12px", color: "#f87171" }}>
                    ⚠️ Saldo insuficiente. Necesitas ${(accountModal.price - balance).toFixed(2)} más.{" "}
                    <Link href="/smm/funds" style={{ color: "#f87171", fontWeight: 700 }}>Recargar →</Link>
                  </div>
                )}
              </div>

              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "13px 16px", marginBottom: "18px" }}>
                <p style={{ fontSize: "12px", color: "#56B4E0", fontWeight: 700, marginBottom: "4px" }}>⏱️ Tiempo de entrega: 3 a 12 horas</p>
                <p style={{ fontSize: "12px", color: "#8892a4", lineHeight: "1.6" }}>
                  El pago se descuenta de tu saldo inmediatamente. Recibirás los accesos por email o vía soporte en un plazo de 3 a 12 horas.
                </p>
              </div>

              {buyError && (
                <div style={{ background: "#f8717115", border: "1px solid #f8717140", borderRadius: "10px", padding: "10px 14px", marginBottom: "12px", fontSize: "13px", color: "#f87171" }}>
                  {buyError}
                </div>
              )}
              {buySuccess && (
                <div style={{ background: "#34d39915", border: "1px solid #34d39940", borderRadius: "10px", padding: "10px 14px", marginBottom: "12px", fontSize: "13px", color: "#34d399", display: "flex", alignItems: "center", gap: "8px" }}>
                  ✅ ¡Compra realizada! Recibirás los accesos en 3 a 12 horas por email o soporte.
                </div>
              )}

              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => { setAccountModal(null); setBuySuccess(false); setBuyError(null); }}
                  style={{ flex: 1, padding: "13px", borderRadius: "12px", border: "1px solid #2a2a42", background: "transparent", color: "#8892a4", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  Cancelar
                </button>
                <button onClick={buyAccount}
                  disabled={buyingAccount || balance < accountModal.price || buySuccess}
                  style={{ flex: 2, padding: "13px", borderRadius: "12px", border: "none", background: buySuccess ? "#34d39920" : (balance >= accountModal.price ? `linear-gradient(135deg, ${accountModal.color}, ${accountModal.color}cc)` : "#1a1a2e"), color: buySuccess ? "#34d399" : (balance >= accountModal.price ? "white" : "#5a6480"), fontSize: "14px", fontWeight: 700, cursor: buyingAccount || balance < accountModal.price ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontFamily: "inherit", boxShadow: balance >= accountModal.price && !buySuccess ? `0 4px 20px ${accountModal.color}40` : "none" }}>
                  {buyingAccount
                    ? <><div style={{ width: "14px", height: "14px", borderRadius: "50%", border: "2px solid #ffffff50", borderTopColor: "white", animation: "spin 0.6s linear infinite" }} /> Procesando...</>
                    : buySuccess ? "✓ Comprado" : <><ShoppingCart size={15} /> Confirmar compra — ${accountModal.price}</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <TrustFooter />
    </>
  );
}
