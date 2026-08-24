"use client";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────
// Multiclipping — corta un video largo (podcast, stream, clase,
// entrevista) en múltiples clips cortos, con opción de formato
// vertical 9:16 listo para TikTok / Reels / Shorts.
// Procesa 100% en el navegador con ffmpeg.wasm (self-hosted en
// /public/ffmpeg — el CSP bloquea CDNs externos). Multihilo si
// el browser está cross-origin isolated (headers en next.config).
// Acceso: usuarios Pro (tm_subscriptions tier=pro) o admin.
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { isAdmin } from "@/app/lib/admin";
import { SmmNav } from "@/app/components/SmmNav";
import { ApiKeysCard } from "@/app/components/ApiKeysCard";
import { apiKeyHeaders } from "@/app/lib/apiKeys";
import type { FFmpeg } from "@ffmpeg/ffmpeg";
import {
  Scissors, Lock, Upload, X, Download, Trash2, Loader2,
  CheckCircle2, AlertTriangle, MessageCircle, Sparkles,
} from "lucide-react";

const MAX_FILE_MB = 800;
const MIN_CLIP = 5;
const MAX_CLIP = 300;

// Posiciones del logo (overlay) — coords de ffmpeg con margen de 30px.
const LOGO_POSITIONS: Record<string, { label: string; expr: string }> = {
  tr: { label: "Arriba derecha", expr: "main_w-overlay_w-30:30" },
  tl: { label: "Arriba izquierda", expr: "30:30" },
  br: { label: "Abajo derecha", expr: "main_w-overlay_w-30:main_h-overlay_h-30" },
  bl: { label: "Abajo izquierda", expr: "30:main_h-overlay_h-30" },
};
const WA_MULTICLIPPING = `https://wa.me/51931119176?text=${encodeURIComponent(
  "Hola! Quiero activar la herramienta Multiclipping de TrustMind ✂️"
)}`;

// File System Access API (Chrome/Edge): guardar directo en una carpeta elegida
interface DirWritable { write: (b: Blob) => Promise<void>; close: () => Promise<void> }
interface DirFileHandle { createWritable: () => Promise<DirWritable> }
interface DirHandle { name: string; getFileHandle: (name: string, opts: { create: boolean }) => Promise<DirFileHandle> }

interface ResultItem { name: string; url: string; sizeMB: string; saved?: boolean }
interface VideoResult { source: string; items: ResultItem[] }

// ── Modo IA ──
type ClipMode = "ai" | "uniform";
interface AiSeg { start: number; end: number }
interface AiMoment { start: number; end: number; segments?: AiSeg[]; title: string; hook: string; reason: string; score: number; selected: boolean }
interface AiWord { word: string; start: number; end: number }
interface AiSegment { start: number; end: number; text: string }

// Tramos que componen un clip: varios (unir cortando relleno) o uno solo.
function clipSegs(m: AiMoment): AiSeg[] {
  return (m.segments && m.segments.length) ? m.segments : [{ start: m.start, end: m.end }];
}
// Mapea un tiempo del video ORIGINAL al tiempo dentro del clip ya unido (o null si cae en relleno).
function mapToClip(t: number, segs: AiSeg[]): number | null {
  let acc = 0;
  for (const s of segs) {
    if (t < s.start) return null;
    if (t <= s.end) return acc + (t - s.start);
    acc += s.end - s.start;
  }
  return null;
}

const AI_MAX_MINUTES = 25;

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30) || "clip";
}

