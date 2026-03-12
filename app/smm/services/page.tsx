"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import {
  Search, Bot, LogOut, ShoppingCart, ChevronDown, X, Zap, CheckCircle,
  DollarSign, Users, ArrowLeft, Package, MessageCircle, Crown
} from "lucide-react";

interface Service {
  service: number;
  name: string;
  type: string;
  category: string;
  rate: string; // per 1000
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

// Categorías curadas de JAP — solo mostramos servicios de estas categorías (top 10)
const FEATURED_CATEGORIES = ["Instagram", "TikTok", "YouTube"];

// Cuentas Premium propias (no son de JAP)
const PREMIUM_ACCOUNTS = [
  {
    id: "yt-monetized",
    title: "Cuenta YouTube Monetizada",
    description: "Canal con más de 1,000 suscriptores y 4,000 horas de watch time. Lista para monetización AdSense.",
    price: 35,
    icon: "▶",
    color: "#ff0000",
    bg: "#ff000015",
    border: "#ff000030",
    badges: ["1K+ Subs", "4K Horas", "AdSense Ready"],
    whatsapp: "Hola, quiero comprar una Cuenta YouTube Monetizada ($35 USD)",
  },
  {
    id: "fb-account",
    title: "Cuenta Facebook Aged",
    description: "Cuenta con historial real, foto de perfil y actividad. Ideal para ads, grupos y automatización.",
    price: 12,
    icon: "f",
    color: "#1877f2",
    bg: "#1877f215",
    border: "#1877f230",
    badges: ["Aged 2+ años", "Verificada", "Perfil completo"],
    whatsapp: "Hola, quiero comprar una Cuenta Facebook Aged ($12 USD)",
  },
  {
    id: "tiktok-account",
    title: "Cuenta TikTok con Seguidores",
    description: "Cuenta con seguidores reales y engagement. Perfecta para inicio de bots o crecimiento rápido.",
    price: 18,
    icon: "♪",
    color: "#ff0050",
    bg: "#ff005015",
    border: "#ff005030",
    badges: ["500+ Seguidores", "Engagement real", "Lista para usar"],
    whatsapp: "Hola, quiero comprar una Cuenta TikTok con Seguidores ($18 USD)",
  },
];

export default function ServicesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [balance, setBalance] = useState(0);
  const [userName, setUserName] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [modal, setModal] = useState<OrderModal | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [showAllJAP, setShowAllJAP] = useState(false);
  const [accountModal, setAccountModal] = useState<typeof PREMIUM_ACCOUNTS[0] | null>(null);

