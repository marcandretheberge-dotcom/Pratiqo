/**
 * Planned package refund quote engine — quote-only, no Stripe refund.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { calculatePlannedPackageRefundQuote } from "@/lib/offers/plannedPackageRefundQuote";
import {
  canUsePlannedPackageRefundAdminReview,
  canUsePlannedPackageRefundQuotes,
  isPlannedPackageRefundQuotesEnabled,
  PLANNED_PACKAGE_REFUND_POLICY_VERSION,
} from "@/lib/offers/plannedPackageRefundQuotes";
import { classifyPlannedPackageSessions } from "@/lib/offers/plannedPackageSessionDelivery";
import { allocatePlannedPackageSessionCents } from "@/lib/offers/plannedPackageAllocation";
import { getPackageLaunchReadiness } from "@/lib/offers/packageLaunchReadiness";

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
  delete process.env.ENABLE_PLANNED_PACKAGE_ADMIN_OPS;
  delete process.env.ENABLE_PLANNED_PACKAGE_REFUND_QUOTES;
  delete process.env.ENABLE_PLANNED_PACKAGE_REFUND_ADMIN_REVIEW;
  delete process.env.PACKAGE_LEGAL_REVIEW_COMPLETED;
}

function enableRefundChain() {
  process.env.ENABLE_PLANNED_PACKAGES = "true";
  process.env.ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS = "true";
  process.env.ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT = "true";
  process.env.ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS = "true";
  process.env.ENABLE_PLANNED_PACKAGE_FULFILLMENT_ENGINE = "true";
  process.env.ENABLE_PLANNED_PACKAGE_ADMIN_OPS = "true";
  process.env.ENABLE_PLANNED_PACKAGE_REFUND_QUOTES = "true";
}

function sampleBookings(count: number, completedThrough: number) {
  return Array.from({ length: count }, (_, i) => ({
    bookingId: `b${i + 1}`,
    sessionIndex: i + 1,
    status: i < completedThrough ? "completed" : "confirmed",
    lessonDate: "2026-09-01",
    lessonTime: "10:00",
  }));
}

test("refund quote flags default OFF", () => {
  resetFlags();
  assert.equal(isPlannedPackageRefundQuotesEnabled(), false);
  assert.equal(canUsePlannedPackageRefundQuotes(), false);
  assert.equal(canUsePlannedPackageRefundAdminReview(), false);
});

test("refund quotes require admin ops chain", () => {
  resetFlags();
  process.env.ENABLE_PLANNED_PACKAGE_REFUND_QUOTES = "true";
  assert.equal(canUsePlannedPackageRefundQuotes(), false);
  enableRefundChain();
  assert.equal(canUsePlannedPackageRefundQuotes(), true);
});

test("migration 119 creates cancellation + quote tables without Stripe refund", () => {
  const mig = read("supabase/migrations/119_planned_package_cancellation_refund_quotes.sql");
  assert.match(mig, /planned_package_cancellation_requests/);
  assert.match(mig, /planned_package_refund_quotes/);
  assert.match(mig, /ENABLE ROW LEVEL SECURITY/);
  assert.doesNotMatch(mig, /stripe\.refunds|transfers\.create/i);
});

test("admin cancellation and quote APIs require admin auth and gate flags", () => {
  for (const rel of [
    "app/api/admin/planned-package-orders/[orderId]/cancellation-request/route.ts",
    "app/api/admin/planned-package-orders/[orderId]/refund-quote/route.ts",
    "app/api/admin/planned-package-orders/[orderId]/refund-quote/action/route.ts",
  ]) {
    const route = read(rel);
    assert.match(route, /requireAdminApi/);
    assert.match(route, /noStripeRefundExecuted/);
    assert.doesNotMatch(route, /stripe\.refunds\.create|refunds\.create|transfer\.create/i);
  }
});

test("quote uses policy version constant", () => {
  const quote = calculatePlannedPackageRefundQuote({
    orderId: "o1",
    orderStatus: "fulfilled",
    packageTotalCents: 10000,
    currency: "CAD",
    sessionCount: 2,
    bookings: sampleBookings(2, 0),
  });
  assert.equal(quote.policyVersion, PLANNED_PACKAGE_REFUND_POLICY_VERSION);
});

test("quote for 0 completed sessions returns full package total", () => {
  const quote = calculatePlannedPackageRefundQuote({
    orderId: "o1",
    orderStatus: "fulfilled",
    packageTotalCents: 20000,
    currency: "CAD",
    sessionCount: 4,
    bookings: sampleBookings(4, 0),
  });
  assert.equal(quote.completedSessionCount, 0);
  assert.equal(quote.penaltyCents, 0);
  assert.equal(quote.estimatedRefundCents, 20000);
});

test("quote for partially completed package subtracts completed value and applies penalty", () => {
  const total = 10000;
  const count = 4;
  const allocations = allocatePlannedPackageSessionCents(total, count);
  const quote = calculatePlannedPackageRefundQuote({
    orderId: "o1",
    orderStatus: "fulfilled",
    packageTotalCents: total,
    currency: "CAD",
    sessionCount: count,
    bookings: sampleBookings(count, 1),
  });
  const completedValue = allocations[0];
  const undelivered = total - completedValue;
  const penalty = Math.min(5000, Math.floor(undelivered * 0.1));
  assert.equal(quote.completedValueCents, completedValue);
  assert.equal(quote.undeliveredValueCents, undelivered);
  assert.equal(quote.penaltyCents, penalty);
  assert.equal(quote.estimatedRefundCents, Math.max(0, undelivered - penalty));
});

test("quote penalty is min(5000, 10% of undelivered value)", () => {
  const quote = calculatePlannedPackageRefundQuote({
    orderId: "o1",
    orderStatus: "fulfilled",
    packageTotalCents: 100000,
    currency: "CAD",
    sessionCount: 2,
    bookings: sampleBookings(2, 1),
  });
  assert.equal(quote.penaltyCents, 5000);
});

test("quote never returns negative refund", () => {
  const quote = calculatePlannedPackageRefundQuote({
    orderId: "o1",
    orderStatus: "fulfilled",
    packageTotalCents: 5000,
    currency: "CAD",
    sessionCount: 2,
    bookings: sampleBookings(2, 2),
  });
  assert.ok(quote.estimatedRefundCents >= 0);
});

test("quote allocation sums to package total", () => {
  const total = 9999;
  const count = 7;
  const allocs = allocatePlannedPackageSessionCents(total, count);
  assert.equal(allocs.reduce((a, b) => a + b, 0), total);
});

test("no_show and disputed sessions require manual review", () => {
  const c1 = classifyPlannedPackageSessions({
    bookings: [
      {
        bookingId: "b1",
        sessionIndex: 1,
        status: "no_show",
        lessonDate: null,
        lessonTime: null,
      },
      {
        bookingId: "b2",
        sessionIndex: 2,
        status: "confirmed",
        lessonDate: null,
        lessonTime: null,
      },
    ],
    expectedSessionCount: 2,
  });
  assert.equal(c1.manualReviewRequired, true);

  const quote = calculatePlannedPackageRefundQuote({
    orderId: "o1",
    orderStatus: "fulfilled",
    packageTotalCents: 10000,
    currency: "CAD",
    sessionCount: 2,
    bookings: [
      { bookingId: "b1", sessionIndex: 1, status: "disputed", lessonDate: null, lessonTime: null },
      { bookingId: "b2", sessionIndex: 2, status: "confirmed", lessonDate: null, lessonTime: null },
    ],
  });
  assert.equal(quote.manualReviewRequired, true);
});

test("missing bookings and booking count mismatch add blockers", () => {
  const quote = calculatePlannedPackageRefundQuote({
    orderId: "o1",
    orderStatus: "fulfilled",
    packageTotalCents: 10000,
    currency: "CAD",
    sessionCount: 3,
    bookings: sampleBookings(2, 0),
  });
  assert.ok(quote.blockers.includes("booking_count_mismatch"));
});

test("unsupported currency blocks quote", () => {
  const quote = calculatePlannedPackageRefundQuote({
    orderId: "o1",
    orderStatus: "fulfilled",
    packageTotalCents: 10000,
    currency: "USD",
    sessionCount: 2,
    bookings: sampleBookings(2, 0),
  });
  assert.ok(quote.blockers.includes("unsupported_currency"));
});

test("refund operations module does not call Stripe refund", () => {
  const lib = read("lib/admin/plannedPackageRefundOperations.ts");
  assert.match(lib, /calculatePlannedPackageRefundQuote/);
  assert.doesNotMatch(lib, /stripe\.refunds\.create|refunds\.create|transfer\.create/i);
});

test("admin detail page shows refund section without Stripe refund actions", () => {
  const page = read("app/(app)/admin/planned-package-orders/[orderId]/page.tsx");
  assert.match(page, /plannedPackageRefundSectionTitle/);
  assert.match(page, /plannedPackageRefundGenerateEstimate/);
  assert.match(page, /plannedPackageRefundNoStripeExecuted/);
  assert.doesNotMatch(page, /Rembourser maintenant|refunds\.create|Refund in Stripe/i);
});

test("admin readiness shows refund quote engine and execution missing", () => {
  resetFlags();
  const readiness = getPackageLaunchReadiness();
  assert.equal(readiness.checks.plannedPackageRefundQuoteEnginePresent, true);
  assert.equal(readiness.checks.plannedPackageRefundQuoteNoAutomaticStripeRefund, true);
  assert.equal(readiness.checks.plannedPackageRefundExecutionNotImplemented, true);
  assert.equal(readiness.checks.plannedPackagePublicPurchaseBlocked, true);
  assert.equal(readiness.checks.legalReviewCompletedSignal, false);
  const page = read("app/(app)/admin/package-launch-readiness/page.tsx");
  assert.match(page, /Estimation remboursement/);
  assert.match(page, /ENABLE_PLANNED_PACKAGE_REFUND_QUOTES/);
});

test("docs describe quote-only scope", () => {
  const doc = read("docs/product/package-refund-quote-engine.md");
  assert.match(doc, /Quote-only/);
  assert.match(doc, /stripe\.refunds\.create/);
  assert.match(doc, /planned-package-refund-v1-draft-2026/);
});

test("approving quote route marks only — no Stripe", () => {
  const route = read("app/api/admin/planned-package-orders/[orderId]/refund-quote/action/route.ts");
  assert.match(route, /adminApprovePlannedPackageRefundQuote/);
  assert.match(route, /actualRefundNotAvailable/);
  assert.doesNotMatch(route, /stripe\.refunds|refunds\.create/i);
});
