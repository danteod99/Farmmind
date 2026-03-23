"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Profile {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  avatar_url: string;
  is_admin: boolean;
  created_at: string;
}

interface Solicitud {
  id: string;
  user_id: string;
  producto: string;
  pais: string;
  monto: number;
  estado: "pendiente" | "en_revision" | "aprobado" | "rechazado";
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  created_at: string;
  // joined from profiles
  profiles?: { nombre: string; apellido: string; email: string; telefono: string };
}

type TabType = "solicitudes" | "usuarios";
type FilterEstado = "todos" | "pendiente" | "en_revision" | "aprobado" | "rechazado";

export default function AdminPanel() {
  const { user, isAdmin, isLoading, logout } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<TabType>("solicitudes");
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [filterEstado, setFilterEstado] = useState<FilterEstado>("todos");
  const [filterProducto, setFilterProducto] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSolicitud, setSelectedSolicitud] = useState<Solicitud | null>(null);

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.push("/admin/login");
    }
  }, [isAdmin, isLoading, router]);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    try {
      // Load solicitudes with profile info
      const { data: solData } = await supabase
        .from("solicitudes")
        .select("*, profiles(nombre, apellido, email, telefono)")
        .order("created_at", { ascending: false });

      if (solData) {
        setSolicitudes(solData.map((s: any) => ({
          ...s,
          nombre: s.profiles?.nombre || s.nombre || "",
          apellido: s.profiles?.apellido || s.apellido || "",
          email: s.profiles?.email || s.email || "",
          telefono: s.profiles?.telefono || s.telefono || "",
        })));
      }

      // Load users
      const { data: userData } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (userData) {
        setUsers(userData);
      }
    } catch {}
  };

  const updateSolicitudEstado = async (solicitudId: string, newEstado: string) => {
    try {
      const { error } = await supabase
        .from("solicitudes")
        .update({ estado: newEstado })
        .eq("id", solicitudId);

      if (!error) {
        loadData();
        if (selectedSolicitud?.id === solicitudId) {
          setSelectedSolicitud((prev) => prev ? { ...prev, estado: newEstado as any } : null);
        }
      }
    } catch {}
  };

  const filtered = solicitudes.filter((s) => {
    if (filterEstado !== "todos" && s.estado !== filterEstado) return false;
    if (filterProducto && s.producto !== filterProducto) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        `${s.nombre} ${s.apellido}`.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.producto.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalMonto = solicitudes.reduce((sum, s) => sum + Number(s.monto), 0);
  const pendientes = solicitudes.filter((s) => s.estado === "pendiente").length;
  const enRevision = solicitudes.filter((s) => s.estado === "en_revision").length;
  const aprobadas = solicitudes.filter((s) => s.estado === "aprobado").length;
  const rechazadas = solicitudes.filter((s) => s.estado === "rechazado").length;
  const productos = [...new Set(solicitudes.map((s) => s.producto))];

  const estadoBadge = (estado: string) => {
    const styles: Record<string, string> = {
      pendiente: "bg-yellow-100 text-yellow-700 border-yellow-200",
      en_revision: "bg-blue-100 text-blue-700 border-blue-200",
      aprobado: "bg-green-100 text-green-700 border-green-200",
      rechazado: "bg-red-100 text-red-700 border-red-200",
    };
    const labels: Record<string, string> = { pendiente: "Pendiente", en_revision: "En revision", aprobado: "Aprobado", rechazado: "Rechazado" };
    return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[estado] || ""}`}>{labels[estado] || estado}</span>;
  };

  if (isLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-10 h-10 border-4 border-trust-blue border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-trust-dark border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-trust-blue to-trust-light flex items-center justify-center"><span className="text-white font-bold text-base">T</span></div>
            </Link>
            <div className="hidden sm:block">
              <span className="text-white font-bold text-sm">Trust Finance</span>
              <span className="text-gray-500 text-sm ml-2">/ Admin</span>
            </div>
          </div>
          <button onClick={async () => { await logout(); router.push("/"); }} className="px-3 sm:px-4 py-2 bg-white/5 border border-white/10 text-gray-300 rounded-lg text-xs sm:text-sm font-medium hover:bg-white/10 transition-all">
            Cerrar sesion
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {[
            { label: "Total", value: solicitudes.length, color: "text-trust-blue", bg: "bg-trust-blue/10" },
            { label: "Pendientes", value: pendientes, color: "text-yellow-600", bg: "bg-yellow-50" },
            { label: "En revision", value: enRevision, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Aprobadas", value: aprobadas, color: "text-green-600", bg: "bg-green-50" },
            { label: "Rechazadas", value: rechazadas, color: "text-red-600", bg: "bg-red-50" },
            { label: "Monto total", value: `$${totalMonto.toLocaleString()}`, color: "text-trust-blue", bg: "bg-trust-blue/10" },
          ].map((stat, i) => (
            <div key={i} className={`${stat.bg} rounded-xl sm:rounded-2xl p-3 sm:p-4`}>
              <div className={`text-lg sm:text-2xl font-extrabold ${stat.color}`}>{stat.value}</div>
              <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
          {(["solicitudes", "usuarios"] as TabType[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all capitalize ${tab === t ? "bg-white text-trust-dark shadow-sm" : "text-gray-500"}`}>
              {t}
            </button>
          ))}
        </div>

        {tab === "solicitudes" && (
          <div>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <input type="text" placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 pl-4 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-trust-blue" />
              <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value as FilterEstado)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white">
                <option value="todos">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="en_revision">En revision</option>
                <option value="aprobado">Aprobado</option>
                <option value="rechazado">Rechazado</option>
              </select>
              {productos.length > 0 && (
                <select value={filterProducto} onChange={(e) => setFilterProducto(e.target.value)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white">
                  <option value="">Todos productos</option>
                  {productos.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              )}
            </div>

            <p className="text-xs text-gray-400 mb-3">{filtered.length} solicitudes</p>

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left py-3 px-4 text-gray-500 text-xs uppercase font-semibold">Cliente</th>
                      <th className="text-left py-3 px-4 text-gray-500 text-xs uppercase font-semibold">Producto</th>
                      <th className="text-left py-3 px-4 text-gray-500 text-xs uppercase font-semibold">Monto</th>
                      <th className="text-left py-3 px-4 text-gray-500 text-xs uppercase font-semibold">Fecha</th>
                      <th className="text-left py-3 px-4 text-gray-500 text-xs uppercase font-semibold">Estado</th>
                      <th className="text-left py-3 px-4 text-gray-500 text-xs uppercase font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="py-3 px-4">
                          <div className="font-medium text-trust-dark">{s.nombre} {s.apellido}</div>
                          <div className="text-xs text-gray-400">{s.email}</div>
                        </td>
                        <td className="py-3 px-4 text-gray-700">{s.producto}<div className="text-xs text-gray-400">{s.pais?.toUpperCase()}</div></td>
                        <td className="py-3 px-4"><span className="font-bold">${Number(s.monto).toLocaleString()}</span></td>
                        <td className="py-3 px-4 text-gray-500 text-xs">{new Date(s.created_at).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}</td>
                        <td className="py-3 px-4">{estadoBadge(s.estado)}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setSelectedSolicitud(s)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-trust-blue" title="Ver">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </button>
                            {(s.estado === "pendiente" || s.estado === "en_revision") && (
                              <>
                                {s.estado === "pendiente" && (
                                  <button onClick={() => updateSolicitudEstado(s.id, "en_revision")} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-blue-600" title="Revisar">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                  </button>
                                )}
                                <button onClick={() => updateSolicitudEstado(s.id, "aprobado")} className="p-1.5 rounded-lg hover:bg-green-50 text-gray-500 hover:text-green-600" title="Aprobar">
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                                </button>
                                <button onClick={() => updateSolicitudEstado(s.id, "rechazado")} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600" title="Rechazar">
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden divide-y divide-gray-50">
                {filtered.map((s) => (
                  <div key={s.id} className="p-4" onClick={() => setSelectedSolicitud(s)}>
                    <div className="flex justify-between mb-2">
                      <div className="font-medium text-trust-dark text-sm">{s.nombre} {s.apellido}</div>
                      {estadoBadge(s.estado)}
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{s.producto}</span>
                      <span className="font-bold text-trust-dark">${Number(s.monto).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "usuarios" && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left py-3 px-4 text-gray-500 text-xs uppercase font-semibold">Usuario</th>
                    <th className="text-left py-3 px-4 text-gray-500 text-xs uppercase font-semibold">Email</th>
                    <th className="text-left py-3 px-4 text-gray-500 text-xs uppercase font-semibold">Telefono</th>
                    <th className="text-left py-3 px-4 text-gray-500 text-xs uppercase font-semibold">Registro</th>
                    <th className="text-left py-3 px-4 text-gray-500 text-xs uppercase font-semibold">Solicitudes</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-trust-blue/10 flex items-center justify-center"><span className="text-trust-blue font-bold text-xs">{(u.nombre || u.email)[0]?.toUpperCase()}</span></div>
                          )}
                          <span className="font-medium text-trust-dark">{u.nombre || "Sin nombre"} {u.apellido}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-500">{u.email}</td>
                      <td className="py-3 px-4 text-gray-500">{u.telefono || "-"}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{new Date(u.created_at).toLocaleDateString("es-PE")}</td>
                      <td className="py-3 px-4"><span className="px-2.5 py-1 bg-trust-blue/10 text-trust-blue rounded-full text-xs font-semibold">{solicitudes.filter((s) => s.user_id === u.id).length}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y divide-gray-50">
              {users.map((u) => (
                <div key={u.id} className="p-4 flex items-center gap-3">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-trust-blue/10 flex items-center justify-center"><span className="text-trust-blue font-bold text-sm">{(u.nombre || u.email)[0]?.toUpperCase()}</span></div>
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-trust-dark text-sm">{u.nombre || "Sin nombre"} {u.apellido}</div>
                    <div className="text-xs text-gray-400">{u.email}</div>
                  </div>
                  <span className="px-2 py-0.5 bg-trust-blue/10 text-trust-blue rounded-full text-xs font-semibold">{solicitudes.filter((s) => s.user_id === u.id).length}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedSolicitud && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedSolicitud(null)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-trust-dark">Detalle</h3>
              <button onClick={() => setSelectedSolicitud(null)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Cliente:</span><span className="font-medium">{selectedSolicitud.nombre} {selectedSolicitud.apellido}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Email:</span><span className="font-medium">{selectedSolicitud.email}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Telefono:</span><span className="font-medium">{selectedSolicitud.telefono}</span></div>
              <hr className="border-gray-200" />
              <div className="flex justify-between"><span className="text-gray-500">Producto:</span><span className="font-medium">{selectedSolicitud.producto}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Pais:</span><span className="font-medium">{selectedSolicitud.pais?.toUpperCase()}</span></div>
              <hr className="border-gray-200" />
              <div className="flex justify-between"><span className="text-gray-500">Monto:</span><span className="font-bold text-lg">${Number(selectedSolicitud.monto).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Inicial (30%):</span><span className="font-bold text-green-600">${(Number(selectedSolicitud.monto) * 0.3).toLocaleString()}</span></div>
            </div>
            <div className="mb-4">{estadoBadge(selectedSolicitud.estado)}</div>
            {(selectedSolicitud.estado === "pendiente" || selectedSolicitud.estado === "en_revision") && (
              <div className="flex gap-2">
                {selectedSolicitud.estado === "pendiente" && (
                  <button onClick={() => updateSolicitudEstado(selectedSolicitud.id, "en_revision")} className="flex-1 py-2.5 bg-blue-50 text-blue-700 rounded-xl text-sm font-semibold hover:bg-blue-100">Revisar</button>
                )}
                <button onClick={() => updateSolicitudEstado(selectedSolicitud.id, "aprobado")} className="flex-1 py-2.5 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600">Aprobar</button>
                <button onClick={() => updateSolicitudEstado(selectedSolicitud.id, "rechazado")} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600">Rechazar</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
