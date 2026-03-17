"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { usePanel } from "../context";
import { ChildPanelNav } from "@/app/components/ChildPanelNav";
import { supabase } from "@/app/lib/supabase";
import {
  Search, ShoppingCart, X, CheckCircle, AlertCircle,
  ChevronDown, Package,
} from "lucide-react";

interface Service {
  service: number;
  name: string;
  category: string;
  rate: string;
  min: string;
  max: string;
}

interface OrderModal {
  service: Service;
  link: string;
  quantity: number;
}

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: "#f43f8e",
  TikTok: "#00e5ff",
  YouTube: "#ff4444",
  Facebook: "#4f8ff7",
  Twitter: "#1d9bf0",
  Telegram: "#3dabdb",
  Spotify: "#1db954",
  Discord: "#5865F2",
  Twitch: "#9146FF",
};

export default function ChildPanelServices() {
  const { reseller, loading: panelLoading, slug, brandColor, panelName, logoUrl } = usePanel();
  const router = useRouter();

  const [user, setUser] = useState<{ id: string; email?: string; name?: string; avatar?: string } | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Order modal
  const [orderModal, setOrderModal] = useState<OrderModal | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderResult, setOrderResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { router.replace(`/panel/${slug}/auth`); return; }

      setUser({
        id: u.id,
        email: u.email || "",
        name: u.user_metadata?.full_name || u.email?.split("@")[0] || "",
        avatar: u.user_metadata?.avatar_url || "",
      });

      // Fetch services and balance
      const [svcRes, balRes] = await Promise.all([
        fetch(`/api/panel/${slug}/services`),
        fetch(`/api/panel/${slug}/balance`),
      ]);

      if (svcRes.ok) {
        const data = await svcRes.json();
        setServices(data.services || []);
      }

      if (balRes.ok) {
        const data = await balRes.json();
        setBalance(data.balance || 0);
      }

      setLoading(false);
    })();
  }, [router, slug]);

  // Categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(services.map((s) => s.category)));
    return cats.sort();
  }, [services]);

  // Filtered services
  const filtered = useMemo(() => {
    return services.filter((s) => {
      const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase());
      const matchCat = !selectedCategory || s.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [services, search, selectedCategory]);

  // Place order
  const placeOrder = async () => {
    if (!orderModal) return;
    setOrderLoading(true);
    setOrderResult(null);

    try {
      const res = await fetch(`/api/panel/${slug}/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: orderModal.service.service,
          link: orderModal.link,
          quantity: orderModal.quantity,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setOrderResult({ ok: true, msg: `Pedido #${data.order} creado. Cargo: $${data.charge}` });
        setBalance((b) => b - parseFloat(data.charge));
      } else {
        setOrderResult({ ok: false, msg: data.error || "Error al crear pedido" });
      }
    } catch {
      setOrderResult({ ok: false, msg: "Error de conexión" });
    } finally {
      setOrderLoading(false);
    }
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

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .svc-card:hover { transform: translateY(-2px); box-shadow: 0 8px 30px #00000040 !important; border-color: ${bc}40 !important; }
        .cat-btn:hover { background: ${bc}15 !important; color: ${bc} !important; }
        @media (max-width: 768px) {
          .svc-grid { grid-template-columns: 1fr !important; }
          .cat-scroll { flex-wrap: nowrap; overflow-x: auto; padding-bottom: 8px; }
        }
      `}</style>

      <ChildPanelNav
        slug={slug}
        panelName={panelName}
        logoUrl={logoUrl}
        brandColor={bc}
        balance={balance}
        userName={user?.name}
        userAvatar={user?.avatar}
        isAuthenticated={true}
        activeRoute="services"
      />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "white", marginBottom: 6 }}>
            Servicios
          </h1>
          <p style={{ fontSize: 13, color: "#5a6480" }}>
            {services.length} servicios disponibles en {categories.length} categorías
          </p>
        </div>

        {/* Search + Categories */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ position: "relative", marginBottom: 12 }}>
            <Search size={16} color="#5a6480" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder="Buscar servicios..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "11px 14px 11px 40px",
                borderRadius: 10,
                background: "#0d0d18",
                border: "1px solid #1e1e30",
                color: "white",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          <div className="cat-scroll" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              className="cat-btn"
              onClick={() => setSelectedCategory(null)}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                border: "1px solid",
                cursor: "pointer",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
                background: !selectedCategory ? `${bc}18` : "transparent",
                borderColor: !selectedCategory ? `${bc}40` : "#1e1e30",
                color: !selectedCategory ? bc : "#5a6480",
              }}
            >
              Todos ({services.length})
            </button>
            {categories.map((cat) => {
              const count = services.filter((s) => s.category === cat).length;
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  className="cat-btn"
                  onClick={() => setSelectedCategory(isActive ? null : cat)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    border: "1px solid",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    whiteSpace: "nowrap",
                    background: isActive ? `${PLATFORM_COLORS[cat] || bc}18` : "transparent",
                    borderColor: isActive ? `${PLATFORM_COLORS[cat] || bc}40` : "#1e1e30",
                    color: isActive ? (PLATFORM_COLORS[cat] || bc) : "#5a6480",
                    transition: "all 0.15s",
                  }}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Services Grid */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px" }}>
            <Package size={40} color="#2a2a42" style={{ marginBottom: 16 }} />
            <p style={{ color: "#5a6480", fontSize: 15, fontWeight: 600 }}>No se encontraron servicios</p>
            <p style={{ color: "#3a3a5c", fontSize: 13, marginTop: 4 }}>Intenta con otro término de búsqueda</p>
          </div>
        ) : (
          <div className="svc-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            {filtered.map((svc) => {
              const platformColor = PLATFORM_COLORS[svc.category] || bc;
              return (
                <div
                  key={svc.service}
                  className="svc-card"
                  onClick={() => setOrderModal({ service: svc, link: "", quantity: parseInt(svc.min) || 100 })}
                  style={{
                    background: "#0d0d18",
                    border: "1px solid #1e1e30",
                    borderRadius: 14,
                    padding: "18px 20px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: platformColor, boxShadow: `0 0 6px ${platformColor}60` }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: platformColor, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      {svc.category}
                    </span>
                    <span style={{ marginLeft: "auto", fontSize: 10, color: "#3a3a5c" }}>ID: {svc.service}</span>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 8, lineHeight: 1.4 }}>
                    {svc.name}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: bc }}>
                      ${parseFloat(svc.rate).toFixed(2)}
                    </span>
                    <span style={{ fontSize: 11, color: "#5a6480" }}>
                      por 1000 · min {svc.min}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── ORDER MODAL ── */}
      {orderModal && (
        <div
          onClick={() => { if (!orderLoading) { setOrderModal(null); setOrderResult(null); } }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(8px)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#0d0d18",
              border: `1px solid ${bc}30`,
              borderRadius: 18,
              padding: 28,
              width: "100%",
              maxWidth: 440,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "white", marginBottom: 4 }}>Nuevo pedido</h2>
                <p style={{ fontSize: 12, color: "#5a6480" }}>{orderModal.service.name}</p>
              </div>
              <button
                onClick={() => { setOrderModal(null); setOrderResult(null); }}
                style={{ background: "transparent", border: "none", color: "#5a6480", cursor: "pointer", padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Link */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Link / URL
              </label>
              <input
                type="url"
                placeholder="https://instagram.com/usuario"
                value={orderModal.link}
                onChange={(e) => setOrderModal({ ...orderModal, link: e.target.value })}
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: 10,
                  background: "#07070e",
                  border: "1px solid #1e1e30",
                  color: "white",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* Quantity */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Cantidad (min: {orderModal.service.min}, max: {orderModal.service.max})
              </label>
              <input
                type="number"
                min={orderModal.service.min}
                max={orderModal.service.max}
                value={orderModal.quantity}
                onChange={(e) => setOrderModal({ ...orderModal, quantity: parseInt(e.target.value) || 0 })}
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: 10,
                  background: "#07070e",
                  border: "1px solid #1e1e30",
                  color: "white",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* Cost estimate */}
            <div style={{ background: "#07070e", border: "1px solid #1e1e30", borderRadius: 10, padding: "12px 16px", marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#5a6480" }}>Costo estimado</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: bc }}>
                ${((parseFloat(orderModal.service.rate) / 1000) * orderModal.quantity).toFixed(4)}
              </span>
            </div>

            {/* Balance info */}
            <div style={{ fontSize: 12, color: "#5a6480", marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
              <span>Tu balance:</span>
              <span style={{ color: "#34d399", fontWeight: 700 }}>${balance.toFixed(2)} USD</span>
            </div>

            {/* Result message */}
            {orderResult && (
              <div style={{
                padding: "10px 14px",
                borderRadius: 8,
                marginBottom: 14,
                background: orderResult.ok ? "#34d39912" : "#f8717112",
                border: `1px solid ${orderResult.ok ? "#34d39930" : "#f8717130"}`,
                color: orderResult.ok ? "#34d399" : "#f87171",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}>
                {orderResult.ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                {orderResult.msg}
              </div>
            )}

            {/* Submit */}
            {!orderResult?.ok && (
              <button
                onClick={placeOrder}
                disabled={orderLoading || !orderModal.link || orderModal.quantity <= 0}
                style={{
                  width: "100%",
                  padding: "12px 20px",
                  borderRadius: 10,
                  background: orderLoading ? "#1a1a2e" : bc,
                  border: "none",
                  color: "white",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: orderLoading ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {orderLoading ? (
                  <>
                    <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid white", borderTopColor: "transparent", animation: "spin 0.6s linear infinite" }} />
                    Procesando...
                  </>
                ) : (
                  <>
                    <ShoppingCart size={14} /> Crear pedido
                  </>
                )}
              </button>
            )}

            {orderResult?.ok && (
              <button
                onClick={() => { setOrderModal(null); setOrderResult(null); }}
                style={{
                  width: "100%",
                  padding: "12px 20px",
                  borderRadius: 10,
                  background: "#1a1a2e",
                  border: "1px solid #2a2a42",
                  color: "#94a3b8",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Cerrar
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
