import { NextResponse } from "next/server";
import Stripe from "stripe";
import * as Sentry from "@sentry/nextjs";
import { stripe } from "@/lib/stripe";
import { chargeIdFromPaymentIntent, retrievePaymentIntentChargeId } from "@/lib/payments/ledger";
import { confirmBookingAndNotify } from "@/lib/stripeWebhook/bookings";
import { confirmGroupSessionCheckout } from "@/lib/stripeWebhook/groupSessions";
import { handleIdentityEvent } from "@/lib/stripeWebhook/identity";
import {
  handleConnectAccountUpdated,
  setUserPlanFromSubscription,
  stripeId,
  syncSubscriptionFromInvoice,
} from "@/lib/stripeWebhook/subscriptions";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe/webhook] Missing STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Server misconfigured." }, { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe/webhook] signature verify failed", err);
    // Capture as warning, not error — this is also the path that fires on
    // ordinary replay attempts and probes. We still want it visible so we can
    // detect a misconfigured webhook secret or rotated key.
    Sentry.captureException(err, {
      level: "warning",
      tags: { surface: "stripe.webhook", phase: "signature_verify" },
      contexts: {
        webhook: {
          signaturePresent: Boolean(signature),
          bodyBytes: body.length,
        },
      },
    });
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  Sentry.setTag("stripe.event_type", event.type);
  Sentry.setTag("stripe.event_id", event.id);

  try {
    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      if (pi.metadata?.checkout_kind === "group_session") {
        await confirmGroupSessionCheckout(pi.metadata as Record<string, string>, pi.id);
      } else {
        const bookingId = pi.metadata?.booking_id;
        if (bookingId) {
          await confirmBookingAndNotify(bookingId, pi.id, pi.metadata as Record<string, string>, {
            stripeChargeId: chargeIdFromPaymentIntent(pi),
            amountCents: pi.amount_received || pi.amount,
            currency: pi.currency,
          });
        }
      }
    }

    if (event.type === "checkout.session.completed") {
      const sess = event.data.object as Stripe.Checkout.Session;
      const md = sess.metadata as Record<string, string> | undefined;
      const piField = sess.payment_intent;
      const piId =
        typeof piField === "string"
          ? piField
          : piField && typeof piField === "object" && "id" in piField
            ? (piField as Stripe.PaymentIntent).id
            : null;

      if (md?.checkout_kind === "group_session" && piId) {
        await confirmGroupSessionCheckout(md, piId);
      } else {
        const bookingId = sess.metadata?.booking_id;
        if (bookingId && piId) {
          const stripeChargeId = await retrievePaymentIntentChargeId(piId).catch(() => null);
          await confirmBookingAndNotify(bookingId, piId, md, {
            checkoutSessionId: sess.id,
            stripeChargeId,
            amountCents: sess.amount_total ?? null,
            currency: sess.currency,
          });
        }
      }

      // Pro plan: subscription checkout completion
      if (sess.mode === "subscription") {
        const subId = typeof sess.subscription === "string" ? sess.subscription : null;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await setUserPlanFromSubscription(sub, {
            userId: sess.metadata?.user_id ?? sess.client_reference_id ?? null,
            customerId: stripeId(sess.customer),
          });
        }
      }
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const sub = event.data.object as Stripe.Subscription;
      await setUserPlanFromSubscription(sub);
    }

    if (event.type === "invoice.payment_succeeded" || event.type === "invoice.payment_failed") {
      await syncSubscriptionFromInvoice(event.data.object as Stripe.Invoice);
    }

    if (event.type === "account.updated") {
      await handleConnectAccountUpdated(event.data.object as Stripe.Account);
    }

    // ── Stripe Identity ────────────────────────────────────────────────────
    await handleIdentityEvent(event);
  } catch (e) {
    console.error("[stripe/webhook] handler error", e);
    Sentry.captureException(e, {
      tags: { surface: "stripe.webhook", phase: "handler" },
      contexts: {
        stripe_event: {
          id: event.id,
          type: event.type,
          livemode: event.livemode,
          api_version: event.api_version,
        },
      },
    });
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
