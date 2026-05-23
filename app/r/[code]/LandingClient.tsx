"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles, Check, Zap, Users, Wallet,
  TrendingUp, Lock, ShieldCheck,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";

interface SponsorData {
  display_name: string;
  email: string;
  is_founder: boolean;
}

interface Props {
  code: string;
  sponsor: SponsorData | null;
}

type AuthState =
  | { kind: "loading" }
  | { kind: "guest" }
  | { kind: "logged_unsubscribed" }
  | { kind: "logged_founder" }
  | { kind: "logged_subscribed" };

export default function LandingClient({ code, sponsor }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [auth, setAuth] = useState<AuthState>({ kind: "loading" });

  // Setear cookie 'ref' en el cliente (server components no pueden setearla en render)
  useEffect(() => {
    if (typeof document !== "undefined" && code) {
      document.cookie = `ref=${code}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax; Secure`;
    }
  }, [code]);

  // Detectar estado: invitado / logueado-sin-suscribir / fundador / suscriptor
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;

      if (!data.user) {
        setAuth({ kind: "guest" });
        return;
      }

      // Logueado: pedir info de su estado en la red
      try {
        const res = await fetch("/api/network/me", { credentials: "include" });
        if (!res.ok) {
          setAuth({ kind: "logged_unsubscribed" });
          return;
        }
        const j = await res.json();
        if (j.is_founder) setAuth({ kind: "logged_founder" });
        else if (j.is_subscribed) setAuth({ kind: "logged_subscribed" });
        else setAuth({ kind: "logged_unsubscribed" });
      } catch {
        setAuth({ kind: "logged_unsubscribed" });
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handlePrimaryCta = async () => {
    setLoading(true);
    if (auth.kind === "guest") {
      // Crear cuenta -> OAuth -> callback -> /network
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      return;
    }
    if (auth.kind === "logged_unsubscribed") {
      // Ya logueado pero no pagó: ir directo a Stripe Checkout
      try {
        const res = await fetch("/api/network/checkout", {
          method: "POST",
          credentials: "include",
        });
        const j = await res.json();
        if (j.url) {
          window.location.href = j.url;
        } else {
          alert(j.error || "No se pudo iniciar el pago");
          setLoading(false);
        }
      } catch {
        alert("Error conectando con Stripe");
        setLoading(false);
      }
      return;
    }
    if (auth.kind === "logged_subscribed" || auth.kind === "logged_founder") {
      router.push("/network");
    }
  };

  const ctaLabel =
    auth.kind === "loading"          ? "Cargando..."
    : auth.kind === "guest"          ? "Crear cuenta y activar"
    : auth.kind === "logged_unsubscribed" ? "Activar por $200/mes"
    : auth.kind === "logged_founder" ? "Ir a mi panel (eres fundador)"
    : auth.kind === "logged_subscribed" ? "Ya estás activo — ir a mi panel"
    : "Comenzar";

  if (auth.kind === "loading") {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-blue-400">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header simple */}
      <header className="border-b border-white/10 sticky top-0 bg-black/80 backdrop-blur z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="text-xl font-black tracking-[3px]">TRUST</div>
          <div className="text-xs text-white/50">Invitación de red</div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 sm:py-16">
        {/* Sponsor badge */}
        {sponsor && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-sm mb-6">
            <Sparkles className="w-4 h-4" />
            <span>
              Te invitó <b className="text-white">{sponsor.display_name}</b>
              {sponsor.is_founder && <span className="ml-1 text-blue-200">⭐ Fundador</span>}
            </span>
          </div>
        )}

        {/* Hero */}
        <h1 className="text-4xl sm:text-6xl font-black leading-[1.05] tracking-tight">
          Gana hasta{" "}
          <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent">
            40% de comisión
          </span>
          <br />
          construyendo tu red.
        </h1>
        <p className="mt-5 text-lg text-white/70 max-w-2xl">
          Acceso al curso de granjas de bots + sistema de red de mercadeo binaria.
          De cada $200 que pague tu downline, <b className="text-blue-300">hasta el 40%</b> se
          reparte como comisión a la red. Tú cobras en saldo gastable.
        </p>

        {/* Distribucion del 40% */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <CommissionPill pct="15%" label="Bono directo" highlight />
          <CommissionPill pct="10%" label="Binario" />
          <CommissionPill pct="10%" label="Matching" />
          <CommissionPill pct="5%" label="Pool de rangos" />
        </div>

        {/* Pricing card */}
        <section className="mt-10 bg-gradient-to-br from-blue-900/30 via-blue-800/10 to-black border-2 border-blue-500/40 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-blue-900/20">
          <div className="flex items-center gap-2 text-xs text-blue-300/80 uppercase tracking-wider mb-3">
            <Zap className="w-4 h-4" /> Membresía mensual
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-6xl sm:text-7xl font-black text-white">$200</span>
            <span className="text-xl text-white/50">/mes</span>
          </div>
          <p className="mt-2 text-white/60 text-sm">
            Cancelas cuando quieras. Pago seguro con tarjeta vía Stripe.
          </p>

          {/* Beneficios grid */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Benefit
              icon={<TrendingUp className="w-5 h-5" />}
              title="Curso completo de granjas de bots"
              desc="Acceso a todos los módulos, actualizaciones y nuevos recursos"
            />
            <Benefit
              icon={<Users className="w-5 h-5" />}
              title="Tu propio link de invitación"
              desc="Comparte y construye tu downline binaria"
            />
            <Benefit
              icon={<Wallet className="w-5 h-5" />}
              title="Hasta 40% en comisiones"
              desc="15% directo + 10% binario + 10% matching + 5% pool"
            />
            <Benefit
              icon={<ShieldCheck className="w-5 h-5" />}
              title="Comisiones como saldo SMM"
              desc="Acreditación instantánea. Lo gastas en servicios o lo acumulas"
            />
          </div>

          {/* CTA */}
          <button
            onClick={handlePrimaryCta}
            disabled={loading}
            className="mt-10 w-full flex items-center justify-center gap-3 px-8 py-5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-base rounded-2xl transition disabled:opacity-50 shadow-lg shadow-blue-500/30"
          >
            {auth.kind === "guest" && <GoogleIcon />}
            {auth.kind === "logged_unsubscribed" && <Zap className="w-5 h-5" />}
            {loading ? "Conectando..." : ctaLabel}
          </button>

          <div className="mt-4 text-center text-xs text-white/40">
            {auth.kind === "guest" && (
              <>
                Login rápido con Google. Después completas el pago seguro de $200
                <br />y quedas activo en la red al instante.
              </>
            )}
            {auth.kind === "logged_unsubscribed" && (
              <>
                Pago seguro con tarjeta vía Stripe. Cancelas cuando quieras.
              </>
            )}
            {auth.kind === "logged_founder" && (
              <>Tienes acceso de fundador, no necesitas pagar suscripción.</>
            )}
            {auth.kind === "logged_subscribed" && (
              <>Tu suscripción ya está activa. Comparte tu link para empezar a ganar.</>
            )}
          </div>
        </section>

        {/* Cómo funciona */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Cómo funciona</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Step
              n="1"
              title="Crea tu cuenta"
              desc="Login rápido con Google. Toma 10 segundos."
            />
            <Step
              n="2"
              title="Activa por $200"
              desc="Pago único mensual. Te da acceso al curso y la red."
            />
            <Step
              n="3"
              title="Invita y gana"
              desc="Comparte tu link. Por cada referido que pague, ganas 15%."
            />
          </div>
        </section>

        {/* Disclaimer */}
        <section className="mt-12 p-4 bg-white/5 border border-white/10 rounded-xl">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-white/60">
              <b className="text-white/80">Regla &quot;pago para cobrar&quot;:</b> solo recibes
              comisiones mientras tu suscripción está activa. Si cancelas, dejas de cobrar
              comisiones (pero puedes regresar cuando quieras).
              <br />
              <span className="text-white/40">
                Código de invitación: <span className="font-mono text-white/60">{code}</span>
              </span>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-8 mt-12">
        <div className="max-w-5xl mx-auto px-4 text-center text-xs text-white/30">
          © {new Date().getFullYear()} TrustMind · Scaling Tech Farm LLC
        </div>
      </footer>
    </div>
  );
}

function CommissionPill({
  pct, label, highlight = false,
}: { pct: string; label: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${
      highlight
        ? "bg-blue-500/15 border-blue-500/40"
        : "bg-white/5 border-white/10"
    }`}>
      <div className={`text-2xl font-black ${highlight ? "text-blue-300" : "text-white"}`}>
        {pct}
      </div>
      <div className="text-[11px] uppercase tracking-wider text-white/50 mt-0.5">
        {label}
      </div>
    </div>
  );
}

function Benefit({
  icon, title, desc,
}: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <div className="font-semibold text-white text-sm">{title}</div>
        <div className="text-xs text-white/55 mt-0.5">{desc}</div>
      </div>
    </div>
  );
}

function Step({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-300 font-bold text-sm mb-3">
        {n}
      </div>
      <div className="font-semibold text-white">{title}</div>
      <div className="text-sm text-white/60 mt-1">{desc}</div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
