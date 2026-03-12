"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import {
  Search, LogOut, ShoppingCart, ChevronDown, X, Zap, CheckCircle,
  DollarSign, Users, ArrowLeft, Package, MessageCircle, Crown
} from "lucide-react";
import { FarmMindLogo } from "@/app/components/FarmMindLogo";

interface Service {
  service: number;
  name: string;
  type: string;
  category: string;
  rate: string;
  min: string;
  max: string;
  dripfeed?: boolean;
  refill?: boolean;
  cancel?: boolean;
}

interface OrderModal {
  service: Service;
  link: string;
  quantity: number;
}

const POPULAR_CATEGORIES = ["Instagram", "TikTok", "YouTube", "Twitter", "Facebook", "Telegram", "Spotify"];
const FEATURED_CATEGORIES = ["Instagram", "TikTok", "YouTube"];

const PLATFORM_COLORS: Record<string, { color: string; glow: string; label: string }> = {
  Instagram: { color: "#f43f8e", glow: "#f43f8e40", label: "Instagram" },
  TikTok:    { color: "#00e5ff", glow: "#00e5ff40", label: "TikTok" },
  YouTube:   { color: "#ff4444", glow: "#ff444440", label: "YouTube" },
  Facebook:  { color: "#4f8ff7", glow: "#4f8ff740", label: "Facebook" },
  Twitter:   { color: "#1d9bf0", glow: "#1d9bf040", label: "Twitter" },
  Telegram:  { color: "#3dabdb", glow: "#3dabdb40", label: "Telegram" },
  Spotify:   { color: "#1db954", glow: "#1db95440", label: "Spotify" },
};

const PREMIUM_ACCOUNTS = [
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
    id: "tiktok-account",
    title: "TikTok con Seguidores",
    description: "Cuenta con seguidores reales y engagement. Perfecta para bots o crecimiento rápido.",
    price: 18,
    icon: "♪",
    color: "#00e5ff",
    border: "#00e5ff30",
    bg: "#00e5ff12",
    badges: ["500+ Seguidores", "Engagement real", "Lista para usar"],
    whatsapp: "Hola, quiero comprar una Cuenta TikTok con Seguidores ($18 USD)",
  },
];

function getPlatformColor(category: string): string {
  for (const [key, val] of Object.entries(PLATFORM_COLORS)) {
    if (category.toLowerCase().includes(key.toLowerCase())) return val.color;
  }
  return "#007ABF";
}

