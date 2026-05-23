"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Smartphone, Zap, TrendingUp, Shield, MessageCircle,
  Phone, Check, Cpu, Wifi, Layers, Package, ChevronDown,
} from "lucide-react";
import { SmmNav } from "@/app/components/SmmNav";
import { supabase } from "@/app/lib/supabase";

const WHATSAPP_NUMBER = "51931119176";
const CALENDLY_URL = "https://www.scalinglatam.site/agendar";

interface PlanCard {
  name: string;
  price: number;
  devices: string;
  chassis: string;
  badge?: string;
  highlight?: boolean;
  features: string[];
}

const PLANS: PlanCard[] = [
  {
    name: "Starter",
    price: 2000,
    devices: "20 dispositivos Android",
    chassis: "Chasis metálico S8",
    features: [
      "20 Android S8 configurados",
      "TrustFarm Desktop incluido",
      "Setup remoto + capacitación",
      "Proxies recomendados",
      "Soporte por 30 días",
    ],
  },
  {
    name: "Pro",
    price: 2800,
    devices: "30 dispositivos Android",
    chassis: "Chasis metálico S9",
    badge: "Más popular",
    highlight: true,
    features: [
      "30 Android S9 configurados",
      "TrustFarm Desktop incluido",
      "Setup remoto + capacitación 1a1",
      "Proxies premium configurados",
      "Acceso a comunidad VIP",
      "Soporte por 90 días",
    ],
  },
  {
    name: "Scale",
    price: 3500,
    devices: "40 dispositivos Android",
    chassis: "Chasis metálico S9 Plus",
    features: [
      "40 Android S9 configurados",
      "TrustFarm Desktop incluido",
      "Mentoría 1a1 (4 sesiones)",
      "Proxies premium + SMS",
      "Acceso vitalicio a comunidad",
      "Soporte por 180 días",
      "Auditoría de scripts personalizada",
    ],
  },
];

