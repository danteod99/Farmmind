"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import {
  ArrowLeft, Check, ShoppingCart, TrendingUp, AlertCircle,
  CreditCard, RefreshCw, X as XIcon
} from "lucide-react";
import ChatPopup from "@/app/components/ChatPopup";
import { TrustFooter } from "@/app/components/TrustFooter";
import { SmmNav } from "@/app/components/SmmNav";

const AUTORECHARGE_AMOUNTS_MONTHLY = [10, 20, 50, 100];
const AUTORECHARGE_MIN_MONTHLY = 10;
// Anual: pago único $240 = $20/mes facturado anualmente
const AUTORECHARGE_YEARLY_PRICE = 240;
const AUTORECHARGE_YEARLY_EQUIVALENT = 20;

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  payment_id?: string;
  tx_type?: string;        // 'crypto_topup' | 'card_topup' | 'commission' | 'manual_credit' | 'refund' | 'bonus'
  description?: string;
  source_commission_id?: string;
}

interface AutorechargeState {
  active: boolean;
  status?: string;
  amount_usd?: number;
  interval?: string;
  next_charge_at?: string | null;
  last_charged_at?: string | null;
  created_at?: string;
}

export default function FundsPage() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userAvatar, setUserAvatar] = useState("");
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  // Autorecharge state
  const [autorecharge, setAutorecharge] = useState<AutorechargeState>({ active: false });
  const [autorechargeAmount, setAutorechargeAmount] = useState(20);
  const [autorechargeCycle, setAutorechargeCycle] = useState<"monthly" | "yearly">("monthly");
  const [autorechargeLoading, setAutorechargeLoading] = useState(false);
  const [autorechargeError, setAutorechargeError] = useState<string | null>(null);
  const [autorechargeBanner, setAutorechargeBanner] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => { checkAuth(); }, []); // eslint-disable-line

  // Banner de redirect post-Stripe
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ar = params.get("autorecharge");
    if (ar === "success") {
      setAutorechargeBanner({ text: "¡Listo! Tu recarga quedó activa. La primera carga se acreditará en unos segundos.", ok: true });
      // Facebook Pixel: Purchase event
      const w = window as unknown as { fbq?: (...args: unknown[]) => void };
      if (typeof w.fbq === "function") {
        w.fbq("track", "Subscribe", { currency: "USD" });
      }
      // Refrescar saldo/movimientos mientras el webhook acredita (async)
      [2000, 5000, 9000].forEach((ms) => setTimeout(async () => {
        try {
          const [o, t] = await Promise.all([fetch("/api/smm/orders"), fetch("/api/smm/transactions")]);
          if (o.ok) { const d = await o.json(); setBalance(d.balance || 0); }
          if (t.ok) { const d = await t.json(); setTransactions(d.transactions || []); }
        } catch { /* no-op */ }
      }, ms));
      window.history.replaceState({}, "", "/smm/funds");
    } else if (ar === "cancel") {
      setAutorechargeBanner({ text: "Cancelaste el proceso. Tu recarga no fue activada.", ok: false });
      window.history.replaceState({}, "", "/smm/funds");
    }
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }
    setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuario");
    setUserEmail(user.email || "");
    setUserAvatar(user.user_metadata?.avatar_url || "");
    fetchData();
  };

  const fetchData = async () => {
    try {
      const [ordRes, txRes, arRes] = await Promise.all([
        fetch("/api/smm/orders"),
        fetch("/api/smm/transactions"),
        fetch("/api/smm/autorecharge"),
      ]);
      if (ordRes.ok) { const d = await ordRes.json(); setBalance(d.balance || 0); }
      if (txRes.ok) { const d = await txRes.json(); setTransactions(d.transactions || []); }
      if (arRes.ok) { const d = await arRes.json(); setAutorecharge(d); }
    } finally { setLoading(false); }
  };

  const activateAutorecharge = async () => {
    const finalAmount = autorechargeCycle === "yearly"
      ? AUTORECHARGE_YEARLY_PRICE
      : autorechargeAmount;
    if (autorechargeCycle === "monthly" && autorechargeAmount < AUTORECHARGE_MIN_MONTHLY) {
      setAutorechargeError(`El monto mínimo mensual es $${AUTORECHARGE_MIN_MONTHLY} USD`);
      return;
    }
    setAutorechargeLoading(true);
    setAutorechargeError(null);
    try {
      const res = await fetch("/api/smm/create-stripe-autorecharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: finalAmount, interval: autorechargeCycle === "yearly" ? "year" : "month" }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setAutorechargeError(data.error || "Error creando la recarga");
        return;
      }
      window.location.href = data.url;
    } catch {
      setAutorechargeError("Error de conexión. Intenta de nuevo.");
    } finally {
      setAutorechargeLoading(false);
    }
  };

  const cancelAutorecharge = async () => {
    if (!confirm("¿Cancelar la recarga automática mensual? Ya no se renovará.")) return;
    setAutorechargeLoading(true);
    setAutorechargeError(null);
    try {
      const res = await fetch("/api/smm/autorecharge", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setAutorechargeError(data.error || "Error cancelando");
        return;
      }
      setAutorecharge({ active: false });
      setAutorechargeBanner({ text: "Recarga automática cancelada. No se harán más cobros.", ok: true });
    } catch {
      setAutorechargeError("Error de conexión");
    } finally {
      setAutorechargeLoading(false);
    }
  };

  const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
    waiting:   { color: "#fbbf24", bg: "#fbbf2420", label: "Esperando" },
    confirming:{ color: "#60a5fa", bg: "#60a5fa20", label: "Confirmando" },
    confirmed: { color: "#34d399", bg: "#34d39920", label: "Confirmado" },
    finished:  { color: "#34d399", bg: "#34d39920", label: "Acreditado" },
    failed:    { color: "#f87171", bg: "#f8717120", label: "Fallido" },
    expired:   { color: "#64748b", bg: "#64748b20", label: "Expirado" },
  };

  if (loading) return (
    <div style={{ height: "100vh", background: "#07070e", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "32px", height: "32px", borderRadius: "50%", border: "2px solid #007ABF", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #07070e; color: #f0efff; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        a { text-decoration: none; color: inherit; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .5; } }
        @keyframes pulse-glow { 0%,100% { box-shadow: 0 0 0 0 #34d39940; } 50% { box-shadow: 0 0 0 6px transparent; } }
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 768px) {
          .funds-nav-links { display: none !important; }
          .funds-hero { padding: 28px 16px 24px !important; }
          .funds-hero h1 { font-size: 28px !important; }
          .funds-layout { grid-template-columns: 1fr !important; }
          .funds-content { padding: 20px 16px !important; }
        }
      `}</style>
      <div style={{ minHeight: "100vh", background: "#07070e" }}>

        {/* Glassmorphism Navbar */}
        <SmmNav
          balance={balance}
          userAvatar={userAvatar}
          userName={userName}
          userEmail={userEmail}
          links={[
            { href: "/smm/services", label: "Servicios" },
            { href: "/smm/funds", label: "Recargar", active: true },
            { href: "/cursos", label: "Mis Cursos" },
            { href: "/granjas", label: "Granjas" },
            { href: "/downloads", label: "Descargas" },
            { href: "/smm/multiediting", label: "Multiediting" },
            { href: "/smm/ai", label: "Asistente IA" },
            { href: "https://www.scalinglatam.site", label: "Scaling Latam", external: true },
          ]}
        />

        {/* Software Banner */}
        <a href="/downloads" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "10px 20px", background: "linear-gradient(90deg, #E1306C, #8134AF, #4d7cff, #1877F2)", color: "white", fontSize: 13, fontWeight: 700, textDecoration: "none", letterSpacing: "0.3px", cursor: "pointer" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 10px", borderRadius: 6, background: "rgba(255,255,255,0.2)", fontSize: 11, fontWeight: 800 }}>NUEVO</span>
          <span>TrustInsta & TrustFace Desktop — Gestiona cientos de cuentas con anti-deteccion</span>
          <span style={{ fontSize: 16 }}>→</span>
          <span style={{ fontSize: 11, opacity: 0.8, textDecoration: "underline" }}>Descargar gratis</span>
        </a>

        {/* Hero Section */}
        <div className="funds-hero" style={{ position: "relative", overflow: "hidden", background: "linear-gradient(160deg, #000C18 0%, #001530 30%, #000A14 70%, #07070e 100%)", padding: "48px 28px 40px", animation: "fade-in 0.6s ease-out" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(124,58,237,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.06) 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: "-60px", right: "10%", width: "300px", height: "300px", borderRadius: "50%", background: "radial-gradient(circle, #007ABF30, transparent 70%)", filter: "blur(40px)", pointerEvents: "none" }} />
          <div style={{ maxWidth: "960px", margin: "0 auto", position: "relative" }}>
            <Link href="/smm" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#007ABF", marginBottom: "16px", opacity: 0.8 }}>
              <ArrowLeft size={13} /> Volver al dashboard
            </Link>
            <h1 style={{ fontSize: "40px", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", background: "linear-gradient(135deg, #fff 0%, #88D0F0 50%, #56B4E0 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "12px" }}>
              Recargar saldo
            </h1>
            <p style={{ fontSize: "16px", color: "#94a3b8", maxWidth: "480px", lineHeight: 1.6 }}>
              Activa tu recarga automática por WhatsApp — tu saldo se renueva y nunca se te corta un pedido.
            </p>
            <p style={{ fontSize: "14px", color: "#56B4E0", marginTop: "10px", fontWeight: 600 }}>
              Saldo disponible: <span style={{ color: "#34d399" }}>${balance.toFixed(2)} USD</span>
            </p>
          </div>
        </div>

        <div className="funds-content" style={{ maxWidth: "960px", margin: "0 auto", padding: "32px 28px" }}>

          <div className="funds-layout" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px", alignItems: "start" }}>

            {/* Left: Auto-recarga */}
            <div>
              {/* ── Banner post-Stripe ── */}
              {autorechargeBanner && (
                <div style={{
                  marginBottom: "16px", padding: "12px 16px", borderRadius: "12px",
                  background: autorechargeBanner.ok ? "#34d39912" : "#fbbf2412",
                  border: `1px solid ${autorechargeBanner.ok ? "#34d39935" : "#fbbf2435"}`,
                  color: autorechargeBanner.ok ? "#34d399" : "#fbbf24",
                  fontSize: "13px", fontWeight: 600,
                  display: "flex", alignItems: "center", gap: "8px",
                }}>
                  {autorechargeBanner.ok ? <Check size={14} /> : <AlertCircle size={14} />}
                  {autorechargeBanner.text}
                  <button onClick={() => setAutorechargeBanner(null)}
                    style={{ marginLeft: "auto", background: "transparent", border: "none", color: "inherit", cursor: "pointer", padding: 4 }}>
                    <XIcon size={14} />
                  </button>
                </div>
              )}

              {/* ── Recarga automática con tarjeta ── */}
              <div style={{
                background: autorecharge.active
                  ? "linear-gradient(135deg, #0f2027, #1a1040)"
                  : "#0d0d18",
                border: `1px solid ${autorecharge.active ? "#34d39935" : "#1e1e30"}`,
                borderRadius: "20px", padding: "24px", marginBottom: "20px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                  <div style={{ width: "44px", height: "44px", borderRadius: "12px",
                    background: autorecharge.active ? "#34d39920" : "#007ABF20",
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {autorecharge.active ? <RefreshCw size={20} color="#34d399" /> : <CreditCard size={20} color="#56B4E0" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "15px", fontWeight: 700, color: "white" }}>
                      {autorecharge.active ? "Recarga automática activa" : "Recarga automática"}
                    </p>
                    <p style={{ fontSize: "12px", color: "#94a3b8" }}>
                      {autorecharge.active
                        ? `$${autorecharge.amount_usd?.toFixed(2)} cada mes · próximo cobro: ${autorecharge.next_charge_at ? new Date(autorecharge.next_charge_at).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }) : "—"}`
                        : "Actívala por WhatsApp y olvídate de recargar"}
                    </p>
                  </div>
                </div>

                {autorecharge.active ? (
                  <button onClick={cancelAutorecharge} disabled={autorechargeLoading}
                    style={{
                      width: "100%", padding: "12px", borderRadius: "12px",
                      background: "transparent", border: "1px solid #f8717140",
                      color: "#f87171", fontSize: "13px", fontWeight: 600,
                      cursor: autorechargeLoading ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
                    }}>
                    {autorechargeLoading ? "Cancelando..." : (<><XIcon size={14} /> Cancelar recarga automática</>)}
                  </button>
                ) : (
                  <>
                    {/* Cycle toggle */}
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: "14px" }}>
                      <div style={{ display: "inline-flex", padding: "3px", borderRadius: "10px", background: "#0a0a0f", border: "1px solid #2d2d44", gap: "2px" }}>
                        <button onClick={() => setAutorechargeCycle("monthly")}
                          style={{
                            padding: "7px 14px", borderRadius: "8px", border: "none",
                            background: autorechargeCycle === "monthly" ? "linear-gradient(135deg, #007ABF, #00B4D8)" : "transparent",
                            color: autorechargeCycle === "monthly" ? "white" : "#94a3b8",
                            fontSize: "12px", fontWeight: 700, cursor: "pointer",
                          }}>
                          Mensual
                        </button>
                        <button onClick={() => setAutorechargeCycle("yearly")}
                          style={{
                            padding: "7px 14px", borderRadius: "8px", border: "none",
                            background: autorechargeCycle === "yearly" ? "linear-gradient(135deg, #007ABF, #00B4D8)" : "transparent",
                            color: autorechargeCycle === "yearly" ? "white" : "#94a3b8",
                            fontSize: "12px", fontWeight: 700, cursor: "pointer",
                            position: "relative",
                          }}>
                          Anual
                          <span style={{ position: "absolute", top: "-7px", right: "-10px", padding: "1px 6px", borderRadius: "20px", background: "#34d399", color: "#003020", fontSize: "9px", fontWeight: 800 }}>-60%</span>
                        </button>
                      </div>
                    </div>

                    {autorechargeCycle === "monthly" ? (
                      <>
                        <p style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", marginBottom: "10px" }}>
                          Monto a recargar cada mes (mínimo $10)
                        </p>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "14px" }}>
                          {AUTORECHARGE_AMOUNTS_MONTHLY.map((a) => {
                            const active = autorechargeAmount === a;
                            return (
                              <button key={a} onClick={() => setAutorechargeAmount(a)}
                                style={{
                                  padding: "10px", borderRadius: "10px",
                                  border: "1px solid", borderColor: active ? "#007ABF" : "#2d2d44",
                                  background: active ? "#007ABF20" : "#0a0a0f",
                                  color: active ? "white" : "#94a3b8",
                                  fontWeight: active ? 700 : 500, fontSize: "14px", cursor: "pointer",
                                }}>
                                ${a}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div style={{
                        padding: "16px", borderRadius: "14px",
                        background: "linear-gradient(135deg, #001d3d, #002040)",
                        border: "1px solid #007ABF40",
                        marginBottom: "14px",
                      }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "6px", justifyContent: "center", marginBottom: "6px" }}>
                          <span style={{ fontSize: "32px", fontWeight: 900, color: "white", letterSpacing: "-0.02em" }}>${AUTORECHARGE_YEARLY_EQUIVALENT}</span>
                          <span style={{ fontSize: "13px", color: "#7dd3fc", fontWeight: 600 }}>/mes</span>
                        </div>
                        <p style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center", marginBottom: "4px" }}>
                          Pago único anual de <strong style={{ color: "white" }}>${AUTORECHARGE_YEARLY_PRICE}</strong>
                        </p>
                        <p style={{ fontSize: "11px", color: "#34d399", textAlign: "center", fontWeight: 600 }}>
                          Ahorra $360 vs plan mensual
                        </p>
                      </div>
                    )}

                    {autorechargeError && (
                      <div style={{ background: "#f8717115", border: "1px solid #f8717140", borderRadius: "10px", padding: "8px 12px", marginBottom: "12px", fontSize: "12px", color: "#f87171", display: "flex", alignItems: "center", gap: "6px" }}>
                        <AlertCircle size={12} /> {autorechargeError}
                      </div>
                    )}

                    <button onClick={activateAutorecharge} disabled={autorechargeLoading}
                      style={{
                        width: "100%", padding: "13px", borderRadius: "12px", border: "none",
                        background: autorechargeLoading ? "#3b2068" : "linear-gradient(135deg, #635bff, #007ABF)",
                        color: "white", fontSize: "14px", fontWeight: 700,
                        cursor: autorechargeLoading ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                      }}>
                      {autorechargeLoading ? (
                        <><div style={{ width: "14px", height: "14px", borderRadius: "50%", border: "2px solid white", borderTopColor: "transparent", animation: "spin 0.6s linear infinite" }} /> Abriendo WhatsApp...</>
                      ) : (
                        <><CreditCard size={15} /> Activar por WhatsApp</>
                      )}
                    </button>
                    <p style={{ fontSize: "11px", color: "#64748b", textAlign: "center", marginTop: "8px" }}>
                      Activación por WhatsApp · Cancela cuando quieras
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Right: Info + Transaction history */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* How it works */}
              <div style={{ background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: "16px", padding: "20px" }}>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "white", marginBottom: "14px" }}>¿Cómo funciona?</p>
                {[
                  { n: "1", text: "Elige el monto a recargar cada mes" },
                  { n: "2", text: "Actívala una vez por WhatsApp con un asesor" },
                  { n: "3", text: "Tu saldo se renueva automáticamente cada mes" },
                  { n: "4", text: "Cancela cuando quieras, sin compromiso" },
                ].map((s) => (
                  <div key={s.n} style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                    <div style={{ width: "22px", height: "22px", borderRadius: "6px", background: "#007ABF20", border: "1px solid #007ABF40", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#56B4E0" }}>{s.n}</span>
                    </div>
                    <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: "1.5" }}>{s.text}</p>
                  </div>
                ))}
              </div>

              {/* Quick stats */}
              <div style={{ background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: "16px", padding: "20px" }}>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "white", marginBottom: "14px" }}>Tu cuenta</p>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                  <span style={{ fontSize: "13px", color: "#64748b" }}>Balance actual</span>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#34d399" }}>${balance.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                  <span style={{ fontSize: "13px", color: "#64748b" }}>Recargas realizadas</span>
                  <span style={{ fontSize: "13px", color: "white" }}>{transactions.filter(t => t.status === "finished").length}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "13px", color: "#64748b" }}>Total recargado</span>
                  <span style={{ fontSize: "13px", color: "white" }}>${transactions.filter(t => t.status === "finished" && t.tx_type !== "commission").reduce((s, t) => s + Number(t.amount), 0).toFixed(2)}</span>
                </div>
                <div style={{ height: "1px", background: "#2d2d44", margin: "14px 0" }} />
                <Link href="/smm/services" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "9px", borderRadius: "10px", background: "#007ABF20", color: "#56B4E0", fontSize: "13px", fontWeight: 600 }}>
                  <ShoppingCart size={13} /> Ir a hacer pedidos
                </Link>
              </div>

              {/* Recent transactions */}
              {transactions.length > 0 && (
                <div style={{ background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: "16px", overflow: "hidden" }}>
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e1e30", display: "flex", alignItems: "center", gap: "8px" }}>
                    <TrendingUp size={14} color="#64748b" />
                    <p style={{ fontSize: "13px", fontWeight: 700, color: "white" }}>Historial de movimientos</p>
                  </div>
                  <div>
                    {transactions.slice(0, 12).map((tx) => {
                      const s = STATUS_STYLE[tx.status] || STATUS_STYLE.waiting;
                      const isCommission = tx.tx_type === "commission";
                      const isTopup = !tx.tx_type || tx.tx_type === "crypto_topup" || tx.tx_type === "card_topup";
                      const labelLeft = isCommission
                        ? (tx.description || "Comisión de red")
                        : isTopup
                          ? (tx.description || tx.currency?.toUpperCase() || "Recarga")
                          : (tx.description || tx.tx_type || "Movimiento");
                      const sublabel = new Date(tx.created_at).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
                      const amountColor = isCommission ? "#10b981" : "white";
                      const badge = isCommission
                        ? { color: "#10b981", bg: "rgba(16,185,129,0.18)", label: "🎁 Comisión" }
                        : s;
                      return (
                        <div key={tx.id} style={{ padding: "12px 20px", borderBottom: "1px solid #1a1a2e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <p style={{ fontSize: "13px", fontWeight: 600, color: amountColor }}>+${tx.amount.toFixed(2)}</p>
                            <p style={{ fontSize: "11px", color: "#64748b" }}>{labelLeft} · {sublabel}</p>
                          </div>
                          <span style={{ fontSize: "11px", fontWeight: 600, color: badge.color, background: badge.bg, padding: "3px 8px", borderRadius: "6px" }}>
                            {badge.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <TrustFooter />
      <ChatPopup />
    </>
  );
}
