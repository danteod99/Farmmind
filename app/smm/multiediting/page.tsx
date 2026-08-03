"use client";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────
// Multiediting — genera variaciones únicas de un video (color,
// brillo, contraste, saturación, gamma, hue y volumen) para
// A/B testing y evitar detección de contenido duplicado.
// Procesa 100% en el navegador con ffmpeg.wasm (self-hosted en
// /public/ffmpeg — el CSP bloquea CDNs externos). Multihilo si
// el browser está cross-origin isolated (headers en next.config).
// Acceso: usuarios Pro (tm_subscriptions tier=pro) o admin.
// Perfiles portados de ~/Desktop/Video Prueba/generar_variaciones.sh
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { isAdmin } from "@/app/lib/admin";
import { SmmNav } from "@/app/components/SmmNav";
import type { FFmpeg } from "@ffmpeg/ffmpeg";
import {
  Clapperboard, Lock, Upload, X, Download, Trash2, Loader2,
  CheckCircle2, AlertTriangle, MessageCircle, Sparkles,
} from "lucide-react";

// 10 perfiles de variación: brightness contrast saturation gamma volume hue
const PROFILES = [
  { br: 0.00, co: 1.00, sa: 1.00, ga: 1.00, vo: 1.00, hue: 0 },
  { br: 0.04, co: 1.06, sa: 1.12, ga: 0.94, vo: 0.94, hue: 3 },
  { br: -0.04, co: 0.94, sa: 0.88, ga: 1.06, vo: 1.06, hue: -3 },
  { br: 0.06, co: 1.10, sa: 0.82, ga: 1.09, vo: 0.88, hue: 5 },
  { br: -0.06, co: 0.90, sa: 1.18, ga: 0.91, vo: 1.12, hue: -5 },
  { br: 0.02, co: 1.04, sa: 1.06, ga: 1.02, vo: 0.96, hue: 2 },
  { br: -0.02, co: 0.97, sa: 0.94, ga: 0.98, vo: 1.04, hue: -2 },
  { br: 0.05, co: 1.08, sa: 1.09, ga: 0.88, vo: 0.91, hue: 4 },
  { br: -0.03, co: 0.92, sa: 0.91, ga: 1.12, vo: 1.09, hue: -4 },
  { br: 0.01, co: 1.03, sa: 1.14, ga: 0.96, vo: 1.02, hue: 1 },
];

const MAX_FILE_MB = 200;
const MAX_VARIATIONS = 50;
const WA_MULTIEDITING = `https://wa.me/51931119176?text=${encodeURIComponent(
  "Hola! Quiero activar la herramienta Multiediting de TrustMind 🎬"
)}`;

// Variaciones 11+: perfiles generados determinísticamente (hash seno) dentro
// de los mismos rangos seguros que los 10 perfiles base calibrados a mano.
function hashRand(i: number, salt: number) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}
function getProfile(i: number) {
  if (i < PROFILES.length) return PROFILES[i];
  const r = (salt: number, min: number, max: number, dec = 2) =>
    parseFloat((min + hashRand(i, salt) * (max - min)).toFixed(dec));
  return {
    br: r(1, -0.06, 0.06),
    co: r(2, 0.90, 1.10),
    sa: r(3, 0.82, 1.18),
    ga: r(4, 0.88, 1.12),
    vo: r(5, 0.88, 1.12),
    hue: r(6, -5, 5, 1),
  };
}

// File System Access API (Chrome/Edge): guardar directo en una carpeta elegida
interface DirWritable { write: (b: Blob) => Promise<void>; close: () => Promise<void> }
interface DirFileHandle { createWritable: () => Promise<DirWritable> }
interface DirHandle { name: string; getFileHandle: (name: string, opts: { create: boolean }) => Promise<DirFileHandle> }

interface ResultItem { name: string; url: string; sizeMB: string; saved?: boolean }
interface VideoResult { source: string; items: ResultItem[] }

function fmtMB(bytes: number) { return (bytes / (1024 * 1024)).toFixed(1) + " MB"; }

