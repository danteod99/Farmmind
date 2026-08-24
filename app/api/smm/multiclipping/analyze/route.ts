import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { isAdmin } from "@/app/lib/admin";

// La transcripción (Groq) + selección de momentos (Claude) de un video de
// 15 min puede tardar ~1-2 min en total.
export const maxDuration = 300;

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface WhisperWord { word: string; start: number; end: number }
interface WhisperSegment { start: number; end: number; text: string }

interface Seg { start: number; end: number }
interface Moment {
  start: number;
  end: number;
  segments: Seg[];
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
          segments: {
            type: "array" as const,
            description: "1 a 3 tramos del video original que, UNIDOS EN ORDEN, forman este clip. Usa varios tramos SOLO para saltarte relleno y dejar el clip coherente.",
            items: {
              type: "object" as const,
              properties: {
                start: { type: "number" as const, description: "Segundo de inicio del tramo en el video original" },
                end: { type: "number" as const, description: "Segundo de fin del tramo en el video original" },
              },
              required: ["start", "end"],
              additionalProperties: false,
            },
          },
          title: { type: "string" as const, description: "Título viral corto para sobreimprimir en el clip, máx 6 palabras, en MAYÚSCULAS" },
          hook: { type: "string" as const, description: "La frase textual del video que engancha en los primeros segundos del clip" },
          reason: { type: "string" as const, description: "Por qué este momento funciona como clip, en 1 frase" },
          score: { type: "integer" as const, description: "Potencial viral de 1 a 100" },
        },
        required: ["segments", "title", "hook", "reason", "score"],
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

    const isAdminUser = isAdmin(user.email);
    if (!isAdminUser) {
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

    // ── BYOK: cada usuario usa su propia API Key. Solo el admin (dueño) cae a la
    // key del sistema; los demás DEBEN poner la suya (así no gastan tu saldo). ──
    const userAnthropicKey = req.headers.get("x-anthropic-key")?.trim();
    const userGroqKey = req.headers.get("x-groq-key")?.trim();
    const anthropicKey = userAnthropicKey || (isAdminUser ? process.env.ANTHROPIC_API_KEY : undefined);
    const groqKey = userGroqKey || (isAdminUser ? process.env.GROQ_API_KEY : undefined);
    if (!groqKey) {
      return Response.json({ error: "Pon tu propia API Key de Groq (transcripción) en «Usar mi propia API Key»." }, { status: 400 });
    }
    if (!anthropicKey) {
      return Response.json({ error: "Pon tu propia API Key de Anthropic (análisis) en «Usar mi propia API Key»." }, { status: 400 });
    }
    const anthropic = new Anthropic({ apiKey: anthropicKey });

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
      headers: { Authorization: `Bearer ${groqKey}` },
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

    const prompt = `Eres un editor experto en clips VIRALES y DISRUPTIVOS para TikTok, Reels y YouTube Shorts (audiencia hispanohablante). Tu obsesión es el "scroll-stopping": clips que en los primeros 2 segundos FRENAN el dedo del usuario.

Te doy la transcripción de un video de ${Math.round(duration)} segundos, con timestamps en segundos:

<transcripcion>
${transcriptLines}
</transcripcion>

Elige los momentos MÁS DISRUPTIVOS para convertir en clips independientes. Un clip disruptivo tiene alguna de estas señales:
- FRASE GANCHO BRUTAL al inicio: una afirmación fuerte, contraria a la creencia común, chocante o polémica ("nadie te dice esto", "esto está mal", "la verdad que te ocultan").
- CURIOSITY GAP: abre una pregunta o promesa que obliga a quedarse ("lo que pasó después me voló la cabeza").
- DATO/CIFRA IMPACTANTE: números grandes, resultados sorprendentes, comparaciones extremas.
- GIRO o revelación inesperada, confesión, opinión valiente, o momento emocional/tenso.
- PATRÓN INTERRUMPIDO: algo que rompe lo esperado y genera "¿espera, qué?".

Reglas:
- Entre 5 y 8 clips, de 20 a 60 segundos cada uno.
- CADA CLIP DEBE EMPEZAR EN SU FRASE MÁS FUERTE (el gancho), NO en una intro lenta ni en "bueno, entonces...". Si el gancho está a mitad de un segmento, empieza justo ahí.
- Cada clip se entiende solo y cierra la idea sin cortar a media frase. No se solapan.
- DESCARTA momentos aburridos, explicativos sin gancho, o de relleno — mejor pocos clips brutales que muchos tibios.
- "hook" = la frase textual exacta con la que arranca el clip (debe ser disruptiva).
- "title" = titular viral para sobreimprimir, máx 6 palabras, MAYÚSCULAS, que genere curiosidad o choque.
- "score" (1-100) = qué tan disruptivo/scroll-stopping es. Ordena del mejor al peor.
- Explora ángulos frescos: elige los momentos más audaces aunque no sean los más obvios.

MUY IMPORTANTE — CLIPS COMPUESTOS (unir tramos y cortar relleno):
- Cada clip se define con "segments": una lista de 1 a 3 tramos [{start,end}] del video original que, UNIDOS EN ORDEN, forman el clip.
- Usa VARIOS tramos cuando entre el gancho y el remate hay RELLENO, divagación o algo fuera de tema que no aporta: por ejemplo tramo 60-90s + tramo 120-150s, saltándote el 90-120s aburrido. Así el clip queda más potente y directo.
- Los tramos unidos DEBEN SER COHERENTES: al pegarlos, la idea tiene que fluir y entenderse (no unas frases sueltas inconexas). Si al saltar relleno se rompe el sentido, NO lo saltes.
- Si el clip es bueno de corrido, usa 1 solo tramo. No fuerces cortes.
- Dentro de un clip, ordena los tramos por tiempo y que no se solapen.`;

    let response;
    try {
      response = await anthropic.messages.create({
        model: "claude-opus-4-8",
        max_tokens: 16000,
        // Temperatura alta → en cada "Volver a analizar" surgen clips frescos/distintos
        temperature: 1,
        output_config: {
          format: { type: "json_schema", schema: MOMENTS_SCHEMA },
        },
        messages: [{ role: "user", content: prompt }],
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const which = userAnthropicKey ? "tu API Key de Anthropic" : "la API Key de Anthropic del sistema";
      if (/credit balance|insufficient|billing/i.test(msg)) {
        return Response.json({ error: `Sin saldo en ${which}. Recarga créditos en console.anthropic.com o pon tu propia key en Ajustes de API.` }, { status: 402 });
      }
      if (/authentication|invalid.*api.*key|x-api-key|401/i.test(msg)) {
        return Response.json({ error: `La API Key de Anthropic no es válida. Revísala en Ajustes de API.` }, { status: 401 });
      }
      return Response.json({ error: "La IA no pudo analizar el video (Anthropic)." }, { status: 502 });
    }

    const textBlock = response.content.find((b) => b.type === "text");
    if (response.stop_reason === "refusal" || !textBlock) {
      return Response.json({ error: "La IA no pudo analizar este video" }, { status: 502 });
    }
    const parsed = JSON.parse(textBlock.text) as { moments: Moment[] };
    // Normaliza los segmentos de cada clip: acota al video, ordena, descarta basura,
    // y calcula el span total (start/end) del clip para compatibilidad y UI.
    const moments = (parsed.moments || [])
      .map((m) => {
        const segs = (m.segments || [])
          .map((s) => ({ start: Math.max(0, s.start), end: Math.min(duration, s.end) }))
          .filter((s) => s.end - s.start >= 0.5)
          .sort((a, b) => a.start - b.start);
        if (segs.length === 0) return null;
        return { ...m, segments: segs, start: segs[0].start, end: segs[segs.length - 1].end };
      })
      .filter((m): m is Moment => m !== null);

    if (moments.length === 0) {
      return Response.json({ error: "La IA no encontró momentos destacables" }, { status: 422 });
    }

    return Response.json({ moments, words, segments, duration });
  } catch (e) {
    console.error("[multiclipping/analyze] error:", e);
    return Response.json({ error: "Error interno analizando el video" }, { status: 500 });
  }
}
