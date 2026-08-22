/**
 * Planned package checkout preflight — readiness only (no payment).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  canUsePlannedPackageCheckoutPreflight,
  isPlannedPackageCheckoutEnabled,
  isPlannedPackageCheckoutPreflightEnabled,
  isPlannedPackageCheckoutPreflightUiEnabled,
  PLANNED_PACKAGE_PREFLIGHT_BLOCKER_I18N,
} from "@/lib/offers/plannedPackageCheckoutPreflight";
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
  delete process.env.ENABLE_PLANNED_PACKAGE_CHECKOUT;
  delete process.env.PACKAGE_LEGAL_REVIEW_COMPLETED;
  delete process.env.ENABLE_PACKAGE_ENTITLEMENTS;
}

test("preflight flags default OFF", () => {
  resetFlags();
  assert.equal(isPlannedPackageCheckoutPreflightEnabled(), false);
  assert.equal(isPlannedPackageCheckoutPreflightUiEnabled(), false);
  assert.equal(canUsePlannedPackageCheckoutPreflight(), false);
  assert.equal(isPlannedPackageCheckoutEnabled(), false);
});

test("preflight requires planned packages + drafts + preflight flags", () => {
  resetFlags();
  process.env.ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT = "true";
  assert.equal(canUsePlannedPackageCheckoutPreflight(), false);
  process.env.ENABLE_PLANNED_PACKAGES = "true";
  process.env.ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS = "true";
  assert.equal(canUsePlannedPackageCheckoutPreflight(), true);
});

test("real checkout flag stays OFF; legal review not bypassed", () => {
  resetFlags();
  process.env.ENABLE_PLANNED_PACKAGES = "true";
  process.env.ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS = "true";
  process.env.ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT = "true";
  process.env.PACKAGE_LEGAL_REVIEW_COMPLETED = "true";
  assert.equal(isPlannedPackageCheckoutEnabled(), false);
});

test("blocker codes map to i18n keys (no raw codes in UI)", () => {
  const ui = read("components/packages/PlannedPackageCheckoutPreflight.tsx");
  assert.match(ui, /PLANNED_PACKAGE_PREFLIGHT_BLOCKER_I18N/);
  assert.match(ui, /blockerLabel/);
  assert.doesNotMatch(ui, /Acheter maintenant/);
  assert.doesNotMatch(ui, /Payer\b/);
  assert.match(ui, /plannedPackagePaymentComingSoon/);
  assert.ok(Object.keys(PLANNED_PACKAGE_PREFLIGHT_BLOCKER_I18N).includes("package_legal_review_required"));
  assert.ok(
    Object.keys(PLANNED_PACKAGE_PREFLIGHT_BLOCKER_I18N).includes("planned_package_checkout_not_enabled"),
  );
});

test("preflight API route requires auth and flags; no Stripe/bookings/entitlements", () => {
  const route = read(
    "app/api/planned-packages/session-drafts/[draftId]/checkout-preflight/route.ts",
  );
  const runner = read("lib/offers/runPlannedPackageCheckoutPreflight.ts");
  assert.match(route, /unauthenticated/);
  assert.match(route, /canUsePlannedPackageCheckoutPreflight/);
  assert.match(route, /runPlannedPackageCheckoutPreflight/);
  assert.match(runner, /package_legal_review_required/);
  assert.match(runner, /planned_package_checkout_not_enabled/);
  assert.match(runner, /teacher_payment_not_ready/);
  assert.match(runner, /teacherPaymentReadinessFailureReasons/);
  assert.match(runner, /validatePlannedPackageDraftSlot/);
  assert.match(runner, /hasBookingConflict|slot_conflict/);
  assert.match(runner, /draft_not_active/);
  assert.match(runner, /readyForFutureCheckout/);
  assert.doesNotMatch(runner, /new Stripe\(/);
  assert.doesNotMatch(runner, /checkout\.sessions/);
  assert.doesNotMatch(runner, /PaymentIntent/);
  assert.doesNotMatch(runner, /from\("bookings"\)\.insert/);
  assert.doesNotMatch(runner, /package_entitlements/);
  assert.doesNotMatch(runner, /package_redemptions/);
});

test("UI wires preflight after draft summary when UI flag ON", () => {
  const selector = read("components/packages/PlannedPackageSessionSelector.tsx");
  assert.match(selector, /PlannedPackageCheckoutPreflight/);
  assert.match(selector, /isPlannedPackageCheckoutPreflightUiEnabled/);
});

test("admin readiness shows preflight layer and stays blocked", () => {
  resetFlags();
  const readiness = getPackageLaunchReadiness();
  assert.equal(readiness.checks.plannedPackageCheckoutPreflightPresent, true);
  assert.equal(readiness.checks.plannedPackageCheckoutPreflightNoPayment, true);
  assert.equal(readiness.checks.plannedPackagePublicPurchaseBlocked, true);
  assert.equal(readiness.checks.legalReviewMarkedRequired, true);
  assert.equal(readiness.flags.plannedPackageCheckoutPreflight, false);
  const page = read("app/(app)/admin/package-launch-readiness/page.tsx");
  assert.match(page, /Endpoint préflight checkout présent/);
  assert.match(page, /Préflight sans paiement/);
  assert.doesNotMatch(page, /type=\"checkbox\"/);
});

test("PR does not enable package flags or touch payment mutation surfaces", () => {
  resetFlags();
  assert.equal(process.env.ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT, undefined);
  assert.equal(process.env.ENABLE_PLANNED_PACKAGE_CHECKOUT, undefined);
  assert.equal(process.env.PACKAGE_LEGAL_REVIEW_COMPLETED, undefined);
  const fr = read("lib/i18n/locales/fr.json");
  assert.doesNotMatch(fr, /Forfait Pratiqo/);
  assert.match(fr, /Vérification du forfait/);
  assert.match(fr, /Paiement bientôt disponible/);
});
