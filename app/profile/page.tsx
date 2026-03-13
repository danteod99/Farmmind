"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import { ArrowLeft, LogOut, Camera, Check, Loader, User } from "lucide-react";
import { FarmMindLogo } from "@/app/components/FarmMindLogo";

export default function ProfilePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");

  useEffect(() => { loadProfile(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }
    setUserId(user.id);
    setEmail(user.email || "");
    setDisplayName(user.user_metadata?.full_name || user.email?.split("@")[0] || "");
    setAvatarUrl(user.user_metadata?.avatar_url || "");
    setAvatarPreview(user.user_metadata?.avatar_url || "");
    setLoading(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError("La imagen no puede superar 2 MB"); return; }

    // Preview
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Upload to Supabase Storage
    setUploading(true);
    setError(null);
    try {
      const ext = file.name.split(".").pop();
      const path = `avatars/${userId}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(urlData.publicUrl + "?t=" + Date.now());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al subir la imagen";
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) { setError("El nombre no puede estar vacío"); return; }
    setSaving(true);
    setError(null);
    try {
      const { error: updErr } = await supabase.auth.updateUser({
        data: {
          full_name: displayName.trim(),
          avatar_url: avatarUrl,
        },
      });
      if (updErr) throw updErr;
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al guardar";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ height: "100vh", background: "#07070e", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "50%", border: "3px solid #007ABF30", borderTopColor: "#56B4E0", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#07070e", color: "white", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .avatar-wrap:hover .avatar-overlay { opacity: 1 !important; }
        .save-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .save-btn:active { transform: translateY(0); }
      `}</style>

      {/* NAV */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, borderBottom: "1px solid #0d1117", background: "rgba(7,7,14,0.95)", backdropFilter: "blur(12px)", padding: "0 24px", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link href="/smm" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
            <FarmMindLogo size={28} />
          </Link>
          <div style={{ width: "1px", height: "22px", background: "#1e1e30" }} />
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#88D0F0" }}>Mi Perfil</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link href="/smm" style={{ padding: "6px 14px", borderRadius: "8px", fontSize: "13px", color: "#5a6480", background: "transparent", border: "1px solid transparent", textDecoration: "none", display: "flex", alignItems: "center", gap: "6px" }}>
            <ArrowLeft size={13} /> Dashboard
          </Link>
          <button onClick={async () => { await supabase.auth.signOut(); router.push("/"); }}
            style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#1a1a2e", border: "1px solid #1e1e30", color: "#5a6480", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <LogOut size={14} />
          </button>
        </div>
      </nav>

      {/* HERO */}
      <div style={{ position: "relative", overflow: "hidden", background: "linear-gradient(160deg, #000C18 0%, #001530 40%, #07070e 100%)", borderBottom: "1px solid #002860", padding: "48px 28px 40px" }}>
        <div style={{ position: "absolute", top: "-80px", right: "10%", width: "300px", height: "300px", borderRadius: "50%", background: "radial-gradient(circle, #007ABF30, transparent 70%)", filter: "blur(50px)", pointerEvents: "none" }} />
        <div style={{ maxWidth: "560px", margin: "0 auto", position: "relative", zIndex: 1 }}>
          <h1 style={{ fontSize: "32px", fontWeight: 800, letterSpacing: "-0.03em", background: "linear-gradient(135deg, #fff 0%, #88D0F0 60%, #56B4E0 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "6px" }}>
            Personalizar perfil
          </h1>
          <p style={{ fontSize: "14px", color: "#5a6480" }}>Actualiza tu nombre y foto de perfil</p>
        </div>
      </div>

      {/* FORM */}
      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "40px 24px", animation: "fade-in 0.5s ease-out" }}>
        <div style={{ background: "#0d0d1a", border: "1px solid #1a1a2e", borderRadius: "20px", padding: "36px", display: "flex", flexDirection: "column", gap: "32px" }}>

          {/* Avatar */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
            <div className="avatar-wrap" style={{ position: "relative", width: "100px", height: "100px", cursor: "pointer" }} onClick={() => fileRef.current?.click()}>
              {avatarPreview ? (
                <img src={avatarPreview} alt="avatar" style={{ width: "100px", height: "100px", borderRadius: "50%", objectFit: "cover", border: "3px solid #007ABF40" }} />
              ) : (
                <div style={{ width: "100px", height: "100px", borderRadius: "50%", background: "#1a1a2e", border: "3px solid #2a2a42", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <User size={40} color="#3a3a5c" />
                </div>
              )}
              <div className="avatar-overlay" style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,122,191,0.7)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.2s" }}>
                {uploading ? (
                  <div style={{ width: "22px", height: "22px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", animation: "spin 0.7s linear infinite" }} />
                ) : (
                  <Camera size={22} color="white" />
                )}
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }} onChange={handleFileChange} />
            <p style={{ fontSize: "12px", color: "#5a6480", textAlign: "center" }}>
              Haz clic en la imagen para cambiarla<br />
              <span style={{ color: "#3a3a5c" }}>PNG, JPG o WebP · Máx 2 MB</span>
            </p>
          </div>

          {/* Name */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#8892a4", display: "block", marginBottom: "8px", letterSpacing: "0.3px" }}>NOMBRE DE USUARIO</label>
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
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#8892a4", display: "block", marginBottom: "8px", letterSpacing: "0.3px" }}>EMAIL</label>
            <div style={{ background: "#070710", border: "1px solid #1a1a2e", borderRadius: "12px", padding: "13px 16px", color: "#3a3a5c", fontSize: "15px" }}>
              {email}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: "#f8717115", border: "1px solid #f8717140", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "#f87171", display: "flex", alignItems: "center", gap: "8px" }}>
              ⚠️ {error}
            </div>
          )}

          {/* Save button */}
          <button
            className="save-btn"
            onClick={handleSave}
            disabled={saving || uploading}
            style={{ width: "100%", padding: "14px", borderRadius: "14px", border: "none", background: saved ? "linear-gradient(135deg, #34d399, #059669)" : "linear-gradient(135deg, #007ABF, #005F9E)", color: "white", fontSize: "15px", fontWeight: 700, cursor: saving || uploading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontFamily: "inherit", transition: "all 0.2s", opacity: saving || uploading ? 0.7 : 1 }}>
            {saving ? (
              <><div style={{ width: "16px", height: "16px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", animation: "spin 0.7s linear infinite" }} /> Guardando...</>
            ) : saved ? (
              <><Check size={16} /> ¡Guardado!</>
            ) : (
              "Guardar cambios"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
