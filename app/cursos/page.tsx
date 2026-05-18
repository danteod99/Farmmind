"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { SmmNav } from "@/app/components/SmmNav";
import { TrustFooter } from "@/app/components/TrustFooter";
import ChatPopup from "@/app/components/ChatPopup";
import { GraduationCap, Sparkles, Clock } from "lucide-react";

export default function CursosPage() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userAvatar, setUserAvatar] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }
      setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuario");
      setUserEmail(user.email || "");
      setUserAvatar(user.user_metadata?.avatar_url || "");
      try {
        const res = await fetch("/api/smm/orders");
        if (res.ok) { const d = await res.json(); setBalance(d.balance || 0); }
      } finally { setLoading(false); }
    })();
  }, [router]);

  if (loading) return (
    <div style={{ height: "100vh", background: "#07070e", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "32px", height: "32px", borderRadius: "50%", border: "2px solid #007ABF", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <>
      <style>{`
        body { background: #07070e; color: #f0efff; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; }
        @keyframes pulse-glow { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
      `}</style>
      <div style={{ minHeight: "100vh", background: "#07070e" }}>
        <SmmNav
          balance={balance}
          userAvatar={userAvatar}
          userName={userName}
          userEmail={userEmail}
          links={[
            { href: "/smm/services", label: "Servicios" },
            { href: "/smm/orders", label: "Pedidos" },
            { href: "/smm/funds", label: "Recargar" },
            { href: "/cursos", label: "Cursos", active: true },
            { href: "/downloads", label: "📥 Descargas" },
            { href: "/smm/ai", label: "🤖 Asistente IA" },
            { href: "https://www.scalinglatam.site", label: "🤖 Granja de bots", external: true },
          ]}
        />

        <div style={{ maxWidth: "960px", margin: "0 auto", padding: "60px 28px" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <div style={{ display: "inline-flex", padding: "16px", borderRadius: "20px", background: "linear-gradient(135deg, #007ABF20, #56B4E020)", border: "1px solid #007ABF40", marginBottom: "20px" }}>
              <GraduationCap size={40} color="#56B4E0" />
            </div>
            <h1 style={{ fontSize: "44px", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", background: "linear-gradient(135deg, #fff 0%, #88D0F0 50%, #56B4E0 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "16px" }}>
              Cursos TRUST MIND
            </h1>
            <p style={{ fontSize: "17px", color: "#94a3b8", maxWidth: "560px", margin: "0 auto", lineHeight: 1.6 }}>
              Aprende a escalar tu negocio digital con nuestros cursos exclusivos de marketing, automatización y crecimiento.
            </p>
          </div>

          <div style={{ background: "linear-gradient(135deg, #0d0d18, #0a0a14)", border: "1px solid #1e1e30", borderRadius: "20px", padding: "48px 32px", textAlign: "center" }}>
            <div style={{ display: "inline-flex", padding: "12px", borderRadius: "14px", background: "#fbbf2415", border: "1px solid #fbbf2435", marginBottom: "20px", animation: "pulse-glow 2s ease-in-out infinite" }}>
              <Clock size={28} color="#fbbf24" />
            </div>
            <h2 style={{ fontSize: "26px", fontWeight: 700, color: "white", marginBottom: "12px" }}>
              Próximamente
            </h2>
            <p style={{ fontSize: "15px", color: "#94a3b8", maxWidth: "440px", margin: "0 auto 24px", lineHeight: 1.6 }}>
              Estamos preparando contenido premium para que lleves tu negocio al siguiente nivel. Mantente atento.
            </p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 18px", borderRadius: "12px", background: "#007ABF15", border: "1px solid #007ABF30", color: "#56B4E0", fontSize: "13px", fontWeight: 600 }}>
              <Sparkles size={14} /> Muy pronto
            </div>
          </div>
        </div>
      </div>

      <TrustFooter />
      <ChatPopup />
    </>
  );
}
