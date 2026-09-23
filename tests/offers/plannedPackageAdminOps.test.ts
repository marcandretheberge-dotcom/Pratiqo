/**
 * Planned package admin ops + reconciliation — read-only diagnostics + safe retry.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  canUsePlannedPackageAdminOps,
  isPlannedPackageAdminOpsEnabled,
  assessPlannedPackageRetryEligibility,
} from "@/lib/offers/plannedPackageAdminOps";
import { reconcilePlannedPackageOrder } from "@/lib/offers/plannedPackageReconciliation";
import { getPackageLaunchReadiness } from "@/lib/offers/packageLaunchReadiness";
import { ADMIN_COMMAND_CENTER_MODULES } from "@/lib/admin/overview";
import { ADMIN_PLANNED_PACKAGE_FORBIDDEN_KEYS } from "@/lib/admin/plannedPackageOrderOperations";

const root = process.cwd();
function read(rel: string): string {
  return readFileSync(path.join(root, rel), "utf8");
}

function resetFlags() {
  delete process.env.ENABLE_PLANNED_PACKAGES;
  delete process.env.ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS;
  delete process.env.ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT;
  delete process.env.ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS;
  delete process.env.ENABLE_PLANNED_PACKAGE_FULFILLMENT_ENGINE;
  delete process.env.ENABLE_PLANNED_PACKAGE_STRIPE_CHECKOUT;
  delete process.env.ENABLE_PLANNED_PACKAGE_ADMIN_OPS;
  delete process.env.PACKAGE_LEGAL_REVIEW_COMPLETED;
}

function enableFulfillmentChain() {
  process.env.ENABLE_PLANNED_PACKAGES = "true";
  process.env.ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS = "true";
  process.env.ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT = "true";
  process.env.ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS = "true";
  process.env.ENABLE_PLANNED_PACKAGE_FULFILLMENT_ENGINE = "true";
}

test("admin ops flag defaults OFF", () => {
  resetFlags();
  assert.equal(isPlannedPackageAdminOpsEnabled(), false);
  assert.equal(canUsePlannedPackageAdminOps(), false);
});

test("admin ops requires fulfillment engine chain", () => {
  resetFlags();
  process.env.ENABLE_PLANNED_PACKAGE_ADMIN_OPS = "true";
  assert.equal(canUsePlannedPackageAdminOps(), false);
  enableFulfillmentChain();
  assert.equal(canUsePlannedPackageAdminOps(), true);
});

test("migration 118 adds reconciliation metadata only", () => {
  const mig = read("supabase/migrations/118_planned_package_admin_ops_metadata.sql");
  assert.match(mig, /last_webhook_event_id/);
  assert.match(mig, /fulfillment_attempt_count/);
  assert.doesNotMatch(mig, /package_entitlements|transfers\.create/i);
});

test("admin list API requires admin auth and gates admin ops flag", () => {
  const route = read("app/api/admin/planned-package-orders/route.ts");
  assert.match(route, /requireAdminApi/);
  assert.match(route, /canUsePlannedPackageAdminOps/);
  assert.match(route, /readOnly:\s*true/);
  assert.doesNotMatch(route, /transfer\.create|refunds\.create|mark.*paid/i);
});

test("admin detail API requires admin auth", () => {
  const route = read("app/api/admin/planned-package-orders/[orderId]/route.ts");
  assert.match(route, /requireAdminApi/);
  assert.match(route, /getAdminPlannedPackageOrderDetail/);
});

test("retry fulfillment API is POST-only and gated", () => {
  const route = read("app/api/admin/planned-package-orders/[orderId]/retry-fulfillment/route.ts");
  assert.match(route, /requireAdminApi/);
  assert.match(route, /adminRetryPlannedPackageFulfillment/);
  assert.match(route, /noTeacherTransferMade/);
  assert.match(route, /noRefundMade/);
  assert.doesNotMatch(route, /transfer\.create|refunds\.create|mark.*fulfilled/i);
});

test("admin pages exist under requireAdminPage layout", () => {
  assert.equal(existsSync(path.join(root, "app/(app)/admin/planned-package-orders/page.tsx")), true);
  assert.equal(
    existsSync(path.join(root, "app/(app)/admin/planned-package-orders/[orderId]/page.tsx")),
    true,
  );
  const layout = read("app/(app)/admin/layout.tsx");
  assert.match(layout, /requireAdminPage/);
});

test("admin ops UI blocked when flag OFF and no payout/refund actions", () => {
  const list = read("app/(app)/admin/planned-package-orders/page.tsx");
  const detail = read("app/(app)/admin/planned-package-orders/[orderId]/page.tsx");
  assert.match(list, /admin_ops_disabled|403|plannedPackageAdminOpsDisabled/);
  assert.match(detail, /plannedPackageAdminOpsRetryFulfillment/);
  assert.match(detail, /plannedPackageAdminOpsNoTransferRefundNote/);
  assert.doesNotMatch(list, /Forfait Pratiqo|salaire|employé/i);
  assert.doesNotMatch(detail, /Forfait Pratiqo|salaire|employé|createRefund|releasePayout/i);
});

test("safe DTO excludes forbidden secret keys", () => {
  assert.ok(ADMIN_PLANNED_PACKAGE_FORBIDDEN_KEYS.includes("client_secret"));
  const lib = read("lib/admin/plannedPackageOrderOperations.ts");
  const orderSelect = lib.match(/const ORDER_SELECT\s*=\s*\n?\s*"([^"]+)"/)?.[1] ?? "";
  assert.ok(orderSelect.length > 0);
  assert.doesNotMatch(orderSelect, /client_secret|payment_method|raw_payload/i);
});

test("reconciliation marks paid_not_fulfilled", () => {
  const r = reconcilePlannedPackageOrder({
    orderId: "o1",
    status: "payment_confirmed",
    sessionCount: 3,
    priceCentsSnapshot: 30000,
    currencySnapshot: "CAD",
    holdExpiresAt: new Date(Date.now() + 600_000).toISOString(),
    paymentConfirmedAt: new Date().toISOString(),
    paidAt: new Date().toISOString(),
    fulfilledAt: null,
    fulfillmentError: null,
    stripeCheckoutSessionId: "cs_test",
    stripePaymentIntentId: "pi_test",
    stripeCheckoutStatus: "complete",
    stripeAmountReceivedCents: 30000,
    stripeCurrency: "CAD",
    lastWebhookReceivedAt: new Date().toISOString(),
    refundStatus: null,
    refundedCents: 0,
    latestQuoteStatus: null,
    latestExecutionStatus: null,
    packageTransferDetected: false,
    holds: [{ status: "active", sessionIndex: 1 }],
    bookings: [],
  });
  assert.ok(r.attentionReasons.includes("paid_not_fulfilled"));
  assert.equal(r.needsAttention, true);
});

test("reconciliation marks fulfillment_failed", () => {
  const r = reconcilePlannedPackageOrder({
    orderId: "o1",
    status: "fulfillment_failed",
    sessionCount: 2,
    priceCentsSnapshot: 20000,
    currencySnapshot: "CAD",
    holdExpiresAt: null,
    paymentConfirmedAt: new Date().toISOString(),
    paidAt: new Date().toISOString(),
    fulfilledAt: null,
    fulfillmentError: "holds_missing_or_invalid",
    stripeCheckoutSessionId: "cs_test",
    stripePaymentIntentId: "pi_test",
    stripeCheckoutStatus: "complete",
    stripeAmountReceivedCents: 20000,
    stripeCurrency: "CAD",
    lastWebhookReceivedAt: new Date().toISOString(),
    refundStatus: "pending",
    refundedCents: 0,
    latestQuoteStatus: "approved_for_manual_refund",
    latestExecutionStatus: "failed",
    packageTransferDetected: false,
    holds: [{ status: "active", sessionIndex: 1 }],
    bookings: [],
  });
  assert.ok(r.attentionReasons.includes("fulfillment_failed"));
  assert.ok(r.attentionReasons.includes("approved_refund_not_executed"));
  assert.ok(r.attentionReasons.includes("refund_execution_failed"));
  assert.equal(r.needsAttention, true);
});

test("reconciliation marks fulfilled_missing_bookings and booking_count_mismatch", () => {
  const missing = reconcilePlannedPackageOrder({
    orderId: "o1",
    status: "fulfilled",
    sessionCount: 2,
    priceCentsSnapshot: 20000,
    currencySnapshot: "CAD",
    holdExpiresAt: null,
    paymentConfirmedAt: new Date().toISOString(),
    paidAt: new Date().toISOString(),
    fulfilledAt: new Date().toISOString(),
    fulfillmentError: null,
    stripeCheckoutSessionId: "cs_test",
    stripePaymentIntentId: "pi_test",
    stripeCheckoutStatus: "complete",
    stripeAmountReceivedCents: 20000,
    stripeCurrency: "CAD",
    lastWebhookReceivedAt: new Date().toISOString(),
    refundStatus: null,
    refundedCents: 0,
    latestQuoteStatus: null,
    latestExecutionStatus: null,
    packageTransferDetected: false,
    holds: [
      { status: "converted", sessionIndex: 1 },
      { status: "converted", sessionIndex: 2 },
    ],
    bookings: [],
  });
  assert.ok(missing.attentionReasons.includes("fulfilled_missing_bookings"));

  const mismatch = reconcilePlannedPackageOrder({
    ...{
      orderId: "o1",
      status: "fulfilled" as const,
      sessionCount: 2,
      priceCentsSnapshot: 20000,
      currencySnapshot: "CAD",
      holdExpiresAt: null,
      paymentConfirmedAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
      fulfilledAt: new Date().toISOString(),
      fulfillmentError: null,
      stripeCheckoutSessionId: "cs_test",
      stripePaymentIntentId: "pi_test",
      stripeCheckoutStatus: "complete",
      stripeAmountReceivedCents: 20000,
      stripeCurrency: "CAD",
      lastWebhookReceivedAt: new Date().toISOString(),
      refundStatus: null,
      refundedCents: 0,
      latestQuoteStatus: null,
      latestExecutionStatus: null,
      packageTransferDetected: false,
      holds: [
        { status: "converted", sessionIndex: 1 },
        { status: "converted", sessionIndex: 2 },
      ],
    },
    bookings: [{ id: "b1", sessionIndex: 1 }],
  });
  assert.ok(mismatch.attentionReasons.includes("booking_count_mismatch"));
});

test("reconciliation marks hold_not_converted amount currency webhook_missing", () => {
  const hold = reconcilePlannedPackageOrder({
    orderId: "o1",
    status: "fulfilled",
    sessionCount: 1,
    priceCentsSnapshot: 10000,
    currencySnapshot: "CAD",
    holdExpiresAt: null,
    paymentConfirmedAt: new Date().toISOString(),
    paidAt: new Date().toISOString(),
    fulfilledAt: new Date().toISOString(),
    fulfillmentError: null,
    stripeCheckoutSessionId: "cs_test",
    stripePaymentIntentId: "pi_test",
    stripeCheckoutStatus: "complete",
    stripeAmountReceivedCents: 10000,
    stripeCurrency: "CAD",
    lastWebhookReceivedAt: new Date().toISOString(),
    refundStatus: null,
    refundedCents: 0,
    latestQuoteStatus: null,
    latestExecutionStatus: null,
    packageTransferDetected: false,
    holds: [{ status: "active", sessionIndex: 1 }],
    bookings: [{ id: "b1", sessionIndex: 1 }],
  });
  assert.ok(hold.attentionReasons.includes("hold_not_converted"));

  const amount = reconcilePlannedPackageOrder({
    orderId: "o1",
    status: "payment_confirmed",
    sessionCount: 2,
    priceCentsSnapshot: 20000,
    currencySnapshot: "CAD",
    holdExpiresAt: null,
    paymentConfirmedAt: new Date().toISOString(),
    paidAt: new Date().toISOString(),
    fulfilledAt: null,
    fulfillmentError: null,
    stripeCheckoutSessionId: "cs_test",
    stripePaymentIntentId: "pi_test",
    stripeCheckoutStatus: "complete",
    stripeAmountReceivedCents: 19999,
    stripeCurrency: "CAD",
    lastWebhookReceivedAt: new Date().toISOString(),
    refundStatus: null,
    refundedCents: 0,
    latestQuoteStatus: null,
    latestExecutionStatus: null,
    packageTransferDetected: false,
    holds: [],
    bookings: [],
  });
  assert.ok(amount.attentionReasons.includes("amount_mismatch"));

  const currency = reconcilePlannedPackageOrder({
    orderId: "o1",
    status: "payment_confirmed",
    sessionCount: 2,
    priceCentsSnapshot: 20000,
    currencySnapshot: "CAD",
    holdExpiresAt: null,
    paymentConfirmedAt: new Date().toISOString(),
    paidAt: new Date().toISOString(),
    fulfilledAt: null,
    fulfillmentError: null,
    stripeCheckoutSessionId: "cs_test",
    stripePaymentIntentId: "pi_test",
    stripeCheckoutStatus: "complete",
    stripeAmountReceivedCents: 20000,
    stripeCurrency: "USD",
    lastWebhookReceivedAt: new Date().toISOString(),
    refundStatus: null,
    refundedCents: 0,
    latestQuoteStatus: null,
    latestExecutionStatus: null,
    packageTransferDetected: false,
    holds: [],
    bookings: [],
  });
  assert.ok(currency.attentionReasons.includes("currency_mismatch"));

  const webhook = reconcilePlannedPackageOrder({
    orderId: "o1",
    status: "payment_confirmed",
    sessionCount: 2,
    priceCentsSnapshot: 20000,
    currencySnapshot: "CAD",
    holdExpiresAt: null,
    paymentConfirmedAt: new Date().toISOString(),
    paidAt: new Date().toISOString(),
    fulfilledAt: null,
    fulfillmentError: null,
    stripeCheckoutSessionId: "cs_test",
    stripePaymentIntentId: "pi_test",
    stripeCheckoutStatus: "complete",
    stripeAmountReceivedCents: 20000,
    stripeCurrency: "CAD",
    lastWebhookReceivedAt: null,
    refundStatus: null,
    refundedCents: 0,
    latestQuoteStatus: null,
    latestExecutionStatus: null,
    packageTransferDetected: false,
    holds: [],
    bookings: [],
  });
  assert.ok(webhook.attentionReasons.includes("webhook_missing"));
});

test("fulfilled clean order has no needsAttention", () => {
  const r = reconcilePlannedPackageOrder({
    orderId: "o1",
    status: "fulfilled",
    sessionCount: 2,
    priceCentsSnapshot: 20000,
    currencySnapshot: "CAD",
    holdExpiresAt: null,
    paymentConfirmedAt: new Date().toISOString(),
    paidAt: new Date().toISOString(),
    fulfilledAt: new Date().toISOString(),
    fulfillmentError: null,
    stripeCheckoutSessionId: "cs_test",
    stripePaymentIntentId: "pi_test",
    stripeCheckoutStatus: "complete",
    stripeAmountReceivedCents: 20000,
    stripeCurrency: "CAD",
    lastWebhookReceivedAt: new Date().toISOString(),
    refundStatus: null,
    refundedCents: 0,
    latestQuoteStatus: null,
    latestExecutionStatus: null,
    packageTransferDetected: false,
    holds: [
      { status: "converted", sessionIndex: 1 },
      { status: "converted", sessionIndex: 2 },
    ],
    bookings: [
      { id: "b1", sessionIndex: 1 },
      { id: "b2", sessionIndex: 2 },
    ],
  });
  assert.equal(r.needsAttention, false);
  assert.deepEqual(r.attentionReasons, []);
});

test("retry eligibility gated and status-aware", () => {
  resetFlags();
  enableFulfillmentChain();
  process.env.ENABLE_PLANNED_PACKAGE_ADMIN_OPS = "true";

  const eligible = assessPlannedPackageRetryEligibility({
    status: "payment_confirmed",
    paymentReference: "pi_test",
    stripeCheckoutSessionId: "cs_test",
    stripePaymentIntentId: "pi_test",
  });
  assert.equal(eligible.eligible, true);

  const fulfilled = assessPlannedPackageRetryEligibility({
    status: "fulfilled",
    paymentReference: "pi_test",
    stripeCheckoutSessionId: "cs_test",
    stripePaymentIntentId: "pi_test",
  });
  assert.equal(fulfilled.eligible, false);
  assert.ok(fulfilled.blockers.includes("already_fulfilled"));

  delete process.env.ENABLE_PLANNED_PACKAGE_ADMIN_OPS;
  const disabled = assessPlannedPackageRetryEligibility({
    status: "payment_confirmed",
    paymentReference: "pi_test",
    stripeCheckoutSessionId: "cs_test",
    stripePaymentIntentId: "pi_test",
  });
  assert.equal(disabled.eligible, false);
  assert.ok(disabled.blockers.includes("admin_ops_disabled"));
});

test("retry helper calls fulfillment engine not transfer/refund", () => {
  const lib = read("lib/admin/plannedPackageOrderOperations.ts");
  assert.match(lib, /fulfillPlannedPackageOrder/);
  assert.doesNotMatch(lib, /transfer\.create|refunds\.create|markPlannedPackageOrderPaymentConfirmed/);
});

test("webhook stores safe metadata", () => {
  const confirm = read("lib/offers/confirmPlannedPackageStripeCheckout.ts");
  assert.match(confirm, /last_webhook_event_id/);
  assert.match(confirm, /fulfillment_attempt_count/);
  assert.match(confirm, /stripe_checkout_completed_at/);
  assert.match(confirm, /stripe_checkout_expired_at/);
  const webhook = read("app/api/stripe/webhook/route.ts");
  assert.match(webhook, /webhookEventId:\s*event\.id/);
});

test("normal booking webhook path unchanged for planned package marker isolation", () => {
  const webhook = read("app/api/stripe/webhook/route.ts");
  assert.match(webhook, /confirmBookingAndNotify/);
  assert.match(webhook, /package_type === "planned_package"/);
});

test("admin readiness shows ops/reconciliation checks", () => {
  resetFlags();
  const readiness = getPackageLaunchReadiness();
  assert.equal(readiness.checks.plannedPackageAdminOpsPresent, true);
  assert.equal(readiness.checks.plannedPackageAdminOpsReconciliationPresent, true);
  assert.equal(readiness.checks.plannedPackageAdminOpsNoPayoutAction, true);
  assert.equal(readiness.checks.plannedPackageAdminOpsNoRefundAction, true);
  assert.equal(readiness.checks.plannedPackagePublicPurchaseBlocked, true);
  assert.equal(readiness.checks.legalReviewCompletedSignal, false);
  const page = read("app/(app)/admin/package-launch-readiness/page.tsx");
  assert.match(page, /Ops admin commandes forfait planifié/);
  assert.match(page, /ENABLE_PLANNED_PACKAGE_ADMIN_OPS/);
});

test("command center links planned package orders", () => {
  const mod = ADMIN_COMMAND_CENTER_MODULES.find((m) => m.id === "planned_package_orders");
  assert.ok(mod);
  assert.equal(mod!.href, "/admin/planned-package-orders");
  assert.match(mod!.title, /Commandes de forfaits planifiés/);
});
