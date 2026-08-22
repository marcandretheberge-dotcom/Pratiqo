/**
 * Paid packages launch readiness gate (PR 14) — diagnostics only.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getPackageLaunchReadiness,
  PACKAGE_LAUNCH_ADMIN_SUPPORT_SURFACES,
  PACKAGE_LAUNCH_COPY_GUARD_TESTS,
  PACKAGE_LAUNCH_FLAG_META,
  PACKAGE_LAUNCH_NEVER_PRODUCTION_READY,
  PACKAGE_LAUNCH_REQUIRED_DOCS,
  PACKAGE_LEGAL_REVIEW_COMPLETED_FLAG,
} from "../../lib/offers/packageLaunchReadiness";
import { ADMIN_COMMAND_CENTER_MODULES } from "../../lib/admin/overview";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const tests: Array<{ name: string; fn: () => void }> = [];
function test(name: string, fn: () => void) {
  tests.push({ name, fn });
}

const prevLegal = process.env.PACKAGE_LEGAL_REVIEW_COMPLETED;

test("readiness helper and docs exist", () => {
  assert.equal(existsSync(join(ROOT, "lib/offers/packageLaunchReadiness.ts")), true);
  for (const rel of PACKAGE_LAUNCH_REQUIRED_DOCS) {
    assert.equal(existsSync(join(ROOT, rel)), true, `missing ${rel}`);
  }
  for (const rel of PACKAGE_LAUNCH_COPY_GUARD_TESTS) {
    assert.equal(existsSync(join(ROOT, rel)), true, `missing ${rel}`);
  }
  for (const rel of PACKAGE_LAUNCH_ADMIN_SUPPORT_SURFACES) {
    assert.equal(existsSync(join(ROOT, rel)), true, `missing ${rel}`);
  }
  assert.equal(PACKAGE_LAUNCH_NEVER_PRODUCTION_READY, true);
  assert.equal(PACKAGE_LEGAL_REVIEW_COMPLETED_FLAG, "PACKAGE_LEGAL_REVIEW_COMPLETED");
});

test("helper lists all package-related flags and never returns production_ready", () => {
  delete process.env.PACKAGE_LEGAL_REVIEW_COMPLETED;
  const readiness = getPackageLaunchReadiness();
  const ids = PACKAGE_LAUNCH_FLAG_META.map((m) => m.id);
  assert.deepEqual(ids.sort(), [
    "bookingOfferSelection",
    "offerSnapshotCheckout",
    "packageEntitlements",
    "packageRedemptionBooking",
    "plannedPackageCheckoutPreflight",
    "plannedPackageFulfillmentEngine",
    "plannedPackageStripeCheckout",
    "plannedPackageAdminOps",
    "plannedPackageRefundQuotes",
    "plannedPackageRefundAdminReview",
    "plannedPackageManualRefunds",
    "plannedPackageManualTransfers",
    "plannedPackageManualTransferReversals",
    "plannedPackageE2eQaTools",
    "plannedPackagePayoutEligibilityLedger",
    "plannedPackageSessionDrafts",
    "plannedPackageTemporaryHolds",
    "plannedPackages",
    "studentPackageDashboard",
    "studentPlannedPackageDashboard",
    "teacherPackageVisibility",
    "teacherPlannedPackageDashboard",
  ].sort());
  for (const id of ids) {
    assert.equal(typeof readiness.flags[id], "boolean");
  }
  assert.notEqual(readiness.status as string, "production_ready");
  assert.ok(
    ["blocked", "preview_ready", "production_review_required"].includes(readiness.status),
  );
  assert.equal(readiness.checks.legalReviewMarkedRequired, true);
  assert.equal(readiness.checks.legalReviewCompletedSignal, false);
  assert.match(
    JSON.stringify(readiness),
    /legal_review_required|Vérification légale|PACKAGE_LEGAL_REVIEW_COMPLETED/,
  );
});

test("admin page is under requireAdminPage layout and has no mutation UI", () => {
  const layout = read("app/(app)/admin/layout.tsx");
  assert.match(layout, /requireAdminPage\(/);

  const page = read("app/(app)/admin/package-launch-readiness/page.tsx");
  assert.match(page, /getPackageLaunchReadiness/);
  assert.match(page, /Forfaits — préparation au lancement/);
  assert.match(page, /package-launch-readiness/);
  assert.match(page, /Vérification légale requise/);
  assert.match(page, /intermédiaire technologique/);
  assert.match(page, /proposés par les professeurs/);
  assert.match(page, /offres de cours standards peuvent fonctionner séparément/i);
  assert.match(page, /modèle de remboursement/);
  assert.match(page, /package-launch-offers-separation/);
  assert.match(page, /package-launch-phase1/);
  assert.match(page, /Phase 1 — Forfaits planifiés/);
  assert.doesNotMatch(page, /type="checkbox"|toggle|setFlag|process\.env\.\w+\s*=/);
  assert.doesNotMatch(page, /stripe\.|sessions\.create|\.update\(|\.insert\(|redeem|reverse_package/);
  assert.doesNotMatch(page, /Forfaits Pratiqo|Nos forfaits Pratiqo|salaire|employé/i);
  assert.doesNotMatch(page, /Mes formules|\bformules\b/i);
});

test("admin API is requireAdminApi GET-only read-only", () => {
  const api = read("app/api/admin/package-launch-readiness/route.ts");
  assert.match(api, /requireAdminApi/);
  assert.match(api, /getPackageLaunchReadiness/);
  assert.match(api, /readOnly:\s*true/);
  assert.doesNotMatch(api, /export async function POST|PUT|PATCH|DELETE/);
  assert.doesNotMatch(api, /stripe\.|\.update\(|\.insert\(|redeem/);
});

test("command center links to package launch readiness", () => {
  const mod = ADMIN_COMMAND_CENTER_MODULES.find((m) => m.id === "package_launch_readiness");
  assert.ok(mod);
  assert.equal(mod!.href, "/admin/package-launch-readiness");
  assert.match(mod!.title, /Forfaits/);
  assert.match(read("app/(app)/admin/page.tsx"), /package_launch_readiness/);
});

test("no behavior-critical payment/package mutation surfaces changed by this PR", () => {
  const marker = /packageLaunchReadiness|package-launch-readiness|PACKAGE_LEGAL_REVIEW_COMPLETED/;
  assert.doesNotMatch(read("app/api/stripe/checkout/route.ts"), marker);
  assert.doesNotMatch(read("lib/payments/commission.ts"), marker);
  assert.doesNotMatch(read("lib/payments/refunds.ts"), marker);
  assert.doesNotMatch(read("lib/offers/packageEntitlements.ts"), /getPackageLaunchReadiness/);
  assert.doesNotMatch(read("lib/offers/packageRedemptions.ts"), /getPackageLaunchReadiness/);
  assert.doesNotMatch(read("lib/offers/packageLaunchReadiness.ts"), /\.update\(|\.insert\(|stripe\./);
});

test("marketplace copy guards still cover package flows", () => {
  assert.match(
    read("tests/offers/marketplaceIndependentTeacherGuardrails.test.ts"),
    /Nos forfaits Pratiqo/,
  );
  assert.match(
    read("tests/legal/marketplaceIndependentTeacherHardening.test.ts"),
    /marketplace-independent-teacher-guardrails/,
  );
});

for (const { name, fn } of tests) {
  fn();
  console.log(`ok - ${name}`);
}

if (prevLegal === undefined) delete process.env.PACKAGE_LEGAL_REVIEW_COMPLETED;
else process.env.PACKAGE_LEGAL_REVIEW_COMPLETED = prevLegal;

console.log(`[offers:package-launch-readiness] ${tests.length} tests passed`);
