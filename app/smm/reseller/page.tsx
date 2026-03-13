"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import {
  Copy, Check, Key, DollarSign, ShoppingCart, Globe,
  ChevronDown, ChevronUp, LogOut, Zap, AlertCircle, BookOpen,
  RefreshCw
} from "lucide-react";
import { FarmMindLogo } from "@/app/components/FarmMindLogo";

// ── Types ──────────────────────────────────────────────────────────────────

interface ResellerData {
  id: string;
  api_key: string;
  company_name: string;
  custom_domain: string;
  balance: number;
  is_active: boolean;
}

interface ResellerOrder {
  jap_order_id: number;
  service_name: string;
  link: string;
  quantity: number;
  charge: number;
  status: string;
  created_at: string;
}

// ── Nav ────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { href: "/smm/services", label: "Servicios" },
  { href: "/smm/orders",   label: "Pedidos" },
  { href: "/smm/funds",    label: "Recargar" },
  { href: "/smm/reseller", label: "🔗 Revendedor", active: true },
  { href: "/smm/ai",       label: "🤖 Asistente IA" },
  { href: "https://www.scalinglatam.site", label: "🌐 Scaling Latam", external: true },
];

// ── Status badge ───────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  pending:     { bg: "#fbbf2418", color: "#fbbf24", label: "Pendiente" },
  processing:  { bg: "#007ABF18", color: "#007ABF", label: "Procesando" },
  inprogress:  { bg: "#007ABF18", color: "#56B4E0", label: "En proceso" },
  completed:   { bg: "#34d39918", color: "#34d399", label: "Completado" },
  partial:     { bg: "#fbbf2418", color: "#fbbf24", label: "Parcial" },
  canceled:    { bg: "#f8717118", color: "#f87171", label: "Cancelado" },
};

// ── Main component ─────────────────────────────────────────────────────────

