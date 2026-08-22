/**
 * Planned package manual transfer reversal — admin-only Stripe Connect reversal.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  buildPlannedPackageTransferReversalIdempotencyKey,
  calculateRemainingReversibleTransferAmount,
  canExecutePlannedPackageTransferReversalInCurrentEnvironment,
  executePlannedPackageTransferReversal,
  packageOrderHasUnreversedPlannedPackageTransfer,
  type StripeTransferReversalsClient,
} from "@/lib/offers/plannedPackageTransferReversal";
import {
  canUsePlannedPackageManualTransferReversals,
  isPlannedPackageManualTransferReversalsEnabled,
} from "@/lib/offers/plannedPackageManualTransferReversals";
import { packageOrderHasTeacherTransfer } from "@/lib/offers/plannedPackageManualRefund";
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
  delete process.env.ENABLE_PLANNED_PACKAGE_MANUAL_TRANSFER_REVERSALS;
  delete process.env.PACKAGE_LEGAL_REVIEW_COMPLETED;
  delete process.env.NODE_ENV;
}

function enableReversalChain() {
  process.env.ENABLE_PLANNED_PACKAGES = "true";
  process.env.ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS = "true";
  process.env.ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT = "true";
  process.env.ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS = "true";
  process.env.ENABLE_PLANNED_PACKAGE_FULFILLMENT_ENGINE = "true";
  process.env.ENABLE_PLANNED_PACKAGE_ADMIN_OPS = "true";
  process.env.ENABLE_PLANNED_PACKAGE_PAYOUT_ELIGIBILITY_LEDGER = "true";
  process.env.ENABLE_PLANNED_PACKAGE_PAYOUT_ADMIN_VIEW = "true";
  process.env.ENABLE_PLANNED_PACKAGE_MANUAL_TRANSFERS = "true";
  process.env.ENABLE_PLANNED_PACKAGE_MANUAL_TRANSFER_REVERSALS = "true";
}

test("manual transfer reversal flag defaults OFF", () => {
  resetFlags();
  assert.equal(isPlannedPackageManualTransferReversalsEnabled(), false);
  assert.equal(canUsePlannedPackageManualTransferReversals(), false);
});

test("manual transfer reversals require manual transfer chain", () => {
  resetFlags();
  process.env.ENABLE_PLANNED_PACKAGE_MANUAL_TRANSFER_REVERSALS = "true";
  assert.equal(canUsePlannedPackageManualTransferReversals(), false);
  enableReversalChain();
  assert.equal(canUsePlannedPackageManualTransferReversals(), true);
});

test("remaining reversible amount helper", () => {
  assert.equal(
    calculateRemainingReversibleTransferAmount({ transferAmountCents: 5000, reversedCents: 2000 }),
    3000,
  );
  assert.equal(
    calculateRemainingReversibleTransferAmount({ transferAmountCents: 5000, reversedCents: 5000 }),
    0,
  );
});

test("migration 123 creates reversal audit table", () => {
  const mig = read("supabase/migrations/123_planned_package_transfer_reversal_executions.sql");
  assert.match(mig, /planned_package_transfer_reversal_executions/);
  assert.match(mig, /reversed_cents/);
  assert.match(mig, /idempotency_key/);
  assert.match(mig, /ENABLE ROW LEVEL SECURITY/);
  assert.doesNotMatch(mig, /transfers\.create\b|refunds\.create|payouts\.create/i);
});

test("reverse API requires admin auth and confirmation", () => {
  const route = read(
    "app/api/admin/planned-package-orders/[orderId]/transfer-executions/[transferExecutionId]/reverse/route.ts",
  );
  assert.match(route, /requireAdminApi/);
  assert.match(route, /confirm.*REVERSE/);
  assert.match(route, /adminExecutePlannedPackageTransferReversal/);
  assert.match(route, /noStripeRefundExecuted/);
  assert.doesNotMatch(route, /transfers\.create\b|refunds\.create|payouts\.create/);
});

test("reversal module calls stripe createReversal not create or refunds", () => {
  const src = read("lib/offers/plannedPackageTransferReversal.ts");
  assert.match(src, /createReversal/);
  assert.match(src, /idempotencyKey/);
  assert.match(src, /transfer_execution_id/);
  assert.doesNotMatch(src, /transfers\.create\b/);
  assert.doesNotMatch(src, /refunds\.create/);
  assert.doesNotMatch(src, /payouts\.create/);
});

test("stable idempotency key used", () => {
  assert.equal(
    buildPlannedPackageTransferReversalIdempotencyKey({
      transferExecutionId: "tx-1",
      amountCents: 4200,
      reversalReason: "refund_required",
    }),
    "planned-package-transfer-reversal-tx-1-4200-refund_required",
  );
});

test("reversal flag OFF blocks execute helper", async () => {
  resetFlags();
  const result = await executePlannedPackageTransferReversal({
    admin: {} as never,
    transferExecutionId: "tx-1",
    reversalReason: "refund_required",
    adminUserId: "admin-1",
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, "manual_transfer_reversals_disabled");
});

test("reconciliation marks refund_waiting_on_transfer_reversal", () => {
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
    latestQuoteStatus: "approved_for_manual_refund",
    latestExecutionStatus: null,
    packageTransferDetected: true,
    holds: [{ status: "converted", sessionIndex: 1 }],
    bookings: [{ id: "b1", sessionIndex: 1, status: "completed" }],
    payoutEligibility: { ledgerEnabled: true, manualTransfersEnabled: true, entries: [] },
    transferExecutions: {
      manualTransfersEnabled: true,
      manualTransferReversalsEnabled: true,
      latestExecutionStatus: "succeeded",
      latestReversalStatus: null,
      cancellationOpen: false,
      refundExecuted: false,
      refundApproved: true,
      entries: [
        {
          entryId: "pe1",
          transferExecutionId: "tx1",
          status: "succeeded",
          amountCents: 4000,
          teacherNetCents: 4000,
          reversedCents: 0,
          reversalStatus: null,
          remainingReversibleCents: 4000,
          latestReversalStatus: null,
        },
      ],
    },
  });
  assert.ok(r.attentionReasons.includes("refund_waiting_on_transfer_reversal"));
});

test("admin readiness shows transfer reversal layer", () => {
  resetFlags();
  const readiness = getPackageLaunchReadiness();
  assert.equal(readiness.checks.plannedPackageManualTransferReversalExecutionPresent, true);
  assert.equal(readiness.checks.plannedPackageManualTransferReversalNoAutomaticRefund, true);
  assert.equal(readiness.checks.plannedPackageManualTransferReversalNoNewTransfer, true);
});

test("execute helper calls Stripe createReversal via mock", async () => {
  resetFlags();
  enableReversalChain();
  process.env.PACKAGE_LEGAL_REVIEW_COMPLETED = "true";
  delete process.env.NODE_ENV;

  const transferExecutionId = "tx-1";
  const orderId = "order-1";
  const amountCents = 4200;

  const stripeCalls: unknown[] = [];
  const stripeClient: StripeTransferReversalsClient = {
    transfers: {
      createReversal: async (transferId, params, options) => {
        stripeCalls.push({ transferId, params, options });
        return { id: "trr_test_1", amount: params.amount ?? 0, currency: "cad" } as never;
      },
    },
  };

  type Row = Record<string, unknown>;
  const tables: Record<string, Row[]> = {
    planned_package_transfer_executions: [
      {
        id: transferExecutionId,
        planned_package_order_id: orderId,
        payout_eligibility_entry_id: "entry-1",
        booking_id: "booking-1",
        teacher_id: "teacher-1",
        student_id: "student-1",
        teacher_offer_id: "offer-1",
        status: "succeeded",
        amount_cents: amountCents,
        currency: "CAD",
        stripe_transfer_id: "tr_test_1",
        reversed_cents: 0,
        reversal_status: null,
        package_session_index: 1,
      },
    ],
    planned_package_transfer_reversal_executions: [],
    planned_package_payout_eligibility_entries: [
      { id: "entry-1", package_session_index: 1 },
    ],
  };

  function chain(table: string, rows: Row[]) {
    let filtered = [...rows];
    const api: Record<string, unknown> = {
      select: () => api,
      eq: (col: string, val: unknown) => {
        filtered = filtered.filter((r) => r[col] === val);
        return api;
      },
      maybeSingle: async () => ({ data: filtered[0] ?? null, error: null }),
      single: async () => ({ data: filtered[0] ?? null, error: null }),
      insert: (row: Row) => {
        const id = `rev-${tables.planned_package_transfer_reversal_executions.length + 1}`;
        const inserted = { ...row, id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        tables.planned_package_transfer_reversal_executions.push(inserted);
        return { select: () => ({ single: async () => ({ data: inserted, error: null }) }) };
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
          const ridx = tables.planned_package_transfer_reversal_executions.findIndex((r) => r[col] === val);
          if (ridx >= 0) {
            tables.planned_package_transfer_reversal_executions[ridx] = {
              ...tables.planned_package_transfer_reversal_executions[ridx],
              ...patch,
            };
            const row = tables.planned_package_transfer_reversal_executions[ridx];
            return { select: () => ({ single: async () => ({ data: row, error: null }) }) };
          }
          const eidx = tables.planned_package_payout_eligibility_entries.findIndex((r) => r[col] === val);
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

  const admin = { from: (table: string) => chain(table, tables[table] ?? []) };

  const first = await executePlannedPackageTransferReversal({
    admin: admin as never,
    transferExecutionId,
    reversalReason: "refund_required",
    adminUserId: "admin-user-1",
    stripeClient,
  });

  assert.equal(first.ok, true);
  if (first.ok) {
    assert.equal(first.reversalExecution.status, "succeeded");
    assert.equal(first.reversalExecution.stripe_transfer_reversal_id, "trr_test_1");
  }
  assert.equal(stripeCalls.length, 1);
  const call = stripeCalls[0] as {
    transferId: string;
    params: { amount: number; metadata: Record<string, string> };
    options: { idempotencyKey: string };
  };
  assert.equal(call.transferId, "tr_test_1");
  assert.equal(call.params.amount, amountCents);
  assert.equal(call.params.metadata.transfer_execution_id, transferExecutionId);

  const second = await executePlannedPackageTransferReversal({
    admin: admin as never,
    transferExecutionId,
    reversalReason: "refund_required",
    adminUserId: "admin-user-1",
    stripeClient,
  });
  assert.equal(second.ok, false);
  if (!second.ok) assert.equal(second.error, "transfer_already_fully_reversed");
});

test("fully reversed transfer clears packageOrderHasTeacherTransfer blocker", async () => {
  type Row = Record<string, unknown>;
  const admin = {
    from(table: string) {
      if (table === "bookings") {
        return {
          select: () => ({
            eq: async () => ({ data: [{ id: "b1" }], error: null }),
          }),
        };
      }
      if (table === "booking_payments") {
        return {
          select: () => ({
            in: async () => ({ data: [], error: null }),
          }),
        };
      }
      if (table === "planned_package_transfer_executions") {
        return {
          select: () => ({
            eq: () => ({
              eq: async () => ({
                data: [{ amount_cents: 4000, reversed_cents: 4000, status: "succeeded" }],
                error: null,
              }),
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ eq: async () => ({ data: [], error: null }) }) }) };
    },
  };

  const unreversed = await packageOrderHasUnreversedPlannedPackageTransfer(admin as never, "order-1");
  assert.equal(unreversed, false);
  const blocked = await packageOrderHasTeacherTransfer(admin as never, "order-1");
  assert.equal(blocked, false);
});
