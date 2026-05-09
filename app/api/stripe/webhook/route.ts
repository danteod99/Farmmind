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
        let userId = subscription.metadata?.supabase_user_id;
        if (!userId) {
          const customerId = subscription.customer as string;
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();
          userId = profile?.id;
        }

        if (userId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sub = subscription as any;
          // Estados terminales sin pago = se trata como cancelado
          const TERMINAL_NO_PAY = ["canceled", "unpaid", "incomplete_expired"];
          const isTerminal = TERMINAL_NO_PAY.includes(subscription.status);

          await supabaseAdmin.from("profiles").upsert({
            id: userId,
            subscription_status: subscription.status,
            stripe_subscription_id: isTerminal ? null : subscription.id,
            subscription_plan: isTerminal ? "free" : "pro",
            subscription_period_end: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
          });

          // Si terminó sin pago, auto-remove de la red
          if (isTerminal) {
            const { data: pos } = await supabaseAdmin
              .from("network_positions")
              .select("user_id, is_founder")
              .eq("user_id", userId)
              .maybeSingle();
            if (pos && !pos.is_founder) {
              const { data: downline } = await supabaseAdmin
                .from("network_positions")
                .select("user_id")
                .eq("placement_parent_id", userId)
                .limit(1);
              if (!downline || downline.length === 0) {
                await supabaseAdmin.from("network_positions").delete().eq("user_id", userId);
                await supabaseAdmin.from("network_pending_placements").delete().eq("user_id", userId);
                console.log(`[Network] Removed user ${userId} (status=${subscription.status}, no downline)`);
              }
            }
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        let userId = subscription.metadata?.supabase_user_id;

        // Si no hay metadata, buscar via stripe_customer_id (suscripciones antiguas)
        if (!userId) {
          const customerId = subscription.customer as string;
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();
          userId = profile?.id;
        }

        if (userId) {
          // 1. Marcar perfil como cancelado (esto ya bloquea comisiones via "pago para cobrar")
          await supabaseAdmin.from("profiles").upsert({
            id: userId,
            subscription_status: "canceled",
            subscription_plan: "free",
            stripe_subscription_id: null,
          });

          // 2. Auto-remove de la red de mercadeo
          // Solo removemos si NO es founder Y NO tiene downline (para no romper el árbol).
          // Si tiene downline, la posición queda pero "pago para cobrar" bloquea sus comisiones.
          const { data: pos } = await supabaseAdmin
            .from("network_positions")
            .select("user_id, is_founder")
            .eq("user_id", userId)
            .maybeSingle();

          if (pos && !pos.is_founder) {
            const { data: downline } = await supabaseAdmin
              .from("network_positions")
              .select("user_id")
              .eq("placement_parent_id", userId)
              .limit(1);

            if (!downline || downline.length === 0) {
              // Sin downline → eliminamos completamente de la red
              await supabaseAdmin.from("network_positions").delete().eq("user_id", userId);
              await supabaseAdmin.from("network_pending_placements").delete().eq("user_id", userId);
              console.log(`[Network] Removed user ${userId} from network (subscription canceled, no downline)`);
            } else {
              // Con downline → solo loggeamos, la posición queda pero comisiones bloqueadas
              console.log(`[Network] User ${userId} canceled but has downline - kept position, commissions blocked`);
            }
          }
        }
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
        break;
      }

      case "invoice.paid":
      case "invoice.payment_succeeded": {
        // Bono Directo 15% al sponsor del que paga.
        // Se ejecuta cada vez que se cobra la suscripcion (mes 1, mes 2, ...).
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const amountPaidUsd = (invoice.amount_paid || 0) / 100;
        const invoiceId = invoice.id || `inv_${Date.now()}`;

        if (amountPaidUsd > 0 && customerId) {
          const { data: payerProfile } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();

          if (payerProfile?.id) {
            // Verificar si ya procesamos esta invoice (idempotencia)
            const { data: existing } = await supabaseAdmin
              .from("network_commissions")
              .select("id")
              .eq("source_payment", invoiceId)
              .eq("type", "direct")
              .maybeSingle();

            if (!existing) {
              await supabaseAdmin.rpc("network_grant_direct_bonus", {
                p_payer_id: payerProfile.id,
                p_payment_amount: amountPaidUsd,
                p_invoice_id: invoiceId,
              });
            }
          }
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
