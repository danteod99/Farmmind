"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { usePanel } from "../context";
import { supabase } from "@/app/lib/supabase";
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft } from "lucide-react";

type Mode = "login" | "register";

export default function ChildPanelAuth() {
  const { reseller, loading, slug, brandColor, panelName, logoUrl } = usePanel();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");

  // Show error from OAuth callback redirect (e.g. PKCE failure)
  useEffect(() => {
    const cbError = searchParams.get("error");
    if (cbError) {
      setError("Error al iniciar con Google. Intenta de nuevo.");
      console.error("[Auth] OAuth callback error:", cbError);
    }
  }, [searchParams]);

  // Check if already authenticated
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && slug) {
        // Register as reseller client if needed
        await linkToReseller(user.id);
        // Use window.location for a full navigation so middleware + cookies
        // are handled cleanly on the subdomain
        window.location.replace(`/panel/${slug}/services`);
      }
    })();
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const linkToReseller = async (userId: string) => {
    if (!reseller) return;
    try {
      await fetch(`/api/panel/${slug}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, auth_method: "google" }),
      });
    } catch (e) {
      // Silent - just linking
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    // Use same origin for callback so PKCE code verifier cookie is on the same domain
    const redirectUrl = `${window.location.origin}/auth/callback?panel=${slug}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectUrl },
    });
    if (error) setError(error.message);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      if (mode === "register") {
        // Sign up — use same origin for callback so PKCE cookie is on same domain
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: `${window.location.origin}/auth/callback?panel=${slug}`,
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        if (data.user) {
          // Link to reseller
          await fetch(`/api/panel/${slug}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: data.user.id,
              email,
              name,
              auth_method: "email",
            }),
          });

          if (data.session) {
            // Auto-confirmed (or confirmation disabled) — full navigation for clean cookie handling
            window.location.replace(`/panel/${slug}/services`);
          } else {
            setSuccess("Revisa tu correo para confirmar tu cuenta.");
          }
        }
      } else {
        // Sign in
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          if (signInError.message.includes("Invalid login")) {
            setError("Email o contraseña incorrectos.");
          } else {
            setError(signInError.message);
          }
          return;
        }

        if (data.user) {
          await linkToReseller(data.user.id);
          window.location.replace(`/panel/${slug}/services`);
        }
      }
    } catch (e) {
      setError("Error inesperado. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#07070e" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${brandColor}30`, borderTopColor: brandColor, animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!reseller) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#07070e", flexDirection: "column", gap: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f0efff" }}>Panel no encontrado</h1>
      </div>
    );
  }

  const bc = brandColor;

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fade-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .auth-input:focus { border-color: ${bc} !important; box-shadow: 0 0 0 2px ${bc}30 !important; }
        .auth-input::placeholder { color: #3a3a5c; }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "#07070e",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
      }}>
        <div style={{
          width: "100%",
          maxWidth: 420,
          animation: "fade-in 0.4s ease-out",
        }}>
          {/* Back link */}
          <Link
            href={`/panel/${slug}`}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#5a6480", textDecoration: "none", marginBottom: 28 }}
          >
            <ArrowLeft size={14} /> Volver
          </Link>

          {/* Logo + Name */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            {logoUrl ? (
              <img src={logoUrl} alt={panelName} loading="lazy" style={{ width: 56, height: 56, borderRadius: 14, objectFit: "cover", margin: "0 auto 12px" }} />
            ) : (
              <div style={{ width: 56, height: 56, borderRadius: 14, background: `${bc}20`, border: `1px solid ${bc}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: bc, margin: "0 auto 12px" }}>
                {panelName.charAt(0)}
              </div>
            )}
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "white", marginBottom: 4 }}>
              {mode === "login" ? "Inicia sesión" : "Crea tu cuenta"}
            </h1>
            <p style={{ fontSize: 13, color: "#5a6480" }}>
              {mode === "login" ? `Accede a ${panelName}` : `Regístrate en ${panelName}`}
            </p>
          </div>

          {/* Google button */}
          <button
            onClick={handleGoogleLogin}
            style={{
              width: "100%",
              padding: "12px 20px",
              borderRadius: 10,
              background: "#12121e",
              border: "1px solid #2a2a42",
              color: "white",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              fontFamily: "inherit",
              transition: "all 0.15s",
              marginBottom: 20,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuar con Google
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: "#1e1e30" }} />
            <span style={{ fontSize: 11, color: "#3a3a5c", fontWeight: 600 }}>O CON EMAIL</span>
            <div style={{ flex: 1, height: 1, background: "#1e1e30" }} />
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {mode === "register" && (
              <div style={{ position: "relative" }}>
                <User size={16} color="#3a3a5c" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  className="auth-input"
                  type="text"
                  placeholder="Tu nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "12px 14px 12px 40px",
                    borderRadius: 10,
                    background: "#0d0d18",
                    border: "1px solid #1e1e30",
                    color: "white",
                    fontSize: 14,
                    outline: "none",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                />
              </div>
            )}

            <div style={{ position: "relative" }}>
              <Mail size={16} color="#3a3a5c" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
              <input
                className="auth-input"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "12px 14px 12px 40px",
                  borderRadius: 10,
                  background: "#0d0d18",
                  border: "1px solid #1e1e30",
                  color: "white",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              />
            </div>

            <div style={{ position: "relative" }}>
              <Lock size={16} color="#3a3a5c" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
              <input
                className="auth-input"
                type={showPw ? "text" : "password"}
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                style={{
                  width: "100%",
                  padding: "12px 44px 12px 40px",
                  borderRadius: 10,
                  background: "#0d0d18",
                  border: "1px solid #1e1e30",
                  color: "white",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#3a3a5c", cursor: "pointer", padding: 0 }}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && (
              <div style={{ padding: "10px 14px", borderRadius: 8, background: "#f8717112", border: "1px solid #f8717130", color: "#f87171", fontSize: 13 }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{ padding: "10px 14px", borderRadius: 8, background: "#34d39912", border: "1px solid #34d39930", color: "#34d399", fontSize: 13 }}>
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: "100%",
                padding: "12px 20px",
                borderRadius: 10,
                background: submitting ? "#1a1a2e" : bc,
                border: "none",
                color: "white",
                fontSize: 14,
                fontWeight: 700,
                cursor: submitting ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s",
                marginTop: 4,
              }}
            >
              {submitting
                ? "Cargando..."
                : mode === "login"
                ? "Iniciar sesión"
                : "Crear cuenta"}
            </button>
          </form>

          {/* Toggle mode */}
          <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#5a6480" }}>
            {mode === "login" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
            <button
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setSuccess(""); }}
              style={{ background: "none", border: "none", color: bc, fontWeight: 700, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}
            >
              {mode === "login" ? "Regístrate" : "Inicia sesión"}
            </button>
          </p>
        </div>
      </div>
    </>
  );
}
