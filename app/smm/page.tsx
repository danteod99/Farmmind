"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import { ShoppingCart, Clock, DollarSign, TrendingUp, Plus, ArrowRight, LogOut, Zap, CheckCircle, AlertCircle, Loader } from "lucide-react";
import { FarmMindLogo } from "@/app/components/FarmMindLogo";
import { isAdmin } from "@/app/lib/admin";
import ChatPopup from "@/app/components/ChatPopup";

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
  pending:    { label: "Pendiente",   color: "#fbbf24", bg: "#fbbf2418", icon: <Clock size={11} /> },
  processing: { label: "Procesando",  color: "#60a5fa", bg: "#60a5fa18", icon: <Loader size={11} className="animate-spin" /> },
  inprogress: { label: "En progreso", color: "#56B4E0", bg: "#56B4E018", icon: <Zap size={11} /> },
  completed:  { label: "Completado",  color: "#34d399", bg: "#34d39918", icon: <CheckCircle size={11} /> },
  partial:    { label: "Parcial",     color: "#fb923c", bg: "#fb923c18", icon: <AlertCircle size={11} /> },
  canceled:   { label: "Cancelado",   color: "#f87171", bg: "#f8717118", icon: <AlertCircle size={11} /> },
};

export default function SMMDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [balance, setBalance] = useState(0);
  const [userName, setUserName] = useState("");
  const [userAvatar, setUserAvatar] = useState("");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => { checkAuth(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }
    // Block panel_client users
    if (user.user_metadata?.role === "panel_client" && user.user_metadata?.panel_slug) {
      router.replace(`/panel/${user.user_metadata.panel_slug}/services`);
      return;
    }
    // Services is now the main entry point
    router.replace("/smm/services");
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
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "#07070e", flexDirection: "column", gap: "16px" }}>
        <div style={{ width: "48px", height: "48px", borderRadius: "50%", border: "3px solid #007ABF30", borderTopColor: "#007ABF", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "#5a6480", fontSize: "13px", fontWeight: 500 }}>Cargando panel...</p>
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
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 12px #007ABF40; }
          50% { box-shadow: 0 0 30px #007ABF80; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        .stat-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .stat-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px #00000050 !important; }
        .nav-link:hover { color: #88D0F0 !important; }
        .action-link { transition: all 0.15s ease; }
        .action-link:hover { transform: translateY(-3px); box-shadow: 0 12px 40px #00000060 !important; }
        .row-hover:hover { background: #110c20 !important; }

        @media (max-width: 768px) {
          .smm-nav-links { display: none !important; }
          .smm-stats-grid { grid-template-columns: 1fr 1fr !important; gap: 12px !important; }
          .smm-hero { padding: 28px 16px 24px !important; }
          .smm-hero h1 { font-size: 28px !important; letter-spacing: -0.5px !important; }
          .smm-hero-row { flex-direction: column !important; gap: 16px !important; }
          .smm-content { padding: 20px 16px !important; }
          .smm-orders-table { overflow-x: auto; }
          .smm-orders-table table { min-width: 480px; }
          .smm-quick-actions { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .smm-stats-grid { grid-template-columns: 1fr !important; }
          .smm-nav-balance span { display: none; }
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
            <div className="smm-nav-links" style={{ display: "flex", gap: "2px" }}>
              {[
                { href: "/smm", label: "Dashboard", active: true },
                { href: "/smm/services", label: "Servicios" },
                { href: "/smm/orders", label: "Pedidos" },
                { href: "/smm/funds", label: "Recargar" },
              ].map((item) => (
                <Link key={item.href} href={item.href} className="nav-link"
                  style={{ padding: "6px 14px", borderRadius: "8px", fontSize: "13px", transition: "all 0.15s", fontWeight: item.active ? 700 : 500, color: item.active ? "#88D0F0" : "#5a6480", background: item.active ? "#007ABF20" : "transparent", border: `1px solid ${item.active ? "#007ABF40" : "transparent"}` }}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Link href="/smm/funds" style={{ padding: "7px 14px", borderRadius: "10px", background: "#34d39912", border: "1px solid #34d39935", display: "flex", alignItems: "center", gap: "7px", textDecoration: "none", cursor: "pointer" }}>
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#34d399", boxShadow: "0 0 8px #34d399" }} />
              <span style={{ fontSize: "13px", color: "#34d399", fontWeight: 700 }}>${balance.toFixed(2)} USD</span>
            </Link>
            <Link href="/profile" style={{ width: "36px", height: "36px", borderRadius: "50%", overflow: "hidden", border: "2px solid #2a2a42", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1a2e", flexShrink: 0, textDecoration: "none" }}>
              {userAvatar ? (
                <img src={userAvatar} alt={userName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              )}
            </Link>
            {isAdmin(userEmail) && (
              <Link href="/admin" style={{ padding: "6px 12px", borderRadius: "8px", background: "#1a0a2e", border: "1px solid #3a1a5e", color: "#a78bfa", fontSize: "12px", fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", gap: "5px" }}>
                ⚙️ Admin
              </Link>
            )}
            <button onClick={async () => { await supabase.auth.signOut(); router.push("/"); }}
              style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#1a1a2e", border: "1px solid #1e1e30", color: "#5a6480", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
              <LogOut size={14} />
            </button>
          </div>
        </nav>

        {/* ━━━ HERO SECTION ━━━ */}
        <div style={{
          position: "relative", overflow: "hidden",
          background: "linear-gradient(160deg, #000C18 0%, #001530 35%, #000A14 65%, #07070e 100%)",
          borderBottom: "1px solid #002860",
          padding: "52px 28px 48px",
        }} className="smm-hero">
          {/* Background decoration */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <div style={{ position: "absolute", top: "-80px", right: "5%", width: "380px", height: "380px", borderRadius: "50%", background: "radial-gradient(circle, #007ABF50 0%, transparent 65%)", filter: "blur(60px)" }} />
            <div style={{ position: "absolute", bottom: "-60px", left: "20%", width: "240px", height: "240px", borderRadius: "50%", background: "radial-gradient(circle, #a855f730 0%, transparent 70%)", filter: "blur(50px)" }} />
            <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(#007ABF08 1px, transparent 1px), linear-gradient(90deg, #007ABF08 1px, transparent 1px)", backgroundSize: "60px 60px", maskImage: "radial-gradient(ellipse 80% 100% at 50% 0%, black 40%, transparent 100%)" }} />
          </div>

          <div style={{ maxWidth: "1100px", margin: "0 auto", position: "relative", zIndex: 1 }}>
            <div className="smm-hero-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "20px" }}>
              <div>
                {/* Label chip */}
                <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "5px 14px", borderRadius: "20px", background: "linear-gradient(135deg, #007ABF25, #a855f715)", border: "1px solid #007ABF50", marginBottom: "16px" }}>
                  <Zap size={11} color="#56B4E0" />
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#56B4E0", letterSpacing: "0.8px", textTransform: "uppercase" }}>Growth Dashboard</span>
                </div>

                <h1 style={{ fontSize: "44px", fontWeight: 800, color: "white", letterSpacing: "-1.5px", lineHeight: "1.05", marginBottom: "12px" }}>
                  Hola, {userName.split(" ")[0]}<br />
                  <span style={{ background: "linear-gradient(90deg, #e9d5ff 0%, #a855f7 40%, #007ABF 80%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                    bienvenido de vuelta.
                  </span>
                </h1>
                <p style={{ fontSize: "15px", color: "#8892a4", lineHeight: "1.6" }}>
                  Gestiona tus pedidos de redes sociales desde aquí
                </p>
              </div>

              {/* Quick balance card */}
              <div style={{ background: "linear-gradient(135deg, #007ABF25, #5b21b618)", border: "1px solid #007ABF40", borderRadius: "20px", padding: "22px 28px", textAlign: "center", minWidth: "160px" }}>
                <p style={{ fontSize: "11px", color: "#1E90D4", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "8px" }}>Balance</p>
                <p style={{ fontSize: "32px", fontWeight: 800, color: "white", letterSpacing: "-1px", lineHeight: "1" }}>${balance.toFixed(2)}</p>
                <p style={{ fontSize: "11px", color: "#5a6480", marginTop: "4px" }}>USD disponible</p>
                <Link href="/smm/funds" style={{ display: "inline-block", marginTop: "12px", padding: "6px 14px", borderRadius: "8px", background: "#007ABF", color: "white", fontSize: "11px", fontWeight: 700, boxShadow: "0 0 14px #007ABF40" }}>
                  + Recargar
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="smm-content" style={{ maxWidth: "1100px", margin: "0 auto", padding: "36px 24px" }}>

          {/* ━━━ STATS GRID ━━━ */}
          <div className="smm-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "28px" }}>
            {[
              {
                icon: <DollarSign size={20} />, label: "Tu balance",
                value: `$${balance.toFixed(2)}`, sub: "USD disponible",
                color: "#34d399", gradient: "linear-gradient(135deg, #34d39920, #34d39908)",
                border: "#34d39930",
              },
              {
                icon: <ShoppingCart size={20} />, label: "Total pedidos",
                value: String(orders.length), sub: "todos los tiempos",
                color: "#56B4E0", gradient: "linear-gradient(135deg, #56B4E020, #56B4E008)",
                border: "#56B4E030",
              },
              {
                icon: <Zap size={20} />, label: "Activos ahora",
                value: String(activeOrders), sub: "en procesamiento",
                color: "#fbbf24", gradient: "linear-gradient(135deg, #fbbf2420, #fbbf2408)",
                border: "#fbbf2430",
              },
              {
                icon: <TrendingUp size={20} />, label: "Total gastado",
                value: `$${totalSpent.toFixed(2)}`, sub: `${completedOrders} completados`,
                color: "#60a5fa", gradient: "linear-gradient(135deg, #60a5fa20, #60a5fa08)",
                border: "#60a5fa30",
              },
            ].map((s, i) => (
              <div key={i} className="stat-card"
                style={{ background: "#0d0d18", border: `1px solid ${s.border}`, borderRadius: "20px", padding: "22px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, right: 0, width: "80px", height: "80px", background: `radial-gradient(circle at top right, ${s.color}18, transparent)`, pointerEvents: "none" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#5a6480", textTransform: "uppercase", letterSpacing: "0.8px" }}>{s.label}</span>
                  <div style={{ width: "38px", height: "38px", borderRadius: "12px", background: s.gradient, border: `1px solid ${s.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: s.color }}>
                    {s.icon}
                  </div>
                </div>
                <p style={{ fontSize: "30px", fontWeight: 800, color: "white", letterSpacing: "-0.8px", lineHeight: "1" }}>{s.value}</p>
                <p style={{ fontSize: "12px", color: "#5a6480", marginTop: "5px", fontWeight: 500 }}>{s.sub}</p>
              </div>
            ))}
          </div>

          {/* ━━━ QUICK ACTIONS ━━━ */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "28px" }}>
            <Link href="/smm/services" className="action-link"
              style={{ position: "relative", overflow: "hidden", background: "linear-gradient(135deg, #1a0640 0%, #0e0228 50%, #12062e 100%)", border: "1px solid #007ABF50", borderRadius: "22px", padding: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 4px 24px #007ABF20" }}>
              <div style={{ position: "absolute", top: "-30px", right: "-30px", width: "160px", height: "160px", borderRadius: "50%", background: "radial-gradient(circle, #007ABF40, transparent)", filter: "blur(30px)" }} />
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "3px 10px", borderRadius: "6px", background: "#007ABF25", border: "1px solid #007ABF40", marginBottom: "10px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#56B4E0", letterSpacing: "0.5px" }}>NUEVO PEDIDO</span>
                </div>
                <p style={{ fontWeight: 800, color: "white", fontSize: "18px", letterSpacing: "-0.4px", lineHeight: "1.2" }}>Explorar catálogo</p>
                <p style={{ fontSize: "13px", color: "#1E90D4", marginTop: "4px", fontWeight: 500 }}>Social Media + Cuentas premium</p>
              </div>
              <div style={{ width: "52px", height: "52px", borderRadius: "16px", background: "linear-gradient(135deg, #007ABF, #005F96)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 24px #007ABF60", animation: "pulse-glow 3s ease infinite", flexShrink: 0, zIndex: 1 }}>
                <Plus size={22} color="white" />
              </div>
            </Link>

            <Link href="/smm/orders" className="action-link"
              style={{ background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: "22px", padding: "24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "3px 10px", borderRadius: "6px", background: "#1e1e30", marginBottom: "10px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#5a6480", letterSpacing: "0.5px" }}>MIS PEDIDOS</span>
                </div>
                <p style={{ fontWeight: 800, color: "white", fontSize: "18px", letterSpacing: "-0.4px", lineHeight: "1.2" }}>Historial completo</p>
                <p style={{ fontSize: "13px", color: "#5a6480", marginTop: "4px" }}>
                  <span style={{ color: "#fbbf24", fontWeight: 700 }}>{activeOrders} activos</span>
                  {" · "}
                  <span style={{ color: "#34d399", fontWeight: 700 }}>{completedOrders} completados</span>
                </p>
              </div>
              <div style={{ width: "52px", height: "52px", borderRadius: "16px", background: "#1a1a2e", border: "1px solid #2a2a42", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <ArrowRight size={20} color="#5a6480" />
              </div>
            </Link>
          </div>

          {/* ━━━ RECENT ORDERS ━━━ */}
          <div style={{ background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: "22px", overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #1e1e30", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ fontWeight: 800, color: "white", fontSize: "16px", letterSpacing: "-0.3px" }}>Pedidos recientes</h2>
                <p style={{ fontSize: "12px", color: "#5a6480", marginTop: "2px" }}>Últimas 5 órdenes</p>
              </div>
              <Link href="/smm/orders" style={{ fontSize: "12px", color: "#1E90D4", fontWeight: 700, padding: "6px 12px", borderRadius: "8px", background: "#007ABF15", border: "1px solid #007ABF30" }}>Ver todos →</Link>
            </div>

            {recentOrders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 40px", color: "#5a6480" }}>
                <div style={{ width: "64px", height: "64px", borderRadius: "20px", background: "#1a1a2e", border: "1px solid #2a2a42", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <ShoppingCart size={28} color="#3d3d5c" />
                </div>
                <p style={{ fontSize: "15px", fontWeight: 700, color: "#8892a4", marginBottom: "6px" }}>Aún no tienes pedidos</p>
                <p style={{ fontSize: "13px", marginBottom: "20px" }}>Empieza explorando nuestro catálogo</p>
                <Link href="/smm/services" style={{ display: "inline-block", padding: "10px 24px", background: "linear-gradient(135deg, #007ABF, #005F96)", borderRadius: "10px", color: "white", fontSize: "13px", fontWeight: 700, boxShadow: "0 0 20px #007ABF40" }}>
                  Ver catálogo →
                </Link>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1a1a2e" }}>
                    {["Servicio", "Link", "Cantidad", "Costo", "Estado", "Fecha"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "10px 22px", fontSize: "10px", fontWeight: 700, color: "#3d4a5c", textTransform: "uppercase", letterSpacing: "0.7px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order, idx) => {
                    const s = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                    return (
                      <tr key={order.id} className="row-hover" style={{ borderBottom: idx < recentOrders.length - 1 ? "1px solid #141424" : "none", transition: "background 0.1s" }}>
                        <td style={{ padding: "13px 22px" }}>
                          <p style={{ fontSize: "13px", color: "white", fontWeight: 600, maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{order.service_name}</p>
                          <p style={{ fontSize: "11px", color: "#5a6480", marginTop: "2px" }}>{order.category}</p>
                        </td>
                        <td style={{ padding: "13px 22px" }}>
                          <p style={{ fontSize: "12px", color: "#5a6480", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{order.link}</p>
                        </td>
                        <td style={{ padding: "13px 22px", fontSize: "13px", color: "#e2e8f0", fontWeight: 600 }}>{order.quantity.toLocaleString()}</td>
                        <td style={{ padding: "13px 22px" }}>
                          <span style={{ fontSize: "13px", color: "#34d399", fontWeight: 700, textShadow: "0 0 10px #34d39930" }}>${order.charge.toFixed(4)}</span>
                        </td>
                        <td style={{ padding: "13px 22px" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 10px", borderRadius: "7px", fontSize: "11px", fontWeight: 700, color: s.color, background: s.bg, border: `1px solid ${s.color}30` }}>
                            {s.icon} {s.label}
                          </span>
                        </td>
                        <td style={{ padding: "13px 22px", fontSize: "12px", color: "#3d4a5c", fontWeight: 500 }}>
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

      <ChatPopup />
    </>
  );
}
