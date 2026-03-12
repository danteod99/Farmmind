"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import { ShoppingCart, Clock, DollarSign, TrendingUp, Plus, ArrowRight, Bot, LogOut, Zap, CheckCircle, AlertCircle, Loader } from "lucide-react";

interface Order {
  id: string;
  jap_order_id: number;
  service_name: string;
  category: string;
  link: string;
  quantity: number;
  charge: number;
  status: string;
  created_at: string;
  remains?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:     { label: "Pendiente",   color: "#fbbf24", bg: "#fbbf2420", icon: <Clock size={11} /> },
  processing:  { label: "Procesando",  color: "#60a5fa", bg: "#60a5fa20", icon: <Loader size={11} className="animate-spin" /> },
  inprogress:  { label: "En progreso", color: "#a78bfa", bg: "#a78bfa20", icon: <Zap size={11} /> },
  completed:   { label: "Completado",  color: "#34d399", bg: "#34d39920", icon: <CheckCircle size={11} /> },
  partial:     { label: "Parcial",     color: "#fb923c", bg: "#fb923c20", icon: <AlertCircle size={11} /> },
  canceled:    { label: "Cancelado",   color: "#f87171", bg: "#f8717120", icon: <AlertCircle size={11} /> },
};

export default function SMMDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [balance, setBalance] = useState(0);
  const [userName, setUserName] = useState("");
  const [userAvatar, setUserAvatar] = useState("");

  useEffect(() => {
    checkAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }
    setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuario");
    setUserAvatar(user.user_metadata?.avatar_url || "");
    fetchData();
  };

  const fetchData = async () => {
    try {
      const res = await fetch("/api/smm/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setBalance(data.balance || 0);
      }
    } finally {
      setLoading(false);
    }
  };

  const totalSpent = orders.reduce((sum, o) => sum + (o.charge || 0), 0);
  const completedOrders = orders.filter((o) => o.status === "completed").length;
  const activeOrders = orders.filter((o) => ["pending", "processing", "inprogress"].includes(o.status)).length;
  const recentOrders = orders.slice(0, 5);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "#07070e" }}>
        <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #07070e; color: #f0efff; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        a { text-decoration: none; color: inherit; }
      `}</style>
      <div style={{ minHeight: "100vh", background: "#07070e" }}>

        {/* Navbar */}
        <nav style={{ background: "#0d0d18", borderBottom: "1px solid #1e1e30", padding: "0 24px", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
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
                { href: "/smm", label: "Dashboard", active: true },
                { href: "/smm/services", label: "Servicios", active: false },
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
            {userAvatar ? <img src={userAvatar} alt={userName} style={{ width: "30px", height: "30px", borderRadius: "50%" }} /> : null}
            <button onClick={async () => { await supabase.auth.signOut(); router.push("/"); }} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center" }}>
              <LogOut size={16} />
            </button>
          </div>
        </nav>

        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 24px" }}>

          {/* Welcome */}
          <div style={{ marginBottom: "32px" }}>
            <h1 style={{ fontSize: "30px", fontWeight: 800, color: "white", letterSpacing: "-0.6px", lineHeight: "1.1" }}>
              Hola, {userName} <span style={{ display: "inline-block" }}>👋</span>
            </h1>
            <p style={{ color: "#5a6480", fontSize: "14px", marginTop: "6px", fontWeight: 500 }}>Panel SMM — gestiona tus pedidos de redes sociales</p>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "28px" }}>
            {[
              { icon: <DollarSign size={18} />, label: "Tu balance", value: `$${balance.toFixed(2)}`, sub: "USD disponible", color: "#34d399" },
              { icon: <ShoppingCart size={18} />, label: "Total pedidos", value: orders.length, sub: "todos los tiempos", color: "#a78bfa" },
              { icon: <Zap size={18} />, label: "Activos ahora", value: activeOrders, sub: "en procesamiento", color: "#fbbf24" },
              { icon: <TrendingUp size={18} />, label: "Total gastado", value: `$${totalSpent.toFixed(2)}`, sub: `${completedOrders} completados`, color: "#60a5fa" },
            ].map((s, i) => (
              <div key={i} style={{ background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: "20px", padding: "22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#5a6480", textTransform: "uppercase", letterSpacing: "0.8px" }}>{s.label}</span>
                  <div style={{ width: "36px", height: "36px", borderRadius: "12px", background: s.color + "18", display: "flex", alignItems: "center", justifyContent: "center", color: s.color }}>{s.icon}</div>
                </div>
                <p style={{ fontSize: "28px", fontWeight: 800, color: "white", letterSpacing: "-0.5px" }}>{s.value}</p>
                <p style={{ fontSize: "12px", color: "#5a6480", marginTop: "3px", fontWeight: 500 }}>{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "28px" }}>
            <Link href="/smm/services" style={{ background: "linear-gradient(135deg, #17093a, #100727)", border: "1px solid #7c3aed60", borderRadius: "20px", padding: "22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontWeight: 800, color: "white", marginBottom: "4px", fontSize: "15px", letterSpacing: "-0.2px" }}>Nuevo pedido</p>
                <p style={{ fontSize: "13px", color: "#8b5cf6", fontWeight: 500 }}>Explorar catálogo de servicios</p>
              </div>
              <div style={{ width: "44px", height: "44px", borderRadius: "14px", background: "linear-gradient(135deg, #7c3aed, #6d28d9)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 18px #7c3aed40" }}>
                <Plus size={20} color="white" />
              </div>
            </Link>
            <Link href="/smm/orders" style={{ background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: "20px", padding: "22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontWeight: 800, color: "white", marginBottom: "4px", fontSize: "15px", letterSpacing: "-0.2px" }}>Mis pedidos</p>
                <p style={{ fontSize: "13px", color: "#5a6480", fontWeight: 500 }}>{activeOrders} activos · {completedOrders} completados</p>
              </div>
              <ArrowRight size={20} color="#2a2a42" />
            </Link>
          </div>

          {/* Recent orders */}
          <div style={{ background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: "20px", overflow: "hidden" }}>
            <div style={{ padding: "18px 22px", borderBottom: "1px solid #1e1e30", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontWeight: 800, color: "white", fontSize: "15px", letterSpacing: "-0.2px" }}>Pedidos recientes</h2>
              <Link href="/smm/orders" style={{ fontSize: "12px", color: "#8b5cf6", fontWeight: 700 }}>Ver todos →</Link>
            </div>
            {recentOrders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px", color: "#64748b" }}>
                <ShoppingCart size={32} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
                <p style={{ fontSize: "14px" }}>Aún no tienes pedidos</p>
                <Link href="/smm/services" style={{ display: "inline-block", marginTop: "12px", padding: "8px 16px", background: "#7c3aed", borderRadius: "8px", color: "white", fontSize: "13px", fontWeight: 500 }}>
                  Hacer primer pedido
                </Link>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1e1e30" }}>
                    {["Servicio", "Link", "Cantidad", "Costo", "Estado", "Fecha"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "10px 20px", fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => {
                    const s = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                    return (
                      <tr key={order.id} style={{ borderBottom: "1px solid #1a1a2e" }}>
                        <td style={{ padding: "12px 20px" }}>
                          <p style={{ fontSize: "13px", color: "white", fontWeight: 500, maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{order.service_name}</p>
                          <p style={{ fontSize: "11px", color: "#64748b" }}>{order.category}</p>
                        </td>
                        <td style={{ padding: "12px 20px" }}>
                          <p style={{ fontSize: "12px", color: "#94a3b8", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{order.link}</p>
                        </td>
                        <td style={{ padding: "12px 20px", fontSize: "13px", color: "white" }}>{order.quantity.toLocaleString()}</td>
                        <td style={{ padding: "12px 20px", fontSize: "13px", color: "#34d399", fontWeight: 500 }}>${order.charge.toFixed(4)}</td>
                        <td style={{ padding: "12px 20px" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 600, color: s.color, background: s.bg }}>
                            {s.icon} {s.label}
                          </span>
                        </td>
                        <td style={{ padding: "12px 20px", fontSize: "12px", color: "#64748b" }}>
                          {new Date(order.created_at).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
