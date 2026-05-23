"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles, BookOpen, ShoppingCart, Wallet,
  ChevronRight, ChevronLeft, Check, Share2, Copy, Zap, PartyPopper,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";

interface Step {
  icon: React.ReactNode;
  title: string;
  description: string;
  cta?: { label: string; href: string };
}

export default function BienvenidaPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [referralCode, setReferralCode] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        router.replace("/smm");
        return;
      }
      if (mounted) {
        const name = u.user.user_metadata?.full_name || u.user.email?.split("@")[0] || "Usuario";
        setUserName(name);
        try {
          const r = await fetch("/api/network/me", { credentials: "include" });
          if (r.ok) {
            const j = await r.json();
            setReferralLink(j.link || "");
            setReferralCode(j.code || "");
          }
        } catch {}
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [router]);

  const copy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const finish = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("trustmind_welcome_seen_v1", "1");
    }
    router.push("/network");
  };

  const skip = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("trustmind_welcome_seen_v1", "1");
    }
    router.push("/smm/services");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-blue-400">Cargando...</div>
      </div>
    );
  }

  const steps: Step[] = [
    {
      icon: <PartyPopper className="w-16 h-16" />,
      title: `¡Bienvenido, ${userName}!`,
      description:
        "Tu membresía está activa. Acabas de unirte a TrustMind. En 30 segundos te muestro cómo aprovechar al máximo todo lo que tienes desbloqueado.",
    },
    {
      icon: <Share2 className="w-16 h-16" />,
      title: "Tu link de invitación",
      description:
        "Comparte tu link y ganas hasta 40% de comisión: 15% bono directo + 10% binario + 10% matching + 5% pool de rangos. Cada $200 que pague un referido te genera $30 instantáneos en tu saldo (y más cuando tu red crezca).",
      cta: { label: "Ir a Mi Red", href: "/network" },
    },
    {
      icon: <BookOpen className="w-16 h-16" />,
      title: "Curso completo desbloqueado",
      description:
        "Tienes acceso a todos los módulos: granjas de bots, GenFarmer, escalado a 1,000 cuentas, monetización en Spotify, TikTok, Instagram y YouTube. Aprende todo lo necesario para construir tu operación.",
      cta: { label: "Ver mis cursos", href: "/cursos" },
    },
    {
      icon: <ShoppingCart className="w-16 h-16" />,
      title: "30% OFF en servicios SMM",
      description:
        "Como miembro activo tienes 30% de descuento automático en TODOS los servicios SMM (seguidores, views, likes, comentarios). Lo puedes pagar con tu saldo de comisiones o recargando.",
      cta: { label: "Ver servicios", href: "/smm/services" },
    },
    {
      icon: <Wallet className="w-16 h-16" />,
      title: "Tus comisiones = saldo gastable",
      description:
        "Cada vez que un referido pague, los bonos se acreditan automáticamente como saldo SMM. Lo puedes gastar en servicios o seguir acumulando. Sin retiros engorrosos ni esperas.",
      cta: { label: "Ver mi saldo", href: "/smm/funds" },
    },
    {
      icon: <Zap className="w-16 h-16" />,
      title: "Empieza a invitar AHORA",
      description:
        "El mejor momento para crecer es hoy. Comparte tu link con 3-5 personas y arranca tu downline binaria. El sistema completo está a tu disposición — solo falta que tomes acción.",
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />

      <div className="relative min-h-screen flex flex-col">
        {/* Header simple */}
        <header className="border-b border-white/10 px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <span className="font-black tracking-widest text-xl">TRUST</span>
            <button
              onClick={skip}
              className="text-sm text-white/40 hover:text-white transition"
            >
              Saltar tour →
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-2xl">
            {/* Progress bar */}
            <div className="mb-10">
              <div className="flex justify-between text-xs text-white/40 mb-2">
                <span>Paso {step + 1} de {steps.length}</span>
                <span>{Math.round(((step + 1) / steps.length) * 100)}%</span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
                  style={{ width: `${((step + 1) / steps.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Step content */}
            <div className="text-center">
              <div className="w-28 h-28 mx-auto mb-7 rounded-3xl bg-blue-500/15 border-2 border-blue-500/30 text-blue-400 flex items-center justify-center">
                {current.icon}
              </div>
              <h1 className="text-3xl sm:text-4xl font-black mb-4 leading-tight">
                {current.title}
              </h1>
              <p className="text-base sm:text-lg text-white/70 leading-relaxed max-w-xl mx-auto">
                {current.description}
              </p>

              {/* Referral link en paso 1 */}
              {step === 1 && referralLink && (
                <div className="mt-8 max-w-md mx-auto">
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={referralLink}
                      className="flex-1 bg-black/60 border border-white/10 rounded-lg px-4 py-3 text-sm text-white font-mono text-center"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      onClick={copy}
                      className="px-5 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold flex items-center gap-2 transition"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                  {referralCode && (
                    <p className="mt-3 text-xs text-white/40">
                      Código: <span className="font-mono text-white/60">{referralCode}</span>
                    </p>
                  )}
                </div>
              )}

              {/* CTA contextual */}
              {current.cta && (
                <div className="mt-8">
                  <Link
                    href={current.cta.href}
                    onClick={finish}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-semibold transition"
                  >
                    {current.cta.label}
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Footer nav */}
        <footer className="border-t border-white/10 px-6 py-5">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-3 flex-wrap">
            <button
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={isFirst}
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-sm font-semibold flex items-center gap-2 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              Atrás
            </button>

            {/* Dots */}
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === step ? "bg-blue-400 w-8" : i < step ? "bg-blue-700 w-2" : "bg-white/10 w-2"
                  }`}
                  aria-label={`Paso ${i + 1}`}
                />
              ))}
            </div>

            {isLast ? (
              <button
                onClick={finish}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold flex items-center gap-2 transition shadow-lg shadow-blue-500/30"
              >
                <Sparkles className="w-4 h-4" />
                Ir a mi panel
              </button>
            ) : (
              <button
                onClick={() => setStep(step + 1)}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold flex items-center gap-2 transition"
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
