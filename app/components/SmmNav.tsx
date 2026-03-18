"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useRouter } from "next/navigation";

interface NavLink {
  href: string;
  label: string;
  active?: boolean;
  external?: boolean;
}

interface SmmNavProps {
  balance: number;
  userAvatar?: string;
  userName?: string;
  userEmail?: string;
  links: NavLink[];
}

export function SmmNav({ balance, userAvatar, userName, userEmail, links }: SmmNavProps) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <>
      <style>{`
        .smm-nav-link:hover { color: #88D0F0 !important; background: #007ABF15 !important; }
        .smm-hamburger:hover { background: #1a1a2e !important; }
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
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(7,7,14,0.92)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid #1e1e30",
        padding: "0 16px", height: "60px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: "8px",
      }}>

        {/* Left: hamburger (mobile) + logo text */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          {/* Hamburger button — mobile only, left side */}
          <button
            className="smm-hamburger"
            onClick={() => setMobileOpen(!mobileOpen)}
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
        <div className="smm-nav-desktop-links" style={{ display: "flex", gap: "4px" }}>
          {links.map(({ href, label, active, external }) => (
            <Link key={href} href={href}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="smm-nav-link"
              style={{
                padding: "6px 13px", borderRadius: "10px", fontSize: "13px",
                fontWeight: active ? 700 : 500,
                color: active ? "#56B4E0" : "#5a6480",
                background: active ? "#007ABF15" : "transparent",
                border: `1px solid ${active ? "#007ABF30" : "transparent"}`,
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

          {userEmail === "danteod99@gmail.com" && (
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

          {links.map(({ href, label, active, external }) => (
            <Link key={href} href={href}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              onClick={() => setMobileOpen(false)}
              style={{
                padding: "13px 16px", borderRadius: "12px", fontSize: "15px",
                fontWeight: active ? 700 : 500,
                color: active ? "#56B4E0" : "#94a3b8",
                background: active ? "#007ABF18" : "#0d0d18",
                border: `1px solid ${active ? "#007ABF40" : "#1e1e30"}`,
                textDecoration: "none", display: "block", transition: "all 0.15s",
              }}>
              {label}
            </Link>
          ))}

          {userEmail === "danteod99@gmail.com" && (
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
