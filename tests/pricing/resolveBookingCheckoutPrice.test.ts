import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { calculateBookingAmounts } from "../../lib/payments/commission";
import {
  bookingHasOfferSnapshotIntent,
  isCheckoutReadyOfferType,
  isOfferSnapshotCheckoutEnabled,
  parseBookingOfferSnapshotCheckoutRow,
} from "../../lib/offers/offerSnapshotCheckout";
import { resolveBookingCheckoutPrice } from "../../lib/pricing/resolveBookingCheckoutPrice";

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

const OFFER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function completeSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    teacher_offer_id: OFFER_ID,
    teacher_offer_title_snapshot: "Cours privé en ligne",
    teacher_offer_type_snapshot: "private_lesson",
    teacher_offer_format_snapshot: "online",
    teacher_offer_price_cents_snapshot: 7000,
    teacher_offer_currency_snapshot: "CAD",
    teacher_offer_snapshot_version: 1,
    duration_minutes: 90,
    lesson_type: "regular",
    teaching_mode: "online",
    ...overrides,
  };
}

const prevCheckoutFlag = process.env.ENABLE_OFFER_SNAPSHOT_CHECKOUT;

test("legacy booking without offer snapshot uses legacy teacher pricing unchanged", () => {
  const resolved = resolveBookingCheckoutPrice({
    booking: { lesson_type: "regular", teaching_mode: "person", duration_minutes: 60 },
    teacher,
    teacherName: "Marie",
  });
  assert.equal(resolved.ok, true);
  if (!resolved.ok) return;
  assert.equal(resolved.pricing.source, "legacy_teacher_price");
  assert.equal(resolved.pricing.amountCents, 6000);
  assert.equal(resolved.pricing.metadata.pricing_source, "legacy_teacher_price");
});

test("booking with offer snapshot and flag OFF rejects checkout", () => {
  delete process.env.ENABLE_OFFER_SNAPSHOT_CHECKOUT;
  const resolved = resolveBookingCheckoutPrice({
    booking: completeSnapshot(),
    teacher,
    teacherName: "Marie",
  });
  assert.equal(resolved.ok, false);
  if (resolved.ok) return;
  assert.equal(resolved.error, "offer_snapshot_checkout_disabled");
});

test("booking with offer snapshot and flag ON charges snapshot price", () => {
  process.env.ENABLE_OFFER_SNAPSHOT_CHECKOUT = "true";
  const resolved = resolveBookingCheckoutPrice({
    booking: completeSnapshot(),
    teacher,
    teacherName: "Marie",
  });
  assert.equal(resolved.ok, true);
  if (!resolved.ok) return;
  assert.equal(resolved.pricing.source, "offer_snapshot");
  assert.equal(resolved.pricing.amountCents, 7000);
  assert.equal(resolved.pricing.currency, "CAD");
  assert.equal(resolved.pricing.metadata.teacher_offer_id, OFFER_ID);
  assert.equal(resolved.pricing.metadata.pricing_source, "offer_snapshot");
});

test("snapshot price is treated as total amount, not multiplied by duration", () => {
  process.env.ENABLE_OFFER_SNAPSHOT_CHECKOUT = "true";
  const resolved = resolveBookingCheckoutPrice({
    booking: completeSnapshot({ duration_minutes: 120 }),
    teacher,
    teacherName: "Marie",
  });
  assert.equal(resolved.ok, true);
  if (!resolved.ok) return;
  assert.equal(resolved.pricing.amountCents, 7000);
  assert.notEqual(resolved.pricing.amountCents, 12000);
});

test("incomplete snapshot rejects checkout", () => {
  process.env.ENABLE_OFFER_SNAPSHOT_CHECKOUT = "true";
  const resolved = resolveBookingCheckoutPrice({
    booking: completeSnapshot({ teacher_offer_title_snapshot: "" }),
    teacher,
    teacherName: "Marie",
  });
  assert.equal(resolved.ok, false);
  if (resolved.ok) return;
  assert.equal(resolved.error, "incomplete_offer_snapshot");
});

test("missing snapshot currency rejects checkout", () => {
  process.env.ENABLE_OFFER_SNAPSHOT_CHECKOUT = "true";
  const parsed = parseBookingOfferSnapshotCheckoutRow(
    completeSnapshot({ teacher_offer_currency_snapshot: null }),
  );
  assert.equal(parsed.ok, false);
  if (parsed.ok) return;
  assert.equal(parsed.error, "incomplete_offer_snapshot");
});

