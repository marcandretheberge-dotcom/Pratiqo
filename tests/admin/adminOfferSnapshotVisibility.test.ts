import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  adminOfferSnapshotViewStateFromFields,
  deriveAdminPricingSource,
  formatAdminPricingSourceLabel,
  getOfferSnapshotAdminSummary,
  mapAdminOfferSnapshotFromBookingRow,
  paymentAmountDiffersFromSnapshotPrice,
} from "../../lib/offers/adminOfferSnapshotDisplay";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function t(key: string): string {
  const fr = JSON.parse(read("lib/i18n/locales/fr.json")) as Record<string, string>;
  return fr[key] ?? key;
}

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

const completeRow = {
  teacher_offer_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  teacher_offer_title_snapshot: "Cours privé piano",
  teacher_offer_type_snapshot: "private_lesson",
  teacher_offer_format_snapshot: "online",
  teacher_offer_price_cents_snapshot: 7000,
  teacher_offer_currency_snapshot: "CAD",
  teacher_offer_duration_minutes_snapshot: 60,
  teacher_offer_snapshot_version: 1,
};

test("mapAdminOfferSnapshotFromBookingRow returns complete snapshot DTO", () => {
  const mapped = mapAdminOfferSnapshotFromBookingRow(completeRow);
  assert.equal(mapped.kind, "complete");
  if (mapped.kind !== "complete") return;
  assert.equal(mapped.snapshot.title, "Cours privé piano");
  assert.equal(mapped.snapshot.priceCents, 7000);
  assert.equal(mapped.snapshot.type, "private_lesson");
});

test("mapAdminOfferSnapshotFromBookingRow returns none for legacy bookings", () => {
  assert.equal(mapAdminOfferSnapshotFromBookingRow({}).kind, "none");
});

test("mapAdminOfferSnapshotFromBookingRow flags incomplete snapshot", () => {
  const mapped = mapAdminOfferSnapshotFromBookingRow({
    teacher_offer_id: completeRow.teacher_offer_id,
    teacher_offer_title_snapshot: "",
  });
  assert.equal(mapped.kind, "incomplete");
});

test("deriveAdminPricingSource prefers payment metadata then snapshot state", () => {
  const complete = mapAdminOfferSnapshotFromBookingRow(completeRow);
  assert.equal(deriveAdminPricingSource(complete, "legacy_teacher_price"), "legacy_teacher_price");
  assert.equal(deriveAdminPricingSource(complete, null), "offer_snapshot");
  assert.equal(deriveAdminPricingSource({ kind: "none" }, null), "legacy_teacher_price");
});

test("paymentAmountDiffersFromSnapshotPrice detects passive mismatch only", () => {
  assert.equal(
    paymentAmountDiffersFromSnapshotPrice({
      chargedAmountCents: 7000,
      subtotalCents: 7000,
      snapshotPriceCents: 7000,
    }),
    false,
  );
  assert.equal(
    paymentAmountDiffersFromSnapshotPrice({
      chargedAmountCents: 6500,
      subtotalCents: 6500,
      snapshotPriceCents: 7000,
    }),
    true,
  );
});

