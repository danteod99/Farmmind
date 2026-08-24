"use client";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────
// Editor de cortos — edita un video corto hablado 100% en el
// navegador (ffmpeg.wasm): corta RETOMAS y SILENCIOS, quema
// subtítulos karaoke, iguala el volumen y sube la saturación.
// Transcripción vía Groq (/transcribe); retomas vía Claude
// (/editor/retakes). Motor y estilo reusados de Multiediting.
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
  Scissors, Lock, Upload, X, Download, Loader2, CheckCircle2,
  AlertTriangle, Music, Captions,
} from "lucide-react";

const MAX_FILE_MB = 200;

function fmtMB(bytes: number) { return (bytes / (1024 * 1024)).toFixed(1) + " MB"; }

interface Word { word: string; start: number; end: number }
interface Segment { start: number; end: number; text: string }
interface Range { start: number; end: number }

// ── ASS helpers (mismos que Multiediting) ──
function assTime(t: number) {
  const cl = Math.max(0, t);
  const h = Math.floor(cl / 3600), m = Math.floor((cl % 3600) / 60), s = Math.floor(cl % 60);
  const cs = Math.floor((cl - Math.floor(cl)) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}
const assEscape = (s: string) => s.replace(/\\/g, "").replace(/[{}]/g, "").replace(/\r?\n/g, " ").trim();

function buildSubtitleAss(words: Word[], W: number, H: number): string {
  const capSize = Math.max(26, Math.round(H * 0.045));
  const capMarginV = Math.round(H * 0.10);
  const outline = Math.max(2, Math.round(H * 0.0035));
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Anton,${capSize},&H00FFFFFF,&H0000D3FF,&H00000000,&H96000000,0,0,0,0,100,100,1,0,1,${outline},2,2,80,80,${capMarginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  const lines: string[] = [];
  let chunk: Word[] = [];
  const flush = () => {
    if (!chunk.length) return;
    const st = Math.max(0, chunk[0].start);
    const en = chunk[chunk.length - 1].end;
    const text = assEscape(chunk.map((w) => w.word).join(" ").toUpperCase());
    if (text && en > st) lines.push(`Dialogue: 0,${assTime(st)},${assTime(en)},Caption,,0,0,0,,${text}`);
    chunk = [];
  };
  for (const w of words) {
    chunk.push(w);
    const span = w.end - chunk[0].start;
    if (chunk.length >= 4 || span >= 1.8 || /[.!?…]$/.test(w.word)) flush();
  }
  flush();
  return header + lines.join("\n") + "\n";
}

function getVideoDimensions(file: File): Promise<{ w: number; h: number; dur: number }> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      const d = { w: v.videoWidth || 1080, h: v.videoHeight || 1920, dur: v.duration || 0 };
      URL.revokeObjectURL(v.src);
      resolve(d);
    };
    v.onerror = () => resolve({ w: 1080, h: 1920, dur: 0 });
    v.src = URL.createObjectURL(file);
  });
}

// Complemento de los cortes = tramos a CONSERVAR (con padding pequeño).
function keepSegments(cuts: Range[], duration: number, pad = 0.04): Range[] {
  const merged: Range[] = [];
  for (const c of [...cuts].sort((a, b) => a.start - b.start)) {
    const last = merged[merged.length - 1];
    if (last && c.start <= last.end + 0.05) last.end = Math.max(last.end, c.end);
    else merged.push({ ...c });
  }
  const keep: Range[] = [];
  let cursor = 0;
  for (const c of merged) {
    const end = Math.min(duration, c.start + pad);
    if (end > cursor) keep.push({ start: cursor, end });
    cursor = Math.max(cursor, c.end - pad);
  }
  if (cursor < duration) keep.push({ start: cursor, end: duration });
  return keep.filter((k) => k.end - k.start > 0.1);
}

// Mapea un tiempo del video ORIGINAL al tiempo en el video ya CORTADO.
function mapTime(t: number, keep: Range[]): number | null {
  let acc = 0;
  for (const k of keep) {
    if (t < k.start) return null;            // cae en un tramo eliminado
    if (t <= k.end) return acc + (t - k.start);
    acc += k.end - k.start;
  }
  return acc;
}

