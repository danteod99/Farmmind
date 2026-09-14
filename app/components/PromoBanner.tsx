"use client";

import { useEffect, useState } from "react";
import { X, Gift, ArrowRight } from "lucide-react";
import { supabase } from "@/app/lib/supabase";

export function PromoBanner() {
  const [visible, setVisible] = useState(true);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_, session) => setLoggedIn(!!session?.user));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Solo para visitantes sin cuenta
  if (!visible || loggedIn !== false) return null;

  const handleRegister = async () => {
    setLoading(true);
    const origin = window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/downloads")}` },
    });
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        background: "linear-gradient(135deg, #007ABF 0%, #00B4D8 50%, #007ABF 100%)",
        backgroundSize: "200% 200%",
        animation: "bannerShimmer 3s ease infinite",
        padding: "12px 44px 12px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        flexWrap: "wrap",
        zIndex: 100,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <style>{`
        @keyframes bannerShimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      <Gift size={18} color="white" style={{ flexShrink: 0 }} />

      <span style={{ color: "white", fontSize: "14px", fontWeight: 600, letterSpacing: "-0.2px", textAlign: "center" }}>
        <strong style={{ fontWeight: 800 }}>Regístrate</strong> para usar el software de manera <strong style={{ fontWeight: 800 }}>gratuita</strong>
      </span>

      <button
        onClick={handleRegister}
        disabled={loading}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          background: "white",
          border: "none",
          borderRadius: "8px",
          padding: "6px 14px",
          color: "#007ABF",
          fontWeight: 800,
          fontSize: "13px",
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.7 : 1,
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#e0f2fe"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}
      >
        {loading ? "Conectando..." : "Crear cuenta gratis"} <ArrowRight size={13} />
      </button>

      <button
        onClick={() => setVisible(false)}
        aria-label="Cerrar"
        style={{
          position: "absolute",
          right: "12px",
          top: "50%",
          transform: "translateY(-50%)",
          background: "rgba(255,255,255,0.15)",
          border: "none",
          borderRadius: "50%",
          width: "24px",
          height: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "white",
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.3)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
