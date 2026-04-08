"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

export default function DesktopAuthPage() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (accessToken && refreshToken) {
      const code = btoa(JSON.stringify({ a: accessToken, r: refreshToken }));
      setToken(code);
    } else {
      setError("No se encontraron los tokens de autenticacion.");
    }
  }, []);

  const copyToken = () => {
    navigator.clipboard.writeText(token);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#07070e", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui" }}>
      <div style={{ background: "#12121e", border: "1px solid #2a2a42", borderRadius: 20, padding: 40, maxWidth: 480, textAlign: "center" }}>
        {error ? (
          <>
            <p style={{ color: "#f87171", fontSize: 16, marginBottom: 12 }}>{error}</p>
            <p style={{ color: "#5a6480", fontSize: 13 }}>Intenta de nuevo desde TrustFarm.</p>
          </>
        ) : token ? (
          <>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#34d39920", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
            </div>
            <h1 style={{ color: "white", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Login exitoso</h1>
            <p style={{ color: "#5a6480", fontSize: 14, marginBottom: 20 }}>
              Copia este codigo y pegalo en TrustFarm Desktop:
            </p>
            <div style={{ background: "#0a0a14", border: "1px solid #1e1e30", borderRadius: 12, padding: 16, marginBottom: 16, wordBreak: "break-all" }}>
              <p style={{ color: "#56B4E0", fontSize: 11, fontFamily: "monospace", lineHeight: 1.5, maxHeight: 80, overflow: "hidden" }}>
                {token.slice(0, 60)}...
              </p>
            </div>
            <button onClick={copyToken}
              style={{ background: "#007ABF", color: "white", border: "none", borderRadius: 10, padding: "12px 32px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              Copiar codigo
            </button>
            <p style={{ color: "#3d4a5c", fontSize: 12, marginTop: 16 }}>
              Puedes cerrar esta ventana despues de copiar.
            </p>
          </>
        ) : (
          <p style={{ color: "#5a6480" }}>Procesando autenticacion...</p>
        )}
      </div>
    </div>
  );
}
