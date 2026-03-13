"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { FarmMindLogo } from "@/app/components/FarmMindLogo";

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // If already authenticated, go straight to services
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.replace("/smm/services");
      } else {
        setLoading(false);
      }
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setAuthLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { setError(error.message); return; }
        router.replace("/smm/services");
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) { setError(error.message); return; }
        setSuccess("¡Cuenta creada! Revisa tu email para confirmar y luego inicia sesión.");
        setMode("login");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ height: "100vh", background: "#07070e", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "50%", border: "3px solid #007ABF20", borderTopColor: "#56B4E0", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#07070e", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #07070e; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fade-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        input:focus { outline: none; border-color: #007ABF !important; }
      `}</style>

      <div style={{ width: "100%", maxWidth: "400px", animation: "fade-in 0.4s ease" }}>
        {/* Logo + Brand */}
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "20px", background: "linear-gradient(135deg, #007ABF, #005FA4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 0 40px #007ABF50" }}>
            <FarmMindLogo size={36} />
          </div>
          <h1 style={{ fontSize: "26px", fontWeight: 800, color: "white", letterSpacing: "-0.5px" }}>TRUST MIND</h1>
          <p style={{ fontSize: "14px", color: "#5a6480", marginTop: "6px" }}>Plataforma de servicios Social Media</p>
        </div>

        {/* Card */}
        <div style={{ background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: "20px", padding: "32px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "white", marginBottom: "6px" }}>
            {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </h2>
          <p style={{ fontSize: "13px", color: "#5a6480", marginBottom: "24px" }}>
            {mode === "login" ? "Accede a tu cuenta para gestionar servicios" : "Regístrate para comenzar a usar la plataforma"}
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#8892a4", display: "block", marginBottom: "6px" }}>Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                placeholder="tu@email.com"
                style={{ width: "100%", background: "#07070e", border: "1px solid #1e1e30", borderRadius: "10px", padding: "11px 14px", color: "white", fontSize: "14px", fontFamily: "inherit", transition: "border-color 0.15s" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#8892a4", display: "block", marginBottom: "6px" }}>Contraseña</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                placeholder="••••••••"
                style={{ width: "100%", background: "#07070e", border: "1px solid #1e1e30", borderRadius: "10px", padding: "11px 14px", color: "white", fontSize: "14px", fontFamily: "inherit", transition: "border-color 0.15s" }}
              />
            </div>

            {error && (
              <div style={{ background: "#f8717115", border: "1px solid #f8717130", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "#f87171" }}>
                ⚠️ {error}
              </div>
            )}
            {success && (
              <div style={{ background: "#34d39915", border: "1px solid #34d39930", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "#34d399" }}>
                ✅ {success}
              </div>
            )}

            <button type="submit" disabled={authLoading}
              style={{ width: "100%", padding: "13px", borderRadius: "12px", background: authLoading ? "#1a1a2e" : "linear-gradient(135deg, #007ABF, #005FA4)", border: "none", color: authLoading ? "#5a6480" : "white", fontSize: "15px", fontWeight: 700, cursor: authLoading ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: authLoading ? "none" : "0 0 24px #007ABF40", transition: "all 0.2s", marginTop: "4px" }}>
              {authLoading ? (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Cargando...</>
              ) : mode === "login" ? "Entrar →" : "Crear cuenta →"}
            </button>
          </form>

          <div style={{ borderTop: "1px solid #1e1e30", marginTop: "24px", paddingTop: "20px", textAlign: "center" }}>
            <span style={{ fontSize: "13px", color: "#5a6480" }}>
              {mode === "login" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
            </span>
            <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); setSuccess(null); }}
              style={{ background: "none", border: "none", color: "#56B4E0", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              {mode === "login" ? "Regístrate gratis" : "Iniciar sesión"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
