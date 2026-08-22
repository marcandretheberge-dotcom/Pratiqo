/**
 * Planned package E2E staging QA — diagnostics + lifecycle smoke (mocked, no live Stripe).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  getPlannedPackageE2eQaDiagnostics,
  PLANNED_PACKAGE_E2E_LIFECYCLE_TEST,
  PLANNED_PACKAGE_E2E_QA_RUNBOOK,
  PLANNED_PACKAGE_E2E_REQUIRED_MIGRATIONS,
  toSafePlannedPackageE2eQaDto,
} from "@/lib/offers/plannedPackageE2eQa";
import {
  canUsePlannedPackageE2eQaTools,
  isPlannedPackageE2eQaToolsEnabled,
} from "@/lib/offers/plannedPackageE2eQaTools";
import { getPackageLaunchReadiness } from "@/lib/offers/packageLaunchReadiness";
import { reconcilePlannedPackageOrder } from "@/lib/offers/plannedPackageReconciliation";
import { buildPlannedPackageTransferIdempotencyKey } from "@/lib/offers/plannedPackageManualTransfer";
import { buildPlannedPackageRefundIdempotencyKey } from "@/lib/offers/plannedPackageManualRefund";
import { buildPlannedPackageTransferReversalIdempotencyKey } from "@/lib/offers/plannedPackageTransferReversal";

const root = process.cwd();
function read(rel: string): string {
  return readFileSync(path.join(root, rel), "utf8");
}

function resetEnv() {
  delete process.env.ENABLE_PLANNED_PACKAGE_E2E_QA_TOOLS;
  delete process.env.PACKAGE_LEGAL_REVIEW_COMPLETED;
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.NODE_ENV;
  delete process.env.VERCEL_ENV;
  for (const name of [
    "ENABLE_PLANNED_PACKAGES",
    "ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS",
    "ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT",
    "ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS",
    "ENABLE_PLANNED_PACKAGE_FULFILLMENT_ENGINE",
    "ENABLE_PLANNED_PACKAGE_STRIPE_CHECKOUT",
    "ENABLE_PLANNED_PACKAGE_ADMIN_OPS",
    "ENABLE_PLANNED_PACKAGE_REFUND_QUOTES",
    "ENABLE_PLANNED_PACKAGE_REFUND_ADMIN_REVIEW",
    "ENABLE_PLANNED_PACKAGE_MANUAL_REFUNDS",
    "ENABLE_PLANNED_PACKAGE_PAYOUT_ELIGIBILITY_LEDGER",
    "ENABLE_PLANNED_PACKAGE_PAYOUT_ADMIN_VIEW",
    "ENABLE_PLANNED_PACKAGE_MANUAL_TRANSFERS",
    "ENABLE_PLANNED_PACKAGE_MANUAL_TRANSFER_REVERSALS",
  ]) {
    delete process.env[name];
  }
}

test("E2E QA tools flag defaults OFF", () => {
  resetEnv();
  assert.equal(isPlannedPackageE2eQaToolsEnabled(), false);
  assert.equal(canUsePlannedPackageE2eQaTools(), false);
});

test("E2E QA tools rejected in production even when flag ON", () => {
  resetEnv();
  process.env.ENABLE_PLANNED_PACKAGE_E2E_QA_TOOLS = "true";
  process.env.NODE_ENV = "production";
  assert.equal(isPlannedPackageE2eQaToolsEnabled(), true);
  assert.equal(canUsePlannedPackageE2eQaTools(), false);
});

test("runbook and lifecycle test artifacts exist", () => {
  assert.equal(existsSync(path.join(root, PLANNED_PACKAGE_E2E_QA_RUNBOOK)), true);
  assert.equal(existsSync(path.join(root, PLANNED_PACKAGE_E2E_LIFECYCLE_TEST)), true);
  const runbook = read(PLANNED_PACKAGE_E2E_QA_RUNBOOK);
  assert.match(runbook, /manual staging flow/i);
  assert.match(runbook, /transfer reversal/i);
  assert.match(runbook, /manual refund/i);
  assert.match(runbook, /Duplicate webhook/i);
  assert.match(runbook, /Automatic payout cron/i);
  assert.match(runbook, /Does \*\*not\*\* enable public package launch/i);
});

test("required package lifecycle migrations exist on disk", () => {
  for (const m of PLANNED_PACKAGE_E2E_REQUIRED_MIGRATIONS) {
    assert.equal(existsSync(path.join(root, m.file)), true, `missing ${m.file}`);
  }
});

test("diagnostics does not expose secrets", () => {
  resetEnv();
  process.env.ENABLE_PLANNED_PACKAGE_E2E_QA_TOOLS = "true";
  process.env.STRIPE_SECRET_KEY = "sk_test_SECRET_VALUE_SHOULD_NOT_LEAK";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_SECRET_VALUE_SHOULD_NOT_LEAK";
  delete process.env.NODE_ENV;

  const d = getPlannedPackageE2eQaDiagnostics();
  const safe = toSafePlannedPackageE2eQaDto(d);
  const json = JSON.stringify(safe);
  assert.equal(safe.noSecretsExposed, true);
  assert.doesNotMatch(json, /sk_test_SECRET|whsec_SECRET|SECRET_VALUE/);
  assert.equal(safe.stripeConfig.secretKey, "present");
  assert.equal(safe.stripeConfig.mode, "test");
  assert.equal(safe.webhookConfig.secret, "configured");
});

test("diagnostics detects missing Stripe webhook secret", () => {
  resetEnv();
  process.env.ENABLE_PLANNED_PACKAGE_E2E_QA_TOOLS = "true";
  process.env.STRIPE_SECRET_KEY = "sk_test_abc";
  delete process.env.STRIPE_WEBHOOK_SECRET;
  const d = getPlannedPackageE2eQaDiagnostics();
  assert.equal(d.webhookConfig.secret, "not_configured");
  assert.ok(d.blockers.some((b) => b.code === "stripe_webhook_secret_missing"));
});

test("diagnostics detects Stripe test mode requirement", () => {
  resetEnv();
  process.env.ENABLE_PLANNED_PACKAGE_E2E_QA_TOOLS = "true";
  process.env.STRIPE_SECRET_KEY = "sk_live_abc";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_x";
  delete process.env.NODE_ENV;
  const d = getPlannedPackageE2eQaDiagnostics();
  assert.equal(d.stripeConfig.mode, "live");
  assert.equal(d.stripeConfig.testModeOk, false);
  assert.ok(d.blockers.some((b) => b.code === "stripe_test_mode_required"));
});

test("diagnostics detects missing required flags", () => {
  resetEnv();
  process.env.ENABLE_PLANNED_PACKAGE_E2E_QA_TOOLS = "true";
  process.env.STRIPE_SECRET_KEY = "sk_test_abc";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_x";
  const d = getPlannedPackageE2eQaDiagnostics();
  assert.ok(d.blockers.some((b) => b.code.startsWith("missing_flag_")));
});

test("diagnostics detects public launch blocked when legal review missing", () => {
  resetEnv();
  delete process.env.PACKAGE_LEGAL_REVIEW_COMPLETED;
  const d = getPlannedPackageE2eQaDiagnostics();
  assert.equal(d.readinessChecks.publicLaunchBlocked, true);
  assert.equal(d.readinessChecks.legalReviewStillRequired, true);
  assert.ok(d.warnings.some((w) => /legal review/i.test(w)));
});

test("admin QA diagnostics API requires admin auth and gates tools", () => {
  const route = read("app/api/admin/planned-package-e2e-qa/route.ts");
  assert.match(route, /requireAdminApi/);
  assert.match(route, /canUsePlannedPackageE2eQaTools/);
  assert.match(route, /e2e_qa_tools_disabled/);
  assert.match(route, /e2e_qa_tools_rejected_in_production/);
  assert.match(route, /noMoneyMovement/);
  assert.doesNotMatch(route, /transfers\.create|refunds\.create|createReversal|payouts\.create/);
});

test("package launch readiness includes E2E QA section", () => {
  resetEnv();
  const readiness = getPackageLaunchReadiness();
  assert.equal(readiness.checks.plannedPackageE2eQaDocsPresent, true);
  assert.equal(readiness.checks.plannedPackageE2eQaDiagnosticsPresent, true);
  assert.equal(readiness.checks.plannedPackageE2eQaLifecycleSmokePresent, true);
  assert.equal(readiness.checks.plannedPackageE2eQaNoPublicLaunchByDefault, true);
  assert.equal(readiness.checks.plannedPackageE2eQaNoAutomaticPayoutCron, true);
  assert.equal(readiness.checks.plannedPackageE2eQaNoAutomaticRefundCron, true);
  assert.equal(readiness.checks.plannedPackageE2eQaNoAutomaticReversalCron, true);
  assert.equal(typeof readiness.flags.plannedPackageE2eQaTools, "boolean");

  const page = read("app/(app)/admin/package-launch-readiness/page.tsx");
  assert.match(page, /package-e2e-qa-section/);
  assert.match(page, /Lancement public toujours bloqué/);
  assert.match(page, /Aucun cron de versement automatique/);
});

test("no public launch flags enabled by default", () => {
  resetEnv();
  const readiness = getPackageLaunchReadiness();
  assert.equal(readiness.flags.packageEntitlements, false);
  assert.equal(readiness.checks.plannedPackagePublicPurchaseBlocked, true);
  assert.notEqual(readiness.status as string, "production_ready");
});

test("no automatic payout/refund/reversal cron added by E2E harness", () => {
  const e2e = read("lib/offers/plannedPackageE2eQa.ts");
  const tools = read("lib/offers/plannedPackageE2eQaTools.ts");
  const route = read("app/api/admin/planned-package-e2e-qa/route.ts");
  for (const src of [e2e, tools, route]) {
    assert.doesNotMatch(src, /cron\/payout|automatic.?payout|setInterval|node-cron/i);
    assert.doesNotMatch(src, /refunds\.create|transfers\.create|createReversal|payouts\.create/);
  }
});

test("stable idempotency keys remain for transfer/refund/reversal", () => {
  assert.equal(
    buildPlannedPackageTransferIdempotencyKey("pe1"),
    "planned-package-transfer-pe1",
  );
  assert.equal(
    buildPlannedPackageRefundIdempotencyKey("q1"),
    "planned-package-refund-q1",
  );
  assert.equal(
    buildPlannedPackageTransferReversalIdempotencyKey({
      transferExecutionId: "tx1",
      amountCents: 1000,
      reversalReason: "refund_required",
    }),
    "planned-package-transfer-reversal-tx1-1000-refund_required",
  );
});

test("lifecycle smoke — reconciliation after transfer + reversal + refund path", () => {
  const afterTransfer = reconcilePlannedPackageOrder({
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
    payoutEligibility: {
      ledgerEnabled: true,
      manualTransfersEnabled: true,
      entries: [
        {
          id: "pe1",
          bookingId: "b1",
          status: "transferred",
          blockers: [],
          adminReviewRequired: false,
          teacherNetCents: 4000,
          transferStatus: "succeeded",
          stripeTransferId: "tr_1",
          transferredCents: 4000,
        },
      ],
    },
    transferExecutions: {
      manualTransfersEnabled: true,
      manualTransferReversalsEnabled: true,
      latestExecutionStatus: "succeeded",
      latestReversalStatus: null,
      cancellationOpen: true,
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
  assert.ok(afterTransfer.attentionReasons.includes("refund_waiting_on_transfer_reversal"));

  const afterFullLoop = reconcilePlannedPackageOrder({
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
    refundStatus: "succeeded",
    refundedCents: 5000,
    latestQuoteStatus: "approved_for_manual_refund",
    latestExecutionStatus: "succeeded",
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
          status: "transferred",
          blockers: [],
          adminReviewRequired: false,
          teacherNetCents: 4000,
          transferStatus: "succeeded",
          stripeTransferId: "tr_1",
          transferredCents: 4000,
        },
      ],
    },
    transferExecutions: {
      manualTransfersEnabled: true,
      manualTransferReversalsEnabled: true,
      latestExecutionStatus: "succeeded",
      latestReversalStatus: "succeeded",
      cancellationOpen: false,
      refundExecuted: true,
      refundApproved: true,
      entries: [
        {
          entryId: "pe1",
          transferExecutionId: "tx1",
          status: "succeeded",
          amountCents: 4000,
          teacherNetCents: 4000,
          reversedCents: 4000,
          reversalStatus: "fully_reversed",
          remainingReversibleCents: 0,
          latestReversalStatus: "succeeded",
        },
      ],
    },
  });
  assert.ok(!afterFullLoop.attentionReasons.includes("refund_waiting_on_transfer_reversal"));
  assert.ok(!afterFullLoop.attentionReasons.includes("transfer_reversal_required"));
  assert.ok(!afterFullLoop.attentionReasons.includes("approved_refund_not_executed"));
});

test("i18n E2E QA keys exist in FR EN ES", () => {
  for (const loc of ["fr", "en", "es"]) {
    const j = JSON.parse(read(`lib/i18n/locales/${loc}.json`)) as Record<string, string>;
    assert.ok(j.plannedPackageE2eQaTitle);
    assert.ok(j.plannedPackageE2eQaPublicLaunchBlocked);
    assert.ok(j.plannedPackageE2eQaNoSecretsDisplayed);
    assert.ok(j.plannedPackageE2eQaFinancialAdminOnly);
  }
});

test("unsafe copy — E2E surfaces avoid employer / guaranteed automatic payout wording", () => {
  const surfaces = [
    "docs/product/planned-package-e2e-staging-qa.md",
    "lib/offers/plannedPackageE2eQa.ts",
    "app/(app)/admin/package-launch-readiness/page.tsx",
  ];
  for (const rel of surfaces) {
    const src = read(rel);
    assert.doesNotMatch(src, /Forfait Pratiqo|Banque d’heures Pratiqo|Nos forfaits|Salaire|Employé|Employeur/i);
    assert.doesNotMatch(
      src,
      /Paiement automatique garanti|Remboursement automatique garanti|Versement automatique garanti/i,
    );
  }
});
