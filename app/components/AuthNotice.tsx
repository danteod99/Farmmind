"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, X } from "lucide-react";

// Muestra los errores que /auth/callback y /smm/layout devuelven por query
// (?error=... y ?required=1). Antes llegaban a la URL y no se veían.
function AuthNoticeInner() {
  const params = useSearchParams();
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const err = params.get("error");
    const required = params.get("required");
    if (err) {
      const friendly = /pkce|code verifier/i.test(err)
        ? "No pudimos completar el inicio de sesión con Google. Vuelve a intentarlo desde este mismo navegador (sin modo incógnito ni bloqueadores de cookies)."
        : `No pudimos iniciar sesión: ${err}`;
      setMsg(friendly);
      console.error("[Auth] callback error:", err);
    } else if (required === "1") {
      setMsg("Inicia sesión o crea tu cuenta gratis para continuar.");
    }
  }, [params]);

  if (!msg) return null;

  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        left: "50%",
        bottom: "24px",
        transform: "translateX(-50%)",
        zIndex: 1000,
        maxWidth: "min(92vw, 560px)",
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        padding: "14px 40px 14px 16px",
        borderRadius: "14px",
        background: "#0b1220",
        border: "1px solid rgba(251, 191, 36, 0.5)",
        color: "#fde68a",
        fontSize: "14px",
        lineHeight: 1.5,
        boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
      <span>{msg}</span>
      <button
        onClick={() => setMsg(null)}
        aria-label="Cerrar"
        style={{ position: "absolute", right: "10px", top: "10px", background: "transparent", border: "none", color: "#fde68a", cursor: "pointer" }}
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function AuthNotice() {
  return (
    <Suspense fallback={null}>
      <AuthNoticeInner />
    </Suspense>
  );
}
