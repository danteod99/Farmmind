"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import { ShoppingCart, TrendingUp, MessageCircle } from "lucide-react";
import { TrustFooter } from "@/app/components/TrustFooter";
import { SmmNav } from "@/app/components/SmmNav";
import { whatsappUrl } from "@/app/lib/whatsapp";

const RECHARGE_AMOUNTS = [10, 20, 50, 100];

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  tx_type?: string;
  description?: string;
}

const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  waiting:    { color: "#fbbf24", bg: "#fbbf2420", label: "Esperando" },
  confirming: { color: "#60a5fa", bg: "#60a5fa20", label: "Confirmando" },
  confirmed:  { color: "#34d399", bg: "#34d39920", label: "Confirmado" },
  finished:   { color: "#34d399", bg: "#34d39920", label: "Acreditado" },
  failed:     { color: "#f87171", bg: "#f8717120", label: "Fallido" },
  expired:    { color: "#64748b", bg: "#64748b20", label: "Expirado" },
};

export default function FundsPage() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userAvatar, setUserAvatar] = useState("");
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [amount, setAmount] = useState(20);

  useEffect(() => { checkAuth(); }, []); // eslint-disable-line

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }
    setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuario");
    setUserEmail(user.email || "");
    setUserAvatar(user.user_metadata?.avatar_url || "");
    try {
      const [balRes, txRes] = await Promise.all([fetch("/api/smm/balance"), fetch("/api/smm/transactions")]);
      if (balRes.ok) { const d = await balRes.json(); setBalance(d.balance || 0); }
      if (txRes.ok) { const d = await txRes.json(); setTransactions(d.transactions || []); }
    } finally { setLoading(false); }
  };

  const waLink = whatsappUrl(
    `Hola 👋 Quiero recargar $${amount} USD de saldo en TRUST MIND. Mi cuenta es ${userEmail}.`
  );

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
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .wa-btn:hover { background: #20bd5a !important; box-shadow: 0 4px 20px #25d36650 !important; }
        @media (max-width: 768px) {
          .funds-hero { padding: 28px 16px 24px !important; }
          .funds-hero h1 { font-size: 28px !important; }
          .funds-layout { grid-template-columns: 1fr !important; }
          .funds-content { padding: 20px 16px !important; }
        }
      `}</style>
      <div style={{ minHeight: "100vh", background: "#07070e" }}>
        <SmmNav balance={balance} userAvatar={userAvatar} userName={userName} userEmail={userEmail} />

        {/* Hero */}
        <div className="funds-hero" style={{ position: "relative", overflow: "hidden", background: "linear-gradient(160deg, #000C18 0%, #001530 30%, #000A14 70%, #07070e 100%)", padding: "48px 28px 40px", animation: "fade-in 0.6s ease-out" }}>
          <div style={{ position: "absolute", top: "-60px", right: "10%", width: "300px", height: "300px", borderRadius: "50%", background: "radial-gradient(circle, #007ABF30, transparent 70%)", filter: "blur(40px)", pointerEvents: "none" }} />
          <div style={{ maxWidth: "960px", margin: "0 auto", position: "relative" }}>
            <h1 style={{ fontSize: "40px", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", background: "linear-gradient(135deg, #fff 0%, #88D0F0 50%, #56B4E0 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "12px" }}>
              Recargar saldo
            </h1>
            <p style={{ fontSize: "16px", color: "#94a3b8", maxWidth: "480px", lineHeight: 1.6 }}>
              Elige el monto y coordina el pago por WhatsApp con un asesor. El saldo se acredita en tu cuenta en minutos.
            </p>
            <p style={{ fontSize: "14px", color: "#56B4E0", marginTop: "10px", fontWeight: 600 }}>
              Saldo disponible: <span style={{ color: "#34d399" }}>${balance.toFixed(2)} USD</span>
            </p>
          </div>
        </div>

        <div className="funds-content" style={{ maxWidth: "960px", margin: "0 auto", padding: "32px 28px" }}>
          <div className="funds-layout" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px", alignItems: "start" }}>

            {/* Left: elegir monto */}
            <div style={{ background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: "16px", padding: "24px" }}>
              <p style={{ fontSize: "14px", fontWeight: 700, color: "white", marginBottom: "16px" }}>¿Cuánto quieres recargar?</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "20px" }}>
                {RECHARGE_AMOUNTS.map((a) => {
                  const active = amount === a;
                  return (
                    <button key={a} onClick={() => setAmount(a)}
                      style={{ padding: "14px 0", borderRadius: "12px", border: "1px solid", borderColor: active ? "#007ABF" : "#1e1e30", background: active ? "#007ABF20" : "transparent", color: active ? "white" : "#94a3b8", fontSize: "16px", fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                      ${a}
                    </button>
                  );
                })}
              </div>
              <a href={waLink} target="_blank" rel="noreferrer" className="wa-btn"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "14px", borderRadius: "12px", background: "#25d366", color: "white", fontSize: "14px", fontWeight: 700, transition: "all 0.15s" }}>
                <MessageCircle size={16} /> Recargar ${amount} USD por WhatsApp
              </a>
              <p style={{ fontSize: "11px", color: "#5a6480", marginTop: "12px", textAlign: "center" }}>
                Aceptamos transferencia, Yape, Plin, PayPal y cripto.
              </p>
            </div>

            {/* Right: info + historial */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: "16px", padding: "20px" }}>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "white", marginBottom: "14px" }}>¿Cómo funciona?</p>
                {[
                  { n: "1", text: "Elige el monto a recargar" },
                  { n: "2", text: "Escríbenos por WhatsApp y coordina el pago" },
                  { n: "3", text: "Acreditamos el saldo en tu cuenta" },
                  { n: "4", text: "Usa el saldo para comprar cuentas" },
                ].map((s) => (
                  <div key={s.n} style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                    <div style={{ width: "22px", height: "22px", borderRadius: "6px", background: "#007ABF20", border: "1px solid #007ABF40", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#56B4E0" }}>{s.n}</span>
                    </div>
                    <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: "1.5" }}>{s.text}</p>
                  </div>
                ))}
              </div>

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
                  <span style={{ fontSize: "13px", color: "white" }}>${transactions.filter(t => t.status === "finished").reduce((s, t) => s + Number(t.amount), 0).toFixed(2)}</span>
                </div>
                <div style={{ height: "1px", background: "#2d2d44", margin: "14px 0" }} />
                <Link href="/smm/services" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "9px", borderRadius: "10px", background: "#007ABF20", color: "#56B4E0", fontSize: "13px", fontWeight: 600 }}>
                  <ShoppingCart size={13} /> Ir a comprar cuentas
                </Link>
              </div>

              {transactions.length > 0 && (
                <div style={{ background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: "16px", overflow: "hidden" }}>
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e1e30", display: "flex", alignItems: "center", gap: "8px" }}>
                    <TrendingUp size={14} color="#64748b" />
                    <p style={{ fontSize: "13px", fontWeight: 700, color: "white" }}>Historial de movimientos</p>
                  </div>
                  <div>
                    {transactions.slice(0, 12).map((tx) => {
                      const s = STATUS_STYLE[tx.status] || STATUS_STYLE.waiting;
                      const label = tx.description || tx.currency?.toUpperCase() || "Recarga";
                      const sublabel = new Date(tx.created_at).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
                      return (
                        <div key={tx.id} style={{ padding: "12px 20px", borderBottom: "1px solid #1a1a2e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <p style={{ fontSize: "13px", fontWeight: 600, color: "white" }}>+${Number(tx.amount).toFixed(2)}</p>
                            <p style={{ fontSize: "11px", color: "#64748b" }}>{label} · {sublabel}</p>
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

      <TrustFooter />
    </>
  );
}
