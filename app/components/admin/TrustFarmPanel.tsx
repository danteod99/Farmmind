"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { Search, X, Smartphone, Monitor, Ban, ShieldCheck, ChevronDown, Save, RefreshCw, Info } from "lucide-react";

/* ─────────────────────────── tipos ─────────────────────────── */

type Plan = "free" | "full" | "custom";
type Status = "active" | "blocked" | "expired";

interface ProfileRef { email: string; full_name: string | null }
interface DeviceRow { device_fingerprint: string; label: string | null; first_seen: string | null; last_seen: string | null }
interface MachineRow { machine_id: string; app_version: string | null; agent_version: string | null; device_count: number | null; last_seen: string | null }

interface LicenseRow {
  id: string;
  user_id: string;
  plan: Plan;
  max_devices: number | null;
  allowed_platforms: string[] | null;
  status: Status;
  blocked_reason: string | null;
  expires_at: string | null;
  max_machines: number | null;
  offline_grace_hours: number | null;
  notes: string | null;
  created_at: string;
  profile: ProfileRef | null;
  devices: DeviceRow[];
  machines: MachineRow[];
}

/** Fila cruda de PostgREST: los embeds llegan con el nombre de la tabla. */
interface RawRow {
  id: string;
  user_id: string;
  plan: Plan;
  max_devices: number | null;
  allowed_platforms: string[] | null;
  status: Status;
  blocked_reason: string | null;
  expires_at: string | null;
  max_machines: number | null;
  offline_grace_hours: number | null;
  notes: string | null;
  created_at: string;
  profiles: ProfileRef | ProfileRef[] | null;
  license_devices: DeviceRow[] | null;
  heartbeats: MachineRow[] | null;
}

interface Draft {
  plan: Plan;
  maxDevices: string;
  platforms: string[];
  status: Status;
  blockedReason: string;
  expiresAt: string;
  notes: string;
}

/* ─────────────────────────── constantes ─────────────────────────── */

const PLANS: Plan[] = ["free", "full", "custom"];
const STATUSES: Status[] = ["active", "blocked", "expired"];
const PLATFORMS = ["tiktok", "instagram", "facebook", "spotify"];
const APP_ID = "trustfarm";
const PAGE_SIZE = 50;
const ACTIVE_PC_MS = 24 * 60 * 60 * 1000;

const SELECT =
  "id,user_id,plan,max_devices,allowed_platforms,status,blocked_reason,expires_at," +
  "max_machines,offline_grace_hours,notes,created_at," +
  "profiles!inner(email,full_name)," +
  "license_devices(device_fingerprint,label,first_seen,last_seen)," +
  "heartbeats(machine_id,app_version,agent_version,device_count,last_seen)";

const GRID = "1.9fr 0.65fr 1.15fr 0.8fr 1.1fr 0.9fr 0.7fr 1.25fr";

const PLAN_COLOR: Record<Plan, string> = { free: "#8892a4", full: "#56B4E0", custom: "#a78bfa" };
const PLAN_LABEL: Record<Plan, string> = { free: "Free", full: "Full", custom: "Custom" };
const STATUS_COLOR: Record<Status, string> = { active: "#34d399", blocked: "#f87171", expired: "#f59e0b" };
const STATUS_LABEL: Record<Status, string> = { active: "Activa", blocked: "Bloqueada", expired: "Expirada" };

/* ─────────────────────────── helpers ─────────────────────────── */

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

/** expires_at se guarda al final del dia elegido (UTC); se muestra en UTC para que la
 *  tabla enseñe exactamente la fecha que se escribio en el formulario. */
