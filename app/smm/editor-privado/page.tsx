"use client";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────
// Editor Privado — herramienta interna del equipo de edición.
// El editor sube el video en bruto; la Mac de Dante lo edita con
// el pipeline completo (cortes, B-roll, gráficos, SFX, música) y
// el resultado aparece aquí para descargar.
// Acceso: SOLO emails en editor_allowlist (+ admin). No aparece en el nav.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import {
  Clapperboard, Upload, Loader2, Download, RefreshCw, Lock, X, CheckCircle2, AlertTriangle,
} from "lucide-react";

const BUCKET = "editor-privado";
const MAX_MB = 2000;

interface Job {
  id: string; created_at: string; updated_at: string;
  nombre: string; status: string; error: string | null; user_email: string;
}

const STATUS_UI: Record<string, { label: string; color: string }> = {
  subiendo: { label: "Subiendo…", color: "#f59e0b" },
  pendiente: { label: "En cola", color: "#f59e0b" },
  procesando: { label: "Editando…", color: "#22d3ee" },
  listo: { label: "✅ Listo", color: "#22c55e" },
  error: { label: "Error", color: "#ef4444" },
};

export default function EditorPrivadoPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [nombre, setNombre] = useState("");
  const [noMusic, setNoMusic] = useState(false);
  const [noSfx, setNoSfx] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadJobs = useCallback(async () => {
    const res = await fetch("/api/editor-privado/jobs");
    if (res.status === 403) { setAllowed(false); setChecking(false); return; }
    if (res.ok) {
      const d = await res.json();
      setJobs(d.jobs || []);
      setAllowed(true);
    }
    setChecking(false);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/?required=1"); return; }
      loadJobs();
    })();
  }, [router, loadJobs]);

  // refresco automático mientras haya trabajos activos
  useEffect(() => {
    const t = setInterval(() => {
      if (jobs.some((j) => ["pendiente", "procesando", "subiendo"].includes(j.status))) loadJobs();
    }, 15000);
    return () => clearInterval(t);
  }, [jobs, loadJobs]);

  const handleUpload = async () => {
    if (!file || uploading) return;
    setError(null);
    if (file.size > MAX_MB * 1024 * 1024) { setError(`Máximo ${MAX_MB / 1000} GB por video.`); return; }
    setUploading(true);
    setUploadPct(0);
    try {
      const ext = (file.name.split(".").pop() || "mp4").toLowerCase();
      const res = await fetch("/api/editor-privado/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre || file.name.replace(/\.[^.]+$/, ""),
          ext, no_music: noMusic, no_sfx: noSfx,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "No se pudo crear el trabajo");

      setUploadPct(5);
      const { error: upErr } = await supabase.storage.from(BUCKET)
        .uploadToSignedUrl(d.path, d.token, file, { contentType: file.type || "video/mp4" });
      if (upErr) throw new Error(`Subida falló: ${upErr.message}`);
      setUploadPct(95);

      const cRes = await fetch(`/api/editor-privado/jobs/${d.jobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirmar" }),
      });
      if (!cRes.ok) throw new Error("No se pudo encolar el trabajo");
      setUploadPct(100);
      setFile(null);
      setNombre("");
      await loadJobs();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (id: string) => {
    const res = await fetch(`/api/editor-privado/jobs/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "descargar" }),
    });
    const d = await res.json();
    if (res.ok && d.url) window.location.href = d.url;
    else setError(d.error || "No se pudo descargar");
  };

  const card: React.CSSProperties = { background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: "16px", padding: "24px" };
  const btnPrimary: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: "8px", background: "linear-gradient(135deg, #0ea5e9, #22d3ee)", color: "white", border: "none", borderRadius: "12px", padding: "13px 24px", fontSize: "15px", fontWeight: 700, cursor: "pointer" };

  if (checking) {
    return (
      <div style={{ minHeight: "100vh", background: "#07070e", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={28} color="#22d3ee" style={{ animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#07070e", color: "white", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <style>{`* { box-sizing: border-box; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <main style={{ maxWidth: "760px", margin: "0 auto", padding: "40px 20px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "8px" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg,#0ea5e9,#22d3ee)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Clapperboard size={22} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: 800, margin: 0 }}>Editor Privado</h1>
            <p style={{ fontSize: "13px", color: "#5a6480", margin: 0 }}>
              Sube el video en bruto — sale editado con el pipeline completo de Dante
            </p>
          </div>
        </div>

        {!allowed ? (
          <div style={{ ...card, textAlign: "center", padding: "48px 32px", marginTop: "24px" }}>
            <Lock size={26} color="#22d3ee" style={{ marginBottom: "12px" }} />
            <h2 style={{ fontSize: "17px", fontWeight: 800, margin: "0 0 8px" }}>Herramienta privada</h2>
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>
              Tu cuenta no tiene acceso. Pídele a Dante que autorice tu email.
            </p>
          </div>
        ) : (
          <>
            {/* subir */}
            <div style={{ ...card, marginTop: "24px", marginBottom: "16px" }}>
              <input ref={fileRef} type="file" accept="video/*,.mp4,.mov,.m4v,.webm" style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); e.target.value = ""; }} />
              {!file ? (
                <div onClick={() => fileRef.current?.click()}
                  style={{ cursor: "pointer", textAlign: "center", padding: "30px", border: "2px dashed #2a2a44", borderRadius: "12px" }}>
                  <Upload size={24} color="#22d3ee" style={{ marginBottom: "8px" }} />
                  <div style={{ fontSize: "14px", fontWeight: 700 }}>Elegir video en bruto</div>
                  <div style={{ fontSize: "12px", color: "#5a6480" }}>Dante hablando a cámara — MP4/MOV, hasta {MAX_MB / 1000} GB</div>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                    <span style={{ fontSize: "13px", color: "#c4cadd" }}>🎬 {file.name} ({(file.size / 1048576).toFixed(0)} MB)</span>
                    {!uploading && (
                      <button onClick={() => setFile(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                        <X size={15} color="#ef4444" />
                      </button>
                    )}
                  </div>
                  <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del video (opcional)"
                    disabled={uploading}
                    style={{ width: "100%", background: "#12121f", border: "1px solid #1e1e30", borderRadius: "8px", color: "white", padding: "10px 12px", fontSize: "13px", marginBottom: "12px" }} />
                  <div style={{ display: "flex", gap: "18px", marginBottom: "16px", flexWrap: "wrap" }}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: "7px", fontSize: "13px", color: "#c4cadd", cursor: "pointer" }}>
                      <input type="checkbox" checked={!noMusic} disabled={uploading} onChange={(e) => setNoMusic(!e.target.checked)}
                        style={{ accentColor: "#0ea5e9" }} /> Música de fondo
                    </label>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: "7px", fontSize: "13px", color: "#c4cadd", cursor: "pointer" }}>
                      <input type="checkbox" checked={!noSfx} disabled={uploading} onChange={(e) => setNoSfx(!e.target.checked)}
                        style={{ accentColor: "#0ea5e9" }} /> Efectos de sonido
                    </label>
                  </div>
                  {uploading ? (
                    <div>
                      <div style={{ height: "8px", background: "#12121f", borderRadius: "6px", overflow: "hidden", marginBottom: "6px" }}>
                        <div style={{ height: "100%", width: `${uploadPct}%`, background: "linear-gradient(90deg,#0ea5e9,#22d3ee)", transition: "width 0.4s" }} />
                      </div>
                      <span style={{ fontSize: "12px", color: "#5a6480" }}>Subiendo… no cierres la pestaña</span>
                    </div>
                  ) : (
                    <button onClick={handleUpload} style={btnPrimary}>
                      <Upload size={16} /> Subir y editar
                    </button>
                  )}
                </>
              )}
            </div>

            {error && (
              <div style={{ ...card, borderColor: "#3f1d2e", padding: "12px 16px", marginBottom: "16px", display: "flex", gap: "10px", alignItems: "center" }}>
                <AlertTriangle size={16} color="#ef4444" />
                <span style={{ fontSize: "13px", color: "#fca5a5" }}>{error}</span>
              </div>
            )}

            {/* trabajos */}
            <div style={card}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                <span style={{ fontSize: "15px", fontWeight: 700 }}>Mis videos</span>
                <button onClick={loadJobs} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", color: "#22d3ee", fontSize: "12px" }}>
                  <RefreshCw size={13} /> Actualizar
                </button>
              </div>
              {jobs.length === 0 ? (
                <p style={{ fontSize: "13px", color: "#5a6480", margin: 0 }}>Aún no hay videos. Sube el primero arriba.</p>
              ) : jobs.map((j) => {
                const ui = STATUS_UI[j.status] || { label: j.status, color: "#94a3b8" };
                return (
                  <div key={j.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", padding: "12px", background: "#12121f", border: "1px solid #1e1e30", borderRadius: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#c4cadd" }}>{j.nombre}</div>
                      <div style={{ fontSize: "11px", color: "#5a6480" }}>
                        {new Date(j.created_at).toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        {j.error ? ` — ${j.error}` : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: ui.color }}>
                        {["pendiente", "procesando"].includes(j.status) && <Loader2 size={11} style={{ animation: "spin 1s linear infinite", verticalAlign: "-1px", marginRight: "4px" }} />}
                        {ui.label}
                      </span>
                      {j.status === "listo" && (
                        <button onClick={() => handleDownload(j.id)} style={{ ...btnPrimary, padding: "8px 14px", fontSize: "13px" }}>
                          <Download size={14} /> Descargar
                        </button>
                      )}
                      {j.status === "listo" && <CheckCircle2 size={15} color="#22c55e" />}
                    </div>
                  </div>
                );
              })}
              <p style={{ fontSize: "11px", color: "#3f475e", margin: "10px 0 0" }}>
                ⏱️ La edición corre en la estación de Dante — si está apagada, el video queda en cola.
                Los videos editados se guardan aquí por 7 días.
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
