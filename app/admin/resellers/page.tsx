"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import { isAdmin } from "@/app/lib/admin";
import {
  Plus, ChevronDown, ChevronUp, Copy, Check, DollarSign,
  Users, Globe, ToggleLeft, ToggleRight, ArrowLeft, RefreshCw,
  Tag, Pencil, Save, X
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

interface Reseller {
  id: string;
  user_id: string;
  email: string;
  api_key: string;
  company_name: string;
  custom_domain: string;
  balance: number;
  is_active: boolean;
  created_at: string;
}

interface ServiceWithPrice {
  service_id: number;
  service_name: string;
  category: string;
  jap_rate: number;
  reseller_rate: number | null;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function AdminResellersPage() {
  const router = useRouter();
  const [loading, setLoading]       = useState(true);
  const [resellers, setResellers]   = useState<Reseller[]>([]);
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [services, setServices]     = useState<ServiceWithPrice[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [prices, setPrices]         = useState<Record<number, string>>({});
  const [saving, setSaving]         = useState(false);
  const [saveMsg, setSaveMsg]       = useState("");
  const [copied, setCopied]         = useState<string | null>(null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail]     = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [creating, setCreating]     = useState(false);
  const [createMsg, setCreateMsg]   = useState<{ text: string; ok: boolean } | null>(null);

  // Add balance
  const [addBal, setAddBal]         = useState<Record<string, string>>({});
  const [addingBal, setAddingBal]   = useState<string | null>(null);
  const [balMsg, setBalMsg]         = useState<Record<string, string>>({});

  // Filter
  const [search, setSearch]         = useState("");
  const [catFilter, setCatFilter]   = useState("all");

  // ── Auth ──────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isAdmin(user.email)) {
        router.replace("/smm/services");
        return;
      }
      fetchResellers();
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const fetchResellers = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/resellers");
    const data = await res.json();
    setResellers(data);
    setLoading(false);
  };

  // ── Load services for a reseller ──────────────────────────────────────

  const loadServices = async (resellerId: string) => {
    setServicesLoading(true);
    setPrices({});
    const res = await fetch(`/api/admin/reseller-prices?reseller_id=${resellerId}`);
    const data = await res.json();
    setServices(data.services ?? []);
    // Pre-fill existing prices
    const p: Record<number, string> = {};
    (data.services ?? []).forEach((s: ServiceWithPrice) => {
      if (s.reseller_rate !== null) p[s.service_id] = String(s.reseller_rate);
    });
    setPrices(p);
    setServicesLoading(false);
  };

  const toggleExpand = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    await loadServices(id);
  };

  // ── Save prices ───────────────────────────────────────────────────────

  const savePrices = async (resellerId: string) => {
    setSaving(true);
    setSaveMsg("");
    const pricesToSave = services
      .filter((s) => prices[s.service_id] && parseFloat(prices[s.service_id]) > 0)
      .map((s) => ({
        service_id: s.service_id,
        service_name: s.service_name,
        category: s.category,
        rate: parseFloat(prices[s.service_id]),
      }));

    const res = await fetch("/api/admin/reseller-prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reseller_id: resellerId, prices: pricesToSave }),
    });
    const data = await res.json();
    setSaving(false);
    setSaveMsg(data.success ? `✓ ${data.count} precios guardados` : `Error: ${data.error}`);
    setTimeout(() => setSaveMsg(""), 3000);
  };

  // ── Create reseller ───────────────────────────────────────────────────

  const createReseller = async () => {
    setCreating(true);
    setCreateMsg(null);
    const res = await fetch("/api/admin/resellers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail, company_name: newCompany }),
    });
    const data = await res.json();
    setCreating(false);
    if (data.success) {
      setCreateMsg({ text: "Reseller creado exitosamente", ok: true });
      setNewEmail(""); setNewCompany("");
      fetchResellers();
      setTimeout(() => { setShowCreate(false); setCreateMsg(null); }, 2000);
    } else {
      setCreateMsg({ text: data.error, ok: false });
    }
  };

  // ── Toggle active ─────────────────────────────────────────────────────

  const toggleActive = async (r: Reseller) => {
    await fetch("/api/admin/resellers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: r.id, is_active: !r.is_active }),
    });
    setResellers((prev) => prev.map((x) => x.id === r.id ? { ...x, is_active: !r.is_active } : x));
  };

  // ── Add balance ───────────────────────────────────────────────────────

  const addBalance = async (r: Reseller) => {
    const amount = parseFloat(addBal[r.id] ?? "0");
    if (!amount || amount <= 0) return;
    setAddingBal(r.id);
    const res = await fetch("/api/admin/resellers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: r.id, add_balance: amount }),
    });
    const data = await res.json();
    setAddingBal(null);
    if (data.success) {
      setResellers((prev) => prev.map((x) => x.id === r.id ? { ...x, balance: data.reseller.balance } : x));
      setAddBal((prev) => ({ ...prev, [r.id]: "" }));
      setBalMsg((prev) => ({ ...prev, [r.id]: `+$${amount} agregado` }));
      setTimeout(() => setBalMsg((prev) => ({ ...prev, [r.id]: "" })), 2500);
    }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  // ── Categories for filter ─────────────────────────────────────────────

  const categories = ["all", ...Array.from(new Set(services.map((s) => s.category))).sort()];
  const filteredServices = services.filter((s) => {
    const matchCat = catFilter === "all" || s.category === catFilter;
    const matchSearch = !search || s.service_name.toLowerCase().includes(search.toLowerCase()) || String(s.service_id).includes(search);
    return matchCat && matchSearch;
  });

  // ── Render ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#07070e", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 36, height: 36, border: "3px solid #1e1e30", borderTopColor: "#007ABF", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#07070e", color: "#f0efff", fontFamily: "'Plus Jakarta Sans', sans-serif", padding: "40px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Link href="/admin" style={{ color: "#56B4E0", display: "flex", alignItems: "center", gap: 6, fontSize: 13, textDecoration: "none" }}>
              <ArrowLeft size={14} /> Admin
            </Link>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Revendedores</h1>
              <p style={{ color: "#5a6480", fontSize: 13, margin: "2px 0 0" }}>{resellers.length} cuenta{resellers.length !== 1 ? "s" : ""} registrada{resellers.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={fetchResellers} style={{ padding: "8px 12px", borderRadius: 8, background: "#12121e", border: "1px solid #1e1e30", color: "#94a3b8", fontSize: 12, cursor: "pointer" }}>
              <RefreshCw size={13} />
            </button>
            <button
              onClick={() => setShowCreate(!showCreate)}
              style={{ padding: "8px 16px", borderRadius: 8, background: "#007ABF18", border: "1px solid #007ABF40", color: "#007ABF", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
            >
              <Plus size={14} /> Nuevo revendedor
            </button>
          </div>
        </div>

        {/* ── Create Form ── */}
        {showCreate && (
          <div style={{ background: "#0d0d18", border: "1px solid #007ABF35", borderRadius: 14, padding: 24, marginBottom: 24 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>Crear cuenta revendedor</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 6 }}>Email del usuario *</label>
                <input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="usuario@email.com"
                  style={{ width: "100%", padding: "10px 14px", background: "#12121e", border: "1px solid #1e1e30", borderRadius: 8, color: "#f0efff", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 6 }}>Nombre de empresa</label>
                <input
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  placeholder="Mi Panel SMM"
                  style={{ width: "100%", padding: "10px 14px", background: "#12121e", border: "1px solid #1e1e30", borderRadius: 8, color: "#f0efff", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                onClick={createReseller}
                disabled={!newEmail || creating}
                style={{ padding: "9px 20px", borderRadius: 8, background: "#007ABF", border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: !newEmail || creating ? 0.5 : 1 }}
              >
                {creating ? "Creando..." : "Crear"}
              </button>
              {createMsg && (
                <span style={{ fontSize: 13, color: createMsg.ok ? "#34d399" : "#f87171" }}>{createMsg.text}</span>
              )}
            </div>
          </div>
        )}

        {/* ── Resellers List ── */}
        {resellers.length === 0 ? (
          <div style={{ background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: 14, padding: 48, textAlign: "center" }}>
            <Users size={32} color="#2a2a42" style={{ margin: "0 auto 12px" }} />
            <p style={{ color: "#5a6480", margin: 0 }}>No hay revendedores aún. Crea el primero.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {resellers.map((r) => (
              <div key={r.id} style={{ background: "#0d0d18", border: `1px solid ${expanded === r.id ? "#007ABF40" : "#1e1e30"}`, borderRadius: 14, overflow: "hidden", transition: "border-color 0.2s" }}>

                {/* Row */}
                <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>

                  {/* Status dot */}
                  <div style={{ width: 9, height: 9, borderRadius: "50%", background: r.is_active ? "#34d399" : "#f87171", flexShrink: 0 }} />

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#f0efff", marginBottom: 2 }}>
                      {r.company_name || r.email}
                    </div>
                    <div style={{ fontSize: 12, color: "#5a6480", display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <span>{r.email}</span>
                      {r.custom_domain && <span style={{ color: "#56B4E0" }}>🌐 {r.custom_domain}</span>}
                    </div>
                  </div>

                  {/* Balance */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#34d399" }}>${parseFloat(String(r.balance)).toFixed(2)}</div>
                    <div style={{ fontSize: 11, color: "#5a6480" }}>balance</div>
                  </div>

                  {/* API key */}
                  <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
                    <code style={{ fontSize: 10, color: "#56B4E0", background: "#12121e", padding: "4px 8px", borderRadius: 6, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                      {r.api_key.slice(0, 20)}…
                    </code>
                    <button onClick={() => copyKey(r.api_key)} style={{ padding: "4px 7px", borderRadius: 6, background: "transparent", border: "1px solid #1e1e30", color: "#5a6480", cursor: "pointer" }}>
                      {copied === r.api_key ? <Check size={11} color="#34d399" /> : <Copy size={11} />}
                    </button>
                  </div>

                  {/* Toggle active */}
                  <button onClick={() => toggleActive(r)} title={r.is_active ? "Desactivar" : "Activar"} style={{ background: "transparent", border: "none", cursor: "pointer", color: r.is_active ? "#34d399" : "#f87171", padding: 4 }}>
                    {r.is_active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                  </button>

                  {/* Expand */}
                  <button onClick={() => toggleExpand(r.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#5a6480", padding: 4 }}>
                    {expanded === r.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>

                {/* ── Expanded section ── */}
                {expanded === r.id && (
                  <div style={{ borderTop: "1px solid #1e1e30", padding: 20 }}>

                    {/* Add balance */}
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 24 }}>
                      <DollarSign size={15} color="#34d399" />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Agregar saldo:</span>
                      <input
                        type="number"
                        value={addBal[r.id] ?? ""}
                        onChange={(e) => setAddBal((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        placeholder="10.00"
                        style={{ width: 100, padding: "7px 10px", background: "#12121e", border: "1px solid #1e1e30", borderRadius: 8, color: "#f0efff", fontSize: 13 }}
                      />
                      <button
                        onClick={() => addBalance(r)}
                        disabled={addingBal === r.id}
                        style={{ padding: "7px 14px", borderRadius: 8, background: "#34d39918", border: "1px solid #34d39940", color: "#34d399", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                      >
                        {addingBal === r.id ? "..." : "Agregar"}
                      </button>
                      {balMsg[r.id] && <span style={{ fontSize: 12, color: "#34d399" }}>{balMsg[r.id]}</span>}
                    </div>

                    {/* Services / prices */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                      <Tag size={15} color="#007ABF" />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Precios por servicio</span>
                      <span style={{ fontSize: 11, color: "#5a6480" }}>
                        {services.filter((s) => prices[s.service_id] && parseFloat(prices[s.service_id]) > 0).length} / {services.length} configurados
                      </span>
                    </div>

                    {/* Filter bar */}
                    <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar servicio..."
                        style={{ padding: "7px 12px", background: "#12121e", border: "1px solid #1e1e30", borderRadius: 8, color: "#f0efff", fontSize: 12, width: 200 }}
                      />
                      <select
                        value={catFilter}
                        onChange={(e) => setCatFilter(e.target.value)}
                        style={{ padding: "7px 10px", background: "#12121e", border: "1px solid #1e1e30", borderRadius: 8, color: "#f0efff", fontSize: 12 }}
                      >
                        {categories.map((c) => <option key={c} value={c}>{c === "all" ? "Todas las categorías" : c}</option>)}
                      </select>
                    </div>

                    {servicesLoading ? (
                      <div style={{ textAlign: "center", padding: 32, color: "#5a6480", fontSize: 13 }}>Cargando servicios...</div>
                    ) : (
                      <>
                        <div style={{ maxHeight: 400, overflowY: "auto", borderRadius: 10, border: "1px solid #1e1e30" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                            <thead style={{ position: "sticky", top: 0, background: "#12121e", zIndex: 2 }}>
                              <tr>
                                {["ID", "Servicio", "Categoría", "Precio JAP", "Tu precio de venta"].map((h) => (
                                  <th key={h} style={{ padding: "9px 12px", textAlign: "left", color: "#5a6480", fontWeight: 600, fontSize: 11 }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {filteredServices.map((s) => (
                                <tr key={s.service_id} style={{ borderTop: "1px solid #12121e" }}>
                                  <td style={{ padding: "8px 12px", color: "#5a6480", fontFamily: "monospace" }}>{s.service_id}</td>
                                  <td style={{ padding: "8px 12px", color: "#f0efff", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.service_name}</td>
                                  <td style={{ padding: "8px 12px", color: "#94a3b8" }}>{s.category}</td>
                                  <td style={{ padding: "8px 12px", color: "#5a6480", fontFamily: "monospace" }}>${s.jap_rate.toFixed(4)}</td>
                                  <td style={{ padding: "8px 12px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                      <span style={{ color: "#5a6480", fontSize: 11 }}>$</span>
                                      <input
                                        type="number"
                                        step="0.01"
                                        min={s.jap_rate}
                                        value={prices[s.service_id] ?? ""}
                                        onChange={(e) => setPrices((prev) => ({ ...prev, [s.service_id]: e.target.value }))}
                                        placeholder={`min $${s.jap_rate.toFixed(4)}`}
                                        style={{
                                          width: 110, padding: "5px 8px",
                                          background: prices[s.service_id] && parseFloat(prices[s.service_id]) >= s.jap_rate ? "#007ABF10" : "#12121e",
                                          border: `1px solid ${prices[s.service_id] && parseFloat(prices[s.service_id]) >= s.jap_rate ? "#007ABF40" : "#1e1e30"}`,
                                          borderRadius: 6, color: "#f0efff", fontSize: 12,
                                        }}
                                      />
                                      {prices[s.service_id] && parseFloat(prices[s.service_id]) > s.jap_rate && (
                                        <span style={{ fontSize: 10, color: "#34d399", whiteSpace: "nowrap" }}>
                                          +{(((parseFloat(prices[s.service_id]) - s.jap_rate) / s.jap_rate) * 100).toFixed(0)}%
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Save button */}
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
                          <button
                            onClick={() => savePrices(r.id)}
                            disabled={saving}
                            style={{ padding: "9px 20px", borderRadius: 8, background: "#007ABF", border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, opacity: saving ? 0.7 : 1 }}
                          >
                            <Save size={14} /> {saving ? "Guardando..." : "Guardar precios"}
                          </button>
                          {saveMsg && <span style={{ fontSize: 13, color: saveMsg.startsWith("✓") ? "#34d399" : "#f87171" }}>{saveMsg}</span>}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