export default function MultieditingPage() {
  const router = useRouter();

  // ── auth / gating ──
  const [checking, setChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [balance, setBalance] = useState(0);
  const [userName, setUserName] = useState("");
  const [userAvatar, setUserAvatar] = useState("");
  const [userEmail, setUserEmail] = useState("");

  // ── tool state ──
  const [files, setFiles] = useState<File[]>([]);
  const [numVars, setNumVars] = useState(5);
  const [running, setRunning] = useState(false);
  const [engineStatus, setEngineStatus] = useState<"idle" | "loading" | "ready">("idle");
  const [statusLine, setStatusLine] = useState("");
  const [overallPct, setOverallPct] = useState(0);
  const [results, setResults] = useState<VideoResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dirHandle, setDirHandle] = useState<DirHandle | null>(null);
  const fsSupported = typeof window !== "undefined" && "showDirectoryPicker" in window;

  const pickFolder = async () => {
    try {
      const picker = (window as unknown as { showDirectoryPicker?: (opts?: { mode?: string }) => Promise<DirHandle> }).showDirectoryPicker;
      if (!picker) return;
      const handle = await picker({ mode: "readwrite" });
      setDirHandle(handle);
    } catch { /* usuario canceló el picker */ }
  };

  const ffmpegRef = useRef<FFmpeg | null>(null);
  const cancelRef = useRef(false);
  const execRatioRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/?required=1"); return; }
        setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuario");
        setUserAvatar(user.user_metadata?.avatar_url || "");
        setUserEmail(user.email || "");

        if (isAdmin(user.email)) {
          setHasAccess(true);
        } else {
          try {
            const { data: subs } = await supabase
              .from("tm_subscriptions")
              .select("tier, expires_at")
              .eq("user_id", user.id)
              .eq("tier", "pro");
            const active = (subs || []).some(
              (s) => !s.expires_at || new Date(s.expires_at).getTime() > Date.now()
            );
            setHasAccess(active);
          } catch (e) {
            console.error("[multiediting] error verificando suscripcion:", e);
            setHasAccess(false);
          }
        }

        // El saldo es secundario: si falla, no debe bloquear la pantalla.
        try {
          const res = await fetch("/api/smm/orders");
          if (res.ok) { const d = await res.json(); setBalance(d.balance || 0); }
        } catch (e) {
          console.error("[multiediting] error obteniendo saldo:", e);
        }
      } catch (e) {
        console.error("[multiediting] error de inicializacion:", e);
      } finally {
        // Pase lo que pase, dejamos de mostrar el spinner para no colgar la pantalla.
        setChecking(false);
      }
    })();
  }, [router]);

  // Liberar blobs al desmontar
  useEffect(() => () => {
    results.forEach((v) => v.items.forEach((i) => URL.revokeObjectURL(i.url)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = (list: FileList | File[]) => {
    setError(null);
    const incoming = Array.from(list).filter((f) => f.type.startsWith("video/") || /\.(mp4|mov|m4v|webm)$/i.test(f.name));
    if (incoming.length === 0) { setError("Solo se aceptan archivos de video (MP4, MOV, WebM)."); return; }
    const tooBig = incoming.find((f) => f.size > MAX_FILE_MB * 1024 * 1024);
    if (tooBig) { setError(`"${tooBig.name}" pesa ${fmtMB(tooBig.size)} — el máximo es ${MAX_FILE_MB} MB. Usa clips cortos.`); return; }
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...incoming.filter((f) => !names.has(f.name))];
    });
  };

  const getFFmpeg = useCallback(async (): Promise<FFmpeg> => {
    if (ffmpegRef.current) return ffmpegRef.current;
    setEngineStatus("loading");
    setStatusLine("Descargando motor de video (~31 MB, solo la primera vez)...");
    const { FFmpeg: FFmpegClass } = await import("@ffmpeg/ffmpeg");

    const mt = typeof SharedArrayBuffer !== "undefined" && typeof self !== "undefined" && self.crossOriginIsolated;

    const tryLoad = async (multi: boolean): Promise<FFmpeg> => {
      const ffmpeg = new FFmpegClass();
      ffmpeg.on("progress", ({ progress }) => { execRatioRef.current = Math.max(0, Math.min(1, progress)); });
      const base = multi ? "/ffmpeg/core-mt" : "/ffmpeg/core";
      await ffmpeg.load({
        coreURL: `${base}/ffmpeg-core.js`,
        wasmURL: `${base}/ffmpeg-core.wasm`,
        ...(multi ? { workerURL: `${base}/ffmpeg-core.worker.js` } : {}),
      });
      return ffmpeg;
    };

    let ffmpeg: FFmpeg;
    try {
      ffmpeg = await tryLoad(mt);
    } catch (e) {
      if (mt) {
        // El motor multi-hilo puede fallar por headers COEP o el worker →
        // caemos automaticamente al modo compatible (single-thread) en vez de romper.
        console.warn("[multiediting] fallo el motor multi-hilo, usando modo compatible:", e);
        setStatusLine("Cargando motor de video (modo compatible)...");
        ffmpeg = await tryLoad(false);
      } else {
        throw e;
      }
    }
    ffmpegRef.current = ffmpeg;
    setEngineStatus("ready");
    return ffmpeg;
  }, []);

  const handleGenerate = async () => {
    if (files.length === 0 || running) return;
    setRunning(true);
    setError(null);
    setResults([]);
    setOverallPct(0);
    cancelRef.current = false;

    const totalJobs = files.length * numVars;
    let jobsDone = 0;
    // Barra de progreso global (se actualiza con el ratio del exec en curso)
    const tick = setInterval(() => {
      setOverallPct(Math.round(((jobsDone + execRatioRef.current) / totalJobs) * 100));
    }, 500);

    try {
      const ffmpeg = await getFFmpeg();

      for (let fi = 0; fi < files.length; fi++) {
        if (cancelRef.current) break;
        const file = files[fi];
        const baseName = file.name.replace(/\.[^.]+$/, "");
        const videoResult: VideoResult = { source: file.name, items: [] };

        setStatusLine(`Cargando "${file.name}" en memoria...`);
        const buf = new Uint8Array(await file.arrayBuffer());
        await ffmpeg.writeFile("in.mp4", buf);

        for (let vi = 0; vi < numVars; vi++) {
          if (cancelRef.current) break;
          const p = getProfile(vi);
          execRatioRef.current = 0;
          setStatusLine(`Video ${fi + 1}/${files.length} — variación ${vi + 1}/${numVars} (brillo ${p.br}, contraste ${p.co}, sat ${p.sa}, hue ${p.hue}°)`);

          const vf = `eq=brightness=${p.br}:contrast=${p.co}:saturation=${p.sa}:gamma=${p.ga},hue=h=${p.hue}`;
          const common = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-movflags", "+faststart", "-y", "out.mp4"];
          let code = await ffmpeg.exec(["-i", "in.mp4", "-vf", vf, "-af", `volume=${p.vo}`, "-c:a", "aac", "-b:a", "128k", ...common]);
          if (code !== 0) {
            // Reintento sin filtro de audio (videos sin pista de audio)
            code = await ffmpeg.exec(["-i", "in.mp4", "-vf", vf, "-an", ...common]);
          }
          if (cancelRef.current) break;
          if (code !== 0) throw new Error(`ffmpeg falló en la variación ${vi + 1} de "${file.name}"`);

          const data = (await ffmpeg.readFile("out.mp4")) as Uint8Array;
          const copy = new Uint8Array(data); // copia fuera del heap wasm
          const blob = new Blob([copy.buffer as ArrayBuffer], { type: "video/mp4" });
          const outName = `${baseName}_v${vi + 1}.mp4`;
          if (dirHandle) {
            // Guardar directo en la carpeta elegida (no retener blob en RAM)
            const fh = await dirHandle.getFileHandle(outName, { create: true });
            const w = await fh.createWritable();
            await w.write(blob);
            await w.close();
            videoResult.items.push({ name: outName, url: "", sizeMB: fmtMB(blob.size), saved: true });
          } else {
            videoResult.items.push({ name: outName, url: URL.createObjectURL(blob), sizeMB: fmtMB(blob.size) });
          }
          try { await ffmpeg.deleteFile("out.mp4"); } catch { /* noop */ }
          jobsDone++;
          setResults((prev) => {
            const next = prev.filter((r) => r.source !== videoResult.source);
            return [...next, { ...videoResult, items: [...videoResult.items] }];
          });
        }
        try { await ffmpeg.deleteFile("in.mp4"); } catch { /* noop */ }
      }

      setStatusLine(cancelRef.current ? "Cancelado — se conservan las variaciones ya generadas." : "¡Listo! Todas las variaciones fueron generadas.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Error procesando: ${msg}`);
      setStatusLine("");
      // El motor puede quedar en mal estado tras un error → recargar la próxima vez
      try { ffmpegRef.current?.terminate(); } catch { /* noop */ }
      ffmpegRef.current = null;
      setEngineStatus("idle");
    } finally {
      clearInterval(tick);
      setOverallPct((prev) => (cancelRef.current ? prev : 100));
      setRunning(false);
    }
  };

  const handleCancel = () => {
    cancelRef.current = true;
    setStatusLine("Cancelando al terminar la variación en curso...");
  };

  const downloadAll = async () => {
    const all = results.flatMap((v) => v.items).filter((i) => i.url);
    for (const item of all) {
      const a = document.createElement("a");
      a.href = item.url;
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      await new Promise((r) => setTimeout(r, 450));
    }
  };

  const clearResults = () => {
    results.forEach((v) => v.items.forEach((i) => URL.revokeObjectURL(i.url)));
    setResults([]);
    setOverallPct(0);
    setStatusLine("");
  };

  const NAV_LINKS = [
    { href: "/smm/services", label: "Servicios" },
    { href: "/smm/funds", label: "Recargar" },
    { href: "/cursos", label: "Mis Cursos" },
    { href: "/granjas", label: "Granjas" },
    { href: "/downloads", label: "Descargas" },
    { href: "/smm/multiediting", label: "Multiediting", active: true },
    { href: "/smm/ai", label: "Asistente IA" },
    { href: "https://www.scalinglatam.site", label: "Scaling Latam", external: true },
  ];

  const card: React.CSSProperties = { background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: "16px", padding: "24px" };
  const btnPrimary: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: "8px", background: "linear-gradient(135deg, #7c3aed, #a78bfa)", color: "white", border: "none", borderRadius: "12px", padding: "13px 24px", fontSize: "15px", fontWeight: 700, cursor: "pointer" };
  const btnGhost: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: "6px", background: "#12121f", color: "#94a3b8", border: "1px solid #1e1e30", borderRadius: "10px", padding: "9px 16px", fontSize: "13px", fontWeight: 600, cursor: "pointer" };

  if (checking) {
    return (
      <div style={{ minHeight: "100vh", background: "#07070e", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={28} color="#a78bfa" style={{ animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#07070e", color: "white", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .me-var-card:hover { border-color: #7c3aed !important; }
      `}</style>
      <SmmNav balance={balance} userAvatar={userAvatar} userName={userName} userEmail={userEmail} links={NAV_LINKS} />

      <main style={{ maxWidth: "920px", margin: "0 auto", padding: "32px 20px 80px" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "6px" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg,#7c3aed,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Clapperboard size={22} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: 800, letterSpacing: "-0.5px", margin: 0 }}>Multiediting</h1>
            <p style={{ fontSize: "13px", color: "#5a6480", margin: 0 }}>
              Genera hasta 10 variaciones únicas de cada video — color, brillo, contraste, saturación, hue y volumen
            </p>
          </div>
        </div>
        <p style={{ fontSize: "12px", color: "#3f475e", margin: "0 0 28px 58px" }}>
          Ideal para A/B testing y para publicar el mismo contenido en múltiples cuentas sin detección de duplicados.
          🔒 Se procesa 100% en tu navegador: tus videos nunca se suben a ningún servidor.
        </p>

        {!hasAccess ? (
          /* ── LOCKED ── */
          <div style={{ ...card, textAlign: "center", padding: "48px 32px" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#12121f", border: "1px solid #2a2a44", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
              <Lock size={26} color="#a78bfa" />
            </div>
            <h2 style={{ fontSize: "19px", fontWeight: 800, margin: "0 0 8px" }}>Herramienta exclusiva para usuarios Pro</h2>
            <p style={{ fontSize: "14px", color: "#94a3b8", maxWidth: "460px", margin: "0 auto 6px", lineHeight: 1.6 }}>
              Multiediting viene incluida con tu plan Pro de TrustMind. Actívala y genera variaciones ilimitadas:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxWidth: "380px", margin: "18px auto 26px", textAlign: "left" }}>
              {[
                "Hasta 10 variaciones únicas por video",
                "Evita la detección de contenido duplicado",
                "Procesa varios videos en lote",
                "Privado: nada se sube a servidores",
              ].map((t) => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "#c4cadd" }}>
                  <Sparkles size={14} color="#a78bfa" /> {t}
                </div>
              ))}
            </div>
            <a href={WA_MULTIEDITING} target="_blank" rel="noopener noreferrer" style={{ ...btnPrimary, background: "linear-gradient(135deg,#16a34a,#22c55e)", textDecoration: "none" }}>
              <MessageCircle size={18} /> Activar por WhatsApp
            </a>
          </div>
        ) : (
          /* ── TOOL ── */
          <>
            {/* dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
              style={{
                ...card, cursor: "pointer", textAlign: "center", padding: "36px 24px", marginBottom: "16px",
                border: dragOver ? "2px dashed #a78bfa" : "2px dashed #2a2a44",
                background: dragOver ? "#12102a" : "#0d0d18", transition: "all 0.15s",
              }}
            >
              <input ref={fileInputRef} type="file" accept="video/*,.mp4,.mov,.m4v,.webm" multiple style={{ display: "none" }}
                onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
              <Upload size={26} color="#a78bfa" style={{ marginBottom: "10px" }} />
              <div style={{ fontSize: "15px", fontWeight: 700, marginBottom: "4px" }}>Arrastra tus videos aquí o haz click para elegirlos</div>
              <div style={{ fontSize: "12px", color: "#5a6480" }}>MP4, MOV o WebM — máx {MAX_FILE_MB} MB por video. Clips cortos = más rápido.</div>
            </div>

            {/* selected files */}
            {files.length > 0 && (
              <div style={{ ...card, padding: "16px 20px", marginBottom: "16px" }}>
                {files.map((f) => (
                  <div key={f.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #14141f" }}>
                    <div style={{ fontSize: "13px", color: "#c4cadd", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>🎬 {f.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontSize: "12px", color: "#5a6480" }}>{fmtMB(f.size)}</span>
                      {!running && (
                        <button onClick={() => setFiles((prev) => prev.filter((x) => x.name !== f.name))}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", display: "flex" }}>
                          <X size={15} color="#ef4444" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* variations selector + action */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "14px", paddingTop: "16px" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: "#5a6480", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700, marginBottom: "8px" }}>
                      Variaciones por video: <span style={{ color: "#a78bfa" }}>{numVars}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <input type="range" min={1} max={MAX_VARIATIONS} value={numVars} disabled={running}
                        onChange={(e) => setNumVars(parseInt(e.target.value))}
                        style={{ width: "220px", accentColor: "#7c3aed" }} />
                      <input type="number" min={1} max={MAX_VARIATIONS} value={numVars} disabled={running}
                        onChange={(e) => setNumVars(Math.max(1, Math.min(MAX_VARIATIONS, parseInt(e.target.value) || 1)))}
                        style={{ width: "58px", background: "#12121f", border: "1px solid #1e1e30", borderRadius: "8px", color: "white", padding: "6px 8px", fontSize: "13px", textAlign: "center" }} />
                    </div>
                  </div>
                  {!running ? (
                    <button onClick={handleGenerate} style={btnPrimary}>
                      <Clapperboard size={17} /> Generar {files.length * numVars} variacion{files.length * numVars === 1 ? "" : "es"}
                    </button>
                  ) : (
                    <button onClick={handleCancel} style={{ ...btnGhost, color: "#ef4444", borderColor: "#3f1d2e" }}>
                      <X size={15} /> Cancelar
                    </button>
                  )}
                </div>
                {/* carpeta de destino */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginTop: "14px", paddingTop: "14px", borderTop: "1px solid #14141f" }}>
                  {fsSupported ? (
                    <>
                      <button onClick={pickFolder} disabled={running} style={{ ...btnGhost, color: "#a78bfa", borderColor: "#2a2a44" }}>
                        📂 {dirHandle ? "Cambiar carpeta" : "Elegir carpeta de destino"}
                      </button>
                      <span style={{ fontSize: "12px", color: dirHandle ? "#22c55e" : "#5a6480" }}>
                        {dirHandle
                          ? `✓ Se guardarán automáticamente en "${dirHandle.name}"`
                          : "Opcional — sin elegir, cada variación se descarga con su botón"}
                      </span>
                      {dirHandle && !running && (
                        <button onClick={() => setDirHandle(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", display: "flex" }} title="Quitar carpeta">
                          <X size={14} color="#ef4444" />
                        </button>
                      )}
                    </>
                  ) : (
                    <span style={{ fontSize: "12px", color: "#5a6480" }}>
                      📂 Tu navegador no permite elegir carpeta (usa Chrome o Edge) — las variaciones se descargan a tu carpeta de Descargas.
                    </span>
                  )}
                </div>

                <div style={{ fontSize: "11px", color: "#3f475e", marginTop: "10px" }}>
                  ⏱️ El procesamiento corre en tu computadora (~1-3 min por variación según tu equipo y el largo del clip). Deja la pestaña abierta.
                  {numVars > 15 && <span style={{ color: "#eab308" }}> Con {numVars} variaciones esto puede tardar bastante — considera dejarlo corriendo.</span>}
                </div>
              </div>
            )}

            {/* progress */}
            {(running || engineStatus === "loading") && (
              <div style={{ ...card, padding: "18px 20px", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                  <Loader2 size={16} color="#a78bfa" style={{ animation: "spin 1s linear infinite" }} />
                  <span style={{ fontSize: "13px", color: "#c4cadd" }}>{statusLine}</span>
                </div>
                <div style={{ height: "8px", background: "#12121f", borderRadius: "6px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${overallPct}%`, background: "linear-gradient(90deg,#7c3aed,#a78bfa)", borderRadius: "6px", transition: "width 0.4s" }} />
                </div>
                <div style={{ fontSize: "11px", color: "#5a6480", marginTop: "6px", textAlign: "right" }}>{overallPct}%</div>
              </div>
            )}

            {/* error */}
            {error && (
              <div style={{ ...card, borderColor: "#3f1d2e", padding: "14px 18px", marginBottom: "16px", display: "flex", gap: "10px", alignItems: "center" }}>
                <AlertTriangle size={17} color="#ef4444" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: "13px", color: "#fca5a5" }}>{error}</span>
              </div>
            )}

            {/* results */}
            {results.length > 0 && (
              <div style={{ ...card, marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <CheckCircle2 size={17} color="#22c55e" />
                    <span style={{ fontSize: "15px", fontWeight: 700 }}>
                      {results.reduce((a, v) => a + v.items.length, 0)} variaciones generadas
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {results.some((v) => v.items.some((i) => i.url)) && (
                      <button onClick={downloadAll} style={{ ...btnGhost, color: "#a78bfa", borderColor: "#2a2a44" }}>
                        <Download size={14} /> Descargar todas
                      </button>
                    )}
                    {!running && (
                      <button onClick={clearResults} style={btnGhost}>
                        <Trash2 size={14} /> Limpiar
                      </button>
                    )}
                  </div>
                </div>

                {results.map((v) => (
                  <div key={v.source} style={{ marginBottom: "14px" }}>
                    <div style={{ fontSize: "12px", color: "#5a6480", fontWeight: 600, marginBottom: "8px" }}>📁 {v.source}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "8px" }}>
                      {v.items.map((item) => {
                        const label = item.name.match(/_v\d+\.mp4$/)?.[0].replace(".mp4", "").replace("_", "") || item.name;
                        const cardStyle: React.CSSProperties = { background: "#12121f", border: "1px solid #1e1e30", borderRadius: "10px", padding: "10px 12px", textDecoration: "none", transition: "border-color 0.15s" };
                        const inner = (
                          <>
                            <div style={{ fontSize: "12px", fontWeight: 700, color: "#c4cadd", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <span style={{ fontSize: "11px", color: "#5a6480" }}>{item.sizeMB}</span>
                              {item.saved ? <CheckCircle2 size={13} color="#22c55e" /> : <Download size={13} color="#a78bfa" />}
                            </div>
                          </>
                        );
                        return item.saved ? (
                          <div key={item.name} title="Guardado en la carpeta elegida" style={cardStyle}>{inner}</div>
                        ) : (
                          <a key={item.name} href={item.url} download={item.name} className="me-var-card" style={cardStyle}>{inner}</a>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
