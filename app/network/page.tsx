"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Copy, Check, Users, Wallet, Clock,
  TrendingUp, Share2, ShoppingCart, Sparkles,
} from "lucide-react";
import { FarmMindLogo } from "@/app/components/FarmMindLogo";
import { supabase } from "@/app/lib/supabase";

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
  created_at: string;
  placement_parent_id: string | null;
}

interface FrontalMember {
  user_id: string;
  leg: "left" | "right";
  email: string;
}

interface PendingMember {
  user_id: string;
  email: string;
  created_at: string;
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
function maskEmail(email: string) {
  if (!email) return "—";
  const [u, d] = email.split("@");
  if (!d) return email;
  return `${u.slice(0, 3)}***@${d}`;
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

  // ── Auth check ───────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        router.replace("/smm");
        return;
      }
      if (mounted) setAuthReady(true);
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
      {/* Header */}
      <header className="border-b border-white/10 bg-black/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-white/60 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <FarmMindLogo />
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/profile" className="text-white/60 hover:text-white">
              Mi perfil
            </Link>
            <Link href="/" className="text-white/60 hover:text-white">
              Inicio
            </Link>
          </div>
        </div>
      </header>

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
              <h2 className="text-lg font-semibold mb-1">Mi link de invitación</h2>
              <p className="text-sm text-white/60 mb-3">
                Comparte este link. Cada vez que un invitado pague, ganas <b className="text-blue-400">15%</b>.
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
              Estos usuarios se registraron con tu link. Decide en qué pata los ubicas.
            </p>
            <div className="space-y-3">
              {data.pendings.map((p) => (
                <div
                  key={p.user_id}
                  className="bg-black/40 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3"
                >
                  <div className="flex-1">
                    <div className="font-medium">{maskEmail(p.email)}</div>
                    <div className="text-xs text-white/40">Registrado {formatDate(p.created_at)}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={placing === p.user_id || Boolean(leftFrontal)}
                      onClick={() => placeUser(p.user_id, "left")}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/30 rounded text-xs font-semibold"
                      title={leftFrontal ? "Pata izquierda ocupada (cae por spillover)" : "Colocar en izquierda"}
                    >
                      {placing === p.user_id ? "..." : "← Izquierda"}
                    </button>
                    <button
                      disabled={placing === p.user_id || Boolean(rightFrontal)}
                      onClick={() => placeUser(p.user_id, "right")}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/30 rounded text-xs font-semibold"
                      title={rightFrontal ? "Pata derecha ocupada (cae por spillover)" : "Colocar en derecha"}
                    >
                      Derecha →
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-white/40 mt-3">
              Si tu pata ya está ocupada por un frontal, el usuario caerá automáticamente más abajo (spillover).
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
                    <th className="text-left py-2">Email</th>
                    <th className="text-left py-2">Pata</th>
                    <th className="text-left py-2">Bajo</th>
                    <th className="text-left py-2">Desde</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.directs.map((d) => (
                    <tr key={d.user_id}>
                      <td className="py-2">{maskEmail(d.email)}</td>
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
        <div className="text-sm font-medium">{maskEmail(member.email)}</div>
      ) : (
        <div className="text-sm text-white/30 italic">Disponible</div>
      )}
    </div>
  );
}
