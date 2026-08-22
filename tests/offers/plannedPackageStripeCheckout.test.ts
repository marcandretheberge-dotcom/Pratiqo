/**
 * Gated Stripe Checkout for planned packages — no transfer / payout.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  canCreatePlannedPackageCheckoutInCurrentEnvironment,
  canUsePlannedPackageStripeCheckout,
  getPlannedPackageCheckoutEnvironmentBlockers,
  isPlannedPackageCheckoutTestModeEnabled,
  isPlannedPackageStripeCheckoutEnabled,
  isPlannedPackageStripeCheckoutUiEnabled,
  plannedPackageTransferGroup,
  PLANNED_PACKAGE_STRIPE_METADATA_TYPE,
} from "@/lib/offers/plannedPackageStripeCheckout";
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
  delete process.env.ENABLE_PLANNED_PACKAGE_STRIPE_CHECKOUT;
  delete process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_STRIPE_CHECKOUT;
  delete process.env.ENABLE_PLANNED_PACKAGE_CHECKOUT_TEST_MODE;
  delete process.env.PACKAGE_LEGAL_REVIEW_COMPLETED;
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.NODE_ENV;
  delete process.env.VERCEL_ENV;
}

function enableFullChain() {
  process.env.ENABLE_PLANNED_PACKAGES = "true";
  process.env.ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS = "true";
  process.env.ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT = "true";
  process.env.ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS = "true";
  process.env.ENABLE_PLANNED_PACKAGE_FULFILLMENT_ENGINE = "true";
  process.env.ENABLE_PLANNED_PACKAGE_STRIPE_CHECKOUT = "true";
}

test("stripe checkout flags default OFF", () => {
  resetFlags();
  assert.equal(isPlannedPackageStripeCheckoutEnabled(), false);
  assert.equal(isPlannedPackageStripeCheckoutUiEnabled(), false);
  assert.equal(canUsePlannedPackageStripeCheckout(), false);
});

test("stripe checkout requires full dependency chain", () => {
  resetFlags();
  process.env.ENABLE_PLANNED_PACKAGE_STRIPE_CHECKOUT = "true";
  assert.equal(canUsePlannedPackageStripeCheckout(), false);
  enableFullChain();
  assert.equal(canUsePlannedPackageStripeCheckout(), true);
});

test("production checkout blocked without legal review", () => {
  resetFlags();
  enableFullChain();
  process.env.NODE_ENV = "production";
  process.env.STRIPE_SECRET_KEY = "sk_live_x";
  assert.equal(canCreatePlannedPackageCheckoutInCurrentEnvironment(), false);
  assert.ok(getPlannedPackageCheckoutEnvironmentBlockers().includes("package_legal_review_required"));
  process.env.PACKAGE_LEGAL_REVIEW_COMPLETED = "true";
  assert.equal(canCreatePlannedPackageCheckoutInCurrentEnvironment(), true);
});

test("non-production test mode requires explicit flag and test key", () => {
  resetFlags();
  enableFullChain();
  process.env.NODE_ENV = "development";
  process.env.STRIPE_SECRET_KEY = "sk_test_x";
  assert.equal(canCreatePlannedPackageCheckoutInCurrentEnvironment(), false);
  process.env.ENABLE_PLANNED_PACKAGE_CHECKOUT_TEST_MODE = "true";
  assert.equal(isPlannedPackageCheckoutTestModeEnabled(), true);
  assert.equal(canCreatePlannedPackageCheckoutInCurrentEnvironment(), true);
});

test("transfer group helper", () => {
  assert.equal(plannedPackageTransferGroup("abc"), "planned_package_order_abc");
});

test("migration adds stripe checkout fields", () => {
  const mig = read("supabase/migrations/117_planned_package_stripe_checkout_fields.sql");
  assert.match(mig, /stripe_checkout_session_id/);
  assert.match(mig, /stripe_payment_intent_id/);
  assert.match(mig, /idx_planned_package_pending_orders_stripe_session/);
  assert.doesNotMatch(mig, /package_entitlements|package_redemptions|transfers\.create/i);
});

test("checkout API requires auth and flags", () => {
  const route = read("app/api/planned-packages/pending-orders/[orderId]/checkout/route.ts");
  assert.match(route, /unauthenticated/);
  assert.match(route, /canUsePlannedPackageStripeCheckout/);
  assert.match(route, /createPlannedPackageStripeCheckoutSession/);
  assert.doesNotMatch(route, /transfers\.create|transfer_data/);
});

test("checkout session creator uses platform charge pattern", () => {
  const svc = read("lib/offers/createPlannedPackageStripeCheckoutSession.ts");
  assert.match(svc, /checkout\.sessions\.create/);
  assert.match(svc, /transfer_group/);
  assert.match(svc, /package_type.*planned_package|planned_package/);
  assert.match(svc, /mode:\s*"payment"/);
  assert.doesNotMatch(svc, /transfer_data\s*:|application_fee_amount\s*:/);
  assert.doesNotMatch(svc, /from\("bookings"\)\.insert/);
  assert.doesNotMatch(svc, /package_entitlements|package_redemptions/);
});

test("webhook handles planned package checkout completion", () => {
  const webhook = read("app/api/stripe/webhook/route.ts");
  const confirm = read("lib/offers/confirmPlannedPackageStripeCheckout.ts");
  assert.match(webhook, /confirmPlannedPackageStripeCheckout/);
  assert.match(webhook, /expirePlannedPackageStripeCheckout/);
  assert.match(webhook, /package_type === "planned_package"/);
  assert.match(confirm, /fulfillPlannedPackageOrder/);
  assert.match(confirm, /amount_total|amount_mismatch/);
  assert.doesNotMatch(confirm, /transfers\.create|releasePayout|createTransfer/);
});

test("success page verifies session server-side", () => {
  const page = read("app/(app)/packages/planned/success/page.tsx");
  assert.match(page, /checkout\.sessions\.retrieve/);
  assert.match(page, /stripe_checkout_session_id === sessionId/);
  assert.doesNotMatch(page, /Séances confirmées.*searchParams/);
});

test("UI checkout button gated and no employer wording", () => {
  const ui = read("components/packages/PlannedPackageCheckoutButton.tsx");
  const panel = read("components/packages/PlannedPackagePendingOrder.tsx");
  assert.match(ui, /plannedPackageBuyPackage/);
  assert.match(ui, /isPlannedPackageStripeCheckoutUiEnabled/);
  assert.match(panel, /PlannedPackageCheckoutButton/);
  assert.doesNotMatch(ui, /Forfait Pratiqo|salaire|employé/i);
});

test("admin readiness shows stripe checkout layer", () => {
  resetFlags();
  const readiness = getPackageLaunchReadiness();
  assert.equal(readiness.checks.plannedPackageStripeCheckoutPresent, true);
  assert.equal(readiness.checks.plannedPackageStripeCheckoutNoTransfer, true);
  assert.equal(readiness.checks.plannedPackageStripeCheckoutWebhookFulfillment, true);
  assert.equal(readiness.flags.plannedPackageStripeCheckout, false);
  const page = read("app/(app)/admin/package-launch-readiness/page.tsx");
  assert.match(page, /Stripe Checkout forfait planifié/);
});

test("normal booking checkout route unchanged by planned package checkout module", () => {
  const bookingCheckout = read("app/api/stripe/checkout/route.ts");
  assert.doesNotMatch(bookingCheckout, /plannedPackageStripeCheckout|planned_package_order_id/);
});

test("metadata type constant", () => {
  assert.equal(PLANNED_PACKAGE_STRIPE_METADATA_TYPE, "planned_package");
});
