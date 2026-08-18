import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { isAdmin } from "@/app/lib/admin";

// La transcripción (Groq) + selección de momentos (Claude) de un video de
// 15 min puede tardar ~1-2 min en total.
export const maxDuration = 300;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface WhisperWord { word: string; start: number; end: number }
interface WhisperSegment { start: number; end: number; text: string }

interface Moment {
  start: number;
  end: number;
  title: string;
  hook: string;
  reason: string;
  score: number;
}

const MOMENTS_SCHEMA = {
  type: "object" as const,
  properties: {
    moments: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          start: { type: "number" as const, description: "Segundo de inicio del clip en el video original" },
          end: { type: "number" as const, description: "Segundo de fin del clip en el video original" },
          title: { type: "string" as const, description: "Título viral corto para sobreimprimir en el clip, máx 6 palabras, en MAYÚSCULAS" },
          hook: { type: "string" as const, description: "La frase textual del video que engancha en los primeros segundos del clip" },
          reason: { type: "string" as const, description: "Por qué este momento funciona como clip, en 1 frase" },
          score: { type: "integer" as const, description: "Potencial viral de 1 a 100" },
        },
        required: ["start", "end", "title", "hook", "reason", "score"],
        additionalProperties: false,
      },
    },
  },
  required: ["moments"],
  additionalProperties: false,
};

export async function POST(req: Request) {
  try {
    // ── auth: usuario Pro o admin (mismo gating que la página) ──
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setAll(cookiesToSet: any[]) {
            cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: unknown }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            );
          },
        },
      }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });

    if (!isAdmin(user.email)) {
      const admin = getSupabaseAdmin();
      const { data: subs } = await admin
        .from("tm_subscriptions")
        .select("tier, expires_at")
        .eq("user_id", user.id)
        .eq("tier", "pro");
      const active = (subs || []).some(
        (s) => !s.expires_at || new Date(s.expires_at).getTime() > Date.now()
      );
      if (!active) return Response.json({ error: "Requiere plan Pro" }, { status: 403 });
    }

    if (!process.env.GROQ_API_KEY) {
      return Response.json({ error: "Transcripción no configurada (falta GROQ_API_KEY)" }, { status: 503 });
    }

    const form = await req.formData();
    const audio = form.get("audio");
    const durationRaw = Number(form.get("duration") || 0);
    if (!(audio instanceof File) || audio.size === 0) {
      return Response.json({ error: "Falta el archivo de audio" }, { status: 400 });
    }
    if (audio.size > 24 * 1024 * 1024) {
      return Response.json({ error: "Audio demasiado grande (máx 24 MB)" }, { status: 413 });
    }

    // ── 1. Transcribir con Groq Whisper (timestamps por palabra y segmento) ──
    const groqForm = new FormData();
    groqForm.append("file", audio, audio.name || "audio.mp3");
    groqForm.append("model", "whisper-large-v3-turbo");
    groqForm.append("response_format", "verbose_json");
    groqForm.append("timestamp_granularities[]", "word");
    groqForm.append("timestamp_granularities[]", "segment");

    const groqRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: groqForm,
    });
    if (!groqRes.ok) {
      const detail = await groqRes.text().catch(() => "");
      console.error("[multiclipping/analyze] groq error", groqRes.status, detail.slice(0, 300));
      return Response.json({ error: `La transcripción falló (${groqRes.status})` }, { status: 502 });
    }
    const tr = await groqRes.json() as {
      duration?: number;
      segments?: WhisperSegment[];
      words?: WhisperWord[];
    };
    const segments = (tr.segments || []).map((s) => ({
      start: Math.round(s.start * 10) / 10,
      end: Math.round(s.end * 10) / 10,
      text: (s.text || "").trim(),
    })).filter((s) => s.text);
    const words = (tr.words || []).map((w) => ({
      word: (w.word || "").trim(),
      start: w.start,
      end: w.end,
    })).filter((w) => w.word);

    if (segments.length === 0) {
      return Response.json({ error: "No se detectó voz en el video" }, { status: 422 });
    }

    const duration = durationRaw || tr.duration || segments[segments.length - 1].end;

    // ── 2. Claude elige los mejores momentos ──
    const transcriptLines = segments
      .map((s) => `[${s.start.toFixed(1)}-${s.end.toFixed(1)}] ${s.text}`)
      .join("\n");

    const prompt = `Eres un editor experto en clips virales para TikTok, Reels y YouTube Shorts (audiencia hispanohablante).

Te doy la transcripción de un video de ${Math.round(duration)} segundos, con timestamps en segundos:

<transcripcion>
${transcriptLines}
</transcripcion>

Elige los MEJORES momentos para convertir en clips virales independientes. Reglas:
- Entre 4 y 8 clips, de 20 a 60 segundos cada uno.
- Cada clip debe entenderse por sí solo: empieza donde arranca la idea (idealmente en una frase gancho) y termina donde cierra, sin cortar a nadie a media frase — ajusta start/end a los límites de los segmentos.
- Prioriza: historias con giro, datos sorprendentes, opiniones fuertes, instrucciones accionables, momentos emocionales o polémicos.
- Los clips no deben solaparse.
- El "title" es para sobreimprimir en el video: máx 6 palabras, MAYÚSCULAS, estilo titular viral en español.
- Ordena los momentos del mejor al peor score.`;

    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 16000,
      output_config: {
        format: { type: "json_schema", schema: MOMENTS_SCHEMA },
      },
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (response.stop_reason === "refusal" || !textBlock) {
      return Response.json({ error: "La IA no pudo analizar este video" }, { status: 502 });
    }
    const parsed = JSON.parse(textBlock.text) as { moments: Moment[] };
    const moments = (parsed.moments || [])
      .filter((m) => m.end > m.start && m.start >= 0 && m.end <= duration + 2)
      .map((m) => ({ ...m, start: Math.max(0, m.start), end: Math.min(duration, m.end) }));

    if (moments.length === 0) {
      return Response.json({ error: "La IA no encontró momentos destacables" }, { status: 422 });
    }

    return Response.json({ moments, words, segments, duration });
  } catch (e) {
    console.error("[multiclipping/analyze] error:", e);
    return Response.json({ error: "Error interno analizando el video" }, { status: 500 });
  }
}
