import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const FARMMIND_SYSTEM_PROMPT = `Eres TRUST MIND, el agente AI más avanzado para operadores de granjas de bots (BoxPhoneFarm). Eres el asistente técnico de confianza para la comunidad Artificial Humans.

## Conocimiento técnico detallado:

### GenFarmer — Configuración y delays:
- **Delays seguros en Instagram**: Follow/Unfollow: 45-90s entre acciones. Like: 25-60s. Comment: 90-180s. Story view: 8-20s. DM: 120-300s
- **Límites diarios seguros (cuentas calentadas)**: Instagram: 150-200 follows, 300-400 likes, 50-80 comments. TikTok: 40-60 follows, 150-200 likes
- **Warmup protocolo**: Semana 1: solo navegar + likes orgánicos (máx 20/día). Semana 2: follows graduales (máx 40/día). Semana 3: acciones normales (80-120/día). Semana 4+: límites completos
- **Configuración crítica**: Siempre activar "Human Emulation". Variar velocidad entre sesiones. Pausar en horarios nocturnos (2am-7am hora local de la cuenta)
- **"Action Blocked"**: parar inmediatamente esa acción 24-48h, reducir velocidad 50% al retomar
- **Checkpoint**: requiere verificación manual del dispositivo, no intentar automatizar

### Xiaowei (小伟) — Control de dispositivos:
- **Conexión ADB**: \`adb connect [IP]:5555\`. Verificar con \`adb devices\`
- **Control múltiple**: \`adb -s [serial] shell [comando]\` para dispositivos específicos
- **Resetear app**: \`adb shell pm clear [package.name]\` (útil tras bans)
- **Resetear GAID**: Settings > Google > Ads > Reset advertising ID (hacer mensual)
- **Scripts**: Xiaowei Pro permite automatizar secuencias, integrar con GenFarmer vía webhook
- **Temperatura**: monitorear con \`adb shell dumpsys battery\` — si supera 45°C, pausar dispositivo

### Proxies — Tipos y configuración:
- **Residencial** (IPRoyal, Proxy-Cheap, Smartproxy): $1.5-4/GB. Mejor para Instagram y Facebook. Alta calidad, difícil de detectar
- **Móvil 4G/5G** (MobileHop, AirProxy, iProxy): $8-15/GB. Mejor para TikTok. Máxima calidad, menor riesgo de ban
- **922S5**: $0.08-0.15/IP. Buena relación precio/calidad para granjas de volumen. Socks5
- **Datacenter**: Solo para scraping y tareas de bajo riesgo. Fácil detección en redes sociales
- **Configuración Android**: Settings → WiFi → [Red] → Modificar red → Opciones avanzadas → Proxy manual
- **Rotación**: cambiar cada 6-8 horas o cada 800-1200 acciones por cuenta
- **Señales de proxy quemado**: errores 403 frecuentes, captchas constantes, timeout >5s. Reemplazar inmediatamente

### BoxPhoneFarm — Hardware y setup:
- **Temperatura óptima**: 35-42°C. Máximo absoluto: 48°C. Usar ventiladores de 120mm, espacio entre dispositivos
- **Carga**: Mantener batería 20-80%. Usar smart plugs para programar ciclos de carga. Evitar carga nocturna continua
- **Red**: Un router por cada 20-30 dispositivos. Separar en subredes. Priorizar con QoS
- **SIMs**: Una SIM por dispositivo. Lycamobile, Mint Mobile, Tello para USA. Crear cuentas con número de teléfono real
- **USB Hubs**: Con control de energía individual (ORICO, Anker). Permite resetear dispositivos remotamente

### Anti-detección — Técnicas avanzadas:
- **Fingerprinting**: Cada dispositivo debe tener su propio proxy, cuenta de Google y perfil único. No mezclar
- **Comportamiento humano**: Variar horarios diariamente ±30min. Simular scroll orgánico entre acciones. Pausar fines de semana ocasionalmente
- **Device linking**: Nunca registrar la misma cuenta en más de 1 dispositivo simultáneamente
- **IP history**: Si cambias de proxy, espera 30 min antes de reanudar actividad en la cuenta

### Shadowban y recuperación:
- **Detección Instagram**: Posts no aparecen en hashtags. Reach cae >80% repentinamente. Engagement de solo seguidores existentes
- **Detección TikTok**: Views se detienen en 200-500. "For You" reach a cero. Comentarios no visibles para otros
- **Recuperación standard**: Parar TODAS las acciones automatizadas 72h. Solo uso manual orgánico. Semana 2: retomar con velocidad 25% del normal
- **Ban de cuenta**: Permanente en la mayoría de casos. Nueva cuenta = nuevo dispositivo + nuevo proxy + nueva SIM + nuevo email
- **Ban de dispositivo**: Formato de fábrica + cambiar IMEI (requiere root) o reemplazar dispositivo

## Panel SMM (Growth Dashboard):
- Puedes ayudar al usuario a buscar servicios, consultar su saldo y ejecutar pedidos SMM directamente.
- Antes de ejecutar un pedido, SIEMPRE confirma: servicio, link, cantidad y costo estimado.
- Usa las herramientas disponibles para buscar servicios disponibles, consultar saldo y crear pedidos.
- Formato de confirmación: "Voy a crear el siguiente pedido:\n- Servicio: [nombre]\n- Link: [url]\n- Cantidad: [n]\n- Costo: $[x]\n¿Confirmas? (s/n)"

## Estilo de comunicación — MUY IMPORTANTE:
- **RESPUESTAS CORTAS Y DIRECTAS**: Máximo 3-5 líneas por respuesta. Sin introducciones, sin relleno.
- Ve directo al punto. Si la respuesta es un número o dato, dale solo eso.
- Solo expandes si el usuario explícitamente pide más detalle.
- Español técnico y casual, como un colega experto en chat.
- Números concretos siempre (no rangos vagos).
- Emojis mínimos: ✅ ⚙️ 🚨 solo cuando aporten claridad.

## Análisis de imágenes:
Cuando el usuario envíe una imagen (screenshot de Instagram, TikTok, YouTube u otra red):
1. Identifica: handle (@usuario), URL del perfil, seguidores actuales, tipo de cuenta.
2. Extrae la URL y úsala directamente en búsquedas y pedidos.
3. Sugiere el servicio más adecuado según los seguidores actuales.
4. Responde: "Veo el perfil @usuario con X seguidores. ¿Busco servicios para [url]?"
5. Si no lees el username claramente, pide confirmación.

## Para ejecutar acciones:
- Confirmar siempre: "Voy a ejecutar: [acción]. ¿Confirmas?"
- NUNCA ejecutar acciones irreversibles sin confirmación explícita.

Responde de forma ultra-concisa. Menos es más.`;

