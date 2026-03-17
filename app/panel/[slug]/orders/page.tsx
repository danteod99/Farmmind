"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePanel } from "../context";
import { ChildPanelNav } from "@/app/components/ChildPanelNav";
import { supabase } from "@/app/lib/supabase";
import { ShoppingCart, Clock, CheckCircle, AlertCircle, Zap, Loader, RefreshCw } from "lucide-react";

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
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending: { label: "Pendiente", color: "#fbbf24", bg: "#fbbf2418", icon: <Clock size={11} /> },
  processing: { label: "Procesando", color: "#60a5fa", bg: "#60a5fa18", icon: <Loader size={11} /> },
  inprogress: { label: "En progreso", color: "#56B4E0", bg: "#56B4E018", icon: <Zap size={11} /> },
  completed: { label: "Completado", color: "#34d399", bg: "#34d39918", icon: <CheckCircle size={11} /> },
  partial: { label: "Parcial", color: "#fb923c", bg: "#fb923c18", icon: <AlertCircle size={11} /> },
  canceled: { label: "Cancelado", color: "#f87171", bg: "#f8717118", icon: <AlertCircle size={11} /> },
};

export default function ChildPanelOrders() {
  const { reseller, loading: panelLoading, slug, brandColor, panelName, logoUrl } = usePanel();
  const router = useRouter();

  const [user, setUser] = useState<{ id: string; name?: string; avatar?: string } | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    const [ordRes, balRes] = await Promise.all([
      fetch(`/api/panel/${slug}/orders`),
      fetch(`/api/panel/${slug}/balance`),
    ]);
    if (ordRes.ok) { const d = await ordRes.json(); setOrders(d.orders || []); }
    if (balRes.ok) { const d = await balRes.json(); setBalance(d.balance || 0); }
  };

  useEffect(() => {
    (async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { router.replace(`/panel/${slug}/auth`); return; }
      setUser({ id: u.id, name: u.user_metadata?.full_name || u.email?.split("@")[0], avatar: u.user_metadata?.avatar_url });
      await fetchData();
      setLoading(false);
    })();
  }, [router, slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const bc = brandColor;

  if (panelLoading || loading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#07070e" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${bc}30`, borderTopColor: bc, animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const totalSpent = orders.reduce((s, o) => s + (o.charge || 0), 0);

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .order-row:hover { background: #12121e !important; }`}</style>

      <ChildPanelNav
        slug={slug} panelName={panelName} logoUrl={logoUrl} brandColor={bc}
        balance={balance} userName={user?.name} userAvatar={user?.avatar}
        isAuthenticated={true} activeRoute="orders"
      />

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 20px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "white", marginBottom: 4 }}>Mis pedidos</h1>
            <p style={{ fontSize: 13, color: "#5a6480" }}>{orders.length} pedidos · ${totalSpent.toFixed(2)} total</p>
          </div>
          <button onClick={handleRefresh} disabled={refreshing}
            style={{ padding: "8px 16px", borderRadius: 8, background: "#1a1a2e", border: "1px solid #2a2a42", color: "#5a6480", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
            <RefreshCw size={13} style={{ animation: refreshing ? "spin 0.8s linear infinite" : "none" }} /> Actualizar
          </button>
        </div>

        {/* Orders table */}
        <div style={{ background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: 16, overflow: "hidden" }}>
          {orders.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 24px" }}>
              <ShoppingCart size={40} color="#2a2a42" style={{ marginBottom: 16 }} />
              <p style={{ color: "#5a6480", fontSize: 15, fontWeight: 600 }}>Aún no tienes pedidos</p>
              <p style={{ color: "#3a3a5c", fontSize: 13, marginTop: 4 }}>Explora los servicios y crea tu primer pedido</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1a1a2e" }}>
                    {["Servicio", "Link", "Cantidad", "Costo", "Estado", "Fecha"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "10px 18px", fontSize: 10, fontWeight: 700, color: "#3d4a5c", textTransform: "uppercase", letterSpacing: "0.7px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const s = STATUS_CONFIG[o.status] || STATUS_CONFIG.pending;
                    return (
                      <tr key={o.id} className="order-row" style={{ borderBottom: "1px solid #141424", transition: "background 0.1s" }}>
                        <td style={{ padding: "12px 18px" }}>
                          <p style={{ fontSize: 13, color: "white", fontWeight: 600, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{o.service_name}</p>
                          <p style={{ fontSize: 11, color: "#5a6480", margin: "2px 0 0" }}>{o.category}</p>
                        </td>
                        <td style={{ padding: "12px 18px" }}>
                          <p style={{ fontSize: 12, color: "#5a6480", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{o.link}</p>
                        </td>
                        <td style={{ padding: "12px 18px", fontSize: 13, color: "#e2e8f0", fontWeight: 600 }}>{o.quantity.toLocaleString()}</td>
                        <td style={{ padding: "12px 18px" }}>
                          <span style={{ fontSize: 13, color: "#34d399", fontWeight: 700 }}>${o.charge.toFixed(4)}</span>
                        </td>
                        <td style={{ padding: "12px 18px" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 7, fontSize: 11, fontWeight: 700, color: s.color, background: s.bg, border: `1px solid ${s.color}30` }}>
                            {s.icon} {s.label}
                          </span>
                        </td>
                        <td style={{ padding: "12px 18px", fontSize: 12, color: "#3d4a5c", fontWeight: 500, whiteSpace: "nowrap" }}>
                          {new Date(o.created_at).toLocaleDateString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
