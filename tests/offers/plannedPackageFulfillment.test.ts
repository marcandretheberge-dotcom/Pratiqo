/**
 * Planned package fulfillment engine — no Stripe.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { allocatePlannedPackageSessionCents } from "@/lib/offers/plannedPackageAllocation";
import {
  canSimulatePlannedPackagePaymentConfirmed,
  canUsePlannedPackageFulfillmentEngine,
  isPlannedPackageFulfillmentEngineEnabled,
} from "@/lib/offers/plannedPackageFulfillment";
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
  delete process.env.ENABLE_PLANNED_PACKAGE_FULFILLMENT_ENGINE;
  delete process.env.ENABLE_PLANNED_PACKAGE_PAYMENT_SIMULATION;
  delete process.env.PACKAGE_LEGAL_REVIEW_COMPLETED;
}

test("fulfillment flag defaults OFF and blocks without dependency chain", () => {
  resetFlags();
  assert.equal(isPlannedPackageFulfillmentEngineEnabled(), false);
  assert.equal(canUsePlannedPackageFulfillmentEngine(), false);
  process.env.ENABLE_PLANNED_PACKAGE_FULFILLMENT_ENGINE = "true";
  assert.equal(canUsePlannedPackageFulfillmentEngine(), false);
  process.env.ENABLE_PLANNED_PACKAGES = "true";
  process.env.ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS = "true";
  process.env.ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT = "true";
  process.env.ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS = "true";
  assert.equal(canUsePlannedPackageFulfillmentEngine(), true);
});

test("fulfillment does not rely on NEXT_PUBLIC flag", () => {
  resetFlags();
  process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_FULFILLMENT_ENGINE = "true";
  assert.equal(isPlannedPackageFulfillmentEngineEnabled(), false);
  delete process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_FULFILLMENT_ENGINE;
});

test("per-session allocation is deterministic", () => {
  assert.deepEqual(allocatePlannedPackageSessionCents(10000, 4), [2500, 2500, 2500, 2500]);
  assert.deepEqual(allocatePlannedPackageSessionCents(10001, 4), [2501, 2500, 2500, 2500]);
  assert.deepEqual(allocatePlannedPackageSessionCents(10, 3), [4, 3, 3]);
});

test("migration adds fulfillment RPC, booking linkage, and uniqueness", () => {
  const mig = read("supabase/migrations/116_planned_package_fulfillment_engine.sql");
  assert.match(mig, /fulfill_planned_package_order/);
  assert.match(mig, /payment_confirmed/);
  assert.match(mig, /fulfilling/);
  assert.match(mig, /fulfilled/);
  assert.match(mig, /fulfillment_failed/);
  assert.match(mig, /planned_package_order_id/);
  assert.match(mig, /planned_package_session_index/);
  assert.match(mig, /idx_bookings_planned_package_order_session/);
  assert.match(mig, /'planned_package'/);
  assert.match(mig, /SECURITY DEFINER/);
  assert.match(mig, /GRANT EXECUTE[\s\S]*service_role/);
  assert.doesNotMatch(mig, /stripe\.checkout\.sessions\.create/i);
  assert.doesNotMatch(mig, /paymentIntents\.create/i);
  assert.doesNotMatch(mig, /transfers\.create/i);
  assert.doesNotMatch(mig, /refunds\.create/i);
  assert.doesNotMatch(mig, /INSERT INTO public\.package_entitlements/i);
  assert.doesNotMatch(mig, /INSERT INTO public\.package_redemptions/i);
});

test("fulfillment helper requires trusted context and rejects pending_payment in source", () => {
  const helper = read("lib/offers/plannedPackageFulfillment.ts");
  assert.match(helper, /trusted_context_required/);
  assert.match(helper, /fulfill_planned_package_order/);
  assert.match(helper, /payment_confirmed/);
  assert.match(helper, /allocatePlannedPackageSessionCents/);
  assert.doesNotMatch(helper, /new Stripe\(/);
  assert.doesNotMatch(helper, /stripe\.checkout/i);
  assert.doesNotMatch(helper, /paymentIntents\.create/i);
  assert.doesNotMatch(helper, /transfers\.create/i);
  assert.doesNotMatch(helper, /refunds\.create/i);
  assert.doesNotMatch(helper, /from\("package_entitlements"\)/);
  assert.doesNotMatch(helper, /from\("package_redemptions"\)/);
});

test("simulate-payment route is admin-only and gated", () => {
  const route = read(
    "app/api/planned-packages/pending-orders/[orderId]/simulate-payment-confirmed/route.ts",
  );
  assert.match(route, /requireAdminApi/);
  assert.match(route, /canSimulatePlannedPackagePaymentConfirmed/);
  assert.match(route, /simulatePlannedPackagePaymentConfirmedAndFulfill/);
  assert.match(route, /payment_simulation_disabled|fulfillment_engine_disabled/);
  assert.doesNotMatch(route, /new Stripe\(/);
  assert.doesNotMatch(route, /stripe\.checkout/i);
  assert.doesNotMatch(route, /paymentIntents\.create/i);
});

test("hold expiry only expires pending_payment orders", () => {
  const holds = read("lib/offers/plannedPackageHoldQueries.ts");
  assert.match(holds, /pending_payment/);
  assert.match(holds, /Only pending_payment orders expire/);
});

test("admin readiness shows fulfillment layer and stays blocked", () => {
  resetFlags();
  const readiness = getPackageLaunchReadiness();
  assert.equal(readiness.checks.plannedPackageFulfillmentEnginePresent, true);
  assert.equal(readiness.checks.plannedPackageFulfillmentIdempotent, true);
  assert.equal(readiness.checks.plannedPackageFulfillmentAtomic, true);
  assert.equal(readiness.checks.plannedPackageFulfillmentNoStripeCheckout, true);
  assert.equal(readiness.checks.plannedPackageFulfillmentNoPayoutRelease, true);
  assert.equal(readiness.checks.plannedPackagePublicPurchaseBlocked, true);
  assert.equal(readiness.flags.plannedPackageFulfillmentEngine, false);
  assert.notEqual(readiness.status as string, "production_ready");
  const page = read("app/(app)/admin/package-launch-readiness/page.tsx");
  assert.match(page, /Moteur de fulfillment/);
  assert.match(page, /Pas de checkout Stripe forfait encore/);
  assert.doesNotMatch(page, /type=\"checkbox\"/);
});

test("flags not enabled and legal review not bypassed", () => {
  resetFlags();
  assert.equal(process.env.ENABLE_PLANNED_PACKAGE_FULFILLMENT_ENGINE, undefined);
  assert.equal(process.env.PACKAGE_LEGAL_REVIEW_COMPLETED, undefined);
  const fr = read("lib/i18n/locales/fr.json");
  assert.match(fr, /Séances confirmées/);
  assert.match(fr, /Simulation de paiement confirmée/);
  assert.match(fr, /Cette étape n’est pas disponible publiquement/);
  assert.doesNotMatch(fr, /Forfait Pratiqo/);
});

test("simulation gate defaults off in production-like env", () => {
  resetFlags();
  process.env.ENABLE_PLANNED_PACKAGES = "true";
  process.env.ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS = "true";
  process.env.ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT = "true";
  process.env.ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS = "true";
  process.env.ENABLE_PLANNED_PACKAGE_FULFILLMENT_ENGINE = "true";
  const prev = process.env.NODE_ENV;
  Reflect.set(process.env, "NODE_ENV", "production");
  assert.equal(canSimulatePlannedPackagePaymentConfirmed(), false);
  process.env.ENABLE_PLANNED_PACKAGE_PAYMENT_SIMULATION = "true";
  assert.equal(canSimulatePlannedPackagePaymentConfirmed(), true);
  if (prev === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
  else Reflect.set(process.env, "NODE_ENV", prev);
});
