"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePanel } from "../context";
import { ChildPanelNav } from "@/app/components/ChildPanelNav";
import { supabase } from "@/app/lib/supabase";
import { User, Mail, DollarSign, ShoppingCart, Clock, LogOut } from "lucide-react";

export default function ChildPanelProfile() {
  const { reseller, loading: panelLoading, slug, brandColor, panelName, logoUrl } = usePanel();
  const router = useRouter();

  const [user, setUser] = useState<{
    id: string;
    email: string;
    name: string;
    avatar: string;
    created_at: string;
  } | null>(null);
  const [balance, setBalance] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { router.replace(`/panel/${slug}/auth`); return; }

      setUser({
        id: u.id,
        email: u.email || "",
        name: u.user_metadata?.full_name || u.email?.split("@")[0] || "",
        avatar: u.user_metadata?.avatar_url || "",
        created_at: u.created_at || "",
      });

      const [balRes, ordRes] = await Promise.all([
        fetch(`/api/panel/${slug}/balance`),
        fetch(`/api/panel/${slug}/orders`),
      ]);

      if (balRes.ok) { const d = await balRes.json(); setBalance(d.balance || 0); }
      if (ordRes.ok) { const d = await ordRes.json(); setOrderCount((d.orders || []).length); }

      setLoading(false);
    })();
  }, [router, slug]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace(`/panel/${slug}`);
  };

  const bc = brandColor;

  if (panelLoading || loading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#07070e" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${bc}30`, borderTopColor: bc, animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      <ChildPanelNav
        slug={slug} panelName={panelName} logoUrl={logoUrl} brandColor={bc}
        balance={balance} userName={user?.name} userAvatar={user?.avatar}
        isAuthenticated={true} activeRoute="profile"
      />

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "28px 20px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "white", marginBottom: 24 }}>Mi perfil</h1>

        {/* User info card */}
        <div style={{ background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: 16, padding: 24, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} loading="lazy" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "2px solid #2a2a42" }} />
            ) : (
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: `${bc}18`, border: `1px solid ${bc}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <User size={24} color={bc} />
              </div>
            )}
            <div>
              <p style={{ fontSize: 18, fontWeight: 800, color: "white", marginBottom: 2 }}>{user?.name}</p>
              <p style={{ fontSize: 13, color: "#5a6480", display: "flex", alignItems: "center", gap: 6 }}>
                <Mail size={12} /> {user?.email}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[
              { icon: <DollarSign size={16} color="#34d399" />, label: "Balance", value: `$${balance.toFixed(2)}`, color: "#34d399" },
              { icon: <ShoppingCart size={16} color={bc} />, label: "Pedidos", value: String(orderCount), color: bc },
              { icon: <Clock size={16} color="#fbbf24" />, label: "Miembro desde", value: user?.created_at ? new Date(user.created_at).toLocaleDateString("es", { month: "short", year: "numeric" }) : "—", color: "#fbbf24" },
            ].map((s) => (
              <div key={s.label} style={{ background: "#07070e", border: "1px solid #1e1e30", borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>{s.icon}</div>
                <p style={{ fontSize: 18, fontWeight: 800, color: s.color, marginBottom: 2 }}>{s.value}</p>
                <p style={{ fontSize: 11, color: "#5a6480" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={signOut}
          style={{
            width: "100%",
            padding: "12px 20px",
            borderRadius: 12,
            background: "#f8717112",
            border: "1px solid #f8717130",
            color: "#f87171",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <LogOut size={16} /> Cerrar sesión
        </button>
      </div>
    </>
  );
}
