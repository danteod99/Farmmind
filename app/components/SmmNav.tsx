"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { isAdmin } from "@/app/lib/admin";
import { usePathname, useRouter } from "next/navigation";

interface NavLink {
  href: string;
  label: string;
  active?: boolean;
  external?: boolean;
}

// Navegación principal (las 3 herramientas de edición van agrupadas en TOOLS).
const NAV_LINKS: NavLink[] = [
  { href: "/smm/services", label: "Servicios" },
  { href: "/smm/funds", label: "Recargar" },
  { href: "/cursos", label: "Mis Cursos" },
  { href: "/granjas", label: "Granjas" },
  { href: "/downloads", label: "Descargas" },
];

// Herramientas de edición — se muestran en un menú desplegable "Herramientas".
const TOOLS: NavLink[] = [
  { href: "/smm/editor", label: "Editor de cortos" },
  { href: "/smm/multiediting", label: "Multiediting" },
  { href: "/smm/multiclipping", label: "Multiclipping" },
];

const POST_LINKS: NavLink[] = [
  { href: "https://www.scalinglatam.site", label: "Scaling Latam", external: true },
];

interface SmmNavProps {
  balance: number;
  userAvatar?: string;
  userName?: string;
  userEmail?: string;
  links?: NavLink[]; // ignorado: la navegación es la lista canónica NAV_LINKS
}

