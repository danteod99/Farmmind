"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen, Play, Lock, Clock, Check, Zap, Sparkles,
} from "lucide-react";
import { SmmNav } from "@/app/components/SmmNav";
import { supabase } from "@/app/lib/supabase";

interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover_url: string;
  level: string;
  duration: string;
  display_order: number;
}

interface CoursesData {
  courses: Course[];
  user_state: {
    authenticated: boolean;
    has_access: boolean;
    is_founder: boolean;
    is_subscribed: boolean;
    is_annual: boolean;
  };
}

export default function CursosPage() {
  const router = useRouter();
  const [data, setData] = useState<CoursesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userAvatar, setUserAvatar] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const startAnnualCheckout = async () => {
    const priceId = process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID;
    if (!priceId) {
      alert("La suscripción anual aún no está configurada. Contacta a soporte.");
      return;
    }
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else {
        alert(data.error || "Error iniciando checkout");
        setCheckoutLoading(false);
      }
    } catch {
      alert("Error de red");
      setCheckoutLoading(false);
    }
  };

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [coursesRes, balRes] = await Promise.all([
        fetch("/api/courses", { credentials: "include" }),
        fetch("/api/smm/orders", { credentials: "include" }),
      ]);
      if (coursesRes.ok) setData(await coursesRes.json());
      if (balRes.ok) {
        const b = await balRes.json();
        setBalance(b.balance || 0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authReady) fetchData();
  }, [authReady, fetchData]);


  if (!authReady || loading || !data) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-blue-400">Cargando cursos...</div>
      </div>
    );
  }

  const { user_state, courses } = data;

  return (
    <div className="min-h-screen bg-black text-white">
      <SmmNav
        balance={balance}
        userAvatar={userAvatar}
        userName={userName}
        userEmail={userEmail}
        links={[
          { href: "/smm/services", label: "Servicios" },
          { href: "/smm/funds", label: "Recargar" },
          { href: "/cursos", label: "Mis Cursos", active: true },
          { href: "/granjas", label: "Granjas" },
          { href: "/downloads", label: "Descargas" },
          { href: "/smm/ai", label: "Asistente IA" },
          { href: "https://www.scalinglatam.site", label: "Scaling Latam", external: true },
        ]}
      />

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Title */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-blue-400" />
            Mis Cursos
          </h1>
          <p className="text-white/60 mt-1">
            {user_state.is_founder
              ? "Tienes acceso completo como fundador."
              : user_state.is_annual
                ? "Acceso completo incluido con tu plan anual."
                : "Academia de Scaling LATAM — incluida con el plan anual del software."}
          </p>
        </div>

        {/* Paywall si no tiene acceso */}
        {!user_state.has_access && (
          <section className="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-900/40 via-black to-black p-6 sm:p-8">
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-cyan-400/10 blur-3xl pointer-events-none" />

            <div className="relative flex items-start gap-4 mb-5">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                  Desbloquea todos los cursos con el plan anual
                </h2>
                <p className="text-white/70 text-sm mt-2 leading-relaxed">
                  La suscripción anual al software incluye <strong className="text-white">acceso completo a la academia</strong>:
                  granjas, GenFarmer, escalado a 1,000 cuentas, monetización en Spotify, TikTok, Instagram, YouTube y más.
                </p>
              </div>
            </div>

            <div className="relative flex flex-wrap items-center gap-3 mb-5">
              {[
                "Todos los módulos sin restricción",
                "Actualizaciones gratis durante 12 meses",
                "Bundle desktop: TrustInsta + TrustFace",
                "Saldo SMM con precios base",
              ].map((b) => (
                <div key={b} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/80">
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> {b}
                </div>
              ))}
            </div>

            <div className="relative flex flex-wrap items-center gap-3">
              <button
                onClick={startAnnualCheckout}
                disabled={checkoutLoading}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-400 hover:to-cyan-300 text-black rounded-xl font-bold text-sm flex items-center gap-2 transition disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                {checkoutLoading ? "Abriendo checkout…" : "Suscribirme al plan anual"}
              </button>
              {user_state.is_subscribed && !user_state.is_annual && (
                <span className="text-xs text-yellow-300/90 bg-yellow-500/10 border border-yellow-500/30 px-3 py-1.5 rounded-lg">
                  Tienes plan mensual — actualiza a anual para incluir cursos
                </span>
              )}
            </div>
          </section>
        )}

        {/* Lista de cursos */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map((c) => (
            <CourseCard key={c.id} course={c} hasAccess={user_state.has_access} />
          ))}
        </section>

        {courses.length === 0 && (
          <div className="text-center py-16 text-white/40">
            Aún no hay cursos publicados. Pronto.
          </div>
        )}
      </main>
    </div>
  );
}

function CourseCard({ course, hasAccess }: { course: Course; hasAccess: boolean }) {
  const levelColors: Record<string, string> = {
    principiante: "bg-emerald-500/20 text-emerald-300",
    intermedio: "bg-yellow-500/20 text-yellow-300",
    avanzado: "bg-red-500/20 text-red-300",
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-blue-500/30 transition group">
      {/* Cover */}
      <div className="aspect-video bg-gradient-to-br from-blue-900/40 to-black flex items-center justify-center relative">
        {course.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.cover_url} alt={course.title} className="w-full h-full object-cover" />
        ) : (
          <BookOpen className="w-16 h-16 text-blue-400/30" />
        )}
        {!hasAccess && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Lock className="w-10 h-10 text-white/60" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded ${levelColors[course.level] || "bg-white/10 text-white/60"}`}>
            {course.level}
          </span>
          {course.duration && (
            <span className="text-[10px] uppercase tracking-wider text-white/40 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {course.duration}
            </span>
          )}
        </div>
        <h3 className="font-bold text-white text-lg mb-2 group-hover:text-blue-300 transition">{course.title}</h3>
        <p className="text-sm text-white/55 line-clamp-3 mb-4">{course.description}</p>

        {hasAccess ? (
          <Link
            href={`/cursos/${course.slug}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-semibold transition"
          >
            <Play className="w-4 h-4" /> Empezar curso
          </Link>
        ) : (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/40">
            <Lock className="w-4 h-4" /> Bloqueado
          </div>
        )}
      </div>
    </div>
  );
}
