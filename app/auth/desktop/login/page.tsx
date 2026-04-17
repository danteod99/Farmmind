"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function DesktopLoginPage() {
  const [status, setStatus] = useState("Redirecting to Google...");

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    );

    supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/desktop`,
      },
    }).then(({ error }) => {
      if (error) {
        setStatus("Error: " + error.message);
      }
    });
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#07070e", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui" }}>
      <div style={{ background: "#12121e", border: "1px solid #2a2a42", borderRadius: 20, padding: 40, maxWidth: 400, textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", border: "3px solid #007ABF", borderTopColor: "transparent", margin: "0 auto 20px", animation: "spin 1s linear infinite" }} />
        <p style={{ color: "white", fontSize: 16, fontWeight: 600 }}>{status}</p>
        <p style={{ color: "#5a6480", fontSize: 13, marginTop: 12 }}>You will be redirected to sign in with Google.</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