export default function EditorPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [userName, setUserName] = useState("");
  const [userAvatar, setUserAvatar] = useState("");

  const [files, setFiles] = useState<File[]>([]);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [cutRetakes, setCutRetakes] = useState(true);
  const [condense, setCondense] = useState(false);
  const [cutSilences, setCutSilences] = useState(true);
  const [subsOn, setSubsOn] = useState(true);
  const [musicVol, setMusicVol] = useState(0.15);

  const [running, setRunning] = useState(false);
  const [engineStatus, setEngineStatus] = useState<"idle" | "loading" | "ready">("idle");
  const [statusLine, setStatusLine] = useState("");
  const [pct, setPct] = useState(0);
  const [result, setResult] = useState<{ url: string; name: string; sizeMB: string; origDur: number; newDur: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const ffmpegRef = useRef<FFmpeg | null>(null);
  const execRatioRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/?required=1"); return; }
        setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuario");
        setUserAvatar(user.user_metadata?.avatar_url || "");
        if (isAdmin(user.email)) setHasAccess(true);
        else {
          const { data: subs } = await supabase.from("tm_subscriptions")
            .select("tier, expires_at").eq("user_id", user.id).eq("tier", "pro");
          setHasAccess((subs || []).some((s) => !s.expires_at || new Date(s.expires_at).getTime() > Date.now()));
        }
      } catch (e) {
        console.error("[editor] init error", e);
      } finally { setChecking(false); }
    })();
  }, [router]);

  useEffect(() => () => { if (result?.url) URL.revokeObjectURL(result.url); }, [result]);

  const addFiles = (list: FileList | File[]) => {
    setError(null);
    const incoming = Array.from(list).filter((x) => x.type.startsWith("video/") || /\.(mp4|mov|m4v|webm)$/i.test(x.name));
    if (!incoming.length) { setError("Solo se aceptan archivos de video (MP4, MOV, WebM)."); return; }
    const tooBig = incoming.find((f) => f.size > MAX_FILE_MB * 1024 * 1024);
    if (tooBig) { setError(`"${tooBig.name}" pesa ${fmtMB(tooBig.size)} — máximo ${MAX_FILE_MB} MB.`); return; }
    setFiles((prev) => [...prev, ...incoming]);
    setResult(null);
  };
  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));
  const moveFile = (idx: number, dir: -1 | 1) => setFiles((prev) => {
    const j = idx + dir;
    if (j < 0 || j >= prev.length) return prev;
    const next = [...prev];
    [next[idx], next[j]] = [next[j], next[idx]];
    return next;
  });

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
        setStatusLine(total ? `${label} ${Math.min(100, Math.round((recv / total) * 100))}%` : `${label} ${mb} MB...`);
      }
    } catch { /* load() lo reintenta */ }
  };

  const logBufRef = useRef<string[]>([]);
  const getFFmpeg = useCallback(async (): Promise<FFmpeg> => {
    if (ffmpegRef.current) return ffmpegRef.current;
    setEngineStatus("loading");
    setStatusLine("Descargando motor de video (~31 MB, solo la primera vez)...");
    const { FFmpeg: FFmpegClass } = await import("@ffmpeg/ffmpeg");
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const base = "/ffmpeg/core";
    const ffmpeg = new FFmpegClass();
    ffmpeg.on("progress", ({ progress }) => { execRatioRef.current = Math.max(0, Math.min(1, progress)); });
    ffmpeg.on("log", ({ message }) => { logBufRef.current.push(message); });
    await prefetchWasm(`${origin}${base}/ffmpeg-core.wasm`, "Descargando motor");
    setStatusLine("Iniciando motor...");
    const loadPromise = ffmpeg.load({
      classWorkerURL: `${origin}/ffmpeg/esm/worker.js`,
      coreURL: `${origin}${base}/ffmpeg-core.js`,
      wasmURL: `${origin}${base}/ffmpeg-core.wasm`,
    });
    const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout cargando el motor (prueba en Chrome)")), 45000));
    await Promise.race([loadPromise, timeout]);
    ffmpegRef.current = ffmpeg;
    setEngineStatus("ready");
    return ffmpeg;
  }, []);

  // silencedetect: corre ffmpeg y parsea el log para obtener rangos de silencio.
  const detectSilences = async (ffmpeg: FFmpeg, dur: number): Promise<Range[]> => {
    logBufRef.current = [];
    await ffmpeg.exec(["-i", "in.mp4", "-af", "silencedetect=noise=-30dB:d=0.5", "-f", "null", "-"]);
    const cuts: Range[] = [];
    let start: number | null = null;
    for (const line of logBufRef.current) {
      const ms = line.match(/silence_start:\s*(-?[\d.]+)/);
      const me = line.match(/silence_end:\s*([\d.]+)/);
      if (ms) start = Math.max(0, parseFloat(ms[1]));
      else if (me && start !== null) { cuts.push({ start, end: parseFloat(me[1]) }); start = null; }
    }
    if (start !== null && dur > start) cuts.push({ start, end: dur }); // silencio final colgante
    return cuts;
  };

  const handleRun = async () => {
    if (!files.length || running) return;
    setRunning(true); setError(null); setResult(null); setPct(0);
    const tick = setInterval(() => setPct((p) => Math.min(99, Math.max(p, Math.round(execRatioRef.current * 100)))), 400);
    try {
      const ffmpeg = await getFFmpeg();
      const dims = await getVideoDimensions(files[0]);
      const W = dims.w, H = dims.h;
      let origDur = 0;

      if (files.length === 1) {
        setStatusLine("Cargando video en memoria...");
        await ffmpeg.writeFile("in.mp4", new Uint8Array(await files[0].arrayBuffer()));
        origDur = dims.dur;
      } else {
        // Varios videos (tomas): normaliza cada uno al formato del 1º y los UNE.
        const listLines: string[] = [];
        for (let i = 0; i < files.length; i++) {
          setStatusLine(`Preparando y uniendo video ${i + 1}/${files.length}...`);
          execRatioRef.current = 0;
          await ffmpeg.writeFile(`src${i}.mp4`, new Uint8Array(await files[i].arrayBuffer()));
          const code = await ffmpeg.exec(["-i", `src${i}.mp4`,
            "-vf", `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:black,fps=30,setsar=1`,
            "-c:v", "libx264", "-preset", "ultrafast", "-crf", "22", "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-y", `norm${i}.mp4`]);
          if (code !== 0) throw new Error(`no se pudo preparar el video ${i + 1}`);
          try { await ffmpeg.deleteFile(`src${i}.mp4`); } catch { /* noop */ }
          listLines.push(`file norm${i}.mp4`);
          origDur += (await getVideoDimensions(files[i])).dur;
        }
        await ffmpeg.writeFile("concat.txt", new TextEncoder().encode(listLines.join("\n") + "\n"));
        const cc = await ffmpeg.exec(["-f", "concat", "-safe", "0", "-i", "concat.txt", "-c", "copy", "-y", "in.mp4"]);
        if (cc !== 0) throw new Error("no se pudieron unir los videos");
        for (let i = 0; i < files.length; i++) { try { await ffmpeg.deleteFile(`norm${i}.mp4`); } catch { /* noop */ } }
      }

      // 1) Transcripción (para retomas y/o subtítulos)
      let words: Word[] = [];
      let segments: Segment[] = [];
      const needTranscript = cutRetakes || subsOn;
      if (needTranscript) {
        setStatusLine("Transcribiendo con IA...");
        execRatioRef.current = 0;
        await ffmpeg.exec(["-i", "in.mp4", "-vn", "-ar", "16000", "-ac", "1", "-b:a", "64k", "-y", "audio.mp3"]);
        const audio = (await ffmpeg.readFile("audio.mp3")) as Uint8Array;
        const fd = new FormData();
        fd.append("audio", new File([new Uint8Array(audio).buffer as ArrayBuffer], "audio.mp3", { type: "audio/mpeg" }));
        const res = await fetch("/api/smm/multiediting/transcribe", { method: "POST", body: fd, headers: apiKeyHeaders() });
        if (res.ok) { const d = await res.json(); words = d.words || []; segments = d.segments || []; }
        else { const e = await res.json().catch(() => ({})); throw new Error(`Transcripción: ${e.error || res.status}`); }
        try { await ffmpeg.deleteFile("audio.mp3"); } catch { /* noop */ }
      }

      // 2) Cortes: retomas (Claude) + silencios (ffmpeg)
      const cuts: Range[] = [];
      if (cutRetakes && words.length >= 4) {
        setStatusLine("Detectando retomas y falsos comienzos...");
        const res = await fetch("/api/smm/editor/retakes", {
          method: "POST", headers: { "Content-Type": "application/json", ...apiKeyHeaders() },
          body: JSON.stringify({ words, condense }),
        });
        if (res.ok) { const d = await res.json(); cuts.push(...(d.cuts || [])); if (d.warning) setError(d.warning); }
        else console.warn("[editor] retomas fallaron:", res.status);
      }
      if (cutSilences) {
        setStatusLine("Detectando silencios...");
        cuts.push(...(await detectSilences(ffmpeg, origDur)));
      }

      const keep = (cuts.length && origDur > 0) ? keepSegments(cuts, origDur) : [{ start: 0, end: origDur }];
      const newDur = keep.reduce((a, k) => a + (k.end - k.start), 0);

      // 3) Corte + acabado en UNA sola pasada (select va dentro del filtro final)
      const hasCuts = cuts.length > 0;
      const vsel = hasCuts ? keep.map((k) => `between(t,${k.start.toFixed(3)},${k.end.toFixed(3)})`).join("+") : "";
      const selV = hasCuts ? `select='${vsel}',setpts=N/FRAME_RATE/TB,` : "";
      const selA = hasCuts ? `aselect='${vsel}',asetpts=N/SR/TB,` : "";

      // 4) Subtítulos: remapear tiempos de palabra al video cortado
      let subsReady = false;
      if (subsOn && (words.length || segments.length)) {
        const remapped: Word[] = [];
        for (const w of words) {
          const s = mapTime(w.start, keep), e = mapTime(w.end, keep);
          if (s !== null && e !== null && e > s) remapped.push({ word: w.word, start: s, end: e });
        }
        const source = remapped.length ? remapped
          : segments.flatMap((sg) => {
              const s = mapTime(sg.start, keep), e = mapTime(sg.end, keep);
              return (s !== null && e !== null && e > s) ? [{ word: sg.text, start: s, end: e }] : [];
            });
        if (source.length) {
          try {
            const fontBuf = new Uint8Array(await (await fetch("/fonts/Anton-Regular.ttf")).arrayBuffer());
            try { await ffmpeg.createDir("/customfonts"); } catch { /* ya existe */ }
            await ffmpeg.writeFile("/customfonts/Anton-Regular.ttf", fontBuf);
            await ffmpeg.writeFile("sub.ass", new TextEncoder().encode(buildSubtitleAss(source, dims.w, dims.h)));
            subsReady = true;
          } catch (e) { console.warn("[editor] fuente/subs:", e); }
        }
      }

      // 5) UNA sola pasada: corte (select) + subtítulos + volumen (+ música).
      // SIN colorización — se respetan los colores originales del video.
      // Si NO hay cortes NI subtítulos, el video se COPIA (sin re-codificar) →
      // cero pérdida de calidad; solo se re-codifica cuando es imprescindible.
      execRatioRef.current = 0;
      const vFilters: string[] = [];
      if (hasCuts) vFilters.push(`select='${vsel}'`, "setpts=N/FRAME_RATE/TB");
      if (subsReady) vFilters.push("ass=sub.ass:fontsdir=/customfonts");
      const vf = vFilters.join(",");
      const vCodec = vf ? ["-c:v", "libx264", "-preset", "veryfast", "-crf", "18"] : ["-c:v", "copy"];
      setStatusLine(vf ? (hasCuts ? "Cortando y quemando subtítulos..." : "Quemando subtítulos...") : "Ajustando volumen...");
      const hasMusic = !!musicFile;
      if (hasMusic && musicFile) {
        await ffmpeg.writeFile("music.mp3", new Uint8Array(await musicFile.arrayBuffer()));
        // voz normalizada + música al musicVol, mezcladas sin bajar la voz
        const vNode = vf ? `[0:v]${vf}[v];` : "";
        const vMap = vf ? "[v]" : "0:v";
        const fc = `${vNode}[0:a]${selA}loudnorm=I=-16:TP=-1.5[voz];[1:a]volume=${musicVol},aloop=loop=-1:size=2e9[mus];[voz][mus]amix=inputs=2:duration=first:normalize=0[a]`;
        const code = await ffmpeg.exec(["-i", "in.mp4", "-i", "music.mp3", "-filter_complex", fc,
          "-map", vMap, "-map", "[a]", ...vCodec, "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-y", "out.mp4"]);
        if (code !== 0) throw new Error("falló el acabado con música");
      } else {
        const vArgs = vf ? ["-vf", vf] : [];
        let code = await ffmpeg.exec(["-i", "in.mp4", ...vArgs, "-af", `${selA}loudnorm=I=-16:TP=-1.5`,
          ...vCodec, "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-y", "out.mp4"]);
        if (code !== 0) {
          code = await ffmpeg.exec(["-i", "in.mp4", ...vArgs, "-an", ...vCodec, "-movflags", "+faststart", "-y", "out.mp4"]);
        }
        if (code !== 0) throw new Error("falló el acabado");
      }

      const data = (await ffmpeg.readFile("out.mp4")) as Uint8Array;
      const blob = new Blob([new Uint8Array(data).buffer as ArrayBuffer], { type: "video/mp4" });
      const name = files[0].name.replace(/\.[^.]+$/, "") + "_editado.mp4";
      setResult({ url: URL.createObjectURL(blob), name, sizeMB: fmtMB(blob.size), origDur, newDur });
      setStatusLine("¡Listo!");
      for (const f of ["in.mp4", "cut.mp4", "sub.ass", "music.mp3", "out.mp4"]) { try { await ffmpeg.deleteFile(f); } catch { /* noop */ } }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Error: ${msg}`);
      setStatusLine("");
      try { ffmpegRef.current?.terminate(); } catch { /* noop */ }
      ffmpegRef.current = null; setEngineStatus("idle");
    } finally {
      clearInterval(tick);
      setPct(100);
      setRunning(false);
    }
  };

  // ── UI ──
  const card: React.CSSProperties = { background: "#0d0d16", border: "1px solid #1a1a2a", borderRadius: 16, padding: 22 };
  const btnPrimary: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#7c3aed,#00d4ff)", color: "white", border: "none", borderRadius: 12, padding: "13px 22px", fontSize: 15, fontWeight: 700, cursor: "pointer" };
  const btnGhost: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, background: "#12121f", border: "1px solid #2a2a44", borderRadius: 10, padding: "10px 16px", fontSize: 14, cursor: "pointer", color: "#c4cadd" };

  if (checking) {
    return <div style={{ minHeight: "100vh", background: "#08080f", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 className="animate-spin" color="#7c3aed" size={34} />
    </div>;
  }

  if (!hasAccess) {
    return <div style={{ minHeight: "100vh", background: "#08080f", color: "white" }}>
      <SmmNav userName={userName} userAvatar={userAvatar} balance={0} />
      <div style={{ maxWidth: 520, margin: "80px auto", ...card, textAlign: "center" }}>
        <Lock size={40} color="#7c3aed" style={{ marginBottom: 14 }} />
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Editor de cortos</h2>
        <p style={{ color: "#8a92ad", marginBottom: 20 }}>Requiere plan <b style={{ color: "#a78bfa" }}>Pro</b>. Corta retomas y silencios, agrega subtítulos y deja tu corto listo — todo en tu navegador.</p>
        <a href="https://wa.me/51931119176?text=Hola!%20Quiero%20activar%20el%20Editor%20de%20cortos%20de%20TrustMind" style={{ ...btnPrimary, textDecoration: "none" }}>Activar Pro</a>
      </div>
    </div>;
  }

  const Toggle = ({ on, set, icon, label, hint }: { on: boolean; set: (v: boolean) => void; icon: React.ReactNode; label: string; hint: string }) => (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 0", borderTop: "1px solid #14141f", cursor: running ? "default" : "pointer" }}>
      <input type="checkbox" checked={on} disabled={running} onChange={(e) => set(e.target.checked)} style={{ width: 17, height: 17, marginTop: 2, accentColor: "#7c3aed", cursor: "inherit" }} />
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 14, fontWeight: 600, color: on ? "#a78bfa" : "#c4cadd" }}>{icon}{label}</div>
        <div style={{ fontSize: 12.5, color: "#5a6480", marginTop: 2 }}>{hint}</div>
      </div>
    </label>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#08080f", color: "white" }}>
      <SmmNav userName={userName} userAvatar={userAvatar} balance={0} />
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "28px 18px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,#7c3aed,#00d4ff)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Scissors size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800 }}>Editor de cortos</h1>
            <p style={{ color: "#8a92ad", fontSize: 13.5 }}>Corta retomas y silencios, subtítulos automáticos, volumen parejo — en tu navegador.</p>
          </div>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
          onClick={() => !running && fileInputRef.current?.click()}
          style={{ ...card, marginTop: 18, borderStyle: "dashed", borderColor: dragOver ? "#a78bfa" : "#2a2a44", textAlign: "center", cursor: running ? "default" : "pointer", background: dragOver ? "#12102a" : "#0d0d16" }}>
          <input ref={fileInputRef} type="file" multiple accept="video/*,.mp4,.mov,.m4v,.webm" style={{ display: "none" }} onChange={(e) => e.target.files && addFiles(e.target.files)} />
          <Upload size={26} color="#7c3aed" style={{ marginBottom: 8 }} />
          <div style={{ color: "#8a92ad", fontSize: 14 }}>
            {files.length ? "Agregar más tomas (se unen en orden)" : "Arrastra tus videos o haz click"} — MP4/MOV, máx {MAX_FILE_MB} MB c/u
          </div>
        </div>

        {/* Lista de videos (varias tomas → se cortan y unen en orden) */}
        {files.length > 0 && (
          <div style={{ ...card, marginTop: 12, padding: 14 }}>
            {files.length > 1 && <div style={{ fontSize: 12, color: "#a78bfa", fontWeight: 600, marginBottom: 8 }}>✂ {files.length} tomas — se cortan (retomas/silencios) y se unen en este orden:</div>}
            {files.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderTop: i ? "1px solid #14141f" : "none" }}>
                <span style={{ fontSize: 12, color: "#5a6480", width: 18 }}>{i + 1}.</span>
                <span style={{ flex: 1, fontSize: 13.5, color: "#c4cadd", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                <span style={{ fontSize: 12, color: "#5a6480" }}>{fmtMB(f.size)}</span>
                {!running && files.length > 1 && (
                  <>
                    <button onClick={() => moveFile(i, -1)} disabled={i === 0} style={{ background: "none", border: "none", color: i === 0 ? "#333" : "#8a92ad", cursor: i === 0 ? "default" : "pointer", fontSize: 15, padding: "0 3px" }}>↑</button>
                    <button onClick={() => moveFile(i, 1)} disabled={i === files.length - 1} style={{ background: "none", border: "none", color: i === files.length - 1 ? "#333" : "#8a92ad", cursor: i === files.length - 1 ? "default" : "pointer", fontSize: 15, padding: "0 3px" }}>↓</button>
                  </>
                )}
                {!running && <button onClick={() => removeFile(i)} style={{ background: "none", border: "none", cursor: "pointer", padding: "0 2px" }}><X size={14} color="#ef4444" /></button>}
              </div>
            ))}
          </div>
        )}

        {/* Opciones */}
        <div style={{ ...card, marginTop: 16 }}>
          <Toggle on={cutRetakes} set={setCutRetakes} icon={<Scissors size={15} />} label="Cortar retomas y falsos comienzos" hint="Cuando te trabas y repites, deja solo la última toma limpia (IA)." />
          {cutRetakes && (
            <label style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 0 6px 29px", fontSize: 13, color: condense ? "#a78bfa" : "#8a92ad", cursor: running ? "default" : "pointer" }}>
              <input type="checkbox" checked={condense} disabled={running} onChange={(e) => setCondense(e.target.checked)} style={{ width: 15, height: 15, accentColor: "#7c3aed" }} />
              Condensar además ideas redundantes (más agresivo)
            </label>
          )}
          <Toggle on={cutSilences} set={setCutSilences} icon={<Scissors size={15} />} label="Cortar silencios" hint="Elimina los vacíos/pausas muertas para un ritmo ágil." />
          <Toggle on={subsOn} set={setSubsOn} icon={<Captions size={15} />} label="Subtítulos automáticos (karaoke)" hint="Transcribe y quema subtítulos estilo TikTok, sincronizados." />

          {/* nota calidad/audio */}
          <div style={{ padding: "12px 0", borderTop: "1px solid #14141f", fontSize: 12, color: "#5a6480" }}>
            🎨 Se respetan los colores originales (sin filtros de color). El audio se iguala a un volumen parejo, sin limpieza — la haces tú.
          </div>

          {/* música */}
          <div style={{ padding: "12px 0 2px", borderTop: "1px solid #14141f" }}>
            <input ref={musicInputRef} type="file" accept="audio/*,.mp3,.m4a,.aac,.wav" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) setMusicFile(f); e.target.value = ""; }} />
            {!musicFile ? (
              <button onClick={() => musicInputRef.current?.click()} disabled={running} style={{ ...btnGhost, color: "#a78bfa" }}><Music size={15} /> Agregar música de fondo (opcional)</button>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, color: "#22c55e" }}>🎵 {musicFile.name}</span>
                {!running && <button onClick={() => setMusicFile(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={14} color="#ef4444" /></button>}
                <span style={{ fontSize: 12.5, color: "#8a92ad" }}>Volumen: {Math.round(musicVol * 100)}%</span>
                <input type="range" min={0.05} max={0.5} step={0.01} value={musicVol} disabled={running} onChange={(e) => setMusicVol(parseFloat(e.target.value))} style={{ flex: 1, minWidth: 120, accentColor: "#7c3aed" }} />
              </div>
            )}
          </div>
        </div>

        {/* BYOK — usar tu propia API Key (Groq para transcripción, Anthropic para retomas) */}
        <ApiKeysCard need="both" />

        {/* Acción */}
        <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <button onClick={handleRun} disabled={!files.length || running} style={{ ...btnPrimary, opacity: !files.length || running ? 0.5 : 1, cursor: !files.length || running ? "default" : "pointer" }}>
            {running ? <><Loader2 className="animate-spin" size={17} /> Editando…</> : <><Scissors size={17} /> {files.length > 1 ? "Unir y editar" : "Editar video"}</>}
          </button>
          {(running || engineStatus === "loading") && <span style={{ fontSize: 13, color: "#8a92ad" }}>{statusLine}</span>}
        </div>

        {running && <div style={{ marginTop: 14, height: 8, background: "#14141f", borderRadius: 6, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#7c3aed,#00d4ff)", transition: "width .3s" }} />
        </div>}

        {error && <div style={{ marginTop: 16, ...card, borderColor: "#3f1d2e", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 13.5, color: "#f0a5b5" }}>{error}</span>
        </div>}

        {result && (
          <div style={{ ...card, marginTop: 18, borderColor: "#1e3a2a" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <CheckCircle2 size={18} color="#22c55e" />
              <span style={{ fontWeight: 700 }}>Corto editado</span>
              <span style={{ fontSize: 12.5, color: "#8a92ad" }}>
                {result.origDur ? `${Math.round(result.origDur)}s → ${Math.round(result.newDur)}s` : ""} · {result.sizeMB}
              </span>
            </div>
            <video src={result.url} controls style={{ width: "100%", maxHeight: 420, borderRadius: 10, background: "#000" }} />
            <a href={result.url} download={result.name} style={{ ...btnPrimary, marginTop: 14, textDecoration: "none" }}><Download size={17} /> Descargar</a>
          </div>
        )}
      </div>
    </div>
  );
}
