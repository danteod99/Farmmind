import { createClient } from "@supabase/supabase-js";
import { DRIP_STEPS, type TemplateCtx } from "@/app/lib/drip-templates";
import { sendEmail } from "@/app/lib/email";
import { sendWhatsApp } from "@/app/lib/whatsapp";
import crypto from "crypto";

export const runtime = "nodejs";
export const maxDuration = 60;

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Auth: Vercel Cron envía Authorization: Bearer <CRON_SECRET>
function isAuthorized(req: Request): boolean {
  // En dev permitimos sin auth para testing manual
  if (process.env.NODE_ENV !== "production") return true;
  const auth = req.headers.get("authorization") || "";
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return auth === `Bearer ${secret}`;
}

interface DripRow {
  id: string;
  user_id: string;
  campaign: string;
  step: number;
  channel: "email" | "whatsapp";
  scheduled_for: string;
}

interface ProfileForDrip {
  full_name?: string;
  phone?: string;
  subscription_plan?: string;
  subscription_status?: string;
  stripe_subscription_id?: string;
}

interface UserForDrip {
  id: string;
  email?: string;
  user_metadata?: { full_name?: string };
}

const ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || "https://www.trustmind.online";

function buildUnsubscribeUrl(userId: string): string {
  const secret = process.env.UNSUBSCRIBE_SECRET || "trustmind_unsub";
  const token = crypto.createHmac("sha256", secret).update(userId).digest("hex").slice(0, 24);
  return `${ORIGIN}/api/email/unsubscribe?u=${userId}&t=${token}`;
}

function buildContext(user: UserForDrip, profile: ProfileForDrip): TemplateCtx {
  const fullName = (profile?.full_name || user.user_metadata?.full_name || (user.email || "").split("@")[0] || "amigo");
  const firstName = fullName.split(/\s+/)[0];
  return {
    firstName,
    email: user.email || "",
    panelUrl: `${ORIGIN}/smm/services`,
    ofertaUrl: `${ORIGIN}/oferta`,
    cursosUrl: `${ORIGIN}/cursos`,
    unsubscribeUrl: buildUnsubscribeUrl(user.id),
  };
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = admin();
  const now = new Date().toISOString();

  // Fetch hasta 30 mensajes pendientes vencidos
  const { data: due, error: fetchErr } = await sb
    .from("drip_messages")
    .select("id, user_id, campaign, step, channel, scheduled_for")
    .eq("status", "pending")
    .lte("scheduled_for", now)
    .order("scheduled_for", { ascending: true })
    .limit(30);

  if (fetchErr) {
    console.error("[cron drip] fetch error:", fetchErr);
    return Response.json({ error: "fetch failed" }, { status: 500 });
  }

  if (!due || due.length === 0) {
    return Response.json({ processed: 0 });
  }

  const results = { processed: 0, sent: 0, skipped: 0, failed: 0 };

  for (const msg of due as DripRow[]) {
    try {
      // Auth.users (email)
      const { data: userData } = await sb.auth.admin.getUserById(msg.user_id);
      const user = userData?.user;
      if (!user || !user.email) {
        await sb.from("drip_messages")
          .update({ status: "failed", error_message: "user not found" })
          .eq("id", msg.id);
        results.failed++;
        continue;
      }

      // Profile (suscripción + phone)
      const { data: profile } = await sb
        .from("profiles")
        .select("full_name, phone, subscription_plan, subscription_status, stripe_subscription_id")
        .eq("id", user.id)
        .maybeSingle<ProfileForDrip>();

      // ¿Ya es Pro? skip y cancelar restantes
      const isPro = (
        profile?.subscription_plan === "pro" &&
        Boolean(profile?.stripe_subscription_id) &&
        (profile?.subscription_status === "active" || profile?.subscription_status === "trialing")
      );
      if (isPro) {
        await sb.from("drip_messages")
          .update({ status: "skipped", error_message: "user is Pro" })
          .eq("user_id", user.id).eq("status", "pending");
        results.skipped++;
        continue;
      }

      // ¿Unsubscribed?
      const { data: unsub } = await sb
        .from("email_unsubscribes").select("channel")
        .eq("user_id", user.id).maybeSingle();
      if (unsub && (unsub.channel === "all" || unsub.channel === msg.channel)) {
        await sb.from("drip_messages")
          .update({ status: "skipped", error_message: "unsubscribed" })
          .eq("id", msg.id);
        results.skipped++;
        continue;
      }

      // Renderizar template
      const stepDef = DRIP_STEPS.find((s) => s.step === msg.step && s.channel === msg.channel);
      if (!stepDef) {
        await sb.from("drip_messages")
          .update({ status: "failed", error_message: "template not found" })
          .eq("id", msg.id);
        results.failed++;
        continue;
      }

      const ctx = buildContext({ id: user.id, email: user.email, user_metadata: user.user_metadata }, profile || {});

      let providerMessageId: string | null = null;
      let skipReason: string | null = null;

      if (msg.channel === "email") {
        const rendered = stepDef.render(ctx);
        const subject = stepDef.subject?.(ctx) || "TrustMind";
        const res = await sendEmail({
          to: user.email,
          subject,
          html: rendered.html || "",
          text: rendered.text,
          tags: [{ name: "campaign", value: msg.campaign }, { name: "step", value: String(msg.step) }],
        });
        if (res) providerMessageId = res.id;
        else skipReason = "RESEND_API_KEY missing";
      } else if (msg.channel === "whatsapp") {
        if (!profile?.phone) {
          skipReason = "no phone in profile";
        } else {
          const rendered = stepDef.render(ctx);
          const res = await sendWhatsApp({
            to: profile.phone,
            body: rendered.body || "",
          });
          if (res) providerMessageId = res.sid;
          else skipReason = "TWILIO credentials missing";
        }
      }

      if (skipReason) {
        await sb.from("drip_messages")
          .update({ status: "skipped", error_message: skipReason })
          .eq("id", msg.id);
        results.skipped++;
      } else {
        await sb.from("drip_messages")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            provider_message_id: providerMessageId,
          })
          .eq("id", msg.id);
        results.sent++;
      }
      results.processed++;
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error(`[cron drip] error sending ${msg.id}:`, errMsg);
      await sb.from("drip_messages")
        .update({ status: "failed", error_message: errMsg.slice(0, 500) })
        .eq("id", msg.id);
      results.failed++;
      results.processed++;
    }
  }

  return Response.json(results);
}
