"use client";

import { useEffect, useState } from "react";
import { LogIn, User as UserIcon, Shield } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import { isAdmin } from "@/app/lib/admin";
import type { User } from "@supabase/supabase-js";

interface LoginButtonProps {
  variant?: "nav" | "primary";
  redirectTo?: string;
}

export function LoginButton({ variant = "nav", redirectTo = "/smm/services" }: LoginButtonProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}` },
    });
  };

  if (!mounted) return null;

  if (user) {
    const initial = (user.user_metadata?.full_name || user.email || "U").charAt(0).toUpperCase();
    const userIsAdmin = isAdmin(user.email);
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
        {userIsAdmin && (
          <Link
            href="/admin"
            style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "8px 12px", borderRadius: "11px",
              background: "rgba(168, 85, 247, 0.12)",
              border: "1px solid rgba(168, 85, 247, 0.4)",
              color: "#c4b5fd", fontSize: "13px", fontWeight: 700,
              textDecoration: "none", transition: "all 0.2s",
            }}
            title="Panel admin"
          >
            <Shield size={13} />
            Admin
          </Link>
        )}
        <Link
          href="/smm/services"
          style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            padding: "8px 14px", borderRadius: "12px",
            background: "rgba(0, 122, 191, 0.12)",
            border: "1px solid rgba(0, 180, 216, 0.35)",
            color: "white", fontSize: "13px", fontWeight: 700,
            textDecoration: "none", transition: "all 0.2s",
          }}
        >
          <div style={{
            width: "22px", height: "22px", borderRadius: "50%",
            background: "linear-gradient(135deg, #007ABF, #00B4D8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "11px", fontWeight: 800,
          }}>
            {initial}
          </div>
          Mi panel
        </Link>
      </div>
    );
  }

  if (variant === "primary") {
    return (
      <button
        onClick={handleLogin}
        disabled={loading}
        style={{
          padding: "16px 28px", borderRadius: "14px",
          background: "linear-gradient(135deg, #007ABF, #00B4D8)",
          color: "white", fontSize: "15px", fontWeight: 700,
          border: "none", cursor: loading ? "wait" : "pointer",
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px",
          opacity: loading ? 0.7 : 1,
          boxShadow: "0 4px 20px rgba(0, 180, 216, 0.3)",
          transition: "all 0.2s",
        }}
      >
        <LogIn size={16} />
        {loading ? "Conectando..." : "Iniciar sesión"}
      </button>
    );
  }

  return (
    <button
      onClick={handleLogin}
      disabled={loading}
      style={{
        padding: "9px 16px", borderRadius: "11px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.12)",
        color: "white", fontSize: "13px", fontWeight: 700,
        cursor: loading ? "wait" : "pointer",
        display: "inline-flex", alignItems: "center", gap: "6px",
        opacity: loading ? 0.6 : 1,
        transition: "all 0.2s",
      }}
    >
      <LogIn size={14} />
      {loading ? "..." : "Iniciar sesión"}
    </button>
  );
}
