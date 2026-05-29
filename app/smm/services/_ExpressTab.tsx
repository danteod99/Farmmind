"use client";

import { useEffect, useState, useCallback } from "react";
import { Zap, Search, ShoppingCart, Loader2, Check, Copy, AlertCircle, Package, Clock } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string;
  image: string | null;
  price_usd: number;
  qty_available: number;
  min_qty: number;
  is_manual: boolean;
  guarantee_seconds: number;
  rating: number;
  category_key: string | null;
  category_name: string | null;
}

interface CategoryDef {
  key: string;
  name: string;
  emoji: string;
}

interface OrderRow {
  id: string;
  product_id: string;
  product_name: string | null;
  quantity: number;
  unit_price_usd: number;
  total_cost_usd: number;
  status: string;
  credentials_text: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

interface BuyResult {
  success?: boolean;
  status?: string;
  credentials?: string;
  message?: string;
  error?: string;
}

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  pending:    { text: "Pendiente",   color: "#5a6480" },
  processing: { text: "Procesando",  color: "#f59e0b" },
  completed:  { text: "✓ Entregado", color: "#10b981" },
  failed:     { text: "✗ Falló",     color: "#ef4444" },
  refunded:   { text: "Reembolsado", color: "#94a3b8" },
};

export default function ExpressTab({
  balance,
  onRefreshBalance,
}: {
  balance: number;
  onRefreshBalance: () => void;
}) {
  const [view, setView] = useState<"catalog" | "orders">("catalog");

  // Catálogo
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryDef[]>([]);
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);

  // Buy modal
  const [buyProduct, setBuyProduct] = useState<Product | null>(null);
  const [buyQty, setBuyQty] = useState(1);
  const [buying, setBuying] = useState(false);
  const [buyResult, setBuyResult] = useState<BuyResult | null>(null);

  // Mis pedidos
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    setProductsError(null);
    try {
      const params = new URLSearchParams({ category, per_page: "30" });
      if (search) params.set("q", search);
      const res = await fetch(`/api/accounts/products?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setProductsError(data.error || "Error cargando catálogo");
        setProducts([]);
      } else {
        setProducts(data.products || []);
        if (data.categories) setCategories(data.categories);
      }
    } catch {
      setProductsError("Error de red");
    } finally {
      setLoadingProducts(false);
    }
  }, [category, search]);

  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch("/api/accounts/orders");
      const data = await res.json();
      if (res.ok) setOrders(data.orders || []);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    if (view === "catalog") fetchProducts();
    else fetchOrders();
  }, [view, fetchProducts, fetchOrders]);

  const openBuy = (p: Product) => {
    setBuyProduct(p);
    setBuyQty(Math.max(1, p.min_qty));
    setBuyResult(null);
  };

  const closeBuy = () => {
    if (buying) return;
    setBuyProduct(null);
    setBuyResult(null);
  };

  const doBuy = async () => {
    if (!buyProduct) return;
    setBuying(true);
    setBuyResult(null);
    try {
      const res = await fetch("/api/accounts/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: buyProduct.id, quantity: buyQty }),
      });
      const data = await res.json();
      setBuyResult(data);
      if (res.ok && data.success) {
        onRefreshBalance();
        // refrescar inventario en background
        fetchProducts();
      }
    } catch {
      setBuyResult({ error: "Error de red" });
    } finally {
      setBuying(false);
    }
  };

  const copyToClipboard = (txt: string) => {
    navigator.clipboard?.writeText(txt).catch(() => {});
  };

  const totalCost = buyProduct ? Math.round(buyProduct.price_usd * buyQty * 100) / 100 : 0;
  const insufficientFunds = totalCost > balance;

  return (
    <section style={{ marginBottom: "52px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px", flexWrap: "wrap" }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #06b6d4, #0e7490)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px #06b6d450", flexShrink: 0 }}>
          <Zap size={18} color="white" />
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "white", letterSpacing: "-0.5px", lineHeight: 1.1 }}>
            Cuentas Express
          </h2>
          <p style={{ fontSize: 12, color: "#5a6480", marginTop: 2, fontWeight: 500 }}>
            Entrega instantánea — paga con saldo, recibes credenciales en segundos
          </p>
        </div>
        <div style={{ display: "flex", gap: 6, background: "rgba(255,255,255,0.04)", padding: 4, borderRadius: 12 }}>
          <button onClick={() => setView("catalog")}
            style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: view === "catalog" ? "rgba(6,182,212,0.18)" : "transparent", color: view === "catalog" ? "#06b6d4" : "#8892a4", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            🛒 Catálogo
          </button>
          <button onClick={() => setView("orders")}
            style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: view === "orders" ? "rgba(6,182,212,0.18)" : "transparent", color: view === "orders" ? "#06b6d4" : "#8892a4", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            📦 Mis pedidos
          </button>
        </div>
      </div>

      {view === "catalog" && (
        <>
          {/* Filtros */}
          <div style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
              <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#5a6480" }} />
              <input
                placeholder="Buscar productos…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") setSearch(searchInput); }}
                onBlur={() => setSearch(searchInput)}
                style={{ width: "100%", padding: "10px 12px 10px 34px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "white", fontSize: 13, fontFamily: "inherit", outline: "none" }}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 22, flexWrap: "wrap" }}>
            {[{ key: "all", name: "Todos", emoji: "✨" }, ...categories].map((c) => (
              <button key={c.key} onClick={() => setCategory(c.key)}
                style={{ padding: "7px 13px", borderRadius: 20, border: `1px solid ${category === c.key ? "#06b6d4" : "rgba(255,255,255,0.08)"}`, background: category === c.key ? "rgba(6,182,212,0.15)" : "transparent", color: category === c.key ? "#06b6d4" : "#8892a4", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {c.emoji} {c.name}
              </button>
            ))}
          </div>

          {/* Grid productos */}
          {loadingProducts ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
              <Loader2 size={28} className="animate-spin" style={{ color: "#06b6d4" }} />
            </div>
          ) : productsError ? (
            <div style={{ padding: 40, textAlign: "center", color: "#ef4444", background: "#0d0d18", borderRadius: 16, border: "1px solid rgba(239,68,68,0.2)" }}>
              <AlertCircle size={28} style={{ margin: "0 auto 8px" }} />
              {productsError}
            </div>
          ) : products.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", color: "#5a6480", background: "#0d0d18", borderRadius: 16 }}>
              <Package size={32} style={{ margin: "0 auto 10px", opacity: 0.5 }} />
              No hay productos en esta categoría
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
              {products.map((p) => (
                <ProductCard key={p.id} product={p} onBuy={() => openBuy(p)} />
              ))}
            </div>
          )}
        </>
      )}

      {view === "orders" && (
        <OrdersList orders={orders} loading={loadingOrders} onCopy={copyToClipboard} onRefresh={fetchOrders} />
      )}

      {/* Buy Modal */}
      {buyProduct && (
        <div onClick={closeBuy}
          style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#0d0d18", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 26, maxWidth: 520, width: "100%", maxHeight: "85vh", overflowY: "auto" }}>

            {buyResult?.success && buyResult.credentials ? (
              <SuccessView credentials={buyResult.credentials} productName={buyProduct.name} onCopy={copyToClipboard} onClose={closeBuy} />
            ) : buyResult?.success && buyResult.status === "processing" ? (
              <ProcessingView message={buyResult.message || "Tu pedido está procesándose."} onClose={() => { closeBuy(); setView("orders"); }} />
            ) : buyResult?.error ? (
              <div>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(239,68,68,0.15)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                  <AlertCircle size={22} color="#ef4444" />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: "white", marginBottom: 8 }}>No pudimos completar la compra</h3>
                <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.55, marginBottom: 20 }}>{buyResult.error}</p>
                <button onClick={closeBuy} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cerrar</button>
              </div>
            ) : (
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "white", marginBottom: 4 }}>Confirmar compra</h3>
                <p style={{ color: "#5a6480", fontSize: 12, marginBottom: 16 }}>Entrega instantánea de credenciales</p>

                <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 14, marginBottom: 16, border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p style={{ fontSize: 13, color: "white", fontWeight: 700, marginBottom: 6, lineHeight: 1.4 }}>{buyProduct.name}</p>
                  <p style={{ fontSize: 11, color: "#5a6480" }}>Stock: {buyProduct.qty_available} · Mín: {buyProduct.min_qty}</p>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6, letterSpacing: "0.4px", textTransform: "uppercase" }}>Cantidad</label>
                  <input type="number" min={buyProduct.min_qty} max={Math.min(buyProduct.qty_available, 100)}
                    value={buyQty}
                    onChange={(e) => setBuyQty(Math.max(buyProduct.min_qty, Math.min(parseInt(e.target.value) || 1, buyProduct.qty_available, 100)))}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "white", fontSize: 13 }}/>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", background: insufficientFunds ? "rgba(239,68,68,0.08)" : "rgba(6,182,212,0.08)", borderRadius: 10, marginBottom: 14, border: `1px solid ${insufficientFunds ? "rgba(239,68,68,0.25)" : "rgba(6,182,212,0.25)"}` }}>
                  <span style={{ fontSize: 13, color: "#94a3b8" }}>Total a pagar</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: insufficientFunds ? "#ef4444" : "#06b6d4" }}>${totalCost.toFixed(2)}</span>
                </div>

                {insufficientFunds && (
                  <p style={{ fontSize: 12, color: "#ef4444", marginBottom: 14 }}>
                    Saldo insuficiente. Tu saldo actual: ${balance.toFixed(2)}
                  </p>
                )}

                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={closeBuy} disabled={buying}
                    style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#94a3b8", fontSize: 13, fontWeight: 700, cursor: buying ? "not-allowed" : "pointer" }}>
                    Cancelar
                  </button>
                  <button onClick={doBuy} disabled={buying || insufficientFunds}
                    style={{ flex: 2, padding: "11px", borderRadius: 10, border: "none", background: insufficientFunds ? "#1a1a2e" : "linear-gradient(135deg, #06b6d4, #0891b2)", color: "white", fontSize: 13, fontWeight: 800, cursor: buying || insufficientFunds ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: insufficientFunds ? 0.4 : 1 }}>
                    {buying ? (<><Loader2 size={14} className="animate-spin"/> Procesando…</>) : (<><ShoppingCart size={14}/> Comprar ${totalCost.toFixed(2)}</>)}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function ProductCard({ product, onBuy }: { product: Product; onBuy: () => void }) {
  const lowStock = product.qty_available < 5;
  return (
    <div style={{ background: "#0d0d18", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        {product.image ? (
          <img src={product.image} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: "cover", flexShrink: 0, background: "#1a1a2e" }} />
        ) : (
          <div style={{ width: 48, height: 48, borderRadius: 10, background: "rgba(6,182,212,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#06b6d4", fontSize: 22, flexShrink: 0 }}>
            {product.category_name?.[0] || "?"}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12.5, fontWeight: 700, color: "white", lineHeight: 1.35, marginBottom: 4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{product.name}</p>
          <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 10.5, color: "#5a6480" }}>
            <span style={{ padding: "2px 7px", borderRadius: 6, background: "rgba(255,255,255,0.05)" }}>{product.category_name}</span>
            <span style={{ color: lowStock ? "#f59e0b" : "#5a6480" }}>Stock: {product.qty_available}</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
        <div>
          <p style={{ fontSize: 20, fontWeight: 800, color: "#06b6d4", lineHeight: 1 }}>${product.price_usd.toFixed(2)}</p>
          <p style={{ fontSize: 10, color: "#5a6480", marginTop: 2 }}>USD / unidad</p>
        </div>
        <button onClick={onBuy} style={{ padding: "9px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #06b6d4, #0891b2)", color: "white", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
          <ShoppingCart size={13}/> Comprar
        </button>
      </div>
    </div>
  );
}

function SuccessView({ credentials, productName, onCopy, onClose }: { credentials: string; productName: string; onCopy: (s: string) => void; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const doCopy = () => { onCopy(credentials); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
        <Check size={22} color="#10b981" />
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 800, color: "white", marginBottom: 6 }}>¡Compra completada!</h3>
      <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>{productName}</p>

      <div style={{ background: "#020410", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 10, padding: 12, marginBottom: 14 }}>
        <pre style={{ color: "#10b981", fontFamily: "ui-monospace, monospace", fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.5, margin: 0, maxHeight: 280, overflowY: "auto" }}>{credentials}</pre>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={doCopy} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "1px solid rgba(16,185,129,0.4)", background: "rgba(16,185,129,0.08)", color: "#10b981", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "inherit" }}>
          {copied ? <><Check size={14}/> Copiado</> : <><Copy size={14}/> Copiar credenciales</>}
        </button>
        <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #06b6d4, #0891b2)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          Cerrar
        </button>
      </div>
      <p style={{ fontSize: 11, color: "#5a6480", marginTop: 12, textAlign: "center" }}>
        También quedaron guardadas en &quot;Mis pedidos&quot; para que las consultes después.
      </p>
    </div>
  );
}

function ProcessingView({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(245,158,11,0.15)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
        <Clock size={22} color="#f59e0b" />
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 800, color: "white", marginBottom: 8 }}>Pedido en proceso</h3>
      <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 18, lineHeight: 1.55 }}>{message}</p>
      <button onClick={onClose} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #06b6d4, #0891b2)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", width: "100%" }}>
        Ver mis pedidos
      </button>
    </div>
  );
}

function OrdersList({ orders, loading, onCopy, onRefresh }: { orders: OrderRow[]; loading: boolean; onCopy: (s: string) => void; onRefresh: () => void }) {
  if (loading) {
    return <div style={{ padding: 60, display: "flex", justifyContent: "center" }}><Loader2 size={28} className="animate-spin" style={{ color: "#06b6d4" }}/></div>;
  }
  if (orders.length === 0) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "#5a6480", background: "#0d0d18", borderRadius: 16 }}>
        <Package size={32} style={{ margin: "0 auto 10px", opacity: 0.5 }} />
        Aún no tienes pedidos en Express
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
        <button onClick={onRefresh} style={{ padding: "6px 12px", fontSize: 11, fontWeight: 700, background: "transparent", color: "#06b6d4", border: "1px solid rgba(6,182,212,0.3)", borderRadius: 8, cursor: "pointer" }}>↻ Refrescar</button>
      </div>
      {orders.map((o) => {
        const st = STATUS_LABEL[o.status] || { text: o.status, color: "#5a6480" };
        const date = new Date(o.created_at).toLocaleString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
        return (
          <div key={o.id} style={{ background: "#0d0d18", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "white", marginBottom: 3, lineHeight: 1.3 }}>{o.product_name || "Producto"}</p>
                <p style={{ fontSize: 11, color: "#5a6480" }}>{date} · Cant: {o.quantity} · ${o.total_cost_usd.toFixed(2)}</p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: st.color, padding: "4px 10px", borderRadius: 8, background: `${st.color}18`, border: `1px solid ${st.color}40`, whiteSpace: "nowrap" }}>{st.text}</span>
            </div>
            {o.credentials_text && (
              <div style={{ background: "#020410", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 8, padding: 10, marginTop: 8 }}>
                <pre style={{ color: "#10b981", fontFamily: "ui-monospace, monospace", fontSize: 11.5, whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.5, margin: 0, maxHeight: 180, overflowY: "auto" }}>{o.credentials_text}</pre>
                <button onClick={() => onCopy(o.credentials_text!)} style={{ marginTop: 8, padding: "5px 10px", fontSize: 11, fontWeight: 700, background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 6, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Copy size={11}/> Copiar
                </button>
              </div>
            )}
            {o.error_message && o.status !== "completed" && (
              <p style={{ fontSize: 11, color: "#ef4444", marginTop: 6 }}>{o.error_message}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
