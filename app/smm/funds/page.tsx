"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import {
  LogOut, ArrowLeft, DollarSign, Zap,
  Clock, ExternalLink, Copy, Check, ShoppingCart, TrendingUp, AlertCircle
} from "lucide-react";
import { FarmMindLogo } from "@/app/components/FarmMindLogo";

const PRESET_AMOUNTS = [11, 20, 25, 50, 100, 200];
const MIN_AMOUNT = 11;

const CRYPTO_OPTIONS = [
  { id: "usdttrc20", label: "USDT", network: "TRC20", icon: "₮", color: "#26a17b", recommended: true },
  { id: "usdterc20", label: "USDT", network: "ERC20", icon: "₮", color: "#627eea", recommended: false },
  { id: "btc",       label: "Bitcoin", network: "BTC",   icon: "₿", color: "#f7931a", recommended: false },
  { id: "eth",       label: "Ethereum", network: "ETH",  icon: "Ξ", color: "#627eea", recommended: false },
];

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  payment_id?: string;
}

interface PaymentResult {
  payment_url: string;
  payment_id: string;
  pay_address: string;
  pay_amount: number;
  pay_currency: string;
  amount_usd: number;
}

export default function FundsPage() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [userName, setUserName] = useState("");
  const [amount, setAmount] = useState(10);
  const [customAmount, setCustomAmount] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState("usdttrc20");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [payment, setPayment] = useState<PaymentResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { checkAuth(); }, []); // eslint-disable-line

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }
    setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuario");
    fetchData();
  };

  const fetchData = async () => {
    try {
      const [ordRes, txRes] = await Promise.all([
        fetch("/api/smm/orders"),
        fetch("/api/smm/transactions"),
      ]);
      if (ordRes.ok) { const d = await ordRes.json(); setBalance(d.balance || 0); }
      if (txRes.ok) { const d = await txRes.json(); setTransactions(d.transactions || []); }
    } finally { setLoading(false); }
  };

  const finalAmount = useCustom ? parseFloat(customAmount) || 0 : amount;

  const createPayment = async () => {
    if (finalAmount < MIN_AMOUNT) { setError(`El monto mínimo es $${MIN_AMOUNT} USD (incluye comisión de red)`); return; }
    if (finalAmount > 500) { setError("El monto máximo por recarga es $500 USD"); return; }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/smm/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: finalAmount, currency: selectedCrypto }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Error creando el pago"); return; }
      setPayment(data);
    } catch { setError("Error de conexión. Intenta de nuevo."); }
    finally { setCreating(false); }
  };

  const copyAddress = async () => {
    if (!payment?.pay_address) return;
    await navigator.clipboard.writeText(payment.pay_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          .funds-preset-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
      <div style={{ minHeight: "100vh", background: "#07070e" }}>

        {/* Glassmorphism Navbar */}
        <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(7,7,14,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(124,58,237,0.15)", padding: "0 28px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
            <Link href="/" style={{ display: "flex", alignItems: "center" }}>
              <div style={{ position: "relative", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ position: "absolute", inset: "-4px", borderRadius: "50%", background: "radial-gradient(circle, #007ABF55, transparent 70%)", filter: "blur(6px)" }} />
                <FarmMindLogo size={34} />
              </div>
            </Link>
            <div style={{ width: "1px", height: "22px", background: "rgba(124,58,237,0.3)" }} />
            <div className="funds-nav-links" style={{ display: "flex", gap: "2px" }}>
              {[
                { href: "/smm", label: "Dashboard" },
                { href: "/smm/services", label: "Servicios" },
                { href: "/smm/orders", label: "Mis pedidos" },
                { href: "/smm/funds", label: "Recargar", active: true },
              ].map((item) => (
                <Link key={item.href} href={item.href} style={{ padding: "7px 14px", borderRadius: "10px", fontSize: "13px", fontWeight: item.active ? 600 : 400, color: item.active ? "#88D0F0" : "#64748b", background: item.active ? "rgba(124,58,237,0.18)" : "transparent", border: item.active ? "1px solid rgba(124,58,237,0.3)" : "1px solid transparent", transition: "all 0.15s" }}>{item.label}</Link>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 16px", borderRadius: "10px", background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)" }}>
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#34d399", animation: "pulse-glow 2s ease-in-out infinite" }} />
              <span style={{ fontSize: "13px", color: "#34d399", fontWeight: 700 }}>${balance.toFixed(2)} USD</span>
            </div>
            <button onClick={async () => { await supabase.auth.signOut(); router.push("/"); }} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "8px", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><LogOut size={15} /></button>
          </div>
        </nav>

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
              Agrega fondos a tu cuenta con crypto — acreditación automática en minutos.
            </p>
          </div>
        </div>

        <div className="funds-content" style={{ maxWidth: "960px", margin: "0 auto", padding: "32px 28px" }}>

          <div className="funds-layout" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px", alignItems: "start" }}>

            {/* Left: Form or Payment */}
            <div>
              {!payment ? (
                <div style={{ background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: "20px", padding: "28px" }}>

                  {/* Balance actual */}
                  <div style={{ background: "linear-gradient(135deg, #0f2027, #1a1040)", border: "1px solid #34d39930", borderRadius: "14px", padding: "20px", marginBottom: "28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <p style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Saldo disponible</p>
                      <p style={{ fontSize: "36px", fontWeight: 800, color: "white", marginTop: "4px" }}>${balance.toFixed(2)}</p>
                      <p style={{ fontSize: "12px", color: "#64748b" }}>USD</p>
                    </div>
                    <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "#34d39920", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <DollarSign size={28} color="#34d399" />
                    </div>
                  </div>

                  {/* Montos predefinidos */}
                  <div style={{ marginBottom: "24px" }}>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8", marginBottom: "12px" }}>Selecciona el monto a recargar</p>
                    <div className="funds-preset-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "12px" }}>
                      {PRESET_AMOUNTS.map((a) => {
                        const active = !useCustom && amount === a;
                        return (
                          <button key={a} onClick={() => { setAmount(a); setUseCustom(false); }}
                            style={{ padding: "12px", borderRadius: "12px", border: "1px solid", borderColor: active ? "#007ABF" : "#2d2d44", background: active ? "#007ABF20" : "#0a0a0f", color: active ? "white" : "#94a3b8", fontWeight: active ? 700 : 500, fontSize: "16px", cursor: "pointer", transition: "all 0.15s" }}>
                            ${a}
                          </button>
                        );
                      })}
                    </div>
                    {/* Monto personalizado */}
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#64748b", fontSize: "15px", fontWeight: 600 }}>$</span>
                      <input
                        type="number" min="1" max="500" placeholder="Monto personalizado..."
                        value={customAmount}
                        onChange={(e) => { setCustomAmount(e.target.value); setUseCustom(true); }}
                        onFocus={() => setUseCustom(true)}
                        style={{ width: "100%", background: useCustom ? "#007ABF10" : "#0a0a0f", border: "1px solid", borderColor: useCustom ? "#007ABF" : "#2d2d44", borderRadius: "12px", padding: "12px 14px 12px 28px", color: "white", fontSize: "14px", outline: "none" }} />
                    </div>
                  </div>

                  {/* Método de pago */}
                  <div style={{ marginBottom: "24px" }}>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8", marginBottom: "12px" }}>Método de pago</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      {CRYPTO_OPTIONS.map((crypto) => {
                        const active = selectedCrypto === crypto.id;
                        return (
                          <button key={crypto.id} onClick={() => setSelectedCrypto(crypto.id)}
                            style={{ padding: "14px", borderRadius: "12px", border: "1px solid", borderColor: active ? crypto.color : "#2d2d44", background: active ? crypto.color + "15" : "#0a0a0f", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", transition: "all 0.15s", position: "relative" }}>
                            <span style={{ fontSize: "22px", fontWeight: 700, color: crypto.color }}>{crypto.icon}</span>
                            <div style={{ textAlign: "left" }}>
                              <p style={{ fontSize: "13px", fontWeight: 600, color: active ? "white" : "#94a3b8" }}>{crypto.label}</p>
                              <p style={{ fontSize: "11px", color: "#64748b" }}>{crypto.network}</p>
                            </div>
                            {crypto.recommended && (
                              <span style={{ position: "absolute", top: "6px", right: "8px", fontSize: "9px", fontWeight: 700, color: "#34d399", background: "#34d39920", padding: "2px 6px", borderRadius: "4px" }}>Recomendado</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {error && (
                    <div style={{ background: "#f8717115", border: "1px solid #f8717140", borderRadius: "10px", padding: "10px 14px", marginBottom: "16px", fontSize: "13px", color: "#f87171", display: "flex", alignItems: "center", gap: "8px" }}>
                      <AlertCircle size={14} /> {error}
                    </div>
                  )}

                  {/* Resumen */}
                  {finalAmount > 0 && (
                    <div style={{ background: "#07070e", borderRadius: "10px", padding: "14px", marginBottom: "18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p style={{ fontSize: "12px", color: "#64748b" }}>Vas a recargar</p>
                        <p style={{ fontSize: "22px", fontWeight: 700, color: "white" }}>${finalAmount.toFixed(2)} <span style={{ fontSize: "13px", color: "#64748b" }}>USD</span></p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: "12px", color: "#64748b" }}>Nuevo saldo</p>
                        <p style={{ fontSize: "16px", fontWeight: 600, color: "#34d399" }}>${(balance + finalAmount).toFixed(2)}</p>
                      </div>
                    </div>
                  )}

                  <button onClick={createPayment} disabled={creating || finalAmount < MIN_AMOUNT}
                    style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "none", background: creating || finalAmount < MIN_AMOUNT ? "#3b2068" : "#007ABF", color: "white", fontSize: "15px", fontWeight: 700, cursor: creating || finalAmount < MIN_AMOUNT ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                    {creating ? (
                      <><div style={{ width: "16px", height: "16px", borderRadius: "50%", border: "2px solid white", borderTopColor: "transparent", animation: "spin 0.6s linear infinite" }} /> Generando pago...</>
                    ) : (
                      <><Zap size={16} /> Generar dirección de pago</>
                    )}
                  </button>
                  <p style={{ fontSize: "11px", color: "#64748b", textAlign: "center", marginTop: "10px" }}>
                    Mínimo $11 USD · Saldo acreditado automáticamente · Procesado por NOWPayments
                  </p>
                </div>
              ) : (
                /* Payment created — show address */
                <div style={{ background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: "20px", padding: "28px" }}>
                  <div style={{ textAlign: "center", marginBottom: "24px" }}>
                    <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "#34d39920", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                      <Clock size={26} color="#34d399" />
                    </div>
                    <h2 style={{ fontSize: "18px", fontWeight: 700, color: "white", marginBottom: "6px" }}>¡Pago creado!</h2>
                    <p style={{ fontSize: "13px", color: "#64748b" }}>Envía exactamente el monto indicado a la dirección de abajo</p>
                  </div>

                  {/* Amount to send */}
                  <div style={{ background: "#007ABF15", border: "1px solid #007ABF30", borderRadius: "12px", padding: "16px", marginBottom: "16px", textAlign: "center" }}>
                    <p style={{ fontSize: "12px", color: "#56B4E0", marginBottom: "4px" }}>Enviar exactamente</p>
                    <p style={{ fontSize: "28px", fontWeight: 800, color: "white" }}>{payment.pay_amount} <span style={{ fontSize: "16px", color: "#56B4E0" }}>{payment.pay_currency.toUpperCase()}</span></p>
                    <p style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>≈ ${payment.amount_usd.toFixed(2)} USD</p>
                  </div>

                  {/* Address */}
                  <div style={{ marginBottom: "16px" }}>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "8px" }}>Dirección de pago</p>
                    <div style={{ background: "#07070e", border: "1px solid #1e1e30", borderRadius: "10px", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                      <p style={{ fontSize: "12px", color: "#e2e8f0", fontFamily: "monospace", wordBreak: "break-all", flex: 1 }}>{payment.pay_address}</p>
                      <button onClick={copyAddress} style={{ flexShrink: 0, background: copied ? "#34d39920" : "#007ABF20", border: "none", borderRadius: "8px", padding: "8px", cursor: "pointer", color: copied ? "#34d399" : "#56B4E0" }}>
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Warning */}
                  <div style={{ background: "#fbbf2415", border: "1px solid #fbbf2430", borderRadius: "10px", padding: "12px 14px", marginBottom: "20px", fontSize: "12px", color: "#fbbf24" }}>
                    ⚠️ Envía solo {payment.pay_currency.toUpperCase()} a esta dirección. El saldo se acredita automáticamente en 1-3 confirmaciones de red.
                  </div>

                  {/* Open payment page */}
                  {payment.payment_url && (
                    <a href={payment.payment_url} target="_blank" rel="noreferrer"
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", padding: "12px", borderRadius: "12px", background: "#007ABF", color: "white", fontSize: "14px", fontWeight: 600, textDecoration: "none", marginBottom: "12px" }}>
                      <ExternalLink size={14} /> Abrir página de pago
                    </a>
                  )}
                  <button onClick={() => setPayment(null)}
                    style={{ width: "100%", padding: "11px", borderRadius: "12px", border: "1px solid #1e1e30", background: "transparent", color: "#94a3b8", fontSize: "13px", cursor: "pointer" }}>
                    ← Crear otro pago
                  </button>
                </div>
              )}
            </div>

            {/* Right: Info + Transaction history */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* How it works */}
              <div style={{ background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: "16px", padding: "20px" }}>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "white", marginBottom: "14px" }}>¿Cómo funciona?</p>
                {[
                  { n: "1", text: "Elige el monto y el método de pago" },
                  { n: "2", text: "Envía el crypto a la dirección generada" },
                  { n: "3", text: "El saldo se acredita automáticamente en minutos" },
                  { n: "4", text: "Úsalo para hacer pedidos en el panel SMM" },
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
                  <span style={{ fontSize: "13px", color: "white" }}>${transactions.filter(t => t.status === "finished").reduce((s, t) => s + t.amount, 0).toFixed(2)}</span>
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
                    <p style={{ fontSize: "13px", fontWeight: 700, color: "white" }}>Historial de recargas</p>
                  </div>
                  <div>
                    {transactions.slice(0, 8).map((tx) => {
                      const s = STATUS_STYLE[tx.status] || STATUS_STYLE.waiting;
                      return (
                        <div key={tx.id} style={{ padding: "12px 20px", borderBottom: "1px solid #1a1a2e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <p style={{ fontSize: "13px", fontWeight: 600, color: "white" }}>+${tx.amount.toFixed(2)}</p>
                            <p style={{ fontSize: "11px", color: "#64748b" }}>{tx.currency?.toUpperCase()} · {new Date(tx.created_at).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}</p>
                          </div>
                          <span style={{ fontSize: "11px", fontWeight: 600, color: s.color, background: s.bg, padding: "3px 8px", borderRadius: "6px" }}>
                            {s.label}
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

      {/* ── Floating AI button ── */}
      <Link href="/" style={{
        position: "fixed", bottom: "24px", right: "24px", zIndex: 60,
        display: "flex", alignItems: "center", gap: "10px",
        padding: "12px 20px", borderRadius: "100px",
        background: "linear-gradient(135deg, #007ABF, #005FA4)",
        boxShadow: "0 0 0 1px #007ABF80, 0 8px 32px #007ABF50",
        color: "white", fontWeight: 700, fontSize: "14px",
        textDecoration: "none",
        animation: "pulse-glow-btn 2.5s ease-in-out infinite",
      }}>
        <FarmMindLogo size={22} />
        <span>Hablar con AI</span>
      </Link>

      <style>{`@keyframes pulse-glow-btn { 0%,100% { box-shadow: 0 0 0 1px #007ABF80, 0 8px 32px #007ABF50; } 50% { box-shadow: 0 0 0 1px #007ABFcc, 0 8px 48px #007ABF80; } }`}</style>
    </>
  );
}