  useEffect(() => {
    checkAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }
    setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuario");
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
        setServices(Array.isArray(data) ? data : []);
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
      const matchCat = selectedCategory === "all" || s.category === selectedCategory;
      const matchSearch =
        !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.category.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
    // Si no hay búsqueda activa y no hay filtro de categoría, mostrar solo curados
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

  const openModal = (service: Service) => {
    setOrderError(null);
    setOrderSuccess(null);
    setModal({ service, link: "", quantity: parseInt(service.min) || 100 });
  };

  const placeOrder = async () => {
    if (!modal) return;
    if (!modal.link.trim()) { setOrderError("Ingresa el enlace del perfil/publicación"); return; }
    if (modal.quantity < parseInt(modal.service.min) || modal.quantity > parseInt(modal.service.max)) {
      setOrderError(`La cantidad debe estar entre ${modal.service.min} y ${modal.service.max}`);
      return;
    }
    setPlacing(true);
    setOrderError(null);
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
        setBalance((prev) => {
          const cost = (parseFloat(modal.service.rate) / 1000) * modal.quantity;
          return Math.max(0, prev - cost);
        });
        setTimeout(() => {
          setModal(null);
          setOrderSuccess(null);
        }, 2000);
      }
    } catch {
      setOrderError("Error de conexión. Intenta de nuevo.");
    } finally {
      setPlacing(false);
    }
  };

  const calcCost = (service: Service, qty: number) =>
    ((parseFloat(service.rate) / 1000) * qty).toFixed(4);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "#0a0a0f" }}>
        <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0f; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        a { text-decoration: none; color: inherit; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2d2d44; border-radius: 4px; }
        .service-card:hover { border-color: #7c3aed !important; background: #16162a !important; }
        .order-btn:hover { background: #6d28d9 !important; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#0a0a0f" }}>

        {/* Navbar */}
        <nav style={{ background: "#111118", borderBottom: "1px solid #2d2d44", padding: "0 24px", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Bot size={16} color="white" />
              </div>
              <span style={{ fontWeight: 700, color: "white", fontSize: "14px" }}>FarmMind</span>
            </Link>
            <div style={{ width: "1px", height: "20px", background: "#2d2d44" }} />
            <div style={{ display: "flex", gap: "4px" }}>
              {[
                { href: "/smm", label: "Dashboard", active: false },
                { href: "/smm/services", label: "Servicios", active: true },
                { href: "/smm/orders", label: "Mis pedidos", active: false },
                { href: "/smm/funds", label: "Recargar", active: false },
              ].map((item) => (
                <Link key={item.href} href={item.href} style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "13px", fontWeight: item.active ? 600 : 400, color: item.active ? "#a78bfa" : "#94a3b8", background: item.active ? "#7c3aed20" : "transparent" }}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ padding: "6px 12px", borderRadius: "8px", background: "#7c3aed20", border: "1px solid #7c3aed40" }}>
              <span style={{ fontSize: "13px", color: "#a78bfa", fontWeight: 600 }}>${balance.toFixed(2)} USD</span>
            </div>
            <button onClick={async () => { await supabase.auth.signOut(); router.push("/"); }} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}>
              <LogOut size={16} />
            </button>
          </div>
        </nav>

        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>

          {/* Header */}
          <div style={{ marginBottom: "28px" }}>
            <Link href="/smm" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#64748b", marginBottom: "12px" }}>
              <ArrowLeft size={14} /> Volver al dashboard
            </Link>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h1 style={{ fontSize: "24px", fontWeight: 700, color: "white" }}>Catálogo de servicios</h1>
                <p style={{ color: "#64748b", fontSize: "14px", marginTop: "4px" }}>{filtered.length} servicios disponibles</p>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                {POPULAR_CATEGORIES.map((cat) => {
                  const active = selectedCategory === cat;
                  return (
                    <button key={cat} onClick={() => setSelectedCategory(active ? "all" : cat)}
                      style={{ padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 500, border: "1px solid", borderColor: active ? "#7c3aed" : "#2d2d44", background: active ? "#7c3aed20" : "transparent", color: active ? "#a78bfa" : "#94a3b8", cursor: "pointer" }}>
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Search + filter row */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar servicio..."
                style={{ width: "100%", background: "#111118", border: "1px solid #2d2d44", borderRadius: "10px", padding: "10px 12px 10px 36px", color: "white", fontSize: "14px", outline: "none" }} />
            </div>
            <div style={{ position: "relative" }}>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
                style={{ appearance: "none", background: "#111118", border: "1px solid #2d2d44", borderRadius: "10px", padding: "10px 36px 10px 14px", color: "white", fontSize: "14px", cursor: "pointer", outline: "none" }}>
                {categories.map((c) => (
                  <option key={c} value={c}>{c === "all" ? "Todas las categorías" : c}</option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b", pointerEvents: "none" }} />
            </div>
          </div>

          {/* ===== Cuentas Premium ===== */}
          <div style={{ marginBottom: "36px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <Crown size={16} color="#f59e0b" />
              <h2 style={{ fontSize: "16px", fontWeight: 700, color: "white" }}>Cuentas Premium</h2>
              <span style={{ fontSize: "11px", color: "#f59e0b", background: "#f59e0b15", border: "1px solid #f59e0b30", padding: "2px 8px", borderRadius: "20px", fontWeight: 600 }}>
                Exclusivo
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
              {PREMIUM_ACCOUNTS.map((acc) => (
                <div key={acc.id}
                  style={{ background: "#111118", border: `1px solid ${acc.border}`, borderRadius: "16px", padding: "20px", transition: "all 0.15s", cursor: "pointer" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = acc.color; (e.currentTarget as HTMLDivElement).style.background = acc.bg; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = acc.border; (e.currentTarget as HTMLDivElement).style.background = "#111118"; }}>

                  {/* Icon + title */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: acc.bg, border: `1px solid ${acc.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                      {acc.icon}
                    </div>
                    <div>
                      <p style={{ fontSize: "14px", fontWeight: 700, color: "white", lineHeight: "1.3" }}>{acc.title}</p>
                      <p style={{ fontSize: "18px", fontWeight: 800, color: acc.color, marginTop: "2px" }}>${acc.price} USD</p>
                    </div>
                  </div>

                  {/* Description */}
                  <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: "1.5", marginBottom: "14px" }}>{acc.description}</p>

                  {/* Badges */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
                    {acc.badges.map((badge) => (
                      <span key={badge} style={{ fontSize: "11px", fontWeight: 600, color: acc.color, background: acc.bg, border: `1px solid ${acc.border}`, padding: "3px 8px", borderRadius: "6px" }}>
                        ✓ {badge}
                      </span>
                    ))}
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => setAccountModal(acc)}
                    style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "none", background: acc.color, color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                    <MessageCircle size={14} /> Comprar por WhatsApp
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ===== Servicios JAP ===== */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Zap size={16} color="#a78bfa" />
                <h2 style={{ fontSize: "16px", fontWeight: 700, color: "white" }}>Servicios SMM</h2>
                {!search && selectedCategory === "all" && (
                  <span style={{ fontSize: "11px", color: "#64748b", background: "#64748b15", padding: "2px 8px", borderRadius: "20px" }}>
                    {showAllJAP ? `${services.length} servicios` : "10 destacados"}
                  </span>
                )}
              </div>
              {!search && selectedCategory === "all" && (
                <button
                  onClick={() => setShowAllJAP(!showAllJAP)}
                  style={{ padding: "6px 14px", borderRadius: "8px", border: "1px solid #2d2d44", background: "transparent", color: "#a78bfa", fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                  <ChevronDown size={13} style={{ transform: showAllJAP ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                  {showAllJAP ? "Ver menos" : `Ver todos (${services.length})`}
                </button>
              )}
            </div>

            {/* Services grid */}
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px", color: "#64748b" }}>
                <Package size={40} style={{ margin: "0 auto 16px", opacity: 0.4 }} />
                <p style={{ fontSize: "16px", marginBottom: "8px" }}>No hay servicios que coincidan</p>
                <p style={{ fontSize: "13px" }}>Prueba con otro término o categoría</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
                {filtered.map((service) => {
                  const cost1k = parseFloat(service.rate);
                  return (
                    <div key={service.service} className="service-card"
                      style={{ background: "#111118", border: "1px solid #2d2d44", borderRadius: "16px", padding: "20px", transition: "all 0.15s", cursor: "default" }}>
                      {/* Category + badges */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 600, color: "#7c3aed", background: "#7c3aed15", padding: "3px 8px", borderRadius: "6px" }}>
                          {service.category}
                        </span>
                        <div style={{ display: "flex", gap: "4px" }}>
                          {service.refill && (
                            <span title="Refill disponible" style={{ fontSize: "10px", color: "#34d399", background: "#34d39915", padding: "2px 6px", borderRadius: "4px" }}>
                              ↻ Refill
                            </span>
                          )}
                          {service.dripfeed && (
                            <span title="Drip feed" style={{ fontSize: "10px", color: "#60a5fa", background: "#60a5fa15", padding: "2px 6px", borderRadius: "4px" }}>
                              ⏱ Drip
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Name */}
                      <p style={{ fontSize: "14px", fontWeight: 600, color: "white", marginBottom: "12px", lineHeight: "1.4" }}>
                        #{service.service} · {service.name}
                      </p>

                      {/* Stats row */}
                      <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <DollarSign size={12} color="#34d399" />
                          <span style={{ fontSize: "12px", color: "#34d399", fontWeight: 600 }}>${cost1k.toFixed(4)}</span>
                          <span style={{ fontSize: "11px", color: "#64748b" }}>/ 1K</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <Users size={12} color="#a78bfa" />
                          <span style={{ fontSize: "12px", color: "#94a3b8" }}>{parseInt(service.min).toLocaleString()} – {parseInt(service.max).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Type */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>{service.type}</span>
                        <button onClick={() => openModal(service)} className="order-btn"
                          style={{ background: "#7c3aed", border: "none", borderRadius: "8px", padding: "8px 16px", color: "white", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", transition: "background 0.15s" }}>
                          <ShoppingCart size={13} /> Ordenar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order Modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "#00000090", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ background: "#111118", border: "1px solid #2d2d44", borderRadius: "20px", width: "100%", maxWidth: "480px", padding: "28px" }}>

            {/* Modal header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <p style={{ fontSize: "11px", color: "#7c3aed", fontWeight: 600, marginBottom: "4px" }}>{modal.service.category}</p>
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "white", lineHeight: "1.4" }}>{modal.service.name}</h3>
              </div>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            {/* Info cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "20px" }}>
              {[
                { label: "Precio", value: `$${parseFloat(modal.service.rate).toFixed(4)}`, sub: "por 1000" },
                { label: "Mínimo", value: parseInt(modal.service.min).toLocaleString(), sub: "unidades" },
                { label: "Máximo", value: parseInt(modal.service.max).toLocaleString(), sub: "unidades" },
              ].map((item) => (
                <div key={item.label} style={{ background: "#0a0a0f", borderRadius: "10px", padding: "12px", textAlign: "center" }}>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "white" }}>{item.value}</p>
                  <p style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>{item.label} · {item.sub}</p>
                </div>
              ))}
            </div>

            {/* Fields */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", display: "block", marginBottom: "6px" }}>
                Enlace del perfil o publicación
              </label>
              <input value={modal.link} onChange={(e) => setModal({ ...modal, link: e.target.value })}
                placeholder="https://instagram.com/usuario"
                style={{ width: "100%", background: "#0a0a0f", border: "1px solid #2d2d44", borderRadius: "10px", padding: "10px 14px", color: "white", fontSize: "14px", outline: "none" }} />
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", display: "block", marginBottom: "6px" }}>
                Cantidad
              </label>
              <input
                type="number"
                min={parseInt(modal.service.min)}
                max={parseInt(modal.service.max)}
                value={modal.quantity}
                onChange={(e) => setModal({ ...modal, quantity: parseInt(e.target.value) || 0 })}
                style={{ width: "100%", background: "#0a0a0f", border: "1px solid #2d2d44", borderRadius: "10px", padding: "10px 14px", color: "white", fontSize: "14px", outline: "none" }} />
            </div>

            {/* Cost summary */}
            <div style={{ background: "#7c3aed15", border: "1px solid #7c3aed30", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: "12px", color: "#a78bfa" }}>Costo estimado</p>
                <p style={{ fontSize: "20px", fontWeight: 700, color: "white" }}>${calcCost(modal.service, modal.quantity)}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "12px", color: "#64748b" }}>Tu balance</p>
                <p style={{ fontSize: "14px", fontWeight: 600, color: balance >= parseFloat(calcCost(modal.service, modal.quantity)) ? "#34d399" : "#f87171" }}>
                  ${balance.toFixed(4)}
                </p>
              </div>
            </div>

            {/* Errors / Success */}
            {orderError && (
              <div style={{ background: "#f8717115", border: "1px solid #f8717140", borderRadius: "8px", padding: "10px 14px", marginBottom: "12px", fontSize: "13px", color: "#f87171" }}>
                {orderError}
              </div>
            )}
            {orderSuccess && (
              <div style={{ background: "#34d39915", border: "1px solid #34d39940", borderRadius: "8px", padding: "10px 14px", marginBottom: "12px", fontSize: "13px", color: "#34d399", display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle size={14} /> {orderSuccess}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setModal(null)}
                style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "1px solid #2d2d44", background: "transparent", color: "#94a3b8", fontSize: "14px", fontWeight: 500, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={placeOrder} disabled={placing}
                style={{ flex: 2, padding: "12px", borderRadius: "10px", border: "none", background: placing ? "#6d28d9" : "#7c3aed", color: "white", fontSize: "14px", fontWeight: 600, cursor: placing ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                {placing ? (
                  <><div style={{ width: "14px", height: "14px", borderRadius: "50%", border: "2px solid white", borderTopColor: "transparent", animation: "spin 0.6s linear infinite" }} /> Procesando...</>
                ) : (
                  <><Zap size={14} /> Confirmar pedido</>
                )}
              </button>
            </div>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Account Modal */}
      {accountModal && (
        <div style={{ position: "fixed", inset: 0, background: "#00000090", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ background: "#111118", border: `1px solid ${accountModal.border}`, borderRadius: "20px", width: "100%", maxWidth: "440px", padding: "28px" }}>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: accountModal.bg, border: `1px solid ${accountModal.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>
                  {accountModal.icon}
                </div>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: "white", lineHeight: "1.3" }}>{accountModal.title}</h3>
                  <p style={{ fontSize: "20px", fontWeight: 800, color: accountModal.color, marginTop: "2px" }}>${accountModal.price} USD</p>
                </div>
              </div>
              <button onClick={() => setAccountModal(null)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            {/* Description */}
            <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: "1.6", marginBottom: "16px" }}>{accountModal.description}</p>

            {/* Badges */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "24px" }}>
              {accountModal.badges.map((badge) => (
                <span key={badge} style={{ fontSize: "12px", fontWeight: 600, color: accountModal.color, background: accountModal.bg, border: `1px solid ${accountModal.border}`, padding: "4px 10px", borderRadius: "8px" }}>
                  ✓ {badge}
                </span>
              ))}
            </div>

            {/* Info box */}
            <div style={{ background: "#f59e0b10", border: "1px solid #f59e0b30", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px" }}>
              <p style={{ fontSize: "12px", color: "#f59e0b", fontWeight: 600, marginBottom: "4px" }}>¿Cómo funciona?</p>
              <p style={{ fontSize: "12px", color: "#94a3b8", lineHeight: "1.5" }}>
                Al hacer clic en el botón se abrirá WhatsApp con un mensaje predefinido. Nuestro equipo te responderá y procesará tu pedido en menos de 24 horas.
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setAccountModal(null)}
                style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "1px solid #2d2d44", background: "transparent", color: "#94a3b8", fontSize: "14px", fontWeight: 500, cursor: "pointer" }}>
                Cancelar
              </button>
              <a
                href={`https://wa.me/18496867266?text=${encodeURIComponent(accountModal.whatsapp)}`}
                target="_blank" rel="noopener noreferrer"
                style={{ flex: 2, padding: "12px", borderRadius: "10px", border: "none", background: "#25d366", color: "white", fontSize: "14px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", textDecoration: "none" }}>
                <MessageCircle size={15} /> Abrir WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