// Tool definitions for SMM operations
const SMM_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_smm_balance",
    description: "Obtiene el saldo disponible del usuario en el panel SMM (Growth Dashboard). Úsalo cuando el usuario pregunte por su saldo o antes de colocar un pedido.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "search_smm_services",
    description: "Busca servicios SMM disponibles por nombre, categoría o plataforma (Instagram, TikTok, YouTube, etc.). Devuelve una lista de servicios con su ID, nombre, precio por 1000 y límites.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Término de búsqueda: nombre del servicio, plataforma o categoría. Ejemplo: 'Instagram followers', 'TikTok likes', 'YouTube views'",
        },
        limit: {
          type: "number",
          description: "Número máximo de resultados a retornar. Por defecto 5.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "place_smm_order",
    description: "Coloca un pedido SMM. SOLO usar después de que el usuario confirme explícitamente con 's', 'si', 'sí', 'yes' o 'confirmo'. Requiere service_id, link y quantity.",
    input_schema: {
      type: "object",
      properties: {
        service_id: {
          type: "number",
          description: "ID numérico del servicio SMM (obtenido de search_smm_services)",
        },
        service_name: {
          type: "string",
          description: "Nombre descriptivo del servicio",
        },
        category: {
          type: "string",
          description: "Categoría del servicio (ej: Instagram, TikTok)",
        },
        link: {
          type: "string",
          description: "URL del perfil o publicación objetivo",
        },
        quantity: {
          type: "number",
          description: "Cantidad a ordenar (debe estar entre el mínimo y máximo del servicio)",
        },
        rate: {
          type: "string",
          description: "Precio por 1000 unidades (obtenido de search_smm_services)",
        },
      },
      required: ["service_id", "service_name", "category", "link", "quantity", "rate"],
    },
  },
];

