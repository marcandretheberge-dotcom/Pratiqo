/**
 * Planned package temporary holds / pending orders — no payment.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  canUsePlannedPackageTemporaryHolds,
  getPlannedPackageHoldMinutes,
  isActiveHold,
  isPlannedPackageTemporaryHoldsEnabled,
  isPlannedPackageTemporaryHoldsUiEnabled,
  rangesOverlap,
} from "@/lib/offers/plannedPackageTemporaryHolds";
import { getPackageLaunchReadiness } from "@/lib/offers/packageLaunchReadiness";

const root = process.cwd();
function read(rel: string): string {
  return readFileSync(path.join(root, rel), "utf8");
}

function resetFlags() {
  delete process.env.ENABLE_PLANNED_PACKAGES;
  delete process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGES;
  delete process.env.ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS;
  delete process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS;
  delete process.env.ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT;
  delete process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT;
  delete process.env.ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS;
  delete process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS;
  delete process.env.PLANNED_PACKAGE_HOLD_MINUTES;
  delete process.env.PACKAGE_LEGAL_REVIEW_COMPLETED;
}

test("temporary holds flags default OFF", () => {
  resetFlags();
  assert.equal(isPlannedPackageTemporaryHoldsEnabled(), false);
  assert.equal(isPlannedPackageTemporaryHoldsUiEnabled(), false);
  assert.equal(canUsePlannedPackageTemporaryHolds(), false);
  assert.equal(getPlannedPackageHoldMinutes(), 15);
});

test("holds require packages + drafts + preflight + holds flags", () => {
  resetFlags();
  process.env.ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS = "true";
  assert.equal(canUsePlannedPackageTemporaryHolds(), false);
  process.env.ENABLE_PLANNED_PACKAGES = "true";
  process.env.ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS = "true";
  process.env.ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT = "true";
  assert.equal(canUsePlannedPackageTemporaryHolds(), true);
});

test("isActiveHold and rangesOverlap helpers", () => {
  const future = new Date(Date.now() + 60_000).toISOString();
  const past = new Date(Date.now() - 60_000).toISOString();
  assert.equal(isActiveHold({ status: "active", expiresAt: future }), true);
  assert.equal(isActiveHold({ status: "active", expiresAt: past }), false);
  assert.equal(isActiveHold({ status: "expired", expiresAt: future }), false);
  assert.equal(isActiveHold({ status: "cancelled", expiresAt: future }), false);
  assert.equal(
    rangesOverlap(
      "2026-09-01T18:00:00.000Z",
      "2026-09-01T19:00:00.000Z",
      "2026-09-01T18:30:00.000Z",
      "2026-09-01T19:30:00.000Z",
    ),
    true,
  );
  assert.equal(
    rangesOverlap(
      "2026-09-01T18:00:00.000Z",
      "2026-09-01T19:00:00.000Z",
      "2026-09-01T19:00:00.000Z",
      "2026-09-01T20:00:00.000Z",
    ),
    false,
  );
});

test("migration defines pending orders + holds with RLS", () => {
  const mig = read("supabase/migrations/115_planned_package_pending_orders_and_holds.sql");
  assert.match(mig, /planned_package_pending_orders/);
  assert.match(mig, /planned_package_session_holds/);
  assert.match(mig, /ALTER TABLE IF EXISTS public\.planned_package_pending_orders ENABLE ROW LEVEL SECURITY/);
  assert.match(mig, /ALTER TABLE IF EXISTS public\.planned_package_session_holds ENABLE ROW LEVEL SECURITY/);
  assert.match(mig, /pending_payment/);
  assert.doesNotMatch(mig, /status = 'paid'/);
  assert.match(mig, /teacher_id text/);
});

test("pending order API reruns preflight and does not call Stripe/bookings/entitlements", () => {
  const route = read(
    "app/api/planned-packages/session-drafts/[draftId]/pending-order/route.ts",
  );
  const cancel = read("app/api/planned-packages/pending-orders/[orderId]/cancel/route.ts");
  const service = read("lib/offers/createPlannedPackagePendingOrder.ts");
  assert.match(route, /unauthenticated/);
  assert.match(route, /createPlannedPackagePendingOrder/);
  assert.match(cancel, /cancelPlannedPackagePendingOrder/);
  assert.match(service, /runPlannedPackageCheckoutPreflight/);
  assert.match(service, /active_hold_conflict/);
  assert.match(service, /session_slot_no_longer_available/);
  assert.match(service, /price_cents_snapshot/);
  assert.match(service, /hold_expires_at/);
  assert.doesNotMatch(service, /new Stripe\(/);
  assert.doesNotMatch(service, /PaymentIntent/);
  assert.doesNotMatch(service, /from\("bookings"\)\.insert/);
  assert.doesNotMatch(service, /package_entitlements/);
  assert.doesNotMatch(service, /package_redemptions/);
  assert.doesNotMatch(service, /status:\s*"paid"/);
});

test("availability integration blocks booking and slots for active holds", () => {
  const booking = read("lib/bookings/createPendingPaymentBooking.ts");
  const slots = read("app/api/teachers/[id]/slots/route.ts");
  const preflight = read("lib/offers/runPlannedPackageCheckoutPreflight.ts");
  assert.match(booking, /slot_temporarily_held/);
  assert.match(booking, /hasActiveHoldConflictForBookingSlot/);
  assert.match(slots, /listActiveHoldsForTeacherDay/);
  assert.match(slots, /holdRowsToBookedIntervals/);
  assert.match(preflight, /hasActivePlannedPackageHoldConflict/);
});

test("UI shows temporary hold copy and no live purchase CTA", () => {
  const ui = read("components/packages/PlannedPackagePendingOrder.tsx");
  const preflightUi = read("components/packages/PlannedPackageCheckoutPreflight.tsx");
  assert.match(ui, /plannedPackageHoldTitle/);
  assert.match(ui, /plannedPackageHoldCountdown|planned-package-hold-countdown/);
  assert.match(ui, /plannedPackagePaymentComingSoon/);
  assert.doesNotMatch(ui, /Acheter maintenant/);
  assert.match(preflightUi, /PlannedPackagePendingOrderPanel/);
});

test("admin readiness shows holds layer and stays blocked", () => {
  resetFlags();
  const readiness = getPackageLaunchReadiness();
  assert.equal(readiness.checks.plannedPackageTemporaryHoldsSchemaPresent, true);
  assert.equal(readiness.checks.plannedPackageTemporaryHoldsNoPayment, true);
  assert.equal(readiness.checks.plannedPackagePublicPurchaseBlocked, true);
  assert.equal(readiness.flags.plannedPackageTemporaryHolds, false);
  const page = read("app/(app)/admin/package-launch-readiness/page.tsx");
  assert.match(page, /Holds temporaires/);
  assert.doesNotMatch(page, /type=\"checkbox\"/);
});

test("PR does not enable flags or bypass legal review", () => {
  resetFlags();
  assert.equal(process.env.ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS, undefined);
  assert.equal(process.env.PACKAGE_LEGAL_REVIEW_COMPLETED, undefined);
  const fr = read("lib/i18n/locales/fr.json");
  assert.doesNotMatch(fr, /Forfait Pratiqo/);
  assert.match(fr, /Séances temporairement réservées/);
});
