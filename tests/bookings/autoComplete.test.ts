import assert from "node:assert/strict";
import {
  AUTO_COMPLETE_GRACE_MS,
  bookingEligibleForAutoComplete,
  paymentBlocksAutoComplete,
  type BookingRowForCompletion,
} from "@/lib/bookings/completeBooking";
import { bookingEndAt } from "@/lib/bookingLifecycle";
import type { BookingPaymentRowForTransfer } from "@/lib/payments/ledger";

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

function bookingAtEndPlus(
  hoursAfterEnd: number,
  overrides: Partial<BookingRowForCompletion> = {},
): BookingRowForCompletion {
  const end = new Date(Date.now() - hoursAfterEnd * 60 * 60 * 1000);
  const start = new Date(end.getTime() - 60 * 60 * 1000);
  const y = start.getFullYear();
  const m = String(start.getMonth() + 1).padStart(2, "0");
  const d = String(start.getDate()).padStart(2, "0");
  const hh = String(start.getHours()).padStart(2, "0");
  const mm = String(start.getMinutes()).padStart(2, "0");
  return {
    id: "bk_test",
    teacher_id: "t1",
    student_id: "s1",
    status: "confirmed",
    slot_date: `${y}-${m}-${d}`,
    time_slot: `${hh}:${mm}`,
    duration_minutes: 60,
    ...overrides,
  };
}

function paymentRow(
  overrides: Partial<BookingPaymentRowForTransfer> = {},
): BookingPaymentRowForTransfer {
  return {
    id: "pay_1",
    booking_id: "bk_test",
    stripe_payment_intent_id: "pi_1",
    stripe_charge_id: "ch_1",
    stripe_transfer_id: null,
    amount_cents: 10000,
    platform_fee_cents: 1500,
    teacher_net_cents: 8500,
    currency: "cad",
    payment_status: "paid",
    transfer_status: "not_ready",
    ...overrides,
  };
}

test("eligible when confirmed and ended more than 2h ago", () => {
  const booking = bookingAtEndPlus(3);
  assert.equal(bookingEligibleForAutoComplete(booking, new Date()), true);
});

test("ineligible when lesson ended less than 2h ago", () => {
  const booking = bookingAtEndPlus(1);
  assert.equal(bookingEligibleForAutoComplete(booking, new Date()), false);
});

test("ineligible for non-confirmed statuses", () => {
  const booking = bookingAtEndPlus(5, { status: "cancelled" });
  assert.equal(bookingEligibleForAutoComplete(booking, new Date()), false);
  assert.equal(bookingEligibleForAutoComplete(bookingAtEndPlus(5, { status: "completed" }), new Date()), false);
});

test("ineligible when timing fields are missing", () => {
  const booking = bookingAtEndPlus(5, { slot_date: null, time_slot: null });
  assert.equal(bookingEligibleForAutoComplete(booking, new Date()), false);
  assert.equal(bookingEndAt(booking), null);
});

test("paymentBlocksAutoComplete ignores paid not-yet-transferred rows", () => {
  assert.equal(paymentBlocksAutoComplete(paymentRow()), false);
});

test("paymentBlocksAutoComplete blocks unpaid or reversed transfers", () => {
  assert.equal(paymentBlocksAutoComplete(paymentRow({ payment_status: "refunded" })), true);
  assert.equal(paymentBlocksAutoComplete(paymentRow({ transfer_status: "reversed" })), true);
  assert.equal(paymentBlocksAutoComplete(null), false);
});

test("grace window is exactly two hours", () => {
  assert.equal(AUTO_COMPLETE_GRACE_MS, 2 * 60 * 60 * 1000);
  const end = bookingEndAt(bookingAtEndPlus(0))!;
  const justBeforeGrace = new Date(end.getTime() + AUTO_COMPLETE_GRACE_MS - 1000);
  const afterGrace = new Date(end.getTime() + AUTO_COMPLETE_GRACE_MS + 1000);
  const booking = bookingAtEndPlus(0);
  assert.equal(bookingEligibleForAutoComplete(booking, justBeforeGrace), false);
  assert.equal(bookingEligibleForAutoComplete(booking, afterGrace), true);
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[bookings:autoComplete] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
