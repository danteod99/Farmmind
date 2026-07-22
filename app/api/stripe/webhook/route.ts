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

/**
 * Acredita una recarga única de saldo con tarjeta (Stripe Checkout mode=payment,
 * purpose=smm_topup). Reemplaza el pago único con cripto. Idempotente por session.id:
 * usa la fila de smm_transactions como lock — un único webhook "reclama" el crédito
 * (flip atómico credited false→true) antes de incrementar el balance, evitando
 * doble acreditación en reintentos/concurrencia de Stripe.
 */
async function creditCardTopup(
  admin: ReturnType<typeof getSupabaseAdmin>,
  sess: Stripe.Checkout.Session
) {
  const userId = sess.metadata?.supabase_user_id;
  if (!userId) {
    console.warn(`[topup] session ${sess.id} sin supabase_user_id, skip`);
    return;
  }

  const amountUsd = sess.amount_total
    ? sess.amount_total / 100
    : parseFloat(sess.metadata?.amount_usd || "0");
  if (amountUsd <= 0) {
    console.warn(`[topup] session ${sess.id} con monto 0, skip`);
    return;
  }

  const promoCode = sess.metadata?.promo_code || null;
  const resellerId = sess.metadata?.reseller_id || null;

  // Localizar (o crear) la transacción ligada a esta sesión. payment_id = session.id.
  let txId: string | undefined;
  let alreadyCredited = false;

  const { data: existing } = await admin
    .from("smm_transactions")
    .select("id, credited")
    .eq("payment_id", sess.id)
    .maybeSingle();

  if (existing) {
    txId = existing.id;
    alreadyCredited = existing.credited === true;
  } else {
    const { data: inserted, error: insErr } = await admin
      .from("smm_transactions")
      .insert({
        user_id: userId,
        payment_id: sess.id,
        amount: amountUsd,
        currency: "usd_card",
        status: "finished",
        credited: false,
        payment_provider: "stripe",
        tx_type: "card_topup",
        description: "Recarga con tarjeta",
        promo_code: promoCode,
        promo_applied: false,
        reseller_id: resellerId,
      })
      .select("id")
      .single();

    if (insErr) {
      // Carrera: otro webhook insertó primero. Releer.
      const { data: again } = await admin
        .from("smm_transactions")
        .select("id, credited")
        .eq("payment_id", sess.id)
        .maybeSingle();
      if (!again) throw insErr;
      txId = again.id;
      alreadyCredited = again.credited === true;
    } else {
      txId = inserted.id;
    }
  }

  if (alreadyCredited || !txId) return;

  // Claim atómico: solo un proceso gana el flip false→true.
  const { data: claim } = await admin
    .from("smm_transactions")
    .update({ credited: true })
    .eq("id", txId)
    .eq("credited", false)
    .select("id")
    .single();
  if (!claim) return; // otro webhook ya lo reclamó

  // Bono de código promo (best-effort, no bloquea la acreditación principal).
  let bonusAmount = 0;
  if (promoCode) {
    const { data: promo } = await admin
      .from("promo_codes")
      .select("*")
      .eq("code", promoCode)
      .eq("active", true)
      .single();
    if (
      promo &&
      amountUsd >= promo.min_recharge &&
      promo.current_uses < promo.max_uses &&
      (!promo.expires_at || new Date(promo.expires_at) >= new Date())
    ) {
      const { error: incErr } = await admin.rpc("increment_promo_uses", {
        p_promo_id: promo.id,
        p_max_uses: promo.max_uses,
      });
      if (!incErr) {
        bonusAmount = parseFloat(promo.bonus_usd) || 0;
        await admin.from("smm_transactions").update({ promo_applied: true }).eq("id", txId);
      }
    }
  }

  const { error: rpcErr } = await admin.rpc("increment_balance", {
    p_user_id: userId,
    p_amount: amountUsd + bonusAmount,
  });
  if (rpcErr) {
    // credited ya quedó en true: lanzamos para registrar en webhook_failures y
    // reconciliar manualmente (igual filosofía que el resto del webhook).
    console.error(`[topup] increment_balance falló para ${userId}:`, rpcErr);
    throw new Error("topup balance credit failed");
  }

  console.log(
    `[topup] acreditado user=${userId} +$${amountUsd}${bonusAmount ? ` +$${bonusAmount} bono` : ""} session=${sess.id}`
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
      // ─── Checkout iniciado (guest llenó email pero aún no completó) ───
      case "checkout.session.expired": {
        const sess = event.data.object as Stripe.Checkout.Session;
        const email = sess.customer_details?.email || sess.customer_email || null;
        await supabaseAdmin.from("payment_attempts").insert({
          email,
          status: "abandoned",
          amount: sess.amount_total ? sess.amount_total / 100 : null,
          currency: sess.currency || "usd",
          stripe_session_id: sess.id,
          stripe_customer_id: (sess.customer as string) || null,
          failure_message: "Checkout expirado / abandonado",
          metadata: { mode: sess.mode },
        });
        break;
      }

      // ─── Pago rechazado durante checkout (tarjeta declinada) ───
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const email = pi.receipt_email || pi.metadata?.email || null;
        await supabaseAdmin.from("payment_attempts").insert({
          email,
          status: "failed",
          amount: pi.amount ? pi.amount / 100 : null,
          currency: pi.currency || "usd",
          stripe_payment_intent_id: pi.id,
          stripe_customer_id: (pi.customer as string) || null,
          failure_code: pi.last_payment_error?.code || pi.last_payment_error?.decline_code || "unknown",
          failure_message: pi.last_payment_error?.message || "Pago rechazado",
          metadata: pi.metadata || {},
        });
        break;
      }

      // ─── Checkout completado pero pago sin confirmar (raro pero existe) ───
      case "checkout.session.async_payment_failed": {
        const sess = event.data.object as Stripe.Checkout.Session;
        const email = sess.customer_details?.email || sess.customer_email || null;
        await supabaseAdmin.from("payment_attempts").insert({
          email,
          status: "failed",
          amount: sess.amount_total ? sess.amount_total / 100 : null,
          currency: sess.currency || "usd",
          stripe_session_id: sess.id,
          stripe_customer_id: (sess.customer as string) || null,
          failure_message: "Pago asíncrono falló (transferencia bancaria, etc.)",
        });
        break;
      }

      // ─── Pago exitoso → marcar como succeeded ───
      case "checkout.session.completed": {
        const sess = event.data.object as Stripe.Checkout.Session;
        if (sess.payment_status === "paid") {
          const email = sess.customer_details?.email || sess.customer_email || null;
          await supabaseAdmin.from("payment_attempts").insert({
            email,
            status: "succeeded",
            amount: sess.amount_total ? sess.amount_total / 100 : null,
            currency: sess.currency || "usd",
            stripe_session_id: sess.id,
            stripe_customer_id: (sess.customer as string) || null,
            metadata: { mode: sess.mode },
          });

          // ── Recarga única de saldo con tarjeta (reemplazo del cripto) ──
          // Solo pagos únicos (mode=payment). Las suscripciones se acreditan en invoice.paid.
          if (sess.mode === "payment" && sess.metadata?.purpose === "smm_topup") {
            await creditCardTopup(supabaseAdmin, sess);
          }
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        let userId = subscription.metadata?.supabase_user_id;
        const purpose = subscription.metadata?.purpose;
        const pendingAccount = subscription.metadata?.pending_account === "true";

        // Fallback: lookup userId by stripe_customer_id (suscripciones antiguas sin metadata)
        if (!userId) {
          const customerId = subscription.customer as string;
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();
          userId = profile?.id;
        }

        // Si es un guest pago (sin supabase_user_id), crear cuenta Supabase con email del customer
        if (!userId && pendingAccount) {
          try {
            const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
            const email = customer.email;
            if (!email) {
              console.error("Guest checkout sin email del customer:", subscription.customer);
              break;
            }
            // Buscar si ya existe el user
            const { data: existingList } = await supabaseAdmin.auth.admin.listUsers();
            const existing = existingList.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
            if (existing) {
              userId = existing.id;
            } else {
              const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
                email,
                email_confirm: true,  // skip email verification para evitar fricción
                user_metadata: { full_name: customer.name || email.split("@")[0] },
              });
              if (createErr) {
                console.error("Error creando user post-pago:", createErr);
                break;
              }
              userId = created.user.id;
              console.log(`✅ Cuenta creada post-pago para ${email} (user_id: ${userId})`);
            }
            // Asociar customer y user para futura referencia
            await supabaseAdmin.from("profiles").upsert({ id: userId, stripe_customer_id: customer.id });
            // Actualizar metadata del sub para futuras webhooks
            await stripe.subscriptions.update(subscription.id, {
              metadata: {
                ...subscription.metadata,
                supabase_user_id: userId,
                pending_account: "false",
              },
            });
          } catch (createErr) {
            console.error("Guest account creation failed:", createErr);
            break;
          }
        }

        if (!userId) break;

        // Branch: auto-recarga SMM (también da Pro + bundle)
        if (purpose === "smm_autorecharge") {
          const amountUsd = parseFloat(subscription.metadata?.amount_usd || "0");
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sub = subscription as any;
          // current_period_end puede venir en sub o en items.data[0] según versión API
          const periodEndUnix = sub.current_period_end
            || sub.items?.data?.[0]?.current_period_end
            || null;
          const periodEndIso = periodEndUnix
            ? new Date(periodEndUnix * 1000).toISOString()
            : null;

          await supabaseAdmin.from("smm_autorecharge").upsert(
            {
              user_id: userId,
              stripe_subscription_id: subscription.id,
              stripe_customer_id: subscription.customer as string,
              amount_usd: amountUsd,
              interval: sub.items?.data?.[0]?.price?.recurring?.interval || "month",
              status: subscription.status === "active" ? "active" : subscription.status,
              next_charge_at: periodEndIso,
            },
            { onConflict: "user_id" }
          );

          // Auto-recarga activa → también activar Pro tier + bundle desktop apps
          const isActiveStatus =
            subscription.status === "active" ||
            subscription.status === "trialing" ||
            subscription.status === "past_due";

          if (isActiveStatus && periodEndIso) {
            await supabaseAdmin.from("profiles").upsert({
              id: userId,
              subscription_status: subscription.status,
              stripe_subscription_id: subscription.id,
              subscription_plan: "pro",
              subscription_period_end: periodEndIso,
              subscription_interval: sub.items?.data?.[0]?.price?.recurring?.interval || null,
            });
            await supabaseAdmin.from("tm_subscriptions").upsert(
              {
                user_id: userId,
                product: "bundle",
                tier: "pro",
                expires_at: periodEndIso,
                stripe_subscription_id: subscription.id,
              },
              { onConflict: "user_id,product" }
            );
          }
          break;
        }

        // Branch: suscripción Pro (comportamiento existente)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub = subscription as any;
        const periodEndUnixPro = sub.current_period_end
          || sub.items?.data?.[0]?.current_period_end
          || null;
        const periodEndIso = periodEndUnixPro
          ? new Date(periodEndUnixPro * 1000).toISOString()
          : null;

        // Estados terminales sin pago = se trata como cancelado (origin/main)
        const TERMINAL_NO_PAY = ["canceled", "unpaid", "incomplete_expired"];
        const isTerminal = TERMINAL_NO_PAY.includes(subscription.status);

        await supabaseAdmin.from("profiles").upsert({
          id: userId,
          subscription_status: subscription.status,
          stripe_subscription_id: isTerminal ? null : subscription.id,
          subscription_plan: isTerminal ? "free" : "pro",
          subscription_period_end: periodEndIso,
          subscription_interval: isTerminal ? null : (sub.items?.data?.[0]?.price?.recurring?.interval || null),
        });

        // Al activar Pro, también dar acceso bundle a TrustInsta + TrustFace.
        // Estado activo se infiere de expires_at > now en license.js de los desktop apps.
        const isActiveStatus =
          subscription.status === "active" ||
          subscription.status === "trialing" ||
          subscription.status === "past_due";

        if (isActiveStatus && periodEndIso) {
          await supabaseAdmin.from("tm_subscriptions").upsert(
            {
              user_id: userId,
              product: "bundle",
              tier: "pro",
              expires_at: periodEndIso,
              stripe_subscription_id: subscription.id,
            },
            { onConflict: "user_id,product" }
          );

          // Cancelar drip campaign pendiente — el user ya convirtió
          try {
            const { cancelDripForUser } = await import("@/app/lib/drip-scheduler");
            cancelDripForUser(userId, "user converted to Pro").catch(() => {});
          } catch { /* no-op */ }
        }

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        let userId = subscription.metadata?.supabase_user_id;
        const purpose = subscription.metadata?.purpose;

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

        if (!userId) break;

        // Branch: auto-recarga SMM cancelada → revocar Pro + bundle
        if (purpose === "smm_autorecharge") {
          await supabaseAdmin
            .from("smm_autorecharge")
            .update({ status: "canceled" })
            .eq("stripe_subscription_id", subscription.id);
          await supabaseAdmin.from("profiles").upsert({
            id: userId,
            subscription_status: "canceled",
            subscription_plan: "free",
            stripe_subscription_id: null,
            subscription_interval: null,
          });
          await supabaseAdmin
            .from("tm_subscriptions")
            .update({ expires_at: new Date().toISOString(), tier: "free" })
            .eq("stripe_subscription_id", subscription.id);
          break;
        }

        // Branch: suscripción Pro cancelada
        // 1. Marcar perfil como cancelado (esto ya bloquea comisiones via "pago para cobrar")
        await supabaseAdmin.from("profiles").upsert({
          id: userId,
          subscription_status: "canceled",
          subscription_plan: "free",
          stripe_subscription_id: null,
          subscription_interval: null,
        });

        // 2. Expirar acceso bundle a TrustInsta + TrustFace
        await supabaseAdmin
          .from("tm_subscriptions")
          .update({ expires_at: new Date().toISOString(), tier: "free" })
          .eq("stripe_subscription_id", subscription.id);

        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const inv = invoice as any;

        // El subscription ID puede venir en varias ubicaciones según versión
        // de API. En invoices de tipo subscription_create (PRIMER cobro) suele
        // venir VACÍO en invoice.subscription — por eso antes nunca acreditaba
        // el primer pago de cada autorecarga.
        let subscriptionId =
          (typeof inv.subscription === "string" ? inv.subscription : inv.subscription?.id) ||
          inv.lines?.data?.[0]?.subscription ||
          inv.lines?.data?.[0]?.parent?.subscription_item_details?.subscription ||
          inv.parent?.subscription_details?.subscription ||
          null;

        let userId: string | undefined;
        let metaAmountUsd = 0;

        // 1. Intentar resolver userId vía metadata de la subscription
        if (subscriptionId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            userId = subscription.metadata?.supabase_user_id;
            metaAmountUsd = parseFloat(subscription.metadata?.amount_usd || "0");
          } catch (e) {
            console.warn(`[invoice.paid] No se pudo recuperar sub ${subscriptionId}:`, e);
          }
        }

        // 2. Fallback: resolver userId vía customer → profiles (cubre el caso
        //    del primer invoice sin subscription ID)
        if (!userId) {
          const customerId =
            typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
          if (customerId) {
            const { data: prof } = await supabaseAdmin
              .from("profiles")
              .select("id")
              .eq("stripe_customer_id", customerId)
              .maybeSingle();
            userId = prof?.id;
            if (userId && !subscriptionId) subscriptionId = `customer:${customerId}`;
          }
        }

        if (!userId) {
          console.warn(`[invoice.paid] Sin userId resoluble para invoice ${invoice.id}`);
          break;
        }

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
        const amountUsd = amountPaidUsd || metaAmountUsd;

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

        // subscriptionId real (no el fallback "customer:...")
        const realSubId = subscriptionId && !subscriptionId.startsWith("customer:")
          ? subscriptionId
          : null;

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
          stripe_subscription_id: realSubId,
        });

        // Actualizar timestamps en smm_autorecharge (solo si hay sub real)
        if (realSubId) {
          await supabaseAdmin
            .from("smm_autorecharge")
            .update({
              last_charged_at: new Date().toISOString(),
              status: "active",
            })
            .eq("stripe_subscription_id", realSubId);
        }

        console.log(`Saldo acreditado: user=${userId}, +$${amountUsd}, invoice=${invoice.id}`);
        break;
      }

      // ─── Refund: revertir saldo SMM + desactivar Pro si full refund ───
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const refundedAmount = (charge.amount_refunded || 0) / 100;
        if (refundedAmount <= 0) break;

        // Encontrar la invoice y la transaction asociada
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const chargeAny = charge as any;
        const invoiceRef = chargeAny.invoice;
        const invoiceId = typeof invoiceRef === "string" ? invoiceRef : invoiceRef?.id;
        if (!invoiceId) {
          console.warn(`[Refund] Charge ${charge.id} sin invoice asociada, skip`);
          break;
        }
        const { data: tx } = await supabaseAdmin
          .from("smm_transactions")
          .select("id, user_id, amount, status, credited, stripe_subscription_id")
          .eq("stripe_invoice_id", invoiceId)
          .maybeSingle();
        if (!tx) {
          console.warn(`[Refund] No se encontró tx para invoice ${invoiceId}`);
          break;
        }
        if (tx.status === "refunded") {
          console.log(`[Refund] tx ${tx.id} ya estaba refunded, skip`);
          break;
        }

        // Restar del balance
        const { error: rpcErr } = await supabaseAdmin.rpc("decrement_balance", {
          p_user_id: tx.user_id,
          p_amount: Number(tx.amount),
        });
        if (rpcErr) {
          // Si saldo insuficiente, forzar a 0
          console.warn(`[Refund] decrement_balance falló: ${rpcErr.message}. Forzando a 0.`);
          await supabaseAdmin.from("smm_balances").update({ balance: 0 }).eq("user_id", tx.user_id);
        }
        await supabaseAdmin.from("smm_transactions")
          .update({ status: "refunded", credited: false })
          .eq("id", tx.id);

        // Si el charge fue full refunded y NO hay otras subs activas, desactivar Pro
        if (charge.refunded) {
          const customerId = charge.customer as string;
          if (customerId) {
            const stripeSubs = await stripe.subscriptions.list({
              customer: customerId, status: "active", limit: 5,
            });
            if (stripeSubs.data.length === 0) {
              await supabaseAdmin.from("profiles").upsert({
                id: tx.user_id,
                subscription_status: "canceled",
                subscription_plan: "free",
                stripe_subscription_id: null,
                subscription_interval: null,
              });
              await supabaseAdmin.from("tm_subscriptions")
                .update({ expires_at: new Date().toISOString(), tier: "free" })
                .eq("user_id", tx.user_id);
              console.log(`[Refund] Pro desactivado para user ${tx.user_id} (no quedan subs activas)`);
            }
          }
        }
        console.log(`[Refund] Reversado: user=${tx.user_id}, -$${tx.amount}, invoice=${invoiceId}`);
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

      // (Red de mercadeo eliminada 2026-05-28: ya no se distribuyen comisiones.
      //  El saldo del payer se acredita en el case "invoice.paid" de arriba.)
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    // IMPORTANTE: NUNCA devolver 500 por un error de procesamiento.
    // Si devolvemos 5xx repetidamente, Stripe DESHABILITA el webhook
    // automáticamente (fue lo que pasó el 2026-05). Acusamos recibo con
    // 200 y registramos el fallo para reconciliación manual. Las
    // operaciones críticas (subscription status) son idempotentes y se
    // pueden reconstruir desde Stripe en cualquier momento.
    console.error(`[Webhook] Error procesando ${event.type} (${event.id}):`, error);
    try {
      await supabaseAdmin.from("webhook_failures").insert({
        provider: "stripe",
        event_type: event.type,
        event_id: event.id,
        error_message: error instanceof Error ? error.message : String(error),
        payload: event.data?.object ?? null,
      });
    } catch (logErr) {
      console.error("[Webhook] No se pudo registrar el fallo:", logErr);
    }
    return new Response("OK (error logged)", { status: 200 });
  }
}
