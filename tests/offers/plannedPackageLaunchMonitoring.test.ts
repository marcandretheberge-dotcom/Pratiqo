/**
 * Planned package launch monitoring — read-only admin safety dashboard.
 * No money movement. No env mutation. No legal bypass.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  applyPlannedPackagePublicLaunchActivationEnv,
} from "../../lib/offers/plannedPackageLaunchProfile";
import {
  buildEnvStuckStatesForTests,
  getPlannedPackageLaunchMonitoringSnapshot,
  mapAttentionReasonToStuckCode,
} from "../../lib/offers/plannedPackageLaunchMonitoring";
import { PACKAGE_LAUNCH_REQUIRED_DOCS } from "../../lib/offers/packageLaunchReadiness";
import { ADMIN_COMMAND_CENTER_MODULES } from "../../lib/admin/overview";
import { PLANNED_PACKAGE_ADMIN_LAUNCH_MONITOR_HREF } from "../../lib/offers/plannedPackageDashboardLinks";
import { t as translate } from "../../lib/translations";
import type { TranslationKey } from "../../lib/i18n/types";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const tests: Array<{ name: string; fn: () => void | Promise<void> }> = [];
function test(name: string, fn: () => void | Promise<void>) {
  tests.push({ name, fn });
}

const t = (key: TranslationKey) => translate(key, "fr");
const tEn = (key: TranslationKey) => translate(key, "en");
const tEs = (key: TranslationKey) => translate(key, "es");

const ENV_KEYS = [
  "ENABLE_PLANNED_PACKAGES",
  "NEXT_PUBLIC_ENABLE_PLANNED_PACKAGES",
  "ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS",
  "ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT",
  "ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS",
  "ENABLE_PLANNED_PACKAGE_FULFILLMENT_ENGINE",
  "ENABLE_PLANNED_PACKAGE_STRIPE_CHECKOUT",
  "ENABLE_PLANNED_PACKAGE_ADMIN_OPS",
  "ENABLE_PLANNED_PACKAGE_PUBLIC_PURCHASE",
  "NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_PUBLIC_PURCHASE",
  "ENABLE_STUDENT_PLANNED_PACKAGE_DASHBOARD",
  "ENABLE_TEACHER_PLANNED_PACKAGE_DASHBOARD",
  "PACKAGE_LEGAL_REVIEW_COMPLETED",
  "PLANNED_PACKAGE_LAUNCH_MODE",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "VERCEL_ENV",
  "NODE_ENV",
] as const;

const prev: Record<string, string | undefined> = {};
for (const k of ENV_KEYS) prev[k] = process.env[k];

function resetEnv() {
  for (const k of ENV_KEYS) delete process.env[k];
}

function enableAdminOpsChain() {
  applyPlannedPackagePublicLaunchActivationEnv({ legalReviewCompleted: false });
  process.env.ENABLE_PLANNED_PACKAGE_ADMIN_OPS = "true";
}

test("admin launch monitor API is GET-only and admin-gated", () => {
  const route = read("app/api/admin/planned-package-launch-monitor/route.ts");
  assert.match(route, /requireAdminApi/);
  assert.match(route, /canUsePlannedPackageAdminOps/);
  assert.match(route, /export async function GET/);
  assert.doesNotMatch(route, /export async function POST|PUT|PATCH|DELETE/);
  assert.match(route, /launch_monitor_unavailable/);
  assert.doesNotMatch(route, /refunds\.create|transfers\.create|reversals\.create/i);
});

test("non-admin / ops-off path returns launch_monitor_unavailable", () => {
  const route = read("app/api/admin/planned-package-launch-monitor/route.ts");
  assert.match(route, /!canUsePlannedPackageAdminOps\(\)/);
  assert.match(route, /status:\s*403/);
});

test("monitor page and API exist; no mutation buttons", () => {
  assert.equal(existsSync(join(ROOT, "app/(app)/admin/planned-package-launch-monitor/page.tsx")), true);
  assert.equal(existsSync(join(ROOT, "app/api/admin/planned-package-launch-monitor/route.ts")), true);
  const page = read("app/(app)/admin/planned-package-launch-monitor/page.tsx");
  assert.match(page, /data-testid="planned-package-launch-monitor"/);
  assert.match(page, /data-testid="launch-monitor-rollback"/);
  assert.doesNotMatch(page, /<button[^>]*>[\s\S]*?(refund|transfer|reversal|env)/i);
  assert.doesNotMatch(page, /fetch\(.*method:\s*["']POST/i);
  assert.equal(PLANNED_PACKAGE_ADMIN_LAUNCH_MONITOR_HREF, "/admin/planned-package-launch-monitor");
});

test("admin nav module points at launch monitor", () => {
  const mod = ADMIN_COMMAND_CENTER_MODULES.find((m) => m.id === "planned_package_launch_monitor");
  assert.ok(mod);
  assert.equal(mod?.href, "/admin/planned-package-launch-monitor");
  assert.match(mod?.title ?? "", /Suivi lancement forfaits/);
  assert.match(read("app/(app)/admin/page.tsx"), /planned_package_launch_monitor/);
});

test("snapshot does not expose secrets and marks read-only", async () => {
  resetEnv();
  enableAdminOpsChain();
  process.env.STRIPE_SECRET_KEY = "sk_test_SUPER_SECRET_VALUE_NEVER_LEAK";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_SUPER_SECRET_VALUE_NEVER_LEAK";

  const snapshot = await getPlannedPackageLaunchMonitoringSnapshot();
  const json = JSON.stringify(snapshot);
  assert.equal(snapshot.readOnly, true);
  assert.equal(snapshot.mutatesData, false);
  assert.equal(snapshot.secretsExposed, false);
  assert.equal(snapshot.automaticFixesExecuted, false);
  assert.doesNotMatch(json, /sk_test_SUPER_SECRET|whsec_SUPER_SECRET|service_role|eyJ/);
  assert.equal(snapshot.stripeConfig.secretKeyConfigured, true);
  assert.equal(snapshot.stripeConfig.webhookSecretConfigured, true);
  assert.equal(snapshot.stripeConfig.checkoutMode, "test");
});

test("monitor includes launch gate status and legal review blocker", async () => {
  resetEnv();
  enableAdminOpsChain();
  const snapshot = await getPlannedPackageLaunchMonitoringSnapshot();
  assert.ok(snapshot.launchGate);
  assert.equal(snapshot.launchGate.legalReviewRequired, true);
  assert.equal(snapshot.launchGate.learnerTermsRequired, true);
  assert.equal(snapshot.launchGate.teacherTermsRequired, true);
  assert.equal(snapshot.launchGate.stripeReadinessRequired, true);
  assert.equal(snapshot.legalReview.completed, false);
  assert.ok(snapshot.blockers.some((b) => b.code === "legal_review_missing"));
  assert.ok(
    snapshot.stuckStates.some((s) => s.code === "public_purchase_enabled_but_legal_review_missing"),
  );
});

test("monitor includes recentOrders array (empty without admin client)", async () => {
  resetEnv();
  enableAdminOpsChain();
  const snapshot = await getPlannedPackageLaunchMonitoringSnapshot();
  assert.ok(Array.isArray(snapshot.recentOrders));
  assert.equal(snapshot.recentOrders.length, 0);
  assert.ok(Array.isArray(snapshot.stuckStates));
});

test("stuck mapping: checkout/fulfillment/refund/transfer/reversal codes", () => {
  assert.equal(mapAttentionReasonToStuckCode("webhook_missing"), "checkout_started_no_webhook");
  assert.equal(mapAttentionReasonToStuckCode("paid_not_fulfilled"), "payment_confirmed_not_fulfilled");
  assert.equal(
    mapAttentionReasonToStuckCode("fulfilled_missing_bookings"),
    "fulfilled_order_missing_bookings",
  );
  assert.equal(
    mapAttentionReasonToStuckCode("completed_session_missing_payout_eligibility"),
    "completed_booking_missing_payout_eligibility",
  );
  assert.equal(
    mapAttentionReasonToStuckCode("approved_refund_not_executed"),
    "refund_quote_approved_but_not_executed",
  );
  assert.equal(
    mapAttentionReasonToStuckCode("transfer_reversal_required"),
    "transfer_reversal_required_before_refund",
  );
  assert.equal(
    mapAttentionReasonToStuckCode("teacher_payment_not_ready_for_transfer"),
    "teacher_stripe_readiness_missing",
  );
});

test("env stuck: dashboards disabled while public purchase enabled", () => {
  resetEnv();
  applyPlannedPackagePublicLaunchActivationEnv({ legalReviewCompleted: true });
  delete process.env.ENABLE_STUDENT_PLANNED_PACKAGE_DASHBOARD;
  delete process.env.ENABLE_TEACHER_PLANNED_PACKAGE_DASHBOARD;
  process.env.ENABLE_PLANNED_PACKAGE_PUBLIC_PURCHASE = "true";
  process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_PUBLIC_PURCHASE = "true";
  const stuck = buildEnvStuckStatesForTests();
  assert.ok(stuck.some((s) => s.code === "student_dashboard_disabled_while_public_purchase_enabled"));
  assert.ok(stuck.some((s) => s.code === "teacher_dashboard_disabled_while_public_purchase_enabled"));
});

test("rollback panel text exists on snapshot and page", async () => {
  resetEnv();
  enableAdminOpsChain();
  const snapshot = await getPlannedPackageLaunchMonitoringSnapshot();
  assert.ok(
    snapshot.rollback.emergencyStopPublicPurchase.includes(
      "ENABLE_PLANNED_PACKAGE_PUBLIC_PURCHASE=false",
    ),
  );
  assert.ok(snapshot.rollback.keepAdminOpsOn.includes("ENABLE_PLANNED_PACKAGE_ADMIN_OPS=true"));
  assert.ok(snapshot.rollback.notes.some((n) => /Aucun rollback destructif/i.test(n)));
  const page = read("app/(app)/admin/planned-package-launch-monitor/page.tsx");
  assert.match(page, /launch-monitor-rollback/);
  assert.match(page, /ENABLE_PLANNED_PACKAGE_PUBLIC_PURCHASE=false|emergencyStopPublicPurchase/);
});

test("no new mutation money routes; Stripe money paths unchanged markers", () => {
  const monitorRoute = read("app/api/admin/planned-package-launch-monitor/route.ts");
  assert.doesNotMatch(monitorRoute, /refund|transfer|reversal|payout/i);

  const refund = read("lib/offers/plannedPackageManualRefund.ts");
  const transfer = read("lib/offers/plannedPackageManualTransfer.ts");
  const reversal = read("lib/offers/plannedPackageTransferReversal.ts");
  assert.match(refund, /manual/i);
  assert.match(transfer, /manual/i);
  assert.match(reversal, /manual/i);

  // No automatic cron files added for package refund/payout/reversal
  assert.equal(existsSync(join(ROOT, "app/api/cron/planned-package-refunds/route.ts")), false);
  assert.equal(existsSync(join(ROOT, "app/api/cron/planned-package-payouts/route.ts")), false);
  assert.equal(existsSync(join(ROOT, "app/api/cron/planned-package-reversals/route.ts")), false);
});

test("docs and i18n for launch monitor", () => {
  assert.equal(existsSync(join(ROOT, "docs/product/planned-package-launch-monitoring.md")), true);
  assert.ok(PACKAGE_LAUNCH_REQUIRED_DOCS.includes("docs/product/planned-package-launch-monitoring.md"));
  assert.match(read("docs/product/planned-package-public-launch-activation.md"), /launch-monitor/);
  assert.match(read("docs/product/paid-packages-launch-checklist.md"), /launch-monitor/);
  assert.match(read("docs/product/planned-package-e2e-staging-qa.md"), /launch-monitor/);

  assert.equal(t("plannedPackageLaunchMonitorTitle"), "Suivi lancement forfaits");
  assert.equal(tEn("plannedPackageLaunchMonitorTitle"), "Package launch monitor");
  assert.equal(tEs("plannedPackageLaunchMonitorTitle"), "Monitor de lanzamiento de paquetes");
  assert.equal(t("plannedPackageLaunchMonitorLegalReviewMissing"), "Revue légale manquante");
  assert.equal(tEn("plannedPackageLaunchMonitorPaidNotFulfilled"), "Paid order not fulfilled");
  assert.equal(t("plannedPackageLaunchMonitorNoSecrets"), "Aucun secret n’est affiché");
  assert.equal(t("plannedPackageLaunchMonitorNoAutoFix"), "Aucun correctif automatique n’est exécuté");
});

test("helper reuses launch gate / profile — does not bypass legal review", () => {
  const src = read("lib/offers/plannedPackageLaunchMonitoring.ts");
  assert.match(src, /evaluatePlannedPackagePublicLaunchGate/);
  assert.match(src, /getPlannedPackageLaunchFlagProfile|getPlannedPackageActivationStatus/);
  assert.match(src, /isPackageLegalReviewCompleted/);
  assert.doesNotMatch(src, /PACKAGE_LEGAL_REVIEW_COMPLETED\s*=\s*["']true["']/);
  assert.doesNotMatch(src, /refunds\.create|transfers\.create/);
});

async function run() {
  let failed = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`ok - ${name}`);
    } catch (err) {
      failed += 1;
      console.error(`not ok - ${name}`);
      console.error(err);
    }
  }
  for (const k of ENV_KEYS) {
    if (prev[k] === undefined) delete process.env[k];
    else Reflect.set(process.env, k, prev[k]);
  }
  if (failed > 0) {
    console.error(`\n${failed} failed`);
    process.exit(1);
  }
  console.log(`\n${tests.length} passed`);
}

void run();
