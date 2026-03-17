"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut, Menu, X, User } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useRouter } from "next/navigation";

interface ChildPanelNavProps {
  slug: string;
  panelName: string;
  logoUrl: string;
  brandColor: string;
  balance: number;
  userName?: string;
  userAvatar?: string;
  isAuthenticated: boolean;
  activeRoute?: string;
}

const NAV_ITEMS = [
  { path: "services", label: "Servicios" },
  { path: "orders", label: "Pedidos" },
  { path: "funds", label: "Recargar" },
  { path: "plans", label: "Planes" },
];

export function ChildPanelNav({
  slug,
  panelName,
  logoUrl,
  brandColor,
  balance,
  userName,
  userAvatar,
  isAuthenticated,
  activeRoute,
}: ChildPanelNavProps) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace(`/panel/${slug}`);
  };

  const bc = brandColor || "#007ABF";

  return (
    <>
      <style>{`
        .cpn-link:hover { color: ${bc} !important; background: ${bc}15 !important; }
        @media (max-width: 768px) { .cpn-desktop-links { display: none !important; } .cpn-mobile-btn { display: flex !important; } }
      `}</style>

      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(7,7,14,0.92)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid #1e1e30",
          padding: "0 20px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Left: Logo + Name */}
        <Link
          href={`/panel/${slug}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
          }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={panelName}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: `${bc}25`,
                border: `1px solid ${bc}40`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 800,
                color: bc,
              }}
            >
              {panelName.charAt(0).toUpperCase()}
            </div>
          )}
          <span
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: "#f0efff",
              letterSpacing: "-0.3px",
            }}
          >
            {panelName}
          </span>
        </Link>

        {/* Center: Nav Links (desktop) */}
        {isAuthenticated && (
          <div
            className="cpn-desktop-links"
            style={{ display: "flex", gap: 4 }}
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activeRoute === item.path;
              return (
                <Link
                  key={item.path}
                  href={`/panel/${slug}/${item.path}`}
                  className="cpn-link"
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? bc : "#94a3b8",
                    background: isActive ? `${bc}18` : "transparent",
                    border: isActive
                      ? `1px solid ${bc}30`
                      : "1px solid transparent",
                    textDecoration: "none",
                    transition: "all 0.15s",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}

        {/* Right: Balance + Avatar + Logout */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isAuthenticated ? (
            <>
              {/* Balance */}
              <Link
                href={`/panel/${slug}/funds`}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  background: "#34d39912",
                  border: "1px solid #34d39935",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  textDecoration: "none",
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#34d399",
                    boxShadow: "0 0 6px #34d399",
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    color: "#34d399",
                    fontWeight: 700,
                  }}
                >
                  ${balance.toFixed(2)}
                </span>
              </Link>

              {/* Profile */}
              <Link
                href={`/panel/${slug}/profile`}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "2px solid #2a2a42",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#1a1a2e",
                  flexShrink: 0,
                  textDecoration: "none",
                }}
              >
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    alt={userName || ""}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <User size={14} color="#64748b" />
                )}
              </Link>

              {/* Logout */}
              <button
                onClick={signOut}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: "#1a1a2e",
                  border: "1px solid #1e1e30",
                  color: "#5a6480",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <LogOut size={14} />
              </button>

              {/* Mobile menu btn */}
              <button
                className="cpn-mobile-btn"
                onClick={() => setMobileOpen(!mobileOpen)}
                style={{
                  display: "none",
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: "#1a1a2e",
                  border: "1px solid #1e1e30",
                  color: "#94a3b8",
                  cursor: "pointer",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {mobileOpen ? <X size={16} /> : <Menu size={16} />}
              </button>
            </>
          ) : (
            <Link
              href={`/panel/${slug}/auth`}
              style={{
                padding: "8px 20px",
                borderRadius: 10,
                background: bc,
                color: "white",
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: `0 0 12px ${bc}40`,
              }}
            >
              Iniciar sesión
            </Link>
          )}
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileOpen && isAuthenticated && (
        <div
          style={{
            position: "fixed",
            top: 56,
            left: 0,
            right: 0,
            background: "#0d0d18",
            borderBottom: "1px solid #1e1e30",
            padding: "12px 20px",
            zIndex: 49,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              href={`/panel/${slug}/${item.path}`}
              onClick={() => setMobileOpen(false)}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                color:
                  activeRoute === item.path ? bc : "#94a3b8",
                background:
                  activeRoute === item.path ? `${bc}18` : "transparent",
                textDecoration: "none",
              }}
            >
              {item.label}
            </Link>
          ))}
          <button
            onClick={signOut}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              color: "#f87171",
              background: "transparent",
              border: "none",
              textAlign: "left",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </>
  );
}
