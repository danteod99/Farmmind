"use client";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Solicitud {
  id: string;
  created_at: string;
  monto: number;
  producto: string;
  pais: string;
  estado: "pendiente" | "en_revision" | "aprobado" | "rechazado";
}

export default function Dashboard() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [selectedSolicitud, setSelectedSolicitud] = useState<Solicitud | null>(null);
  const [activeTab, setActiveTab] = useState<"solicitudes" | "perfil">("solicitudes");

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      loadSolicitudes();
    }
  }, [user]);

  const loadSolicitudes = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("solicitudes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!error && data) {
        setSolicitudes(data);
      }
    } catch {}
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-trust-blue border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) return null;

  const estadoStyles: Record<string, string> = {
    pendiente: "bg-yellow-100 text-yellow-700 border-yellow-200",
    en_revision: "bg-blue-100 text-blue-700 border-blue-200",
    aprobado: "bg-green-100 text-green-700 border-green-200",
    rechazado: "bg-red-100 text-red-700 border-red-200",
  };

  const estadoLabels: Record<string, string> = {
    pendiente: "Pendiente",
    en_revision: "En revision",
    aprobado: "Aprobado",
    rechazado: "Rechazado",
  };

  const totalMonto = solicitudes.reduce((sum, s) => sum + s.monto, 0);
  const aprobadas = solicitudes.filter((s) => s.estado === "aprobado");
  const montoAprobado = aprobadas.reduce((sum, s) => sum + s.monto, 0);
  const stateSteps = ["pendiente", "en_revision", "aprobado"];

  const displayName = user.nombre || user.email?.split("@")[0] || "Usuario";
  const initials = user.nombre && user.apellido ? `${user.nombre[0]}${user.apellido[0]}` : displayName[0]?.toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-trust-blue to-trust-light flex items-center justify-center">
              <span className="text-white font-bold text-base sm:text-lg">T</span>
            </div>
            <span className="text-lg sm:text-xl font-bold text-trust-dark">Trust <span className="text-trust-blue">Finance</span></span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-trust-dark">{displayName} {user.apellido}</div>
              <div className="text-xs text-gray-500">{user.email}</div>
            </div>
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-trust-blue to-trust-light flex items-center justify-center text-white font-bold text-sm">
                {initials}
              </div>
            )}
            <button onClick={async () => { await logout(); router.push("/"); }} className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-500 hover:text-red-500 transition-colors">
              Salir
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-trust-dark">Hola, {displayName}!</h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">Bienvenido a tu panel de Trust Finance</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {[
            { value: solicitudes.length, label: "Solicitudes", color: "text-trust-blue", icon: "#002bb2", bg: "bg-trust-blue/10" },
            { value: aprobadas.length, label: "Aprobadas", color: "text-green-600", icon: "#16a34a", bg: "bg-green-100" },
            { value: `$${totalMonto.toLocaleString()}`, label: "Monto solicitado", color: "text-trust-blue", icon: "#2563eb", bg: "bg-blue-100" },
            { value: `$${montoAprobado.toLocaleString()}`, label: "Monto aprobado", color: "text-green-600", icon: "#16a34a", bg: "bg-green-100" },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-100">
              <div className={`text-xl sm:text-3xl font-extrabold ${stat.color}`}>{stat.value}</div>
              <div className="text-[10px] sm:text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
          <button onClick={() => setActiveTab("solicitudes")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${activeTab === "solicitudes" ? "bg-white text-trust-dark shadow-sm" : "text-gray-500"}`}>
            Mis solicitudes
          </button>
          <button onClick={() => setActiveTab("perfil")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${activeTab === "perfil" ? "bg-white text-trust-dark shadow-sm" : "text-gray-500"}`}>
            Mi perfil
          </button>
        </div>

        <div className="bg-gradient-to-r from-trust-blue to-trust-light rounded-xl sm:rounded-2xl p-5 sm:p-8 mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-2xl font-bold text-white mb-1">Necesitas financiamiento?</h2>
            <p className="text-white/80 text-sm">Crea una nueva solicitud y te respondemos en 48 horas</p>
          </div>
          <Link href="/#simulador" className="px-6 sm:px-8 py-2.5 sm:py-3 bg-white text-trust-blue rounded-xl text-sm font-semibold hover:shadow-lg transition-all whitespace-nowrap">
            Nueva solicitud
          </Link>
        </div>

        {activeTab === "solicitudes" && (
          <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100">
              <h2 className="text-base sm:text-lg font-bold text-trust-dark">Mis solicitudes</h2>
            </div>
            {solicitudes.length === 0 ? (
              <div className="p-8 sm:p-12 text-center">
                <div className="w-14 h-14 bg-trust-gray rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                </div>
                <h3 className="text-base font-semibold text-trust-dark mb-2">Aun no tienes solicitudes</h3>
                <p className="text-gray-500 mb-6 text-sm">Solicita tu primer financiamiento</p>
                <Link href="/" className="px-6 py-2.5 bg-trust-blue text-white rounded-xl text-sm font-semibold">Solicitar financiamiento</Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {solicitudes.map((s) => (
                  <div key={s.id} onClick={() => setSelectedSolicitud(s)} className="px-4 sm:px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex items-start sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-trust-dark text-sm sm:text-base">{s.producto}</div>
                        <div className="text-xs sm:text-sm text-gray-500 mt-0.5">{s.pais?.toUpperCase()} - {new Date(s.created_at).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}</div>
                        <div className="flex items-center gap-1 mt-3">
                          {stateSteps.map((step, i) => {
                            const currentIdx = stateSteps.indexOf(s.estado);
                            const isRejected = s.estado === "rechazado";
                            const isActive = !isRejected && i <= currentIdx;
                            return (
                              <div key={step} className="flex items-center">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ${isActive ? "bg-trust-blue text-white" : isRejected && i === 0 ? "bg-red-500 text-white" : "bg-gray-200 text-gray-400"}`}>
                                  {isActive ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg> : i + 1}
                                </div>
                                {i < 2 && <div className={`w-4 sm:w-6 h-0.5 ${isActive && i < currentIdx ? "bg-trust-blue" : "bg-gray-200"}`}></div>}
                              </div>
                            );
                          })}
                          <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${estadoStyles[s.estado]}`}>{estadoLabels[s.estado]}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-trust-dark text-sm sm:text-base">${s.monto.toLocaleString()}</div>
                        <div className="text-[10px] sm:text-xs text-gray-500">Inicial: ${(s.monto * 0.3).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "perfil" && (
          <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 overflow-hidden p-4 sm:p-6">
            <div className="flex items-center gap-4 mb-6 sm:mb-8">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-trust-blue to-trust-light flex items-center justify-center text-white font-bold text-xl sm:text-2xl">{initials}</div>
              )}
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-trust-dark">{displayName} {user.apellido}</h3>
                <p className="text-sm text-gray-500">Miembro desde {new Date(user.created_at).toLocaleDateString("es-PE", { month: "long", year: "numeric" })}</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
              {[
                { label: "Nombre completo", value: `${displayName} ${user.apellido}` },
                { label: "Email", value: user.email },
                { label: "Telefono", value: user.telefono || "No registrado" },
                { label: "Fecha de registro", value: new Date(user.created_at).toLocaleDateString("es-PE") },
              ].map((item, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-4">
                  <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">{item.label}</div>
                  <div className="text-sm font-medium text-trust-dark">{item.value}</div>
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
              <h3 className="text-lg font-bold text-trust-dark">Detalle de solicitud</h3>
              <button onClick={() => setSelectedSolicitud(null)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2.5 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Producto:</span><span className="font-medium">{selectedSolicitud.producto}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Pais:</span><span className="font-medium">{selectedSolicitud.pais?.toUpperCase()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Fecha:</span><span className="font-medium">{new Date(selectedSolicitud.created_at).toLocaleDateString("es-PE")}</span></div>
              <hr className="border-gray-200" />
              <div className="flex justify-between"><span className="text-gray-500">Monto total:</span><span className="font-bold text-lg">${selectedSolicitud.monto.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Tu inicial (30%):</span><span className="font-bold text-green-600">${(selectedSolicitud.monto * 0.3).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Trust financia (70%):</span><span className="font-bold text-trust-blue">${(selectedSolicitud.monto * 0.7).toLocaleString()}</span></div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Estado</h4>
              <div className="space-y-4">
                {[
                  { key: "pendiente", label: "Solicitud recibida", desc: "Tu solicitud ha sido registrada." },
                  { key: "en_revision", label: "En revision", desc: "Nuestro equipo esta evaluando tu solicitud." },
                  { key: "aprobado", label: "Aprobado", desc: "Tu financiamiento ha sido aprobado!" },
                ].map((step, i) => {
                  const currentIdx = stateSteps.indexOf(selectedSolicitud.estado);
                  const isRejected = selectedSolicitud.estado === "rechazado";
                  const isActive = !isRejected && i <= currentIdx;
                  const isCurrent = !isRejected && i === currentIdx;
                  return (
                    <div key={step.key} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isActive ? "bg-trust-blue text-white" : "bg-gray-200 text-gray-400"}`}>
                          {isActive ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg> : i + 1}
                        </div>
                        {i < 2 && <div className={`w-0.5 h-8 ${isActive && i < currentIdx ? "bg-trust-blue" : "bg-gray-200"}`}></div>}
                      </div>
                      <div className="pb-4">
                        <div className={`font-semibold text-sm ${isCurrent ? "text-trust-blue" : isActive ? "text-trust-dark" : "text-gray-400"}`}>{step.label}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{step.desc}</div>
                      </div>
                    </div>
                  );
                })}
                {selectedSolicitud.estado === "rechazado" && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-red-600">Rechazado</div>
                      <div className="text-xs text-gray-400 mt-0.5">Puedes intentar nuevamente.</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
