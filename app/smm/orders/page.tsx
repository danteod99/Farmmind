"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import {
  LogOut, RefreshCw, Clock, Zap, CheckCircle, AlertCircle, Loader,
  ShoppingCart, ArrowLeft, ExternalLink, Search, Filter
} from "lucide-react";
import { FarmMindLogo } from "@/app/components/FarmMindLogo";
import ChatPopup from "@/app/components/ChatPopup";
import { TrustFooter } from "@/app/components/TrustFooter";
import { SmmNav } from "@/app/components/SmmNav";

interface Order {
  id: string;
  jap_order_id: number;
  service_name: string;
  category: string;
  link: string;
  quantity: number;
  charge: number;
  status: string;
  start_count?: string;
  remains?: string;
  created_at: string;
  updated_at?: string;
}

type StatusKey = "pending" | "processing" | "inprogress" | "completed" | "partial" | "canceled";

const STATUS_CONFIG: Record<StatusKey, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:    { label: "Pendiente",   color: "#fbbf24", bg: "#fbbf2420", icon: <Clock size={11} /> },
  processing: { label: "Procesando",  color: "#60a5fa", bg: "#60a5fa20", icon: <Loader size={11} className="animate-spin" /> },
  inprogress: { label: "En progreso", color: "#56B4E0", bg: "#56B4E020", icon: <Zap size={11} /> },
  completed:  { label: "Completado",  color: "#34d399", bg: "#34d39920", icon: <CheckCircle size={11} /> },
  partial:    { label: "Parcial",     color: "#fb923c", bg: "#fb923c20", icon: <AlertCircle size={11} /> },
  canceled:   { label: "Cancelado",   color: "#f87171", bg: "#f8717120", icon: <AlertCircle size={11} /> },
};

const STATUS_FILTERS: Array<StatusKey | "all"> = ["all", "pending", "processing", "inprogress", "completed", "partial", "canceled"];

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as StatusKey] || STATUS_CONFIG.pending;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, color: cfg.color, background: cfg.bg, whiteSpace: "nowrap" }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

