/**
 * Planned package manual transfer execution — admin-only Stripe Connect transfer.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  buildPlannedPackageTransferIdempotencyKey,
  canExecutePlannedPackageTransferInCurrentEnvironment,
  executeApprovedPlannedPackageTransfer,
  type StripeTransfersClient,
} from "@/lib/offers/plannedPackageManualTransfer";
import {
  canUsePlannedPackageManualTransfers,
  isPlannedPackageManualTransfersEnabled,
} from "@/lib/offers/plannedPackageManualTransfers";
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
  delete process.env.ENABLE_PLANNED_PACKAGE_MANUAL_TRANSFERS;
  delete process.env.PACKAGE_LEGAL_REVIEW_COMPLETED;
  delete process.env.NODE_ENV;
  delete process.env.VERCEL_ENV;
}

function enableManualTransferChain() {
  process.env.ENABLE_PLANNED_PACKAGES = "true";
  process.env.ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS = "true";
  process.env.ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT = "true";
  process.env.ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS = "true";
  process.env.ENABLE_PLANNED_PACKAGE_FULFILLMENT_ENGINE = "true";
  process.env.ENABLE_PLANNED_PACKAGE_ADMIN_OPS = "true";
  process.env.ENABLE_PLANNED_PACKAGE_PAYOUT_ELIGIBILITY_LEDGER = "true";
  process.env.ENABLE_PLANNED_PACKAGE_PAYOUT_ADMIN_VIEW = "true";
  process.env.ENABLE_PLANNED_PACKAGE_MANUAL_TRANSFERS = "true";
}

test("manual transfer flag defaults OFF", () => {
  resetFlags();
  assert.equal(isPlannedPackageManualTransfersEnabled(), false);
  assert.equal(canUsePlannedPackageManualTransfers(), false);
});

test("manual transfers require full payout eligibility chain", () => {
  resetFlags();
  process.env.ENABLE_PLANNED_PACKAGE_MANUAL_TRANSFERS = "true";
  assert.equal(canUsePlannedPackageManualTransfers(), false);
  enableManualTransferChain();
  assert.equal(canUsePlannedPackageManualTransfers(), true);
});

test("production legal review missing blocks execution environment", () => {
  resetFlags();
  enableManualTransferChain();
  process.env.NODE_ENV = "production";
  assert.equal(canExecutePlannedPackageTransferInCurrentEnvironment(), false);
  process.env.PACKAGE_LEGAL_REVIEW_COMPLETED = "true";
  assert.equal(canExecutePlannedPackageTransferInCurrentEnvironment(), true);
});

test("migration 122 creates transfer execution audit table", () => {
  const mig = read("supabase/migrations/122_planned_package_transfer_executions.sql");
  assert.match(mig, /planned_package_transfer_executions/);
  assert.match(mig, /transfer_status/);
  assert.match(mig, /idempotency_key/);
  assert.match(mig, /ENABLE ROW LEVEL SECURITY/);
  assert.doesNotMatch(mig, /transfers\.createReversal|payouts\.create|refunds\.create/i);
});

test("execute API requires admin auth and manual transfer flag", () => {
  const route = read(
    "app/api/admin/planned-package-orders/[orderId]/payout-eligibility/[entryId]/execute-transfer/route.ts",
  );
  assert.match(route, /requireAdminApi/);
  assert.match(route, /confirm.*TRANSFER/);
  assert.match(route, /adminExecutePlannedPackageManualTransfer/);
  assert.match(route, /noTransferReversalExecuted/);
  assert.match(route, /noStripeRefundExecuted/);
  assert.doesNotMatch(route, /transfers\.createReversal|refunds\.create|payouts\.create/);
});

test("manual transfer module calls stripe transfers.create not refunds or payouts", () => {
  const src = read("lib/offers/plannedPackageManualTransfer.ts");
  assert.match(src, /transfers\.create/);
  assert.match(src, /teacher_net_cents/);
  assert.match(src, /transfer_group/);
  assert.match(src, /idempotencyKey/);
  assert.match(src, /payout_eligibility_entry_id/);
  assert.doesNotMatch(src, /refunds\.create/);
  assert.doesNotMatch(src, /createReversal/);
  assert.doesNotMatch(src, /payouts\.create/);
});

test("stable idempotency key used", () => {
  assert.equal(
    buildPlannedPackageTransferIdempotencyKey("entry-abc"),
    "planned-package-transfer-entry-abc",
  );
});

test("manual transfer flag OFF blocks execute helper", async () => {
  resetFlags();
  const result = await executeApprovedPlannedPackageTransfer({
    admin: {} as never,
    payoutEligibilityEntryId: "e1",
    adminUserId: "admin-1",
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, "manual_transfers_disabled");
});

test("reconciliation marks eligible_transfer_not_executed when manual transfers ON", () => {
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
      manualTransfersEnabled: true,
      entries: [
        {
          id: "pe1",
          bookingId: "b1",
          status: "eligible",
          blockers: [],
          adminReviewRequired: false,
          teacherNetCents: 4000,
          transferStatus: null,
          transferredCents: 0,
          latestTransferExecutionStatus: null,
        },
      ],
    },
    transferExecutions: {
      manualTransfersEnabled: true,
      manualTransferReversalsEnabled: false,
      latestExecutionStatus: null,
      latestReversalStatus: null,
      cancellationOpen: false,
      refundExecuted: false,
      refundApproved: false,
      entries: [],
    },
  });
  assert.ok(r.attentionReasons.includes("eligible_transfer_not_executed"));
});

test("reconciliation marks transfer_execution_failed", () => {
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
      manualTransfersEnabled: true,
      entries: [
        {
          id: "pe1",
          bookingId: "b1",
          status: "eligible",
          blockers: [],
          adminReviewRequired: false,
          teacherNetCents: 4000,
          transferStatus: "failed",
          transferredCents: 0,
          latestTransferExecutionStatus: "failed",
        },
      ],
    },
    transferExecutions: {
      manualTransfersEnabled: true,
      manualTransferReversalsEnabled: false,
      latestExecutionStatus: "failed",
      latestReversalStatus: null,
      cancellationOpen: false,
      refundExecuted: false,
      refundApproved: false,
      entries: [
        {
          entryId: "pe1",
          transferExecutionId: "tx1",
          status: "failed",
          amountCents: 4000,
          teacherNetCents: 4000,
          reversedCents: 0,
          reversalStatus: "failed",
          remainingReversibleCents: 4000,
          latestReversalStatus: null,
        },
      ],
    },
  });
  assert.ok(r.attentionReasons.includes("transfer_execution_failed"));
});

test("admin readiness shows manual transfer execution layer", () => {
  resetFlags();
  const readiness = getPackageLaunchReadiness();
  assert.equal(readiness.checks.plannedPackageManualTransferExecutionPresent, true);
  assert.equal(readiness.checks.plannedPackageManualTransferNoTransferReversal, true);
  assert.equal(readiness.checks.plannedPackageManualTransferNoAutomaticPayoutCron, true);
  assert.equal(readiness.checks.plannedPackageManualTransferNoStripeRefund, true);
  assert.equal(readiness.checks.plannedPackageManualTransferNoStripePayout, true);
});

test("admin detail page requires confirmation for Stripe transfer", () => {
  const page = read("app/(app)/admin/planned-package-orders/[orderId]/page.tsx");
  assert.match(page, /plannedPackageManualTransferExecuteStripe/);
  assert.match(page, /TRANSFER/);
  assert.match(page, /plannedPackageManualTransferConfirmAcknowledge/);
  assert.match(page, /execute-transfer/);
  assert.doesNotMatch(page, /transfers\.createReversal|refunds\.create/);
});

test("docs describe admin-only manual transfer scope", () => {
  const doc = read("docs/product/package-manual-transfer-execution.md");
  assert.match(doc, /admin-only/i);
  assert.match(doc, /teacher_net_cents/);
  assert.match(doc, /idempotency/i);
  assert.match(doc, /not\*\* automatic payout|Automatic payout release/i);
  assert.match(doc, /transfer reversal/i);
});

test("execute helper calls Stripe with exact teacher_net_cents via mock", async () => {
  resetFlags();
  enableManualTransferChain();
  process.env.PACKAGE_LEGAL_REVIEW_COMPLETED = "true";
  delete process.env.NODE_ENV;

  const entryId = "entry-1";
  const orderId = "order-1";
  const bookingId = "booking-1";
  const teacherNetCents = 4200;

  const stripeCalls: unknown[] = [];
  const stripeClient: StripeTransfersClient = {
    transfers: {
      create: async (params, options) => {
        stripeCalls.push({ params, options });
        return {
          id: "tr_test_1",
          amount: params.amount ?? 0,
          currency: "cad",
          destination: params.destination,
        } as never;
      },
    },
  };

  type Row = Record<string, unknown>;
  const tables: Record<string, Row[]> = {
    planned_package_payout_eligibility_entries: [
      {
        id: entryId,
        planned_package_order_id: orderId,
        booking_id: bookingId,
        teacher_id: "teacher-1",
        student_id: "student-1",
        teacher_offer_id: "offer-1",
        status: "eligible",
        teacher_net_cents: teacherNetCents,
        currency: "CAD",
        package_session_index: 1,
        transfer_status: null,
        stripe_transfer_id: null,
        transferred_cents: 0,
      },
    ],
    planned_package_pending_orders: [
      {
        id: orderId,
        status: "fulfilled",
        student_id: "student-1",
        teacher_id: "teacher-1",
        teacher_offer_id: "offer-1",
        session_count: 2,
        price_cents_snapshot: 10000,
        currency_snapshot: "CAD",
        payment_confirmed_at: "2026-01-01",
        paid_at: "2026-01-01",
        stripe_payment_intent_id: "pi_test_1",
        refund_status: null,
      },
    ],
    bookings: [
      {
        id: bookingId,
        status: "completed",
        student_id: "student-1",
        teacher_id: "teacher-1",
        teacher_offer_id: "offer-1",
        planned_package_order_id: orderId,
        planned_package_session_index: 1,
        booking_source: "planned_package",
        price_cents: 5000,
      },
    ],
    teachers: [
      {
        id: "teacher-1",
        stripe_account_id: "acct_test_1",
        stripe_connect_charges_enabled: true,
        stripe_connect_payouts_enabled: true,
        stripe_connect_onboarding_complete: true,
        stripe_connect_requirements_due: false,
        stripe_connect_disabled_reason: null,
      },
    ],
    planned_package_cancellation_requests: [],
    planned_package_refund_quotes: [],
    planned_package_refund_executions: [],
    planned_package_transfer_executions: [],
  };

  function chain(table: string, rows: Row[]) {
    let filtered = [...rows];
    const api: Record<string, unknown> = {
      select: () => api,
      eq: (col: string, val: unknown) => {
        filtered = filtered.filter((r) => r[col] === val);
        return api;
      },
      neq: (col: string, val: unknown) => {
        filtered = filtered.filter((r) => r[col] !== val);
        return api;
      },
      in: (col: string, vals: unknown[]) => {
        filtered = filtered.filter((r) => vals.includes(r[col]));
        return api;
      },
      order: () => api,
      limit: () => api,
      maybeSingle: async () => ({ data: filtered[0] ?? null, error: null }),
      single: async () => {
        if (!filtered[0]) return { data: null, error: { message: "missing" } };
        return { data: filtered[0], error: null };
      },
      insert: (row: Row) => {
        const id = `exec-${tables.planned_package_transfer_executions.length + 1}`;
        const inserted = {
          ...row,
          id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        tables.planned_package_transfer_executions.push(inserted);
        return {
          select: () => ({
            single: async () => ({ data: inserted, error: null }),
          }),
        };
      },
      update: (patch: Row) => ({
        eq: (col: string, val: unknown) => {
          const tidx = tables.planned_package_transfer_executions.findIndex((r) => r[col] === val);
          if (tidx >= 0) {
            tables.planned_package_transfer_executions[tidx] = {
              ...tables.planned_package_transfer_executions[tidx],
              ...patch,
            };
            const row = tables.planned_package_transfer_executions[tidx];
            return { select: () => ({ single: async () => ({ data: row, error: null }) }) };
          }
          const eidx = tables.planned_package_payout_eligibility_entries.findIndex(
            (r) => r[col] === val,
          );
          if (eidx >= 0) {
            tables.planned_package_payout_eligibility_entries[eidx] = {
              ...tables.planned_package_payout_eligibility_entries[eidx],
              ...patch,
            };
          }
          return { select: () => ({ single: async () => ({ data: null, error: null }) }) };
        },
      }),
    };
    return api;
  }

  const admin = {
    from(table: string) {
      return chain(table, tables[table] ?? []);
    },
  };

  const first = await executeApprovedPlannedPackageTransfer({
    admin: admin as never,
    payoutEligibilityEntryId: entryId,
    adminUserId: "admin-user-1",
    stripeClient,
  });

  if (!first.ok) {
    assert.fail(`expected success got ${JSON.stringify(first)}`);
  }
  assert.equal(first.ok, true);
  if (first.ok) {
    assert.equal(first.execution.status, "succeeded");
    assert.equal(first.execution.stripe_transfer_id, "tr_test_1");
    assert.equal(first.reusedExisting, false);
  }
  assert.equal(stripeCalls.length, 1);
  const call = stripeCalls[0] as {
    params: { amount: number; destination: string; transfer_group: string; metadata: Record<string, string> };
    options: { idempotencyKey: string };
  };
  assert.equal(call.params.amount, teacherNetCents);
  assert.equal(call.params.destination, "acct_test_1");
  assert.match(call.params.transfer_group, /planned_package_order/);
  assert.equal(call.params.metadata.payout_eligibility_entry_id, entryId);
  assert.equal(call.options.idempotencyKey, buildPlannedPackageTransferIdempotencyKey(entryId));

  const second = await executeApprovedPlannedPackageTransfer({
    admin: admin as never,
    payoutEligibilityEntryId: entryId,
    adminUserId: "admin-user-1",
    stripeClient,
  });
  assert.equal(second.ok, true);
  if (second.ok) assert.equal(second.reusedExisting, true);
  assert.equal(stripeCalls.length, 1);
});

test("missing teacher_net_cents rejected", async () => {
  resetFlags();
  enableManualTransferChain();
  process.env.PACKAGE_LEGAL_REVIEW_COMPLETED = "true";

  type Row = Record<string, unknown>;
  const admin = {
    from(table: string) {
      if (table === "planned_package_payout_eligibility_entries") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "e1",
                  status: "eligible",
                  teacher_net_cents: null,
                  planned_package_order_id: "o1",
                  booking_id: "b1",
                  currency: "CAD",
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "planned_package_transfer_executions") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
    },
  };

  const result = await executeApprovedPlannedPackageTransfer({
    admin: admin as never,
    payoutEligibilityEntryId: "e1",
    adminUserId: "admin-1",
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, "payout_pricing_policy_not_finalized");
});

test("non-eligible entry rejected", async () => {
  resetFlags();
  enableManualTransferChain();
  process.env.PACKAGE_LEGAL_REVIEW_COMPLETED = "true";

  const admin = {
    from(table: string) {
      if (table === "planned_package_payout_eligibility_entries") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "e1",
                  status: "not_eligible",
                  teacher_net_cents: 1000,
                  planned_package_order_id: "o1",
                  booking_id: "b1",
                  currency: "CAD",
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
          }),
        }),
      };
    },
  };

  const result = await executeApprovedPlannedPackageTransfer({
    admin: admin as never,
    payoutEligibilityEntryId: "e1",
    adminUserId: "admin-1",
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, "eligibility_entry_not_eligible");
});
