"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import {
  ArrowLeft, Users, ShoppingCart, DollarSign,
  RefreshCw, ChevronDown, ChevronUp, LogOut,
  LayoutDashboard, Zap,
} from "lucide-react";
import { FarmMindLogo } from "@/app/components/FarmMindLogo";

// ── Types ──────────────────────────────────────────────────────────────────

interface Order {
  id: string;
  service_name: string;
  link: string;
  quantity: number;
  charge: number;
  reseller_rate: number;
  status: string;
  created_at: string;
  user_id: string;
}

interface ClientStat {
  user_id: string;
  total_orders: number;
  total_revenue: number;
  last_order: string;
}

interface Stats {
  total_orders: number;
  total_revenue: number;
  total_clients: number;
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  pending:    { bg: "#fbbf2418", color: "#fbbf24", label: "Pendiente" },
  processing: { bg: "#007ABF18", color: "#007ABF", label: "Procesando" },
  inprogress: { bg: "#007ABF18", color: "#56B4E0", label: "En proceso" },
  completed:  { bg: "#34d39918", color: "#34d399", label: "Completado" },
  partial:    { bg: "#fbbf2418", color: "#fbbf24", label: "Parcial" },
  canceled:   { bg: "#f8717118", color: "#f87171", label: "Cancelado" },
};

