"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import {
  Bot, LogOut, RefreshCw, Clock, Zap, CheckCircle, AlertCircle, Loader,
  ShoppingCart, ArrowLeft, ExternalLink, Search, Filter
} from "lucide-react";

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
  inprogress: { label: "En progreso", color: "#a78bfa", bg: "#a78bfa20", icon: <Zap size={11} /> },
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
        .order-row:hover { background: #16162a !important; }
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
                { href: "/smm/services", label: "Servicios", active: false },
                { href: "/smm/orders", label: "Mis pedidos", active: true },
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
                <h1 style={{ fontSize: "24px", fontWeight: 700, color: "white" }}>Mis pedidos</h1>
                <p style={{ color: "#64748b", fontSize: "14px", marginTop: "4px" }}>Historial completo y estado en tiempo real</p>
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <Link href="/smm/services"
                  style={{ padding: "9px 18px", borderRadius: "10px", background: "#7c3aed", color: "white", fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                  <ShoppingCart size={14} /> Nuevo pedido
                </Link>
                <button onClick={() => fetchOrders(true)} disabled={refreshing}
                  style={{ padding: "9px 14px", borderRadius: "10px", border: "1px solid #2d2d44", background: "transparent", color: "#94a3b8", fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                  <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                  {refreshing ? "Actualizando..." : "Actualizar"}
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "24px" }}>
            {[
              { label: "Total pedidos", value: stats.total, color: "#a78bfa" },
              { label: "Activos", value: stats.active, color: "#fbbf24" },
              { label: "Completados", value: stats.completed, color: "#34d399" },
              { label: "Total gastado", value: `$${stats.spent.toFixed(2)}`, color: "#60a5fa" },
            ].map((s) => (
              <div key={s.label} style={{ background: "#111118", border: "1px solid #2d2d44", borderRadius: "14px", padding: "16px 20px" }}>
                <p style={{ fontSize: "11px", color: "#64748b", marginBottom: "6px", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em" }}>{s.label}</p>
                <p style={{ fontSize: "22px", fontWeight: 700, color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "200px", position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por servicio o link..."
                style={{ width: "100%", background: "#111118", border: "1px solid #2d2d44", borderRadius: "10px", padding: "9px 12px 9px 34px", color: "white", fontSize: "13px", outline: "none" }} />
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
                    style={{ padding: "5px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 500, border: "1px solid", borderColor: active ? (cfg?.color || "#7c3aed") : "#2d2d44", background: active ? ((cfg?.color || "#7c3aed") + "20") : "transparent", color: active ? (cfg?.color || "#a78bfa") : "#64748b", cursor: "pointer" }}>
                    {s === "all" ? "Todos" : STATUS_CONFIG[s].label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Orders table */}
          <div style={{ background: "#111118", border: "1px solid #2d2d44", borderRadius: "16px", overflow: "hidden" }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "64px", color: "#64748b" }}>
                <ShoppingCart size={36} style={{ margin: "0 auto 16px", opacity: 0.4 }} />
                {orders.length === 0 ? (
                  <>
                    <p style={{ fontSize: "15px", marginBottom: "8px" }}>Aún no tienes pedidos</p>
                    <Link href="/smm/services" style={{ display: "inline-block", marginTop: "12px", padding: "9px 18px", background: "#7c3aed", borderRadius: "8px", color: "white", fontSize: "13px", fontWeight: 500 }}>
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
                    <tr style={{ borderBottom: "1px solid #2d2d44" }}>
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
                              <p style={{ fontSize: "11px", color: "#7c3aed" }}>{order.category}</p>
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
                              ${order.charge.toFixed(4)}
                            </td>
                            <td style={{ padding: "13px 18px", minWidth: "100px" }}>
                              <div style={{ height: "6px", background: "#2d2d44", borderRadius: "3px", overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${progress}%`, background: order.status === "completed" ? "#34d399" : order.status === "canceled" ? "#f87171" : "#a78bfa", borderRadius: "3px", transition: "width 0.4s" }} />
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
                            <tr key={`${order.id}-exp`} style={{ background: "#0d0d18", borderBottom: "1px solid #2d2d44" }}>
                              <td colSpan={8} style={{ padding: "16px 18px 18px 48px" }}>
                                <div style={{ display: "flex", gap: "32px", flexWrap: "wrap" }}>
                                  {[
                                    { label: "ID de pedido JAP", value: `#${order.jap_order_id}` },
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
    </>
  );
}
