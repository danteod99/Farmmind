"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import {
  ArrowLeft, LogOut, Camera, Check, User,
  Lock, Eye, EyeOff, Key, Copy, ExternalLink,
  Globe, AlertCircle, Palette, Type, FileText,
  LayoutDashboard, Zap, Save, ChevronRight,
} from "lucide-react";
import { FarmMindLogo } from "@/app/components/FarmMindLogo";

// ── Types ──────────────────────────────────────────────────────────────────

type Tab = "perfil" | "contrasena" | "childpanel";

interface ResellerInfo {
  id: string;
  api_key: string;
  company_name: string;
  panel_name: string;
  logo_url: string;
  brand_color: string;
  description: string;
  custom_domain: string;
  balance: number;
  is_active: boolean;
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "perfil",     label: "Mi perfil",   icon: "👤" },
  { id: "contrasena", label: "Contraseña",  icon: "🔒" },
  { id: "childpanel", label: "Child Panel", icon: "🔗" },
];

const BRAND_COLORS = [
  "#007ABF", "#0066FF", "#6366F1", "#8B5CF6",
  "#EC4899", "#EF4444", "#F59E0B", "#10B981",
  "#14B8A6", "#3B82F6",
];

// ── Component ──────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router  = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState<Tab>("perfil");

  // ── Profile ──────────────────────────────────────────────────────────
  const [saving,        setSaving]        = useState(false);
  const [uploading,     setUploading]     = useState(false);
  const [profileSaved,  setProfileSaved]  = useState(false);
  const [profileError,  setProfileError]  = useState<string | null>(null);
  const [userId,        setUserId]        = useState("");
  const [email,         setEmail]         = useState("");
  const [displayName,   setDisplayName]   = useState("");
  const [avatarUrl,     setAvatarUrl]     = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [isOAuth,       setIsOAuth]       = useState(false);

  // ── Password ─────────────────────────────────────────────────────────
  const [newPass,     setNewPass]     = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passSaving,  setPassSaving]  = useState(false);
  const [passMsg,     setPassMsg]     = useState<{ text: string; ok: boolean } | null>(null);

  // ── Reseller ─────────────────────────────────────────────────────────
  const [reseller,        setReseller]        = useState<ResellerInfo | null>(null);
  const [resellerChecked, setResellerChecked] = useState(false);
  const [copiedKey,       setCopiedKey]       = useState(false);

  // ── Create reseller form (when not yet a reseller) ──────────────────
  const [createPanelName,  setCreatePanelName]  = useState("");
  const [createDesc,       setCreateDesc]       = useState("");
  const [createColor,      setCreateColor]      = useState("#007ABF");
  const [creating,         setCreating]         = useState(false);
  const [createError,      setCreateError]      = useState<string | null>(null);

  // ── Edit branding (when already a reseller) ─────────────────────────
  const [editPanelName,   setEditPanelName]   = useState("");
  const [editDesc,        setEditDesc]        = useState("");
  const [editColor,       setEditColor]       = useState("#007ABF");
  const [editDomain,      setEditDomain]      = useState("");
  const [editLogoUrl,     setEditLogoUrl]     = useState("");
  const [editLogoPreview, setEditLogoPreview] = useState("");
  const [logoUploading,   setLogoUploading]   = useState(false);
  const [brandingSaving,  setBrandingSaving]  = useState(false);
  const [brandingSaved,   setBrandingSaved]   = useState(false);
  const [brandingError,   setBrandingError]   = useState<string | null>(null);

  // ── Load ──────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }

      setUserId(user.id);
      setEmail(user.email || "");
      setDisplayName(user.user_metadata?.full_name || user.email?.split("@")[0] || "");
      setAvatarUrl(user.user_metadata?.avatar_url || "");
      setAvatarPreview(user.user_metadata?.avatar_url || "");
      const provider = user.app_metadata?.provider;
      setIsOAuth(provider === "google" || provider === "github");

      const { data: res } = await supabase
        .from("smm_resellers")
        .select("id, api_key, company_name, panel_name, logo_url, brand_color, description, custom_domain, balance, is_active")
        .eq("user_id", user.id)
        .single();

      if (res) {
        setReseller(res);
        setEditPanelName(res.panel_name || res.company_name || "");
        setEditDesc(res.description || "");
        setEditColor(res.brand_color || "#007ABF");
        setEditDomain(res.custom_domain || "");
        setEditLogoUrl(res.logo_url || "");
        setEditLogoPreview(res.logo_url || "");
      }
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
    setUploading(true); setProfileError(null);
    try {
      const ext  = file.name.split(".").pop();
      const path = `avatars/${userId}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(urlData.publicUrl + "?t=" + Date.now());
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : "Error al subir la imagen");
    } finally { setUploading(false); }
  };

  // ── Logo upload ───────────────────────────────────────────────────────

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setBrandingError("La imagen no puede superar 2 MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setEditLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setLogoUploading(true); setBrandingError(null);
    try {
      const ext  = file.name.split(".").pop();
      const path = `reseller-logos/${userId}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      setEditLogoUrl(urlData.publicUrl + "?t=" + Date.now());
    } catch (err: unknown) {
      setBrandingError(err instanceof Error ? err.message : "Error al subir el logo");
    } finally { setLogoUploading(false); }
  };

  // ── Save profile ──────────────────────────────────────────────────────

  const handleSaveProfile = async () => {
    if (!displayName.trim()) { setProfileError("El nombre no puede estar vacío"); return; }
    setSaving(true); setProfileError(null);
    try {
      const { error: updErr } = await supabase.auth.updateUser({ data: { full_name: displayName.trim(), avatar_url: avatarUrl } });
      if (updErr) throw updErr;
      setProfileSaved(true); setTimeout(() => setProfileSaved(false), 2500);
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : "Error al guardar");
    } finally { setSaving(false); }
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
    } finally { setPassSaving(false); }
  };

  // ── Create child panel ────────────────────────────────────────────────

  const handleCreatePanel = async () => {
    if (!createPanelName.trim()) { setCreateError("El nombre del panel es requerido"); return; }
    setCreating(true); setCreateError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/reseller/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ panel_name: createPanelName.trim(), brand_color: createColor, description: createDesc }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al crear el panel");
      setReseller(json.reseller);
      setEditPanelName(json.reseller.panel_name || "");
      setEditColor(json.reseller.brand_color || "#007ABF");
      setEditDesc(json.reseller.description || "");
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Error al crear el panel");
    } finally { setCreating(false); }
  };

  // ── Save branding ─────────────────────────────────────────────────────

  const handleSaveBranding = async () => {
    setBrandingSaving(true); setBrandingError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/reseller/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ panel_name: editPanelName, description: editDesc, brand_color: editColor, custom_domain: editDomain, logo_url: editLogoUrl, company_name: editPanelName }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al guardar");
      setReseller((prev) => prev ? { ...prev, ...json.reseller } : json.reseller);
      setBrandingSaved(true); setTimeout(() => setBrandingSaved(false), 2500);
    } catch (err: unknown) {
      setBrandingError(err instanceof Error ? err.message : "Error al guardar");
    } finally { setBrandingSaving(false); }
  };

  const copyKey = () => {
    if (!reseller) return;
    navigator.clipboard.writeText(reseller.api_key);
    setCopiedKey(true); setTimeout(() => setCopiedKey(false), 2000);
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
        @keyframes spin     { to   { transform: rotate(360deg); } }
        @keyframes fade-in  { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .avatar-wrap:hover .avatar-overlay { opacity: 1 !important; }
        .logo-wrap:hover .logo-overlay     { opacity: 1 !important; }
        .save-btn:hover   { opacity: 0.9; transform: translateY(-1px); }
        .save-btn:active  { transform: translateY(0); }
        .tab-btn:hover    { border-color: #007ABF50 !important; color: #56B4E0 !important; }
        .focusable:focus  { border-color: #007ABF !important; outline: none; }
        .color-swatch:hover { transform: scale(1.15); }
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
              <button key={t.id} className="tab-btn" onClick={() => setActiveTab(t.id)}
                style={{ padding: "8px 18px", borderRadius: "10px", fontSize: "13px", fontWeight: 600, cursor: "pointer", border: "1px solid", transition: "all 0.15s", fontFamily: "inherit", background: activeTab === t.id ? "#007ABF18" : "transparent", borderColor: activeTab === t.id ? "#007ABF50" : "#1e1e30", color: activeTab === t.id ? "#56B4E0" : "#5a6480" }}>
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

        {/* ═══════════════════ TAB: PERFIL ═══════════════════ */}
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
                  {uploading ? <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", animation: "spin 0.7s linear infinite" }} /> : <Camera size={20} color="white" />}
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }} onChange={handleFileChange} />
              <p style={{ fontSize: "11px", color: "#5a6480", textAlign: "center", margin: 0 }}>Haz clic para cambiar · PNG, JPG o WebP · Máx 2 MB</p>
            </div>
            {/* Name */}
            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "#8892a4", display: "block", marginBottom: "8px", letterSpacing: "0.5px" }}>NOMBRE DE USUARIO</label>
              <input className="focusable" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Tu nombre"
                style={{ width: "100%", background: "#0a0a0f", border: "1px solid #2d2d44", borderRadius: "12px", padding: "13px 16px", color: "white", fontSize: "15px", fontFamily: "inherit", boxSizing: "border-box", transition: "border-color 0.15s" }} />
            </div>
            {/* Email (read-only) */}
            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "#8892a4", display: "block", marginBottom: "8px", letterSpacing: "0.5px" }}>EMAIL</label>
              <div style={{ background: "#070710", border: "1px solid #1a1a2e", borderRadius: "12px", padding: "13px 16px", color: "#3a3a5c", fontSize: "15px" }}>{email}</div>
            </div>
            {profileError && <div style={{ background: "#f8717115", border: "1px solid #f8717140", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "#f87171" }}>⚠️ {profileError}</div>}
            <button className="save-btn" onClick={handleSaveProfile} disabled={saving || uploading}
              style={{ width: "100%", padding: "14px", borderRadius: "14px", border: "none", background: profileSaved ? "linear-gradient(135deg, #34d399, #059669)" : "linear-gradient(135deg, #007ABF, #005F9E)", color: "white", fontSize: "15px", fontWeight: 700, cursor: saving || uploading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontFamily: "inherit", transition: "all 0.2s", opacity: saving || uploading ? 0.7 : 1 }}>
              {saving ? <><div style={{ width: "16px", height: "16px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", animation: "spin 0.7s linear infinite" }} /> Guardando...</> : profileSaved ? <><Check size={16} /> ¡Guardado!</> : "Guardar cambios"}
            </button>
          </div>
        )}

        {/* ═══════════════════ TAB: CONTRASEÑA ═══════════════════ */}
        {activeTab === "contrasena" && (
          <div style={{ background: "#0d0d1a", border: "1px solid #1a1a2e", borderRadius: "20px", padding: "32px", display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", paddingBottom: "20px", borderBottom: "1px solid #1a1a2e" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "#007ABF18", border: "1px solid #007ABF30", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Lock size={18} color="#007ABF" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#f0efff" }}>Cambiar contraseña</h2>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#5a6480" }}>{isOAuth ? "Conectado con Google · puedes establecer una contraseña adicional" : "Actualiza tu contraseña de acceso"}</p>
              </div>
            </div>
            {isOAuth && (
              <div style={{ background: "#007ABF10", border: "1px solid #007ABF30", borderRadius: "10px", padding: "12px 16px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <AlertCircle size={15} color="#007ABF" style={{ marginTop: 2, flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8", lineHeight: 1.5 }}>Tu cuenta está conectada con Google. Puedes establecer una contraseña adicional para también acceder con email/contraseña.</p>
              </div>
            )}
            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "#8892a4", display: "block", marginBottom: "8px", letterSpacing: "0.5px" }}>NUEVA CONTRASEÑA</label>
              <div style={{ position: "relative" }}>
                <input className="focusable" type={showNew ? "text" : "password"} value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="Mínimo 8 caracteres"
                  style={{ width: "100%", background: "#0a0a0f", border: "1px solid #2d2d44", borderRadius: "12px", padding: "13px 46px 13px 16px", color: "white", fontSize: "15px", fontFamily: "inherit", boxSizing: "border-box" }} />
                <button onClick={() => setShowNew(!showNew)} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: "#5a6480" }}>
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
            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "#8892a4", display: "block", marginBottom: "8px", letterSpacing: "0.5px" }}>CONFIRMAR CONTRASEÑA</label>
              <div style={{ position: "relative" }}>
                <input className="focusable" type={showConfirm ? "text" : "password"} value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} placeholder="Repite la contraseña"
                  style={{ width: "100%", background: "#0a0a0f", border: `1px solid ${confirmPass && confirmPass !== newPass ? "#f87171" : confirmPass && confirmPass === newPass ? "#34d399" : "#2d2d44"}`, borderRadius: "12px", padding: "13px 46px 13px 16px", color: "white", fontSize: "15px", fontFamily: "inherit", boxSizing: "border-box" }} />
                <button onClick={() => setShowConfirm(!showConfirm)} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: "#5a6480" }}>
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPass && confirmPass !== newPass && <p style={{ fontSize: "12px", color: "#f87171", margin: "6px 0 0" }}>Las contraseñas no coinciden</p>}
            </div>
            {passMsg && <div style={{ background: passMsg.ok ? "#34d39915" : "#f8717115", border: `1px solid ${passMsg.ok ? "#34d39940" : "#f8717140"}`, borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: passMsg.ok ? "#34d399" : "#f87171" }}>{passMsg.text}</div>}
            <button className="save-btn" onClick={handleSavePassword} disabled={passSaving || !newPass || !confirmPass}
              style={{ width: "100%", padding: "14px", borderRadius: "14px", border: "none", background: "linear-gradient(135deg, #007ABF, #005F9E)", color: "white", fontSize: "15px", fontWeight: 700, cursor: passSaving || !newPass || !confirmPass ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontFamily: "inherit", transition: "all 0.2s", opacity: passSaving || !newPass || !confirmPass ? 0.5 : 1 }}>
              {passSaving ? <><div style={{ width: "16px", height: "16px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", animation: "spin 0.7s linear infinite" }} /> Actualizando...</> : <><Lock size={15} /> Actualizar contraseña</>}
            </button>
          </div>
        )}

        {/* ═══════════════════ TAB: CHILD PANEL ═══════════════════ */}
        {activeTab === "childpanel" && resellerChecked && (

          reseller ? (
            /* ─── RESELLER ACTIVO ─── */
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* Status bar */}
              <div style={{ background: reseller.is_active ? "#34d39910" : "#f8717110", border: `1px solid ${reseller.is_active ? "#34d39935" : "#f8717135"}`, borderRadius: "14px", padding: "16px 22px", display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: reseller.is_active ? "#34d399" : "#f87171", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: reseller.is_active ? "#34d399" : "#f87171" }}>
                    {reseller.panel_name || reseller.company_name || "Mi Child Panel"}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#5a6480" }}>
                    Cuenta {reseller.is_active ? "activa" : "suspendida"}{reseller.custom_domain ? ` · ${reseller.custom_domain}` : ""}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#34d399" }}>${parseFloat(String(reseller.balance)).toFixed(2)}</p>
                  <p style={{ margin: "1px 0 0", fontSize: "11px", color: "#5a6480" }}>balance USD</p>
                </div>
              </div>

              {/* ── Branding editor ── */}
              <div style={{ background: "#0d0d1a", border: "1px solid #1a1a2e", borderRadius: "20px", padding: "28px", display: "flex", flexDirection: "column", gap: "22px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingBottom: "18px", borderBottom: "1px solid #1a1a2e" }}>
                  <Palette size={16} color="#007ABF" />
                  <span style={{ fontSize: "15px", fontWeight: 700, color: "#f0efff" }}>Personalización del panel</span>
                </div>

                {/* Logo upload */}
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#8892a4", display: "block", marginBottom: "10px", letterSpacing: "0.5px" }}>LOGO DEL PANEL</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div className="logo-wrap" style={{ position: "relative", width: "72px", height: "72px", cursor: "pointer", borderRadius: "14px", overflow: "hidden", border: "2px solid #2d2d44", background: "#0a0a0f", flexShrink: 0 }} onClick={() => logoRef.current?.click()}>
                      {editLogoPreview ? (
                        <img src={editLogoPreview} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain", padding: "4px" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Type size={22} color="#3a3a5c" />
                        </div>
                      )}
                      <div className="logo-overlay" style={{ position: "absolute", inset: 0, background: "rgba(0,122,191,0.75)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.2s" }}>
                        {logoUploading ? <div style={{ width: "18px", height: "18px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", animation: "spin 0.7s linear infinite" }} /> : <Camera size={18} color="white" />}
                      </div>
                    </div>
                    <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" style={{ display: "none" }} onChange={handleLogoChange} />
                    <div>
                      <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#94a3b8" }}>Sube el logo de tu panel</p>
                      <p style={{ margin: 0, fontSize: "11px", color: "#5a6480" }}>PNG, JPG, WebP o SVG · Máx 2 MB</p>
                    </div>
                  </div>
                </div>

                {/* Panel name */}
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#8892a4", display: "block", marginBottom: "8px", letterSpacing: "0.5px" }}>
                    <Type size={11} style={{ display: "inline", marginRight: 5 }} />NOMBRE DEL PANEL
                  </label>
                  <input className="focusable" type="text" value={editPanelName} onChange={(e) => setEditPanelName(e.target.value)} placeholder="ej. Mi SMM Panel"
                    style={{ width: "100%", background: "#0a0a0f", border: "1px solid #2d2d44", borderRadius: "12px", padding: "12px 16px", color: "white", fontSize: "15px", fontFamily: "inherit", boxSizing: "border-box", transition: "border-color 0.15s" }} />
                </div>

                {/* Description */}
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#8892a4", display: "block", marginBottom: "8px", letterSpacing: "0.5px" }}>
                    <FileText size={11} style={{ display: "inline", marginRight: 5 }} />DESCRIPCIÓN CORTA
                  </label>
                  <textarea className="focusable" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Describe brevemente tu panel o servicio..."
                    style={{ width: "100%", background: "#0a0a0f", border: "1px solid #2d2d44", borderRadius: "12px", padding: "12px 16px", color: "white", fontSize: "14px", fontFamily: "inherit", boxSizing: "border-box", resize: "none", minHeight: "80px", transition: "border-color 0.15s" }} />
                </div>

                {/* Brand color */}
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#8892a4", display: "block", marginBottom: "10px", letterSpacing: "0.5px" }}>
                    <Palette size={11} style={{ display: "inline", marginRight: 5 }} />COLOR DE MARCA
                  </label>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                    {BRAND_COLORS.map((c) => (
                      <button key={c} className="color-swatch" onClick={() => setEditColor(c)}
                        style={{ width: "30px", height: "30px", borderRadius: "8px", background: c, border: `2px solid ${editColor === c ? "white" : "transparent"}`, cursor: "pointer", transition: "all 0.15s", boxShadow: editColor === c ? `0 0 0 1px ${c}40` : "none" }} />
                    ))}
                    <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)}
                      style={{ width: "30px", height: "30px", borderRadius: "8px", border: "2px solid #2d2d44", background: "transparent", cursor: "pointer", padding: "2px" }} />
                    <code style={{ fontSize: "12px", color: "#56B4E0", marginLeft: "4px" }}>{editColor}</code>
                  </div>
                </div>

                {/* Custom domain */}
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#8892a4", display: "block", marginBottom: "8px", letterSpacing: "0.5px" }}>
                    <Globe size={11} style={{ display: "inline", marginRight: 5 }} />DOMINIO PERSONALIZADO
                  </label>
                  <input className="focusable" type="text" value={editDomain} onChange={(e) => setEditDomain(e.target.value)} placeholder="panel.tudominio.com"
                    style={{ width: "100%", background: "#0a0a0f", border: "1px solid #2d2d44", borderRadius: "12px", padding: "12px 16px", color: "white", fontSize: "15px", fontFamily: "inherit", boxSizing: "border-box", transition: "border-color 0.15s" }} />
                  <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#5a6480" }}>
                    Apunta un CNAME de tu dominio a <code style={{ color: "#56B4E0" }}>trustmind.online</code> y escribe el subdominio aquí.
                  </p>
                </div>

                {brandingError && <div style={{ background: "#f8717115", border: "1px solid #f8717140", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "#f87171" }}>⚠️ {brandingError}</div>}

                <button className="save-btn" onClick={handleSaveBranding} disabled={brandingSaving}
                  style={{ width: "100%", padding: "13px", borderRadius: "13px", border: "none", background: brandingSaved ? "linear-gradient(135deg, #34d399, #059669)" : "linear-gradient(135deg, #007ABF, #005F9E)", color: "white", fontSize: "14px", fontWeight: 700, cursor: brandingSaving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontFamily: "inherit", transition: "all 0.2s" }}>
                  {brandingSaving ? <><div style={{ width: "15px", height: "15px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", animation: "spin 0.7s linear infinite" }} /> Guardando...</> : brandingSaved ? <><Check size={15} /> ¡Cambios guardados!</> : <><Save size={15} /> Guardar configuración</>}
                </button>
              </div>

              {/* ── API key ── */}
              <div style={{ background: "#0d0d1a", border: "1px solid #1a1a2e", borderRadius: "16px", padding: "22px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                  <Key size={16} color="#007ABF" />
                  <span style={{ fontWeight: 700, fontSize: "14px" }}>Tu API Key</span>
                </div>
                <div style={{ background: "#0a0a0f", border: "1px solid #2d2d44", borderRadius: "10px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <code style={{ fontSize: "12px", color: "#56B4E0", flex: 1, wordBreak: "break-all", letterSpacing: "0.5px" }}>{reseller.api_key}</code>
                  <button onClick={copyKey}
                    style={{ padding: "6px 12px", borderRadius: "8px", background: copiedKey ? "#34d39918" : "#007ABF18", border: `1px solid ${copiedKey ? "#34d39940" : "#007ABF40"}`, color: copiedKey ? "#34d399" : "#007ABF", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", whiteSpace: "nowrap", flexShrink: 0, fontFamily: "inherit" }}>
                    {copiedKey ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
                  </button>
                </div>
                <p style={{ margin: "10px 0 0", fontSize: "11px", color: "#5a6480" }}>
                  Endpoint: <code style={{ color: "#56B4E0" }}>https://trustmind.online/api/v2</code>
                </p>
              </div>

              {/* ── Links ── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <Link href="/smm/reseller" style={{ background: "#0d0d1a", border: "1px solid #1a1a2e", borderRadius: "14px", padding: "16px 18px", textDecoration: "none", display: "flex", alignItems: "center", gap: "10px", transition: "border-color 0.15s" }}>
                  <Zap size={16} color="#007ABF" />
                  <div>
                    <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#56B4E0" }}>API & Docs</p>
                    <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#5a6480" }}>Documentación</p>
                  </div>
                </Link>
                <Link href="/smm/reseller/admin" style={{ background: "#007ABF10", border: "1px solid #007ABF25", borderRadius: "14px", padding: "16px 18px", textDecoration: "none", display: "flex", alignItems: "center", gap: "10px", transition: "border-color 0.15s" }}>
                  <LayoutDashboard size={16} color="#007ABF" />
                  <div>
                    <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#56B4E0" }}>Mi Admin</p>
                    <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#5a6480" }}>Clientes & pedidos</p>
                  </div>
                  <ChevronRight size={14} color="#3a3a5c" style={{ marginLeft: "auto" }} />
                </Link>
              </div>
            </div>

          ) : (
            /* ─── NO ES RESELLER: FORM DE CREACIÓN ─── */
            <div style={{ background: "#0d0d1a", border: "1px solid #1a1a2e", borderRadius: "20px", padding: "36px 32px", display: "flex", flexDirection: "column", gap: "24px" }}>

              {/* Header */}
              <div style={{ textAlign: "center" }}>
                <div style={{ width: "64px", height: "64px", borderRadius: "18px", background: "linear-gradient(135deg, #007ABF20, #005F9620)", border: "1px solid #007ABF30", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <Globe size={30} color="#007ABF" />
                </div>
                <h3 style={{ margin: "0 0 8px", fontSize: "20px", fontWeight: 800, color: "#f0efff" }}>Crea tu Child Panel</h3>
                <p style={{ margin: 0, fontSize: "13px", color: "#5a6480", lineHeight: 1.6, maxWidth: "360px", display: "inline-block" }}>
                  Ofrece los servicios de Trust Mind con tu propia marca, dominio y márgenes de ganancia.
                </p>
              </div>

              {/* Benefits row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                {[
                  { icon: "🏷️", text: "Tu marca & logo" },
                  { icon: "💰", text: "Tus precios" },
                  { icon: "🌐", text: "Tu dominio" },
                ].map((b) => (
                  <div key={b.text} style={{ background: "#0a0a0f", border: "1px solid #2d2d44", borderRadius: "10px", padding: "12px 10px", textAlign: "center" }}>
                    <div style={{ fontSize: "20px", marginBottom: "4px" }}>{b.icon}</div>
                    <p style={{ margin: 0, fontSize: "11px", color: "#8892a4", fontWeight: 600 }}>{b.text}</p>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: "1px solid #1a1a2e", paddingTop: "20px", display: "flex", flexDirection: "column", gap: "18px" }}>

                {/* Panel name */}
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#8892a4", display: "block", marginBottom: "8px", letterSpacing: "0.5px" }}>NOMBRE DEL PANEL *</label>
                  <input className="focusable" type="text" value={createPanelName} onChange={(e) => setCreatePanelName(e.target.value)} placeholder="ej. ProSocial Panel"
                    style={{ width: "100%", background: "#0a0a0f", border: "1px solid #2d2d44", borderRadius: "12px", padding: "13px 16px", color: "white", fontSize: "15px", fontFamily: "inherit", boxSizing: "border-box", transition: "border-color 0.15s" }} />
                </div>

                {/* Description */}
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#8892a4", display: "block", marginBottom: "8px", letterSpacing: "0.5px" }}>DESCRIPCIÓN (opcional)</label>
                  <textarea className="focusable" value={createDesc} onChange={(e) => setCreateDesc(e.target.value)} placeholder="Describe tu servicio..."
                    style={{ width: "100%", background: "#0a0a0f", border: "1px solid #2d2d44", borderRadius: "12px", padding: "12px 16px", color: "white", fontSize: "14px", fontFamily: "inherit", boxSizing: "border-box", resize: "none", minHeight: "70px", transition: "border-color 0.15s" }} />
                </div>

                {/* Color */}
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#8892a4", display: "block", marginBottom: "10px", letterSpacing: "0.5px" }}>COLOR DE MARCA</label>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                    {BRAND_COLORS.map((c) => (
                      <button key={c} className="color-swatch" onClick={() => setCreateColor(c)}
                        style={{ width: "28px", height: "28px", borderRadius: "8px", background: c, border: `2px solid ${createColor === c ? "white" : "transparent"}`, cursor: "pointer", transition: "all 0.15s" }} />
                    ))}
                    <input type="color" value={createColor} onChange={(e) => setCreateColor(e.target.value)}
                      style={{ width: "28px", height: "28px", borderRadius: "8px", border: "2px solid #2d2d44", background: "transparent", cursor: "pointer", padding: "2px" }} />
                  </div>
                </div>
              </div>

              {createError && <div style={{ background: "#f8717115", border: "1px solid #f8717140", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "#f87171" }}>⚠️ {createError}</div>}

              <button className="save-btn" onClick={handleCreatePanel} disabled={creating || !createPanelName.trim()}
                style={{ width: "100%", padding: "15px", borderRadius: "14px", border: "none", background: creating || !createPanelName.trim() ? "#1a1a2e" : "linear-gradient(135deg, #007ABF, #005F9E)", color: "white", fontSize: "15px", fontWeight: 700, cursor: creating || !createPanelName.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontFamily: "inherit", transition: "all 0.2s" }}>
                {creating ? <><div style={{ width: "16px", height: "16px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", animation: "spin 0.7s linear infinite" }} /> Creando tu panel...</> : <><ExternalLink size={15} /> Crear mi Child Panel</>}
              </button>

              <p style={{ margin: 0, fontSize: "11px", color: "#5a6480", textAlign: "center", lineHeight: 1.5 }}>
                Después podrás configurar tu logo, dominio y precios desde este mismo panel.
              </p>
            </div>
          )
        )}

      </div>
    </div>
  );
}
