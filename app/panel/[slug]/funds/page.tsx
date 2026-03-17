"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePanel } from "../context";
import { ChildPanelNav } from "@/app/components/ChildPanelNav";
import { supabase } from "@/app/lib/supabase";
import {
  DollarSign, Copy, Check, CheckCircle, AlertCircle,
  Clock, Wallet, ArrowRight,
} from "lucide-react";

const CRYPTO_OPTIONS = [
  { id: "usdttrc20", label: "USDT (TRC20)", icon: "₮", color: "#26a17b", recommended: true },
  { id: "usdterc20", label: "USDT (ERC20)", icon: "₮", color: "#26a17b" },
  { id: "btc", label: "Bitcoin", icon: "₿", color: "#f7931a" },
  { id: "eth", label: "Ethereum", icon: "Ξ", color: "#627eea" },
];

const PRESET_AMOUNTS = [11, 20, 25, 50, 100, 200];

export default function ChildPanelFunds() {
  const { reseller, loading: panelLoading, slug, brandColor, panelName, logoUrl } = usePanel();
  const router = useRouter();

  const [user, setUser] = useState<{ id: string; name?: string; avatar?: string } | null>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  // Payment form
  const [amount, setAmount] = useState<number>(20);
  const [currency, setCurrency] = useState("usdttrc20");
  const [promoCode, setPromoCode] = useState("");
  const [creating, setCreating] = useState(false);

  // Payment result
  const [payment, setPayment] = useState<{
    payment_id: string;
    pay_address: string;
    pay_amount: string;
    pay_currency: string;
    amount_usd: number;
  } | null>(null);

  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { router.replace(`/panel/${slug}/auth`); return; }
      setUser({ id: u.id, name: u.user_metadata?.full_name || u.email?.split("@")[0], avatar: u.user_metadata?.avatar_url });

      const balRes = await fetch(`/api/panel/${slug}/balance`);
      if (balRes.ok) { const d = await balRes.json(); setBalance(d.balance || 0); }
      setLoading(false);
    })();
  }, [router, slug]);

  const createPayment = async () => {
    setCreating(true);
    try {
      const res = await fetch(`/api/panel/${slug}/create-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, currency, promo_code: promoCode || null }),
      });
      const data = await res.json();
      if (data.payment_id) {
        setPayment(data);
      } else {
        setCheckResult({ ok: false, msg: data.error || "Error creando pago" });
      }
    } catch {
      setCheckResult({ ok: false, msg: "Error de conexión" });
    } finally {
      setCreating(false);
    }
  };

  const checkPayment = async () => {
    if (!payment) return;
    setChecking(true);
    setCheckResult(null);
    try {
      const res = await fetch(`/api/panel/${slug}/check-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_id: payment.payment_id }),
      });
      const data = await res.json();
      if (data.credited) {
        setCheckResult({ ok: true, msg: data.message });
        setBalance(data.new_balance);
        setPayment(null);
      } else {
        setCheckResult({ ok: false, msg: data.message || "Pago aún no confirmado" });
      }
    } catch {
      setCheckResult({ ok: false, msg: "Error verificando" });
    } finally {
      setChecking(false);
    }
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <ChildPanelNav
        slug={slug} panelName={panelName} logoUrl={logoUrl} brandColor={bc}
        balance={balance} userName={user?.name} userAvatar={user?.avatar}
        isAuthenticated={true} activeRoute="funds"
      />

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "28px 20px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "white", marginBottom: 6 }}>Recargar saldo</h1>
        <p style={{ fontSize: 13, color: "#5a6480", marginBottom: 24 }}>
          Balance actual: <span style={{ color: "#34d399", fontWeight: 700 }}>${balance.toFixed(2)} USD</span>
        </p>

        {!payment ? (
          <>
            {/* Amount selection */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 8, display: "block", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Monto (USD) · Mínimo $11
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 10 }}>
                {PRESET_AMOUNTS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAmount(a)}
                    style={{
                      padding: "10px",
                      borderRadius: 10,
                      background: amount === a ? `${bc}18` : "#0d0d18",
                      border: `1px solid ${amount === a ? `${bc}40` : "#1e1e30"}`,
                      color: amount === a ? bc : "#94a3b8",
                      fontSize: 15,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    ${a}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={11}
                max={500}
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                placeholder="Monto personalizado"
                style={{
                  width: "100%",
                  padding: "11px 14px",
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

            {/* Crypto selection */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 8, display: "block", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Método de pago
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {CRYPTO_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCurrency(c.id)}
                    style={{
                      padding: "12px 16px",
                      borderRadius: 10,
                      background: currency === c.id ? `${c.color}12` : "#0d0d18",
                      border: `1px solid ${currency === c.id ? `${c.color}40` : "#1e1e30"}`,
                      color: currency === c.id ? c.color : "#94a3b8",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{c.icon}</span>
                    {c.label}
                    {c.recommended && (
                      <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: "#34d399", background: "#34d39918", padding: "2px 8px", borderRadius: 20 }}>
                        Recomendado
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Promo code */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 8, display: "block", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Código promo (opcional)
              </label>
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="Ej: PROMO10"
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: 10,
                  background: "#0d0d18",
                  border: "1px solid #1e1e30",
                  color: "white",
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: "1px",
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: "monospace",
                }}
              />
            </div>

            {checkResult && (
              <div style={{
                padding: "10px 14px", borderRadius: 8, marginBottom: 14,
                background: checkResult.ok ? "#34d39912" : "#f8717112",
                border: `1px solid ${checkResult.ok ? "#34d39930" : "#f8717130"}`,
                color: checkResult.ok ? "#34d399" : "#f87171", fontSize: 13,
              }}>
                {checkResult.msg}
              </div>
            )}

            {/* Create button */}
            <button
              onClick={createPayment}
              disabled={creating || amount < 11}
              style={{
                width: "100%",
                padding: "14px 20px",
                borderRadius: 12,
                background: creating ? "#1a1a2e" : bc,
                border: "none",
                color: "white",
                fontSize: 15,
                fontWeight: 700,
                cursor: creating ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {creating ? (
                <><div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid white", borderTopColor: "transparent", animation: "spin 0.6s linear infinite" }} /> Generando dirección...</>
              ) : (
                <><Wallet size={16} /> Recargar ${amount} USD</>
              )}
            </button>
          </>
        ) : (
          /* Payment details */
          <div style={{ background: "#0d0d18", border: `1px solid ${bc}30`, borderRadius: 16, padding: 24 }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: `${bc}18`, border: `1px solid ${bc}40`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <Clock size={22} color={bc} />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "white", marginBottom: 4 }}>Esperando pago</h2>
              <p style={{ fontSize: 13, color: "#5a6480" }}>Envía exactamente la cantidad indicada</p>
            </div>

            {/* Amount to send */}
            <div style={{ background: "#07070e", border: "1px solid #1e1e30", borderRadius: 10, padding: "14px 16px", marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontSize: 11, color: "#5a6480", marginBottom: 4 }}>Enviar exactamente</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: "white" }}>{payment.pay_amount} {payment.pay_currency.toUpperCase()}</p>
                </div>
                <button
                  onClick={() => copyText(String(payment.pay_amount), "amount")}
                  style={{ padding: "6px 12px", borderRadius: 8, background: `${bc}18`, border: `1px solid ${bc}40`, color: bc, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                >
                  {copied === "amount" ? <Check size={12} /> : <Copy size={12} />}
                  {copied === "amount" ? "Copiado" : "Copiar"}
                </button>
              </div>
            </div>

            {/* Address */}
            <div style={{ background: "#07070e", border: "1px solid #1e1e30", borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
              <p style={{ fontSize: 11, color: "#5a6480", marginBottom: 6 }}>A esta dirección</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <code style={{ fontSize: 12, color: bc, wordBreak: "break-all", flex: 1 }}>
                  {payment.pay_address}
                </code>
                <button
                  onClick={() => copyText(payment.pay_address, "address")}
                  style={{ padding: "6px 12px", borderRadius: 8, background: `${bc}18`, border: `1px solid ${bc}40`, color: bc, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}
                >
                  {copied === "address" ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </div>
            </div>

            {checkResult && (
              <div style={{
                padding: "10px 14px", borderRadius: 8, marginBottom: 14,
                background: checkResult.ok ? "#34d39912" : "#fbbf2412",
                border: `1px solid ${checkResult.ok ? "#34d39930" : "#fbbf2430"}`,
                color: checkResult.ok ? "#34d399" : "#fbbf24", fontSize: 13,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                {checkResult.ok ? <CheckCircle size={14} /> : <Clock size={14} />}
                {checkResult.msg}
              </div>
            )}

            {/* Check button */}
            <button
              onClick={checkPayment}
              disabled={checking}
              style={{
                width: "100%",
                padding: "12px 20px",
                borderRadius: 10,
                background: checking ? "#1a1a2e" : bc,
                border: "none",
                color: "white",
                fontSize: 14,
                fontWeight: 700,
                cursor: checking ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginBottom: 10,
              }}
            >
              {checking ? (
                <><div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid white", borderTopColor: "transparent", animation: "spin 0.6s linear infinite" }} /> Verificando...</>
              ) : (
                <><CheckCircle size={14} /> Ya pagué — verificar saldo</>
              )}
            </button>

            <button
              onClick={() => { setPayment(null); setCheckResult(null); }}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: 10,
                background: "transparent",
                border: "1px solid #1e1e30",
                color: "#5a6480",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Cancelar y volver
            </button>
          </div>
        )}
      </div>
    </>
  );
}