function fmtTime(t: number) {
  const m = Math.floor(t / 60); const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Timestamp ASS: H:MM:SS.CC
function assTime(t: number) {
  const cl = Math.max(0, t);
  const h = Math.floor(cl / 3600), m = Math.floor((cl % 3600) / 60), s = Math.floor(cl % 60);
  const cs = Math.floor((cl - Math.floor(cl)) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function assEscape(s: string) {
  return s.replace(/\\/g, "").replace(/[{}]/g, "").replace(/\r?\n/g, " ").trim();
}

// Altura de la franja superior donde va el título (fuera de la imagen del video).
// El video se escala para ocupar el área debajo de la franja (ver baseChain).
const TITLE_BAND_V = 280; // vertical 1080x1920
const TITLE_BAND_H = 140; // horizontal 1920x1080

// Genera el archivo ASS con el título en la franja superior + subtítulos estilo TikTok.
// Los tiempos son relativos al inicio del clip (el corte con -ss resetea a 0).
function buildAss(m: AiMoment, words: AiWord[], segments: AiSegment[], isVertical: boolean, withSubs: boolean): string {
  const W = isVertical ? 1080 : 1920;
  const H = isVertical ? 1920 : 1080;
  const segs = clipSegs(m);
  const clipDur = segs.reduce((a, s) => a + (s.end - s.start), 0);
  const titleSize = isVertical ? 78 : 64;
  const capSize = isVertical ? 64 : 52;
  const capMarginV = isVertical ? 430 : 90;
  // El título se centra dentro de la franja negra superior, no sobre el video.
  const band = isVertical ? TITLE_BAND_V : TITLE_BAND_H;
  const titleMarginV = Math.round((band - titleSize * 1.25) / 2);

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Title,Anton,${titleSize},&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,0,0,0,0,100,100,1,0,1,5,2,8,70,70,${titleMarginV},1
Style: Caption,Anton,${capSize},&H00FFFFFF,&H00FFD3E2,&H00000000,&H96000000,0,0,0,0,100,100,1,0,1,4,2,2,80,80,${capMarginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const lines: string[] = [];
  if (m.title.trim()) {
    lines.push(`Dialogue: 1,${assTime(0)},${assTime(clipDur)},Title,,0,0,0,,${assEscape(m.title.toUpperCase())}`);
  }

  if (withSubs) {
    // Agrupa palabras en frases cortas (máx 4 palabras o ~1.8s) para el estilo TikTok.
    // Los tiempos se remapean por los tramos unidos (mapToClip): las palabras que
    // caen en el relleno saltado se descartan.
    const inRange = words.filter((w) => mapToClip(w.start, segs) !== null);
    if (inRange.length > 0) {
      let chunk: AiWord[] = [];
      const flush = () => {
        if (chunk.length === 0) return;
        const st = mapToClip(chunk[0].start, segs);
        const en = mapToClip(chunk[chunk.length - 1].end, segs);
        const text = assEscape(chunk.map((w) => w.word).join(" ").toUpperCase());
        if (st !== null && en !== null && en > st) lines.push(`Dialogue: 0,${assTime(st)},${assTime(en)},Caption,,0,0,0,,${text}`);
        chunk = [];
      };
      for (const w of inRange) {
        chunk.push(w);
        const span = w.end - chunk[0].start;
        if (chunk.length >= 4 || span >= 1.8 || /[.!?…]$/.test(w.word)) flush();
      }
      flush();
    } else {
      // Sin timestamps por palabra: usa los segmentos completos como subtítulo.
      for (const s of segments) {
        const st = mapToClip(s.start, segs);
        const en = mapToClip(s.end, segs);
        const text = assEscape(s.text.toUpperCase());
        if (st !== null && en !== null && en > st) lines.push(`Dialogue: 0,${assTime(st)},${assTime(en)},Caption,,0,0,0,,${text}`);
      }
    }
  }

  return header + lines.join("\n") + "\n";
}

function fmtMB(bytes: number) { return (bytes / (1024 * 1024)).toFixed(1) + " MB"; }

export default function MulticlippingPage() {
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
  const [clipSeconds, setClipSeconds] = useState(30);
  const [vertical, setVertical] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPos, setLogoPos] = useState("tr");
  const [running, setRunning] = useState(false);
  const [engineStatus, setEngineStatus] = useState<"idle" | "loading" | "ready">("idle");
  const [statusLine, setStatusLine] = useState("");
  const [overallPct, setOverallPct] = useState(0);
  const [results, setResults] = useState<VideoResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dirHandle, setDirHandle] = useState<DirHandle | null>(null);
  const fsSupported = typeof window !== "undefined" && "showDirectoryPicker" in window;

  // ── modo IA ──
  const [mode, setMode] = useState<ClipMode>("ai");
  const [analyzing, setAnalyzing] = useState(false);
  const [moments, setMoments] = useState<AiMoment[] | null>(null);
  const [aiWords, setAiWords] = useState<AiWord[]>([]);
  const [aiSegments, setAiSegments] = useState<AiSegment[]>([]);
  const [aiFileName, setAiFileName] = useState("");
  const [subsOn, setSubsOn] = useState(true);
  const [titleOn, setTitleOn] = useState(true);

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
  const logoInputRef = useRef<HTMLInputElement>(null);

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
            console.error("[multiclipping] error verificando suscripcion:", e);
            setHasAccess(false);
          }
        }

        try {
          const res = await fetch("/api/smm/orders");
          if (res.ok) { const d = await res.json(); setBalance(d.balance || 0); }
        } catch (e) {
          console.error("[multiclipping] error obteniendo saldo:", e);
        }
      } catch (e) {
        console.error("[multiclipping] error de inicializacion:", e);
      } finally {
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
    if (tooBig) { setError(`"${tooBig.name}" pesa ${fmtMB(tooBig.size)} — el máximo es ${MAX_FILE_MB} MB.`); return; }
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...incoming.filter((f) => !names.has(f.name))];
    });
  };

  const prefetchWasm = async (url: string, label: string) => {
    try {
      const res = await fetch(url);
      if (!res.ok || !res.body) return;
      const total = parseInt(res.headers.get("content-length") || "0", 10);
      const reader = res.body.getReader();
      let recv = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        recv += value?.length || 0;
        const mb = (recv / 1048576).toFixed(0);
        if (total) {
          setStatusLine(`${label} ${Math.min(100, Math.round((recv / total) * 100))}% (${mb}/${(total / 1048576).toFixed(0)} MB)`);
        } else {
          setStatusLine(`${label} ${mb} MB...`);
        }
      }
    } catch (e) {
      console.warn("[multiclipping] prefetch fallo:", e);
    }
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
      await prefetchWasm(`${base}/ffmpeg-core.wasm`, "Descargando motor de video...");
      setStatusLine(`Iniciando motor de video (${multi ? "multihilo" : "modo compatible"})...`);
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const loadPromise = ffmpeg.load({
        classWorkerURL: `${origin}/ffmpeg/esm/worker.js`,
        coreURL: `${origin}${base}/ffmpeg-core.js`,
        wasmURL: `${origin}${base}/ffmpeg-core.wasm`,
        ...(multi ? { workerURL: `${origin}${base}/ffmpeg-core.worker.js` } : {}),
      });
      const timeout = new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error("timeout cargando el motor")), 60000));
      await Promise.race([loadPromise, timeout]);
      return ffmpeg;
    };

    let ffmpeg: FFmpeg;
    try {
      ffmpeg = await tryLoad(mt);
    } catch (e) {
      if (mt) {
        console.warn("[multiclipping] fallo el motor multi-hilo, usando modo compatible:", e);
        setStatusLine("Cargando motor de video (modo compatible)...");
        ffmpeg = await tryLoad(false);
      } else {
        setEngineStatus("idle");
        throw new Error("No se pudo cargar el motor de video. Recarga la página (Cmd+Shift+R) e intenta de nuevo.");
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

    const totalJobs = files.length;
    let jobsDone = 0;
    const tick = setInterval(() => {
      setOverallPct(Math.round(((jobsDone + execRatioRef.current) / totalJobs) * 100));
    }, 500);

    const cleanSegments = async (ffmpeg: FFmpeg) => {
      try {
        const entries = await ffmpeg.listDir("/");
        for (const e of entries) {
          if (!e.isDir && /^clip_\d+\.mp4$/.test(e.name)) { try { await ffmpeg.deleteFile(e.name); } catch { /* noop */ } }
        }
      } catch { /* noop */ }
    };

    try {
      const ffmpeg = await getFFmpeg();
      const segTime = String(clipSeconds);

      // Logo (marca de agua): se escribe una sola vez y se reutiliza en todos los clips.
      const hasLogo = !!logoFile;
      if (hasLogo && logoFile) {
        const lbuf = new Uint8Array(await logoFile.arrayBuffer());
        await ffmpeg.writeFile("logo.png", lbuf);
      }

      for (let fi = 0; fi < files.length; fi++) {
        if (cancelRef.current) break;
        const file = files[fi];
        const baseName = file.name.replace(/\.[^.]+$/, "");
        const videoResult: VideoResult = { source: file.name, items: [] };

        setStatusLine(`Cargando "${file.name}" en memoria...`);
        const buf = new Uint8Array(await file.arrayBuffer());
        await ffmpeg.writeFile("in.mp4", buf);
        await cleanSegments(ffmpeg);

        execRatioRef.current = 0;
        setStatusLine(`Video ${fi + 1}/${files.length} — cortando en clips de ${clipSeconds}s${vertical ? " (vertical 9:16)" : ""}${hasLogo ? " + logo" : ""}...`);

        let code: number;
        if (hasLogo) {
          // Overlay del logo (re-codifica). Base vertical 9:16 opcional.
          const baseChain = vertical ? "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" : "null";
          const pos = (LOGO_POSITIONS[logoPos] || LOGO_POSITIONS.tr).expr;
          const fc = `[0:v]${baseChain}[bg];[1:v]scale=200:-1[wm];[bg][wm]overlay=${pos}[v]`;
          code = await ffmpeg.exec([
            "-i", "in.mp4", "-i", "logo.png",
            "-filter_complex", fc, "-map", "[v]", "-map", "0:a?",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
            "-c:a", "aac", "-b:a", "128k",
            "-f", "segment", "-segment_time", segTime, "-reset_timestamps", "1",
            "-y", "clip_%03d.mp4",
          ]);
        } else if (vertical) {
          // Rellena a 9:16 (1080x1920) escalando y recortando al centro, y re-codifica en segmentos.
          const vf = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920";
          code = await ffmpeg.exec([
            "-i", "in.mp4", "-vf", vf,
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
            "-c:a", "aac", "-b:a", "128k",
            "-f", "segment", "-segment_time", segTime, "-reset_timestamps", "1",
            "-y", "clip_%03d.mp4",
          ]);
        } else {
          // Corte rápido sin re-codificar (copia de streams).
          code = await ffmpeg.exec([
            "-i", "in.mp4", "-c", "copy", "-map", "0",
            "-f", "segment", "-segment_time", segTime, "-reset_timestamps", "1",
            "-y", "clip_%03d.mp4",
          ]);
          if (code !== 0) {
            // Fallback: algunos codecs no se pueden segmentar por copia → re-codificar.
            await cleanSegments(ffmpeg);
            code = await ffmpeg.exec([
              "-i", "in.mp4",
              "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
              "-c:a", "aac", "-b:a", "128k",
              "-f", "segment", "-segment_time", segTime, "-reset_timestamps", "1",
              "-y", "clip_%03d.mp4",
            ]);
          }
        }
        if (cancelRef.current) break;
        if (code !== 0) throw new Error(`ffmpeg falló cortando "${file.name}"`);

        // Recolectar los clips generados
        const entries = await ffmpeg.listDir("/");
        const segNames = entries
          .filter((e) => !e.isDir && /^clip_\d+\.mp4$/.test(e.name))
          .map((e) => e.name)
          .sort();

        let n = 0;
        for (const segName of segNames) {
          if (cancelRef.current) break;
          const data = (await ffmpeg.readFile(segName)) as Uint8Array;
          const copy = new Uint8Array(data);
          const blob = new Blob([copy.buffer as ArrayBuffer], { type: "video/mp4" });
          n++;
          const outName = `${baseName}_clip${n}.mp4`;
          if (dirHandle) {
            const fh = await dirHandle.getFileHandle(outName, { create: true });
            const w = await fh.createWritable();
            await w.write(blob);
            await w.close();
            videoResult.items.push({ name: outName, url: "", sizeMB: fmtMB(blob.size), saved: true });
          } else {
            videoResult.items.push({ name: outName, url: URL.createObjectURL(blob), sizeMB: fmtMB(blob.size) });
          }
          try { await ffmpeg.deleteFile(segName); } catch { /* noop */ }
          setResults((prev) => {
            const next = prev.filter((r) => r.source !== videoResult.source);
            return [...next, { ...videoResult, items: [...videoResult.items] }];
          });
        }

        if (n === 0) throw new Error(`No se generaron clips de "${file.name}". Prueba con formato vertical activado.`);
        jobsDone++;
        try { await ffmpeg.deleteFile("in.mp4"); } catch { /* noop */ }
      }

      setStatusLine(cancelRef.current ? "Cancelado — se conservan los clips ya generados." : "¡Listo! Todos los clips fueron generados.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Error procesando: ${msg}`);
      setStatusLine("");
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
    setStatusLine("Cancelando al terminar el video en curso...");
  };

  // ── MODO IA: escuchar el video y proponer los mejores momentos ──
  const readVideoDuration = (file: File) => new Promise<number>((resolve, reject) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => { const d = v.duration; URL.revokeObjectURL(v.src); resolve(d); };
    v.onerror = () => { URL.revokeObjectURL(v.src); reject(new Error("No se pudo leer el video")); };
    v.src = URL.createObjectURL(file);
  });

  const handleAnalyze = async () => {
    if (files.length === 0 || running || analyzing) return;
    setAnalyzing(true);
    setError(null);
    setMoments(null);
    setOverallPct(0);
    try {
      const file = files[0];
      const dur = await readVideoDuration(file);
      if (dur > AI_MAX_MINUTES * 60) throw new Error(`En modo IA el máximo es ${AI_MAX_MINUTES} minutos por video.`);
      if (dur < 60) throw new Error("El video es muy corto para el modo IA (mínimo 1 minuto).");

      const ffmpeg = await getFFmpeg();
      setStatusLine("Extrayendo el audio del video...");
      await ffmpeg.writeFile("in.mp4", new Uint8Array(await file.arrayBuffer()));
      const kbps = dur > 16 * 60 ? 24 : 32;
      const code = await ffmpeg.exec([
        "-i", "in.mp4", "-vn", "-ac", "1", "-ar", "16000",
        "-c:a", "libmp3lame", "-b:a", `${kbps}k`, "-y", "audio.mp3",
      ]);
      if (code !== 0) throw new Error("No se pudo extraer el audio del video");
      const audioData = (await ffmpeg.readFile("audio.mp3")) as Uint8Array;
      try { await ffmpeg.deleteFile("audio.mp3"); } catch { /* noop */ }

      setStatusLine("🎧 Escuchando el video con IA (transcripción + análisis)... ~1 minuto");
      const audioCopy = new Uint8Array(audioData);
      const fd = new FormData();
      fd.append("audio", new Blob([audioCopy.buffer as ArrayBuffer], { type: "audio/mpeg" }), "audio.mp3");
      fd.append("duration", String(Math.round(dur)));
      const res = await fetch("/api/smm/multiclipping/analyze", { method: "POST", body: fd, headers: apiKeyHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `El análisis falló (${res.status})`);

      setMoments((data.moments as Omit<AiMoment, "selected">[]).map((m) => ({ ...m, selected: true })));
      setAiWords(data.words || []);
      setAiSegments(data.segments || []);
      setAiFileName(file.name);
      setStatusLine("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatusLine("");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateAi = async () => {
    const selected = (moments || []).filter((m) => m.selected);
    if (selected.length === 0 || running || analyzing) return;
    const file = files.find((f) => f.name === aiFileName) || files[0];
    if (!file) { setError("Vuelve a agregar el video analizado."); return; }

    setRunning(true);
    setError(null);
    setResults([]);
    setOverallPct(0);
    cancelRef.current = false;

    let jobsDone = 0;
    const tick = setInterval(() => {
      setOverallPct(Math.round(((jobsDone + execRatioRef.current) / selected.length) * 100));
    }, 500);

    try {
      const ffmpeg = await getFFmpeg();
      const baseName = file.name.replace(/\.[^.]+$/, "");
      const videoResult: VideoResult = { source: file.name, items: [] };

      setStatusLine(`Cargando "${file.name}" en memoria...`);
      await ffmpeg.writeFile("in.mp4", new Uint8Array(await file.arrayBuffer()));

      // Fuente para título/subtítulos (libass)
      const needsAss = titleOn || subsOn;
      if (needsAss) {
        const fontBuf = new Uint8Array(await (await fetch("/fonts/Anton-Regular.ttf")).arrayBuffer());
        try { await ffmpeg.createDir("/customfonts"); } catch { /* ya existe */ }
        await ffmpeg.writeFile("/customfonts/Anton-Regular.ttf", fontBuf);
      }

      const hasLogo = !!logoFile;
      if (hasLogo && logoFile) {
        await ffmpeg.writeFile("logo.png", new Uint8Array(await logoFile.arrayBuffer()));
      }

      for (let i = 0; i < selected.length; i++) {
        if (cancelRef.current) break;
        const m = selected[i];
        execRatioRef.current = 0;
        const nParts = clipSegs(m).length;
        setStatusLine(`Clip ${i + 1}/${selected.length}: "${m.title}"${nParts > 1 ? ` (uniendo ${nParts} partes)` : ` (${fmtTime(m.start)}–${fmtTime(m.end)})`}...`);

        const assMoment = titleOn ? m : { ...m, title: "" };
        if (needsAss) {
          await ffmpeg.writeFile("sub.ass", new TextEncoder().encode(buildAss(assMoment, aiWords, aiSegments, vertical, subsOn)));
        }

        // Con título activo, el video se encoge para dejar una franja negra arriba
        // donde vive el título (fuera de la imagen). Sin título, ocupa todo el frame.
        const baseChain = vertical
          ? (titleOn
              ? `scale=1080:${1920 - TITLE_BAND_V}:force_original_aspect_ratio=increase,crop=1080:${1920 - TITLE_BAND_V},pad=1080:1920:0:${TITLE_BAND_V}:black`
              : "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920")
          : (titleOn
              ? `scale=1920:${1080 - TITLE_BAND_H}:force_original_aspect_ratio=decrease,pad=1920:${1080 - TITLE_BAND_H}:(ow-iw)/2:(oh-ih)/2:black,pad=1920:1080:0:${TITLE_BAND_H}:black`
              : "null");
        const assFilter = needsAss ? "ass=sub.ass:fontsdir=/customfonts" : "null";
        const segs = clipSegs(m);
        const multi = segs.length > 1;
        const pos = (LOGO_POSITIONS[logoPos] || LOGO_POSITIONS.tr).expr;
        let fc: string;
        let inputs: string[];
        let audioMap: string[];

        if (multi) {
          // Clip COMPUESTO: une varios tramos (select/aselect) saltándose el relleno.
          const vr = segs.map((s) => `between(t,${s.start.toFixed(2)},${s.end.toFixed(2)})`).join("+");
          const cutV = `[0:v]select='${vr}',setpts=N/FRAME_RATE/TB[cv]`;
          const aChain = `[0:a]aselect='${vr}',asetpts=N/SR/TB[a]`;
          inputs = ["-i", "in.mp4"];
          if (hasLogo) {
            fc = `${cutV};[cv]${baseChain}[bg];[1:v]scale=200:-1[wm];[bg][wm]overlay=${pos}[v1];[v1]${assFilter}[v];${aChain}`;
            inputs.push("-i", "logo.png");
          } else {
            fc = `${cutV};[cv]${baseChain}[v1];[v1]${assFilter}[v];${aChain}`;
          }
          audioMap = ["-map", "[a]"];
        } else {
          // Clip de un solo tramo: corte rápido con seek.
          inputs = ["-ss", segs[0].start.toFixed(2), "-to", segs[0].end.toFixed(2), "-i", "in.mp4"];
          if (hasLogo) {
            fc = `[0:v]${baseChain}[bg];[1:v]scale=200:-1[wm];[bg][wm]overlay=${pos}[v1];[v1]${assFilter}[v]`;
            inputs.push("-i", "logo.png");
          } else {
            fc = `[0:v]${baseChain}[v1];[v1]${assFilter}[v]`;
          }
          audioMap = ["-map", "0:a?"];
        }

        const common = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-c:a", "aac", "-b:a", "128k", "-y", "out.mp4"];
        let code = await ffmpeg.exec([...inputs, "-filter_complex", fc, "-map", "[v]", ...audioMap, ...common]);
        if (code !== 0 && multi) {
          // Reintento sin audio (video sin pista de audio → aselect falla)
          const vr = segs.map((s) => `between(t,${s.start.toFixed(2)},${s.end.toFixed(2)})`).join("+");
          const cutV = `[0:v]select='${vr}',setpts=N/FRAME_RATE/TB[cv]`;
          const fcNoA = hasLogo
            ? `${cutV};[cv]${baseChain}[bg];[1:v]scale=200:-1[wm];[bg][wm]overlay=${pos}[v1];[v1]${assFilter}[v]`
            : `${cutV};[cv]${baseChain}[v1];[v1]${assFilter}[v]`;
          code = await ffmpeg.exec([...inputs, "-filter_complex", fcNoA, "-map", "[v]", "-an",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-y", "out.mp4"]);
        }
        if (cancelRef.current) break;
        if (code !== 0) throw new Error(`ffmpeg falló generando el clip "${m.title}"`);

        const data = (await ffmpeg.readFile("out.mp4")) as Uint8Array;
        const copy = new Uint8Array(data);
        const blob = new Blob([copy.buffer as ArrayBuffer], { type: "video/mp4" });
        const outName = `${baseName}_clip${i + 1}_${slugify(m.title)}.mp4`;
        if (dirHandle) {
          const fh = await dirHandle.getFileHandle(outName, { create: true });
          const w = await fh.createWritable();
          await w.write(blob);
          await w.close();
          videoResult.items.push({ name: outName, url: "", sizeMB: fmtMB(blob.size), saved: true });
        } else {
          videoResult.items.push({ name: outName, url: URL.createObjectURL(blob), sizeMB: fmtMB(blob.size) });
        }
        try { await ffmpeg.deleteFile("out.mp4"); } catch { /* noop */ }
        try { if (needsAss) await ffmpeg.deleteFile("sub.ass"); } catch { /* noop */ }
        jobsDone++;
        setResults([{ ...videoResult, items: [...videoResult.items] }]);
      }

      try { await ffmpeg.deleteFile("in.mp4"); } catch { /* noop */ }
      setStatusLine(cancelRef.current ? "Cancelado — se conservan los clips ya generados." : "¡Listo! Clips generados con título y subtítulos.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Error generando clips: ${msg}`);
      setStatusLine("");
      try { ffmpegRef.current?.terminate(); } catch { /* noop */ }
      ffmpegRef.current = null;
      setEngineStatus("idle");
    } finally {
      clearInterval(tick);
      setOverallPct((prev) => (cancelRef.current ? prev : 100));
      setRunning(false);
    }
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
    { href: "/smm/multiclipping", label: "Multiclipping", active: true },
    { href: "https://www.scalinglatam.site", label: "Scaling Latam", external: true },
  ];

  const card: React.CSSProperties = { background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: "16px", padding: "24px" };
  const btnPrimary: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: "8px", background: "linear-gradient(135deg, #0ea5e9, #22d3ee)", color: "white", border: "none", borderRadius: "12px", padding: "13px 24px", fontSize: "15px", fontWeight: 700, cursor: "pointer" };
  const btnGhost: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: "6px", background: "#12121f", color: "#94a3b8", border: "1px solid #1e1e30", borderRadius: "10px", padding: "9px 16px", fontSize: "13px", fontWeight: 600, cursor: "pointer" };

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
      <style>{`
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .mc-clip-card:hover { border-color: #0ea5e9 !important; }
      `}</style>
      <SmmNav balance={balance} userAvatar={userAvatar} userName={userName} userEmail={userEmail} links={NAV_LINKS} />

      <main style={{ maxWidth: "920px", margin: "0 auto", padding: "32px 20px 80px" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "6px" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg,#0ea5e9,#22d3ee)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Scissors size={22} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: 800, letterSpacing: "-0.5px", margin: 0 }}>Multiclipping</h1>
            <p style={{ fontSize: "13px", color: "#5a6480", margin: 0 }}>
              La IA escucha tu video largo y genera clips virales con título y subtítulos — formato 9:16 para TikTok, Reels y Shorts
            </p>
          </div>
        </div>
        <p style={{ fontSize: "12px", color: "#3f475e", margin: "0 0 28px 58px" }}>
          Ideal para podcasts, streams, clases y entrevistas: convierte 1 video largo en muchos clips publicables.
          🔒 El video se procesa en tu navegador y nunca se sube; en modo IA solo se envía el audio para transcribirlo.
        </p>

        {!hasAccess ? (
          /* ── LOCKED ── */
          <div style={{ ...card, textAlign: "center", padding: "48px 32px" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#12121f", border: "1px solid #2a2a44", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
              <Lock size={26} color="#22d3ee" />
            </div>
            <h2 style={{ fontSize: "19px", fontWeight: 800, margin: "0 0 8px" }}>Herramienta exclusiva para usuarios Pro</h2>
            <p style={{ fontSize: "14px", color: "#94a3b8", maxWidth: "460px", margin: "0 auto 6px", lineHeight: 1.6 }}>
              Multiclipping viene incluida con tu plan Pro de TrustMind. Actívala y corta tus videos largos en clips:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxWidth: "380px", margin: "18px auto 26px", textAlign: "left" }}>
              {[
                "La IA escucha tu video y elige los mejores momentos",
                "Título y subtítulos quemados, listos para publicar",
                "Formato vertical 9:16 para TikTok / Reels / Shorts",
                "También: cortes uniformes de la duración que elijas",
              ].map((t) => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "#c4cadd" }}>
                  <Sparkles size={14} color="#22d3ee" /> {t}
                </div>
              ))}
            </div>
            <a href={WA_MULTICLIPPING} target="_blank" rel="noopener noreferrer" style={{ ...btnPrimary, background: "linear-gradient(135deg,#16a34a,#22c55e)", textDecoration: "none" }}>
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
                border: dragOver ? "2px dashed #22d3ee" : "2px dashed #2a2a44",
                background: dragOver ? "#0a1a24" : "#0d0d18", transition: "all 0.15s",
              }}
            >
              <input ref={fileInputRef} type="file" accept="video/*,.mp4,.mov,.m4v,.webm" multiple style={{ display: "none" }}
                onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
              <Upload size={26} color="#22d3ee" style={{ marginBottom: "10px" }} />
              <div style={{ fontSize: "15px", fontWeight: 700, marginBottom: "4px" }}>Arrastra tu video aquí o haz click para elegirlo</div>
              <div style={{ fontSize: "12px", color: "#5a6480" }}>MP4, MOV o WebM — máx {MAX_FILE_MB} MB por video.</div>
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

                {/* modo: IA vs cortes uniformes */}
                <div style={{ display: "flex", gap: "8px", paddingTop: "16px", flexWrap: "wrap" }}>
                  {([
                    { key: "ai" as ClipMode, label: "✨ IA elige los mejores momentos" },
                    { key: "uniform" as ClipMode, label: "✂️ Cortes uniformes" },
                  ]).map((t) => (
                    <button key={t.key} onClick={() => setMode(t.key)} disabled={running || analyzing}
                      style={{
                        ...btnGhost,
                        color: mode === t.key ? "white" : "#94a3b8",
                        background: mode === t.key ? "linear-gradient(135deg,#0ea5e9,#22d3ee)" : "#12121f",
                        borderColor: mode === t.key ? "transparent" : "#1e1e30",
                      }}>
                      {t.label}
                    </button>
                  ))}
                </div>

                {mode === "uniform" ? (
                  /* ── modo uniforme (original) ── */
                  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "14px", paddingTop: "16px" }}>
                    <div>
                      <div style={{ fontSize: "11px", color: "#5a6480", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700, marginBottom: "8px" }}>
                        Duración de cada clip: <span style={{ color: "#22d3ee" }}>{clipSeconds}s</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <input type="range" min={MIN_CLIP} max={MAX_CLIP} step={5} value={clipSeconds} disabled={running}
                          onChange={(e) => setClipSeconds(parseInt(e.target.value))}
                          style={{ width: "220px", accentColor: "#0ea5e9" }} />
                        <input type="number" min={MIN_CLIP} max={MAX_CLIP} value={clipSeconds} disabled={running}
                          onChange={(e) => setClipSeconds(Math.max(MIN_CLIP, Math.min(MAX_CLIP, parseInt(e.target.value) || MIN_CLIP)))}
                          style={{ width: "62px", background: "#12121f", border: "1px solid #1e1e30", borderRadius: "8px", color: "white", padding: "6px 8px", fontSize: "13px", textAlign: "center" }} />
                      </div>
                      <div style={{ marginTop: "16px" }}>
                        <div style={{ fontSize: "11px", color: "#5a6480", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700, marginBottom: "8px" }}>Formato de salida</div>
                        <div style={{ display: "inline-flex", background: "#12121f", border: "1px solid #1e1e30", borderRadius: "10px", padding: "3px", gap: "3px" }}>
                          {[{ v: true, label: "📱 Vertical 9:16" }, { v: false, label: "🖥️ Horizontal 16:9" }].map((o) => (
                            <button key={String(o.v)} disabled={running} onClick={() => setVertical(o.v)}
                              style={{ padding: "8px 15px", borderRadius: "8px", border: "none", cursor: running ? "default" : "pointer", fontSize: "13px", fontWeight: vertical === o.v ? 700 : 500, fontFamily: "inherit", background: vertical === o.v ? "linear-gradient(135deg,#0ea5e9,#22d3ee)" : "transparent", color: vertical === o.v ? "#001018" : "#8a92ad", transition: "all .15s" }}>
                              {o.label}
                            </button>
                          ))}
                        </div>
                        <div style={{ fontSize: "12px", color: "#5a6480", marginTop: "6px" }}>
                          {vertical ? "Recorta a 9:16 para TikTok/Reels/Shorts (recorta los costados)." : "Mantiene el video como está — no recorta los costados."}
                        </div>
                      </div>
                    </div>
                    {!running ? (
                      <button onClick={handleGenerate} style={btnPrimary}>
                        <Scissors size={17} /> Cortar en clips
                      </button>
                    ) : (
                      <button onClick={handleCancel} style={{ ...btnGhost, color: "#ef4444", borderColor: "#3f1d2e" }}>
                        <X size={15} /> Cancelar
                      </button>
                    )}
                  </div>
                ) : (
                  /* ── modo IA ── */
                  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "14px", paddingTop: "16px" }}>
                    <div>
                      <div style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.6, maxWidth: "460px" }}>
                        La IA <b style={{ color: "#22d3ee" }}>escucha tu video</b>, detecta los momentos más virales y genera
                        clips con <b>título</b> y <b>subtítulos</b> quemados, listos para publicar.
                        {files.length > 1 && <span style={{ color: "#f59e0b" }}> En modo IA se analiza solo el primer video de la lista.</span>}
                      </div>
                      <div style={{ display: "flex", gap: "18px", flexWrap: "wrap", marginTop: "12px" }}>
                        <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#c4cadd", cursor: "pointer" }}>
                          <input type="checkbox" checked={titleOn} disabled={running || analyzing}
                            onChange={(e) => setTitleOn(e.target.checked)}
                            style={{ width: "16px", height: "16px", accentColor: "#0ea5e9" }} />
                          Título sobreimpreso
                        </label>
                        <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#c4cadd", cursor: "pointer" }}>
                          <input type="checkbox" checked={subsOn} disabled={running || analyzing}
                            onChange={(e) => setSubsOn(e.target.checked)}
                            style={{ width: "16px", height: "16px", accentColor: "#0ea5e9" }} />
                          Subtítulos quemados
                        </label>
                      </div>
                      <div style={{ marginTop: "12px" }}>
                        <div style={{ fontSize: "11px", color: "#5a6480", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700, marginBottom: "8px" }}>Formato de salida</div>
                        <div style={{ display: "inline-flex", background: "#12121f", border: "1px solid #1e1e30", borderRadius: "10px", padding: "3px", gap: "3px" }}>
                          {[{ v: true, label: "📱 Vertical 9:16" }, { v: false, label: "🖥️ Horizontal 16:9" }].map((o) => (
                            <button key={String(o.v)} disabled={running || analyzing} onClick={() => setVertical(o.v)}
                              style={{ padding: "8px 15px", borderRadius: "8px", border: "none", cursor: running || analyzing ? "default" : "pointer", fontSize: "13px", fontWeight: vertical === o.v ? 700 : 500, fontFamily: "inherit", background: vertical === o.v ? "linear-gradient(135deg,#0ea5e9,#22d3ee)" : "transparent", color: vertical === o.v ? "#001018" : "#8a92ad", transition: "all .15s" }}>
                              {o.label}
                            </button>
                          ))}
                        </div>
                        <div style={{ fontSize: "12px", color: "#5a6480", marginTop: "6px" }}>
                          {vertical ? "Recorta a 9:16 (recorta los costados)." : "Horizontal — mantiene el video como está, sin recortar."}
                        </div>
                      </div>
                    </div>
                    {!analyzing && !running ? (
                      <button onClick={handleAnalyze} style={btnPrimary}>
                        <Sparkles size={17} /> {moments ? "Volver a analizar" : "Analizar con IA"}
                      </button>
                    ) : running ? (
                      <button onClick={handleCancel} style={{ ...btnGhost, color: "#ef4444", borderColor: "#3f1d2e" }}>
                        <X size={15} /> Cancelar
                      </button>
                    ) : (
                      <button disabled style={{ ...btnPrimary, opacity: 0.6, cursor: "default" }}>
                        <Loader2 size={17} style={{ animation: "spin 1s linear infinite" }} /> Analizando...
                      </button>
                    )}
                  </div>
                )}

                {/* logo / marca de agua */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginTop: "14px", paddingTop: "14px", borderTop: "1px solid #14141f" }}>
                  <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" style={{ display: "none" }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) setLogoFile(f); e.target.value = ""; }} />
                  {!logoFile ? (
                    <button onClick={() => logoInputRef.current?.click()} disabled={running} style={{ ...btnGhost, color: "#22d3ee", borderColor: "#2a2a44" }}>
                      🖼️ Poner logo / marca de agua
                    </button>
                  ) : (
                    <>
                      <span style={{ fontSize: "13px", color: "#22c55e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "220px" }}>✓ Logo: {logoFile.name}</span>
                      {!running && (
                        <button onClick={() => setLogoFile(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", display: "flex" }} title="Quitar logo">
                          <X size={14} color="#ef4444" />
                        </button>
                      )}
                      <select value={logoPos} disabled={running} onChange={(e) => setLogoPos(e.target.value)}
                        style={{ background: "#12121f", border: "1px solid #1e1e30", borderRadius: "8px", color: "white", padding: "7px 10px", fontSize: "13px" }}>
                        {Object.entries(LOGO_POSITIONS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </>
                  )}
                  <span style={{ fontSize: "12px", color: "#5a6480" }}>PNG transparente recomendado</span>
                </div>

                {/* carpeta de destino */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginTop: "14px", paddingTop: "14px", borderTop: "1px solid #14141f" }}>
                  {fsSupported ? (
                    <>
                      <button onClick={pickFolder} disabled={running} style={{ ...btnGhost, color: "#22d3ee", borderColor: "#2a2a44" }}>
                        📂 {dirHandle ? "Cambiar carpeta" : "Elegir carpeta de destino"}
                      </button>
                      <span style={{ fontSize: "12px", color: dirHandle ? "#22c55e" : "#5a6480" }}>
                        {dirHandle
                          ? `✓ Se guardarán automáticamente en "${dirHandle.name}"`
                          : "Opcional — sin elegir, cada clip se descarga con su botón"}
                      </span>
                      {dirHandle && !running && (
                        <button onClick={() => setDirHandle(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", display: "flex" }} title="Quitar carpeta">
                          <X size={14} color="#ef4444" />
                        </button>
                      )}
                    </>
                  ) : (
                    <span style={{ fontSize: "12px", color: "#5a6480" }}>
                      📂 Tu navegador no permite elegir carpeta (usa Chrome o Edge) — los clips se descargan a tu carpeta de Descargas.
                    </span>
                  )}
                </div>

                <div style={{ fontSize: "11px", color: "#3f475e", marginTop: "10px" }}>
                  ⏱️ El procesamiento corre en tu computadora. {vertical
                    ? "El formato vertical re-codifica (más lento, pero listo para publicar)."
                    : "El corte simple es rápido (copia sin re-codificar)."} Deja la pestaña abierta.
                </div>

                {/* BYOK — usar tu propia API Key (modo IA usa Groq + Anthropic) */}
                {mode === "ai" && <ApiKeysCard need="both" />}
              </div>
            )}

            {/* momentos propuestos por la IA */}
            {mode === "ai" && moments && moments.length > 0 && (
              <div style={{ ...card, marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Sparkles size={17} color="#22d3ee" />
                    <span style={{ fontSize: "15px", fontWeight: 700 }}>
                      {moments.length} momentos detectados en &quot;{aiFileName}&quot;
                    </span>
                  </div>
                  {!running && (
                    <button
                      onClick={handleGenerateAi}
                      disabled={moments.filter((m) => m.selected).length === 0}
                      style={{ ...btnPrimary, opacity: moments.filter((m) => m.selected).length === 0 ? 0.5 : 1 }}
                    >
                      <Scissors size={17} /> Generar {moments.filter((m) => m.selected).length} clips
                    </button>
                  )}
                </div>
                <div style={{ fontSize: "12px", color: "#5a6480", marginBottom: "14px" }}>
                  Desmarca los que no quieras y edita el título si lo prefieres — el título va sobreimpreso en el clip.
                </div>
                {moments.map((m, idx) => (
                  <div key={`${m.start}-${m.end}`} style={{
                    display: "flex", gap: "12px", alignItems: "flex-start", padding: "12px",
                    background: m.selected ? "#0e1420" : "#0d0d18", border: `1px solid ${m.selected ? "#1e3a52" : "#1e1e30"}`,
                    borderRadius: "12px", marginBottom: "8px", opacity: m.selected ? 1 : 0.55, transition: "all 0.15s",
                  }}>
                    <input type="checkbox" checked={m.selected} disabled={running}
                      onChange={(e) => setMoments((prev) => prev!.map((x, i) => i === idx ? { ...x, selected: e.target.checked } : x))}
                      style={{ width: "17px", height: "17px", accentColor: "#0ea5e9", marginTop: "4px", flexShrink: 0, cursor: "pointer" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 800, color: m.score >= 80 ? "#22c55e" : m.score >= 60 ? "#f59e0b" : "#94a3b8", background: "#12121f", border: "1px solid #1e1e30", borderRadius: "6px", padding: "2px 8px" }}>
                          🔥 {m.score}
                        </span>
                        <span style={{ fontSize: "12px", color: "#22d3ee", fontWeight: 700 }}>
                          {clipSegs(m).length > 1
                            ? `${clipSegs(m).reduce((a, s) => a + (s.end - s.start), 0).toFixed(0)}s · ${clipSegs(m).length} partes`
                            : `${fmtTime(m.start)} → ${fmtTime(m.end)} (${Math.round(m.end - m.start)}s)`}
                        </span>
                        {clipSegs(m).length > 1 && (
                          <span title={clipSegs(m).map((s) => `${fmtTime(s.start)}–${fmtTime(s.end)}`).join("  +  ")}
                            style={{ fontSize: "10.5px", fontWeight: 700, color: "#a78bfa", background: "#1a0a2e", border: "1px solid #3a1a5e", borderRadius: "6px", padding: "2px 7px" }}>
                            ✂ {clipSegs(m).map((s) => `${fmtTime(s.start)}–${fmtTime(s.end)}`).join(" + ")}
                          </span>
                        )}
                      </div>
                      <input value={m.title} disabled={running}
                        onChange={(e) => setMoments((prev) => prev!.map((x, i) => i === idx ? { ...x, title: e.target.value } : x))}
                        style={{ width: "100%", background: "#12121f", border: "1px solid #1e1e30", borderRadius: "8px", color: "white", padding: "8px 10px", fontSize: "14px", fontWeight: 700, marginBottom: "6px" }} />
                      <div style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.5 }}>
                        💬 &quot;{m.hook}&quot;
                      </div>
                      <div style={{ fontSize: "11px", color: "#5a6480", marginTop: "2px" }}>{m.reason}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* progress */}
            {(running || analyzing || engineStatus === "loading") && (
              <div style={{ ...card, padding: "18px 20px", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                  <Loader2 size={16} color="#22d3ee" style={{ animation: "spin 1s linear infinite" }} />
                  <span style={{ fontSize: "13px", color: "#c4cadd" }}>{statusLine}</span>
                </div>
                <div style={{ height: "8px", background: "#12121f", borderRadius: "6px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${overallPct}%`, background: "linear-gradient(90deg,#0ea5e9,#22d3ee)", borderRadius: "6px", transition: "width 0.4s" }} />
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
                      {results.reduce((a, v) => a + v.items.length, 0)} clips generados
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {results.some((v) => v.items.some((i) => i.url)) && (
                      <button onClick={downloadAll} style={{ ...btnGhost, color: "#22d3ee", borderColor: "#2a2a44" }}>
                        <Download size={14} /> Descargar todos
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
                        const label = item.name.match(/_clip\d+\.mp4$/)?.[0].replace(".mp4", "").replace("_", "") || item.name;
                        const cardStyle: React.CSSProperties = { background: "#12121f", border: "1px solid #1e1e30", borderRadius: "10px", padding: "10px 12px", textDecoration: "none", transition: "border-color 0.15s" };
                        const inner = (
                          <>
                            <div style={{ fontSize: "12px", fontWeight: 700, color: "#c4cadd", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <span style={{ fontSize: "11px", color: "#5a6480" }}>{item.sizeMB}</span>
                              {item.saved ? <CheckCircle2 size={13} color="#22c55e" /> : <Download size={13} color="#22d3ee" />}
                            </div>
                          </>
                        );
                        return item.saved ? (
                          <div key={item.name} title="Guardado en la carpeta elegida" style={cardStyle}>{inner}</div>
                        ) : (
                          <a key={item.name} href={item.url} download={item.name} className="mc-clip-card" style={cardStyle}>{inner}</a>
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
