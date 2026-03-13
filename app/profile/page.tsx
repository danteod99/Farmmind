"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import {
  ArrowLeft, LogOut, Camera, Check, User,
  Lock, Eye, EyeOff, Key, Copy, ExternalLink,
  Globe, ChevronRight, AlertCircle,
} from "lucide-react";
import { FarmMindLogo } from "@/app/components/FarmMindLogo";

// ── Types ──────────────────────────────────────────────────────────────────

type Tab = "perfil" | "contrasena" | "childpanel";

interface ResellerInfo {
  id: string;
  api_key: string;
  company_name: string;
  custom_domain: string;
  balance: number;
  is_active: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "perfil",     label: "Mi perfil",    icon: "👤" },
  { id: "contrasena", label: "Contraseña",   icon: "🔒" },
  { id: "childpanel", label: "Child Panel",  icon: "🔗" },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading]             = useState(true);
  const [activeTab, setActiveTab]         = useState<Tab>("perfil");

  // ── Profile ──────────────────────────────────────────────────────────
  const [saving, setSaving]               = useState(false);
  const [uploading, setUploading]         = useState(false);
  const [profileSaved, setProfileSaved]   = useState(false);
  const [profileError, setProfileError]   = useState<string | null>(null);
  const [userId, setUserId]               = useState("");
  const [email, setEmail]                 = useState("");
  const [displayName, setDisplayName]     = useState("");
  const [avatarUrl, setAvatarUrl]         = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [isOAuth, setIsOAuth]             = useState(false);

  // ── Password ─────────────────────────────────────────────────────────
  const [newPass, setNewPass]             = useState("");
  const [confirmPass, setConfirmPass]     = useState("");
  const [showNew, setShowNew]             = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [passSaving, setPassSaving]       = useState(false);
  const [passMsg, setPassMsg]             = useState<{ text: string; ok: boolean } | null>(null);

  // ── Reseller ─────────────────────────────────────────────────────────
  const [reseller, setReseller]           = useState<ResellerInfo | null>(null);
  const [resellerChecked, setResellerChecked] = useState(false);
  const [copiedKey, setCopiedKey]         = useState(false);

  // ── Load profile + reseller ───────────────────────────────────────────

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }

      setUserId(user.id);
      setEmail(user.email || "");
      setDisplayName(user.user_metadata?.full_name || user.email?.split("@")[0] || "");
      setAvatarUrl(user.user_metadata?.avatar_url || "");
      setAvatarPreview(user.user_metadata?.avatar_url || "");

      // Check if signed in via OAuth (Google) — can't change password directly
      const provider = user.app_metadata?.provider;
      setIsOAuth(provider === "google" || provider === "github");

      // Check reseller
      const { data: res } = await supabase
        .from("smm_resellers")
        .select("id, api_key, company_name, custom_domain, balance, is_active")
        .eq("user_id", user.id)
        .single();
      setReseller(res ?? null);
      setResellerChecked(true);

      setLoading(false);
    })();
  }, [router]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Avatar upload ─────────────────────────────────────────────────────

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setProfileError("La imagen no puede superar 2 MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setUploading(true);
    setProfileError(null);
    try {
      const ext = file.name.split(".").pop();
      const path = `avatars/${userId}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(urlData.publicUrl + "?t=" + Date.now());
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : "Error al subir la imagen");
    } finally {
      setUploading(false);
    }
  };

  // ── Save profile ──────────────────────────────────────────────────────

  const handleSaveProfile = async () => {
    if (!displayName.trim()) { setProfileError("El nombre no puede estar vacío"); return; }
    setSaving(true);
    setProfileError(null);
    try {
      const { error: updErr } = await supabase.auth.updateUser({ data: { full_name: displayName.trim(), avatar_url: avatarUrl } });
      if (updErr) throw updErr;
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  // ── Save password ─────────────────────────────────────────────────────

  const handleSavePassword = async () => {
    setPassMsg(null);
    if (newPass.length < 8) { setPassMsg({ text: "La contraseña debe tener al menos 8 caracteres", ok: false }); return; }
    if (newPass !== confirmPass) { setPassMsg({ text: "Las contraseñas no coinciden", ok: false }); return; }
    setPassSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) throw error;
      setPassMsg({ text: "✓ Contraseña actualizada correctamente", ok: true });
      setNewPass(""); setConfirmPass("");
    } catch (err: unknown) {
      setPassMsg({ text: err instanceof Error ? err.message : "Error al cambiar contraseña", ok: false });
    } finally {
      setPassSaving(false);
    }
  };

  const copyKey = () => {
    if (!reseller) return;
    navigator.clipboard.writeText(reseller.api_key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // ── Loading ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ height: "100vh", background: "#07070e", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "50%", border: "3px solid #007ABF30", borderTopColor: "#56B4E0", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: "#07070e", color: "white", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .avatar-wrap:hover .avatar-overlay { opacity: 1 !important; }
        .save-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .save-btn:active { transform: translateY(0); }
        .tab-btn:hover { border-color: #007ABF50 !important; color: #56B4E0 !important; }
        .pass-input:focus { border-color: #007ABF !important; outline: none; }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, borderBottom: "1px solid #0d1117", background: "rgba(7,7,14,0.95)", backdropFilter: "blur(12px)", padding: "0 24px", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link href="/smm/services" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
            <FarmMindLogo size={28} />
          </Link>
          <div style={{ width: "1px", height: "22px", background: "#1e1e30" }} />
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#88D0F0" }}>Mi Perfil</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link href="/smm/services" style={{ padding: "6px 14px", borderRadius: "8px", fontSize: "13px", color: "#5a6480", background: "transparent", border: "1px solid transparent", textDecoration: "none", display: "flex", alignItems: "center", gap: "6px" }}>
            <ArrowLeft size={13} /> Dashboard
          </Link>
          <button onClick={async () => { await supabase.auth.signOut(); router.push("/"); }}
            style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#1a1a2e", border: "1px solid #1e1e30", color: "#5a6480", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <LogOut size={14} />
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div style={{ position: "relative", overflow: "hidden", background: "linear-gradient(160deg, #000C18 0%, #001530 40%, #07070e 100%)", borderBottom: "1px solid #002860", padding: "40px 28px 36px" }}>
        <div style={{ position: "absolute", top: "-80px", right: "10%", width: "300px", height: "300px", borderRadius: "50%", background: "radial-gradient(circle, #007ABF30, transparent 70%)", filter: "blur(50px)", pointerEvents: "none" }} />
        <div style={{ maxWidth: "640px", margin: "0 auto", position: "relative", zIndex: 1 }}>
          {/* Avatar + name */}
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", overflow: "hidden", border: "2px solid #007ABF40", flexShrink: 0 }}>
              {avatarPreview ? (
                <img src={avatarPreview} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <User size={24} color="#3a3a5c" />
                </div>
              )}
            </div>
            <div>
              <h1 style={{ fontSize: "24px", fontWeight: 800, letterSpacing: "-0.02em", background: "linear-gradient(135deg, #fff 0%, #88D0F0 60%, #56B4E0 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "2px" }}>
                {displayName}
              </h1>
              <p style={{ fontSize: "13px", color: "#5a6480", margin: 0 }}>{email}</p>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: "6px", marginTop: "28px", flexWrap: "wrap" }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                className="tab-btn"
                onClick={() => setActiveTab(t.id)}
                style={{
                  padding: "8px 18px", borderRadius: "10px", fontSize: "13px", fontWeight: 600,
                  cursor: "pointer", border: "1px solid",
                  transition: "all 0.15s", fontFamily: "inherit",
                  background:     activeTab === t.id ? "#007ABF18" : "transparent",
                  borderColor:    activeTab === t.id ? "#007ABF50" : "#1e1e30",
                  color:          activeTab === t.id ? "#56B4E0" : "#5a6480",
                }}
              >
                {t.icon} {t.label}
                {t.id === "childpanel" && reseller && (
                  <span style={{ marginLeft: 6, width: 6, height: 6, borderRadius: "50%", background: reseller.is_active ? "#34d399" : "#f87171", display: "inline-block", verticalAlign: "middle" }} />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ maxWidth: "640px", margin: "0 auto", padding: "36px 24px", animation: "fade-in 0.4s ease-out" }}>

        {/* ══════════════════════════════════════
            TAB: PERFIL
        ══════════════════════════════════════ */}
        {activeTab === "perfil" && (
          <div style={{ background: "#0d0d1a", border: "1px solid #1a1a2e", borderRadius: "20px", padding: "32px", display: "flex", flexDirection: "column", gap: "28px" }}>

            {/* Avatar */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
              <div className="avatar-wrap" style={{ position: "relative", width: "90px", height: "90px", cursor: "pointer" }} onClick={() => fileRef.current?.click()}>
                {avatarPreview ? (
                  <img src={avatarPreview} alt="avatar" style={{ width: "90px", height: "90px", borderRadius: "50%", objectFit: "cover", border: "3px solid #007ABF40" }} />
                ) : (
                  <div style={{ width: "90px", height: "90px", borderRadius: "50%", background: "#1a1a2e", border: "3px solid #2a2a42", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <User size={36} color="#3a3a5c" />
                  </div>
                )}
                <div className="avatar-overlay" style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,122,191,0.75)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.2s" }}>
                  {uploading ? (
                    <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", animation: "spin 0.7s linear infinite" }} />
                  ) : (
                    <Camera size={20} color="white" />
                  )}
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }} onChange={handleFileChange} />
              <p style={{ fontSize: "11px", color: "#5a6480", textAlign: "center", margin: 0 }}>
                Haz clic para cambiar · PNG, JPG o WebP · Máx 2 MB
              </p>
            </div>

            {/* Name */}
            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "#8892a4", display: "block", marginBottom: "8px", letterSpacing: "0.5px" }}>NOMBRE DE USUARIO</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Tu nombre"
                style={{ width: "100%", background: "#0a0a0f", border: "1px solid #2d2d44", borderRadius: "12px", padding: "13px 16px", color: "white", fontSize: "15px", outline: "none", fontFamily: "inherit", boxSizing: "border-box", transition: "border-color 0.15s" }}
                onFocus={(e) => e.currentTarget.style.borderColor = "#007ABF"}
                onBlur={(e) => e.currentTarget.style.borderColor = "#2d2d44"}
              />
            </div>

            {/* Email (read-only) */}
            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "#8892a4", display: "block", marginBottom: "8px", letterSpacing: "0.5px" }}>EMAIL</label>
              <div style={{ background: "#070710", border: "1px solid #1a1a2e", borderRadius: "12px", padding: "13px 16px", color: "#3a3a5c", fontSize: "15px" }}>
                {email}
              </div>
            </div>

            {profileError && (
              <div style={{ background: "#f8717115", border: "1px solid #f8717140", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "#f87171", display: "flex", alignItems: "center", gap: "8px" }}>
                ⚠️ {profileError}
              </div>
            )}

            <button
              className="save-btn"
              onClick={handleSaveProfile}
              disabled={saving || uploading}
              style={{ width: "100%", padding: "14px", borderRadius: "14px", border: "none", background: profileSaved ? "linear-gradient(135deg, #34d399, #059669)" : "linear-gradient(135deg, #007ABF, #005F9E)", color: "white", fontSize: "15px", fontWeight: 700, cursor: saving || uploading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontFamily: "inherit", transition: "all 0.2s", opacity: saving || uploading ? 0.7 : 1 }}
            >
              {saving ? (
                <><div style={{ width: "16px", height: "16px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", animation: "spin 0.7s linear infinite" }} /> Guardando...</>
              ) : profileSaved ? (
                <><Check size={16} /> ¡Guardado!</>
              ) : "Guardar cambios"}
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════
            TAB: CONTRASEÑA
        ══════════════════════════════════════ */}
        {activeTab === "contrasena" && (
          <div style={{ background: "#0d0d1a", border: "1px solid #1a1a2e", borderRadius: "20px", padding: "32px", display: "flex", flexDirection: "column", gap: "24px" }}>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", paddingBottom: "20px", borderBottom: "1px solid #1a1a2e" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "#007ABF18", border: "1px solid #007ABF30", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Lock size={18} color="#007ABF" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#f0efff" }}>Cambiar contraseña</h2>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#5a6480" }}>
                  {isOAuth ? "Conectado con Google · puedes establecer una contraseña adicional" : "Actualiza tu contraseña de acceso"}
                </p>
              </div>
            </div>

            {isOAuth && (
              <div style={{ background: "#007ABF10", border: "1px solid #007ABF30", borderRadius: "10px", padding: "12px 16px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <AlertCircle size={15} color="#007ABF" style={{ marginTop: 2, flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8", lineHeight: 1.5 }}>
                  Tu cuenta está conectada con Google. Puedes establecer una contraseña adicional para también acceder con email/contraseña. Recibirás un correo de confirmación.
                </p>
              </div>
            )}

            {/* New password */}
            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "#8892a4", display: "block", marginBottom: "8px", letterSpacing: "0.5px" }}>NUEVA CONTRASEÑA</label>
              <div style={{ position: "relative" }}>
                <input
                  className="pass-input"
                  type={showNew ? "text" : "password"}
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  style={{ width: "100%", background: "#0a0a0f", border: "1px solid #2d2d44", borderRadius: "12px", padding: "13px 46px 13px 16px", color: "white", fontSize: "15px", fontFamily: "inherit", boxSizing: "border-box", transition: "border-color 0.15s" }}
                />
                <button
                  onClick={() => setShowNew(!showNew)}
                  style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: "#5a6480", padding: "2px" }}
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {newPass && (
                <div style={{ marginTop: "8px", display: "flex", gap: "6px", alignItems: "center" }}>
                  {[4, 6, 8, 12].map((min) => (
                    <div key={min} style={{ height: "3px", flex: 1, borderRadius: "2px", background: newPass.length >= min ? (newPass.length >= 12 ? "#34d399" : newPass.length >= 8 ? "#007ABF" : "#fbbf24") : "#1e1e30", transition: "background 0.2s" }} />
                  ))}
                  <span style={{ fontSize: "10px", color: newPass.length >= 12 ? "#34d399" : newPass.length >= 8 ? "#007ABF" : "#fbbf24", whiteSpace: "nowrap" }}>
                    {newPass.length < 6 ? "Débil" : newPass.length < 8 ? "Regular" : newPass.length < 12 ? "Buena" : "Fuerte"}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "#8892a4", display: "block", marginBottom: "8px", letterSpacing: "0.5px" }}>CONFIRMAR CONTRASEÑA</label>
              <div style={{ position: "relative" }}>
                <input
                  className="pass-input"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="Repite la contraseña"
                  style={{ width: "100%", background: "#0a0a0f", border: `1px solid ${confirmPass && confirmPass !== newPass ? "#f87171" : confirmPass && confirmPass === newPass ? "#34d399" : "#2d2d44"}`, borderRadius: "12px", padding: "13px 46px 13px 16px", color: "white", fontSize: "15px", fontFamily: "inherit", boxSizing: "border-box", transition: "border-color 0.15s" }}
                />
                <button
                  onClick={() => setShowConfirm(!showConfirm)}
                  style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: "#5a6480", padding: "2px" }}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPass && confirmPass !== newPass && (
                <p style={{ fontSize: "12px", color: "#f87171", margin: "6px 0 0" }}>Las contraseñas no coinciden</p>
              )}
            </div>

            {passMsg && (
              <div style={{ background: passMsg.ok ? "#34d39915" : "#f8717115", border: `1px solid ${passMsg.ok ? "#34d39940" : "#f8717140"}`, borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: passMsg.ok ? "#34d399" : "#f87171" }}>
                {passMsg.text}
              </div>
            )}

            <button
              className="save-btn"
              onClick={handleSavePassword}
              disabled={passSaving || !newPass || !confirmPass}
              style={{ width: "100%", padding: "14px", borderRadius: "14px", border: "none", background: "linear-gradient(135deg, #007ABF, #005F9E)", color: "white", fontSize: "15px", fontWeight: 700, cursor: passSaving || !newPass || !confirmPass ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontFamily: "inherit", transition: "all 0.2s", opacity: passSaving || !newPass || !confirmPass ? 0.5 : 1 }}
            >
              {passSaving ? (
                <><div style={{ width: "16px", height: "16px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", animation: "spin 0.7s linear infinite" }} /> Actualizando...</>
              ) : (
                <><Lock size={15} /> Actualizar contraseña</>
              )}
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════
            TAB: CHILD PANEL
        ══════════════════════════════════════ */}
        {activeTab === "childpanel" && resellerChecked && (
          reseller ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* Status card */}
              <div style={{ background: reseller.is_active ? "#34d39910" : "#f8717110", border: `1px solid ${reseller.is_active ? "#34d39935" : "#f8717135"}`, borderRadius: "14px", padding: "18px 22px", display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: reseller.is_active ? "#34d399" : "#f87171", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: reseller.is_active ? "#34d399" : "#f87171" }}>
                    Cuenta {reseller.is_active ? "activa" : "suspendida"}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#5a6480" }}>
                    {reseller.company_name || "Sin nombre de empresa"} {reseller.custom_domain ? `· ${reseller.custom_domain}` : ""}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#34d399" }}>${parseFloat(String(reseller.balance)).toFixed(2)}</p>
                  <p style={{ margin: "1px 0 0", fontSize: "11px", color: "#5a6480" }}>balance USD</p>
                </div>
              </div>

              {/* API key card */}
              <div style={{ background: "#0d0d1a", border: "1px solid #1a1a2e", borderRadius: "16px", padding: "22px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                  <Key size={16} color="#007ABF" />
                  <span style={{ fontWeight: 700, fontSize: "14px" }}>Tu API Key</span>
                </div>
                <div style={{ background: "#0a0a0f", border: "1px solid #2d2d44", borderRadius: "10px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <code style={{ fontSize: "12px", color: "#56B4E0", flex: 1, wordBreak: "break-all", letterSpacing: "0.5px" }}>{reseller.api_key}</code>
                  <button
                    onClick={copyKey}
                    style={{ padding: "6px 12px", borderRadius: "8px", background: copiedKey ? "#34d39918" : "#007ABF18", border: `1px solid ${copiedKey ? "#34d39940" : "#007ABF40"}`, color: copiedKey ? "#34d399" : "#007ABF", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", whiteSpace: "nowrap", flexShrink: 0, fontFamily: "inherit" }}
                  >
                    {copiedKey ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
                  </button>
                </div>
                <p style={{ margin: "10px 0 0", fontSize: "11px", color: "#5a6480" }}>
                  Endpoint: <code style={{ color: "#56B4E0" }}>https://trustmind.online/api/v2</code>
                </p>
              </div>

              {/* Domain */}
              {reseller.custom_domain && (
                <div style={{ background: "#0d0d1a", border: "1px solid #1a1a2e", borderRadius: "14px", padding: "18px 22px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <Globe size={16} color="#007ABF" />
                  <div>
                    <p style={{ margin: 0, fontSize: "12px", color: "#5a6480" }}>Dominio configurado</p>
                    <p style={{ margin: "2px 0 0", fontSize: "14px", fontWeight: 600, color: "#56B4E0" }}>{reseller.custom_domain}</p>
                  </div>
                </div>
              )}

              {/* CTA to full dashboard */}
              <Link
                href="/smm/reseller"
                style={{ background: "linear-gradient(135deg, #007ABF18, #005F9618)", border: "1px solid #007ABF35", borderRadius: "14px", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", textDecoration: "none", transition: "border-color 0.15s" }}
              >
                <div>
                  <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#56B4E0" }}>Ver dashboard completo</p>
                  <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#5a6480" }}>Pedidos, documentación API, instrucciones de dominio</p>
                </div>
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <ExternalLink size={14} color="#007ABF" />
                  <ChevronRight size={16} color="#3a3a5c" />
                </div>
              </Link>

            </div>
          ) : (
            // Not a reseller
            <div style={{ background: "#0d0d1a", border: "1px solid #1a1a2e", borderRadius: "20px", padding: "48px 32px", textAlign: "center" }}>
              <div style={{ width: "60px", height: "60px", borderRadius: "16px", background: "#1a1a2e", border: "1px solid #2a2a42", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <Globe size={28} color="#3a3a5c" />
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 700, color: "#f0efff" }}>Child Panel no activado</h3>
              <p style={{ margin: "0 0 24px", fontSize: "13px", color: "#5a6480", lineHeight: 1.6, maxWidth: "340px", display: "inline-block" }}>
                El Child Panel te permite conectar tu propio dominio y ofrecer los servicios de Trust Mind a tus propios clientes con tu margen de ganancia.
              </p>
              <div style={{ background: "#007ABF10", border: "1px solid #007ABF25", borderRadius: "12px", padding: "16px 20px", display: "inline-flex", gap: "10px", alignItems: "flex-start", textAlign: "left", maxWidth: "380px" }}>
                <AlertCircle size={15} color="#007ABF" style={{ marginTop: 2, flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8", lineHeight: 1.6 }}>
                  Para activar tu cuenta de revendedor, contacta al administrador. Una vez activada, verás aquí tu API key y configuración.
                </p>
              </div>
            </div>
          )
        )}

      </div>
    </div>
  );
}
