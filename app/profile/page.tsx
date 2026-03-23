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
  Tag, DollarSign, Search as SearchIcon, RefreshCw,
  Monitor, MessageCircle, Instagram, Send, Music2,
  ToggleLeft, ToggleRight, Info, CheckCircle, XCircle,
  Link2, ArrowUpRight,
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
  slug: string;
  hero_title: string;
  hero_subtitle: string;
  cta_text: string;
  cta_secondary_text: string;
  whatsapp_number: string;
  instagram_url: string;
  telegram_url: string;
  tiktok_url: string;
  facebook_pixel_id: string;
  show_features_section: boolean;
  show_plans_section: boolean;
  show_powered_by: boolean;
  domain_verified: boolean;
  domain_verified_at: string | null;
}

interface ServicePrice {
  service_id: number;
  name: string;
  category: string;
  jap_rate: number;
  reseller_rate: number | null;
}

type ResellerSection = "branding" | "storefront" | "dominio" | "precios" | "api";

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

  // ── Storefront customization ──────────────────────────────────────────
  const [editHeroTitle,       setEditHeroTitle]       = useState("");
  const [editHeroSubtitle,    setEditHeroSubtitle]    = useState("");
  const [editCtaText,         setEditCtaText]         = useState("Comenzar ahora");
  const [editCtaSecondary,    setEditCtaSecondary]    = useState("Ya tengo cuenta");
  const [editWhatsapp,        setEditWhatsapp]        = useState("");
  const [editInstagram,       setEditInstagram]       = useState("");
  const [editTelegram,        setEditTelegram]        = useState("");
  const [editTiktok,          setEditTiktok]          = useState("");
  const [editFbPixel,          setEditFbPixel]          = useState("");
  const [editShowFeatures,    setEditShowFeatures]    = useState(true);
  const [editShowPlans,       setEditShowPlans]       = useState(true);
  const [editShowPoweredBy,   setEditShowPoweredBy]   = useState(true);
  const [storefrontSaving,    setStorefrontSaving]    = useState(false);
  const [storefrontSaved,     setStorefrontSaved]     = useState(false);
  const [storefrontError,     setStorefrontError]     = useState<string | null>(null);

  // ── Domain verification ───────────────────────────────────────────────
  const [domainChecking,      setDomainChecking]      = useState(false);
  const [domainStatus,        setDomainStatus]        = useState<"idle" | "ok" | "fail">("idle");

  // ── Prices ───────────────────────────────────────────────────────────
  const [resellerSection, setResellerSection] = useState<ResellerSection>("branding");
  const [services,        setServices]        = useState<ServicePrice[]>([]);
  const [pricesLoading,   setPricesLoading]   = useState(false);
  const [pricesQuery,     setPricesQuery]     = useState("");
  const [editedPrices,    setEditedPrices]    = useState<Record<number, string>>({});
  const [pricesSaving,    setPricesSaving]    = useState(false);
  const [pricesSaved,     setPricesSaved]     = useState(false);
  const [pricesError,     setPricesError]     = useState<string | null>(null);

  // ── Load ──────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }

      // Block panel_client users from main TrustMind profile
      if (user.user_metadata?.role === "panel_client" && user.user_metadata?.panel_slug) {
        router.replace(`/panel/${user.user_metadata.panel_slug}/profile`);
        return;
      }

      setUserId(user.id);
      setEmail(user.email || "");
      setDisplayName(user.user_metadata?.full_name || user.email?.split("@")[0] || "");
      setAvatarUrl(user.user_metadata?.avatar_url || "");
      setAvatarPreview(user.user_metadata?.avatar_url || "");
      const provider = user.app_metadata?.provider;
      setIsOAuth(provider === "google" || provider === "github");

      const { data: res } = await supabase
        .from("smm_resellers")
        .select("id, api_key, company_name, panel_name, logo_url, brand_color, description, custom_domain, balance, is_active, slug, hero_title, hero_subtitle, cta_text, cta_secondary_text, whatsapp_number, instagram_url, telegram_url, tiktok_url, facebook_pixel_id, show_features_section, show_plans_section, show_powered_by, domain_verified, domain_verified_at")
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
        // Storefront fields
        setEditHeroTitle(res.hero_title || "");
        setEditHeroSubtitle(res.hero_subtitle || "");
        setEditCtaText(res.cta_text || "Comenzar ahora");
        setEditCtaSecondary(res.cta_secondary_text || "Ya tengo cuenta");
        setEditWhatsapp(res.whatsapp_number || "");
        setEditInstagram(res.instagram_url || "");
        setEditTelegram(res.telegram_url || "");
        setEditTiktok(res.tiktok_url || "");
        setEditFbPixel(res.facebook_pixel_id || "");
        setEditShowFeatures(res.show_features_section !== false);
        setEditShowPlans(res.show_plans_section !== false);
        setEditShowPoweredBy(res.show_powered_by !== false);
        if (res.domain_verified) setDomainStatus("ok");
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

  // ── Save storefront customization ────────────────────────────────────

  const handleSaveStorefront = async () => {
    setStorefrontSaving(true); setStorefrontError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/reseller/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          hero_title: editHeroTitle,
          hero_subtitle: editHeroSubtitle,
          cta_text: editCtaText,
          cta_secondary_text: editCtaSecondary,
          whatsapp_number: editWhatsapp,
          instagram_url: editInstagram,
          telegram_url: editTelegram,
          tiktok_url: editTiktok,
          facebook_pixel_id: editFbPixel,
          show_features_section: editShowFeatures,
          show_plans_section: editShowPlans,
          show_powered_by: editShowPoweredBy,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al guardar");
      setReseller((prev) => prev ? { ...prev, ...json.reseller } : json.reseller);
      setStorefrontSaved(true); setTimeout(() => setStorefrontSaved(false), 2500);
    } catch (err: unknown) {
      setStorefrontError(err instanceof Error ? err.message : "Error al guardar");
    } finally { setStorefrontSaving(false); }
  };

  // ── Auto-provision domain on Vercel + save ──────────────────────────

  const [domainSaving, setDomainSaving] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [domainSaved, setDomainSaved] = useState(false);

  const handleSaveDomain = async () => {
    if (!editDomain.trim()) return;
    setDomainSaving(true); setDomainError(null); setDomainStatus("idle");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      // Auto-add domain to Vercel project + save in DB
      const res = await fetch("/api/reseller/domain", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ domain: editDomain.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al configurar dominio");
      setEditDomain(json.domain || editDomain.trim());
      setDomainSaved(true); setTimeout(() => setDomainSaved(false), 3000);
    } catch (err: unknown) {
      setDomainError(err instanceof Error ? err.message : "Error al guardar dominio");
    } finally { setDomainSaving(false); }
  };

  // ── Check domain DNS via Vercel API ────────────────────────────────

  const handleCheckDomain = async () => {
    if (!editDomain) return;
    setDomainChecking(true); setDomainStatus("idle");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/reseller/domain", {
        headers: { "Authorization": `Bearer ${session?.access_token}` },
      });
      const json = await res.json();
      if (res.ok && json.configured) {
        setDomainStatus("ok");
      } else {
        setDomainStatus("fail");
      }
    } catch {
      setDomainStatus("fail");
    } finally { setDomainChecking(false); }
  };

  // ── Load prices ──────────────────────────────────────────────────────

  const loadPrices = async () => {
    if (services.length > 0) return; // already loaded
    setPricesLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/reseller/prices", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al cargar servicios");
      setServices(json.services ?? []);
      // Pre-fill edited prices with existing reseller rates
      const initial: Record<number, string> = {};
      for (const s of json.services ?? []) {
        if (s.reseller_rate !== null) initial[s.service_id] = String(s.reseller_rate);
      }
      setEditedPrices(initial);
    } catch (err: unknown) {
      setPricesError(err instanceof Error ? err.message : "Error");
    } finally {
      setPricesLoading(false);
    }
  };

  // ── Save prices ───────────────────────────────────────────────────────

  const handleSavePrices = async () => {
    setPricesSaving(true); setPricesError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const svcMap = Object.fromEntries(services.map((s) => [s.service_id, s]));
      const prices = Object.entries(editedPrices)
        .filter(([, v]) => v && parseFloat(v) > 0)
        .map(([id, rate]) => ({
          service_id: Number(id),
          name:       svcMap[Number(id)]?.name ?? "",
          category:   svcMap[Number(id)]?.category ?? "",
          rate:       parseFloat(rate),
        }));
      const res = await fetch("/api/reseller/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ prices }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al guardar");
      setPricesSaved(true); setTimeout(() => setPricesSaved(false), 2500);
    } catch (err: unknown) {
      setPricesError(err instanceof Error ? err.message : "Error al guardar");
    } finally { setPricesSaving(false); }
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

              {/* ── Sub-nav ── */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {([
                  { id: "branding",   icon: <Palette size={13} />,  label: "Marca" },
                  { id: "storefront", icon: <Monitor size={13} />,  label: "Storefront" },
                  { id: "dominio",    icon: <Globe size={13} />,    label: "Dominio" },
                  { id: "precios",    icon: <Tag size={13} />,      label: "Mis precios" },
                  { id: "api",        icon: <Key size={13} />,      label: "API" },
                ] as { id: ResellerSection; icon: React.ReactNode; label: string }[]).map((s) => (
                  <button key={s.id} onClick={() => { setResellerSection(s.id); if (s.id === "precios") loadPrices(); }}
                    style={{ padding: "7px 14px", borderRadius: "9px", fontSize: "12px", fontWeight: 600, cursor: "pointer", border: "1px solid", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "5px", background: resellerSection === s.id ? "#007ABF18" : "transparent", borderColor: resellerSection === s.id ? "#007ABF50" : "#1e1e30", color: resellerSection === s.id ? "#56B4E0" : "#5a6480", transition: "all 0.15s" }}>
                    {s.icon}{s.label}
                  </button>
                ))}
              </div>

              {/* ── Branding editor ── */}
              {resellerSection === "branding" && <div style={{ background: "#0d0d1a", border: "1px solid #1a1a2e", borderRadius: "20px", padding: "28px", display: "flex", flexDirection: "column", gap: "22px" }}>
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
                  <input className="focusable" type="text" value={editDomain} onChange={(e) => setEditDomain(e.target.value)} placeholder="miempresa.com"
                    style={{ width: "100%", background: "#0a0a0f", border: "1px solid #2d2d44", borderRadius: "12px", padding: "12px 16px", color: "white", fontSize: "15px", fontFamily: "inherit", boxSizing: "border-box", transition: "border-color 0.15s" }} />
                  <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#5a6480" }}>
                    Tu dominio propio donde tus clientes verán tu empresa (ej: miempresa.com). Puedes apuntar tu dominio a Trust Mind desde el DNS de tu proveedor.
                  </p>
                </div>

                {brandingError && <div style={{ background: "#f8717115", border: "1px solid #f8717140", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "#f87171" }}>⚠️ {brandingError}</div>}

                <button className="save-btn" onClick={handleSaveBranding} disabled={brandingSaving}
                  style={{ width: "100%", padding: "13px", borderRadius: "13px", border: "none", background: brandingSaved ? "linear-gradient(135deg, #34d399, #059669)" : "linear-gradient(135deg, #007ABF, #005F9E)", color: "white", fontSize: "14px", fontWeight: 700, cursor: brandingSaving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontFamily: "inherit", transition: "all 0.2s" }}>
                  {brandingSaving ? <><div style={{ width: "15px", height: "15px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", animation: "spin 0.7s linear infinite" }} /> Guardando...</> : brandingSaved ? <><Check size={15} /> ¡Cambios guardados!</> : <><Save size={15} /> Guardar configuración</>}
                </button>

                {/* Preview link */}
                {reseller.slug && (
                  <a href={`/panel/${reseller.slug}`} target="_blank" rel="noopener noreferrer"
                    style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "1px solid #2d2d44", background: "#0a0a0f", color: "#94a3b8", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", textDecoration: "none", transition: "all 0.15s", boxSizing: "border-box" }}>
                    <ArrowUpRight size={14} /> Ver mi storefront
                  </a>
                )}
              </div>}

              {/* ── Storefront customization ── */}
              {resellerSection === "storefront" && (
                <div style={{ background: "#0d0d1a", border: "1px solid #1a1a2e", borderRadius: "20px", padding: "28px", display: "flex", flexDirection: "column", gap: "22px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingBottom: "18px", borderBottom: "1px solid #1a1a2e" }}>
                    <Monitor size={16} color="#007ABF" />
                    <span style={{ fontSize: "15px", fontWeight: 700, color: "#f0efff" }}>Personalizar storefront</span>
                  </div>

                  <p style={{ margin: 0, fontSize: "12px", color: "#5a6480", lineHeight: 1.6, background: "#007ABF08", border: "1px solid #007ABF20", borderRadius: "8px", padding: "10px 14px" }}>
                    Personaliza los textos, enlaces y secciones que verán tus clientes en tu tienda web. Los campos vacíos usarán valores por defecto.
                  </p>

                  {/* Hero title */}
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "#8892a4", display: "block", marginBottom: "8px", letterSpacing: "0.5px" }}>
                      TÍTULO PRINCIPAL (Hero)
                    </label>
                    <input className="focusable" type="text" value={editHeroTitle} onChange={(e) => setEditHeroTitle(e.target.value)}
                      placeholder='Ej: Haz crecer tus redes sociales'
                      style={{ width: "100%", background: "#0a0a0f", border: "1px solid #2d2d44", borderRadius: "12px", padding: "12px 16px", color: "white", fontSize: "14px", fontFamily: "inherit", boxSizing: "border-box", transition: "border-color 0.15s" }} />
                    <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#5a6480" }}>Deja vacío para usar el título por defecto</p>
                  </div>

                  {/* Hero subtitle */}
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "#8892a4", display: "block", marginBottom: "8px", letterSpacing: "0.5px" }}>
                      SUBTÍTULO / DESCRIPCIÓN DEL HERO
                    </label>
                    <textarea className="focusable" value={editHeroSubtitle} onChange={(e) => setEditHeroSubtitle(e.target.value)}
                      placeholder="Ej: Los mejores servicios de crecimiento para Instagram, TikTok, YouTube y más."
                      style={{ width: "100%", background: "#0a0a0f", border: "1px solid #2d2d44", borderRadius: "12px", padding: "12px 16px", color: "white", fontSize: "14px", fontFamily: "inherit", boxSizing: "border-box", resize: "none", minHeight: "70px", transition: "border-color 0.15s" }} />
                  </div>

                  {/* CTA buttons */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: 700, color: "#8892a4", display: "block", marginBottom: "8px", letterSpacing: "0.5px" }}>
                        BOTÓN PRINCIPAL (CTA)
                      </label>
                      <input className="focusable" type="text" value={editCtaText} onChange={(e) => setEditCtaText(e.target.value)} placeholder="Comenzar ahora"
                        style={{ width: "100%", background: "#0a0a0f", border: "1px solid #2d2d44", borderRadius: "12px", padding: "12px 16px", color: "white", fontSize: "14px", fontFamily: "inherit", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: 700, color: "#8892a4", display: "block", marginBottom: "8px", letterSpacing: "0.5px" }}>
                        BOTÓN SECUNDARIO
                      </label>
                      <input className="focusable" type="text" value={editCtaSecondary} onChange={(e) => setEditCtaSecondary(e.target.value)} placeholder="Ya tengo cuenta"
                        style={{ width: "100%", background: "#0a0a0f", border: "1px solid #2d2d44", borderRadius: "12px", padding: "12px 16px", color: "white", fontSize: "14px", fontFamily: "inherit", boxSizing: "border-box" }} />
                    </div>
                  </div>

                  {/* Social links */}
                  <div style={{ borderTop: "1px solid #1a1a2e", paddingTop: "18px" }}>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "#8892a4", display: "block", marginBottom: "14px", letterSpacing: "0.5px" }}>
                      REDES SOCIALES Y CONTACTO
                    </label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#25D36618", border: "1px solid #25D36630", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <MessageCircle size={16} color="#25D366" />
                        </div>
                        <input className="focusable" type="text" value={editWhatsapp} onChange={(e) => setEditWhatsapp(e.target.value)} placeholder="+51 999 999 999"
                          style={{ flex: 1, background: "#0a0a0f", border: "1px solid #2d2d44", borderRadius: "10px", padding: "10px 14px", color: "white", fontSize: "13px", fontFamily: "inherit", boxSizing: "border-box" }} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#E4405F18", border: "1px solid #E4405F30", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Instagram size={16} color="#E4405F" />
                        </div>
                        <input className="focusable" type="text" value={editInstagram} onChange={(e) => setEditInstagram(e.target.value)} placeholder="https://instagram.com/tu_cuenta"
                          style={{ flex: 1, background: "#0a0a0f", border: "1px solid #2d2d44", borderRadius: "10px", padding: "10px 14px", color: "white", fontSize: "13px", fontFamily: "inherit", boxSizing: "border-box" }} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#0088CC18", border: "1px solid #0088CC30", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Send size={16} color="#0088CC" />
                        </div>
                        <input className="focusable" type="text" value={editTelegram} onChange={(e) => setEditTelegram(e.target.value)} placeholder="https://t.me/tu_canal"
                          style={{ flex: 1, background: "#0a0a0f", border: "1px solid #2d2d44", borderRadius: "10px", padding: "10px 14px", color: "white", fontSize: "13px", fontFamily: "inherit", boxSizing: "border-box" }} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#00f2ea18", border: "1px solid #00f2ea30", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Music2 size={16} color="#00f2ea" />
                        </div>
                        <input className="focusable" type="text" value={editTiktok} onChange={(e) => setEditTiktok(e.target.value)} placeholder="https://tiktok.com/@tu_cuenta"
                          style={{ flex: 1, background: "#0a0a0f", border: "1px solid #2d2d44", borderRadius: "10px", padding: "10px 14px", color: "white", fontSize: "13px", fontFamily: "inherit", boxSizing: "border-box" }} />
                      </div>
                    </div>
                  </div>

                  {/* Facebook Pixel */}
                  <div style={{ borderTop: "1px solid #1a1a2e", paddingTop: "18px" }}>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "#8892a4", display: "block", marginBottom: "14px", letterSpacing: "0.5px" }}>
                      FACEBOOK PIXEL (ADS)
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#4f8ff718", border: "1px solid #4f8ff730", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#4f8ff7"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                      </div>
                      <input className="focusable" type="text" value={editFbPixel} onChange={(e) => setEditFbPixel(e.target.value)} placeholder="Ej: 123456789012345"
                        style={{ flex: 1, background: "#0a0a0f", border: "1px solid #2d2d44", borderRadius: "10px", padding: "10px 14px", color: "white", fontSize: "13px", fontFamily: "monospace", boxSizing: "border-box", letterSpacing: "0.5px" }} />
                    </div>
                    <p style={{ margin: "8px 0 0", fontSize: "11px", color: "#5a6480", lineHeight: 1.5 }}>
                      Ingresa tu Pixel ID de Facebook para rastrear conversiones en tu panel. Lo encuentras en Facebook Events Manager.
                    </p>
                  </div>

                  {/* Toggles */}
                  <div style={{ borderTop: "1px solid #1a1a2e", paddingTop: "18px" }}>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "#8892a4", display: "block", marginBottom: "14px", letterSpacing: "0.5px" }}>
                      SECCIONES VISIBLES
                    </label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {([
                        { label: "Sección de características", desc: "Muestra las 6 tarjetas de beneficios", value: editShowFeatures, setter: setEditShowFeatures },
                        { label: "Sección de planes", desc: "Muestra tus planes de suscripción", value: editShowPlans, setter: setEditShowPlans },
                        { label: "\"Powered by Trust Mind\"", desc: "Muestra la atribución en el footer", value: editShowPoweredBy, setter: setEditShowPoweredBy },
                      ]).map((toggle) => (
                        <div key={toggle.label} onClick={() => toggle.setter(!toggle.value)}
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "#0a0a0f", border: "1px solid #2d2d44", borderRadius: "10px", cursor: "pointer", transition: "all 0.15s" }}>
                          <div>
                            <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>{toggle.label}</p>
                            <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#5a6480" }}>{toggle.desc}</p>
                          </div>
                          {toggle.value
                            ? <ToggleRight size={28} color="#007ABF" />
                            : <ToggleLeft size={28} color="#3a3a5c" />
                          }
                        </div>
                      ))}
                    </div>
                  </div>

                  {storefrontError && <div style={{ background: "#f8717115", border: "1px solid #f8717140", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "#f87171" }}>⚠️ {storefrontError}</div>}

                  <button className="save-btn" onClick={handleSaveStorefront} disabled={storefrontSaving}
                    style={{ width: "100%", padding: "13px", borderRadius: "13px", border: "none", background: storefrontSaved ? "linear-gradient(135deg, #34d399, #059669)" : "linear-gradient(135deg, #007ABF, #005F9E)", color: "white", fontSize: "14px", fontWeight: 700, cursor: storefrontSaving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontFamily: "inherit", transition: "all 0.2s" }}>
                    {storefrontSaving ? <><div style={{ width: "15px", height: "15px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", animation: "spin 0.7s linear infinite" }} /> Guardando...</> : storefrontSaved ? <><Check size={15} /> ¡Guardado!</> : <><Save size={15} /> Guardar storefront</>}
                  </button>
                </div>
              )}

              {/* ── Domain / DNS Configuration ── */}
              {resellerSection === "dominio" && (
                <div style={{ background: "#0d0d1a", border: "1px solid #1a1a2e", borderRadius: "20px", padding: "28px", display: "flex", flexDirection: "column", gap: "22px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingBottom: "18px", borderBottom: "1px solid #1a1a2e" }}>
                    <Globe size={16} color="#007ABF" />
                    <span style={{ fontSize: "15px", fontWeight: 700, color: "#f0efff" }}>Configuración de dominio</span>
                  </div>

                  {/* Free subdomain (always available) */}
                  <div style={{ background: "#34d39908", border: "1px solid #34d39925", borderRadius: "12px", padding: "16px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <CheckCircle size={14} color="#34d399" />
                      <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: "#34d399", letterSpacing: "0.3px" }}>SUBDOMINIO GRATUITO (activo)</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Link2 size={14} color="#56B4E0" />
                      <a href={`https://${reseller.slug}.trustmind.online`} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: "15px", fontWeight: 600, color: "#56B4E0", wordBreak: "break-all", textDecoration: "none" }}>
                        {reseller.slug}.trustmind.online
                      </a>
                      <button onClick={() => { navigator.clipboard.writeText(`https://${reseller.slug}.trustmind.online`); }}
                        style={{ padding: "4px 8px", borderRadius: "6px", background: "#007ABF18", border: "1px solid #007ABF40", color: "#007ABF", fontSize: "11px", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>
                        <Copy size={10} /> Copiar
                      </button>
                    </div>
                    <p style={{ margin: "8px 0 0", fontSize: "11px", color: "#5a6480" }}>
                      Este subdominio funciona automáticamente. Compártelo con tus clientes.
                    </p>
                  </div>

                  {/* Alt URL */}
                  <div style={{ background: "#007ABF08", border: "1px solid #007ABF15", borderRadius: "10px", padding: "10px 14px" }}>
                    <p style={{ margin: 0, fontSize: "11px", color: "#5a6480" }}>
                      URL alternativa: <a href={`https://trustmind.online/panel/${reseller.slug}`} target="_blank" rel="noopener noreferrer" style={{ color: "#56B4E0", textDecoration: "none" }}>trustmind.online/panel/{reseller.slug}</a>
                    </p>
                  </div>

                  {/* Separator */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ flex: 1, height: "1px", background: "#1e1e30" }} />
                    <span style={{ fontSize: "11px", color: "#3a3a5c", fontWeight: 700 }}>O USA TU PROPIO DOMINIO</span>
                    <div style={{ flex: 1, height: "1px", background: "#1e1e30" }} />
                  </div>

                  {/* Custom domain field */}
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "#8892a4", display: "block", marginBottom: "8px", letterSpacing: "0.5px" }}>
                      <Globe size={11} style={{ display: "inline", marginRight: 5 }} />DOMINIO PERSONALIZADO
                    </label>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input className="focusable" type="text" value={editDomain} onChange={(e) => setEditDomain(e.target.value)} placeholder="miempresa.com"
                        style={{ flex: 1, background: "#0a0a0f", border: "1px solid #2d2d44", borderRadius: "12px", padding: "12px 16px", color: "white", fontSize: "15px", fontFamily: "inherit", boxSizing: "border-box", transition: "border-color 0.15s" }} />
                      <button onClick={handleSaveDomain} disabled={domainSaving || !editDomain.trim()}
                        style={{ padding: "12px 18px", borderRadius: "12px", background: domainSaved ? "linear-gradient(135deg, #34d399, #059669)" : "linear-gradient(135deg, #007ABF, #005F9E)", border: "none", color: "white", fontSize: "13px", fontWeight: 700, cursor: domainSaving ? "not-allowed" : "pointer", whiteSpace: "nowrap", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "6px" }}>
                        {domainSaving ? <><div style={{ width: "13px", height: "13px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", animation: "spin 0.7s linear infinite" }} /></> : domainSaved ? <><Check size={13} /> Listo</> : <><Globe size={13} /> Conectar</>}
                      </button>
                    </div>
                    <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#5a6480" }}>
                      Al guardar, el dominio se vincula automáticamente a tu panel. Solo necesitas configurar el DNS.
                    </p>
                  </div>

                  {domainError && <div style={{ background: "#f8717115", border: "1px solid #f8717140", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "#f87171" }}>⚠️ {domainError}</div>}

                  {/* DNS Instructions — only after domain is saved */}
                  {editDomain && (
                    <div style={{ background: "#0a0a0f", border: "1px solid #2d2d44", borderRadius: "14px", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Info size={16} color="#fbbf24" />
                        <span style={{ fontSize: "14px", fontWeight: 700, color: "#fbbf24" }}>Configura tu DNS</span>
                      </div>

                      <div style={{ background: "#34d39910", border: "1px solid #34d39925", borderRadius: "10px", padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
                        <CheckCircle size={15} color="#34d399" style={{ marginTop: 1, flexShrink: 0 }} />
                        <p style={{ margin: 0, fontSize: "12px", color: "#34d399", lineHeight: 1.6 }}>
                          <b>{editDomain}</b> ya fue registrado en nuestro servidor. Ahora solo falta que apuntes tu DNS.
                        </p>
                      </div>

                      <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8", lineHeight: 1.7 }}>
                        Ve al panel de tu proveedor de dominio (GoDaddy, Namecheap, Cloudflare, etc.) y agrega estos registros:
                      </p>

                      {/* DNS Table */}
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                          <thead>
                            <tr>
                              <th style={{ padding: "8px 10px", textAlign: "left", color: "#8892a4", borderBottom: "1px solid #1e1e30", fontWeight: 700, fontSize: "10px", letterSpacing: "0.5px" }}>TIPO</th>
                              <th style={{ padding: "8px 10px", textAlign: "left", color: "#8892a4", borderBottom: "1px solid #1e1e30", fontWeight: 700, fontSize: "10px", letterSpacing: "0.5px" }}>NOMBRE</th>
                              <th style={{ padding: "8px 10px", textAlign: "left", color: "#8892a4", borderBottom: "1px solid #1e1e30", fontWeight: 700, fontSize: "10px", letterSpacing: "0.5px" }}>VALOR</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td style={{ padding: "8px 10px", borderBottom: "1px solid #1e1e30" }}><code style={{ background: "#007ABF18", padding: "2px 8px", borderRadius: "4px", color: "#56B4E0" }}>A</code></td>
                              <td style={{ padding: "8px 10px", color: "#e2e8f0", borderBottom: "1px solid #1e1e30" }}>@</td>
                              <td style={{ padding: "8px 10px", color: "#fbbf24", borderBottom: "1px solid #1e1e30", fontFamily: "monospace" }}>76.76.21.21</td>
                            </tr>
                            <tr>
                              <td style={{ padding: "8px 10px", borderBottom: "1px solid #1e1e30" }}><code style={{ background: "#8B5CF618", padding: "2px 8px", borderRadius: "4px", color: "#a78bfa" }}>CNAME</code></td>
                              <td style={{ padding: "8px 10px", color: "#e2e8f0", borderBottom: "1px solid #1e1e30" }}>www</td>
                              <td style={{ padding: "8px 10px", color: "#fbbf24", borderBottom: "1px solid #1e1e30", fontFamily: "monospace" }}>cname.vercel-dns.com</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <p style={{ margin: 0, fontSize: "12px", color: "#5a6480", lineHeight: 1.6 }}>
                        Los cambios de DNS pueden tardar entre <b style={{ color: "#94a3b8" }}>5 minutos y 48 horas</b>. Normalmente es menos de 30 minutos.
                      </p>

                      {/* Cloudflare note */}
                      <div style={{ background: "#F4810008", border: "1px solid #F4810020", borderRadius: "10px", padding: "12px 14px" }}>
                        <p style={{ margin: 0, fontSize: "12px", color: "#F48100", lineHeight: 1.6 }}>
                          <b>Si usas Cloudflare:</b> desactiva el proxy (nube naranja) y usa solo DNS (nube gris). Esto evita conflictos con el SSL.
                        </p>
                      </div>

                      {/* Verify button */}
                      <button onClick={handleCheckDomain} disabled={domainChecking}
                        style={{ width: "100%", padding: "12px", borderRadius: "12px", border: `1px solid ${domainStatus === "ok" ? "#34d39940" : domainStatus === "fail" ? "#f8717140" : "#2d2d44"}`, background: domainStatus === "ok" ? "#34d39910" : domainStatus === "fail" ? "#f8717110" : "#0a0a0f", color: domainStatus === "ok" ? "#34d399" : domainStatus === "fail" ? "#f87171" : "#94a3b8", fontSize: "13px", fontWeight: 600, cursor: domainChecking ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontFamily: "inherit", transition: "all 0.15s" }}>
                        {domainChecking ? (
                          <><div style={{ width: "14px", height: "14px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", animation: "spin 0.7s linear infinite" }} /> Verificando DNS...</>
                        ) : domainStatus === "ok" ? (
                          <><CheckCircle size={14} /> DNS configurado correctamente — tu dominio está activo</>
                        ) : domainStatus === "fail" ? (
                          <><XCircle size={14} /> DNS aún no apunta a Trust Mind — revisa la configuración</>
                        ) : (
                          <><Globe size={14} /> Verificar que mi DNS está configurado</>
                        )}
                      </button>
                    </div>
                  )}

                  {!editDomain && (
                    <div style={{ background: "#0a0a0f", border: "1px solid #2d2d44", borderRadius: "12px", padding: "24px", textAlign: "center" }}>
                      <Globe size={32} color="#3a3a5c" style={{ marginBottom: 12 }} />
                      <p style={{ margin: "0 0 6px", fontSize: "14px", fontWeight: 600, color: "#5a6480" }}>Sin dominio configurado</p>
                      <p style={{ margin: 0, fontSize: "12px", color: "#3a3a5c", lineHeight: 1.6 }}>
                        Ingresa un dominio arriba para ver las instrucciones de configuración. Mientras tanto, tus clientes pueden acceder por la URL directa.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Prices editor ── */}
              {resellerSection === "precios" && (
                <div style={{ background: "#0d0d1a", border: "1px solid #1a1a2e", borderRadius: "20px", padding: "28px", display: "flex", flexDirection: "column", gap: "18px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <Tag size={16} color="#007ABF" />
                      <span style={{ fontSize: "15px", fontWeight: 700, color: "#f0efff" }}>Mis precios</span>
                    </div>
                    <button onClick={() => { setServices([]); loadPrices(); }} disabled={pricesLoading}
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: "#5a6480", display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", fontFamily: "inherit" }}>
                      <RefreshCw size={12} style={{ animation: pricesLoading ? "spin 0.8s linear infinite" : "none" }} /> Actualizar
                    </button>
                  </div>

                  <p style={{ margin: 0, fontSize: "12px", color: "#5a6480", lineHeight: 1.6, background: "#007ABF08", border: "1px solid #007ABF20", borderRadius: "8px", padding: "10px 14px" }}>
                    Establece el precio que cobrarás a tus clientes por cada servicio. Deja en blanco para usar el precio base. El precio que pongas debe ser mayor al precio JAP para cubrir tu margen.
                  </p>

                  {/* Search */}
                  <div style={{ position: "relative" }}>
                    <SearchIcon size={14} color="#5a6480" style={{ position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)" }} />
                    <input className="focusable" type="text" value={pricesQuery} onChange={(e) => setPricesQuery(e.target.value)} placeholder="Buscar servicio... ej. Instagram followers"
                      style={{ width: "100%", background: "#0a0a0f", border: "1px solid #2d2d44", borderRadius: "10px", padding: "10px 14px 10px 34px", color: "white", fontSize: "13px", fontFamily: "inherit", boxSizing: "border-box" }} />
                  </div>

                  {/* Services table */}
                  {pricesLoading ? (
                    <div style={{ padding: "32px", textAlign: "center" }}>
                      <div style={{ width: "24px", height: "24px", borderRadius: "50%", border: "3px solid #007ABF30", borderTopColor: "#56B4E0", animation: "spin 0.8s linear infinite", margin: "0 auto 10px" }} />
                      <p style={{ margin: 0, fontSize: "12px", color: "#5a6480" }}>Cargando servicios...</p>
                    </div>
                  ) : (
                    <div style={{ maxHeight: "420px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                      {services
                        .filter((s) => pricesQuery === "" || s.name.toLowerCase().includes(pricesQuery.toLowerCase()) || s.category.toLowerCase().includes(pricesQuery.toLowerCase()))
                        .slice(0, 200)
                        .map((s) => {
                          const edited = editedPrices[s.service_id] ?? "";
                          const editedNum = parseFloat(edited);
                          const margin = edited && editedNum > s.jap_rate ? ((editedNum - s.jap_rate) / s.jap_rate * 100).toFixed(0) : null;
                          return (
                            <div key={s.service_id} style={{ background: "#09091a", border: `1px solid ${edited && editedNum > 0 ? "#007ABF30" : "#1a1a2e"}`, borderRadius: "10px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</p>
                                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "3px" }}>
                                  <span style={{ fontSize: "10px", background: "#007ABF15", color: "#56B4E0", padding: "1px 7px", borderRadius: "4px" }}>{s.category}</span>
                                  <span style={{ fontSize: "11px", color: "#5a6480" }}>Base: <b style={{ color: "#fbbf24" }}>${s.jap_rate.toFixed(4)}</b></span>
                                  {margin && <span style={{ fontSize: "10px", color: "#34d399", fontWeight: 700 }}>+{margin}%</span>}
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                                <DollarSign size={12} color="#5a6480" />
                                <input type="number" step="0.0001" min="0" value={edited} onChange={(e) => setEditedPrices((p) => ({ ...p, [s.service_id]: e.target.value }))}
                                  placeholder={s.jap_rate.toFixed(4)}
                                  style={{ width: "90px", background: "#0a0a0f", border: `1px solid ${edited ? "#007ABF50" : "#2d2d44"}`, borderRadius: "8px", padding: "6px 10px", color: "white", fontSize: "13px", fontFamily: "inherit", outline: "none" }} />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {pricesError && <div style={{ background: "#f8717115", border: "1px solid #f8717140", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "#f87171" }}>⚠️ {pricesError}</div>}

                  <button className="save-btn" onClick={handleSavePrices} disabled={pricesSaving}
                    style={{ width: "100%", padding: "13px", borderRadius: "12px", border: "none", background: pricesSaved ? "linear-gradient(135deg, #34d399, #059669)" : "linear-gradient(135deg, #007ABF, #005F9E)", color: "white", fontSize: "14px", fontWeight: 700, cursor: pricesSaving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontFamily: "inherit", transition: "all 0.2s" }}>
                    {pricesSaving ? <><div style={{ width: "14px", height: "14px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", animation: "spin 0.7s linear infinite" }} /> Guardando...</> : pricesSaved ? <><Check size={14} /> ¡Precios guardados!</> : <><Save size={14} /> Guardar precios</>}
                  </button>
                </div>
              )}

              {/* ── API key ── */}
              {resellerSection === "api" && (
                <div style={{ background: "#0d0d1a", border: "1px solid #1a1a2e", borderRadius: "20px", padding: "28px", display: "flex", flexDirection: "column", gap: "18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Key size={16} color="#007ABF" />
                    <span style={{ fontSize: "15px", fontWeight: 700, color: "#f0efff" }}>Credenciales API</span>
                  </div>
                  <div>
                    <p style={{ margin: "0 0 10px", fontSize: "11px", color: "#8892a4", letterSpacing: "0.5px", fontWeight: 700 }}>TU API KEY</p>
                    <div style={{ background: "#0a0a0f", border: "1px solid #2d2d44", borderRadius: "10px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
                      <code style={{ fontSize: "12px", color: "#56B4E0", flex: 1, wordBreak: "break-all", letterSpacing: "0.5px" }}>{reseller.api_key}</code>
                      <button onClick={copyKey}
                        style={{ padding: "6px 12px", borderRadius: "8px", background: copiedKey ? "#34d39918" : "#007ABF18", border: `1px solid ${copiedKey ? "#34d39940" : "#007ABF40"}`, color: copiedKey ? "#34d399" : "#007ABF", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", whiteSpace: "nowrap", flexShrink: 0, fontFamily: "inherit" }}>
                        {copiedKey ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
                      </button>
                    </div>
                    <p style={{ margin: "8px 0 0", fontSize: "11px", color: "#5a6480" }}>
                      Endpoint: <code style={{ color: "#56B4E0" }}>https://trustmind.online/api/v2</code>
                    </p>
                  </div>
                </div>
              )}

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
