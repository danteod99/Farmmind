"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePanel } from "../context";
import { ChildPanelNav } from "@/app/components/ChildPanelNav";
import { supabase } from "@/app/lib/supabase";
import Link from "next/link";
import { Star, CheckCircle, ArrowRight, Package } from "lucide-react";

export default function ChildPanelPlans() {
  const { reseller, loading: panelLoading, slug, brandColor, panelName, logoUrl } = usePanel();
  const router = useRouter();

  const [user, setUser] = useState<{ id: string; name?: string; avatar?: string } | null>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { router.replace(`/panel/${slug}/auth`); return; }
      setUser({ id: u.id, name: u.user_metadata?.full_name || u.email?.split("@")[0], avatar: u.user_metadata?.avatar_url });

      const balRes = await fetch(`/api/panel/${slug}/balance`);
      if (balRes.ok) { const d = await balRes.json(); setBalance(d.balance || 0); }
      setLoading(false);
    })();
  }, [router, slug]);

  const bc = brandColor;
  const plans = reseller?.plans || [];

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
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .plan-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px #00000050 !important; }
        @media (max-width: 768px) { .plans-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      <ChildPanelNav
        slug={slug} panelName={panelName} logoUrl={logoUrl} brandColor={bc}
        balance={balance} userName={user?.name} userAvatar={user?.avatar}
        isAuthenticated={true} activeRoute="plans"
      />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "white", marginBottom: 8 }}>
            Planes de suscripción
          </h1>
          <p style={{ fontSize: 14, color: "#5a6480" }}>
            Elige un plan mensual y obtén servicios automáticos cada mes
          </p>
        </div>

        {plans.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px" }}>
            <Package size={48} color="#2a2a42" style={{ marginBottom: 16 }} />
            <p style={{ color: "#5a6480", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              No hay planes disponibles aún
            </p>
            <p style={{ color: "#3a3a5c", fontSize: 13, marginBottom: 24 }}>
              El administrador del panel aún no ha creado planes de suscripción.
            </p>
            <Link
              href={`/panel/${slug}/services`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 24px",
                borderRadius: 10,
                background: bc,
                color: "white",
                fontSize: 14,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Ver servicios individuales <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div
            className="plans-grid"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(plans.length, 3)}, 1fr)`,
              gap: 16,
            }}
          >
            {plans.map((plan, i) => (
              <div
                key={plan.id}
                className="plan-card"
                style={{
                  background: i === 0 ? `${bc}08` : "#0d0d18",
                  border: `1px solid ${i === 0 ? `${bc}40` : "#1e1e30"}`,
                  borderRadius: 18,
                  padding: 28,
                  position: "relative",
                  overflow: "hidden",
                  transition: "all 0.2s",
                }}
              >
                {i === 0 && (
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: 3,
                    background: `linear-gradient(90deg, ${bc}, #a855f7)`,
                  }} />
                )}

                {i === 0 && (
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "3px 10px", borderRadius: 20,
                    background: `${bc}20`, border: `1px solid ${bc}40`,
                    fontSize: 10, fontWeight: 700, color: bc,
                    textTransform: "uppercase", marginBottom: 14,
                  }}>
                    <Star size={10} /> Más popular
                  </div>
                )}

                <h3 style={{ fontSize: 20, fontWeight: 800, color: "white", marginBottom: 6 }}>
                  {plan.plan_name}
                </h3>
                <p style={{ fontSize: 13, color: "#5a6480", marginBottom: 20, lineHeight: 1.6 }}>
                  {plan.description}
                </p>

                <div style={{ marginBottom: 24 }}>
                  <span style={{ fontSize: 40, fontWeight: 800, color: bc }}>
                    ${plan.price_usd}
                  </span>
                  <span style={{ fontSize: 14, color: "#5a6480" }}>
                    {" "}/ {plan.period_days} días
                  </span>
                </div>

                {/* Included services */}
                {plan.services_included && plan.services_included.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                    {plan.services_included.map((s: { service_name: string; quantity: number }, j: number) => (
                      <div key={j} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <CheckCircle size={14} color={bc} />
                        <span style={{ fontSize: 13, color: "#e2e8f0" }}>
                          <strong>{s.quantity.toLocaleString()}</strong>{" "}
                          <span style={{ color: "#94a3b8" }}>{s.service_name}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <Link
                  href={`/panel/${slug}/funds`}
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "12px 20px",
                    borderRadius: 10,
                    background: i === 0 ? bc : "#1a1a2e",
                    border: `1px solid ${i === 0 ? bc : "#2a2a42"}`,
                    color: i === 0 ? "white" : "#94a3b8",
                    fontSize: 14,
                    fontWeight: 700,
                    textDecoration: "none",
                    transition: "all 0.15s",
                  }}
                >
                  Suscribirme
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
