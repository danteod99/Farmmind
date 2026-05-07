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

export default function LandingClient({ code, sponsor }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  // Setear cookie 'ref' en el cliente (server components no pueden setearla en render)
  useEffect(() => {
    if (typeof document !== "undefined" && code) {
      document.cookie = `ref=${code}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax; Secure`;
    }
  }, [code]);

  // Si ya está logueado, redirigir directo a /network (donde verá el paywall)
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      if (data.user) {
        router.replace("/network");
      } else {
        setAuthenticated(false);
      }
    })();
    return () => { mounted = false; };
  }, [router]);

  const handleGoogleSignup = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  if (authenticated === null) {
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
          Únete a la red de
          <br />
          <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent">
            TrustMind
          </span>
        </h1>
        <p className="mt-5 text-lg text-white/70 max-w-2xl">
          Acceso completo al curso de granjas de bots + sistema de red de mercadeo
          binaria. Construye tu downline y gana comisiones reales en saldo gastable.
        </p>

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
              title="15% bono directo"
              desc="Por cada referido que pague su mensualidad"
            />
            <Benefit
              icon={<ShieldCheck className="w-5 h-5" />}
              title="Comisiones como saldo SMM"
              desc="Acreditación instantánea. Lo gastas en servicios o lo acumulas"
            />
          </div>

          {/* CTA */}
          <button
            onClick={handleGoogleSignup}
            disabled={loading}
            className="mt-10 w-full flex items-center justify-center gap-3 px-8 py-5 bg-white text-black font-bold text-base rounded-2xl hover:bg-gray-100 transition disabled:opacity-50 shadow-lg"
          >
            <GoogleIcon />
            {loading ? "Conectando..." : "Crear cuenta con Google"}
          </button>

          <div className="mt-4 text-center text-xs text-white/40">
            Después de crear tu cuenta, completas el pago seguro de $200
            <br />
            y quedas activo en la red al instante.
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
