"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Copy, Check, Users, Wallet, Clock,
  TrendingUp, Share2, ShoppingCart, Sparkles, Lock, Zap, Trash2,
} from "lucide-react";
import { SmmNav } from "@/app/components/SmmNav";
import { supabase } from "@/app/lib/supabase";
import WelcomeOnboarding from "@/app/components/WelcomeOnboarding";

// ── Types ──────────────────────────────────────────────────────────────────

interface NetworkPosition {
  user_id: string;
  sponsor_id: string | null;
  placement_parent_id: string | null;
  leg: "left" | "right" | null;
  position_path: string;
  display_name: string;
  is_founder: boolean;
}

interface DirectMember {
  user_id: string;
  leg: "left" | "right" | null;
  email: string;
  name: string;
  created_at: string;
  placement_parent_id: string | null;
}

interface FrontalMember {
  user_id: string;
  leg: "left" | "right";
  email: string;
  name: string;
}

interface PendingMember {
  user_id: string;
  email: string;
  name: string;
  created_at: string;
  has_paid: boolean;
}

interface CommissionRow {
  id: string;
  type: string;
  amount: number;
  status: string;
  source_user_id: string | null;
  created_at: string;
  period: string | null;
}

interface NetworkData {
  code: string;
  link: string;
  position: NetworkPosition | null;
  directs: DirectMember[];
  frontals: FrontalMember[];
  pendings: PendingMember[];
  available_balance: number;
  is_subscribed: boolean;
  is_founder: boolean;
  has_pending_placement: boolean;
  sponsor_info: { user_id: string; display_name: string; email: string } | null;
  commissions: {
    total_approved: number;
    total_pending: number;
    total_paid: number;
    total_all: number;
    recent: CommissionRow[];
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatMoney(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}
function formatDate(s: string) {
  if (!s) return "";
  return new Date(s).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}
function memberDisplay(name: string | undefined, email: string | undefined): string {
  if (name && name.trim()) return name;
  if (email && email.trim()) return email;
  return "Usuario";
}

// ── Component ──────────────────────────────────────────────────────────────

export default function NetworkPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<NetworkData | null>(null);
  const [copied, setCopied] = useState(false);
  const [placing, setPlacing] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userAvatar, setUserAvatar] = useState("");

