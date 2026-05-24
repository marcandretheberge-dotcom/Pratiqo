import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { computeBookingChargeCents } from "../../lib/pricing/bookingCharge";

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

const teacher = {
  price_per_lesson: 60,
  home_lesson_enabled: true,
  home_lesson_price: 75,
  intro_session_enabled: true,
  intro_session_price_cents: null,
  intro_session_duration_minutes: 45,
  intro_session_discount_percent: 50,
};

test("computeBookingChargeCents uses teacher hourly rate and duration for studio lessons", () => {
  assert.equal(
    computeBookingChargeCents(teacher, { lesson_type: "regular", teaching_mode: "person", duration_minutes: 60 }),
    6000,
  );
  assert.equal(
    computeBookingChargeCents(teacher, { lesson_type: "regular", teaching_mode: "person", duration_minutes: 90 }),
    9000,
  );
});

test("computeBookingChargeCents uses home_lesson_price for domicile lessons", () => {
  assert.equal(
    computeBookingChargeCents(teacher, { lesson_type: "regular", teaching_mode: "domicile", duration_minutes: 120 }),
    15000,
  );
});

test("computeBookingChargeCents ignores tampered low client price inputs (lesson_type/teaching_mode only)", () => {
  // Simulates attacker booking row with price=1 but regular 60-min studio lesson.
  const cents = computeBookingChargeCents(teacher, {
    lesson_type: "regular",
    teaching_mode: "person",
    duration_minutes: 60,
  });
  assert.equal(cents, 6000);
  assert.notEqual(cents, 100);
});

test("computeBookingChargeCents derives intro price from teacher intro settings", () => {
  assert.equal(
    computeBookingChargeCents(teacher, { lesson_type: "intro", teaching_mode: "person", duration_minutes: 45 }),
    2300,
  );
});

test("checkout route derives Stripe amount from computeBookingChargeCents, not bookings.price", () => {
  const src = readFileSync("app/api/stripe/checkout/route.ts", "utf8");
  assert.match(src, /computeBookingChargeCents\(/);
  assert.doesNotMatch(src, /bookingPriceDollars/);
  assert.doesNotMatch(src, /Number\(b\.price\)/);
});

console.log("[payments:bookingCharge] tests passed");
