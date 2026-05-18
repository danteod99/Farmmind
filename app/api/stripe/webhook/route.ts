import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || "sk_placeholder", {
    apiVersion: "2026-02-25.clover",
  });
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature")!;
  const stripe = getStripe();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature failed:", err);
    return new Response("Webhook error", { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;
        const purpose = subscription.metadata?.purpose;

        if (!userId) break;

        // Branch: auto-recarga SMM
        if (purpose === "smm_autorecharge") {
          const amountUsd = parseFloat(subscription.metadata?.amount_usd || "0");
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sub = subscription as any;
          await supabaseAdmin.from("smm_autorecharge").upsert(
            {
              user_id: userId,
              stripe_subscription_id: subscription.id,
              stripe_customer_id: subscription.customer as string,
              amount_usd: amountUsd,
              interval: "month",
              status: subscription.status === "active" ? "active" : subscription.status,
              next_charge_at: sub.current_period_end
                ? new Date(sub.current_period_end * 1000).toISOString()
                : null,
            },
            { onConflict: "user_id" }
          );
          break;
        }

        // Branch: suscripción Pro (comportamiento existente)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub = subscription as any;
        await supabaseAdmin.from("profiles").upsert({
          id: userId,
          subscription_status: subscription.status,
          stripe_subscription_id: subscription.id,
          subscription_plan: "pro",
          subscription_period_end: sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;
        const purpose = subscription.metadata?.purpose;

        if (!userId) break;

        // Branch: auto-recarga SMM cancelada
        if (purpose === "smm_autorecharge") {
          await supabaseAdmin
            .from("smm_autorecharge")
            .update({ status: "canceled" })
            .eq("stripe_subscription_id", subscription.id);
          break;
        }

        // Branch: suscripción Pro cancelada
        await supabaseAdmin.from("profiles").upsert({
          id: userId,
          subscription_status: "canceled",
          subscription_plan: "free",
          stripe_subscription_id: null,
        });
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const inv = invoice as any;
        const subscriptionId =
          typeof inv.subscription === "string" ? inv.subscription : inv.subscription?.id;

        if (!subscriptionId) break;

        // Recuperar la subscription para leer metadata (Stripe no incluye metadata de sub en invoice payload)
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const purpose = subscription.metadata?.purpose;
        const userId = subscription.metadata?.supabase_user_id;

        if (purpose !== "smm_autorecharge" || !userId) break;

        // Idempotencia: si ya acreditamos esta invoice, salir
        const { data: existing } = await supabaseAdmin
          .from("smm_transactions")
          .select("id")
          .eq("stripe_invoice_id", invoice.id)
          .maybeSingle();

        if (existing) {
          console.log(`Invoice ${invoice.id} ya acreditada, skip`);
          break;
        }

        const amountPaidUsd = (invoice.amount_paid || 0) / 100;
        const amountUsd =
          amountPaidUsd ||
          parseFloat(subscription.metadata?.amount_usd || "0");

        if (amountUsd <= 0) {
          console.warn(`Invoice ${invoice.id} con monto 0, skip`);
          break;
        }

        // Acreditar saldo atómicamente
        const { error: rpcErr } = await supabaseAdmin.rpc("increment_balance", {
          p_user_id: userId,
          p_amount: amountUsd,
        });

        if (rpcErr) {
          console.error(`Error incrementing balance for ${userId}:`, rpcErr);
          return new Response("Balance credit failed", { status: 500 });
        }

        // Registrar la transacción
        await supabaseAdmin.from("smm_transactions").insert({
          user_id: userId,
          payment_id: invoice.id,
          amount: amountUsd,
          currency: "usd_card",
          status: "finished",
          credited: true,
          payment_provider: "stripe",
          stripe_invoice_id: invoice.id,
          stripe_subscription_id: subscriptionId,
        });

        // Actualizar timestamps en smm_autorecharge
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subAny = subscription as any;
        await supabaseAdmin
          .from("smm_autorecharge")
          .update({
            last_charged_at: new Date().toISOString(),
            next_charge_at: subAny.current_period_end
              ? new Date(subAny.current_period_end * 1000).toISOString()
              : null,
            status: "active",
          })
          .eq("stripe_subscription_id", subscriptionId);

        console.log(`Auto-recarga acreditada: user=${userId}, +$${amountUsd}, invoice=${invoice.id}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile) {
          await supabaseAdmin
            .from("profiles")
            .update({ subscription_status: "past_due" })
            .eq("id", profile.id);
        }

        // También marcar la auto-recarga como past_due si corresponde
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const inv = invoice as any;
        const subId =
          typeof inv.subscription === "string" ? inv.subscription : inv.subscription?.id;

        if (subId) {
          await supabaseAdmin
            .from("smm_autorecharge")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", subId);
        }
        break;
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return new Response("Internal error", { status: 500 });
  }
}
