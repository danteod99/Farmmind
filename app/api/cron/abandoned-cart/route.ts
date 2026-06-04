import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/app/lib/email";
import {
  renderRecovery,
  buildEmailUnsubscribeUrl,
  RECOVERY_STEP2_DELAY_HOURS,
} from "@/app/lib/abandoned-templates";

export const runtime = "nodejs";
export const maxDuration = 60;

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Mismo esquema de auth que /api/cron/send-drip
function isAuthorized(req: Request): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const auth = req.headers.get("authorization") || "";
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return auth === `Bearer ${secret}`;
}

const ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || "https://www.trustmind.online";
const WINDOW_DAYS = 14;     // no perseguir abandonos más viejos que esto
const MAX_SENDS_PER_RUN = 60;

interface AttemptRow {
  id: string;
  email: string;
  amount: number | null;
  status: string;
  recovery_step: number;
  recovery_last_sent_at: string | null;
  created_at: string;
}

function firstNameFromEmail(email: string): string {
  const raw = (email.split("@")[0] || "amigo").replace(/[._-]+/g, " ").trim();
  const w = raw.split(/\s+/)[0] || "amigo";
  return w.charAt(0).toUpperCase() + w.slice(1);
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = admin();
  const now = Date.now();
  const cutoff = new Date(now - WINDOW_DAYS * 24 * 3600 * 1000).toISOString();

  // Candidatos: abandonos con email, aún no terminados, dentro de la ventana.
  const { data: candidatesRaw, error: fErr } = await sb
    .from("payment_attempts")
    .select("id, email, amount, status, recovery_step, recovery_last_sent_at, created_at")
    .eq("status", "abandoned")
    .not("email", "is", null)
    .lt("recovery_step", 2)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(300);

  if (fErr) {
    console.error("[abandoned-cart] fetch error:", fErr);
    return Response.json({ error: "fetch failed" }, { status: 500 });
  }
  if (!candidatesRaw || candidatesRaw.length === 0) {
    return Response.json({ processed: 0, sent: 0, skipped: 0 });
  }

  // Dedup por email: nos quedamos con la fila MÁS RECIENTE de cada email.
  const byEmail = new Map<string, AttemptRow>();
  for (const r of candidatesRaw as AttemptRow[]) {
    const key = r.email.toLowerCase();
    if (!byEmail.has(key)) byEmail.set(key, r);
  }
  const emails = [...byEmail.keys()];

  // Quién ya pagó (cualquier intento succeeded) → no molestar.
  const { data: paid } = await sb
    .from("payment_attempts")
    .select("email")
    .eq("status", "succeeded")
    .not("email", "is", null);
  const paidSet = new Set((paid || []).map((p) => (p.email || "").toLowerCase()));

  // Supresiones (invitados) + unsubscribes (usuarios) por email.
  const { data: supp } = await sb.from("email_suppressions").select("email");
  const suppressed = new Set((supp || []).map((s) => (s.email || "").toLowerCase()));
  const { data: unsub } = await sb
    .from("email_unsubscribes")
    .select("email, channel")
    .not("email", "is", null);
  for (const u of unsub || []) {
    if (u.channel === "all" || u.channel === "email") {
      suppressed.add((u.email || "").toLowerCase());
    }
  }

  const results = { processed: 0, sent: 0, skipped: 0, suppressed: 0 };

  for (const email of emails) {
    if (results.sent >= MAX_SENDS_PER_RUN) break;
    const row = byEmail.get(email)!;

    if (paidSet.has(email) || suppressed.has(email)) {
      // Cerrar la fila para no volver a evaluarla.
      await sb.from("payment_attempts")
        .update({ recovery_step: 99 })
        .eq("id", row.id);
      results.suppressed++;
      continue;
    }

    // ¿Qué paso toca?
    let step = 0;
    if (row.recovery_step === 0) {
      step = 1; // email #1 al detectar el abandono
    } else if (row.recovery_step === 1) {
      const lastSent = row.recovery_last_sent_at ? Date.parse(row.recovery_last_sent_at) : 0;
      if (now - lastSent >= RECOVERY_STEP2_DELAY_HOURS * 3600 * 1000) {
        step = 2; // email #2 a las 48 h
      }
    }
    if (step === 0) {
      results.skipped++;
      continue; // aún no vence el siguiente paso
    }

    const planLabel = Number(row.amount) >= 200 ? "anual" : "mensual";
    const ctx = {
      firstName: firstNameFromEmail(email),
      email,
      planLabel,
      ofertaUrl: `${ORIGIN}/oferta`,
      unsubscribeUrl: buildEmailUnsubscribeUrl(ORIGIN, email),
    };

    try {
      const { subject, html, text } = renderRecovery(step, ctx);
      const res = await sendEmail({
        to: email,
        subject,
        html,
        text,
        tags: [
          { name: "campaign", value: "abandoned_cart" },
          { name: "step", value: String(step) },
        ],
      });

      if (!res) {
        // Sin RESEND_API_KEY: no marcar, reintenta en la próxima corrida.
        results.skipped++;
        continue;
      }

      await sb.from("payment_attempts")
        .update({ recovery_step: step, recovery_last_sent_at: new Date().toISOString() })
        .eq("id", row.id);
      results.sent++;
      results.processed++;
    } catch (e) {
      console.error(`[abandoned-cart] send error ${email}:`, e instanceof Error ? e.message : e);
      results.skipped++;
    }
  }

  return Response.json(results);
}
