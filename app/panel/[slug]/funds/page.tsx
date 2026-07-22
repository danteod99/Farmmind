"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePanel } from "../context";
import { ChildPanelNav } from "@/app/components/ChildPanelNav";
import { supabase } from "@/app/lib/supabase";
import {
  CheckCircle, AlertCircle, CreditCard,
} from "lucide-react";

const PRESET_AMOUNTS = [10, 20, 50, 100];
const MIN_AMOUNT = 10;

export default function ChildPanelFunds() {
  const { loading: panelLoading, slug, brandColor, panelName, logoUrl } = usePanel();
  const router = useRouter();

  const [user, setUser] = useState<{ id: string; name?: string; avatar?: string } | null>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  // Payment form
  const [amount, setAmount] = useState<number>(20);
  const [promoCode, setPromoCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [banner, setBanner] = useState<{ ok: boolean; msg: string } | null>(null);

  const refreshBalance = async () => {
    const balRes = await fetch(`/api/panel/${slug}/balance`);
    if (balRes.ok) { const d = await balRes.json(); setBalance(d.balance || 0); }
  };

  useEffect(() => {
    (async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { router.replace(`/panel/${slug}/auth`); return; }
      setUser({ id: u.id, name: u.user_metadata?.full_name || u.email?.split("@")[0], avatar: u.user_metadata?.avatar_url });
      await refreshBalance();
      setLoading(false);
    })();
  }, [router, slug]); // eslint-disable-line react-hooks/exhaustive-deps

  // Banner de redirect post-Stripe
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const topup = params.get("topup");
    if (topup === "success") {
      setBanner({ ok: true, msg: "¡Pago recibido! Tu saldo se acreditará en unos segundos." });
      [2000, 5000, 9000].forEach((ms) => setTimeout(() => { refreshBalance().catch(() => {}); }, ms));
      window.history.replaceState({}, "", `/panel/${slug}/funds`);
    } else if (topup === "cancel") {
      setBanner({ ok: false, msg: "Cancelaste el pago. No se realizó ningún cobro." });
      window.history.replaceState({}, "", `/panel/${slug}/funds`);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const createPayment = async () => {
    if (amount < MIN_AMOUNT) { setBanner({ ok: false, msg: `El monto mínimo es $${MIN_AMOUNT} USD` }); return; }
    setCreating(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/smm/create-stripe-topup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, promo_code: promoCode || null, slug }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setBanner({ ok: false, msg: data.error || "Error creando el pago" });
        return;
      }
      window.location.href = data.url;
    } catch {
      setBanner({ ok: false, msg: "Error de conexión" });
    } finally {
      setCreating(false);
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

        {banner && (
          <div style={{
            padding: "10px 14px", borderRadius: 8, marginBottom: 16,
            background: banner.ok ? "#34d39912" : "#f8717112",
            border: `1px solid ${banner.ok ? "#34d39930" : "#f8717130"}`,
            color: banner.ok ? "#34d399" : "#f87171", fontSize: 13,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            {banner.ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            {banner.msg}
          </div>
        )}

        {/* Amount selection */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 8, display: "block", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Monto (USD) · Mínimo ${MIN_AMOUNT}
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 10 }}>
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
            min={MIN_AMOUNT}
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

        {/* Pay button */}
        <button
          onClick={createPayment}
          disabled={creating || amount < MIN_AMOUNT}
          style={{
            width: "100%",
            padding: "14px 20px",
            borderRadius: 12,
            background: creating || amount < MIN_AMOUNT ? "#1a1a2e" : bc,
            border: "none",
            color: "white",
            fontSize: 15,
            fontWeight: 700,
            cursor: creating || amount < MIN_AMOUNT ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {creating ? (
            <><div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid white", borderTopColor: "transparent", animation: "spin 0.6s linear infinite" }} /> Abriendo WhatsApp...</>
          ) : (
            <><CreditCard size={16} /> Recargar por WhatsApp</>
          )}
        </button>
        <p style={{ fontSize: 11, color: "#5a6480", textAlign: "center", marginTop: 10 }}>
          Recarga y activación por WhatsApp · Te atiende un asesor
        </p>
      </div>
    </>
  );
}
