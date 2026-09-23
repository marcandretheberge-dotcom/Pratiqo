/**
 * Planned package public launch gate + legal-safe copy.
 * Defaults OFF. No automatic money movement. No legal bypass.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  canPubliclyPurchasePlannedPackage,
  getPlannedPackagePublicLaunchBlockers,
  isPackageLegalReviewCompleted,
} from "../../lib/offers/plannedPackages";
import {
  evaluatePlannedPackagePublicLaunchGate,
  getPlannedPackageAdminLaunchPreview,
  getPlannedPackageLaunchMode,
  isPlannedPackagePublicPurchaseEnabled,
  PLANNED_PACKAGE_PUBLIC_TERMS_VERSION,
} from "../../lib/offers/plannedPackagePublicLaunchGate";
import { getPackageLaunchReadiness } from "../../lib/offers/packageLaunchReadiness";
import { t as translate } from "../../lib/translations";
import type { TranslationKey } from "../../lib/i18n/types";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const tests: Array<{ name: string; fn: () => void }> = [];
function test(name: string, fn: () => void) {
  tests.push({ name, fn });
}

const t = (key: TranslationKey) => translate(key, "fr");

const ENV_KEYS = [
  "ENABLE_PLANNED_PACKAGES",
  "NEXT_PUBLIC_ENABLE_PLANNED_PACKAGES",
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
  "ENABLE_STUDENT_PLANNED_PACKAGE_DASHBOARD",
  "ENABLE_TEACHER_PLANNED_PACKAGE_DASHBOARD",
  "ENABLE_PLANNED_PACKAGE_PUBLIC_PURCHASE",
  "NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_PUBLIC_PURCHASE",
  "ENABLE_PLANNED_PACKAGE_E2E_QA_TOOLS",
  "PACKAGE_LEGAL_REVIEW_COMPLETED",
  "PLANNED_PACKAGE_LAUNCH_MODE",
  "PLANNED_PACKAGE_CANARY_TEACHER_IDS",
  "PLANNED_PACKAGE_CANARY_OFFER_IDS",
  "VERCEL_ENV",
  "NODE_ENV",
] as const;

const prev: Record<string, string | undefined> = {};
for (const k of ENV_KEYS) prev[k] = process.env[k];

function resetEnv() {
  for (const k of ENV_KEYS) delete process.env[k];
}

function enableFullChain() {
  process.env.ENABLE_PLANNED_PACKAGES = "true";
  process.env.ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS = "true";
  process.env.ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT = "true";
  process.env.ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS = "true";
  process.env.ENABLE_PLANNED_PACKAGE_FULFILLMENT_ENGINE = "true";
  process.env.ENABLE_PLANNED_PACKAGE_STRIPE_CHECKOUT = "true";
  process.env.ENABLE_PLANNED_PACKAGE_ADMIN_OPS = "true";
  process.env.ENABLE_PLANNED_PACKAGE_REFUND_QUOTES = "true";
  process.env.ENABLE_PLANNED_PACKAGE_REFUND_ADMIN_REVIEW = "true";
  process.env.ENABLE_PLANNED_PACKAGE_MANUAL_REFUNDS = "true";
  process.env.ENABLE_PLANNED_PACKAGE_PAYOUT_ELIGIBILITY_LEDGER = "true";
  process.env.ENABLE_PLANNED_PACKAGE_PAYOUT_ADMIN_VIEW = "true";
  process.env.ENABLE_PLANNED_PACKAGE_MANUAL_TRANSFERS = "true";
  process.env.ENABLE_PLANNED_PACKAGE_MANUAL_TRANSFER_REVERSALS = "true";
  process.env.ENABLE_STUDENT_PLANNED_PACKAGE_DASHBOARD = "true";
  process.env.ENABLE_TEACHER_PLANNED_PACKAGE_DASHBOARD = "true";
  process.env.ENABLE_PLANNED_PACKAGE_E2E_QA_TOOLS = "true";
  process.env.PACKAGE_LEGAL_REVIEW_COMPLETED = "true";
  process.env.ENABLE_PLANNED_PACKAGE_PUBLIC_PURCHASE = "true";
  process.env.VERCEL_ENV = "preview";
  Reflect.set(process.env, "NODE_ENV", "development");
}

test("public purchase flag defaults OFF", () => {
  resetEnv();
  assert.equal(isPlannedPackagePublicPurchaseEnabled(), false);
  assert.equal(getPlannedPackageLaunchMode(), "disabled");
  assert.equal(canPubliclyPurchasePlannedPackage(), false);
});

test("public launch gate blocks when public purchase flag OFF", () => {
  resetEnv();
  enableFullChain();
  delete process.env.ENABLE_PLANNED_PACKAGE_PUBLIC_PURCHASE;
  process.env.PLANNED_PACKAGE_LAUNCH_MODE = "public_ready";
  const gate = evaluatePlannedPackagePublicLaunchGate();
  assert.ok(gate.blockers.includes("planned_package_public_purchase_disabled"));
  assert.equal(gate.canStartPackagePurchase, false);
  assert.equal(canPubliclyPurchasePlannedPackage(), false);
});

test("public launch gate blocks when legal review missing", () => {
  resetEnv();
  enableFullChain();
  delete process.env.PACKAGE_LEGAL_REVIEW_COMPLETED;
  process.env.PLANNED_PACKAGE_LAUNCH_MODE = "public_ready";
  assert.equal(isPackageLegalReviewCompleted(), false);
  const gate = evaluatePlannedPackagePublicLaunchGate();
  assert.ok(gate.blockers.includes("package_legal_review_required"));
  assert.equal(canPubliclyPurchasePlannedPackage(), false);
});

test("public launch gate blocks when teacher terms missing", () => {
  resetEnv();
  enableFullChain();
  process.env.PLANNED_PACKAGE_LAUNCH_MODE = "staging_only";
  const gate = evaluatePlannedPackagePublicLaunchGate({
    requireTeacherTerms: true,
    teacherTermsAccepted: false,
  });
  assert.ok(gate.blockers.includes("teacher_package_terms_required"));
  assert.equal(gate.canStartPackagePurchase, false);
});

test("public launch gate blocks when learner terms missing before checkout", () => {
  resetEnv();
  enableFullChain();
  process.env.PLANNED_PACKAGE_LAUNCH_MODE = "staging_only";
  const gate = evaluatePlannedPackagePublicLaunchGate({
    requireLearnerTerms: true,
    learnerTermsAccepted: false,
  });
  assert.ok(gate.blockers.includes("learner_package_terms_required"));
  assert.equal(gate.canOpenCheckout, false);
});

test("canary mode blocks non-allowlisted offer", () => {
  resetEnv();
  enableFullChain();
  process.env.PLANNED_PACKAGE_LAUNCH_MODE = "limited_teacher_canary";
  process.env.PLANNED_PACKAGE_CANARY_OFFER_IDS = "11111111-1111-4111-8111-111111111111";
  const gate = evaluatePlannedPackagePublicLaunchGate({
    offerId: "22222222-2222-4222-8222-222222222222",
    teacherId: "33333333-3333-4333-8333-333333333333",
  });
  assert.ok(gate.blockers.includes("package_canary_not_allowed"));
  assert.equal(gate.canStartPackagePurchase, false);
});

test("canary mode allows allowlisted offer when deps pass", () => {
  resetEnv();
  enableFullChain();
  process.env.PLANNED_PACKAGE_LAUNCH_MODE = "limited_teacher_canary";
  process.env.PLANNED_PACKAGE_CANARY_OFFER_IDS = "11111111-1111-4111-8111-111111111111";
  const gate = evaluatePlannedPackagePublicLaunchGate({
    offerId: "11111111-1111-4111-8111-111111111111",
    requireTeacherTerms: true,
    teacherTermsAccepted: true,
    teacherTermsPolicyVersion: PLANNED_PACKAGE_PUBLIC_TERMS_VERSION,
    requireLearnerTerms: true,
    learnerTermsAccepted: true,
    learnerTermsPolicyVersion: PLANNED_PACKAGE_PUBLIC_TERMS_VERSION,
  });
  assert.equal(gate.canStartPackagePurchase, true);
  assert.equal(gate.canOpenCheckout, true);
});

test("dashboard / refund / payout / e2e required for public_ready", () => {
  resetEnv();
  enableFullChain();
  process.env.PLANNED_PACKAGE_LAUNCH_MODE = "public_ready";
  delete process.env.ENABLE_STUDENT_PLANNED_PACKAGE_DASHBOARD;
  assert.ok(
    evaluatePlannedPackagePublicLaunchGate().blockers.includes("package_dashboard_required"),
  );

  resetEnv();
  enableFullChain();
  process.env.PLANNED_PACKAGE_LAUNCH_MODE = "public_ready";
  delete process.env.ENABLE_PLANNED_PACKAGE_MANUAL_REFUNDS;
  assert.ok(
    evaluatePlannedPackagePublicLaunchGate().blockers.includes(
      "package_refund_infrastructure_required",
    ),
  );

  resetEnv();
  enableFullChain();
  process.env.PLANNED_PACKAGE_LAUNCH_MODE = "public_ready";
  delete process.env.ENABLE_PLANNED_PACKAGE_MANUAL_TRANSFERS;
  assert.ok(
    evaluatePlannedPackagePublicLaunchGate().blockers.includes(
      "package_payout_infrastructure_required",
    ),
  );

  resetEnv();
  enableFullChain();
  process.env.PLANNED_PACKAGE_LAUNCH_MODE = "public_ready";
  delete process.env.ENABLE_PLANNED_PACKAGE_E2E_QA_TOOLS;
  assert.ok(
    evaluatePlannedPackagePublicLaunchGate().blockers.includes("package_e2e_qa_required"),
  );
});

test("terms version constant defined and used", () => {
  assert.match(PLANNED_PACKAGE_PUBLIC_TERMS_VERSION, /^planned_package_terms_v1_/);
  assert.match(read("lib/offers/createPlannedPackageStripeCheckoutSession.ts"), /PLANNED_PACKAGE_PUBLIC_TERMS_VERSION/);
  assert.match(read("supabase/migrations/124_planned_package_public_terms_consent.sql"), /learner_package_terms/);
  assert.match(read("supabase/migrations/124_planned_package_public_terms_consent.sql"), /teacher_package_terms/);
});

test("routes enforce public launch gate / learner consent", () => {
  assert.match(read("lib/offers/createPlannedPackageSessionDraft.ts"), /evaluatePlannedPackagePublicLaunchGate/);
  assert.match(read("lib/offers/createPlannedPackagePendingOrder.ts"), /evaluatePlannedPackagePublicLaunchGate/);
  assert.match(read("lib/offers/createPlannedPackageStripeCheckoutSession.ts"), /learner_package_terms_required|learnerPackageTermsAccepted/);
  assert.match(read("app/api/planned-packages/pending-orders/[orderId]/checkout/route.ts"), /learnerPackageTermsAccepted/);
  assert.match(read("app/api/teacher/offers/route.ts"), /loadTeacherPackageTerms/);
  assert.match(read("app/api/teacher/planned-packages/terms/route.ts"), /recordTeacherPackageTermsAcknowledgment/);
});

test("admin preview does not mutate data", () => {
  resetEnv();
  const preview = getPlannedPackageAdminLaunchPreview();
  assert.equal(preview.mutatesData, false);
  assert.ok(preview.termsVersion);
  assert.ok(preview.ctaEnabledCopyKey);
});

test("public CTA and cancellation copy are legal-safe", () => {
  assert.equal(t("plannedPackagePlanThisPackage"), "Planifier ce forfait");
  assert.equal(t("plannedPackageBeingPrepared"), "Ce forfait est en préparation.");
  assert.equal(t("plannedPackageBookingsNotOpenYet"), "Les réservations de forfaits ne sont pas encore ouvertes.");
  assert.equal(t("plannedPackageConsentCheckbox"), "J’ai lu et compris les conditions applicables à ce forfait.");
  const cancel = [
    t("plannedPackageCancellationContactSupport"),
    t("plannedPackageCancellationCompletedDiffers"),
    t("plannedPackageCancellationReviewedByPolicy"),
  ].join(" ");
  assert.doesNotMatch(cancel, /remboursement automatique/i);
  assert.doesNotMatch(cancel, /versement automatique/i);
  assert.doesNotMatch(cancel, /Forfait Pratiqo/i);
  assert.doesNotMatch(t("plannedPackageTeacherTermsAck"), /salaire|employé|employeur/i);

  const card = read("components/teacher/PublicTeacherOfferCard.tsx");
  assert.match(card, /plannedPackagePlanThisPackage/);
  assert.match(card, /plannedPackageBeingPrepared/);
  const checkout = read("components/packages/PlannedPackageCheckoutButton.tsx");
  assert.match(checkout, /planned-package-learner-terms-checkbox/);
  assert.match(checkout, /planned-package-cancellation-summary/);
});

test("copy guard rejects forbidden terms in public locales", () => {
  for (const locale of ["fr", "en", "es"] as const) {
    const src = read(`lib/i18n/locales/${locale}.json`);
    assert.doesNotMatch(src, /Forfait Pratiqo/i);
    assert.doesNotMatch(src, /Banque d[’']heures Pratiqo/i);
    assert.doesNotMatch(src, /Crédits Pratiqo/i);
    assert.doesNotMatch(src, /remboursement automatique garanti/i);
    assert.doesNotMatch(src, /versement automatique garanti/i);
  }
});

test("admin readiness shows public launch gate section", () => {
  resetEnv();
  const readiness = getPackageLaunchReadiness();
  assert.equal(readiness.checks.plannedPackagePublicLaunchGatePresent, true);
  assert.equal(readiness.checks.plannedPackagePublicPurchaseFlagDefaultOff, true);
  assert.equal(readiness.checks.plannedPackageNoPublicLaunchByDefault, true);
  assert.equal(readiness.publicLaunchGate.launchMode, "disabled");
  assert.equal(readiness.flags.plannedPackagePublicPurchase, false);

  const page = read("app/(app)/admin/package-launch-readiness/page.tsx");
  assert.match(page, /Public launch gate/);
  assert.match(page, /package-launch-public-gate/);
  assert.match(page, /package-launch-admin-preview/);
  assert.doesNotMatch(page, /type=["']checkbox["']/);
});

test("rollback docs exist and no auto money movement added", () => {
  assert.equal(existsSync(join(ROOT, "docs/product/planned-package-public-launch-gate.md")), true);
  const doc = read("docs/product/planned-package-public-launch-gate.md");
  assert.match(doc, /ENABLE_PLANNED_PACKAGE_PUBLIC_PURCHASE=false/);
  assert.match(doc, /Rollback/);
  assert.doesNotMatch(read("lib/offers/plannedPackagePublicLaunchGate.ts"), /cron|setInterval/i);
  assert.doesNotMatch(read("lib/offers/createPlannedPackageStripeCheckoutSession.ts"), /transfers\.create|refunds\.create/);
});

test("dashboards remain read-only and legal gate not bypassed", () => {
  assert.match(read("lib/offers/plannedPackageStudentDashboard.ts"), /read-only/i);
  assert.match(read("lib/offers/plannedPackageTeacherDashboard.ts"), /read-only|lecture seule/i);
  assert.ok(getPlannedPackagePublicLaunchBlockers().includes("package_legal_review_required") || !isPackageLegalReviewCompleted());
  resetEnv();
  assert.ok(getPlannedPackagePublicLaunchBlockers().includes("package_legal_review_required"));
});

async function main() {
  let failed = 0;
  for (const { name, fn } of tests) {
    try {
      resetEnv();
      fn();
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

void main();
