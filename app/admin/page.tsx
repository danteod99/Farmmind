"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { Users, Crown, MessageSquare, DollarSign, TrendingUp, Bot, LogOut, RefreshCw, ArrowLeft } from "lucide-react";

const ADMIN_EMAILS = ["danteod99@gmail.com"];

interface Stats {
  totalUsers: number;
  proUsers: number;
  freeUsers: number;
  totalMessages: number;
  messagesThisMonth: number;
  totalConversations: number;
  estimatedRevenue: number;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  avatar: string;
  created_at: string;
  plan: "free" | "pro";
  subscription_status: string;
  messages_this_month: number;
  last_sign_in: string;
}

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: color + "20" }}>
          <span style={{ color }}>{icon}</span>
        </div>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !ADMIN_EMAILS.includes(user.email || "")) {
      router.push("/");
      return;
    }
    setAuthorized(true);
    fetchData();
  };

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setUsers(data.users);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const filteredUsers = users.filter((u) =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.name?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
  };

  const formatRelative = (dateStr: string) => {
    if (!dateStr) return "Nunca";
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Hoy";
    if (days === 1) return "Ayer";
    if (days < 7) return `Hace ${days} días`;
    return formatDate(dateStr);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-purple-500 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Cargando panel de admin...</p>
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <>
      <style>{`
        :root { --background: #0a0a0f; --surface: #111118; --surface-2: #1a1a2e; --border: #2d2d44; --accent: #007ABF; --accent-light: #56B4E0; --foreground: #e2e8f0; }
        body { background: var(--background); color: var(--foreground); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; }
      `}</style>

      <div className="min-h-screen" style={{ background: "var(--background)" }}>

        {/* Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/")} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
              <ArrowLeft size={16} />
              Volver al chat
            </button>
            <div className="w-px h-5 bg-gray-700" />
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--accent)" }}>
                <Bot size={16} className="text-white" />
              </div>
              <div>
                <h1 className="font-bold text-white text-sm">TRUST MIND Admin</h1>
                <p className="text-xs text-gray-500">Panel de administración</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ background: "var(--surface-2)", color: "#94a3b8", border: "1px solid var(--border)" }}
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              Actualizar
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" style={{ background: "var(--surface-2)", color: "#f87171", border: "1px solid var(--border)" }}>
              <LogOut size={13} />
              Salir
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">

          {/* Stats Grid */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={<Users size={18} />}
                label="Usuarios totales"
                value={stats.totalUsers}
                sub={`${stats.freeUsers} free · ${stats.proUsers} pro`}
                color="#56B4E0"
              />
              <StatCard
                icon={<Crown size={18} />}
                label="Usuarios Pro"
                value={stats.proUsers}
                sub={stats.totalUsers > 0 ? `${Math.round((stats.proUsers / stats.totalUsers) * 100)}% conversión` : "0% conversión"}
                color="#fbbf24"
              />
              <StatCard
                icon={<MessageSquare size={18} />}
                label="Mensajes este mes"
                value={stats.messagesThisMonth.toLocaleString()}
                sub={`${stats.totalMessages.toLocaleString()} total`}
                color="#34d399"
              />
              <StatCard
                icon={<DollarSign size={18} />}
                label="Ingresos estimados"
                value={`$${stats.estimatedRevenue}`}
                sub="USD / mes"
                color="#60a5fa"
              />
            </div>
          )}

          {/* Extra stats row */}
          {stats && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="rounded-2xl p-4 flex items-center gap-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#56B4E020" }}>
                  <TrendingUp size={18} style={{ color: "#56B4E0" }} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Conversaciones totales</p>
                  <p className="text-xl font-bold text-white">{stats.totalConversations}</p>
                </div>
              </div>
              <div className="rounded-2xl p-4 flex items-center gap-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#34d39920" }}>
                  <MessageSquare size={18} style={{ color: "#34d399" }} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Msgs promedio / usuario</p>
                  <p className="text-xl font-bold text-white">
                    {stats.totalUsers > 0 ? Math.round(stats.messagesThisMonth / stats.totalUsers) : 0}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl p-4 flex items-center gap-4" style={{ background: "linear-gradient(135deg, #1e1b4b, #2e1065)", border: "1px solid #4c1d95" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#fbbf2420" }}>
                  <Crown size={18} style={{ color: "#fbbf24" }} />
                </div>
                <div>
                  <p className="text-xs text-purple-300">MRR objetivo</p>
                  <p className="text-xl font-bold text-white">${stats.proUsers * 19} <span className="text-sm font-normal text-gray-400">/ mes</span></p>
                </div>
              </div>
            </div>
          )}

          {/* Users Table */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
              <div>
                <h2 className="font-semibold text-white">Usuarios</h2>
                <p className="text-xs text-gray-500 mt-0.5">{users.length} usuarios registrados</p>
              </div>
              <input
                type="text"
                placeholder="Buscar usuario..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm text-white placeholder-gray-500 outline-none"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", width: "220px" }}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Usuario</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Plan</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Msgs este mes</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Último acceso</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-gray-500 text-sm">
                        {search ? "No se encontraron usuarios" : "No hay usuarios registrados aún"}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map((u) => (
                        <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {u.avatar ? (
                                <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center text-white text-xs font-bold">
                                  {u.name?.[0]?.toUpperCase() || "?"}
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-medium text-white">{u.name}</p>
                                <p className="text-xs text-gray-500">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {u.plan === "pro" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: "#fbbf2420", color: "#fbbf24", border: "1px solid #fbbf2440" }}>
                                <Crown size={10} /> Pro
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: "#2d2d44", color: "#94a3b8" }}>
                                Free
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-20 rounded-full" style={{ background: "var(--border)" }}>
                                <div
                                  className="h-1.5 rounded-full"
                                  style={{
                                    background: u.plan === "pro" ? "#34d399" : "#56B4E0",
                                    width: u.plan === "pro" ? "100%" : `${Math.min(100, (u.messages_this_month / 30) * 100)}%`,
                                  }}
                                />
                              </div>
                              <span className="text-sm text-white">{u.messages_this_month}</span>
                              {u.plan !== "pro" && <span className="text-xs text-gray-500">/ 30</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-400">{formatRelative(u.last_sign_in)}</td>
                          <td className="px-6 py-4 text-sm text-gray-400">{formatDate(u.created_at)}</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
