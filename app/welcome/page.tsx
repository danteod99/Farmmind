"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Mail, Sparkles } from "lucide-react";

export default function WelcomePage() {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "loginRequired" | "ok" | "error">("loading");
  const [email, setEmail] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get("session_id");
      if (!sessionId) {
        setState("error");
        setErrorMsg("Falta session_id");
        return;
      }
      try {
        const res = await fetch(`/api/post-checkout?session_id=${encodeURIComponent(sessionId)}`);
        const data = await res.json();
        if (!res.ok) {
          setState("error");
          setErrorMsg(data.error || "Error procesando el pago");
          return;
        }
        setEmail(data.email);
        // Si el server devolvió magic_link, redirigir
        if (data.redirect_url) {
          window.location.href = data.redirect_url;
          return;
        }
        // Si solo confirmó pago pero no logueo automático, mostrar mail enviado
        setState("loginRequired");
      } catch (err) {
        setState("error");
        setErrorMsg(err instanceof Error ? err.message : "Error de conexión");
      }
    })();
  }, [router]);

  return (
    <div style={{ minHeight: "100vh", background: "#07070e", color: "#f0efff", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ maxWidth: "520px", textAlign: "center" }}>
        {state === "loading" && (
          <>
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", border: "3px solid #00B4D8", borderTopColor: "transparent", animation: "spin 0.8s linear infinite", margin: "0 auto 24px" }} />
            <p style={{ fontSize: "16px", color: "#94a3b8" }}>Confirmando tu pago…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </>
        )}

        {state === "loginRequired" && (
          <>
            <div style={{ display: "inline-flex", padding: "18px", borderRadius: "20px", background: "rgba(52, 211, 153, 0.12)", border: "1px solid rgba(52, 211, 153, 0.3)", marginBottom: "24px" }}>
              <Check size={36} color="#34d399" />
            </div>
            <h1 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 900, marginBottom: "16px", letterSpacing: "-0.02em" }}>
              ¡Pago confirmado! 🎉
            </h1>
            <p style={{ fontSize: "16px", color: "#94a3b8", lineHeight: 1.6, marginBottom: "32px" }}>
              Tu suscripción a <strong style={{ color: "white" }}>TRUST MIND Pro</strong> ya está activa. Te enviamos un link de acceso a <strong style={{ color: "#7dd3fc" }}>{email}</strong>.
            </p>
            <div style={{ padding: "24px", borderRadius: "16px", background: "rgba(0, 122, 191, 0.08)", border: "1px solid rgba(0, 122, 191, 0.25)", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "center", marginBottom: "12px" }}>
                <Mail size={20} color="#7dd3fc" />
                <p style={{ fontSize: "14px", fontWeight: 700, color: "white" }}>Revisa tu email</p>
              </div>
              <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.6 }}>
                Click el link mágico que te enviamos para entrar al panel. Si no llega en 2 min, revisa spam.
              </p>
            </div>
            <p style={{ fontSize: "12px", color: "#64748b" }}>
              ¿Problemas? Contacta soporte: <a href="https://wa.me/51931119176" style={{ color: "#7dd3fc", textDecoration: "underline" }}>WhatsApp +51 931 119 176</a>
            </p>
          </>
        )}

        {state === "ok" && (
          <>
            <Sparkles size={36} color="#fbbf24" />
            <p style={{ marginTop: "16px" }}>Entrando al panel...</p>
          </>
        )}

        {state === "error" && (
          <>
            <div style={{ display: "inline-flex", padding: "18px", borderRadius: "20px", background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", marginBottom: "24px" }}>
              <p style={{ fontSize: "32px" }}>⚠️</p>
            </div>
            <h1 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "12px" }}>Algo no salió bien</h1>
            <p style={{ fontSize: "14px", color: "#94a3b8", marginBottom: "24px" }}>{errorMsg}</p>
            <p style={{ fontSize: "13px", color: "#64748b" }}>
              Tu pago probablemente se procesó correctamente. Contacta soporte:{" "}
              <a href="https://wa.me/51931119176" style={{ color: "#7dd3fc", textDecoration: "underline" }}>WhatsApp +51 931 119 176</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