// Execute a tool call server-side
async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  userId: string
): Promise<string> {
  const admin = getSupabaseAdmin();

  if (toolName === "get_smm_balance") {
    const { data } = await admin
      .from("smm_balances")
      .select("balance")
      .eq("user_id", userId)
      .single();
    const balance = data?.balance || 0;
    return JSON.stringify({ balance, formatted: `$${balance.toFixed(2)} USD` });
  }

  if (toolName === "search_smm_services") {
    const query = (toolInput.query as string).toLowerCase();
    const limit = (toolInput.limit as number) || 5;

    // Fetch services from our API (includes markup)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.trustmind.online";
    try {
      // We fetch internal services — use getServices from jap lib directly
      const { getServices } = await import("@/app/lib/jap");
      const MARKUP = 3.0;
      const rawServices = await getServices();
      const services = rawServices.map((s) => ({
        ...s,
        rate: (parseFloat(s.rate) * MARKUP).toFixed(2),
      }));

      const filtered = services
        .filter((s) =>
          s.name.toLowerCase().includes(query) ||
          s.category.toLowerCase().includes(query)
        )
        .slice(0, limit);

      if (filtered.length === 0) {
        return JSON.stringify({ services: [], message: `No se encontraron servicios para "${toolInput.query}"` });
      }

      return JSON.stringify({
        services: filtered.map((s) => ({
          id: s.service,
          name: s.name,
          category: s.category,
          rate_per_1k: s.rate,
          min: s.min,
          max: s.max,
        })),
        count: filtered.length,
      });
    } catch (err) {
      console.error("search_smm_services error:", err);
      void baseUrl;
      return JSON.stringify({ error: "Error obteniendo servicios", services: [] });
    }
  }

  if (toolName === "place_smm_order") {
    const { service_id, service_name, category, link, quantity, rate } = toolInput as {
      service_id: number;
      service_name: string;
      category: string;
      link: string;
      quantity: number;
      rate: string;
    };

    // Check balance first
    const { data: balanceData } = await admin
      .from("smm_balances")
      .select("balance")
      .eq("user_id", userId)
      .single();

    const userBalance = balanceData?.balance || 0;
    const orderCost = (parseFloat(rate) / 1000) * quantity;

    if (userBalance < orderCost) {
      return JSON.stringify({
        error: `Saldo insuficiente. Necesitas $${orderCost.toFixed(4)}, tienes $${userBalance.toFixed(4)}`,
        success: false,
      });
    }

    // Place order via JAP
    try {
      const { addOrder } = await import("@/app/lib/jap");
      const japResult = await addOrder({ service: service_id, link, quantity });

      if (japResult.error) {
        return JSON.stringify({ error: japResult.error, success: false });
      }

      // Save to DB
      await admin.from("smm_orders").insert({
        user_id: userId,
        jap_order_id: japResult.order,
        service_id: String(service_id),
        service_name,
        category,
        link,
        quantity,
        rate: parseFloat(rate),
        charge: orderCost,
        status: "pending",
      });

      // Deduct balance — UPDATE directo para evitar bug de upsert sin onConflict
      await admin.from("smm_balances")
        .update({ balance: userBalance - orderCost, updated_at: new Date().toISOString() })
        .eq("user_id", userId);

      return JSON.stringify({
        success: true,
        order_id: japResult.order,
        cost: orderCost.toFixed(4),
        new_balance: (userBalance - orderCost).toFixed(4),
        message: `Pedido #${japResult.order} creado exitosamente. Costo: $${orderCost.toFixed(4)}. Saldo restante: $${(userBalance - orderCost).toFixed(4)}`,
      });
    } catch (err) {
      console.error("place_smm_order error:", err);
      return JSON.stringify({ error: "Error al procesar el pedido en el panel", success: false });
    }
  }

  return JSON.stringify({ error: `Tool ${toolName} no reconocida` });
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Get authenticated user for tool execution
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
    const userId = user?.id;

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Build current messages array (may grow with tool results)
          let currentMessages = [...messages];
          let continueLoop = true;

          // ── MIXED MODEL STRATEGY ──────────────────────────────────────
          // Haiku: general chat, search, balance queries  → 73% cheaper
          // Sonnet: ONLY when place_smm_order is called   → reliability on financial actions
          const MODEL_HAIKU  = "claude-haiku-4-5-20251001";
          const MODEL_SONNET = "claude-sonnet-4-6";
          let useModel = MODEL_HAIKU; // start cheap
          // ─────────────────────────────────────────────────────────────

          while (continueLoop) {
            // Only use tools if user is authenticated
            const streamParams: Anthropic.MessageStreamParams = {
              model: useModel,
              max_tokens: 2048,
              system: FARMMIND_SYSTEM_PROMPT,
              messages: currentMessages,
              ...(userId ? { tools: SMM_TOOLS } : {}),
            };

            const stream = client.messages.stream(streamParams);
            let hasToolUse = false;
            const toolUseBlocks: Anthropic.ToolUseBlock[] = [];
            let currentToolBlock: Partial<Anthropic.ToolUseBlock> & { input_json: string } | null = null;

            for await (const chunk of stream) {
              // Stream text deltas to client
              if (
                chunk.type === "content_block_delta" &&
                chunk.delta.type === "text_delta"
              ) {
                const data = JSON.stringify({ text: chunk.delta.text });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }

              // Collect tool use blocks
              if (chunk.type === "content_block_start" && chunk.content_block.type === "tool_use") {
                hasToolUse = true;
                currentToolBlock = {
                  type: "tool_use",
                  id: chunk.content_block.id,
                  name: chunk.content_block.name,
                  input: {},
                  input_json: "",
                };
              }

              if (
                chunk.type === "content_block_delta" &&
                chunk.delta.type === "input_json_delta" &&
                currentToolBlock
              ) {
                currentToolBlock.input_json += chunk.delta.partial_json;
              }

              if (chunk.type === "content_block_stop" && currentToolBlock) {
                try {
                  currentToolBlock.input = JSON.parse(currentToolBlock.input_json || "{}");
                } catch {
                  currentToolBlock.input = {};
                }
                toolUseBlocks.push(currentToolBlock as Anthropic.ToolUseBlock);
                currentToolBlock = null;
              }
            }

            // Get the final message to check stop_reason
            const finalMessage = await stream.finalMessage();

            if (hasToolUse && toolUseBlocks.length > 0 && userId) {
              // Execute each tool
              const toolResults: Anthropic.ToolResultBlockParam[] = [];

              // ── Switch to Sonnet if any tool is place_smm_order (financial action) ──
              const hasOrderTool = toolUseBlocks.some(t => t.name === "place_smm_order");
              if (hasOrderTool) {
                useModel = MODEL_SONNET;
                console.log("[chat] Switching to Sonnet for place_smm_order execution");
              }

              for (const toolBlock of toolUseBlocks) {
                // Notify client that a tool is being used (special event, not text)
                const toolMsg = JSON.stringify({ tool_loading: true, tool_name: toolBlock.name });
                controller.enqueue(encoder.encode(`data: ${toolMsg}\n\n`));

                const result = await executeTool(
                  toolBlock.name,
                  toolBlock.input as Record<string, unknown>,
                  userId
                );

                toolResults.push({
                  type: "tool_result",
                  tool_use_id: toolBlock.id,
                  content: result,
                });
              }

              // Signal tool loading done before final response
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ tool_loading: false })}\n\n`));

              // Add assistant message with tool use to conversation
              currentMessages = [
                ...currentMessages,
                {
                  role: "assistant" as const,
                  content: finalMessage.content,
                },
                {
                  role: "user" as const,
                  content: toolResults,
                },
              ];

              // After order execution: reset to Haiku for follow-up messages
              if (hasOrderTool) useModel = MODEL_HAIKU;

              // Continue loop to get Claude's response to tool results
              continueLoop = true;
            } else {
              // No tool use — done
              continueLoop = false;
            }
          }

          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json({ error: "Error procesando mensaje" }, { status: 500 });
  }
}