export default function OrdersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [balance, setBalance] = useState(0);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userAvatar, setUserAvatar] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusKey | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }
    setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuario");
    setUserEmail(user.email || "");
    setUserAvatar(user.user_metadata?.avatar_url || "");
    fetchOrders();
  };

  const fetchOrders = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch("/api/smm/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setBalance(data.balance || 0);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filtered = orders.filter((o) => {
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    const matchSearch = !search || o.service_name.toLowerCase().includes(search.toLowerCase()) || o.link.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const stats = {
    total: orders.length,
    active: orders.filter((o) => ["pending", "processing", "inprogress"].includes(o.status)).length,
    completed: orders.filter((o) => o.status === "completed").length,
    spent: orders.reduce((s, o) => s + (o.charge || 0), 0),
  };

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "#07070e", flexDirection: "column", gap: "16px" }}>
        <div style={{ width: "48px", height: "48px", borderRadius: "50%", border: "3px solid #007ABF30", borderTopColor: "#007ABF", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "#5a6480", fontSize: "13px", fontWeight: 500 }}>Cargando pedidos...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #07070e; color: #f0efff; font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; }
        a { text-decoration: none; color: inherit; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a42; border-radius: 99px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .order-row:hover { background: #000C18 !important; }
        .nav-link:hover { color: #88D0F0 !important; }
        .stat-card { transition: transform 0.2s ease; }
        .stat-card:hover { transform: translateY(-3px); }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#07070e" }}>

        {/* Navbar */}
        <SmmNav
          balance={balance}
          userAvatar={userAvatar}
          userName={userName}
          userEmail={userEmail}
          links={[
            { href: "/smm/services", label: "Servicios" },
            { href: "/smm/orders", label: "Pedidos", active: true },
            { href: "/smm/funds", label: "Recargar" },
            { href: "/smm/ai", label: "🤖 Asistente IA" },
            { href: "https://www.scalinglatam.site", label: "🌐 Scaling Latam", external: true },
          ]}
        />

        {/* Hero */}
        <div style={{ position: "relative", overflow: "hidden", background: "linear-gradient(160deg, #000C18 0%, #001530 35%, #000A14 65%, #07070e 100%)", borderBottom: "1px solid #002860", padding: "44px 28px 36px" }}>
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <div style={{ position: "absolute", top: "-80px", right: "5%", width: "320px", height: "320px", borderRadius: "50%", background: "radial-gradient(circle, #007ABF45 0%, transparent 65%)", filter: "blur(60px)" }} />
            <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(#007ABF08 1px, transparent 1px), linear-gradient(90deg, #007ABF08 1px, transparent 1px)", backgroundSize: "60px 60px", maskImage: "radial-gradient(ellipse 80% 100% at 50% 0%, black 40%, transparent 100%)" }} />
          </div>
          <div style={{ maxWidth: "1200px", margin: "0 auto", position: "relative", zIndex: 1 }}>
            <Link href="/smm" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#1E90D4", fontWeight: 600, marginBottom: "18px", padding: "5px 12px", borderRadius: "8px", background: "#007ABF18", border: "1px solid #007ABF30" }}>
              <ArrowLeft size={12} /> Dashboard
            </Link>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
              <div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "4px 12px", borderRadius: "20px", background: "#007ABF25", border: "1px solid #007ABF50", marginBottom: "12px" }}>
                  <ShoppingCart size={11} color="#56B4E0" />
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#56B4E0", letterSpacing: "0.8px", textTransform: "uppercase" }}>Historial</span>
                </div>
                <h1 style={{ fontSize: "38px", fontWeight: 800, color: "white", letterSpacing: "-1px", lineHeight: "1.05", marginBottom: "8px" }}>
                  Mis pedidos<br />
                  <span style={{ background: "linear-gradient(90deg, #e9d5ff, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>en tiempo real.</span>
                </h1>
                <p style={{ fontSize: "14px", color: "#8892a4" }}>Estado actualizado · haz clic en una fila para ver detalles</p>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <Link href="/smm/services" style={{ padding: "10px 20px", borderRadius: "12px", background: "linear-gradient(135deg, #007ABF, #005F96)", color: "white", fontSize: "13px", fontWeight: 700, display: "flex", alignItems: "center", gap: "7px", boxShadow: "0 0 20px #007ABF40" }}>
                  <ShoppingCart size={14} /> Nuevo pedido
                </Link>
                <button onClick={() => fetchOrders(true)} disabled={refreshing}
                  style={{ padding: "10px 16px", borderRadius: "12px", border: "1px solid #2a2a42", background: "transparent", color: "#56B4E0", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "7px", fontFamily: "inherit" }}>
                  <RefreshCw size={13} style={{ animation: refreshing ? "spin 0.8s linear infinite" : "none" }} />
                  {refreshing ? "Actualizando..." : "Actualizar"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "24px" }}>
            {[
              { label: "Total pedidos", value: stats.total, color: "#56B4E0", border: "#56B4E030" },
              { label: "Activos", value: stats.active, color: "#fbbf24", border: "#fbbf2430" },
              { label: "Completados", value: stats.completed, color: "#34d399", border: "#34d39930" },
              { label: "Total gastado", value: `$${stats.spent.toFixed(2)}`, color: "#60a5fa", border: "#60a5fa30" },
            ].map((s) => (
              <div key={s.label} className="stat-card" style={{ background: "#0d0d18", border: `1px solid ${s.border}`, borderRadius: "18px", padding: "18px 20px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, right: 0, width: "70px", height: "70px", background: `radial-gradient(circle at top right, ${s.color}18, transparent)` }} />
                <p style={{ fontSize: "10px", color: "#5a6480", marginBottom: "10px", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.7px" }}>{s.label}</p>
                <p style={{ fontSize: "26px", fontWeight: 800, color: s.color, letterSpacing: "-0.5px" }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "200px", position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                aria-label="Buscar pedidos por servicio o link"
                placeholder="Buscar por servicio o link..."
                style={{ width: "100%", background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: "10px", padding: "9px 12px 9px 34px", color: "white", fontSize: "13px", outline: "none" }} />
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#64748b" }}>
                <Filter size={12} /> Estado:
              </span>
              {STATUS_FILTERS.map((s) => {
                const active = statusFilter === s;
                const cfg = s !== "all" ? STATUS_CONFIG[s] : null;
                return (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    aria-label={`Filtrar por estado: ${s === "all" ? "Todos" : STATUS_CONFIG[s].label}`}
                    aria-pressed={active}
                    style={{ padding: "5px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 500, border: "1px solid", borderColor: active ? (cfg?.color || "#007ABF") : "#2d2d44", background: active ? ((cfg?.color || "#007ABF") + "20") : "transparent", color: active ? (cfg?.color || "#56B4E0") : "#64748b", cursor: "pointer" }}>
                    {s === "all" ? "Todos" : STATUS_CONFIG[s].label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Orders table */}
          <div style={{ background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: "16px", overflow: "hidden" }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "64px", color: "#64748b" }}>
                <ShoppingCart size={36} style={{ margin: "0 auto 16px", opacity: 0.4 }} />
                {orders.length === 0 ? (
                  <>
                    <p style={{ fontSize: "15px", marginBottom: "8px" }}>Aún no tienes pedidos</p>
                    <Link href="/smm/services" style={{ display: "inline-block", marginTop: "12px", padding: "9px 18px", background: "#007ABF", borderRadius: "8px", color: "white", fontSize: "13px", fontWeight: 500 }}>
                      Explorar servicios
                    </Link>
                  </>
                ) : (
                  <p style={{ fontSize: "14px" }}>No hay pedidos con ese filtro</p>
                )}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1e1e30" }}>
                      {["ID", "Servicio", "Link", "Cantidad", "Costo", "Progreso", "Estado", "Fecha"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "11px 18px", fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((order) => {
                      const isExp = expanded === order.id;
                      const progress = order.start_count && order.remains
                        ? Math.max(0, Math.min(100, ((parseInt(order.start_count) + order.quantity - parseInt(order.remains)) / order.quantity) * 100))
                        : (order.status === "completed" ? 100 : 0);

                      return (
                        <>
                          <tr key={order.id} className="order-row"
                            onClick={() => setExpanded(isExp ? null : order.id)}
                            style={{ borderBottom: "1px solid #1a1a2e", cursor: "pointer", transition: "background 0.1s", background: isExp ? "#16162a" : "transparent" }}>
                            <td style={{ padding: "13px 18px", fontSize: "12px", color: "#64748b", whiteSpace: "nowrap" }}>
                              #{order.jap_order_id}
                            </td>
                            <td style={{ padding: "13px 18px" }}>
                              <p style={{ fontSize: "13px", color: "white", fontWeight: 500, maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{order.service_name}</p>
                              <p style={{ fontSize: "11px", color: "#007ABF" }}>{order.category}</p>
                            </td>
                            <td style={{ padding: "13px 18px" }}>
                              <a href={order.link} target="_blank" rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#60a5fa", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                <ExternalLink size={11} />{order.link.replace(/^https?:\/\//, "")}
                              </a>
                            </td>
                            <td style={{ padding: "13px 18px", fontSize: "13px", color: "white", whiteSpace: "nowrap" }}>
                              {order.quantity.toLocaleString()}
                            </td>
                            <td style={{ padding: "13px 18px", fontSize: "13px", color: "#34d399", fontWeight: 600, whiteSpace: "nowrap" }}>
                              ${order.charge.toFixed(2)}
                            </td>
                            <td style={{ padding: "13px 18px", minWidth: "100px" }}>
                              <div style={{ height: "6px", background: "#2d2d44", borderRadius: "3px", overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${progress}%`, background: order.status === "completed" ? "#34d399" : order.status === "canceled" ? "#f87171" : "#56B4E0", borderRadius: "3px", transition: "width 0.4s" }} />
                              </div>
                              <p style={{ fontSize: "10px", color: "#64748b", marginTop: "3px" }}>{Math.round(progress)}%</p>
                            </td>
                            <td style={{ padding: "13px 18px" }}>
                              <StatusBadge status={order.status} />
                            </td>
                            <td style={{ padding: "13px 18px", fontSize: "12px", color: "#64748b", whiteSpace: "nowrap" }}>
                              {new Date(order.created_at).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "2-digit" })}
                            </td>
                          </tr>
                          {isExp && (
                            <tr key={`${order.id}-exp`} style={{ background: "#0d0d18", borderBottom: "1px solid #1e1e30" }}>
                              <td colSpan={8} style={{ padding: "16px 18px 18px 48px" }}>
                                <div style={{ display: "flex", gap: "32px", flexWrap: "wrap" }}>
                                  {[
                                    { label: "ID de pedido", value: `#${order.jap_order_id}` },
                                    { label: "Inicio conteo", value: order.start_count || "—" },
                                    { label: "Restantes", value: order.remains || "—" },
                                    { label: "Actualizado", value: order.updated_at ? new Date(order.updated_at).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—" },
                                    { label: "Link completo", value: order.link },
                                  ].map((item) => (
                                    <div key={item.label}>
                                      <p style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, marginBottom: "3px" }}>{item.label}</p>
                                      <p style={{ fontSize: "13px", color: "#e2e8f0" }}>{item.value}</p>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer note */}
          {orders.length > 0 && (
            <p style={{ textAlign: "center", fontSize: "12px", color: "#64748b", marginTop: "16px" }}>
              Los estados activos se sincronizan automáticamente al actualizar la página.
              Haz clic en una fila para ver los detalles del pedido.
            </p>
          )}
        </div>
      </div>

      <TrustFooter />
      <ChatPopup />
    </>
  );
}