export default function GranjasPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [balance, setBalance] = useState(0);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userAvatar, setUserAvatar] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        if (mounted) setAuthReady(true); // permitimos ver sin login
        return;
      }
      if (mounted) {
        setUserName(u.user.user_metadata?.full_name || u.user.email?.split("@")[0] || "Usuario");
        setUserEmail(u.user.email || "");
        setUserAvatar(u.user.user_metadata?.avatar_url || "");
        try {
          const r = await fetch("/api/smm/orders", { credentials: "include" });
          if (r.ok) {
            const b = await r.json();
            setBalance(b.balance || 0);
          }
        } catch {}
        setAuthReady(true);
      }
    })();
    return () => { mounted = false; };
  }, [router]);

  const wppUrl = (plan?: PlanCard) => {
    const msg = plan
      ? `Hola, me interesa la granja ${plan.name} (${plan.devices}) a $${plan.price}. ¿Cómo procedo?`
      : "Hola, quiero más información sobre las granjas de bots de Scaling Tech.";
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  };

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
          { href: "/network", label: "🌐 Mi Red" },
          { href: "/cursos", label: "📚 Mis Cursos" },
          { href: "/granjas", label: "🤖 Granjas", active: true },
          { href: "/smm/ai", label: "🤖 Asistente IA" },
        ]}
      />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-black to-black" />
        <div className="absolute top-20 right-10 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-24">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs mb-5">
            <Zap className="w-3 h-3" /> Hardware listo para producción
          </div>
          <h1 className="text-4xl sm:text-6xl font-black leading-[1.05] tracking-tight max-w-3xl">
            Adquiere tu{" "}
            <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent">
              granja de bots
            </span>
            <br />
            llave en mano.
          </h1>
          <p className="mt-5 text-lg text-white/70 max-w-2xl">
            Hardware Android configurado + software TrustFarm + setup completo.
            Empieza a generar ingresos pasivos con automatización en TikTok, Instagram, Spotify y YouTube
            desde el primer día.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href={wppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <MessageCircle className="w-5 h-5" /> Hablar por WhatsApp
            </a>
            <a
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold flex items-center gap-2"
            >
              <Phone className="w-5 h-5" /> Agendar llamada
            </a>
          </div>

          {/* mini stats */}
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl">
            <Stat n="$40K/mes" label="Revenue del modelo" />
            <Stat n="70%" label="Margen bruto" />
            <Stat n="200+" label="Granjas entregadas" />
            <Stat n="LATAM" label="Mercados activos" />
          </div>
        </div>
      </section>

      {/* QUE INCLUYE */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold mb-2">Todo incluido en cada granja</h2>
        <p className="text-white/60 mb-10">No tienes que pelear con configuraciones ni proveedores: te entregamos el sistema completo.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Feature icon={<Smartphone className="w-6 h-6" />} title="Hardware Android" desc="Chasis metálico con 20-40 dispositivos Android S8/S9 enracados, listos para operar 24/7." />
          <Feature icon={<Cpu className="w-6 h-6" />} title="Software TrustFarm Desktop" desc="Phone farm manager profesional con automatización, mirroring y control multi-cuenta." />
          <Feature icon={<Wifi className="w-6 h-6" />} title="Proxies configurados" desc="Proxies residenciales y móviles preconfigurados. Rotación automática y anti-detección." />
          <Feature icon={<Layers className="w-6 h-6" />} title="Setup remoto" desc="Te conectamos por AnyDesk y configuramos todo: cuentas, scripts y primer flujo en producción." />
          <Feature icon={<Shield className="w-6 h-6" />} title="Soporte post-venta" desc="30 a 180 días de soporte directo. Si algo falla, lo arreglamos sin costo extra." />
          <Feature icon={<TrendingUp className="w-6 h-6" />} title="Capacitación" desc="Acceso al curso de GemFarmer + mentoría 1a1 según el plan. Aprendes a escalar y monetizar." />
        </div>
      </section>

      {/* PLANES */}
      <section id="planes" className="max-w-6xl mx-auto px-4 py-16 border-t border-white/5">
        <h2 className="text-3xl font-bold mb-2">Elige tu granja</h2>
        <p className="text-white/60 mb-10">Pago único. Envío incluido a Perú. Otros países cotizar.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map((plan) => (
            <PlanCardComp key={plan.name} plan={plan} wppUrl={wppUrl(plan)} />
          ))}
        </div>

        <p className="text-center text-white/40 text-sm mt-8">
          ¿Necesitas algo más grande (50+ dispositivos)? <a href={wppUrl()} target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:underline">Hablemos directo</a>.
        </p>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="max-w-6xl mx-auto px-4 py-16 border-t border-white/5">
        <h2 className="text-3xl font-bold mb-10">Cómo funciona</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Step n="1" title="Eliges tu plan" desc="WhatsApp o agenda una llamada. Te ayudamos a elegir el tamaño correcto." />
          <Step n="2" title="Adelantas 50%" desc="Pago seguro vía Stripe (tarjeta) o transferencia. Iniciamos producción." />
          <Step n="3" title="Producción + envío" desc="Armamos tu granja, la testeamos y la enviamos. 7-15 días según el plan." />
          <Step n="4" title="Setup y operación" desc="Te conectamos por AnyDesk, configuramos todo y arrancas a generar." />
        </div>
      </section>

      {/* USOS */}
      <section className="max-w-6xl mx-auto px-4 py-16 border-t border-white/5">
        <h2 className="text-3xl font-bold mb-2">Para qué se usan</h2>
        <p className="text-white/60 mb-10">Las granjas son la base de cualquier sistema serio de automatización en redes.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <UseCase emoji="🎵" title="Reproducciones Spotify" desc="Genera miles de reproducciones para artistas o como servicio." />
          <UseCase emoji="📺" title="Views en YouTube" desc="Engagement, suscriptores, comentarios y vistas reales." />
          <UseCase emoji="🎯" title="TikTok automation" desc="Likes, follows, views y posts automatizados." />
          <UseCase emoji="📸" title="Instagram growth" desc="Crecimiento de cuentas, engagement, DMs masivos." />
          <UseCase emoji="🎮" title="Twitch & Kick" desc="Viewers en vivo, follows, chat automation." />
          <UseCase emoji="💼" title="Servicios SMM" desc="Revende los servicios desde tu propio panel." />
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 py-16 border-t border-white/5">
        <h2 className="text-3xl font-bold mb-10">Preguntas frecuentes</h2>
        <div className="space-y-2">
          {FAQS.map((f, i) => (
            <FaqItem
              key={i}
              q={f.q}
              a={f.a}
              open={openFaq === i}
              onToggle={() => setOpenFaq(openFaq === i ? null : i)}
            />
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="border-t border-white/5">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl sm:text-4xl font-black mb-4">¿Listo para empezar?</h2>
          <p className="text-white/60 mb-8">Hablemos. Te ayudamos a elegir el plan correcto según tu nicho y presupuesto.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a href={wppUrl()} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold flex items-center gap-2">
              <MessageCircle className="w-5 h-5" /> WhatsApp
            </a>
            <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold flex items-center gap-2">
              <Phone className="w-5 h-5" /> Agendar llamada
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-6 text-center text-xs text-white/30">
        © {new Date().getFullYear()} Scaling Tech Farm LLC · TrustMind
      </footer>

      {authReady && null}
    </div>
  );
}

const FAQS = [
  { q: "¿La granja viene 100% lista para usar?", a: "Sí. Todos los dispositivos vienen flasheados, con apps instaladas, proxies configurados y TrustFarm Desktop conectado. Después del setup remoto puedes arrancar el mismo día." },
  { q: "¿Qué garantía tienen los dispositivos?", a: "Garantía de hardware 90 días. Reemplazamos cualquier dispositivo defectuoso sin costo (envío bajo cuenta del cliente fuera de Perú)." },
  { q: "¿Pueden envíar al extranjero?", a: "Sí, enviamos a Perú, Argentina, República Dominicana, Colombia, México y EE.UU. Los costos de envío internacional se cotizan aparte." },
  { q: "¿Cuánto gano con la granja?", a: "Depende del nicho. Casos típicos: $500-$3,000/mes vendiendo servicios SMM, $300-$1,500/mes en reproducciones Spotify, $1,000-$5,000/mes con TikTok automation. Te ayudamos a definir tu estrategia." },
  { q: "¿Necesito experiencia técnica?", a: "No. El setup remoto cubre toda la configuración. Te capacitamos en cómo operar TrustFarm y los flujos básicos. La curva de aprendizaje es de 1-2 semanas." },
  { q: "¿Puedo financiar la compra?", a: "Aceptamos 50% adelantado y 50% contra entrega. Para planes Scale ofrecemos financiación en 3 cuotas (consultar)." },
  { q: "¿Qué pasa si crece mi operación?", a: "Puedes agregar dispositivos en cualquier momento. Te vendemos racks adicionales con descuento por volumen." },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <div className="text-2xl sm:text-3xl font-black text-white">{n}</div>
      <div className="text-xs text-white/50 mt-1 uppercase tracking-wider">{label}</div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-blue-500/30 transition">
      <div className="w-12 h-12 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-bold text-white mb-1">{title}</h3>
      <p className="text-sm text-white/60">{desc}</p>
    </div>
  );
}

function PlanCardComp({ plan, wppUrl }: { plan: PlanCard; wppUrl: string }) {
  return (
    <div
      className={`relative rounded-2xl p-6 border-2 ${
        plan.highlight
          ? "bg-gradient-to-br from-blue-900/30 to-black border-blue-500"
          : "bg-white/5 border-white/10"
      }`}
    >
      {plan.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-blue-500 text-white text-xs font-bold">
          {plan.badge}
        </div>
      )}
      <div className="flex items-center gap-2 mb-1">
        <Package className="w-5 h-5 text-blue-400" />
        <h3 className="font-bold text-xl">{plan.name}</h3>
      </div>
      <p className="text-sm text-white/55 mb-5">{plan.devices} · {plan.chassis}</p>
      <div className="mb-5">
        <span className="text-5xl font-black text-white">${plan.price.toLocaleString()}</span>
        <span className="text-sm text-white/50 ml-1">USD</span>
      </div>
      <ul className="space-y-2 mb-6">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-white/70">
            <Check className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <a
        href={wppUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`block w-full text-center px-4 py-3 rounded-lg font-bold transition ${
          plan.highlight
            ? "bg-blue-600 hover:bg-blue-500 text-white"
            : "bg-white/10 hover:bg-white/15 text-white"
        }`}
      >
        Quiero esta granja →
      </a>
    </div>
  );
}

function Step({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <div className="w-9 h-9 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 font-black flex items-center justify-center mb-3">
        {n}
      </div>
      <h4 className="font-bold mb-1">{title}</h4>
      <p className="text-sm text-white/55">{desc}</p>
    </div>
  );
}

function UseCase({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <div className="text-3xl mb-3">{emoji}</div>
      <h3 className="font-bold mb-1">{title}</h3>
      <p className="text-sm text-white/60">{desc}</p>
    </div>
  );
}

function FaqItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-white/5 transition"
      >
        <span className="font-medium text-white">{q}</span>
        <ChevronDown className={`w-5 h-5 text-white/50 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-white/70">{a}</div>
      )}
    </div>
  );
}