  // ── Auth check ───────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        router.replace("/smm");
        return;
      }
      if (mounted) {
        setUserName(u.user.user_metadata?.full_name || u.user.email?.split("@")[0] || "Usuario");
        setUserEmail(u.user.email || "");
        setUserAvatar(u.user.user_metadata?.avatar_url || "");
        setAuthReady(true);
      }
    })();
    return () => { mounted = false; };
  }, [router]);

  // ── Fetch network data ───────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/network/me", { credentials: "include" });
      if (res.status === 401) {
        router.replace("/smm");
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "No se pudo cargar la red");
      }
      const j = await res.json();
      setData(j);
    } catch (e) {
      setErrorMsg((e as Error).message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!authReady) return;
    fetchData();
  }, [authReady, fetchData]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const copyLink = () => {
    if (!data?.link) return;
    navigator.clipboard.writeText(data.link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const startCheckout = async () => {
    setErrorMsg(null);
    try {
      const res = await fetch("/api/network/checkout", {
        method: "POST",
        credentials: "include",
      });
      const j = await res.json();
      if (!res.ok || !j.url) {
        throw new Error(j.error || "No se pudo iniciar el pago");
      }
      window.location.href = j.url;
    } catch (e) {
      setErrorMsg((e as Error).message);
    }
  };

  const removeUser = async (userId: string, displayName: string) => {
    if (!confirm(`¿Quitar a ${displayName} de tu red?\n\nEsto elimina su pendiente o posición. Si tiene gente debajo no se podrá quitar.`)) return;
    setPlacing(userId);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/network/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ user_id: userId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Error al quitar usuario");
      }
      await fetchData();
    } catch (e) {
      setErrorMsg((e as Error).message);
    } finally {
      setPlacing(null);
    }
  };

  const placeUser = async (userId: string, leg: "left" | "right") => {
    setPlacing(userId);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/network/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ user_id: userId, leg }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Error al colocar usuario");
      }
      await fetchData();
    } catch (e) {
      setErrorMsg((e as Error).message);
    } finally {
      setPlacing(null);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (!authReady || loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-blue-400">Cargando tu red...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-red-400 mb-4">{errorMsg || "No se pudo cargar"}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const leftFrontal = data.frontals.find((f) => f.leg === "left");
  const rightFrontal = data.frontals.find((f) => f.leg === "right");

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Onboarding al primer pago / registro */}
      <WelcomeOnboarding
        referralLink={data.link}
        referralCode={data.code}
        userName={userName}
      />

      <SmmNav
        balance={data.available_balance}
        userAvatar={userAvatar}
        userName={userName}
        userEmail={userEmail}
        links={[
          { href: "/smm/services", label: "Servicios" },
          { href: "/smm/funds", label: "Recargar" },
          { href: "/network", label: "🌐 Mi Red", active: true },
          { href: "/cursos", label: "📚 Mis Cursos" },
          { href: "/granjas", label: "🤖 Granjas" },
          { href: "/smm/ai", label: "🤖 Asistente IA" },
          { href: "https://www.scalinglatam.site", label: "🌐 Scaling Latam", external: true },
        ]}
      />

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Title */}
        <div>
          <h1 className="text-3xl font-bold text-white">Mi Red</h1>
          <p className="text-white/60 mt-1">
            Construye tu red de mercadeo binaria. Invita, coloca y cobra.
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg px-4 py-3 text-sm">
            {errorMsg}
          </div>
        )}

        {/* PAYWALL — usuario no suscrito y NO es fundador */}
        {!data.is_subscribed && !data.is_founder && (
          <section className="bg-gradient-to-br from-blue-700/20 via-blue-900/10 to-black border-2 border-blue-500/40 rounded-2xl p-6 sm:p-8">
            {data.sponsor_info && (
              <div className="text-sm text-blue-300/80 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Fuiste invitado por <b className="text-white">{data.sponsor_info.display_name}</b>
              </div>
            )}
            <div className="flex items-start gap-4 mb-5">
              <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
                <Lock className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Activa tu cuenta en la red</h2>
                <p className="text-white/70 mt-1">
                  Para acceder al curso, construir tu red y empezar a ganar comisiones, suscríbete por
                  {" "}<b className="text-blue-300">$200/mes</b>.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <Benefit text="Acceso al curso completo de granjas de bots" />
              <Benefit text="Tu propio link de invitación al activarte" />
              <Benefit text="Bono directo del 15% por cada referido que pague" />
              <Benefit text="Comisiones acreditadas como saldo SMM" />
              <Benefit text="Bonos binario, matching y pool (próxima fase)" />
              <Benefit text="Comunidad y soporte de los fundadores" />
            </div>

            <button
              onClick={startCheckout}
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold text-base flex items-center justify-center gap-2 transition shadow-lg shadow-blue-500/30"
            >
              <Zap className="w-5 h-5" /> Activar por $200/mes
            </button>
            <p className="text-xs text-white/40 mt-3">
              Pago seguro con tarjeta (Stripe). Cancelas cuando quieras desde tu perfil.
              Regla: <b>pago para cobrar</b> — solo recibes comisiones si tu suscripción está activa.
            </p>
          </section>
        )}

        {/* SALDO DISPONIBLE - banner grande estilo /smm/funds */}
        <section className="bg-gradient-to-br from-emerald-500/10 via-emerald-600/5 to-black border border-emerald-500/30 rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-emerald-300/80 uppercase tracking-wider">
                <Sparkles className="w-4 h-4" /> Saldo disponible
              </div>
              <div className="mt-2 text-4xl sm:text-5xl font-black text-emerald-400">
                {formatMoney(data.available_balance)}
              </div>
              <p className="mt-1 text-sm text-white/60">
                Tus comisiones se acreditan automáticamente como saldo. Úsalo para servicios SMM.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link
                href="/smm/services"
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition"
              >
                <ShoppingCart className="w-4 h-4" /> Usar saldo
              </Link>
              <Link
                href="/smm/funds"
                className="px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition"
              >
                <Wallet className="w-4 h-4" /> Ver historial
              </Link>
            </div>
          </div>
        </section>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Comisiones acreditadas"
            value={formatMoney(data.commissions.total_paid + data.commissions.total_approved)}
            color="text-emerald-400"
          />
          <StatCard
            icon={<Clock className="w-5 h-5" />}
            label="Pendientes"
            value={formatMoney(data.commissions.total_pending)}
            color="text-yellow-400"
          />
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label="Directos"
            value={String(data.directs.length)}
            color="text-white"
          />
          <StatCard
            icon={<Wallet className="w-5 h-5" />}
            label="Total ganado"
            value={formatMoney(data.commissions.total_all)}
            color="text-blue-400"
          />
        </div>

        {/* Referral Link Card */}
        <section className="bg-gradient-to-br from-blue-950/40 to-black border border-blue-500/20 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-400">
              <Share2 className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-lg font-semibold">Mi link de invitación</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500/30 to-cyan-500/30 border border-blue-400/40 text-blue-200">
                  <Sparkles className="w-3 h-3" /> Gana hasta <b>40%</b>
                </span>
              </div>
              <p className="text-sm text-white/60 mb-3">
                Comparte este link. Por cada invitado que pague obtienes <b className="text-blue-300">15% directo</b> +
                {" "}<b className="text-blue-300">25% adicional</b> en binario, matching y pool de rangos
                {" "}(<b className="text-blue-200">hasta 40% total</b>).
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  readOnly
                  value={data.link}
                  className="flex-1 bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono"
                />
                <button
                  onClick={copyLink}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copiado" : "Copiar"}
                </button>
              </div>
              <div className="mt-2 text-xs text-white/40">
                Tu código: <span className="font-mono text-white/70">{data.code}</span>
              </div>
            </div>
          </div>
        </section>

        {/* My binary tree */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" /> Mi posición en el árbol
          </h2>
          <BinaryTree
            me={data.position}
            left={leftFrontal}
            right={rightFrontal}
          />
          {!data.position && (
            <p className="text-sm text-yellow-400 mt-4">
              Aún no estás colocado en la red. Contacta a tu sponsor para que te ubique.
            </p>
          )}
        </section>

        {/* Pendings */}
        {data.pendings.length > 0 && (
          <section className="bg-yellow-500/5 border border-yellow-500/30 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-2 text-yellow-400 flex items-center gap-2">
              <Clock className="w-5 h-5" /> Pendientes de colocación ({data.pendings.length})
            </h2>
            <p className="text-sm text-white/60 mb-4">
              Estos usuarios se registraron con tu link. <b className="text-white/80">Solo los que ya pagaron</b> la suscripción
              pueden ser colocados en la red. Si aún no han pagado, recuérdales activar su cuenta.
            </p>
            <div className="space-y-3">
              {data.pendings.map((p) => (
                <div
                  key={p.user_id}
                  className={`rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3 ${
                    p.has_paid ? "bg-black/40" : "bg-black/20 opacity-70"
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{memberDisplay(p.name, p.email)}</span>
                      {p.has_paid ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300">
                          <Check className="w-3 h-3" /> Pagó
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-yellow-500/20 text-yellow-300">
                          <Clock className="w-3 h-3" /> Esperando pago
                        </span>
                      )}
                    </div>
                    {p.name && p.email && (
                      <div className="text-xs text-white/55 mt-0.5">{p.email}</div>
                    )}
                    <div className="text-xs text-white/40 mt-0.5">Registrado {formatDate(p.created_at)}</div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      disabled={placing === p.user_id || !p.has_paid}
                      onClick={() => placeUser(p.user_id, "left")}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/30 disabled:cursor-not-allowed rounded text-xs font-semibold"
                      title={!p.has_paid ? "Espera a que el usuario pague la suscripción" : (leftFrontal ? "Pata izquierda ocupada (cae por spillover)" : "Colocar en izquierda")}
                    >
                      {placing === p.user_id ? "..." : "← Izquierda"}
                    </button>
                    <button
                      disabled={placing === p.user_id || !p.has_paid}
                      onClick={() => placeUser(p.user_id, "right")}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/30 disabled:cursor-not-allowed rounded text-xs font-semibold"
                      title={!p.has_paid ? "Espera a que el usuario pague la suscripción" : (rightFrontal ? "Pata derecha ocupada (cae por spillover)" : "Colocar en derecha")}
                    >
                      Derecha →
                    </button>
                    <button
                      disabled={placing === p.user_id}
                      onClick={() => removeUser(p.user_id, memberDisplay(p.name, p.email))}
                      className="px-2 py-1.5 bg-red-500/15 hover:bg-red-500/30 text-red-300 rounded text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                      title="Quitar de mi red"
                    >
                      <Trash2 className="w-3 h-3" /> Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-white/40 mt-3">
              Cuando ambas patas están ocupadas, el nuevo usuario cae automáticamente más abajo (spillover).
            </p>
          </section>
        )}

        {/* Directos */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Mis directos ({data.directs.length})</h2>
          {data.directs.length === 0 ? (
            <p className="text-sm text-white/50">
              Aún no tienes directos. Comparte tu link para empezar a construir tu red.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-white/50 uppercase">
                  <tr>
                    <th className="text-left py-2">Nombre / Email</th>
                    <th className="text-left py-2">Pata</th>
                    <th className="text-left py-2">Bajo</th>
                    <th className="text-left py-2">Desde</th>
                    <th className="text-right py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.directs.map((d) => (
                    <tr key={d.user_id}>
                      <td className="py-2">
                        <div className="font-medium text-white">{memberDisplay(d.name, d.email)}</div>
                        {d.name && d.email && (
                          <div className="text-xs text-white/50">{d.email}</div>
                        )}
                      </td>
                      <td className="py-2">
                        {d.leg === "left" ? (
                          <span className="text-blue-400">← Izquierda</span>
                        ) : d.leg === "right" ? (
                          <span className="text-blue-400">Derecha →</span>
                        ) : (
                          <span className="text-white/40">—</span>
                        )}
                      </td>
                      <td className="py-2 text-white/60">
                        {d.placement_parent_id === data.position?.user_id
                          ? "Tu posición"
                          : "Spillover"}
                      </td>
                      <td className="py-2 text-white/40">{formatDate(d.created_at)}</td>
                      <td className="py-2 text-right">
                        <button
                          disabled={placing === d.user_id}
                          onClick={() => removeUser(d.user_id, memberDisplay(d.name, d.email))}
                          className="px-2 py-1 bg-red-500/15 hover:bg-red-500/30 text-red-300 rounded text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50"
                          title="Quitar de mi red"
                        >
                          <Trash2 className="w-3 h-3" /> Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Recent commissions */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Últimas comisiones</h2>
          {data.commissions.recent.length === 0 ? (
            <p className="text-sm text-white/50">
              Aún no has generado comisiones. Cuando un directo tuyo pague su suscripción ganarás 15%.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-white/50 uppercase">
                  <tr>
                    <th className="text-left py-2">Tipo</th>
                    <th className="text-right py-2">Monto</th>
                    <th className="text-left py-2">Estado</th>
                    <th className="text-left py-2">Periodo</th>
                    <th className="text-left py-2">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.commissions.recent.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2 capitalize">{c.type}</td>
                      <td className="py-2 text-right font-mono">{formatMoney(Number(c.amount))}</td>
                      <td className="py-2">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="py-2 text-white/60">{c.period || "—"}</td>
                      <td className="py-2 text-white/40">{formatDate(c.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Footer info */}
        <section className="text-xs text-white/40 border-t border-white/5 pt-4 space-y-1">
          <p>
            <b className="text-white/60">Plan binario v1:</b> 15% bono directo por cada pago de un afiliado
            que invitaste. Los bonos de pata débil, matching y pool se activan en la próxima fase.
          </p>
          <p>
            <b className="text-white/60">Pago para cobrar:</b> debes mantener tu suscripción activa
            ($200/mes) para recibir comisiones.
          </p>
          <p>
            <b className="text-white/60">Acreditación instantánea:</b> cada comisión aprobada se suma
            automáticamente a tu saldo SMM. Lo puedes usar en servicios o seguir acumulando.
          </p>
        </section>
      </main>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Benefit({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 text-sm text-white/80">
      <Check className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
      <span>{text}</span>
    </div>
  );
}

function StatCard({
  icon, label, value, color,
}: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex items-center gap-2 text-xs text-white/50 mb-1">
        <span className={color}>{icon}</span>
        {label}
      </div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    approved: { bg: "bg-emerald-500/20", text: "text-emerald-300", label: "Aprobada" },
    pending:  { bg: "bg-yellow-500/20",  text: "text-yellow-300",  label: "Pendiente" },
    paid:     { bg: "bg-blue-500/20",    text: "text-blue-300",    label: "Pagada" },
    reversed: { bg: "bg-red-500/20",     text: "text-red-300",     label: "Revertida" },
  };
  const s = map[status] || { bg: "bg-white/10", text: "text-white/60", label: status };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

function BinaryTree({
  me, left, right,
}: {
  me: NetworkPosition | null;
  left: FrontalMember | undefined;
  right: FrontalMember | undefined;
}) {
  const meName = me?.display_name || "Tú";
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="px-6 py-3 bg-blue-600 rounded-xl border-2 border-blue-400 shadow-lg shadow-blue-500/20">
        <div className="text-xs text-blue-100">YO</div>
        <div className="font-bold">{meName}</div>
        {me?.is_founder && (
          <div className="text-xs text-blue-200 mt-1">⭐ Fundador</div>
        )}
      </div>
      <div className="w-full flex justify-center">
        <div className="grid grid-cols-2 gap-8 max-w-md">
          <LegBox label="Izquierda" member={left} />
          <LegBox label="Derecha" member={right} />
        </div>
      </div>
    </div>
  );
}

function LegBox({ label, member }: { label: string; member?: FrontalMember }) {
  return (
    <div className="bg-black/40 border border-white/10 rounded-xl p-4 text-center">
      <div className="text-xs text-white/50 mb-2">{label}</div>
      {member ? (
        <>
          <div className="text-sm font-medium truncate" title={member.email}>{memberDisplay(member.name, member.email)}</div>
          {member.name && member.email && (
            <div className="text-[10px] text-white/40 truncate mt-0.5">{member.email}</div>
          )}
        </>
      ) : (
        <div className="text-sm text-white/30 italic">Disponible</div>
      )}
    </div>
  );
}