test("negative snapshot price rejects checkout", () => {
  process.env.ENABLE_OFFER_SNAPSHOT_CHECKOUT = "true";
  const parsed = parseBookingOfferSnapshotCheckoutRow(
    completeSnapshot({ teacher_offer_price_cents_snapshot: -100 }),
  );
  assert.equal(parsed.ok, false);
  if (parsed.ok) return;
  assert.equal(parsed.error, "invalid_offer_snapshot_price");
});

test("non-CAD snapshot currency rejects checkout as incomplete", () => {
  process.env.ENABLE_OFFER_SNAPSHOT_CHECKOUT = "true";
  const parsed = parseBookingOfferSnapshotCheckoutRow(
    completeSnapshot({ teacher_offer_currency_snapshot: "USD" }),
  );
  assert.equal(parsed.ok, false);
  if (parsed.ok) return;
  assert.equal(parsed.error, "incomplete_offer_snapshot");
});

test("private_lesson, intro_session, and assessment snapshots are checkout-ready", () => {
  process.env.ENABLE_OFFER_SNAPSHOT_CHECKOUT = "true";
  for (const offerType of ["private_lesson", "intro_session", "assessment"] as const) {
    assert.equal(isCheckoutReadyOfferType(offerType), true);
    const resolved = resolveBookingCheckoutPrice({
      booking: completeSnapshot({
        teacher_offer_type_snapshot: offerType,
        teacher_offer_price_cents_snapshot: offerType === "intro_session" ? 2500 : 5000,
      }),
      teacher,
      teacherName: "Marie",
    });
    assert.equal(resolved.ok, true, offerType);
    if (!resolved.ok) return;
    assert.equal(resolved.pricing.source, "offer_snapshot", offerType);
  }
});

test("package and group-style offer snapshots are rejected as unsupported", () => {
  process.env.ENABLE_OFFER_SNAPSHOT_CHECKOUT = "true";
  for (const offerType of [
    "package",
    "workshop",
    "group_class",
    "cohort",
    "self_paced_bridge",
  ] as const) {
    const resolved = resolveBookingCheckoutPrice({
      booking: completeSnapshot({ teacher_offer_type_snapshot: offerType }),
      teacher,
      teacherName: "Marie",
    });
    assert.equal(resolved.ok, false, offerType);
    if (resolved.ok) return;
    assert.equal(resolved.error, "unsupported_offer_type_for_checkout", offerType);
  }
});

test("commission uses resolved snapshot amount with unchanged fee rate", () => {
  const legacy = calculateBookingAmounts({ subtotalCents: 6000, teacherPlan: "free" });
  const snapshot = calculateBookingAmounts({ subtotalCents: 7000, teacherPlan: "free" });
  assert.equal(legacy.feeBasisPoints, snapshot.feeBasisPoints);
  assert.equal(legacy.feeRate, snapshot.feeRate);
  assert.equal(legacy.platformFeeCents, 900);
  assert.equal(snapshot.platformFeeCents, 1050);
});

test("checkout route uses resolveBookingCheckoutPrice and does not read live teacher_offers", () => {
  const src = readFileSync("app/api/stripe/checkout/route.ts", "utf8");
  assert.match(src, /resolveBookingCheckoutPrice\(/);
  assert.doesNotMatch(src, /from\(["']teacher_offers["']\)/);
  assert.doesNotMatch(src, /computeBookingChargeCents\(/);
  assert.match(src, /pricing_source/);
  assert.match(src, /ignored client amount/);
  assert.doesNotMatch(src, /unitAmountCents\s*=\s*body\.amount/);
});

test("checkout route selects booking offer snapshot columns server-side", () => {
  const src = readFileSync("app/api/stripe/checkout/route.ts", "utf8");
  assert.match(src, /teacher_offer_price_cents_snapshot/);
  assert.match(src, /teacher_offer_title_snapshot/);
});

test("bookingHasOfferSnapshotIntent follows teacher_offer_id only", () => {
  assert.equal(bookingHasOfferSnapshotIntent({ teacher_offer_id: OFFER_ID }), true);
  assert.equal(bookingHasOfferSnapshotIntent({}), false);
});

test("isOfferSnapshotCheckoutEnabled defaults OFF", () => {
  delete process.env.ENABLE_OFFER_SNAPSHOT_CHECKOUT;
  assert.equal(isOfferSnapshotCheckoutEnabled(), false);
});

if (prevCheckoutFlag === undefined) {
  delete process.env.ENABLE_OFFER_SNAPSHOT_CHECKOUT;
} else {
  process.env.ENABLE_OFFER_SNAPSHOT_CHECKOUT = prevCheckoutFlag;
}

console.log("[pricing:resolveBookingCheckoutPrice] tests passed");
