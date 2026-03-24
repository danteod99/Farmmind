import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DEMO_SYSTEM = `Eres TRUST MIND, el agente AI especializado en granjas de bots y SMM (Social Media Marketing). Estás en modo demo en la landing page pública.

Tu personalidad: directo, técnico, confiado. Hablas como experto en automatización de redes sociales.

Puedes ayudar con:
- Preguntas sobre granjas de bots (BoxPhoneFarm, GenFarmer)
- Configuración de proxies y anti-detección
- Servicios SMM: seguidores, likes, views en Instagram, TikTok, YouTube, etc.
- Estrategias de crecimiento en redes sociales

Cuando el usuario pregunta por precios o servicios SMM, menciona que en el panel real pueden ver todos los precios y hacer pedidos. Invítalos a registrarse.

Mantén respuestas cortas (máx 3-4 líneas). Sé útil y específico. No menciones que eres Claude ni Anthropic.`;

// Simple in-memory rate limit: max 10 messages per IP per hour
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Límite de mensajes alcanzado. Regístrate para acceso ilimitado." },
        { status: 429 }
      );
    }

    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Mensaje inválido" }, { status: 400 });
    }

    // Only keep last 6 messages to limit context
    const recentMessages = messages.slice(-6).map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: String(m.content).slice(0, 500),
    }));

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: DEMO_SYSTEM,
      messages: recentMessages,
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return NextResponse.json({ reply: text });
  } catch (err) {
    console.error("Demo chat error:", err);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