const NAV = [
  { href: "/smm/reseller",       label: "🔗 API & Docs" },
  { href: "/smm/reseller/admin", label: "📊 Mi Admin", active: true },
  { href: "/smm/orders",         label: "Mis pedidos" },
  { href: "/profile",            label: "⚙️ Perfil" },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function ResellerAdminPage() {
  const router = useRouter();

  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [orders,      setOrders]      = useState<Order[]>([]);
  const [clients,     setClients]     = useState<ClientStat[]>([]);
  const [stats,       setStats]       = useState<Stats | null>(null);
  const [resellerName, setResellerName] = useState("");

  const [activeSection, setActiveSection] = useState<"orders" | "clients">("orders");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const fetchData = async (token: string) => {
    const res = await fetch("/api/reseller/clients", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 403) { router.push("/profile"); return; }
    const json = await res.json();
    setOrders(json.orders ?? []);
    setClients(json.clients ?? []);
    setStats(json.stats ?? null);
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }

      // Check reseller
      const { data: res } = await supabase
        .from("smm_resellers")
        .select("id, panel_name, company_name, is_active")
        .eq("user_id", user.id)
        .single();

      if (!res) { router.push("/profile"); return; }
      if (!res.is_active) { router.push("/profile"); return; }

      setResellerName(res.panel_name || res.company_name || "Mi Panel");

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) await fetchData(session.access_token);

      setLoading(false);
    })();
  }, [router]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = async () => {
    setRefreshing(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) await fetchData(session.access_token);
    setRefreshing(false);
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const shortId = (id: string) => id.slice(0, 8).toUpperCase();

  if (loading) {
    return (
      <div style={{ height: "100vh", background: "#07070e", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "50%", border: "3px solid #007ABF30", borderTopColor: "#56B4E0", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#07070e", color: "white", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {/* ── NAV ── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, borderBottom: "1px solid #0d1117", background: "rgba(7,7,14,0.95)", backdropFilter: "blur(12px)", padding: "0 20px", height: "56px", display: "flex", alignItems: "center", gap: "10px" }}>
        <Link href="/smm/services" style={{ textDecoration: "none", display: "flex", alignItems: "center", marginRight: "6px" }}>
          <FarmMindLogo size={28} />
        </Link>
        <div style={{ width: "1px", height: "22px", background: "#1e1e30", marginRight: "4px" }} />
        {NAV.map((n) => (
          <Link key={n.href} href={n.href}
            style={{ padding: "5px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, textDecoration: "none", background: n.active ? "#007ABF18" : "transparent", border: `1px solid ${n.active ? "#007ABF40" : "transparent"}`, color: n.active ? "#56B4E0" : "#5a6480", whiteSpace: "nowrap" }}>
            {n.label}
          </Link>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={handleRefresh} disabled={refreshing}
          style={{ padding: "6px 12px", borderRadius: "8px", background: "#1a1a2e", border: "1px solid #2d2d44", color: "#5a6480", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontFamily: "inherit" }}>
          <RefreshCw size={13} style={{ animation: refreshing ? "spin 0.8s linear infinite" : "none" }} /> Actualizar
        </button>
        <button onClick={async () => { await supabase.auth.signOut(); router.push("/"); }}
          style={{ width: "34px", height: "34px", borderRadius: "8px", background: "#1a1a2e", border: "1px solid #1e1e30", color: "#5a6480", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <LogOut size={14} />
        </button>
      </nav>

      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "32px 20px", animation: "fade-in 0.4s ease-out" }}>

        {/* ── Title ── */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <LayoutDashboard size={22} color="#007ABF" />
            <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800, background: "linear-gradient(135deg, #fff, #88D0F0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Admin — {resellerName}
            </h1>
          </div>
          <p style={{ margin: "6px 0 0 32px", fontSize: "13px", color: "#5a6480" }}>Gestiona los pedidos y clientes de tu Child Panel</p>
        </div>

        {/* ── Stats cards ── */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "28px" }}>
            {[
              { icon: <DollarSign size={18} color="#34d399" />, label: "Ingresos totales", value: `$${stats.total_revenue.toFixed(2)}`, color: "#34d399", bg: "#34d39910", border: "#34d39930" },
              { icon: <ShoppingCart size={18} color="#007ABF" />, label: "Pedidos totales", value: stats.total_orders.toString(), color: "#56B4E0", bg: "#007ABF10", border: "#007ABF30" },
              { icon: <Users size={18} color="#fbbf24" />, label: "Clientes únicos", value: stats.total_clients.toString(), color: "#fbbf24", bg: "#fbbf2410", border: "#fbbf2430" },
            ].map((s) => (
              <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: "14px", padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                  {s.icon}
                  <span style={{ fontSize: "12px", color: "#5a6480" }}>{s.label}</span>
                </div>
                <p style={{ margin: 0, fontSize: "26px", fontWeight: 800, color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Section tabs ── */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          {[
            { id: "orders"  as const, label: `Pedidos (${orders.length})`,   icon: <ShoppingCart size={14} /> },
            { id: "clients" as const, label: `Clientes (${clients.length})`, icon: <Users size={14} /> },
          ].map((s) => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              style={{ padding: "8px 18px", borderRadius: "10px", fontSize: "13px", fontWeight: 600, cursor: "pointer", border: "1px solid", display: "flex", alignItems: "center", gap: "7px", fontFamily: "inherit", background: activeSection === s.id ? "#007ABF18" : "transparent", borderColor: activeSection === s.id ? "#007ABF50" : "#1e1e30", color: activeSection === s.id ? "#56B4E0" : "#5a6480" }}>
              {s.icon}{s.label}
            </button>
          ))}
        </div>

        {/* ── Orders list ── */}
        {activeSection === "orders" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {orders.length === 0 ? (
              <div style={{ background: "#0d0d1a", border: "1px solid #1a1a2e", borderRadius: "14px", padding: "48px 24px", textAlign: "center" }}>
                <ShoppingCart size={32} color="#2a2a42" style={{ marginBottom: 12 }} />
                <p style={{ margin: 0, color: "#3a3a5c", fontSize: "14px" }}>Aún no hay pedidos a través de tu panel</p>
              </div>
            ) : orders.map((o) => {
              const st = STATUS_STYLE[o.status?.toLowerCase()] ?? { bg: "#1a1a2e", color: "#5a6480", label: o.status };
              const open = expandedOrder === o.id;
              return (
                <div key={o.id} style={{ background: "#0d0d1a", border: "1px solid #1a1a2e", borderRadius: "12px", overflow: "hidden" }}>
                  <button onClick={() => setExpandedOrder(open ? null : o.id)}
                    style={{ width: "100%", background: "transparent", border: "none", cursor: "pointer", padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px", color: "inherit", fontFamily: "inherit", textAlign: "left" }}>
                    <code style={{ fontSize: "11px", color: "#56B4E0", background: "#007ABF10", padding: "3px 7px", borderRadius: "5px", flexShrink: 0 }}>#{shortId(o.id)}</code>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.service_name}</p>
                      <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#5a6480" }}>{fmt(o.created_at)}</p>
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: 700, background: st.bg, color: st.color, padding: "3px 9px", borderRadius: "6px", flexShrink: 0 }}>{st.label}</span>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "#34d399", flexShrink: 0 }}>${parseFloat(String(o.reseller_rate ?? o.charge ?? 0)).toFixed(4)}</span>
                    {open ? <ChevronUp size={14} color="#5a6480" /> : <ChevronDown size={14} color="#5a6480" />}
                  </button>
                  {open && (
                    <div style={{ borderTop: "1px solid #1a1a2e", padding: "14px 18px", display: "flex", flexDirection: "column", gap: "8px", background: "#09091a" }}>
                      <Row label="Link/URL"     value={o.link || "—"} />
                      <Row label="Cantidad"     value={o.quantity?.toString() ?? "—"} />
                      <Row label="Cliente ID"   value={shortId(o.user_id)} />
                      <Row label="Cargo reseller" value={`$${parseFloat(String(o.reseller_rate ?? 0)).toFixed(6)}`} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Clients list ── */}
        {activeSection === "clients" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {clients.length === 0 ? (
              <div style={{ background: "#0d0d1a", border: "1px solid #1a1a2e", borderRadius: "14px", padding: "48px 24px", textAlign: "center" }}>
                <Users size={32} color="#2a2a42" style={{ marginBottom: 12 }} />
                <p style={{ margin: 0, color: "#3a3a5c", fontSize: "14px" }}>Aún no hay clientes a través de tu panel</p>
              </div>
            ) : clients.map((c) => (
              <div key={c.user_id} style={{ background: "#0d0d1a", border: "1px solid #1a1a2e", borderRadius: "12px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "#007ABF15", border: "1px solid #007ABF30", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Users size={16} color="#007ABF" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "#56B4E0", fontFamily: "monospace" }}>{shortId(c.user_id)}...</p>
                  <p style={{ margin: "3px 0 0", fontSize: "11px", color: "#5a6480" }}>Último pedido: {fmt(c.last_order)}</p>
                </div>
                <div style={{ display: "flex", gap: "20px", textAlign: "right" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#34d399" }}>${c.total_revenue.toFixed(2)}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "10px", color: "#5a6480" }}>ingresos</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#56B4E0" }}>{c.total_orders}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "10px", color: "#5a6480" }}>pedidos</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick links */}
        <div style={{ marginTop: "32px", display: "flex", gap: "10px" }}>
          <Link href="/smm/reseller" style={{ padding: "10px 18px", borderRadius: "10px", background: "#0d0d1a", border: "1px solid #1a1a2e", color: "#56B4E0", textDecoration: "none", fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "7px" }}>
            <Zap size={14} /> API & Docs
          </Link>
          <Link href="/profile" style={{ padding: "10px 18px", borderRadius: "10px", background: "#0d0d1a", border: "1px solid #1a1a2e", color: "#5a6480", textDecoration: "none", fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "7px" }}>
            <ArrowLeft size={14} /> Volver al perfil
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: "12px", fontSize: "12px" }}>
      <span style={{ color: "#5a6480", minWidth: "120px", flexShrink: 0 }}>{label}</span>
      <span style={{ color: "#94a3b8", wordBreak: "break-all" }}>{value}</span>
    </div>
  );
}