export function SmmNav({ balance, userAvatar, userName, userEmail }: SmmNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  const isActive = (href: string, external?: boolean) =>
    !external && !!pathname && (pathname === href || pathname.startsWith(href + "/"));
  const toolsActive = TOOLS.some((t) => isActive(t.href));

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <>
      <style>{`
        .smm-nav-link:hover { color: #e2e8f0 !important; background: rgba(255,255,255,0.05) !important; }
        .smm-hamburger:hover { background: rgba(255,255,255,0.06) !important; }
        @media (max-width: 768px) {
          .smm-nav-desktop-links { display: none !important; }
          .smm-hamburger { display: flex !important; }
          .smm-nav-avatar { display: none !important; }
        }
        @media (min-width: 769px) {
          .smm-hamburger { display: none !important; }
          .smm-mobile-drawer { display: none !important; }
        }
        @keyframes drawer-in {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .smm-mobile-drawer { animation: drawer-in 0.18s ease; }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav aria-label="Navegación principal" style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(5,5,8,0.85)", backdropFilter: "blur(24px) saturate(1.2)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "0 clamp(12px, 3vw, 24px)", height: "56px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: "8px",
      }}>

        {/* Left: hamburger (mobile) + logo text */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          {/* Hamburger button — mobile only, left side */}
          <button
            className="smm-hamburger"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={mobileOpen}
            style={{
              width: "38px", height: "38px", borderRadius: "10px",
              background: mobileOpen ? "#007ABF20" : "transparent",
              border: `1px solid ${mobileOpen ? "#007ABF50" : "#2a2a42"}`,
              color: mobileOpen ? "#56B4E0" : "#94a3b8",
              cursor: "pointer", display: "none",
              alignItems: "center", justifyContent: "center",
              transition: "all 0.15s", flexShrink: 0,
            }}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Logo: pure text "TRUST" */}
          <Link href="/smm/services" style={{ textDecoration: "none", flexShrink: 0 }}>
            <span style={{
              fontFamily: "'Arial Black', 'Franklin Gothic Heavy', Impact, sans-serif",
              fontWeight: 900,
              fontSize: "20px",
              color: "#ffffff",
              letterSpacing: "3px",
              lineHeight: 1,
              textTransform: "uppercase",
            }}>
              TRUST
            </span>
          </Link>
        </div>

        {/* Center: desktop nav links */}
        <div className="smm-nav-desktop-links" style={{ display: "flex", gap: "4px", alignItems: "center" }}>
          {NAV_LINKS.map(({ href, label, external }) => {
            const active = isActive(href, external);
            return (
            <Link key={href} href={href}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              {...(active ? { "aria-current": "page" as const } : {})}
              className="smm-nav-link"
              style={{
                padding: "6px 13px", borderRadius: "10px", fontSize: "13px",
                fontWeight: active ? 700 : 500,
                color: active ? "#56B4E0" : "#ffffff",
                background: active ? "#007ABF15" : "transparent",
                border: `1px solid ${active ? "#007ABF30" : "transparent"}`,
                textDecoration: "none", transition: "all 0.15s", whiteSpace: "nowrap",
              }}>
              {label}
            </Link>
            );
          })}

          {/* Herramientas — menú desplegable con las 3 herramientas de edición */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setToolsOpen((v) => !v)}
              aria-haspopup="menu" aria-expanded={toolsOpen}
              className="smm-nav-link"
              style={{
                display: "flex", alignItems: "center", gap: "5px",
                padding: "6px 13px", borderRadius: "10px", fontSize: "13px",
                fontWeight: toolsActive ? 700 : 500,
                color: toolsActive ? "#56B4E0" : "#ffffff",
                background: toolsActive ? "#007ABF15" : "transparent",
                border: `1px solid ${toolsActive ? "#007ABF30" : "transparent"}`,
                cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
                fontFamily: "inherit",
              }}>
              Herramientas
              <ChevronDown size={14} style={{ transform: toolsOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
            </button>
            {toolsOpen && (
              <>
                <div onClick={() => setToolsOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                <div role="menu" style={{
                  position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 41, minWidth: "190px",
                  background: "rgba(10,10,18,0.98)", backdropFilter: "blur(20px)",
                  border: "1px solid #1e1e30", borderRadius: "12px", padding: "6px",
                  boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
                  display: "flex", flexDirection: "column", gap: "2px",
                }}>
                  {TOOLS.map(({ href, label }) => {
                    const active = isActive(href);
                    return (
                      <Link key={href} href={href} role="menuitem" onClick={() => setToolsOpen(false)}
                        className="smm-nav-link"
                        style={{
                          padding: "9px 12px", borderRadius: "8px", fontSize: "13.5px",
                          fontWeight: active ? 700 : 500,
                          color: active ? "#56B4E0" : "#e2e8f0",
                          background: active ? "#007ABF18" : "transparent",
                          textDecoration: "none", whiteSpace: "nowrap",
                        }}>
                        {label}
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {POST_LINKS.map(({ href, label, external }) => (
            <Link key={href} href={href}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="smm-nav-link"
              style={{
                padding: "6px 13px", borderRadius: "10px", fontSize: "13px", fontWeight: 500,
                color: "#ffffff", background: "transparent", border: "1px solid transparent",
                textDecoration: "none", transition: "all 0.15s", whiteSpace: "nowrap",
              }}>
              {label}
            </Link>
          ))}
        </div>

        {/* Right: balance + admin + avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <Link href="/smm/funds" style={{
            padding: "7px 12px", borderRadius: "10px",
            background: "#34d39912", border: "1px solid #34d39935",
            display: "flex", alignItems: "center", gap: "7px",
            textDecoration: "none", flexShrink: 0,
          }}>
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#34d399", boxShadow: "0 0 8px #34d399" }} />
            <span style={{ fontSize: "13px", color: "#34d399", fontWeight: 700 }}>${balance.toFixed(2)}</span>
          </Link>

          {isAdmin(userEmail) && (
            <Link href="/admin" style={{
              padding: "6px 10px", borderRadius: "8px",
              background: "#1a0a2e", border: "1px solid #3a1a5e",
              color: "#a78bfa", fontSize: "12px", fontWeight: 700,
              textDecoration: "none", flexShrink: 0,
            }}>⚙️ Admin</Link>
          )}

          <Link
            href="/profile"
            className="smm-nav-avatar"
            style={{
              width: "34px", height: "34px", borderRadius: "50%",
              overflow: "hidden", border: "2px solid #2a2a42",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "#1a1a2e", flexShrink: 0, textDecoration: "none",
            }}>
            {userAvatar
              ? <img src={userAvatar} alt={userName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            }
          </Link>
        </div>
      </nav>

      {/* ── MOBILE DRAWER ── */}
      {mobileOpen && (
        <div
          className="smm-mobile-drawer"
          role="menu"
          aria-label="Menú de navegación"
          style={{
            position: "fixed", top: "60px", left: 0, right: 0, zIndex: 49,
            background: "rgba(7,7,14,0.97)", backdropFilter: "blur(20px)",
            borderBottom: "1px solid #1e1e30",
            padding: "12px 16px 16px",
            display: "flex", flexDirection: "column", gap: "6px",
          }}>

          {/* Profile row in drawer */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 16px 12px", borderBottom: "1px solid #1e1e30", marginBottom: "4px" }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "50%", overflow: "hidden", border: "2px solid #2a2a42", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1a2e", flexShrink: 0 }}>
              {userAvatar
                ? <img src={userAvatar} alt={userName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              }
            </div>
            <div>
              {userName && <div style={{ fontSize: "14px", fontWeight: 600, color: "#e2e8f0" }}>{userName}</div>}
              {userEmail && <div style={{ fontSize: "12px", color: "#64748b" }}>{userEmail}</div>}
            </div>
          </div>

          {[...NAV_LINKS, ...POST_LINKS].map(({ href, label, external }) => {
            const active = isActive(href, external);
            return (
            <Link key={href} href={href}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              {...(active ? { "aria-current": "page" as const } : {})}
              role="menuitem"
              onClick={() => setMobileOpen(false)}
              style={{
                padding: "13px 16px", borderRadius: "12px", fontSize: "15px",
                fontWeight: active ? 700 : 500,
                color: active ? "#56B4E0" : "#ffffff",
                background: active ? "#007ABF18" : "#0d0d18",
                border: `1px solid ${active ? "#007ABF40" : "#1e1e30"}`,
                textDecoration: "none", display: "block", transition: "all 0.15s",
              }}>
              {label}
            </Link>
            );
          })}

          {/* Herramientas — sección agrupada */}
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#5a6480", textTransform: "uppercase", letterSpacing: "1px", padding: "12px 16px 4px" }}>
            Herramientas
          </div>
          {TOOLS.map(({ href, label }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href} role="menuitem" onClick={() => setMobileOpen(false)}
                style={{
                  padding: "13px 16px", borderRadius: "12px", fontSize: "15px",
                  fontWeight: active ? 700 : 500,
                  color: active ? "#56B4E0" : "#ffffff",
                  background: active ? "#007ABF18" : "#0d0d18",
                  border: `1px solid ${active ? "#007ABF40" : "#1e1e30"}`,
                  textDecoration: "none", display: "block", transition: "all 0.15s",
                }}>
                {label}
              </Link>
            );
          })}

          {isAdmin(userEmail) && (
            <Link href="/admin" onClick={() => setMobileOpen(false)} style={{ padding: "13px 16px", borderRadius: "12px", fontSize: "15px", fontWeight: 500, color: "#a78bfa", background: "#0d0d18", border: "1px solid #1e1e30", textDecoration: "none", display: "block" }}>
              ⚙️ Admin
            </Link>
          )}

          <button
            onClick={handleSignOut}
            style={{
              padding: "13px 16px", borderRadius: "12px", fontSize: "15px",
              fontWeight: 500, color: "#ef4444", background: "#0d0d18",
              border: "1px solid #1e1e30", cursor: "pointer",
              textAlign: "left", fontFamily: "inherit", marginTop: "4px",
            }}>
            ↩ Cerrar sesión
          </button>
        </div>
      )}

      {/* Backdrop to close drawer */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 48, background: "transparent" }}
        />
      )}
    </>
  );
}
