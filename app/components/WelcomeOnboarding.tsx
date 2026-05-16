"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles, BookOpen, Users, ShoppingCart, Wallet,
  X, ChevronRight, ChevronLeft, Check, Share2, Copy, Zap, PartyPopper,
} from "lucide-react";

const LS_KEY = "trustmind_welcome_seen_v1";

interface Step {
  icon: React.ReactNode;
  title: string;
  description: string;
  cta?: { label: string; href: string };
}

interface Props {
  referralLink?: string;
  referralCode?: string;
  userName?: string;
  /** Forzar el modal aunque ya se haya visto (ej. desde un botón "ver tour de nuevo") */
  force?: boolean;
}

export default function WelcomeOnboarding({ referralLink, referralCode, userName, force }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (force) {
      setOpen(true);
      return;
    }
    if (typeof window === "undefined") return;
    // Detectar query ?payment=success o ?registered=1 + no haberlo visto antes
    const url = new URL(window.location.href);
    const cameFromPayment = url.searchParams.get("payment") === "success";
    const cameFromRegister = url.searchParams.get("registered") === "1";
    const seen = localStorage.getItem(LS_KEY);
    if ((cameFromPayment || cameFromRegister) && !seen) {
      setOpen(true);
    }
  }, [force]);

  const close = () => {
    setOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(LS_KEY, "1");
      // Limpiar query string
      const url = new URL(window.location.href);
      url.searchParams.delete("payment");
      url.searchParams.delete("registered");
      window.history.replaceState({}, "", url.toString());
    }
  };

  const copy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const greeting = userName ? `¡Bienvenido, ${userName}!` : "¡Bienvenido a TrustMind!";

  const steps: Step[] = [
    {
      icon: <PartyPopper className="w-10 h-10" />,
      title: greeting,
      description:
        "Tu membresía está activa. Acabas de unirte a la red de mercadeo binaria más fuerte de LATAM. Te muestro en 30 segundos cómo aprovechar al máximo todo lo que tienes desbloqueado.",
    },
    {
      icon: <Share2 className="w-10 h-10" />,
      title: "Tu link de invitación (gana hasta 40%)",
      description:
        "Comparte tu link y ganas 15% directo + 25% adicional (binario, matching y pool). Cada $200 que pague un referido = $30 instantáneos en tu saldo + bonos extra cuando tu red crezca.",
      cta: { label: "Ir a Mi Red", href: "/network" },
    },
    {
      icon: <BookOpen className="w-10 h-10" />,
      title: "Curso completo desbloqueado",
      description:
        "Tienes acceso a todos los módulos: granjas de bots, GenFarmer, escalado a 1,000 cuentas, monetización en Spotify, TikTok, Instagram y YouTube.",
      cta: { label: "Ver mis cursos", href: "/cursos" },
    },
    {
      icon: <ShoppingCart className="w-10 h-10" />,
      title: "30% OFF en servicios SMM",
      description:
        "Como miembro activo tienes 30% de descuento automático en TODOS los servicios SMM (seguidores, views, likes, etc.). Lo gastas con tu saldo o recargando.",
      cta: { label: "Ver servicios", href: "/smm/services" },
    },
    {
      icon: <Wallet className="w-10 h-10" />,
      title: "Tus comisiones = saldo gastable",
      description:
        "Cada vez que un referido pague, los bonos se acreditan automáticamente como saldo SMM. Lo puedes gastar en servicios o seguir acumulando. Sin retiros engorrosos.",
      cta: { label: "Ver mi saldo", href: "/smm/funds" },
    },
    {
      icon: <Zap className="w-10 h-10" />,
      title: "Empieza a invitar AHORA",
      description:
        "El mejor momento para crecer es hoy. Comparte tu link con 3-5 personas y arranca tu downline binaria. Tu CEO Dante ya hizo $40K/mes con este sistema.",
    },
  ];

  if (!open) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-gradient-to-br from-blue-950 via-black to-black border-2 border-blue-500/40 rounded-3xl shadow-2xl shadow-blue-500/20 overflow-hidden">
        {/* Close button */}
        <button
          onClick={close}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition z-10"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pt-6 pb-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all ${
                i === step ? "bg-blue-400 w-8" : i < step ? "bg-blue-700 w-2" : "bg-white/10 w-2"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-8 py-8 text-center">
          <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center">
            {current.icon}
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">{current.title}</h2>
          <p className="text-white/70 leading-relaxed">{current.description}</p>

          {/* Link especial en step 1 (referral) */}
          {step === 1 && referralLink && (
            <div className="mt-5 flex gap-2">
              <input
                readOnly
                value={referralLink}
                className="flex-1 bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={copy}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-semibold flex items-center gap-2 transition"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
          )}
          {step === 1 && referralCode && (
            <p className="mt-2 text-xs text-white/40">
              Código: <span className="font-mono text-white/60">{referralCode}</span>
            </p>
          )}
        </div>

        {/* Footer / Nav */}
        <div className="px-8 py-5 border-t border-white/10 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-2">
            <button
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={isFirst}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-sm font-semibold flex items-center gap-1 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              Atrás
            </button>
            <button
              onClick={close}
              className="px-4 py-2 text-white/40 hover:text-white text-sm transition"
            >
              Saltar tour
            </button>
          </div>

          <div className="flex gap-2">
            {current.cta && (
              <Link
                href={current.cta.href}
                onClick={() => { if (typeof window !== "undefined") localStorage.setItem(LS_KEY, "1"); }}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-semibold transition"
              >
                {current.cta.label}
              </Link>
            )}
            {isLast ? (
              <button
                onClick={close}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold flex items-center gap-2 transition shadow-lg shadow-blue-500/30"
              >
                <Sparkles className="w-4 h-4" />
                ¡Empezar!
              </button>
            ) : (
              <button
                onClick={() => setStep(step + 1)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold flex items-center gap-2 transition"
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
