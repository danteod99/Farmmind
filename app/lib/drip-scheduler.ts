import { createClient } from "@supabase/supabase-js";
import { DRIP_STEPS } from "./drip-templates";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Encola los 7 mensajes del nurture campaign para un user recién creado.
 * Idempotente: si ya fue encolado, los inserts con conflicto se ignoran.
 * No tira si falla — solo loguea.
 */
export async function scheduleSignupDrip(userId: string): Promise<void> {
  if (!userId) return;
  const sb = admin();

  // ¿Ya está suscrito? — si pagó, no encolamos nada (es un upgrade o reactivación)
  const { data: profile } = await sb
    .from("profiles")
    .select("subscription_plan, subscription_status, stripe_subscription_id")
    .eq("id", userId)
    .maybeSingle();
  const isPro = (
    profile?.subscription_plan === "pro" &&
    Boolean(profile?.stripe_subscription_id) &&
    (profile?.subscription_status === "active" || profile?.subscription_status === "trialing")
  );
  if (isPro) {
    console.log(`[drip] skip enqueue for ${userId}: ya es Pro`);
    return;
  }

  // ¿Ya unsubscribed?
  const { data: unsub } = await sb
    .from("email_unsubscribes")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (unsub) {
    console.log(`[drip] skip enqueue for ${userId}: unsubscribed`);
    return;
  }

  const now = Date.now();
  const rows = DRIP_STEPS.map((s) => ({
    user_id: userId,
    campaign: "signup_nurture",
    step: s.step,
    channel: s.channel,
    scheduled_for: new Date(now + s.offsetHours * 3600 * 1000).toISOString(),
    status: "pending" as const,
  }));

  // upsert con ignoreDuplicates para idempotencia (la unique index protege)
  const { error } = await sb
    .from("drip_messages")
    .upsert(rows, { onConflict: "user_id,campaign,step", ignoreDuplicates: true });

  if (error) {
    console.error(`[drip] enqueue failed for ${userId}:`, error.message);
  } else {
    console.log(`[drip] enqueued ${rows.length} steps para ${userId}`);
  }
}

/**
 * Cancela los mensajes pendientes de un user (al pagar o unsubscribe).
 */
export async function cancelDripForUser(userId: string, reason: string): Promise<void> {
  if (!userId) return;
  const sb = admin();
  const { error } = await sb
    .from("drip_messages")
    .update({ status: "canceled", error_message: reason })
    .eq("user_id", userId)
    .eq("status", "pending");
  if (error) console.error(`[drip] cancel failed:`, error.message);
}
