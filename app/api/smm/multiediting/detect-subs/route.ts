import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { isAdmin } from "@/app/lib/admin";

// Detección de subtítulos quemados para Multiediting: recibe fotogramas (base64,
// mitad inferior del video) y responde si ya hay captions sobreimpresos, para
// no ponerle doble subtitulado. Usa Haiku (visión) — binario y barato.
export const maxDuration = 60;

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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

    // BYOK: la key del usuario o (solo admin) la del sistema. Sin key → se OMITE
    // la detección (no bloquea el flujo): se asume que no hay subtítulos.
    const anthropicKey = req.headers.get("x-anthropic-key")?.trim() || (isAdminUser ? process.env.ANTHROPIC_API_KEY : undefined);
    if (!anthropicKey) {
      return Response.json({ hasSubtitles: false, skipped: true });
    }
    const anthropic = new Anthropic({ apiKey: anthropicKey });

    const { frames } = (await req.json()) as { frames?: string[] };
    if (!Array.isArray(frames) || frames.length === 0) {
      return Response.json({ error: "Faltan los fotogramas" }, { status: 400 });
    }
    // 4 frames máx y ~1 MB por frame de tope: suficiente para decidir, imposible de abusar.
    const imgs = frames.slice(0, 4).filter((f) => typeof f === "string" && f.length < 1_400_000);
    if (imgs.length === 0) {
      return Response.json({ error: "Fotogramas inválidos" }, { status: 400 });
    }

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      messages: [{
        role: "user",
        content: [
          ...imgs.map((data) => ({
            type: "image" as const,
            source: { type: "base64" as const, media_type: "image/jpeg" as const, data },
          })),
          {
            type: "text" as const,
            text: "Estas imágenes son la mitad inferior de fotogramas de un mismo video. ¿En alguna se ven subtítulos o captions sobreimpresos (texto que transcribe lo que se habla, quemado en la imagen)? Ignora logos, marcas de agua, banners de noticias y texto del entorno (carteles, ropa, pantallas). Responde SOLO con JSON: {\"hasSubtitles\": true} o {\"hasSubtitles\": false}",
          },
        ],
      }],
    });

    const text = response.content.find((b) => b.type === "text")?.text || "";
    const match = text.match(/\{[^}]*\}/);
    let hasSubtitles = false;
    if (match) {
      try { hasSubtitles = !!JSON.parse(match[0]).hasSubtitles; } catch { /* default false */ }
    }
    return Response.json({ hasSubtitles });
  } catch (err) {
    console.error("[multiediting/detect-subs] error", err);
    return Response.json({ error: "Error interno al detectar subtítulos" }, { status: 500 });
  }
}