export default function ServicesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [balance, setBalance] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [modal, setModal] = useState<OrderModal | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [showAllJAP, setShowAllJAP] = useState(false);
  const [accountModal, setAccountModal] = useState<typeof PREMIUM_ACCOUNTS[0] | null>(null);
  const [buyingAccount, setBuyingAccount] = useState(false);
  const [buySuccess, setBuySuccess] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"services" | "cuentas">("services");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => { checkAuth(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Close suggestions when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }
    fetchData(user.id);
  };

  const fetchData = async (userId: string) => {
    try {
      const [servRes, ordRes] = await Promise.all([
        fetch("/api/smm/services"),
        fetch("/api/smm/orders"),
      ]);
      if (servRes.ok) {
        const data = await servRes.json();
        const list = Array.isArray(data) ? data : (Array.isArray(data.services) ? data.services : []);
        setServices(list);
      }
      if (ordRes.ok) {
        const data = await ordRes.json();
        setBalance(data.balance || 0);
      }
      void userId;
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set(services.map((s) => s.category));
    return ["all", ...Array.from(cats).sort()];
  }, [services]);

  const filtered = useMemo(() => {
    let list = services.filter((s) => {
      // Fix: use contains match so "Instagram" pill matches "Instagram - Followers", etc.
      const matchCat = selectedCategory === "all" || s.category.toLowerCase().includes(selectedCategory.toLowerCase());
      const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
    if (!search && selectedCategory === "all" && !showAllJAP) {
      const featured: Service[] = [];
      for (const cat of FEATURED_CATEGORIES) {
        const catServices = list.filter((s) => s.category.toLowerCase().includes(cat.toLowerCase()));
        if (catServices.length > 0) featured.push(...catServices.slice(0, 3));
        if (featured.length >= 10) break;
      }
      return featured.slice(0, 10);
    }
    return list;
  }, [services, selectedCategory, search, showAllJAP]);

  // Search suggestions: top 8 matching service names
  const suggestions = useMemo(() => {
    if (!search || search.length < 2) return [];
    const q = search.toLowerCase();
    return services
      .filter((s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q))
      .slice(0, 8);
  }, [services, search]);

  const openModal = (service: Service) => {
    setOrderError(null); setOrderSuccess(null);
    setModal({ service, link: "", quantity: parseInt(service.min) || 100 });
  };

  const placeOrder = async () => {
    if (!modal) return;
    if (!modal.link.trim()) { setOrderError("Ingresa el enlace del perfil/publicación"); return; }
    if (modal.quantity < parseInt(modal.service.min) || modal.quantity > parseInt(modal.service.max)) {
      setOrderError(`La cantidad debe estar entre ${modal.service.min} y ${modal.service.max}`);
      return;
    }
    setPlacing(true); setOrderError(null);
    try {
      const res = await fetch("/api/smm/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: modal.service.service,
          serviceName: modal.service.name,
          category: modal.service.category,
          link: modal.link,
          quantity: modal.quantity,
          rate: modal.service.rate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOrderError(data.error || "Error al procesar el pedido");
      } else {
        setOrderSuccess(`¡Pedido #${data.japOrderId} creado exitosamente!`);
        setBalance((prev) => Math.max(0, prev - (parseFloat(modal.service.rate) / 1000) * modal.quantity));
        setTimeout(() => { setModal(null); setOrderSuccess(null); }, 2000);
      }
    } catch {
      setOrderError("Error de conexión. Intenta de nuevo.");
    } finally {
      setPlacing(false);
    }
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

  const calcCost = (service: Service, qty: number) =>
    ((parseFloat(service.rate) / 1000) * qty).toFixed(4);

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "#07070e", flexDirection: "column", gap: "16px" }}>
        <div style={{ width: "48px", height: "48px", borderRadius: "50%", border: "3px solid #007ABF30", borderTopColor: "#007ABF", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "#5a6480", fontSize: "13px", fontWeight: 500 }}>Cargando catálogo...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #07070e; color: #f0efff; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
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
        .cat-pill { transition: all 0.15s ease; cursor: pointer; }
        .cat-pill:hover { transform: scale(1.05); }
        .premium-card { transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease !important; }
        .premium-card:hover { transform: translateY(-5px) !important; }
        .service-card { transition: all 0.15s ease !important; }
        .service-card:hover { background: #000C18 !important; border-color: #007ABF !important; transform: translateY(-2px); box-shadow: 0 8px 30px #007ABF20 !important; }
        .order-btn:hover { background: linear-gradient(135deg, #1E90D4, #007ABF) !important; transform: scale(1.03) !important; box-shadow: 0 0 20px #007ABF60 !important; }
        .search-input:focus { border-color: #007ABF70 !important; box-shadow: 0 0 0 3px #007ABF15 !important; }
        .toggle-btn:hover { border-color: #007ABF !important; background: #007ABF18 !important; }
        .whatsapp-btn:hover { background: #20bd5a !important; box-shadow: 0 4px 20px #25d36650 !important; }

        @media (max-width: 768px) {
          .svc-nav-links { display: none !important; }
          .svc-hero { padding: 40px 20px 32px !important; }
          .svc-hero h1 { font-size: 28px !important; }
          .svc-cat-pills { gap: 6px !important; flex-wrap: wrap; }
          .svc-grid { grid-template-columns: 1fr !important; }
          .svc-premium-grid { grid-template-columns: 1fr !important; }
          .svc-content { padding: 20px 16px !important; }
          nav { padding: 0 16px !important; }
        }
        @media (max-width: 480px) {
          .svc-hero h1 { font-size: 22px !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#07070e" }}>

        {/* ━━━ NAVBAR ━━━ */}
        <nav style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "rgba(7,7,14,0.85)", backdropFilter: "blur(20px)",
          borderBottom: "1px solid #1a1a2e",
          padding: "0 28px", height: "64px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <Link href="/" style={{ display: "flex", alignItems: "center" }}>
              <div style={{ position: "relative", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ position: "absolute", inset: "-4px", borderRadius: "50%", background: "radial-gradient(circle, #007ABF55, transparent 70%)", filter: "blur(6px)" }} />
                <FarmMindLogo size={34} />
              </div>
            </Link>

            <div style={{ width: "1px", height: "22px", background: "#1e1e30" }} />

            <div className="svc-nav-links" style={{ display: "flex", gap: "2px" }}>
              {[
                { href: "/smm", label: "Dashboard" },
                { href: "/smm/services", label: "Servicios", active: true },
                { href: "/smm/orders", label: "Pedidos" },
                { href: "/smm/funds", label: "Recargar" },
              ].map((item) => (
                <Link key={item.href} href={item.href} className="nav-link"
                  style={{
                    padding: "6px 14px", borderRadius: "8px", fontSize: "13px", transition: "all 0.15s",
                    fontWeight: item.active ? 700 : 500,
                    color: item.active ? "#88D0F0" : "#5a6480",
                    background: item.active ? "#007ABF20" : "transparent",
                    border: `1px solid ${item.active ? "#007ABF40" : "transparent"}`,
                  }}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ padding: "7px 14px", borderRadius: "10px", background: "#34d39912", border: "1px solid #34d39935", display: "flex", alignItems: "center", gap: "7px" }}>
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#34d399", boxShadow: "0 0 8px #34d399" }} />
              <span style={{ fontSize: "13px", color: "#34d399", fontWeight: 700 }}>${balance.toFixed(2)} USD</span>
            </div>
            <button
              onClick={async () => { await supabase.auth.signOut(); router.push("/"); }}
              style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#1a1a2e", border: "1px solid #1e1e30", color: "#5a6480", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
              <LogOut size={14} />
            </button>
          </div>
        </nav>

        {/* ━━━ HERO BANNER ━━━ */}
        <div className="svc-hero" style={{
          position: "relative", overflow: "hidden",
          background: "linear-gradient(160deg, #000C18 0%, #001530 35%, #000A14 65%, #07070e 100%)",
          borderBottom: "1px solid #002860",
          padding: "52px 28px 44px",
        }}>
          {/* Decorative background orbs */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <div style={{ position: "absolute", top: "-100px", right: "-60px", width: "420px", height: "420px", borderRadius: "50%", background: "radial-gradient(circle, #007ABF55 0%, transparent 65%)", filter: "blur(60px)" }} />
            <div style={{ position: "absolute", bottom: "-80px", left: "25%", width: "280px", height: "280px", borderRadius: "50%", background: "radial-gradient(circle, #a855f730 0%, transparent 70%)", filter: "blur(50px)" }} />
            <div style={{ position: "absolute", top: "30px", left: "10%", width: "160px", height: "160px", borderRadius: "50%", background: "radial-gradient(circle, #005F9620 0%, transparent 70%)", filter: "blur(40px)" }} />
            {/* Grid lines */}
            <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(#007ABF08 1px, transparent 1px), linear-gradient(90deg, #007ABF08 1px, transparent 1px)", backgroundSize: "60px 60px", maskImage: "radial-gradient(ellipse 80% 100% at 50% 0%, black 40%, transparent 100%)" }} />
          </div>

          <div style={{ maxWidth: "1200px", margin: "0 auto", position: "relative", zIndex: 1 }}>
            {/* Back link */}
            <Link href="/smm" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#1E90D4", fontWeight: 600, marginBottom: "20px", padding: "5px 12px", borderRadius: "8px", background: "#007ABF18", border: "1px solid #007ABF30" }}>
              <ArrowLeft size={12} /> Dashboard
            </Link>

            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "24px" }}>
              <div>
                {/* Tag */}
                <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "5px 14px", borderRadius: "20px", background: "linear-gradient(135deg, #007ABF25, #a855f715)", border: "1px solid #007ABF50", marginBottom: "16px" }}>
                  <Zap size={11} color="#56B4E0" />
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#56B4E0", letterSpacing: "0.8px", textTransform: "uppercase" }}>Catálogo SMM</span>
                </div>

                {/* Heading */}
                <h1 style={{ fontSize: "48px", fontWeight: 800, color: "white", letterSpacing: "-1.5px", lineHeight: "1.02", marginBottom: "14px" }}>
                  Impulsa tus<br />
                  <span style={{ background: "linear-gradient(90deg, #e9d5ff 0%, #a855f7 40%, #007ABF 80%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                    redes sociales.
                  </span>
                </h1>

                <p style={{ fontSize: "15px", color: "#8892a4", lineHeight: "1.7", maxWidth: "520px" }}>
                  {services.length > 0 ? (
                    <><strong style={{ color: "#88D0F0" }}>{services.length.toLocaleString()} servicios SMM</strong> + cuentas premium exclusivas. Entrega rápida garantizada.</>
                  ) : "Catálogo completo de servicios SMM. Entrega rápida garantizada."}
                </p>
              </div>

              {/* Platform filter pills */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", maxWidth: "420px" }}>
                {[{ name: "all", label: "✦ Todos", color: "#007ABF", glow: "#007ABF" }, ...POPULAR_CATEGORIES.map((c) => ({ name: c, label: c, color: PLATFORM_COLORS[c].color, glow: PLATFORM_COLORS[c].glow }))].map((cat) => {
                  const active = selectedCategory === cat.name;
                  return (
                    <button key={cat.name} onClick={() => setSelectedCategory(active && cat.name !== "all" ? "all" : cat.name)}
                      className="cat-pill"
                      style={{
                        padding: "7px 16px", borderRadius: "20px", fontSize: "12px", fontWeight: 700, border: "1px solid",
                        borderColor: active ? cat.color : "#2a2a42",
                        background: active ? `${cat.color}22` : "#0d0d1880",
                        color: active ? cat.color : "#64748b",
                        boxShadow: active ? `0 0 14px ${cat.glow || cat.color}50` : "none",
                      }}>
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ━━━ MAIN CONTENT ━━━ */}
        <div className="svc-content" style={{ maxWidth: "1200px", margin: "0 auto", padding: "36px 24px" }}>

          {/* ── TABS ── */}
          <div style={{ display: "flex", gap: "4px", marginBottom: "32px", background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: "16px", padding: "5px" }}>
            {[
              { id: "services", label: "⚡ Servicios SMM", count: services.length },
              { id: "cuentas", label: "👑 Cuentas Premium", count: PREMIUM_ACCOUNTS.length },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as "services" | "cuentas")}
                style={{ flex: 1, padding: "11px 20px", borderRadius: "12px", border: "none", background: activeTab === tab.id ? "linear-gradient(135deg, #007ABF, #005F96)" : "transparent", color: activeTab === tab.id ? "white" : "#5a6480", fontSize: "14px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: activeTab === tab.id ? "0 4px 20px #007ABF40" : "none" }}>
                {tab.label}
                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "20px", background: activeTab === tab.id ? "#ffffff20" : "#1a1a2e", fontWeight: 600 }}>
                  {tab.id === "services" ? services.length.toLocaleString() : tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* ── SEARCH BAR (only for services tab) ── */}
          {activeTab === "services" && (
            <div style={{ display: "flex", gap: "12px", marginBottom: "32px" }}>
              <div ref={searchRef} style={{ flex: 1, position: "relative" }}>
                <Search size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#5a6480", zIndex: 1 }} />
                <input
                  className="search-input"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setShowSuggestions(true);
                    if (e.target.value.trim()) { setSelectedCategory("all"); setShowAllJAP(true); }
                    else { setShowAllJAP(false); }
                  }}
                  onFocus={() => { if (search.length >= 2) setShowSuggestions(true); }}
                  placeholder="Buscar servicios... ej: Instagram followers, TikTok likes"
                  style={{ width: "100%", background: "#0d0d18", border: `1px solid ${showSuggestions && suggestions.length > 0 ? "#007ABF50" : "#1e1e30"}`, borderRadius: showSuggestions && suggestions.length > 0 ? "14px 14px 0 0" : "14px", padding: "13px 40px 13px 44px", color: "white", fontSize: "14px", outline: "none", transition: "all 0.15s", fontFamily: "inherit" }}
                />
                {search && (
                  <button onClick={() => { setSearch(""); setShowSuggestions(false); setShowAllJAP(false); setSelectedCategory("all"); }}
                    style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#5a6480", cursor: "pointer", padding: "4px", display: "flex" }}>
                    <X size={14} />
                  </button>
                )}
                {/* ── SUGGESTIONS DROPDOWN ── */}
                {showSuggestions && suggestions.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#0d0d18", border: "1px solid #007ABF50", borderTop: "none", borderRadius: "0 0 14px 14px", zIndex: 50, overflow: "hidden", boxShadow: "0 16px 40px #00000060" }}>
                    {suggestions.map((svc, i) => {
                      const color = getPlatformColor(svc.category);
                      return (
                        <button key={svc.service}
                          onClick={() => {
                            setSearch(svc.name);
                            setShowSuggestions(false);
                            setShowAllJAP(true);
                            openModal(svc);
                          }}
                          style={{ width: "100%", padding: "11px 16px", background: "transparent", border: "none", borderBottom: i < suggestions.length - 1 ? "1px solid #1a1a2e" : "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", fontFamily: "inherit", textAlign: "left" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#141428"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                            <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: `${color}18`, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <Search size={11} color={color} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: "13px", color: "white", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{svc.name}</p>
                              <p style={{ fontSize: "11px", color: color, marginTop: "1px" }}>{svc.category}</p>
                            </div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <p style={{ fontSize: "13px", color: "#34d399", fontWeight: 700 }}>${parseFloat(svc.rate).toFixed(4)}<span style={{ fontSize: "9px", color: "#5a6480" }}>/1K</span></p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div style={{ position: "relative" }}>
                <select value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setSearch(""); setShowSuggestions(false); }}
                  style={{ appearance: "none", background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: "14px", padding: "13px 44px 13px 16px", color: selectedCategory === "all" ? "#5a6480" : "white", fontSize: "14px", cursor: "pointer", outline: "none", minWidth: "220px", fontFamily: "inherit" }}>
                  <option value="all">Todas las categorías</option>
                  {["Instagram", "TikTok", "YouTube", "Facebook", "Twitter", "Telegram", "Spotify", "Discord", "Twitch", "Kick", "Pinterest", "LinkedIn", "Snapchat"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown size={14} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", color: "#5a6480", pointerEvents: "none" }} />
              </div>
            </div>
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

          {/* ━━━ SERVICIOS JAP ━━━ */}
          {activeTab === "services" && <section>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "linear-gradient(135deg, #007ABF, #005F96)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px #007ABF50", animation: "pulse-glow 3s ease infinite", flexShrink: 0 }}>
                  <Zap size={18} color="white" />
                </div>
                <div>
                  <h2 style={{ fontSize: "24px", fontWeight: 800, color: "white", letterSpacing: "-0.5px", lineHeight: "1.1" }}>Servicios SMM</h2>
                  <p style={{ fontSize: "12px", color: "#5a6480", marginTop: "2px", fontWeight: 500 }}>
                    {!search && selectedCategory === "all"
                      ? (showAllJAP ? `${services.length.toLocaleString()} servicios disponibles` : "Top 10 destacados")
                      : `${filtered.length} resultado${filtered.length !== 1 ? "s" : ""}`}
                  </p>
                </div>
              </div>

              {!search && selectedCategory === "all" && (
                <button onClick={() => setShowAllJAP(!showAllJAP)} className="toggle-btn"
                  style={{ padding: "9px 18px", borderRadius: "10px", border: "1px solid #2a2a42", background: "transparent", color: "#56B4E0", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "7px", transition: "all 0.15s", fontFamily: "inherit" }}>
                  <ChevronDown size={13} style={{ transform: showAllJAP ? "rotate(180deg)" : "none", transition: "transform 0.25s" }} />
                  {showAllJAP ? "Ver menos" : `Ver todos (${services.length.toLocaleString()})`}
                </button>
              )}
            </div>

            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 40px", color: "#5a6480", background: "#0d0d18", borderRadius: "20px", border: "1px solid #1e1e30" }}>
                <Package size={40} style={{ margin: "0 auto 16px", opacity: 0.4 }} />
                <p style={{ fontSize: "16px", marginBottom: "8px", color: "#94a3b8", fontWeight: 600 }}>No hay servicios que coincidan</p>
                <p style={{ fontSize: "13px" }}>Prueba con otro término o categoría</p>
              </div>
            ) : (
              <div className="svc-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
                {filtered.map((service) => {
                  const cost1k = parseFloat(service.rate);
                  const platformColor = getPlatformColor(service.category);

                  return (
                    <div key={service.service} className="service-card"
                      style={{ background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: "18px", overflow: "hidden", borderLeft: `3px solid ${platformColor}` }}>

                      <div style={{ padding: "18px 18px 14px" }}>
                        {/* Top row */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "11px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 700, color: platformColor, background: `${platformColor}18`, padding: "4px 10px", borderRadius: "7px", letterSpacing: "0.2px" }}>
                            {service.category}
                          </span>
                          <div style={{ display: "flex", gap: "4px" }}>
                            {service.refill && <span style={{ fontSize: "10px", color: "#34d399", background: "#34d39914", border: "1px solid #34d39930", padding: "2px 8px", borderRadius: "5px", fontWeight: 700 }}>↻ Refill</span>}
                            {service.dripfeed && <span style={{ fontSize: "10px", color: "#60a5fa", background: "#60a5fa14", border: "1px solid #60a5fa30", padding: "2px 8px", borderRadius: "5px", fontWeight: 700 }}>⏱ Drip</span>}
                          </div>
                        </div>

                        {/* Service name */}
                        <p style={{ fontSize: "13px", fontWeight: 600, color: "#dde3ef", lineHeight: "1.5", marginBottom: "16px" }}>
                          <span style={{ color: "#3d3d5c", fontSize: "11px", fontWeight: 500 }}>#{service.service} </span>
                          {service.name}
                        </p>

                        {/* Stats */}
                        <div style={{ display: "flex", gap: "20px", marginBottom: "2px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                            <DollarSign size={12} color="#34d399" />
                            <span style={{ fontSize: "14px", color: "#34d399", fontWeight: 800, textShadow: "0 0 12px #34d39950" }}>${cost1k.toFixed(4)}</span>
                            <span style={{ fontSize: "10px", color: "#3d4a5c" }}>/ 1K</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                            <Users size={11} color="#5a6480" />
                            <span style={{ fontSize: "12px", color: "#5a6480" }}>{parseInt(service.min).toLocaleString()} – {parseInt(service.max).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card footer */}
                      <div style={{ padding: "10px 18px 14px", borderTop: "1px solid #141424", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "11px", color: "#3d4a5c", fontWeight: 500 }}>{service.type}</span>
                        <button onClick={() => openModal(service)} className="order-btn"
                          style={{ background: "linear-gradient(135deg, #007ABF, #005F96)", border: "none", borderRadius: "9px", padding: "8px 18px", color: "white", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 0 14px #007ABF35", transition: "all 0.15s", fontFamily: "inherit" }}>
                          <ShoppingCart size={12} /> Ordenar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>}
        </div>
      </div>

      {/* ━━━ ORDER MODAL ━━━ */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "#00000095", backdropFilter: "blur(8px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ background: "#0d0d18", border: "1px solid #2a2a42", borderRadius: "24px", width: "100%", maxWidth: "480px", padding: "28px", boxShadow: "0 24px 80px #00000080" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <p style={{ fontSize: "11px", color: getPlatformColor(modal.service.category), fontWeight: 700, marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{modal.service.category}</p>
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "white", lineHeight: "1.4", maxWidth: "360px" }}>{modal.service.name}</h3>
              </div>
              <button onClick={() => setModal(null)} style={{ background: "#1a1a2e", border: "1px solid #2a2a42", color: "#64748b", cursor: "pointer", borderRadius: "8px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "20px" }}>
              {[
                { label: "Precio / 1K", value: `$${parseFloat(modal.service.rate).toFixed(4)}` },
                { label: "Mínimo", value: parseInt(modal.service.min).toLocaleString() },
                { label: "Máximo", value: parseInt(modal.service.max).toLocaleString() },
              ].map((item) => (
                <div key={item.label} style={{ background: "#07070e", borderRadius: "12px", padding: "13px", textAlign: "center", border: "1px solid #1a1a2e" }}>
                  <p style={{ fontSize: "14px", fontWeight: 800, color: "white" }}>{item.value}</p>
                  <p style={{ fontSize: "10px", color: "#5a6480", marginTop: "3px", fontWeight: 500 }}>{item.label}</p>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#8892a4", display: "block", marginBottom: "7px", letterSpacing: "0.2px" }}>Enlace del perfil o publicación</label>
              <input value={modal.link} onChange={(e) => setModal({ ...modal, link: e.target.value })}
                placeholder="https://instagram.com/usuario"
                style={{ width: "100%", background: "#07070e", border: "1px solid #1e1e30", borderRadius: "12px", padding: "11px 14px", color: "white", fontSize: "14px", outline: "none", fontFamily: "inherit" }} />
            </div>
            <div style={{ marginBottom: "18px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#8892a4", display: "block", marginBottom: "7px", letterSpacing: "0.2px" }}>Cantidad</label>
              <input type="number" min={parseInt(modal.service.min)} max={parseInt(modal.service.max)}
                value={modal.quantity} onChange={(e) => setModal({ ...modal, quantity: parseInt(e.target.value) || 0 })}
                style={{ width: "100%", background: "#07070e", border: "1px solid #1e1e30", borderRadius: "12px", padding: "11px 14px", color: "white", fontSize: "14px", outline: "none", fontFamily: "inherit" }} />
            </div>

            <div style={{ background: "linear-gradient(135deg, #007ABF18, #a855f710)", border: "1px solid #007ABF30", borderRadius: "12px", padding: "14px 18px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: "11px", color: "#1E90D4", fontWeight: 600, marginBottom: "4px" }}>Costo estimado</p>
                <p style={{ fontSize: "24px", fontWeight: 800, color: "white", letterSpacing: "-0.5px" }}>${calcCost(modal.service, modal.quantity)}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "11px", color: "#5a6480", marginBottom: "4px" }}>Tu balance</p>
                <p style={{ fontSize: "15px", fontWeight: 700, color: balance >= parseFloat(calcCost(modal.service, modal.quantity)) ? "#34d399" : "#f87171" }}>
                  ${balance.toFixed(4)}
                </p>
              </div>
            </div>

            {orderError && <div style={{ background: "#f8717115", border: "1px solid #f8717140", borderRadius: "10px", padding: "10px 14px", marginBottom: "12px", fontSize: "13px", color: "#f87171" }}>{orderError}</div>}
            {orderSuccess && (
              <div style={{ background: "#34d39915", border: "1px solid #34d39940", borderRadius: "10px", padding: "10px 14px", marginBottom: "12px", fontSize: "13px", color: "#34d399", display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle size={14} /> {orderSuccess}
              </div>
            )}

            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setModal(null)}
                style={{ flex: 1, padding: "13px", borderRadius: "12px", border: "1px solid #2a2a42", background: "transparent", color: "#8892a4", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Cancelar
              </button>
              <button onClick={placeOrder} disabled={placing}
                style={{ flex: 2, padding: "13px", borderRadius: "12px", border: "none", background: placing ? "#5b21b6" : "linear-gradient(135deg, #007ABF, #005F96)", color: "white", fontSize: "14px", fontWeight: 700, cursor: placing ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: placing ? "none" : "0 4px 20px #007ABF40", fontFamily: "inherit" }}>
                {placing
                  ? <><div style={{ width: "14px", height: "14px", borderRadius: "50%", border: "2px solid #ffffff50", borderTopColor: "white", animation: "spin 0.6s linear infinite" }} /> Procesando...</>
                  : <><Zap size={14} /> Confirmar pedido</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

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

              <div style={{ background: "#007ABF10", border: "1px solid #007ABF30", borderRadius: "12px", padding: "13px 16px", marginBottom: "18px" }}>
                <p style={{ fontSize: "12px", color: "#56B4E0", fontWeight: 700, marginBottom: "4px" }}>⚡ Entrega en menos de 24h</p>
                <p style={{ fontSize: "12px", color: "#8892a4", lineHeight: "1.6" }}>
                  El pago se descuenta de tu saldo inmediatamente. Recibirás los accesos por email o vía soporte.
                </p>
              </div>

              {buyError && (
                <div style={{ background: "#f8717115", border: "1px solid #f8717140", borderRadius: "10px", padding: "10px 14px", marginBottom: "12px", fontSize: "13px", color: "#f87171" }}>
                  {buyError}
                </div>
              )}
              {buySuccess && (
                <div style={{ background: "#34d39915", border: "1px solid #34d39940", borderRadius: "10px", padding: "10px 14px", marginBottom: "12px", fontSize: "13px", color: "#34d399", display: "flex", alignItems: "center", gap: "8px" }}>
                  ✅ ¡Compra realizada! Procesaremos tu pedido en menos de 24h.
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

      {/* ── Floating AI button ── */}
      <Link href="/" style={{
        position: "fixed", bottom: "24px", right: "24px", zIndex: 60,
        display: "flex", alignItems: "center", gap: "10px",
        padding: "12px 20px", borderRadius: "100px",
        background: "linear-gradient(135deg, #007ABF, #005FA4)",
        boxShadow: "0 0 0 1px #007ABF80, 0 8px 32px #007ABF50",
        color: "white", fontWeight: 700, fontSize: "14px",
        textDecoration: "none",
        animation: "pulse-glow 2.5s ease-in-out infinite",
      }}>
        <FarmMindLogo size={22} />
        <span>Hablar con AI</span>
      </Link>
    </>
  );
}
