"use client";

import { useEffect, useRef, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Password reset page for TrustFarm Desktop accounts. Lives under trustmind.online
// (already covered by the https://*.trustmind.online/** entry in Supabase Auth's
// Redirect URLs, no extra allow-list entry needed) so app_settings.password_reset_url
// points here. Ported from trustfarm-backend/web/auth-reset/index.html: same implicit
// recovery flow, same PASSWORD_RECOVERY handling, same "link expired -> request a new
// one" fallback. This project's own auth (app/auth/desktop) uses the same Supabase
// project; this page only needs updateUser/resetPasswordForEmail, no extra tables.

const MIN_PASSWORD_LENGTH = 8;

type Phase = "loading" | "reset" | "done" | "request";

function linkError(): string | null {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  return (
    hash.get("error_description") ||
    query.get("error_description") ||
    hash.get("error") ||
    query.get("error")
  );
}

// NEXT_PUBLIC_* is inlined at build time: reading it at module scope is synchronous
// and stable across renders, so the "misconfigured" phase can be the initial state
// instead of a setState call inside the effect (avoids cascading renders from effects).
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const MISCONFIGURED = !SUPABASE_URL || !SUPABASE_ANON_KEY;

export default function TrustFarmAuthResetPage() {
  const [phase, setPhase] = useState<Phase>(MISCONFIGURED ? "request" : "loading");
  const [account, setAccount] = useState("");
  const [requestReason, setRequestReason] = useState(
    MISCONFIGURED ? "La pagina no esta configurada (faltan las variables de Supabase)." : ""
  );
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [resetError, setResetError] = useState("");
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [requestError, setRequestError] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);

  const clientRef = useRef<SupabaseClient | null>(null);
  const recoveredRef = useRef(false);

  useEffect(() => {
    if (MISCONFIGURED) return;

    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { flowType: "implicit", detectSessionInUrl: true, persistSession: false },
    });
    clientRef.current = client;

    const enterReset = (sessionEmail: string) => {
      recoveredRef.current = true;
      setAccount(sessionEmail);
      setPhase("reset");
    };
    const enterRequest = (reason: string) => {
      setRequestReason(reason);
      setPhase("request");
    };

    const { data: subscription } = client.auth.onAuthStateChange((event, session) => {
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session && !recoveredRef.current) {
        enterReset(session.user?.email || "");
      }
    });

    const detected = linkError();
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
    if (detected) {
      enterRequest(detected.replace(/\+/g, " "));
    } else {
      // Fallback for browsers where the hash was consumed before the listener ran.
      fallbackTimer = setTimeout(async () => {
        if (recoveredRef.current) return;
        const { data } = await client.auth.getSession();
        if (data.session) enterReset(data.session.user?.email || "");
        else enterRequest("Abre el enlace completo desde el correo que recibiste.");
      }, 1500);
    }

    return () => {
      subscription.subscription.unsubscribe();
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, []);

  const handleReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setResetError("");
    if (password.length < MIN_PASSWORD_LENGTH) {
      setResetError(`La contrasena debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirm) {
      setResetError("Las contrasenas no coinciden.");
      return;
    }
    const client = clientRef.current;
    if (!client) return;
    setSaving(true);
    const { error } = await client.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      setResetError(error.message);
      return;
    }
    await client.auth.signOut();
    window.history.replaceState(null, "", window.location.pathname);
    setPhase("done");
  };

  const handleRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setRequestError("");
    const client = clientRef.current;
    if (!client) return;
    setSendingRequest(true);
    const redirectTo = window.location.origin + window.location.pathname;
    const { error } = await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
    setSendingRequest(false);
    if (error) {
      setRequestError(error.message);
      return;
    }
    setRequestSent(true);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#07070e", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui", padding: 16 }}>
      <div style={{ background: "#12121e", border: "1px solid #2a2a42", borderRadius: 20, padding: 40, maxWidth: 420, width: "100%" }}>
        {phase === "loading" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", border: "3px solid #007ABF", borderTopColor: "transparent", margin: "0 auto 20px", animation: "spin 1s linear infinite" }} />
            <p style={{ color: "white", fontSize: 16, fontWeight: 600 }}>Verificando el enlace...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {phase === "reset" && (
          <>
            <h1 style={{ color: "white", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Crea tu nueva contrasena</h1>
            <p style={{ color: "#5a6480", fontSize: 13, marginBottom: 20 }}>
              Cuenta: <strong style={{ color: "#8b95b0" }}>{account}</strong>
            </p>
            <form onSubmit={handleReset}>
              <label style={{ display: "block", color: "#8b95b0", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Nueva contrasena</label>
              <input
                type="password" minLength={MIN_PASSWORD_LENGTH} required autoComplete="new-password"
                value={password} onChange={e => setPassword(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: "1px solid #2a2a42", background: "#0a0a14", color: "white", fontSize: 14 }}
              />
              <label style={{ display: "block", color: "#8b95b0", fontSize: 13, fontWeight: 600, margin: "16px 0 6px" }}>Repite la contrasena</label>
              <input
                type="password" minLength={MIN_PASSWORD_LENGTH} required autoComplete="new-password"
                value={confirm} onChange={e => setConfirm(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: "1px solid #2a2a42", background: "#0a0a14", color: "white", fontSize: 14 }}
              />
              {resetError && (
                <p style={{ color: "#f87171", fontSize: 13, marginTop: 12 }}>{resetError}</p>
              )}
              <button type="submit" disabled={saving}
                style={{ marginTop: 20, width: "100%", background: "#007ABF", color: "white", border: "none", borderRadius: 10, padding: "12px 32px", fontSize: 14, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1 }}>
                {saving ? "Guardando..." : "Guardar contrasena"}
              </button>
            </form>
          </>
        )}

        {phase === "done" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#34d39920", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
            </div>
            <h1 style={{ color: "white", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Listo</h1>
            <p style={{ color: "#5a6480", fontSize: 14 }}>
              Tu contrasena quedo guardada. Vuelve a TrustFarm Desktop e inicia sesion con tu correo y la contrasena nueva.
            </p>
          </div>
        )}

        {phase === "request" && (
          <>
            <h1 style={{ color: "white", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>El enlace no es valido o ya vencio</h1>
            {requestReason && <p style={{ color: "#5a6480", fontSize: 13, marginBottom: 16 }}>{requestReason}</p>}
            {!requestSent ? (
              <>
                <p style={{ color: "#8b95b0", fontSize: 13, marginBottom: 12 }}>Pide uno nuevo con el correo exacto de tu cuenta:</p>
                <form onSubmit={handleRequest}>
                  <label style={{ display: "block", color: "#8b95b0", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Correo</label>
                  <input
                    type="email" required autoComplete="email"
                    value={email} onChange={e => setEmail(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: "1px solid #2a2a42", background: "#0a0a14", color: "white", fontSize: 14 }}
                  />
                  {requestError && <p style={{ color: "#f87171", fontSize: 13, marginTop: 12 }}>{requestError}</p>}
                  <button type="submit" disabled={sendingRequest}
                    style={{ marginTop: 20, width: "100%", background: "#007ABF", color: "white", border: "none", borderRadius: 10, padding: "12px 32px", fontSize: 14, fontWeight: 700, cursor: sendingRequest ? "default" : "pointer", opacity: sendingRequest ? 0.6 : 1 }}>
                    {sendingRequest ? "Enviando..." : "Enviarme un enlace nuevo"}
                  </button>
                </form>
              </>
            ) : (
              <p style={{ color: "#34d399", fontSize: 13 }}>
                Si el correo existe, recibiras un enlace en unos minutos. Revisa tambien la carpeta de spam.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
