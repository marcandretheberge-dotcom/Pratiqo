import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath: string): boolean {
  return fs.existsSync(path.join(root, relativePath));
}

function fail(message: string): never {
  console.error(`[payment-reliability] ${message}`);
  process.exit(1);
}

/** Accepts direct event.type checks or eventType string routing used for Stripe TS gaps. */
function webhookHandlesStripeEvent(
  webhookRoute: string,
  handlerName: string,
  eventName: string,
): boolean {
  if (!webhookRoute.includes(handlerName)) return false;
  if (!webhookRoute.includes(`"${eventName}"`)) return false;
  if (webhookRoute.includes(`event.type === "${eventName}"`)) return true;
  return (
    webhookRoute.includes("event.type as string") &&
    webhookRoute.includes(`eventType === "${eventName}"`)
  );
}

const completeBooking = read("lib/bookings/completeBooking.ts");
const autoCompleteCron = read("app/api/cron/bookings/complete/route.ts");
const webhookRoute = read("app/api/stripe/webhook/route.ts");
const webhookRisk = read("lib/payments/webhookRiskEvents.ts");

if (exists("app/api/stripe/checkout/route.ts")) {
  const lessonCheckout = read("app/api/stripe/checkout/route.ts");

  if (lessonCheckout.includes("transfer_data")) {
    fail("Lesson checkout must not use destination charges / transfer_data.");
  }

  if (lessonCheckout.includes("capture_method") || lessonCheckout.includes("manual_capture")) {
    fail("Lesson checkout must not use manual capture as the payout strategy.");
  }

  if (!lessonCheckout.includes("transfer_group")) {
    fail("Lesson checkout should set transfer_group for later reconciliation.");
  }
}

if (exists("lib/stripeWebhook/bookings.ts")) {
  const stripeWebhook = read("app/api/stripe/webhook/route.ts");
  const stripeWebhookBookings = read("lib/stripeWebhook/bookings.ts");
  const stripeLessonWebhookSurface = `${stripeWebhook}\n${stripeWebhookBookings}`;

  if (stripeLessonWebhookSurface.includes("booking not pending_payment at confirm; refunding")) {
    fail("Webhook contains the old non-idempotent refund-on-race branch.");
  }

  if (!stripeLessonWebhookSurface.includes("booking already confirmed by another webhook delivery")) {
    fail("Webhook should explicitly tolerate concurrent duplicate Stripe deliveries.");
  }

  if (!stripeLessonWebhookSurface.includes("stripe_payment_intent_id")) {
    fail("Webhook should persist or validate the Stripe payment intent on bookings.");
  }
}

if (!completeBooking.includes("stripe.transfers.create")) {
  fail("Booking completion should be the only lesson teacher-transfer trigger.");
}

if (!completeBooking.includes("idempotencyKey: `booking_transfer_${bookingId}`")) {
  fail("Teacher transfer must use a booking-scoped Stripe idempotency key.");
}

if (!completeBooking.includes("stripe_transfer_id")) {
  fail("Completion route should return/store the real Stripe transfer id.");
}

if (!autoCompleteCron.includes("verifyCronSecret")) {
  fail("Auto-complete cron route must verify CRON_SECRET.");
}

if (!autoCompleteCron.includes("processAutoCompleteBookings")) {
  fail("Auto-complete cron route must call processAutoCompleteBookings.");
}

if (!webhookHandlesStripeEvent(webhookRoute, "handleStripeTransferFailed", "transfer.failed")) {
  fail("Stripe webhook must handle transfer.failed.");
}

if (!webhookHandlesStripeEvent(webhookRoute, "handleStripeChargeDisputeCreated", "charge.dispute.created")) {
  fail("Stripe webhook must handle charge.dispute.created.");
}

if (!webhookRisk.includes("handleStripeTransferFailed")) {
  fail("Payment risk webhook module must handle transfer failures.");
}

if (!webhookRisk.includes("handleStripeChargeDisputeCreated")) {
  fail("Payment risk webhook module must handle charge disputes.");
}

if (!webhookRisk.includes('payment_status: "disputed"') && !webhookRisk.includes("markBookingPaymentDisputed")) {
  fail("Dispute handler must flag booking payments as disputed.");
}

console.log("[payment-reliability] OK");
