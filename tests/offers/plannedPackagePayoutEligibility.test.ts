/**
 * Planned package payout eligibility ledger — eligibility only, no Stripe transfer.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  canUsePlannedPackagePayoutEligibilityLedger,
  isPlannedPackagePayoutEligibilityLedgerEnabled,
  isPlannedPackagePayoutAdminViewEnabled,
  canShowPlannedPackagePayoutAdminView,
} from "@/lib/offers/plannedPackagePayoutEligibilityLedger";
import {
  evaluatePlannedPackageSessionPayoutEligibility,
  syncPlannedPackagePayoutEligibilityForOrder,
} from "@/lib/offers/plannedPackagePayoutEligibility";
import { reconcilePlannedPackageOrder } from "@/lib/offers/plannedPackageReconciliation";
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
  delete process.env.ENABLE_PLANNED_PACKAGE_PAYOUT_ELIGIBILITY_LEDGER;
  delete process.env.ENABLE_PLANNED_PACKAGE_PAYOUT_ADMIN_VIEW;
}

function enablePayoutEligibilityChain() {
  process.env.ENABLE_PLANNED_PACKAGES = "true";
  process.env.ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS = "true";
  process.env.ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT = "true";
  process.env.ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS = "true";
  process.env.ENABLE_PLANNED_PACKAGE_FULFILLMENT_ENGINE = "true";
  process.env.ENABLE_PLANNED_PACKAGE_ADMIN_OPS = "true";
  process.env.ENABLE_PLANNED_PACKAGE_PAYOUT_ELIGIBILITY_LEDGER = "true";
}

const baseOrder = {
  id: "order-1",
  status: "fulfilled",
  student_id: "student-1",
  teacher_id: "teacher-1",
  teacher_offer_id: "offer-1",
  session_count: 2,
  price_cents_snapshot: 10000,
  currency_snapshot: "CAD",
  payment_confirmed_at: "2026-01-01T00:00:00Z",
  paid_at: "2026-01-01T00:00:00Z",
  stripe_payment_intent_id: "pi_1",
  refund_status: null,
};

const readyTeacher = {
  id: "teacher-1",
  stripe_account_id: "acct_1",
  stripe_connect_charges_enabled: true,
  stripe_connect_payouts_enabled: true,
  stripe_connect_onboarding_complete: true,
  stripe_connect_requirements_due: false,
  stripe_connect_disabled_reason: null,
};

test("payout eligibility ledger flag defaults OFF", () => {
  resetFlags();
  assert.equal(isPlannedPackagePayoutEligibilityLedgerEnabled(), false);
  assert.equal(canUsePlannedPackagePayoutEligibilityLedger(), false);
  assert.equal(isPlannedPackagePayoutAdminViewEnabled(), false);
  assert.equal(canShowPlannedPackagePayoutAdminView(), false);
});

test("payout eligibility requires admin ops chain", () => {
  resetFlags();
  process.env.ENABLE_PLANNED_PACKAGE_PAYOUT_ELIGIBILITY_LEDGER = "true";
  assert.equal(canUsePlannedPackagePayoutEligibilityLedger(), false);
  enablePayoutEligibilityChain();
  assert.equal(canUsePlannedPackagePayoutEligibilityLedger(), true);
  process.env.ENABLE_PLANNED_PACKAGE_PAYOUT_ADMIN_VIEW = "true";
  assert.equal(canShowPlannedPackagePayoutAdminView(), true);
});

test("migration 121 creates eligibility ledger without Stripe transfer", () => {
  const mig = read("supabase/migrations/121_planned_package_payout_eligibility_ledger.sql");
  assert.match(mig, /planned_package_payout_eligibility_entries/);
  assert.match(mig, /UNIQUE \(booking_id\)/);
  assert.match(mig, /ENABLE ROW LEVEL SECURITY/);
  assert.doesNotMatch(mig, /transfers\.create|createReversal|payouts\.create|refunds\.create/i);
});

test("payout eligibility API routes require admin auth", () => {
  const getRoute = read(
    "app/api/admin/planned-package-orders/[orderId]/payout-eligibility/route.ts",
  );
  const syncRoute = read(
    "app/api/admin/planned-package-orders/[orderId]/sync-payout-eligibility/route.ts",
  );
  assert.match(getRoute, /requireAdminApi/);
  assert.match(syncRoute, /requireAdminApi/);
  assert.match(getRoute, /noStripeTransferCreated/);
  assert.match(syncRoute, /noPayoutReleased/);
  assert.doesNotMatch(getRoute, /transfers\.create/);
  assert.doesNotMatch(syncRoute, /transfers\.create/);
});

test("eligibility helper module does not create Stripe transfers", () => {
  const src = read("lib/offers/plannedPackagePayoutEligibility.ts");
  assert.match(src, /stripe_transfer_id: null/);
  assert.match(src, /classifyPlannedPackageSessionStatus/);
  assert.doesNotMatch(src, /transfers\.create/);
  assert.doesNotMatch(src, /createReversal/);
  assert.doesNotMatch(src, /payouts\.create/);
  assert.doesNotMatch(src, /refunds\.create/);
});

test("non-package booking evaluation is not applicable via missing package fields", () => {
  const result = evaluatePlannedPackageSessionPayoutEligibility({
    order: baseOrder,
    booking: {
      id: "b-normal",
      status: "completed",
      student_id: "student-1",
      teacher_id: "teacher-1",
      teacher_offer_id: "offer-1",
      planned_package_order_id: null,
      planned_package_session_index: null,
      booking_source: "standard",
      price_cents: 5000,
    },
    teacher: readyTeacher,
    cancellationOpen: false,
    refundQuoteStatus: null,
    refundExecuted: false,
  });
  assert.ok(result.blockers.includes("booking_not_package_session"));
});

test("uncompleted package booking remains not_eligible", () => {
  const result = evaluatePlannedPackageSessionPayoutEligibility({
    order: baseOrder,
    booking: {
      id: "b1",
      status: "confirmed",
      student_id: "student-1",
      teacher_id: "teacher-1",
      teacher_offer_id: "offer-1",
      planned_package_order_id: "order-1",
      planned_package_session_index: 1,
      booking_source: "planned_package",
      price_cents: 5000,
    },
    teacher: readyTeacher,
    cancellationOpen: false,
    refundQuoteStatus: null,
    refundExecuted: false,
  });
  assert.equal(result.status, "not_eligible");
  assert.ok(result.blockers.includes("booking_not_completed"));
});

test("completed package booking becomes admin_review_required when pricing policy not finalized", () => {
  const result = evaluatePlannedPackageSessionPayoutEligibility({
    order: baseOrder,
    booking: {
      id: "b1",
      status: "completed",
      student_id: "student-1",
      teacher_id: "teacher-1",
      teacher_offer_id: "offer-1",
      planned_package_order_id: "order-1",
      planned_package_session_index: 1,
      booking_source: "planned_package",
      price_cents: 5000,
    },
    teacher: readyTeacher,
    cancellationOpen: false,
    refundQuoteStatus: null,
    refundExecuted: false,
  });
  assert.equal(result.status, "admin_review_required");
  assert.ok(result.blockers.includes("payout_pricing_policy_not_finalized"));
  assert.equal(result.platformFeeCents, null);
  assert.equal(result.teacherNetCents, null);
});

test("unpaid order blocks eligibility", () => {
  const result = evaluatePlannedPackageSessionPayoutEligibility({
    order: {
      ...baseOrder,
      status: "pending_payment",
      payment_confirmed_at: null,
      paid_at: null,
      stripe_payment_intent_id: null,
    },
    booking: {
      id: "b1",
      status: "completed",
      student_id: "student-1",
      teacher_id: "teacher-1",
      teacher_offer_id: "offer-1",
      planned_package_order_id: "order-1",
      planned_package_session_index: 1,
      booking_source: "planned_package",
      price_cents: 5000,
    },
    teacher: readyTeacher,
    cancellationOpen: false,
    refundQuoteStatus: null,
    refundExecuted: false,
  });
  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.includes("order_not_paid"));
});

test("unfulfilled order blocks eligibility", () => {
  const result = evaluatePlannedPackageSessionPayoutEligibility({
    order: { ...baseOrder, status: "payment_confirmed" },
    booking: {
      id: "b1",
      status: "completed",
      student_id: "student-1",
      teacher_id: "teacher-1",
      teacher_offer_id: "offer-1",
      planned_package_order_id: "order-1",
      planned_package_session_index: 1,
      booking_source: "planned_package",
      price_cents: 5000,
    },
    teacher: readyTeacher,
    cancellationOpen: false,
    refundQuoteStatus: null,
    refundExecuted: false,
  });
  assert.ok(result.blockers.includes("order_not_fulfilled"));
});

test("allocation mismatch requires admin review", () => {
  const result = evaluatePlannedPackageSessionPayoutEligibility({
    order: baseOrder,
    booking: {
      id: "b1",
      status: "completed",
      student_id: "student-1",
      teacher_id: "teacher-1",
      teacher_offer_id: "offer-1",
      planned_package_order_id: "order-1",
      planned_package_session_index: 1,
      booking_source: "planned_package",
      price_cents: 9999,
    },
    teacher: readyTeacher,
    cancellationOpen: false,
    refundQuoteStatus: null,
    refundExecuted: false,
  });
  assert.ok(result.blockers.includes("allocation_mismatch"));
  assert.equal(result.adminReviewRequired, true);
});

test("cancellation request blocks eligibility", () => {
  const result = evaluatePlannedPackageSessionPayoutEligibility({
    order: baseOrder,
    booking: {
      id: "b1",
      status: "completed",
      student_id: "student-1",
      teacher_id: "teacher-1",
      teacher_offer_id: "offer-1",
      planned_package_order_id: "order-1",
      planned_package_session_index: 1,
      booking_source: "planned_package",
      price_cents: 5000,
    },
    teacher: readyTeacher,
    cancellationOpen: true,
    refundQuoteStatus: null,
    refundExecuted: false,
  });
  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.includes("cancellation_request_open"));
});

test("refund quote pending blocks or requires admin review", () => {
  const result = evaluatePlannedPackageSessionPayoutEligibility({
    order: baseOrder,
    booking: {
      id: "b1",
      status: "completed",
      student_id: "student-1",
      teacher_id: "teacher-1",
      teacher_offer_id: "offer-1",
      planned_package_order_id: "order-1",
      planned_package_session_index: 1,
      booking_source: "planned_package",
      price_cents: 5000,
    },
    teacher: readyTeacher,
    cancellationOpen: false,
    refundQuoteStatus: "draft",
    refundExecuted: false,
  });
  assert.ok(result.blockers.includes("refund_quote_pending"));
  assert.equal(result.adminReviewRequired, true);
});

test("approved refund quote blocks eligibility", () => {
  const result = evaluatePlannedPackageSessionPayoutEligibility({
    order: baseOrder,
    booking: {
      id: "b1",
      status: "completed",
      student_id: "student-1",
      teacher_id: "teacher-1",
      teacher_offer_id: "offer-1",
      planned_package_order_id: "order-1",
      planned_package_session_index: 1,
      booking_source: "planned_package",
      price_cents: 5000,
    },
    teacher: readyTeacher,
    cancellationOpen: false,
    refundQuoteStatus: "approved_for_manual_refund",
    refundExecuted: false,
  });
  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.includes("refund_approved_or_executed"));
});

test("teacher payment readiness blocker tracked", () => {
  const result = evaluatePlannedPackageSessionPayoutEligibility({
    order: baseOrder,
    booking: {
      id: "b1",
      status: "completed",
      student_id: "student-1",
      teacher_id: "teacher-1",
      teacher_offer_id: "offer-1",
      planned_package_order_id: "order-1",
      planned_package_session_index: 1,
      booking_source: "planned_package",
      price_cents: 5000,
    },
    teacher: {
      ...readyTeacher,
      stripe_connect_payouts_enabled: false,
    },
    cancellationOpen: false,
    refundQuoteStatus: null,
    refundExecuted: false,
  });
  assert.ok(result.blockers.includes("teacher_payment_not_ready"));
});

test("ledger flag OFF blocks sync", async () => {
  resetFlags();
  const result = await syncPlannedPackagePayoutEligibilityForOrder({
    admin: {} as never,
    orderId: "order-1",
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, "payout_eligibility_disabled");
});

test("reconciliation marks completed session missing payout eligibility", () => {
  const r = reconcilePlannedPackageOrder({
    orderId: "o1",
    status: "fulfilled",
    sessionCount: 2,
    priceCentsSnapshot: 10000,
    currencySnapshot: "CAD",
    holdExpiresAt: null,
    paymentConfirmedAt: "2026-01-01",
    paidAt: "2026-01-01",
    fulfilledAt: "2026-01-02",
    fulfillmentError: null,
    stripeCheckoutSessionId: "cs_1",
    stripePaymentIntentId: "pi_1",
    stripeCheckoutStatus: "complete",
    stripeAmountReceivedCents: 10000,
    stripeCurrency: "CAD",
    lastWebhookReceivedAt: "2026-01-01",
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
      { id: "b1", sessionIndex: 1, status: "completed" },
      { id: "b2", sessionIndex: 2, status: "confirmed" },
    ],
    payoutEligibility: {
      ledgerEnabled: true,
      entries: [],
    },
  });
  assert.ok(r.attentionReasons.includes("completed_session_missing_payout_eligibility"));
});

test("reconciliation marks payout eligibility admin review", () => {
  const r = reconcilePlannedPackageOrder({
    orderId: "o1",
    status: "fulfilled",
    sessionCount: 1,
    priceCentsSnapshot: 5000,
    currencySnapshot: "CAD",
    holdExpiresAt: null,
    paymentConfirmedAt: "2026-01-01",
    paidAt: "2026-01-01",
    fulfilledAt: "2026-01-02",
    fulfillmentError: null,
    stripeCheckoutSessionId: "cs_1",
    stripePaymentIntentId: "pi_1",
    stripeCheckoutStatus: "complete",
    stripeAmountReceivedCents: 5000,
    stripeCurrency: "CAD",
    lastWebhookReceivedAt: "2026-01-01",
    refundStatus: null,
    refundedCents: 0,
    latestQuoteStatus: null,
    latestExecutionStatus: null,
    packageTransferDetected: false,
    holds: [{ status: "converted", sessionIndex: 1 }],
    bookings: [{ id: "b1", sessionIndex: 1, status: "completed" }],
    payoutEligibility: {
      ledgerEnabled: true,
      entries: [
        {
          bookingId: "b1",
          status: "admin_review_required",
          blockers: ["payout_pricing_policy_not_finalized"],
          adminReviewRequired: true,
          id: "pe-review",
          teacherNetCents: null,
          transferStatus: null,
          stripeTransferId: null,
          transferredCents: 0,
        },
      ],
    },
  });
  assert.ok(r.attentionReasons.includes("payout_eligibility_admin_review_required"));
  assert.ok(r.attentionReasons.includes("payout_pricing_policy_not_finalized"));
});

test("admin readiness shows payout eligibility layer", () => {
  resetFlags();
  const readiness = getPackageLaunchReadiness();
  assert.equal(readiness.checks.plannedPackagePayoutEligibilityLedgerPresent, true);
  assert.equal(readiness.checks.plannedPackagePayoutEligibilityNoStripeTransfer, true);
  assert.equal(readiness.checks.plannedPackagePayoutEligibilityNoPayoutRelease, true);
  assert.equal(readiness.checks.progressivePayoutNotImplemented, true);
  assert.equal(readiness.checks.legalReviewMarkedRequired, true);
});

test("admin detail page shows payout eligibility without transfer buttons", () => {
  const page = read("app/(app)/admin/planned-package-orders/[orderId]/page.tsx");
  assert.match(page, /plannedPackagePayoutEligibilitySectionTitle/);
  assert.match(page, /sync-payout-eligibility/);
  assert.match(page, /plannedPackagePayoutEligibilityNoStripeTransfer/);
  assert.match(page, /plannedPackagePayoutEligibilityDoesNotPayTeacher/);
  assert.doesNotMatch(page, /transfers\.create|Envoyer le versement|Payer le professeur/i);
});

test("docs describe eligibility-only scope", () => {
  const doc = read("docs/product/package-payout-eligibility-ledger.md");
  assert.match(doc, /eligible to be paid later/i);
  assert.match(doc, /Send money now/i);
  assert.match(doc, /stripe\.transfers\.create/);
  assert.match(doc, /legal review/i);
});

test("completeBooking payout path unchanged by payout eligibility module", () => {
  const complete = read("lib/bookings/completeBooking.ts");
  assert.doesNotMatch(complete, /plannedPackagePayoutEligibility/);
});

test("unsafe copy guard — no guaranteed automatic teacher payment wording in payout UI keys", () => {
  for (const locale of ["fr", "en", "es"]) {
    const json = read(`lib/i18n/locales/${locale}.json`);
    assert.doesNotMatch(json, /Professeur payé immédiatement|Paiement automatique garanti|Forfait Pratiqo/i);
  }
});