function fmtExpiry(d: string | null | undefined) {
  if (!d) return "Nunca";
  return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

function timeAgo(d: string | null | undefined) {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

/** true si el timestamp cae dentro de las ultimas 24 h. */
function isRecent(d: string | null | undefined) {
  if (!d) return false;
  return Date.now() - new Date(d).getTime() < ACTIVE_PC_MS;
}

/** true si la fecha ya paso. */
function isPast(d: string | null | undefined) {
  if (!d) return false;
  return new Date(d).getTime() < Date.now();
}

function isPcActive(machines: MachineRow[]) {
  return machines.some((h) => isRecent(h.last_seen));
}

function normalize(r: RawRow): LicenseRow {
  const p = Array.isArray(r.profiles) ? (r.profiles[0] ?? null) : r.profiles;
  return {
    id: r.id,
    user_id: r.user_id,
    plan: r.plan,
    max_devices: r.max_devices,
    allowed_platforms: r.allowed_platforms,
    status: r.status,
    blocked_reason: r.blocked_reason,
    expires_at: r.expires_at,
    max_machines: r.max_machines,
    offline_grace_hours: r.offline_grace_hours,
    notes: r.notes,
    created_at: r.created_at,
    profile: p,
    devices: r.license_devices ?? [],
    machines: r.heartbeats ?? [],
  };
}

function draftFrom(r: LicenseRow): Draft {
  return {
    plan: r.plan,
    maxDevices: r.max_devices === null || r.max_devices === undefined ? "" : String(r.max_devices),
    platforms: r.allowed_platforms ? [...r.allowed_platforms] : [],
    status: r.status,
    blockedReason: r.blocked_reason ?? "",
    expiresAt: r.expires_at ? r.expires_at.slice(0, 10) : "",
    notes: r.notes ?? "",
  };
}

/** Construye el patron ILIKE del termino de busqueda, listo para incrustar en un filtro
 *  or=(...) de PostgREST. Devuelve null si el termino queda vacio.
 *
 *  1. Comodines de ILIKE: `\`, `%` y `_` se escapan con `\` para que se busquen como
 *     literales (ej. "ana_lopez@gmail.com" no debe tratar el `_` como "un caracter
 *     cualquiera"). PostgREST reescribe `*` a `%` antes de que el patron llegue a ILIKE y
 *     no admite escaparlo, asi que tambien se escapa aqui y nunca actua como comodin.
 *  2. Sintaxis de PostgREST: el valor se devuelve entre comillas dobles, con `\` y `"`
 *     escapados. Asi las comas, parentesis y comillas del termino se buscan tal cual
 *     (ej. "Smith, John") en vez de romper el or=(...) o desaparecer del patron.
 */
function ilikePattern(term: string): string | null {
  const trimmed = term.trim();
  if (!trimmed) return null;
  const escaped = trimmed
    .replace(/[\\%_*]/g, (c) => "\\" + c) // literales para ILIKE
    .replace(/[\\"]/g, (c) => "\\" + c); // literales para el parser de PostgREST
  return `"%${escaped}%"`;
}

/* El cliente compartido se exporta como ReturnType<typeof createBrowserClient>, y ahi
   el generico Database queda instanciado como `unknown`: supabase.schema() acaba
   aceptando `never` y TypeScript rechaza cualquier nombre de esquema. Se accede al
   esquema trustfarm con esta vista estructural minima (solo lo que usa este panel).
   Sigue siendo el mismo cliente anon del navegador; la autorizacion real la aplica RLS
   via trustfarm.is_admin(). */
interface TfResponse { data: unknown; error: { message: string } | null }
interface TfBuilder extends PromiseLike<TfResponse> {
  select(columns: string): TfBuilder;
  update(values: Record<string, unknown>): TfBuilder;
  eq(column: string, value: string): TfBuilder;
  or(filters: string, options?: { referencedTable?: string }): TfBuilder;
  order(column: string, options: { ascending: boolean }): TfBuilder;
  limit(count: number): TfBuilder;
}
interface TfSchema { from(table: string): TfBuilder }

function trustfarm(table: string): TfBuilder {
  return (supabase as unknown as { schema(name: string): TfSchema }).schema("trustfarm").from(table);
}

async function fetchLicenses(term: string): Promise<{ rows: LicenseRow[]; error: string | null }> {
  try {
    let q = trustfarm("licenses").select(SELECT).eq("app_id", APP_ID);
    const pattern = ilikePattern(term);
    if (pattern) {
      q = q.or(`email.ilike.${pattern},full_name.ilike.${pattern}`, { referencedTable: "profiles" });
    }
    const { data, error } = await q.order("created_at", { ascending: false }).limit(PAGE_SIZE);
    if (error) return { rows: [], error: error.message };
    return { rows: ((data ?? []) as unknown as RawRow[]).map(normalize), error: null };
  } catch (e) {
    return { rows: [], error: e instanceof Error ? e.message : "Error de conexion" };
  }
}

async function updateLicense(id: string, patch: Record<string, unknown>): Promise<string | null> {
  try {
    const { error } = await trustfarm("licenses").update(patch).eq("id", id);
    return error ? error.message : null;
  } catch (e) {
    return e instanceof Error ? e.message : "Error de conexion";
  }
}

/* ─────────────────────────── estilos compartidos ─────────────────────────── */

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#07070e",
  border: "1px solid #1e1e30",
  borderRadius: "7px",
  padding: "7px 9px",
  color: "white",
  fontSize: "12px",
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
  colorScheme: "dark",
};

const cardStyle: React.CSSProperties = {
  background: "#0a0a14",
  border: "1px solid #1a1a2e",
  borderRadius: "11px",
  padding: "13px",
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: "10px",
  fontWeight: 700,
  color: "#3a3a5c",
  marginBottom: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const fieldLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "10px",
  fontWeight: 700,
  color: "#5a6480",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  marginBottom: "5px",
};

function Badge({ text, color, title }: { text: string; color: string; title?: string }) {
  return (
    <span
      title={title}
      style={{
        display: "inline-block",
        padding: "3px 8px",
        borderRadius: "6px",
        background: `${color}15`,
        border: `1px solid ${color}30`,
        color,
        fontSize: "10px",
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

/* ─────────────────────────── componente ─────────────────────────── */

export default function TrustFarmPanel() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<LicenseRow[]>([]);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsgState] = useState<Record<string, { text: string; ok: boolean }>>({});

  const [blockingId, setBlockingId] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState<Record<string, string>>({});

  // Debounce de la busqueda (mismo patron que el resto del panel admin).
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Carga. Todos los setState ocurren despues del await, nunca de forma
  // sincrona dentro del efecto.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const res = await fetchLicenses(debounced);
      if (cancelled) return;
      setRows(res.rows);
      setError(res.error);
      setLoading(false);
      // La lista es nueva: no dejar abierto un borrador ni mensajes de la anterior.
      setExpanded(null);
      setDraft(null);
      setBlockingId(null);
      setMsgState({});
    };
    run();
    return () => { cancelled = true; };
  }, [debounced, reloadKey]);

  const setMsg = (id: string, text: string, ok: boolean) => setMsgState((m) => ({ ...m, [id]: { text, ok } }));

  const patchRow = (id: string, patch: Partial<LicenseRow>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const toggleRow = (r: LicenseRow) => {
    if (expanded === r.id) { setExpanded(null); setDraft(null); return; }
    setExpanded(r.id);
    setDraft(draftFrom(r));
    setMsg(r.id, "", true);
  };

  const refresh = () => { setLoading(true); setReloadKey((k) => k + 1); };

  /* ── guardar el formulario completo ── */
  const save = async (r: LicenseRow) => {
    if (!draft) return;

    let maxDevices: number | null = null;
    const raw = draft.maxDevices.trim();
    if (raw !== "") {
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 1) {
        setMsg(r.id, "Tope de moviles invalido: usa un entero mayor que 0, o dejalo vacio para sin tope.", false);
        return;
      }
      maxDevices = n;
    }
    if (draft.status === "blocked" && !draft.blockedReason.trim()) {
      setMsg(r.id, "Escribe el motivo del bloqueo.", false);
      return;
    }

    const platforms = draft.platforms.length === 0 ? null : draft.platforms;
    const blockedReason = draft.status === "blocked" ? draft.blockedReason.trim() : null;
    // El input date da un dia; se guarda al final de ese dia (UTC) para que la
    // licencia siga viva durante toda la fecha mostrada.
    const expiresAt = draft.expiresAt ? new Date(`${draft.expiresAt}T23:59:59.000Z`).toISOString() : null;
    const notes = draft.notes.trim() === "" ? null : draft.notes.trim();

    setSavingId(r.id);
    setMsg(r.id, "", true);
    const err = await updateLicense(r.id, {
      plan: draft.plan,
      max_devices: maxDevices,
      allowed_platforms: platforms,
      status: draft.status,
      blocked_reason: blockedReason,
      expires_at: expiresAt,
      notes,
    });
    setSavingId(null);

    if (err) { setMsg(r.id, `Error al guardar: ${err}`, false); return; }

    patchRow(r.id, {
      plan: draft.plan,
      max_devices: maxDevices,
      allowed_platforms: platforms,
      status: draft.status,
      blocked_reason: blockedReason,
      expires_at: expiresAt,
      notes,
    });
    setMsg(r.id, "Cambios guardados.", true);
  };

  /* ── bloqueo / desbloqueo rapido ── */
  const unblock = async (r: LicenseRow) => {
    setBusyId(r.id);
    setMsg(r.id, "", true);
    const err = await updateLicense(r.id, { status: "active", blocked_reason: null });
    setBusyId(null);
    if (err) { setMsg(r.id, `Error al desbloquear: ${err}`, false); return; }
    patchRow(r.id, { status: "active", blocked_reason: null });
    if (expanded === r.id) setDraft((d) => (d ? { ...d, status: "active", blockedReason: "" } : d));
    setMsg(r.id, "Licencia desbloqueada.", true);
  };

  const confirmBlock = async (r: LicenseRow) => {
    const reason = (blockReason[r.id] || "").trim();
    if (!reason) { setMsg(r.id, "Indica el motivo del bloqueo antes de confirmar.", false); return; }
    setBusyId(r.id);
    setMsg(r.id, "", true);
    const err = await updateLicense(r.id, { status: "blocked", blocked_reason: reason });
    setBusyId(null);
    if (err) { setMsg(r.id, `Error al bloquear: ${err}`, false); return; }
    patchRow(r.id, { status: "blocked", blocked_reason: reason });
    if (expanded === r.id) setDraft((d) => (d ? { ...d, status: "blocked", blockedReason: reason } : d));
    setBlockingId(null);
    setBlockReason((b) => ({ ...b, [r.id]: "" }));
    setMsg(r.id, "Licencia bloqueada.", true);
  };

  /* ─────────────────────────── render ─────────────────────────── */

  return (
    <div style={{ animation: "fi 0.3s ease-out" }}>

      {/* BUSCADOR */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "14px", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
          <Search size={14} style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: "#5a6480" }} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setLoading(true); }}
            placeholder="Buscar cliente por email o nombre..."
            style={{ width: "100%", background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: "9px", padding: "9px 32px", color: "white", fontSize: "13px", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setLoading(true); }}
              style={{ position: "absolute", right: "9px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#5a6480", cursor: "pointer", display: "flex" }}
            >
              <X size={12} />
            </button>
          )}
        </div>
        <button
          onClick={refresh}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 14px", borderRadius: "9px", background: "#007ABF18", border: "1px solid #007ABF30", color: "#56B4E0", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
        >
          <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Actualizar
        </button>
      </div>

      <p style={{ fontSize: "11px", color: "#5a6480", marginBottom: "14px" }}>
        {debounced
          ? `Licencias de TrustFarm que coinciden con la busqueda (max. ${PAGE_SIZE}).`
          : `Ultimas ${PAGE_SIZE} licencias de TrustFarm creadas. Escribe arriba para buscar un cliente.`}
      </p>

      {error && (
        <div style={{ background: "#f8717115", border: "1px solid #f8717140", borderRadius: "10px", padding: "10px 14px", marginBottom: "16px", color: "#f87171", fontSize: "13px" }}>
          ⚠️ {error}
        </div>
      )}

      {loading && rows.length === 0 ? (
        <div style={{ padding: "50px", textAlign: "center", color: "#5a6480", fontSize: "13px" }}>Cargando licencias...</div>
      ) : rows.length === 0 ? (
        <div style={{ ...cardStyle, padding: "34px 26px", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "38px", height: "38px", borderRadius: "10px", background: "#007ABF15", border: "1px solid #007ABF30", color: "#56B4E0", marginBottom: "12px" }}>
            <Info size={18} />
          </div>
          <p style={{ fontSize: "14px", fontWeight: 700, color: "white", marginBottom: "7px" }}>
            {debounced ? `Ningun cliente coincide con ${`"${debounced}"`}` : "Todavia no hay licencias de TrustFarm"}
          </p>
          <p style={{ fontSize: "12px", color: "#5a6480", lineHeight: "1.6", maxWidth: "540px", margin: "0 auto" }}>
            Esta pantalla administra licencias que ya existen. Las cuentas nuevas se dan de alta desde el servidor con{" "}
            <span style={{ fontFamily: "monospace", color: "#8892a4" }}>trustfarm-backend/scripts/migrate-users.mjs</span>; una vez creadas aparecen aqui automaticamente.
          </p>
        </div>
      ) : (
        <div style={{ background: "#0a0a14", border: "1px solid #1a1a2e", borderRadius: "14px", overflow: "hidden", opacity: loading ? 0.55 : 1, transition: "opacity 0.15s" }}>
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: "1020px" }}>

              {/* CABECERA */}
              <div style={{ display: "grid", gridTemplateColumns: GRID, gap: "10px", padding: "11px 18px", borderBottom: "1px solid #1a1a2e", background: "#07070e" }}>
                {["Cliente", "Plan", "Estado", "Moviles", "Plataformas", "Expira", "PC", "Acciones"].map((h) => (
                  <span key={h} style={{ fontSize: "10px", fontWeight: 700, color: "#3a3a5c", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</span>
                ))}
              </div>

              {rows.map((r) => {
                const exp = expanded === r.id;
                const pcOn = isPcActive(r.machines);
                const rowMsg = msg[r.id];
                const busy = busyId === r.id;
                const pendingReason = (blockReason[r.id] || "").trim();
                return (
                  <div key={r.id}>
                    {/* FILA */}
                    <div
                      onClick={() => toggleRow(r)}
                      className="ur"
                      style={{ display: "grid", gridTemplateColumns: GRID, gap: "10px", padding: "13px 18px", borderBottom: "1px solid #0d0d1a", cursor: "pointer", alignItems: "center", transition: "background 0.15s" }}
                    >
                      {/* Cliente */}
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: "13px", fontWeight: 600, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.profile?.email || ""}>
                          {r.profile?.email || "—"}
                        </p>
                        <p style={{ fontSize: "11px", color: "#5a6480", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.profile?.full_name || "Sin nombre"}
                        </p>
                      </div>

                      {/* Plan */}
                      <div><Badge text={PLAN_LABEL[r.plan]} color={PLAN_COLOR[r.plan]} /></div>

                      {/* Estado */}
                      <div style={{ minWidth: 0 }}>
                        <Badge text={STATUS_LABEL[r.status]} color={STATUS_COLOR[r.status]} />
                        {r.status === "blocked" && r.blocked_reason && (
                          <p style={{ fontSize: "10px", color: "#f8717199", marginTop: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.blocked_reason}>
                            {r.blocked_reason}
                          </p>
                        )}
                      </div>

                      {/* Moviles */}
                      <div>
                        <p style={{ fontSize: "13px", fontWeight: 700, color: "#e2e8f0" }}>
                          {r.devices.length}
                          <span style={{ color: "#3a3a5c", fontWeight: 500 }}> / {r.max_devices === null ? "∞" : r.max_devices}</span>
                        </p>
                        <p style={{ fontSize: "10px", color: "#5a6480" }}>{r.max_devices === null ? "Sin tope" : "en uso / tope"}</p>
                      </div>

                      {/* Plataformas */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {r.allowed_platforms === null || r.allowed_platforms.length === 0
                          ? <Badge text="Todas" color="#8892a4" />
                          : r.allowed_platforms.map((p) => <Badge key={p} text={p} color="#56B4E0" />)}
                      </div>

                      {/* Expira */}
                      <p style={{ fontSize: "12px", color: isPast(r.expires_at) ? "#f59e0b" : "#8892a4" }}>
                        {fmtExpiry(r.expires_at)}
                      </p>

                      {/* PC activa */}
                      <div>
                        {pcOn
                          ? <Badge text="PC activa" color="#34d399" title="Heartbeat en las ultimas 24 h" />
                          : <Badge text="Sin PC" color="#3a3a5c" title="Sin heartbeat en las ultimas 24 h" />}
                      </div>

                      {/* Acciones */}
                      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "flex-end" }}>
                        {r.status === "blocked" ? (
                          <button
                            onClick={() => unblock(r)}
                            disabled={busy}
                            style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 10px", borderRadius: "7px", background: "#34d39915", border: "1px solid #34d39940", color: "#34d399", fontSize: "11px", fontWeight: 700, cursor: busy ? "wait" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
                          >
                            <ShieldCheck size={12} /> {busy ? "..." : "Desbloquear"}
                          </button>
                        ) : (
                          <button
                            onClick={() => { setBlockingId(blockingId === r.id ? null : r.id); setMsg(r.id, "", true); }}
                            disabled={busy}
                            style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 10px", borderRadius: "7px", background: blockingId === r.id ? "#f8717125" : "#f8717112", border: "1px solid #f8717140", color: "#f87171", fontSize: "11px", fontWeight: 700, cursor: busy ? "wait" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
                          >
                            <Ban size={12} /> Bloquear
                          </button>
                        )}
                        <button
                          onClick={() => toggleRow(r)}
                          style={{ background: "none", border: "none", color: "#3a3a5c", cursor: "pointer", display: "flex", padding: "2px", transform: exp ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
                          title={exp ? "Cerrar" : "Editar licencia"}
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>
                    </div>

                    {/* MOTIVO DE BLOQUEO (inline, sin prompt del navegador) */}
                    {blockingId === r.id && r.status !== "blocked" && (
                      <div style={{ display: "flex", gap: "7px", alignItems: "center", padding: "10px 18px", background: "#100709", borderBottom: "1px solid #0d0d1a", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "11px", color: "#f8717199", fontWeight: 600, whiteSpace: "nowrap" }}>Motivo del bloqueo:</span>
                        <input
                          autoFocus
                          value={blockReason[r.id] || ""}
                          onChange={(e) => setBlockReason((b) => ({ ...b, [r.id]: e.target.value }))}
                          placeholder="Ej. pago vencido, uso indebido..."
                          style={{ ...inputStyle, flex: 1, minWidth: "200px", width: "auto", border: "1px solid #f8717130" }}
                        />
                        <button
                          onClick={() => confirmBlock(r)}
                          disabled={busy || !pendingReason}
                          style={{ padding: "7px 12px", borderRadius: "7px", background: pendingReason ? "#f8717120" : "#1a1a2e", border: `1px solid ${pendingReason ? "#f8717150" : "#1e1e30"}`, color: pendingReason ? "#f87171" : "#3a3a5c", fontSize: "11px", fontWeight: 700, cursor: pendingReason && !busy ? "pointer" : "not-allowed", fontFamily: "inherit", whiteSpace: "nowrap" }}
                        >
                          {busy ? "Bloqueando..." : "Confirmar bloqueo"}
                        </button>
                        <button
                          onClick={() => setBlockingId(null)}
                          style={{ padding: "7px 9px", borderRadius: "7px", background: "transparent", border: "1px solid #1e1e30", color: "#5a6480", cursor: "pointer", display: "flex", fontFamily: "inherit" }}
                          title="Cancelar"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}

                    {/* MENSAJE INLINE (cuando la fila no esta expandida) */}
                    {rowMsg?.text && !exp && (
                      <div style={{ padding: "8px 18px", borderBottom: "1px solid #0d0d1a", background: rowMsg.ok ? "#34d39908" : "#f8717108" }}>
                        <span style={{ fontSize: "11px", color: rowMsg.ok ? "#34d399" : "#f87171" }}>{rowMsg.text}</span>
                      </div>
                    )}

                    {/* PANEL EXPANDIDO */}
                    {exp && draft && (
                      <div style={{ background: "#070710", borderBottom: "1px solid #0d0d1a", padding: "16px 18px 20px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "14px" }}>

                          {/* ── Formulario de licencia ── */}
                          <div style={{ ...cardStyle, border: "1px solid #007ABF25" }}>
                            <p style={{ ...cardTitleStyle, color: "#56B4E080" }}>Licencia</p>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                              <div>
                                <label style={fieldLabelStyle}>Plan</label>
                                <select
                                  value={draft.plan}
                                  onChange={(e) => setDraft((d) => (d ? { ...d, plan: e.target.value as Plan } : d))}
                                  style={inputStyle}
                                >
                                  {PLANS.map((p) => <option key={p} value={p}>{PLAN_LABEL[p]}</option>)}
                                </select>
                              </div>
                              <div>
                                <label style={fieldLabelStyle}>Estado</label>
                                <select
                                  value={draft.status}
                                  onChange={(e) => setDraft((d) => (d ? { ...d, status: e.target.value as Status } : d))}
                                  style={inputStyle}
                                >
                                  {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                                </select>
                              </div>
                            </div>

                            {draft.status === "blocked" && (
                              <div style={{ marginBottom: "10px" }}>
                                <label style={fieldLabelStyle}>Motivo del bloqueo</label>
                                <input
                                  value={draft.blockedReason}
                                  onChange={(e) => setDraft((d) => (d ? { ...d, blockedReason: e.target.value } : d))}
                                  placeholder="Obligatorio para bloquear"
                                  style={inputStyle}
                                />
                              </div>
                            )}

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                              <div>
                                <label style={fieldLabelStyle}>Tope de moviles</label>
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={draft.maxDevices}
                                  onChange={(e) => setDraft((d) => (d ? { ...d, maxDevices: e.target.value } : d))}
                                  placeholder="Sin tope"
                                  style={inputStyle}
                                />
                                <p style={{ fontSize: "10px", color: "#3a3a5c", marginTop: "4px" }}>Vacio = sin tope. Celulares por ADB.</p>
                              </div>
                              <div>
                                <label style={fieldLabelStyle}>Expira</label>
                                <input
                                  type="date"
                                  value={draft.expiresAt}
                                  onChange={(e) => setDraft((d) => (d ? { ...d, expiresAt: e.target.value } : d))}
                                  style={inputStyle}
                                />
                                <p style={{ fontSize: "10px", color: "#3a3a5c", marginTop: "4px" }}>Vacio = nunca expira.</p>
                              </div>
                            </div>

                            <div style={{ marginBottom: "10px" }}>
                              <label style={fieldLabelStyle}>Plataformas permitidas</label>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                {PLATFORMS.map((p) => {
                                  const on = draft.platforms.includes(p);
                                  return (
                                    <button
                                      key={p}
                                      onClick={() => setDraft((d) => (d ? { ...d, platforms: on ? d.platforms.filter((x) => x !== p) : [...d.platforms, p] } : d))}
                                      style={{ padding: "6px 11px", borderRadius: "7px", border: `1px solid ${on ? "#007ABF" : "#1e1e30"}`, background: on ? "#007ABF20" : "transparent", color: on ? "#88D0F0" : "#5a6480", fontSize: "11px", fontWeight: on ? 700 : 500, cursor: "pointer", fontFamily: "inherit" }}
                                    >
                                      {on ? "✓ " : ""}{p}
                                    </button>
                                  );
                                })}
                              </div>
                              <p style={{ fontSize: "10px", color: "#3a3a5c", marginTop: "5px" }}>
                                {draft.platforms.length === 0 ? "Ninguna marcada = todas permitidas." : `${draft.platforms.length} plataforma(s) permitidas.`}
                              </p>
                            </div>

                            <div style={{ marginBottom: "12px" }}>
                              <label style={fieldLabelStyle}>Notas internas</label>
                              <textarea
                                value={draft.notes}
                                onChange={(e) => setDraft((d) => (d ? { ...d, notes: e.target.value } : d))}
                                rows={3}
                                placeholder="Notas del operador (no las ve el cliente)"
                                style={{ ...inputStyle, resize: "vertical", minHeight: "58px", lineHeight: "1.5" }}
                              />
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "9px", flexWrap: "wrap" }}>
                              <button
                                onClick={() => save(r)}
                                disabled={savingId === r.id}
                                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "8px", background: "#007ABF20", border: "1px solid #007ABF50", color: "#88D0F0", fontSize: "12px", fontWeight: 700, cursor: savingId === r.id ? "wait" : "pointer", fontFamily: "inherit" }}
                              >
                                <Save size={13} /> {savingId === r.id ? "Guardando..." : "Guardar cambios"}
                              </button>
                              <button
                                onClick={() => setDraft(draftFrom(r))}
                                style={{ padding: "8px 12px", borderRadius: "8px", background: "transparent", border: "1px solid #1e1e30", color: "#5a6480", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                              >
                                Descartar
                              </button>
                            </div>

                            {rowMsg?.text && (
                              <div style={{ marginTop: "10px", padding: "7px 10px", borderRadius: "7px", background: rowMsg.ok ? "#34d39912" : "#f8717112", border: `1px solid ${rowMsg.ok ? "#34d39930" : "#f8717130"}`, fontSize: "11px", color: rowMsg.ok ? "#34d399" : "#f87171" }}>
                                {rowMsg.text}
                              </div>
                            )}
                          </div>

                          {/* ── Moviles registrados (solo lectura) ── */}
                          <div style={cardStyle}>
                            <p style={cardTitleStyle}>
                              <Smartphone size={11} style={{ display: "inline", verticalAlign: "-1px", marginRight: "5px" }} />
                              Moviles registrados ({r.devices.length})
                            </p>
                            {r.devices.length === 0 ? (
                              <p style={{ fontSize: "12px", color: "#3a3a5c" }}>Sin moviles registrados todavia.</p>
                            ) : (
                              [...r.devices]
                                .sort((a, b) => new Date(b.last_seen || 0).getTime() - new Date(a.last_seen || 0).getTime())
                                .map((d) => (
                                  <div key={d.device_fingerprint} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", padding: "6px 0", borderBottom: "1px solid #12121f" }}>
                                    <div style={{ minWidth: 0 }}>
                                      <p style={{ fontSize: "12px", color: "#e2e8f0", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={d.device_fingerprint}>
                                        {d.device_fingerprint}
                                      </p>
                                      <p style={{ fontSize: "10px", color: "#5a6480" }}>{d.label || "Sin etiqueta"} · alta {fmtDate(d.first_seen)}</p>
                                    </div>
                                    <span style={{ fontSize: "10px", color: "#8892a4", whiteSpace: "nowrap", flexShrink: 0 }} title={fmtDate(d.last_seen)}>{timeAgo(d.last_seen)}</span>
                                  </div>
                                ))
                            )}
                          </div>

                          {/* ── PCs / heartbeats (solo lectura) ── */}
                          <div style={cardStyle}>
                            <p style={cardTitleStyle}>
                              <Monitor size={11} style={{ display: "inline", verticalAlign: "-1px", marginRight: "5px" }} />
                              PCs con la app ({r.machines.length} / {r.max_machines ?? "∞"})
                            </p>
                            {r.machines.length === 0 ? (
                              <p style={{ fontSize: "12px", color: "#3a3a5c" }}>Sin heartbeats. El cliente no ha abierto la app de escritorio.</p>
                            ) : (
                              [...r.machines]
                                .sort((a, b) => new Date(b.last_seen || 0).getTime() - new Date(a.last_seen || 0).getTime())
                                .map((h) => {
                                  const on = isRecent(h.last_seen);
                                  return (
                                    <div key={h.machine_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", padding: "6px 0", borderBottom: "1px solid #12121f" }}>
                                      <div style={{ minWidth: 0 }}>
                                        <p style={{ fontSize: "12px", color: "#e2e8f0", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={h.machine_id}>
                                          {h.machine_id}
                                        </p>
                                        <p style={{ fontSize: "10px", color: "#5a6480" }}>
                                          app {h.app_version || "?"} · agente {h.agent_version || "?"}
                                          {h.device_count !== null && h.device_count !== undefined ? ` · ${h.device_count} moviles` : ""}
                                        </p>
                                      </div>
                                      <span style={{ fontSize: "10px", color: on ? "#34d399" : "#5a6480", whiteSpace: "nowrap", flexShrink: 0 }} title={fmtDate(h.last_seen)}>
                                        {timeAgo(h.last_seen)}
                                      </span>
                                    </div>
                                  );
                                })
                            )}
                          </div>

                          {/* ── Datos de la cuenta (solo lectura) ── */}
                          <div style={cardStyle}>
                            <p style={cardTitleStyle}>Cuenta</p>
                            {([
                              ["Email", r.profile?.email || "—"],
                              ["Nombre", r.profile?.full_name || "—"],
                              ["User ID", `${r.user_id.slice(0, 13)}...`],
                              ["Licencia ID", `${r.id.slice(0, 13)}...`],
                              ["Creada", fmtDate(r.created_at)],
                              ["Tope de PCs", r.max_machines === null ? "Sin tope" : String(r.max_machines)],
                              ["Gracia offline", r.offline_grace_hours === null ? "—" : `${r.offline_grace_hours} h`],
                            ] as [string, string][]).map(([k, v]) => (
                              <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginBottom: "5px" }}>
                                <span style={{ fontSize: "11px", color: "#5a6480" }}>{k}</span>
                                <span style={{ fontSize: "11px", color: "#8892a4", fontFamily: k.includes("ID") ? "monospace" : "inherit", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={v}>{v}</span>
                              </div>
                            ))}
                            <p style={{ fontSize: "10px", color: "#3a3a5c", marginTop: "9px", lineHeight: "1.5" }}>
                              Moviles y PCs son solo lectura: los escribe la app de escritorio con su heartbeat.
                            </p>
                          </div>

                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <p style={{ marginTop: "16px", fontSize: "11px", color: "#3a3a5c", textAlign: "center", lineHeight: "1.6" }}>
        Alta de clientes nuevos: <span style={{ fontFamily: "monospace", color: "#5a6480" }}>trustfarm-backend/scripts/migrate-users.mjs</span>.
        Aqui solo se administran licencias ya existentes.
      </p>
    </div>
  );
}
