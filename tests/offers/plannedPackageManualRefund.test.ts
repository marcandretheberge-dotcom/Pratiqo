/**
 * Planned package manual refund execution — admin-only Stripe refund for approved quotes.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  buildPlannedPackageRefundIdempotencyKey,
  canExecutePlannedPackageRefundInCurrentEnvironment,
  executeApprovedPlannedPackageRefund,
  type StripeRefundsClient,
} from "@/lib/offers/plannedPackageManualRefund";
import {
  canUsePlannedPackageManualRefunds,
  isPlannedPackageManualRefundsEnabled,
} from "@/lib/offers/plannedPackageManualRefunds";
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
  delete process.env.ENABLE_PLANNED_PACKAGE_REFUND_QUOTES;
  delete process.env.ENABLE_PLANNED_PACKAGE_REFUND_ADMIN_REVIEW;
  delete process.env.ENABLE_PLANNED_PACKAGE_MANUAL_REFUNDS;
  delete process.env.PACKAGE_LEGAL_REVIEW_COMPLETED;
  Reflect.deleteProperty(process.env, "NODE_ENV");
  delete process.env.VERCEL_ENV;
}

function enableManualRefundChain() {
  process.env.ENABLE_PLANNED_PACKAGES = "true";
  process.env.ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS = "true";
  process.env.ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT = "true";
  process.env.ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS = "true";
  process.env.ENABLE_PLANNED_PACKAGE_FULFILLMENT_ENGINE = "true";
  process.env.ENABLE_PLANNED_PACKAGE_ADMIN_OPS = "true";
  process.env.ENABLE_PLANNED_PACKAGE_REFUND_QUOTES = "true";
  process.env.ENABLE_PLANNED_PACKAGE_REFUND_ADMIN_REVIEW = "true";
  process.env.ENABLE_PLANNED_PACKAGE_MANUAL_REFUNDS = "true";
}

test("manual refund flag defaults OFF", () => {
  resetFlags();
  assert.equal(isPlannedPackageManualRefundsEnabled(), false);
  assert.equal(canUsePlannedPackageManualRefunds(), false);
});

test("manual refunds require full refund quote chain", () => {
  resetFlags();
  process.env.ENABLE_PLANNED_PACKAGE_MANUAL_REFUNDS = "true";
  assert.equal(canUsePlannedPackageManualRefunds(), false);
  enableManualRefundChain();
  assert.equal(canUsePlannedPackageManualRefunds(), true);
});

test("production legal review missing blocks execution environment", () => {
  resetFlags();
  enableManualRefundChain();
  Reflect.set(process.env, "NODE_ENV", "production");
  assert.equal(canExecutePlannedPackageRefundInCurrentEnvironment(), false);
  process.env.PACKAGE_LEGAL_REVIEW_COMPLETED = "true";
  assert.equal(canExecutePlannedPackageRefundInCurrentEnvironment(), true);
});

test("migration 120 creates execution audit table without transfer reversal", () => {
  const mig = read("supabase/migrations/120_planned_package_refund_executions.sql");
  assert.match(mig, /planned_package_refund_executions/);
  assert.match(mig, /refund_status/);
  assert.match(mig, /idempotency_key/);
  assert.match(mig, /ENABLE ROW LEVEL SECURITY/);
  assert.doesNotMatch(mig, /transfers\.createReversal|transfer_reversal/i);
});

test("execute API requires admin auth and manual refund flag", () => {
  const route = read(
    "app/api/admin/planned-package-orders/[orderId]/refund-quotes/[quoteId]/execute/route.ts",
  );
  assert.match(route, /requireAdminApi/);
  assert.match(route, /confirm.*REFUND/);
  assert.match(route, /adminExecutePlannedPackageManualRefund/);
  assert.match(route, /noTransferReversalExecuted/);
  assert.doesNotMatch(route, /transfers\.createReversal/);
});

test("manual refund module calls stripe refunds.create not transfers", () => {
  const src = read("lib/offers/plannedPackageManualRefund.ts");
  assert.match(src, /refunds\.create/);
  assert.match(src, /idempotencyKey/);
  assert.match(src, /planned_package_order_id/);
  assert.match(src, /refund_quote_id/);
  assert.doesNotMatch(src, /transfers\.create/);
  assert.doesNotMatch(src, /createReversal/);
  assert.doesNotMatch(src, /payouts\.create/);
});

test("stable idempotency key used", () => {
  assert.equal(
    buildPlannedPackageRefundIdempotencyKey("quote-abc"),
    "planned-package-refund-quote-abc",
  );
});

test("manual refund flag OFF blocks execute helper", async () => {
  resetFlags();
  const result = await executeApprovedPlannedPackageRefund({
    admin: {} as never,
    refundQuoteId: "q1",
    adminUserId: "admin-1",
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, "manual_refunds_disabled");
});

test("reconciliation marks approved_refund_not_executed", () => {
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
    latestQuoteStatus: "approved_for_manual_refund",
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
  assert.ok(r.attentionReasons.includes("approved_refund_not_executed"));
});

test("reconciliation marks transfer_reversal_required", () => {
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
    bookings: [{ id: "b1", sessionIndex: 1 }],
  });
  assert.ok(r.attentionReasons.includes("transfer_reversal_required"));
});

test("admin readiness shows manual refund execution layer", () => {
  resetFlags();
  const readiness = getPackageLaunchReadiness();
  assert.equal(readiness.checks.plannedPackageManualRefundExecutionPresent, true);
  assert.equal(readiness.checks.plannedPackageManualRefundNoTransferReversal, true);
  assert.equal(readiness.checks.plannedPackageManualRefundNoPayoutRelease, true);
});

test("admin detail page requires confirmation for Stripe refund", () => {
  const page = read("app/(app)/admin/planned-package-orders/[orderId]/page.tsx");
  assert.match(page, /plannedPackageManualRefundExecuteStripe/);
  assert.match(page, /REFUND/);
  assert.match(page, /plannedPackageManualRefundConfirmAcknowledge/);
  assert.match(page, /refund-quotes/);
  assert.doesNotMatch(page, /transfers\.createReversal/);
});

test("docs describe admin-only manual execution scope", () => {
  const doc = read("docs/product/package-manual-refund-execution.md");
  assert.match(doc, /admin-only/i);
  assert.match(doc, /approved_for_manual_refund/);
  assert.match(doc, /idempotency/i);
  assert.match(doc, /Transfer reversal/i);
});

test("execute helper calls Stripe with exact approved amount via mock", async () => {
  resetFlags();
  enableManualRefundChain();
  process.env.PACKAGE_LEGAL_REVIEW_COMPLETED = "true";

  const quoteId = "quote-1";
  const orderId = "order-1";
  const amountCents = 10000;

  const stripeCalls: unknown[] = [];
  const stripeClient: StripeRefundsClient = {
    refunds: {
      create: async (params, options) => {
        stripeCalls.push({ params, options });
        return {
          id: "re_test_1",
          charge: "ch_test_1",
          amount: params.amount ?? 0,
          currency: "cad",
        } as never;
      },
    },
  };

  type Row = Record<string, unknown>;
  const tables: Record<string, Row[]> = {
    planned_package_refund_quotes: [
      {
        id: quoteId,
        planned_package_order_id: orderId,
        cancellation_request_id: "req-1",
        quote_status: "approved_for_manual_refund",
        estimated_refund_cents: amountCents,
        currency: "CAD",
        policy_version: "planned-package-refund-v1-draft-2026",
        package_total_cents: 10000,
        completed_session_count: 0,
        undelivered_session_count: 2,
        total_session_count: 2,
      },
    ],
    planned_package_pending_orders: [
      {
        id: orderId,
        status: "fulfilled",
        session_count: 2,
        price_cents_snapshot: 10000,
        currency_snapshot: "CAD",
        payment_confirmed_at: "2026-01-01",
        paid_at: "2026-01-01",
        stripe_payment_intent_id: "pi_test_1",
        refund_status: null,
        refunded_cents: 0,
      },
    ],
    bookings: [
      {
        id: "b1",
        status: "confirmed",
        lesson_date: "2026-09-01",
        time_slot: "10:00",
        planned_package_session_index: 1,
        planned_package_order_id: orderId,
      },
      {
        id: "b2",
        status: "confirmed",
        lesson_date: "2026-09-08",
        time_slot: "10:00",
        planned_package_session_index: 2,
        planned_package_order_id: orderId,
      },
    ],
    booking_payments: [],
    planned_package_refund_executions: [],
  };

  function chain(table: string, rows: Row[]) {
    let filtered = [...rows];
    const result = () => ({ data: table === "bookings" ? filtered : filtered[0] ?? null, error: null });
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
        const id = `exec-${tables.planned_package_refund_executions.length + 1}`;
        const inserted = {
          ...row,
          id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        tables.planned_package_refund_executions.push(inserted);
        return {
          select: () => ({
            single: async () => ({ data: inserted, error: null }),
          }),
        };
      },
      update: (patch: Row) => ({
        eq: (col: string, val: unknown) => {
          const idx = tables.planned_package_refund_executions.findIndex((r) => r[col] === val);
          if (idx >= 0) {
            tables.planned_package_refund_executions[idx] = {
              ...tables.planned_package_refund_executions[idx],
              ...patch,
            };
            const row = tables.planned_package_refund_executions[idx];
            return { select: () => ({ single: async () => ({ data: row, error: null }) }) };
          }
          const oidx = tables.planned_package_pending_orders.findIndex((r) => r[col] === val);
          if (oidx >= 0) {
            tables.planned_package_pending_orders[oidx] = {
              ...tables.planned_package_pending_orders[oidx],
              ...patch,
            };
          }
          return { select: () => ({ single: async () => ({ data: null, error: null }) }) };
        },
      }),
      then(onFulfilled: (v: { data: unknown; error: null }) => unknown) {
        const data = table === "bookings" ? filtered : filtered;
        return Promise.resolve(onFulfilled({ data, error: null }));
      },
    };
    return api;
  }

  const admin = {
    from(table: string) {
      return chain(table, tables[table] ?? []);
    },
  };

  const first = await executeApprovedPlannedPackageRefund({
    admin: admin as never,
    refundQuoteId: quoteId,
    adminUserId: "admin-user-1",
    stripeClient,
  });

  assert.equal(first.ok, true);
  if (first.ok) {
    assert.equal(first.execution.status, "succeeded");
    assert.equal(first.execution.stripe_refund_id, "re_test_1");
    assert.equal(first.reusedExisting, false);
  }
  assert.equal(stripeCalls.length, 1);
  const call = stripeCalls[0] as { params: { amount: number }; options: { idempotencyKey: string } };
  assert.equal(call.params.amount, amountCents);
  assert.equal(call.options.idempotencyKey, buildPlannedPackageRefundIdempotencyKey(quoteId));

  const second = await executeApprovedPlannedPackageRefund({
    admin: admin as never,
    refundQuoteId: quoteId,
    adminUserId: "admin-user-1",
    stripeClient,
  });
  assert.equal(second.ok, true);
  if (second.ok) assert.equal(second.reusedExisting, true);
  assert.equal(stripeCalls.length, 1);
});