export default function ResellerPage() {
  const router = useRouter();
  const [loading, setLoading]               = useState(true);
  const [reseller, setReseller]             = useState<ResellerData | null>(null);
  const [orders, setOrders]                 = useState<ResellerOrder[]>([]);
  const [copiedKey, setCopiedKey]           = useState(false);
  const [showDocs, setShowDocs]             = useState(false);
  const [showDomain, setShowDomain]         = useState(false);
  const [userBalance, setUserBalance]       = useState<number>(0);

  // ── Auth ──────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/"); return; }

      // Fetch reseller record
      const { data: res } = await supabase
        .from("smm_resellers")
        .select("id, api_key, company_name, custom_domain, balance, is_active")
        .eq("user_id", user.id)
        .single();

      if (!res) {
        // Not a reseller — redirect to services
        router.replace("/smm/services");
        return;
      }

      setReseller(res);

      // Fetch reseller orders
      const { data: ord } = await supabase
        .from("smm_orders")
        .select("jap_order_id, service_name, link, quantity, charge, status, created_at")
        .eq("reseller_id", res.id)
        .order("created_at", { ascending: false })
        .limit(50);

      setOrders(ord ?? []);

      // Fetch user balance (for loading funds)
      const { data: bal } = await supabase
        .from("smm_balances")
        .select("balance")
        .eq("user_id", user.id)
        .single();
      setUserBalance(bal?.balance ?? 0);

      setLoading(false);
    })();
  }, [router]);

  // ── Copy API key ──────────────────────────────────────────────────────

  const copyKey = () => {
    if (!reseller) return;
    navigator.clipboard.writeText(reseller.api_key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  // ── Render ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#07070e", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 36, height: 36, border: "3px solid #1e1e30", borderTopColor: "#007ABF", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (!reseller) return null;

  const apiUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/v2`
    : "https://trustmind.online/api/v2";

  return (
    <div style={{ minHeight: "100vh", background: "#07070e", color: "#f0efff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── NAV ── */}
      <nav style={{ background: "#0d0d18", borderBottom: "1px solid #1e1e30", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60, position: "sticky", top: 0, zIndex: 100 }}>
        <Link href="/smm/services" style={{ display: "flex", alignItems: "center" }}>
          <FarmMindLogo size={28} />
        </Link>
        <div className="nav-links" style={{ display: "flex", gap: 4 }}>
          {NAV_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              style={{
                padding: "6px 13px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                color: item.active ? "#007ABF" : "#94a3b8",
                background: item.active ? "#007ABF18" : "transparent",
                border: item.active ? "1px solid #007ABF30" : "1px solid transparent",
                textDecoration: "none", transition: "all 0.15s",
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <button onClick={signOut} style={{ padding: "6px 12px", borderRadius: 8, background: "#12121e", border: "1px solid #1e1e30", color: "#94a3b8", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <LogOut size={13} /> Salir
        </button>
      </nav>

      {/* ── CONTENT ── */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#f0efff", margin: "0 0 6px" }}>
            Panel Revendedor
          </h1>
          <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>
            Usa tu API key para conectar tu propio panel o child panel.
          </p>
        </div>

        {/* ── STATS ROW ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
          {[
            { icon: <DollarSign size={18} color="#007ABF" />, label: "Balance reseller", value: `$${parseFloat(String(reseller.balance)).toFixed(2)} USD`, sub: "Disponible para órdenes vía API" },
            { icon: <ShoppingCart size={18} color="#34d399" />, label: "Pedidos via API", value: orders.length.toString(), sub: "Pedidos realizados por tu panel" },
            { icon: <Zap size={18} color="#fbbf24" />, label: "Estado cuenta", value: reseller.is_active ? "Activo" : "Suspendido", sub: reseller.company_name || "Sin nombre de empresa" },
          ].map((s, i) => (
            <div key={i} style={{ background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: 12, padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                {s.icon}
                <span style={{ fontSize: 12, color: "#94a3b8" }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#f0efff", marginBottom: 2 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#5a6480" }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ── API KEY CARD ── */}
        <div style={{ background: "#0d0d18", border: "1px solid #007ABF35", borderRadius: 14, padding: 24, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <Key size={18} color="#007ABF" />
            <span style={{ fontWeight: 700, fontSize: 16 }}>Tu API Key</span>
          </div>
          <div style={{ background: "#12121e", border: "1px solid #1e1e30", borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
            <code style={{ fontSize: 13, color: "#56B4E0", letterSpacing: 1, wordBreak: "break-all", flex: 1 }}>
              {reseller.api_key}
            </code>
            <button
              onClick={copyKey}
              style={{ padding: "7px 14px", borderRadius: 8, background: copiedKey ? "#34d39918" : "#007ABF18", border: `1px solid ${copiedKey ? "#34d39940" : "#007ABF40"}`, color: copiedKey ? "#34d399" : "#007ABF", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", flexShrink: 0 }}
            >
              {copiedKey ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
            </button>
          </div>

          {/* Endpoint */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>Endpoint API:</span>
            <code style={{ fontSize: 12, color: "#56B4E0", background: "#12121e", padding: "4px 10px", borderRadius: 6, border: "1px solid #1e1e30" }}>{apiUrl}</code>
            <button onClick={() => copyText(apiUrl)} style={{ padding: "4px 8px", borderRadius: 6, background: "transparent", border: "1px solid #1e1e30", color: "#94a3b8", fontSize: 11, cursor: "pointer" }}>
              <Copy size={11} />
            </button>
          </div>
        </div>

        {/* ── API DOCS ACCORDION ── */}
        <div style={{ background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: 14, marginBottom: 20, overflow: "hidden" }}>
          <button
            onClick={() => setShowDocs(!showDocs)}
            style={{ width: "100%", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "transparent", border: "none", color: "#f0efff", cursor: "pointer" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <BookOpen size={18} color="#007ABF" />
              <span style={{ fontWeight: 700, fontSize: 15 }}>Documentación API</span>
            </div>
            {showDocs ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
          </button>

          {showDocs && (
            <div style={{ padding: "0 24px 24px", borderTop: "1px solid #1e1e30" }}>
              <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 16, marginBottom: 20 }}>
                Todos los requests son <strong style={{ color: "#f0efff" }}>POST</strong> a <code style={{ color: "#56B4E0" }}>{apiUrl}</code> con <code style={{ color: "#56B4E0" }}>Content-Type: application/x-www-form-urlencoded</code>.
              </p>

              {[
                {
                  title: "Listar servicios",
                  params: `key=${reseller.api_key}&action=services`,
                  desc: "Devuelve los servicios disponibles con tus precios configurados.",
                  response: `[{"service":1,"name":"Instagram Followers","category":"Instagram","rate":"2.50","min":"10","max":"100000"}]`,
                },
                {
                  title: "Ver balance",
                  params: `key=${reseller.api_key}&action=balance`,
                  desc: "Devuelve tu balance disponible en USD.",
                  response: `{"balance":"50.0000","currency":"USD"}`,
                },
                {
                  title: "Crear pedido",
                  params: `key=${reseller.api_key}&action=add&service=1&link=https://instagram.com/usuario&quantity=1000`,
                  desc: "Crea un nuevo pedido. Devuelve el ID del pedido.",
                  response: `{"order":98765}`,
                },
                {
                  title: "Verificar estado",
                  params: `key=${reseller.api_key}&action=status&order=98765`,
                  desc: "Consulta el estado de un pedido por su ID.",
                  response: `{"charge":"2.5000","start_count":"1234","status":"In progress","remains":"500","currency":"USD"}`,
                },
                {
                  title: "Listar pedidos",
                  params: `key=${reseller.api_key}&action=orders`,
                  desc: "Devuelve los últimos 100 pedidos realizados vía API.",
                  response: `[{"id":98765,"service":1,"link":"...","quantity":1000,"charge":"2.5000","status":"completed"}]`,
                },
              ].map((doc, i) => (
                <div key={i} style={{ marginBottom: 20, background: "#12121e", border: "1px solid #1e1e30", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ padding: "10px 16px", background: "#191928", borderBottom: "1px solid #1e1e30" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#007ABF" }}>{doc.title}</span>
                    <span style={{ fontSize: 11, color: "#5a6480", marginLeft: 8 }}>{doc.desc}</span>
                  </div>
                  <div style={{ padding: 14 }}>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>Request body:</div>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <code style={{ fontSize: 11, color: "#56B4E0", flex: 1, wordBreak: "break-all", lineHeight: 1.6 }}>
                        {doc.params}
                      </code>
                      <button onClick={() => copyText(doc.params)} style={{ padding: "3px 7px", borderRadius: 6, background: "transparent", border: "1px solid #1e1e30", color: "#5a6480", fontSize: 10, cursor: "pointer", flexShrink: 0 }}>
                        <Copy size={10} />
                      </button>
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 10, marginBottom: 4 }}>Response:</div>
                    <code style={{ fontSize: 11, color: "#34d399", wordBreak: "break-all", lineHeight: 1.6 }}>{doc.response}</code>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── CUSTOM DOMAIN ACCORDION ── */}
        <div style={{ background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: 14, marginBottom: 24, overflow: "hidden" }}>
          <button
            onClick={() => setShowDomain(!showDomain)}
            style={{ width: "100%", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "transparent", border: "none", color: "#f0efff", cursor: "pointer" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Globe size={18} color="#007ABF" />
              <span style={{ fontWeight: 700, fontSize: 15 }}>Dominio personalizado (Child Panel)</span>
              {reseller.custom_domain && (
                <span style={{ fontSize: 11, color: "#34d399", background: "#34d39918", border: "1px solid #34d39930", padding: "2px 8px", borderRadius: 20 }}>
                  {reseller.custom_domain}
                </span>
              )}
            </div>
            {showDomain ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
          </button>

          {showDomain && (
            <div style={{ padding: "0 24px 24px", borderTop: "1px solid #1e1e30" }}>
              <div style={{ background: "#007ABF10", border: "1px solid #007ABF30", borderRadius: 10, padding: 16, marginTop: 16, marginBottom: 20 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <AlertCircle size={15} color="#007ABF" style={{ marginTop: 2, flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>
                    Para tener tu propio panel con tu dominio, puedes instalar un software SMM Panel open source (como <strong style={{ color: "#f0efff" }}>SMMKing, SMPanel o cualquier panel compatible con la API v2 estándar</strong>) y conectarlo a esta API. Tu dominio apunta a tu propio panel y ese panel consume esta API con tu key.
                  </p>
                </div>
              </div>

              <p style={{ color: "#f0efff", fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Pasos para conectar tu child panel:</p>
              {[
                { num: "1", text: "Instala un software SMM panel en tu servidor (ej: SMMKing, SMPanel, etc.)" },
                { num: "2", text: `En la configuración del panel, busca "API provider" y selecciona "Custom API"` },
                { num: "3", text: `Coloca la URL del endpoint: ${apiUrl}` },
                { num: "4", text: `Coloca tu API key: ${reseller.api_key}` },
                { num: "5", text: "Importa los servicios desde la API y fija tus propios precios de venta" },
                { num: "6", text: "Apunta tu dominio (DNS) al servidor donde instalaste el panel" },
              ].map((step) => (
                <div key={step.num} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#007ABF18", border: "1px solid #007ABF40", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#007ABF", fontWeight: 700, flexShrink: 0 }}>
                    {step.num}
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>{step.text}</p>
                </div>
              ))}

              <div style={{ marginTop: 16, padding: "12px 16px", background: "#12121e", borderRadius: 8, border: "1px solid #1e1e30" }}>
                <p style={{ margin: "0 0 4px", fontSize: 12, color: "#5a6480" }}>¿Tienes tu dominio configurado? Contacta al admin para registrarlo:</p>
                <p style={{ margin: 0, fontSize: 13, color: "#56B4E0" }}>Envía un mensaje al administrador con tu dominio para activarlo.</p>
              </div>
            </div>
          )}
        </div>

        {/* ── ORDERS TABLE ── */}
        <div style={{ background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e1e30", display: "flex", alignItems: "center", gap: 10 }}>
            <ShoppingCart size={16} color="#007ABF" />
            <span style={{ fontWeight: 700, fontSize: 15 }}>Pedidos vía API</span>
            <span style={{ marginLeft: "auto", fontSize: 12, color: "#5a6480" }}>{orders.length} pedidos</span>
          </div>

          {orders.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center" }}>
              <RefreshCw size={28} color="#1e1e30" style={{ margin: "0 auto 12px" }} />
              <p style={{ color: "#5a6480", margin: 0, fontSize: 14 }}>Aún no hay pedidos vía API.</p>
              <p style={{ color: "#2a2a42", margin: "4px 0 0", fontSize: 12 }}>Los pedidos que hagas desde tu child panel aparecerán aquí.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#12121e" }}>
                    {["ID", "Servicio", "Enlace", "Cantidad", "Costo", "Estado", "Fecha"].map((h) => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#5a6480", fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o, i) => {
                    const st = STATUS_STYLE[o.status] || STATUS_STYLE.pending;
                    return (
                      <tr key={i} style={{ borderTop: "1px solid #12121e" }}>
                        <td style={{ padding: "10px 14px", color: "#5a6480", fontFamily: "monospace" }}>#{o.jap_order_id}</td>
                        <td style={{ padding: "10px 14px", color: "#f0efff", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.service_name}</td>
                        <td style={{ padding: "10px 14px", color: "#94a3b8", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.link}</td>
                        <td style={{ padding: "10px 14px", color: "#f0efff" }}>{o.quantity.toLocaleString()}</td>
                        <td style={{ padding: "10px 14px", color: "#34d399", fontWeight: 600 }}>${parseFloat(String(o.charge)).toFixed(2)}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ padding: "3px 9px", borderRadius: 20, background: st.bg, color: st.color, fontSize: 11, fontWeight: 600 }}>{st.label}</span>
                        </td>
                        <td style={{ padding: "10px 14px", color: "#5a6480", fontSize: 11, whiteSpace: "nowrap" }}>
                          {new Date(o.created_at).toLocaleDateString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
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
    </div>
  );
}
