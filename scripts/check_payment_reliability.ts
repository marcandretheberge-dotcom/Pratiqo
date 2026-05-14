import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function fail(message: string): never {
  console.error(`[payment-reliability] ${message}`);
  process.exit(1);
}

const lessonCheckout = read("app/api/stripe/checkout/route.ts");
const stripeWebhook = read("app/api/stripe/webhook/route.ts");
const stripeWebhookBookings = read("lib/stripeWebhook/bookings.ts");
const stripeLessonWebhookSurface = `${stripeWebhook}\n${stripeWebhookBookings}`;
const completeBooking = read("app/api/bookings/[id]/complete/route.ts");

if (lessonCheckout.includes("transfer_data")) {
  fail("Lesson checkout must not use destination charges / transfer_data.");
}

if (lessonCheckout.includes("capture_method") || lessonCheckout.includes("manual_capture")) {
  fail("Lesson checkout must not use manual capture as the payout strategy.");
}

if (!lessonCheckout.includes("transfer_group")) {
  fail("Lesson checkout should set transfer_group for later reconciliation.");
}

if (stripeLessonWebhookSurface.includes("booking not pending_payment at confirm; refunding")) {
  fail("Webhook contains the old non-idempotent refund-on-race branch.");
}

if (!stripeLessonWebhookSurface.includes("booking already confirmed by another webhook delivery")) {
  fail("Webhook should explicitly tolerate concurrent duplicate Stripe deliveries.");
}

if (!stripeLessonWebhookSurface.includes("stripe_payment_intent_id")) {
  fail("Webhook should persist or validate the Stripe payment intent on bookings.");
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

console.log("[payment-reliability] OK");
