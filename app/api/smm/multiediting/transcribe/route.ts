import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { isAdmin } from "@/app/lib/admin";

// Transcripción-solo (Groq Whisper) para los subtítulos de Multiediting.
// A diferencia de multiclipping/analyze, NO hace análisis de momentos con Claude:
// aquí solo se necesitan las palabras/segmentos con timestamps para armar el ASS.
export const maxDuration = 300;

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface WhisperWord { word: string; start: number; end: number }
interface WhisperSegment { start: number; end: number; text: string }

export async function POST(req: Request) {
  try {
    // ── auth: usuario Pro o admin (mismo gating que Multiediting) ──
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

    // BYOK: la key de Groq del usuario si la trae; solo el admin cae a la del sistema.
    const groqKey = req.headers.get("x-groq-key")?.trim() || (isAdminUser ? process.env.GROQ_API_KEY : undefined);
    if (!groqKey) {
      return Response.json({ error: "Pon tu propia API Key de Groq (transcripción) en «Usar mi propia API Key»." }, { status: 400 });
    }

    const form = await req.formData();
    const audio = form.get("audio");
    if (!(audio instanceof File) || audio.size === 0) {
      return Response.json({ error: "Falta el archivo de audio" }, { status: 400 });
    }
    if (audio.size > 24 * 1024 * 1024) {
      return Response.json({ error: "Audio demasiado grande (máx 24 MB). Usa clips más cortos." }, { status: 413 });
    }

    // Transcribir con Groq Whisper (timestamps por palabra y segmento)
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
      console.error("[multiediting/transcribe] groq error", groqRes.status, detail.slice(0, 300));
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

    return Response.json({ words, segments, duration: tr.duration || 0 });
  } catch (err) {
    console.error("[multiediting/transcribe] error", err);
    return Response.json({ error: "Error interno al transcribir" }, { status: 500 });
  }
}
