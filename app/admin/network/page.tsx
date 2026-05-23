"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import { isAdmin } from "@/app/lib/admin";
import { Plus, Trash2, ArrowLeft, Save, X, Users, Star, Search } from "lucide-react";

interface Position {
  user_id: string;
  sponsor_id: string | null;
  placement_parent_id: string | null;
  leg: "left" | "right" | null;
  position_path: string;
  display_name: string;
  is_founder: boolean;
  created_at: string;
  email: string;
  name: string;
  sponsor_email: string;
  sponsor_name: string;
  has_paid: boolean;
}

interface Pending {
  user_id: string;
  sponsor_id: string;
  status: string;
  created_at: string;
  email: string;
  name: string;
  sponsor_email: string;
  sponsor_name: string;
  has_paid: boolean;
}

export default function AdminNetworkPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [pendings, setPendings] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user || !isAdmin(data.user.email)) {
        router.replace("/smm/services");
        return;
      }
      setAuthed(true);
    })();
  }, [router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/network", { credentials: "include" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Error");
      setPositions(j.positions || []);
      setPendings(j.pendings || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) fetchData();
  }, [authed, fetchData]);

  const removeUser = async (userId: string, displayName: string, hasDownline: boolean) => {
    const msg = hasDownline
      ? `${displayName} tiene gente debajo. ¿Eliminar de todos modos (los hijos quedarán huérfanos)?`
      : `¿Eliminar a ${displayName} de la red?`;
    if (!confirm(msg)) return;
    const url = `/api/admin/network?user_id=${userId}${hasDownline ? "&force=1" : ""}`;
    const r = await fetch(url, { method: "DELETE", credentials: "include" });
    if (!r.ok) {
      const j = await r.json();
      alert(j.error || "Error");
      return;
    }
    fetchData();
  };

  if (!authed) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Verificando...</div>;
  }

  const hasDownlineMap: Record<string, boolean> = {};
  positions.forEach((p) => {
    if (p.placement_parent_id) {
      hasDownlineMap[p.placement_parent_id] = true;
    }
  });

  const filterStr = filter.toLowerCase();
  const filteredPositions = positions.filter((p) =>
    !filterStr ||
    p.email.toLowerCase().includes(filterStr) ||
    (p.name || "").toLowerCase().includes(filterStr) ||
    (p.sponsor_email || "").toLowerCase().includes(filterStr)
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 sticky top-0 bg-black/80 backdrop-blur z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-white/60 hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
            <span className="font-bold tracking-widest">TRUST · ADMIN</span>
          </div>
          <div className="flex gap-4 text-sm">
            <Link href="/admin" className="text-white/60 hover:text-white">Dashboard</Link>
            <Link href="/admin/courses" className="text-white/60 hover:text-white">Cursos</Link>
            <Link href="/admin/network" className="text-blue-300 font-semibold">Red</Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-400" />
            Gestión de Red
          </h1>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-semibold flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Agregar usuario
          </button>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded p-3 text-sm">{error}</div>}

        {showAddForm && <AddUserForm onClose={() => setShowAddForm(false)} onSaved={() => { setShowAddForm(false); fetchData(); }} />}

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Stat label="Total en red" value={positions.length} />
          <Stat label="Fundadores" value={positions.filter((p) => p.is_founder).length} />
          <Stat label="Pendientes" value={pendings.length} />
          <Stat label="Suscritos" value={positions.filter((p) => p.has_paid).length} />
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Buscar por nombre, email o sponsor..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-white/30"
            />
          </div>
        </div>

        {pendings.length > 0 && (
          <section className="bg-yellow-500/5 border border-yellow-500/30 rounded-2xl p-5">
            <h2 className="font-bold text-yellow-400 mb-3">Pendientes de colocación ({pendings.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-white/50 uppercase">
                  <tr>
                    <th className="text-left py-2">Usuario</th>
                    <th className="text-left py-2">Invitado por</th>
                    <th className="text-left py-2">Estado</th>
                    <th className="text-right py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {pendings.map((p) => (
                    <tr key={p.user_id}>
                      <td className="py-2">
                        <div className="font-medium">{p.name || p.email}</div>
                        {p.name && p.email && <div className="text-xs text-white/50">{p.email}</div>}
                      </td>
                      <td className="py-2 text-white/70">{p.sponsor_name || p.sponsor_email}</td>
                      <td className="py-2">
                        {p.has_paid ? (
                          <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-300">Pagó</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-300">Sin pagar</span>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        <button onClick={() => removeUser(p.user_id, p.name || p.email, false)} className="p-1.5 bg-red-500/15 hover:bg-red-500/30 text-red-300 rounded">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h2 className="font-bold mb-3">Todas las posiciones ({filteredPositions.length} de {positions.length})</h2>
          {loading ? (
            <p className="text-white/60 text-sm">Cargando...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-white/50 uppercase">
                  <tr>
                    <th className="text-left py-2">Usuario</th>
                    <th className="text-left py-2">Rol</th>
                    <th className="text-left py-2">Pata</th>
                    <th className="text-left py-2">Path</th>
                    <th className="text-left py-2">Sponsor</th>
                    <th className="text-left py-2">Pago</th>
                    <th className="text-right py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredPositions.map((p) => (
                    <tr key={p.user_id}>
                      <td className="py-2">
                        <div className="font-medium text-white">{p.display_name || p.name || p.email}</div>
                        <div className="text-xs text-white/50">{p.email}</div>
                      </td>
                      <td className="py-2">
                        {p.is_founder ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-300">
                            <Star className="w-3 h-3" /> Founder
                          </span>
                        ) : (
                          <span className="text-white/40">—</span>
                        )}
                      </td>
                      <td className="py-2 text-blue-300">
                        {p.leg === "left" ? "← Izq" : p.leg === "right" ? "Der →" : "Top"}
                      </td>
                      <td className="py-2 font-mono text-xs text-white/40">{p.position_path || "—"}</td>
                      <td className="py-2 text-white/70 text-xs">
                        {p.sponsor_email || (p.is_founder ? "(top)" : "—")}
                      </td>
                      <td className="py-2">
                        {p.is_founder ? (
                          <span className="text-yellow-300 text-xs">N/A</span>
                        ) : p.has_paid ? (
                          <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-300">Pagó</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-300">No pagó</span>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        <button onClick={() => removeUser(p.user_id, p.display_name || p.name || p.email, Boolean(hasDownlineMap[p.user_id]))} className="p-1.5 bg-red-500/15 hover:bg-red-500/30 text-red-300 rounded">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="text-xs text-white/50">{label}</div>
      <div className="text-2xl font-bold text-white mt-1">{value}</div>
    </div>
  );
}

function AddUserForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [mode, setMode] = useState<"founder" | "referral">("referral");
  const [email, setEmail] = useState("");
  const [sponsorEmail, setSponsorEmail] = useState("");
  const [leg, setLeg] = useState<"left" | "right">("left");
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setErr(null);
    try {
      const body: Record<string, unknown> = { email, display_name: displayName };
      if (mode === "founder") {
        body.as_founder = true;
      } else {
        body.sponsor_email = sponsorEmail;
        body.leg = leg;
      }
      const r = await fetch("/api/admin/network", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Error");
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white/5 border border-blue-500/30 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold">Agregar usuario a la red</h3>
        <button onClick={onClose}><X className="w-5 h-5 text-white/60 hover:text-white" /></button>
      </div>
      {err && <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded p-2 text-sm mb-3">{err}</div>}

      <div className="flex gap-2 mb-4">
        <button onClick={() => setMode("referral")} className={`px-3 py-1.5 rounded text-xs font-semibold ${mode === "referral" ? "bg-blue-600 text-white" : "bg-white/5 text-white/60"}`}>
          Como referido
        </button>
        <button onClick={() => setMode("founder")} className={`px-3 py-1.5 rounded text-xs font-semibold ${mode === "founder" ? "bg-blue-600 text-white" : "bg-white/5 text-white/60"}`}>
          Como fundador
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-white/60 mb-1 block">Email del usuario *</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@gmail.com" className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm focus:border-blue-400 outline-none" />
        </label>
        <label className="block">
          <span className="text-xs text-white/60 mb-1 block">Display name (opcional)</span>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ej: Juan Pérez (CEO)" className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm focus:border-blue-400 outline-none" />
        </label>

        {mode === "referral" && (
          <>
            <label className="block">
              <span className="text-xs text-white/60 mb-1 block">Email del sponsor *</span>
              <input value={sponsorEmail} onChange={(e) => setSponsorEmail(e.target.value)} placeholder="sponsor@gmail.com" className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm focus:border-blue-400 outline-none" />
            </label>
            <label className="block">
              <span className="text-xs text-white/60 mb-1 block">Pata *</span>
              <select value={leg} onChange={(e) => setLeg(e.target.value as "left" | "right")} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm focus:border-blue-400 outline-none">
                <option value="left">Izquierda</option>
                <option value="right">Derecha</option>
              </select>
            </label>
          </>
        )}
      </div>

      <p className="text-xs text-white/50 mt-3">
        {mode === "founder"
          ? "El usuario será fundador. Si ya existía en la red, se actualizará a fundador."
          : "El usuario será colocado en la pata indicada del sponsor (con spillover automático). El admin override permite saltarse la validación de pago."}
      </p>

      <button onClick={submit} disabled={saving || !email || (mode === "referral" && !sponsorEmail)} className="mt-4 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/30 rounded-lg text-sm font-bold flex items-center gap-2">
        <Save className="w-4 h-4" /> {saving ? "Guardando..." : "Agregar"}
      </button>
    </div>
  );
}
