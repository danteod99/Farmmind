"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import { Users, DollarSign, TrendingUp, LogOut, RefreshCw, Search, UserCheck, UserX, Clock, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X, Tag, Gift, Trash2, ToggleLeft, ToggleRight, Plus } from "lucide-react";
import { FarmMindLogo } from "@/app/components/FarmMindLogo";

import { isAdmin } from "@/app/lib/admin";

interface Stats {
  totalUsers: number; buyers: number; nonBuyers: number;
  totalRevenue: number; totalRecharged: number; newThisWeek: number;
}
interface RecentOrder { service_name: string; charge: number; status: string; created_at: string; }
interface UserRow {
  id: string; email: string; name: string; avatar: string;
  created_at: string; last_sign_in: string | null;
  balance: number; total_orders: number; total_spent: number;
  total_recharged: number; last_order_at: string | null;
  last_order_name: string | null; recent_orders: RecentOrder[];
}

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}
function timeAgo(d: string | null) {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}
const SC: Record<string, string> = {
  completed: "#34d399", inprogress: "#56B4E0", processing: "#f59e0b",
  pending: "#8892a4", partial: "#a78bfa", canceled: "#f87171",
};

type SortCol = "created_at" | "total_spent" | "total_orders" | "balance";

interface PromoCode {
  id: string; code: string; bonus_usd: number; min_recharge: number;
  max_uses: number; current_uses: number; active: boolean;
  expires_at: string | null; created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "buyers" | "non-buyers" | "new">("all");
  const [sortBy, setSortBy] = useState<SortCol>("created_at");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState<Record<string, string>>({});
  const [creditNote, setCreditNote] = useState<Record<string, string>>({});
  const [creditLoading, setCreditLoading] = useState<string | null>(null);
  const [creditMsg, setCreditMsg] = useState<Record<string, { text: string; ok: boolean }>>({});
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFiltered, setTotalFiltered] = useState(0);
  // Tabs
  const [activeTab, setActiveTab] = useState<"users" | "promos" | "downloads">("users");
  // Downloads
  const [dlStats, setDlStats] = useState<{ apps: { name: string; total: number; mac: number; windows: number; latest: string | null; paidActive: number; releases: { version: string; date: string; mac: number; windows: number; total: number }[] }[]; grandTotal: number; subscriptions: { totalActive: number; totalEver: number; conversionRate: string } } | null>(null);
  const [dlLoading, setDlLoading] = useState(false);
  // Promo codes
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoForm, setPromoForm] = useState({ code: "", bonus_usd: "", min_recharge: "20", max_uses: "100", expires_at: "" });
  const [promoCreating, setPromoCreating] = useState(false);
  const [promoMsg, setPromoMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => { checkAuth(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (activeTab === "promos") loadPromoCodes(); if (activeTab === "downloads") loadDownloadStats(); }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(() => setDebouncedSearch(search), 350); return () => clearTimeout(t); }, [search]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/smm"); return; }
    if (!isAdmin(user.email)) { router.push("/smm"); return; }
    loadData();
  };

  const loadData = async (showRefresh = false, pageOverride?: number) => {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const p = pageOverride ?? page;
      const params = new URLSearchParams({ page: String(p), limit: "50", search: debouncedSearch, filter });
      const res = await fetch(`/api/admin/smm-users?${params}`);
      if (!res.ok) throw new Error("Error al cargar datos");
      const data = await res.json();
      setStats(data.stats);
      setUsers(data.users);
      if (data.pagination) {
        setPage(data.pagination.page);
        setTotalPages(data.pagination.totalPages);
        setTotalFiltered(data.pagination.totalFiltered);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const loadDownloadStats = async () => {
    setDlLoading(true);
    try {
      const res = await fetch("/api/admin/download-stats");
      if (res.ok) { const d = await res.json(); setDlStats(d); }
    } finally { setDlLoading(false); }
  };

  const loadPromoCodes = async () => {
    setPromoLoading(true);
    try {
      const res = await fetch("/api/admin/promo-codes");
      if (res.ok) { const d = await res.json(); setPromoCodes(d.codes || []); }
    } finally { setPromoLoading(false); }
  };

  const createPromo = async () => {
    if (!promoForm.code || !promoForm.bonus_usd) { setPromoMsg({ text: "Código y bono son requeridos", ok: false }); return; }
    setPromoCreating(true); setPromoMsg(null);
    try {
      const res = await fetch("/api/admin/promo-codes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...promoForm, bonus_usd: parseFloat(promoForm.bonus_usd), min_recharge: parseFloat(promoForm.min_recharge), max_uses: parseInt(promoForm.max_uses), expires_at: promoForm.expires_at || null }),
      });
      const d = await res.json();
      if (d.success) {
        setPromoMsg({ text: `✅ Código "${promoForm.code.toUpperCase()}" creado`, ok: true });
        setPromoForm({ code: "", bonus_usd: "", min_recharge: "20", max_uses: "100", expires_at: "" });
        loadPromoCodes();
      } else { setPromoMsg({ text: d.error || "Error", ok: false }); }
    } finally { setPromoCreating(false); }
  };

  const togglePromo = async (id: string, active: boolean) => {
    await fetch("/api/admin/promo-codes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, active: !active }) });
    loadPromoCodes();
  };

  const deletePromo = async (id: string, code: string) => {
    if (!confirm(`¿Eliminar el código "${code}"?`)) return;
    await fetch("/api/admin/promo-codes", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    loadPromoCodes();
  };

  const handleCredit = async (userId: string) => {
    const amt = parseFloat(creditAmount[userId] || "");
    if (!amt || amt <= 0) { setCreditMsg(m => ({ ...m, [userId]: { text: "Ingresa un monto válido", ok: false } })); return; }
    setCreditLoading(userId);
    setCreditMsg(m => ({ ...m, [userId]: { text: "", ok: false } }));
    try {
      const res = await fetch("/api/admin/credit-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_user_id: userId, amount: amt, note: creditNote[userId] || "" }),
      });
      const data = await res.json();
      if (data.success) {
        setCreditMsg(m => ({ ...m, [userId]: { text: `✅ Acreditado $${amt.toFixed(2)} USD. Nuevo balance: $${data.new_balance.toFixed(2)}`, ok: true } }));
        setCreditAmount(a => ({ ...a, [userId]: "" }));
        setCreditNote(n => ({ ...n, [userId]: "" }));
        loadData(true);
      } else {
        setCreditMsg(m => ({ ...m, [userId]: { text: data.error || "Error", ok: false } }));
      }
    } catch { setCreditMsg(m => ({ ...m, [userId]: { text: "Error de conexión", ok: false } })); }
    finally { setCreditLoading(null); }
  };

  // Reload when search, filter, or page changes (server-side filtering/pagination)
  useEffect(() => {
    if (!loading) loadData(true);
  }, [debouncedSearch, filter, page]); // eslint-disable-line react-hooks/exhaustive-deps

  // Client-side sort (within the current page)
  const filtered = useMemo(() => {
    const list = [...users];
    list.sort((a, b) => {
      const va = a[sortBy] ?? 0; const vb = b[sortBy] ?? 0;
      if (typeof va === "string" && typeof vb === "string")
        return sortDir === "desc" ? vb.localeCompare(va) : va.localeCompare(vb);
      return sortDir === "desc" ? Number(vb) - Number(va) : Number(va) - Number(vb);
    });
    return list;
  }, [users, sortBy, sortDir]);

  const toggleSort = (col: SortCol) => {
    if (sortBy === col) setSortDir((d) => d === "desc" ? "asc" : "desc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  if (loading) return (
    <div style={{ height: "100vh", background: "#07070e", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "12px" }}>
      <div style={{ width: "36px", height: "36px", borderRadius: "50%", border: "3px solid #007ABF20", borderTopColor: "#56B4E0", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#07070e", color: "white", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .sc:hover{transform:translateY(-3px)!important;box-shadow:0 12px 40px #00000060!important}
        .ur:hover{background:#0a0a14!important}
      `}</style>

      {/* NAV */}
      <nav style={{ position:"sticky", top:0, zIndex:50, borderBottom:"1px solid #0d1117", background:"rgba(7,7,14,0.97)", backdropFilter:"blur(12px)", padding:"0 28px", height:"56px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"14px" }}>
          <Link href="/smm/services" style={{ display:"flex", alignItems:"center", cursor:"pointer" }} title="Ir al dashboard">
            <FarmMindLogo size={28} />
          </Link>
          <div style={{ width:"1px", height:"20px", background:"#1e1e30" }} />
          <span style={{ fontSize:"11px", fontWeight:700, color:"#f59e0b", letterSpacing:"1px", textTransform:"uppercase", padding:"3px 8px", background:"#f59e0b15", border:"1px solid #f59e0b30", borderRadius:"6px" }}>Admin Panel</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          <Link href="/admin/resellers"
            style={{ display:"flex", alignItems:"center", gap:"6px", padding:"6px 12px", borderRadius:"8px", background:"#34d39915", border:"1px solid #34d39930", color:"#34d399", fontSize:"12px", fontWeight:600, textDecoration:"none" }}>
            🔗 Revendedores
          </Link>
          <button onClick={() => loadData(true)} disabled={refreshing}
            style={{ display:"flex", alignItems:"center", gap:"6px", padding:"6px 12px", borderRadius:"8px", background:"#007ABF15", border:"1px solid #007ABF30", color:"#56B4E0", fontSize:"12px", fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            <RefreshCw size={13} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} /> Actualizar
          </button>
          <button onClick={async () => { await supabase.auth.signOut(); router.push("/"); }}
            style={{ width:"34px", height:"34px", borderRadius:"8px", background:"#1a1a2e", border:"1px solid #1e1e30", color:"#5a6480", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <LogOut size={14} />
          </button>
        </div>
      </nav>

      <div style={{ maxWidth:"1300px", margin:"0 auto", padding:"28px 24px", animation:"fi 0.5s ease-out" }}>

        {/* STAT CARDS */}
        {stats && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(175px,1fr))", gap:"14px", marginBottom:"28px" }}>
            {[
              { label:"Total Usuarios",   val: stats.totalUsers,                   icon:<Users size={17}/>,     color:"#56B4E0", sub:`+${stats.newThisWeek} esta semana` },
              { label:"Compraron",        val: stats.buyers,                        icon:<UserCheck size={17}/>, color:"#34d399", sub:`${stats.totalUsers>0?Math.round(stats.buyers/stats.totalUsers*100):0}% del total` },
              { label:"Sin compras",      val: stats.nonBuyers,                     icon:<UserX size={17}/>,     color:"#f87171", sub:"Usuarios inactivos" },
              { label:"Revenue SMM",      val:`$${stats.totalRevenue.toFixed(2)}`,  icon:<DollarSign size={17}/>,color:"#a78bfa", sub:"Total gastado" },
              { label:"Total Recargado",  val:`$${stats.totalRecharged.toFixed(2)}`,icon:<TrendingUp size={17}/>,color:"#f59e0b", sub:"Depósitos crypto" },
              { label:"Nuevos 7d",        val: stats.newThisWeek,                   icon:<Clock size={17}/>,     color:"#00e5ff", sub:"Registros recientes" },
            ].map((s) => (
              <div key={s.label} className="sc" style={{ background:"#0d0d1a", border:"1px solid #1a1a2e", borderRadius:"14px", padding:"18px", transition:"all 0.2s" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"10px" }}>
                  <span style={{ fontSize:"10px", fontWeight:700, color:"#5a6480", textTransform:"uppercase", letterSpacing:"0.5px" }}>{s.label}</span>
                  <div style={{ width:"30px", height:"30px", borderRadius:"8px", background:`${s.color}15`, border:`1px solid ${s.color}30`, display:"flex", alignItems:"center", justifyContent:"center", color:s.color }}>{s.icon}</div>
                </div>
                <p style={{ fontSize:"26px", fontWeight:800, color:"white", letterSpacing:"-1px", lineHeight:"1" }}>{s.val}</p>
                <p style={{ fontSize:"10px", color:"#3a3a5c", marginTop:"5px" }}>{s.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* TABS */}
        <div style={{ display:"flex", gap:"8px", marginBottom:"24px", borderBottom:"1px solid #1a1a2e", paddingBottom:"0" }}>
          {([["users","👥 Usuarios"],["promos","🎟️ Códigos Promo"],["downloads","📥 Descargas"]] as const).map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ padding:"10px 18px", borderRadius:"10px 10px 0 0", border:"1px solid", borderBottom:"none", borderColor: activeTab===tab ? "#007ABF" : "transparent", background: activeTab===tab ? "#007ABF18" : "transparent", color: activeTab===tab ? "#56B4E0" : "#5a6480", fontSize:"13px", fontWeight: activeTab===tab ? 700 : 500, cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s" }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── PROMOS TAB ── */}
        {activeTab === "promos" && (
          <div style={{ animation:"fi 0.3s ease-out" }}>
            {/* Create form */}
            <div style={{ background:"#0d0d1a", border:"1px solid #1a1a2e", borderRadius:"16px", padding:"22px", marginBottom:"20px" }}>
              <p style={{ fontSize:"14px", fontWeight:700, color:"white", marginBottom:"16px", display:"flex", alignItems:"center", gap:"8px" }}><Plus size={14} color="#56B4E0"/> Crear nuevo código</p>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:"10px", marginBottom:"12px" }}>
                <div>
                  <p style={{ fontSize:"11px", color:"#64748b", marginBottom:"5px", fontWeight:600 }}>CÓDIGO *</p>
                  <input value={promoForm.code} onChange={e=>setPromoForm(f=>({...f,code:e.target.value.toUpperCase()}))} placeholder="Ej: LAUNCH50"
                    style={{ width:"100%", background:"#07070e", border:"1px solid #2d2d44", borderRadius:"9px", padding:"9px 11px", color:"white", fontSize:"13px", fontWeight:700, letterSpacing:"1px", outline:"none", boxSizing:"border-box", fontFamily:"monospace" }}/>
                </div>
                <div>
                  <p style={{ fontSize:"11px", color:"#64748b", marginBottom:"5px", fontWeight:600 }}>BONO USD *</p>
                  <input type="number" value={promoForm.bonus_usd} onChange={e=>setPromoForm(f=>({...f,bonus_usd:e.target.value}))} placeholder="5.00"
                    style={{ width:"100%", background:"#07070e", border:"1px solid #2d2d44", borderRadius:"9px", padding:"9px 11px", color:"white", fontSize:"13px", outline:"none", boxSizing:"border-box" }}/>
                </div>
                <div>
                  <p style={{ fontSize:"11px", color:"#64748b", marginBottom:"5px", fontWeight:600 }}>RECARGA MÍNIMA</p>
                  <input type="number" value={promoForm.min_recharge} onChange={e=>setPromoForm(f=>({...f,min_recharge:e.target.value}))} placeholder="20"
                    style={{ width:"100%", background:"#07070e", border:"1px solid #2d2d44", borderRadius:"9px", padding:"9px 11px", color:"white", fontSize:"13px", outline:"none", boxSizing:"border-box" }}/>
                </div>
                <div>
                  <p style={{ fontSize:"11px", color:"#64748b", marginBottom:"5px", fontWeight:600 }}>MÁXIMO DE USOS</p>
                  <input type="number" value={promoForm.max_uses} onChange={e=>setPromoForm(f=>({...f,max_uses:e.target.value}))} placeholder="100"
                    style={{ width:"100%", background:"#07070e", border:"1px solid #2d2d44", borderRadius:"9px", padding:"9px 11px", color:"white", fontSize:"13px", outline:"none", boxSizing:"border-box" }}/>
                </div>
                <div>
                  <p style={{ fontSize:"11px", color:"#64748b", marginBottom:"5px", fontWeight:600 }}>EXPIRA (opcional)</p>
                  <input type="date" value={promoForm.expires_at} onChange={e=>setPromoForm(f=>({...f,expires_at:e.target.value}))}
                    style={{ width:"100%", background:"#07070e", border:"1px solid #2d2d44", borderRadius:"9px", padding:"9px 11px", color:"white", fontSize:"13px", outline:"none", boxSizing:"border-box" }}/>
                </div>
              </div>
              <button onClick={createPromo} disabled={promoCreating}
                style={{ padding:"10px 22px", borderRadius:"10px", background: promoCreating?"#1a1a2e":"#007ABF", border:"none", color:"white", fontSize:"13px", fontWeight:700, cursor: promoCreating?"not-allowed":"pointer", display:"flex", alignItems:"center", gap:"7px", fontFamily:"inherit" }}>
                {promoCreating ? <><div style={{ width:"13px", height:"13px", borderRadius:"50%", border:"2px solid white", borderTopColor:"transparent", animation:"spin 0.6s linear infinite" }}/> Creando...</> : <><Plus size={14}/> Crear código</>}
              </button>
              {promoMsg && (
                <div style={{ marginTop:"10px", padding:"8px 12px", borderRadius:"8px", background: promoMsg.ok?"#34d39912":"#f8717112", border:`1px solid ${promoMsg.ok?"#34d39930":"#f8717130"}`, color: promoMsg.ok?"#34d399":"#f87171", fontSize:"12px" }}>
                  {promoMsg.text}
                </div>
              )}
            </div>

            {/* Codes list */}
            <div style={{ background:"#0a0a14", border:"1px solid #1a1a2e", borderRadius:"14px", overflow:"hidden" }}>
              <div style={{ padding:"14px 20px", borderBottom:"1px solid #1a1a2e", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <p style={{ fontSize:"13px", fontWeight:700, color:"white", display:"flex", alignItems:"center", gap:"7px" }}><Tag size={13} color="#56B4E0"/> {promoCodes.length} códigos creados</p>
                <button onClick={loadPromoCodes} style={{ background:"none", border:"none", color:"#5a6480", cursor:"pointer", display:"flex", alignItems:"center", gap:"4px", fontSize:"11px", fontFamily:"inherit" }}>
                  <RefreshCw size={11} style={{ animation: promoLoading?"spin 1s linear infinite":"none" }}/> Actualizar
                </button>
              </div>
              {promoLoading ? (
                <div style={{ padding:"32px", textAlign:"center" }}><div style={{ width:"24px", height:"24px", borderRadius:"50%", border:"2px solid #007ABF20", borderTopColor:"#56B4E0", animation:"spin 0.8s linear infinite", margin:"0 auto" }}/></div>
              ) : promoCodes.length === 0 ? (
                <div style={{ padding:"32px", textAlign:"center", color:"#3a3a5c", fontSize:"13px" }}>No hay códigos creados aún</div>
              ) : (
                <div>
                  {/* Table header */}
                  <div style={{ display:"grid", gridTemplateColumns:"1.5fr 0.8fr 0.8fr 1fr 0.7fr 0.9fr 80px", gap:"10px", padding:"9px 20px", background:"#07070e", borderBottom:"1px solid #1a1a2e" }}>
                    {["CÓDIGO","BONO","RECARGA MÍN.","USOS","ESTADO","EXPIRA",""].map(h=>(
                      <span key={h} style={{ fontSize:"9px", fontWeight:700, color:"#3a3a5c", textTransform:"uppercase", letterSpacing:"0.5px" }}>{h}</span>
                    ))}
                  </div>
                  {promoCodes.map(pc => {
                    const used = pc.current_uses >= pc.max_uses;
                    const expired = pc.expires_at ? new Date(pc.expires_at) < new Date() : false;
                    return (
                      <div key={pc.id} style={{ display:"grid", gridTemplateColumns:"1.5fr 0.8fr 0.8fr 1fr 0.7fr 0.9fr 80px", gap:"10px", padding:"13px 20px", borderBottom:"1px solid #0d0d1a", alignItems:"center" }}>
                        <span style={{ fontFamily:"monospace", fontWeight:700, fontSize:"14px", color:"white", letterSpacing:"1px" }}>{pc.code}</span>
                        <span style={{ fontSize:"14px", fontWeight:700, color:"#34d399" }}>+${pc.bonus_usd.toFixed(2)}</span>
                        <span style={{ fontSize:"12px", color:"#94a3b8" }}>${pc.min_recharge.toFixed(0)} min</span>
                        <div>
                          <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                            <div style={{ flex:1, height:"4px", borderRadius:"2px", background:"#1a1a2e", overflow:"hidden" }}>
                              <div style={{ width:`${Math.min(100,(pc.current_uses/pc.max_uses)*100)}%`, height:"100%", background: used?"#f87171":"#007ABF", borderRadius:"2px" }}/>
                            </div>
                            <span style={{ fontSize:"11px", color: used?"#f87171":"#64748b", whiteSpace:"nowrap" }}>{pc.current_uses}/{pc.max_uses}</span>
                          </div>
                        </div>
                        <span style={{ fontSize:"11px", fontWeight:700, padding:"3px 8px", borderRadius:"6px", background: pc.active&&!used&&!expired?"#34d39918":"#f8717118", color: pc.active&&!used&&!expired?"#34d399":"#f87171", whiteSpace:"nowrap" }}>
                          {!pc.active?"Inactivo":used?"Agotado":expired?"Expirado":"Activo"}
                        </span>
                        <span style={{ fontSize:"11px", color:"#64748b" }}>{pc.expires_at?new Date(pc.expires_at).toLocaleDateString("es"):"Sin límite"}</span>
                        <div style={{ display:"flex", gap:"6px" }}>
                          <button onClick={()=>togglePromo(pc.id, pc.active)} title={pc.active?"Desactivar":"Activar"}
                            style={{ width:"28px", height:"28px", borderRadius:"7px", background: pc.active?"#34d39918":"#f8717118", border:`1px solid ${pc.active?"#34d39930":"#f8717130"}`, color: pc.active?"#34d399":"#f87171", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                            {pc.active?<ToggleRight size={13}/>:<ToggleLeft size={13}/>}
                          </button>
                          <button onClick={()=>deletePromo(pc.id, pc.code)} title="Eliminar"
                            style={{ width:"28px", height:"28px", borderRadius:"7px", background:"#f8717112", border:"1px solid #f8717130", color:"#f87171", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <Trash2 size={12}/>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── USERS TAB ── */}
        {activeTab === "users" && <>

        {/* SEARCH + FILTERS */}
        <div style={{ display:"flex", gap:"10px", marginBottom:"16px", flexWrap:"wrap", alignItems:"center" }}>
          <div style={{ position:"relative", flex:1, minWidth:"200px" }}>
            <Search size={14} style={{ position:"absolute", left:"11px", top:"50%", transform:"translateY(-50%)", color:"#5a6480" }} />
            <input value={search} onChange={(e)=>{setSearch(e.target.value);setPage(1);}} placeholder="Buscar email o nombre..."
              style={{ width:"100%", background:"#0d0d18", border:"1px solid #1e1e30", borderRadius:"9px", padding:"9px 11px 9px 32px", color:"white", fontSize:"13px", outline:"none", fontFamily:"inherit", boxSizing:"border-box" }} />
            {search && <button onClick={()=>{setSearch("");setPage(1);}} style={{ position:"absolute", right:"9px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#5a6480", cursor:"pointer" }}><X size={12}/></button>}
          </div>
          <div style={{ display:"flex", gap:"5px" }}>
            {(["all","buyers","non-buyers","new"] as const).map((f)=>{
              const lbl = { all:`Todos (${users.length})`, buyers:`Compraron (${stats?.buyers||0})`, "non-buyers":`Sin compras (${stats?.nonBuyers||0})`, new:`Nuevos (${stats?.newThisWeek||0})` };
              const on = filter===f;
              return <button key={f} onClick={()=>{setFilter(f);setPage(1);}}
                style={{ padding:"7px 12px", borderRadius:"7px", border:`1px solid ${on?"#007ABF":"#1e1e30"}`, background:on?"#007ABF20":"transparent", color:on?"#88D0F0":"#5a6480", fontSize:"11px", fontWeight:on?700:500, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap", transition:"all 0.15s" }}>
                {lbl[f]}
              </button>;
            })}
          </div>
        </div>

        {error && <div style={{ background:"#f8717115", border:"1px solid #f8717140", borderRadius:"10px", padding:"10px 14px", marginBottom:"16px", color:"#f87171", fontSize:"13px" }}>⚠️ {error}</div>}

        {/* TABLE */}
        <div style={{ background:"#0a0a14", border:"1px solid #1a1a2e", borderRadius:"14px", overflow:"hidden" }}>
          {/* Header */}
          <div style={{ display:"grid", gridTemplateColumns:"2.2fr 0.9fr 0.8fr 0.7fr 0.9fr 0.8fr", gap:"10px", padding:"11px 18px", borderBottom:"1px solid #1a1a2e", background:"#07070e" }}>
            {([["Usuario",null],["Registro","created_at"],["Balance","balance"],["Pedidos","total_orders"],["Gastado","total_spent"],["Último acceso",null]] as [string, SortCol|null][]).map(([lbl,col])=>(
              <button key={lbl} onClick={()=>col&&toggleSort(col)}
                style={{ background:"none", border:"none", color:col&&sortBy===col?"#88D0F0":"#3a3a5c", fontSize:"10px", fontWeight:700, cursor:col?"pointer":"default", fontFamily:"inherit", textTransform:"uppercase", letterSpacing:"0.5px", display:"flex", alignItems:"center", gap:"3px", padding:0 }}>
                {lbl} {col&&sortBy===col&&(sortDir==="desc"?<ChevronDown size={11}/>:<ChevronUp size={11}/>)}
              </button>
            ))}
          </div>

          {/* Rows */}
          {filtered.length===0 ? (
            <div style={{ padding:"36px", textAlign:"center", color:"#3a3a5c", fontSize:"13px" }}>No se encontraron usuarios</div>
          ) : filtered.map((u)=>{
            const buyer = u.total_orders>0;
            const exp = expanded===u.id;
            return (
              <div key={u.id}>
                <div className="ur" onClick={()=>setExpanded(exp?null:u.id)}
                  style={{ display:"grid", gridTemplateColumns:"2.2fr 0.9fr 0.8fr 0.7fr 0.9fr 0.8fr", gap:"10px", padding:"13px 18px", borderBottom:"1px solid #0d0d1a", cursor:"pointer", transition:"background 0.15s", alignItems:"center" }}>
                  {/* User */}
                  <div style={{ display:"flex", alignItems:"center", gap:"9px", minWidth:0 }}>
                    {u.avatar
                      ? <img src={u.avatar} alt="" loading="lazy" style={{ width:"32px", height:"32px", borderRadius:"50%", objectFit:"cover", border:"2px solid #1e1e30", flexShrink:0 }}/>
                      : <div style={{ width:"32px", height:"32px", borderRadius:"50%", background:"#1a1a2e", border:"2px solid #1e1e30", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><span style={{ fontSize:"12px", fontWeight:700, color:"#56B4E0" }}>{u.name[0]?.toUpperCase()}</span></div>
                    }
                    <div style={{ minWidth:0 }}>
                      <p style={{ fontSize:"13px", fontWeight:600, color:"white", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.name}</p>
                      <p style={{ fontSize:"11px", color:"#5a6480", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.email}</p>
                    </div>
                    <span style={{ padding:"2px 7px", borderRadius:"5px", background:buyer?"#34d39915":"#f8717115", border:`1px solid ${buyer?"#34d39930":"#f8717130"}`, fontSize:"9px", fontWeight:700, color:buyer?"#34d399":"#f87171", whiteSpace:"nowrap", flexShrink:0 }}>{buyer?"Comprador":"Sin compras"}</span>
                  </div>
                  <p style={{ fontSize:"12px", color:"#8892a4" }}>{fmt(u.created_at)}</p>
                  <p style={{ fontSize:"13px", fontWeight:700, color:u.balance>0?"#34d399":"#3a3a5c" }}>${u.balance.toFixed(2)}</p>
                  <p style={{ fontSize:"13px", fontWeight:700, color:u.total_orders>0?"#56B4E0":"#3a3a5c" }}>{u.total_orders}</p>
                  <p style={{ fontSize:"13px", fontWeight:700, color:u.total_spent>0?"#a78bfa":"#3a3a5c" }}>${u.total_spent.toFixed(2)}</p>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <p style={{ fontSize:"11px", color:"#5a6480" }}>{timeAgo(u.last_sign_in)}</p>
                    <div style={{ color:"#3a3a5c", transform:exp?"rotate(180deg)":"none", transition:"transform 0.2s" }}><ChevronDown size={13}/></div>
                  </div>
                </div>

                {/* Expanded */}
                {exp && (
                  <div style={{ background:"#070710", borderBottom:"1px solid #0d0d1a", padding:"14px 18px 18px" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))", gap:"14px" }}>
                      {/* Info */}
                      <div style={{ background:"#0a0a14", border:"1px solid #1a1a2e", borderRadius:"11px", padding:"13px" }}>
                        <p style={{ fontSize:"10px", fontWeight:700, color:"#3a3a5c", marginBottom:"9px", textTransform:"uppercase", letterSpacing:"0.5px" }}>Datos del usuario</p>
                        {[["ID",u.id.slice(0,12)+"..."],["Registro",fmt(u.created_at)],["Último acceso",fmt(u.last_sign_in)],["Balance","$"+u.balance.toFixed(4)],["Total recargado","$"+u.total_recharged.toFixed(2)]].map(([k,v])=>(
                          <div key={k} style={{ display:"flex", justifyContent:"space-between", marginBottom:"5px" }}>
                            <span style={{ fontSize:"11px", color:"#5a6480" }}>{k}</span>
                            <span style={{ fontSize:"11px", color:"#8892a4", fontFamily:k==="ID"?"monospace":"inherit" }}>{v}</span>
                          </div>
                        ))}
                      </div>
                      {/* Orders */}
                      <div style={{ background:"#0a0a14", border:"1px solid #1a1a2e", borderRadius:"11px", padding:"13px" }}>
                        <p style={{ fontSize:"10px", fontWeight:700, color:"#3a3a5c", marginBottom:"9px", textTransform:"uppercase", letterSpacing:"0.5px" }}>Últimos pedidos</p>
                        {u.recent_orders.length===0
                          ? <p style={{ fontSize:"12px", color:"#3a3a5c" }}>Sin pedidos aún</p>
                          : u.recent_orders.map((o,i)=>(
                            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"7px", gap:"8px" }}>
                              <div style={{ minWidth:0 }}>
                                <p style={{ fontSize:"12px", color:"white", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{o.service_name}</p>
                                <p style={{ fontSize:"10px", color:"#5a6480" }}>{fmt(o.created_at)}</p>
                              </div>
                              <div style={{ display:"flex", alignItems:"center", gap:"5px", flexShrink:0 }}>
                                <span style={{ fontSize:"12px", fontWeight:700, color:"#a78bfa" }}>${o.charge.toFixed(2)}</span>
                                <span style={{ fontSize:"9px", padding:"1px 5px", borderRadius:"4px", background:`${SC[o.status]||"#5a6480"}20`, color:SC[o.status]||"#5a6480", fontWeight:700 }}>{o.status}</span>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                      {/* Summary */}
                      <div style={{ background:"#0a0a14", border:"1px solid #1a1a2e", borderRadius:"11px", padding:"13px" }}>
                        <p style={{ fontSize:"10px", fontWeight:700, color:"#3a3a5c", marginBottom:"9px", textTransform:"uppercase", letterSpacing:"0.5px" }}>Resumen SMM</p>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"7px" }}>
                          <span style={{ fontSize:"11px", color:"#5a6480" }}>Total pedidos</span>
                          <span style={{ fontSize:"22px", fontWeight:800, color:"#56B4E0" }}>{u.total_orders}</span>
                        </div>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"7px" }}>
                          <span style={{ fontSize:"11px", color:"#5a6480" }}>Total gastado</span>
                          <span style={{ fontSize:"22px", fontWeight:800, color:"#a78bfa" }}>${u.total_spent.toFixed(2)}</span>
                        </div>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"10px" }}>
                          <span style={{ fontSize:"11px", color:"#5a6480" }}>Último pedido</span>
                          <span style={{ fontSize:"11px", color:"#8892a4" }}>{timeAgo(u.last_order_at)}</span>
                        </div>
                        <div style={{ padding:"7px 10px", borderRadius:"7px", background:buyer?"#34d39912":"#f8717112", border:`1px solid ${buyer?"#34d39930":"#f8717130"}`, textAlign:"center" }}>
                          <span style={{ fontSize:"11px", fontWeight:700, color:buyer?"#34d399":"#f87171" }}>
                            {buyer?"✅ Usuario comprador":"⚪ Aún no ha comprado"}
                          </span>
                        </div>
                      </div>

                      {/* Manual credit */}
                      <div style={{ background:"#0a0a14", border:"1px solid #2a1a3e", borderRadius:"11px", padding:"13px" }}>
                        <p style={{ fontSize:"10px", fontWeight:700, color:"#a78bfa80", marginBottom:"9px", textTransform:"uppercase", letterSpacing:"0.5px" }}>⚡ Acreditar saldo manualmente</p>
                        <div style={{ display:"flex", gap:"7px", marginBottom:"7px" }}>
                          <input
                            type="number" min="0" step="0.01"
                            placeholder="Monto USD"
                            value={creditAmount[u.id]||""}
                            onChange={e=>setCreditAmount(a=>({...a,[u.id]:e.target.value}))}
                            onClick={e=>e.stopPropagation()}
                            style={{ flex:1, background:"#07070e", border:"1px solid #2a1a3e", borderRadius:"7px", padding:"7px 9px", color:"white", fontSize:"12px", outline:"none" }}
                          />
                          <button
                            onClick={e=>{e.stopPropagation();handleCredit(u.id);}}
                            disabled={creditLoading===u.id}
                            style={{ padding:"7px 12px", borderRadius:"7px", background:"#a78bfa20", border:"1px solid #a78bfa40", color:"#a78bfa", fontSize:"12px", fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
                            {creditLoading===u.id?"...":"+ Acreditar"}
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="Nota (opcional)"
                          value={creditNote[u.id]||""}
                          onChange={e=>setCreditNote(n=>({...n,[u.id]:e.target.value}))}
                          onClick={e=>e.stopPropagation()}
                          style={{ width:"100%", background:"#07070e", border:"1px solid #1a1a2e", borderRadius:"7px", padding:"6px 9px", color:"white", fontSize:"11px", outline:"none", boxSizing:"border-box" }}
                        />
                        {creditMsg[u.id]?.text && (
                          <div style={{ marginTop:"7px", padding:"6px 9px", borderRadius:"7px", background:creditMsg[u.id].ok?"#34d39912":"#f8717112", border:`1px solid ${creditMsg[u.id].ok?"#34d39930":"#f8717130"}`, fontSize:"11px", color:creditMsg[u.id].ok?"#34d399":"#f87171" }}>
                            {creditMsg[u.id].text}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"12px", marginTop:"16px" }}>
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1}
            style={{ display:"flex", alignItems:"center", gap:"4px", padding:"7px 14px", borderRadius:"8px", background: page<=1?"#0d0d1a":"#007ABF18", border:`1px solid ${page<=1?"#1a1a2e":"#007ABF40"}`, color: page<=1?"#3a3a5c":"#56B4E0", fontSize:"12px", fontWeight:600, cursor: page<=1?"not-allowed":"pointer", fontFamily:"inherit", transition:"all 0.15s" }}>
            <ChevronLeft size={14}/> Anterior
          </button>
          <span style={{ fontSize:"12px", color:"#8892a4", fontWeight:600 }}>
            Pag. {page} de {totalPages} <span style={{ color:"#3a3a5c", fontWeight:400 }}>({totalFiltered} usuarios)</span>
          </span>
          <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page>=totalPages}
            style={{ display:"flex", alignItems:"center", gap:"4px", padding:"7px 14px", borderRadius:"8px", background: page>=totalPages?"#0d0d1a":"#007ABF18", border:`1px solid ${page>=totalPages?"#1a1a2e":"#007ABF40"}`, color: page>=totalPages?"#3a3a5c":"#56B4E0", fontSize:"12px", fontWeight:600, cursor: page>=totalPages?"not-allowed":"pointer", fontFamily:"inherit", transition:"all 0.15s" }}>
            Siguiente <ChevronRight size={14}/>
          </button>
        </div>
        </>}

        {/* ═══════════════════ TAB: DESCARGAS ═══════════════════ */}
        {activeTab === "downloads" && (
          <div style={{ animation:"fi 0.3s ease-out" }}>
            {dlLoading ? (
              <div style={{ textAlign:"center", padding:"40px", color:"#5a6480" }}>Cargando estadisticas...</div>
            ) : dlStats ? (
              <>
                {/* Summary cards */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:"12px", marginBottom:"20px" }}>
                  <div style={{ background:"linear-gradient(135deg, #007ABF18, #007ABF08)", border:"1px solid #007ABF30", borderRadius:"16px", padding:"20px", textAlign:"center" }}>
                    <div style={{ fontSize:"36px", fontWeight:800, color:"#56B4E0" }}>{dlStats.grandTotal}</div>
                    <div style={{ fontSize:"11px", color:"#8892a4", fontWeight:600, marginTop:"4px" }}>Descargas totales</div>
                  </div>
                  <div style={{ background:"linear-gradient(135deg, #34d39918, #34d39908)", border:"1px solid #34d39930", borderRadius:"16px", padding:"20px", textAlign:"center" }}>
                    <div style={{ fontSize:"36px", fontWeight:800, color:"#34d399" }}>{dlStats.subscriptions.totalActive}</div>
                    <div style={{ fontSize:"11px", color:"#8892a4", fontWeight:600, marginTop:"4px" }}>Suscripciones Pro activas</div>
                  </div>
                  <div style={{ background:"linear-gradient(135deg, #a78bfa18, #a78bfa08)", border:"1px solid #a78bfa30", borderRadius:"16px", padding:"20px", textAlign:"center" }}>
                    <div style={{ fontSize:"36px", fontWeight:800, color:"#a78bfa" }}>{dlStats.subscriptions.totalEver}</div>
                    <div style={{ fontSize:"11px", color:"#8892a4", fontWeight:600, marginTop:"4px" }}>Pagaron alguna vez</div>
                  </div>
                  <div style={{ background:"linear-gradient(135deg, #f59e0b18, #f59e0b08)", border:"1px solid #f59e0b30", borderRadius:"16px", padding:"20px", textAlign:"center" }}>
                    <div style={{ fontSize:"36px", fontWeight:800, color:"#f59e0b" }}>{dlStats.subscriptions.conversionRate}%</div>
                    <div style={{ fontSize:"11px", color:"#8892a4", fontWeight:600, marginTop:"4px" }}>Tasa de conversion</div>
                  </div>
                </div>

                {/* Per-app cards */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))", gap:"16px", marginBottom:"24px" }}>
                  {dlStats.apps.map((app) => {
                    const gradients: Record<string, string> = {
                      TrustInsta: "linear-gradient(135deg, #E1306C20, #F7773710)",
                      TrustFace: "linear-gradient(135deg, #1877F220, #0d5bc410)",
                      TrustFarm: "linear-gradient(135deg, #7b9bff20, #4f46e510)",
                    };
                    const colors: Record<string, string> = {
                      TrustInsta: "#E1306C", TrustFace: "#1877F2", TrustFarm: "#7b9bff",
                    };
                    return (
                      <div key={app.name} style={{ background: gradients[app.name] || "#0d0d1a", border:`1px solid ${(colors[app.name] || "#007ABF")}30`, borderRadius:"16px", padding:"22px" }}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"16px" }}>
                          <div>
                            <div style={{ fontSize:"15px", fontWeight:700, color:"#f0efff" }}>{app.name} Desktop</div>
                            <div style={{ fontSize:"11px", color:"#5a6480", marginTop:"2px" }}>Ultima: {app.latest || "—"}</div>
                          </div>
                          <div style={{ fontSize:"28px", fontWeight:800, color: colors[app.name] || "#56B4E0" }}>{app.total}</div>
                        </div>
                        <div style={{ display:"flex", gap:"12px", marginBottom:"14px" }}>
                          <div style={{ flex:1, background:"#0a0a0f", borderRadius:"10px", padding:"10px 14px", textAlign:"center" }}>
                            <div style={{ fontSize:"18px", fontWeight:700, color:"#f0efff" }}>{app.mac}</div>
                            <div style={{ fontSize:"10px", color:"#5a6480", fontWeight:600, marginTop:"2px" }}>macOS</div>
                          </div>
                          <div style={{ flex:1, background:"#0a0a0f", borderRadius:"10px", padding:"10px 14px", textAlign:"center" }}>
                            <div style={{ fontSize:"18px", fontWeight:700, color:"#f0efff" }}>{app.windows}</div>
                            <div style={{ fontSize:"10px", color:"#5a6480", fontWeight:600, marginTop:"2px" }}>Windows</div>
                          </div>
                          <div style={{ flex:1, background:"#34d39910", border:"1px solid #34d39920", borderRadius:"10px", padding:"10px 14px", textAlign:"center" }}>
                            <div style={{ fontSize:"18px", fontWeight:700, color:"#34d399" }}>{app.paidActive}</div>
                            <div style={{ fontSize:"10px", color:"#5a6480", fontWeight:600, marginTop:"2px" }}>Pro activo</div>
                          </div>
                        </div>
                        {/* Per-version breakdown */}
                        <div style={{ fontSize:"11px", fontWeight:700, color:"#5a6480", marginBottom:"8px", textTransform:"uppercase", letterSpacing:"0.5px" }}>Por version</div>
                        <div style={{ maxHeight:"180px", overflow:"auto" }}>
                          {app.releases.filter(r => r.total > 0).map((r) => (
                            <div key={r.version} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:"1px solid #1a1a2e" }}>
                              <div>
                                <span style={{ fontSize:"12px", color:"#f0efff", fontWeight:600 }}>{r.version}</span>
                                <span style={{ fontSize:"10px", color:"#3a3a5c", marginLeft:"8px" }}>{new Date(r.date).toLocaleDateString("es", { day:"2-digit", month:"short" })}</span>
                              </div>
                              <div style={{ display:"flex", gap:"10px", fontSize:"11px" }}>
                                <span style={{ color:"#8892a4" }}>Mac: {r.mac}</span>
                                <span style={{ color:"#8892a4" }}>Win: {r.windows}</span>
                                <span style={{ color: colors[app.name] || "#56B4E0", fontWeight:700 }}>{r.total}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div style={{ textAlign:"center", padding:"40px", color:"#5a6480" }}>No se pudieron cargar las estadisticas</div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