test("admin booking ops select includes offer snapshot columns", () => {
  const lib = read("lib/admin/bookingPaymentOperations.ts");
  const display = read("lib/offers/adminOfferSnapshotDisplay.ts");
  assert.match(lib, /ADMIN_BOOKING_OFFER_SNAPSHOT_SELECT/);
  assert.match(display, /teacher_offer_title_snapshot/);
  assert.match(lib, /mapAdminOfferSnapshotFromBookingRow/);
  assert.match(lib, /offerSnapshotIncomplete/);
  assert.match(lib, /pricingSource/);
  assert.doesNotMatch(lib, /from\(["']teacher_offers["']\)/);
  assert.doesNotMatch(lib, /resolveBookingCheckoutPrice/);
});

test("admin payments join loads booking snapshot fields without exposing raw metadata", () => {
  const lib = read("lib/admin/bookingPaymentOperations.ts");
  assert.match(lib, /extractPricingSourceFromPaymentMetadata/);
  assert.match(lib, /ADMIN_BOOKING_OFFER_SNAPSHOT_SELECT/);
  const paymentSelect = lib.match(/const PAYMENT_SELECT\s*=\s*\n?\s*"([^"]+)"/)?.[1] ?? "";
  assert.match(paymentSelect, /metadata/);
  assert.doesNotMatch(read("app/api/admin/payments/route.ts"), /metadata:/);
});

test("admin bookings and payments pages render offer snapshot sections", () => {
  assert.match(read("app/(app)/admin/bookings/page.tsx"), /AdminBookingOfferSnapshotSection/);
  assert.match(read("app/(app)/admin/payments/page.tsx"), /AdminPaymentSourceSection/);
  assert.match(read("components/admin/AdminBookingOfferSnapshotSection.tsx"), /admin-booking-offer-snapshot/);
  assert.match(read("components/admin/AdminPaymentSourceSection.tsx"), /admin-payment-offer-source/);
  assert.match(read("components/admin/AdminPaymentSourceSection.tsx"), /adminPaymentSnapshotAmountMismatch/);
});

test("admin APIs remain requireAdminApi GET-only", () => {
  for (const rel of ["app/api/admin/bookings/route.ts", "app/api/admin/payments/route.ts"]) {
    const src = read(rel);
    assert.match(src, /requireAdminApi\(/);
    assert.doesNotMatch(src, /export async function (POST|PUT|PATCH|DELETE)/);
  }
});

test("checkout stripe commission and payout files unchanged", () => {
  for (const rel of [
    "app/api/stripe/checkout/route.ts",
    "app/api/stripe/webhook/route.ts",
    "lib/payments/commission.ts",
    "lib/pricing/resolveBookingCheckoutPrice.ts",
  ]) {
    const src = read(rel);
    assert.doesNotMatch(src, /adminOfferSnapshotDisplay|AdminBookingOfferSnapshotSection/);
  }
  const bookingsPage = read("app/(app)/admin/bookings/page.tsx");
  const paymentsPage = read("app/(app)/admin/payments/page.tsx");
  assert.doesNotMatch(bookingsPage, /rembourser|retry.?payout|checkout\.sessions\.create/i);
  assert.doesNotMatch(paymentsPage, /rembourser|retry.?payout|checkout\.sessions\.create/i);
});

test("public student teacher APIs do not expose admin snapshot diagnostics", () => {
  for (const rel of [
    "app/api/bookings/route.ts",
    "app/api/stripe/checkout/route.ts",
    "components/BookingModal.tsx",
    "components/TeacherProfile.tsx",
  ]) {
    const src = read(rel);
    assert.doesNotMatch(src, /adminOfferSnapshotDisplay|AdminBookingOfferSnapshotSection|AdminPaymentSourceSection/);
  }
});

test("admin offer snapshot labels use existing offer type keys", () => {
  const complete = mapAdminOfferSnapshotFromBookingRow(completeRow);
  if (complete.kind !== "complete") return;
  const summary = getOfferSnapshotAdminSummary(complete.snapshot, t, "fr-CA");
  assert.match(summary, /Cours privé piano/);
  assert.equal(formatAdminPricingSourceLabel("offer_snapshot", t), t("adminPaymentSourceOfferSnapshot"));
});

test("no Mes formules / formules labels introduced", () => {
  for (const rel of [
    "lib/offers/adminOfferSnapshotDisplay.ts",
    "components/admin/AdminBookingOfferSnapshotSection.tsx",
    "lib/i18n/locales/fr.json",
  ]) {
    const src = read(rel);
    assert.doesNotMatch(src, /Mes formules/);
    assert.doesNotMatch(src, /\bformules\b/);
  }
});

console.log("[admin:offer-snapshot-visibility] tests passed");
