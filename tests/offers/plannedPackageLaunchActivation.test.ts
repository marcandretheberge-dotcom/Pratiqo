/**
 * Planned package public launch activation profile — flags ON, legal gate intact.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  applyPlannedPackagePublicLaunchActivationEnv,
  getPlannedPackageActivationStatus,
  getPlannedPackageLaunchFlagProfile,
  PLANNED_PACKAGE_INTENDED_LAUNCH_PROFILE,
  PLANNED_PACKAGE_PUBLIC_LAUNCH_REQUIRED_FLAGS,
} from "../../lib/offers/plannedPackageLaunchProfile";
import {
  evaluatePlannedPackagePublicLaunchGate,
  PLANNED_PACKAGE_PUBLIC_TERMS_VERSION,
} from "../../lib/offers/plannedPackagePublicLaunchGate";
import { canPubliclyPurchasePlannedPackage } from "../../lib/offers/plannedPackages";
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
  ...PLANNED_PACKAGE_PUBLIC_LAUNCH_REQUIRED_FLAGS,
  "PACKAGE_LEGAL_REVIEW_COMPLETED",
  "VERCEL_ENV",
  "NODE_ENV",
] as const;

const prev: Record<string, string | undefined> = {};
for (const k of ENV_KEYS) prev[k] = process.env[k];

function resetEnv() {
  for (const k of ENV_KEYS) delete process.env[k];
}

test("activation profile expects all package launch flags ON and public_ready", () => {
  resetEnv();
  applyPlannedPackagePublicLaunchActivationEnv({ legalReviewCompleted: false });
  const profile = getPlannedPackageLaunchFlagProfile();
  assert.equal(profile.intendedLaunchProfile, PLANNED_PACKAGE_INTENDED_LAUNCH_PROFILE);
  assert.equal(profile.allPackageFlagsExpectedOn, true);
  assert.equal(profile.publicLaunchFlagsEnabled, true);
  assert.equal(profile.launchModeIsPublicReady, true);
  assert.equal(profile.missingFlags.length, 0);
  assert.equal(profile.legalReviewRequired, true);
  assert.equal(profile.legalReviewCompleted, false);
  assert.equal(profile.learnerTermsStillRequired, true);
  assert.equal(profile.teacherTermsStillRequired, true);
  assert.equal(profile.stripeReadinessStillRequired, true);
  assert.equal(getPlannedPackageActivationStatus(profile), "legal_review_blocked");
});

test("all flags ON but legal review missing => checkout / public purchase still blocked", () => {
  resetEnv();
  applyPlannedPackagePublicLaunchActivationEnv({ legalReviewCompleted: false });
  assert.equal(canPubliclyPurchasePlannedPackage(), false);
  const gate = evaluatePlannedPackagePublicLaunchGate({
    requireLearnerTerms: true,
    learnerTermsAccepted: true,
    learnerTermsPolicyVersion: PLANNED_PACKAGE_PUBLIC_TERMS_VERSION,
    requireTeacherTerms: true,
    teacherTermsAccepted: true,
    teacherTermsPolicyVersion: PLANNED_PACKAGE_PUBLIC_TERMS_VERSION,
  });
  assert.ok(gate.blockers.includes("package_legal_review_required"));
  assert.equal(gate.canOpenCheckout, false);
  assert.equal(gate.canStartPackagePurchase, false);
});

test("all flags ON and legal review true => public launch gate can pass with terms", () => {
  resetEnv();
  applyPlannedPackagePublicLaunchActivationEnv({ legalReviewCompleted: true });
  process.env.VERCEL_ENV = "preview";
  Reflect.set(process.env, "NODE_ENV", "development");
  assert.equal(canPubliclyPurchasePlannedPackage(), true);
  const gate = evaluatePlannedPackagePublicLaunchGate({
    requireLearnerTerms: true,
    learnerTermsAccepted: true,
    learnerTermsPolicyVersion: PLANNED_PACKAGE_PUBLIC_TERMS_VERSION,
    requireTeacherTerms: true,
    teacherTermsAccepted: true,
    teacherTermsPolicyVersion: PLANNED_PACKAGE_PUBLIC_TERMS_VERSION,
  });
  assert.equal(gate.canStartPackagePurchase, true);
  assert.equal(gate.canOpenCheckout, true);
  assert.equal(getPlannedPackageActivationStatus(), "public_launch_ready");
});

test("activation still blocks missing learner or teacher terms", () => {
  resetEnv();
  applyPlannedPackagePublicLaunchActivationEnv({ legalReviewCompleted: true });
  const noLearner = evaluatePlannedPackagePublicLaunchGate({
    requireLearnerTerms: true,
    learnerTermsAccepted: false,
    requireTeacherTerms: true,
    teacherTermsAccepted: true,
    teacherTermsPolicyVersion: PLANNED_PACKAGE_PUBLIC_TERMS_VERSION,
  });
  assert.ok(noLearner.blockers.includes("learner_package_terms_required"));
  assert.equal(noLearner.canOpenCheckout, false);

  const noTeacher = evaluatePlannedPackagePublicLaunchGate({
    requireTeacherTerms: true,
    teacherTermsAccepted: false,
    requireLearnerTerms: true,
    learnerTermsAccepted: true,
    learnerTermsPolicyVersion: PLANNED_PACKAGE_PUBLIC_TERMS_VERSION,
  });
  assert.ok(noTeacher.blockers.includes("teacher_package_terms_required"));
  assert.equal(noTeacher.canStartPackagePurchase, false);
});

test("routes still enforce launch gate / consent / legal review", () => {
  assert.match(read("lib/offers/createPlannedPackageSessionDraft.ts"), /evaluatePlannedPackagePublicLaunchGate/);
  assert.match(read("lib/offers/createPlannedPackagePendingOrder.ts"), /evaluatePlannedPackagePublicLaunchGate/);
  assert.match(
    read("lib/offers/createPlannedPackageStripeCheckoutSession.ts"),
    /package_legal_review_required|learner_package_terms_required/,
  );
  assert.match(read("app/api/planned-packages/pending-orders/[orderId]/checkout/route.ts"), /learnerPackageTermsAccepted/);
  assert.match(read("app/api/teacher/offers/route.ts"), /loadTeacherPackageTerms/);
});

test("CTA helpers and dashboards remain gated by flags + terms", () => {
  assert.match(read("components/teacher/PublicTeacherOfferCard.tsx"), /plannedPackagePlanThisPackage/);
  assert.match(read("components/teacher/PublicTeacherOfferCard.tsx"), /plannedPackageBeingPrepared/);
  assert.match(read("components/packages/PlannedPackageCheckoutButton.tsx"), /learnerPackageTermsAccepted/);
  assert.match(read("lib/offers/plannedPackageStudentDashboard.ts"), /read-only/i);
  assert.match(read("lib/offers/plannedPackageTeacherDashboard.ts"), /read-only/i);
  assert.match(read("lib/offers/plannedPackageAdminOps.ts"), /ENABLE_PLANNED_PACKAGE_ADMIN_OPS/);
});

test("admin readiness shows activation status and legal blocker when flags ON", () => {
  resetEnv();
  applyPlannedPackagePublicLaunchActivationEnv({ legalReviewCompleted: false });
  const readiness = getPackageLaunchReadiness();
  assert.equal(readiness.activationStatus, "legal_review_blocked");
  assert.equal(readiness.checks.plannedPackagePublicLaunchFlagsEnabled, true);
  assert.equal(readiness.checks.plannedPackagePublicLaunchLegalBlocked, true);
  assert.equal(readiness.checks.plannedPackagePublicLaunchGateReady, false);
  assert.ok(readiness.blockers.some((b) => b.code === "public_launch_legal_review_blocked"));
  assert.equal(readiness.checks.plannedPackageLearnerTermsStillRequired, true);
  assert.equal(readiness.checks.plannedPackageTeacherTermsStillRequired, true);
  assert.equal(readiness.checks.plannedPackageRollbackDocumented, true);

  const page = read("app/(app)/admin/package-launch-readiness/page.tsx");
  assert.match(page, /package-launch-activation-status/);
  assert.match(page, /Flags de lancement public activés/);
  assert.match(page, /Lancement public bloqué : revue légale requise/);
  assert.doesNotMatch(page, /type=["']checkbox["']/);
});

test("env examples document activation flags without secrets or false legal attestation", () => {
  const example = read(".env.example");
  assert.match(example, /ENABLE_PLANNED_PACKAGE_PUBLIC_PURCHASE=true/);
  assert.match(example, /PLANNED_PACKAGE_LAUNCH_MODE=public_ready/);
  assert.match(example, /Must be set only after legal review is actually completed/);
  assert.doesNotMatch(example, /^PACKAGE_LEGAL_REVIEW_COMPLETED=true/m);
  assert.match(example, /^PACKAGE_LEGAL_REVIEW_COMPLETED=$/m);
  assert.doesNotMatch(example, /sk_live_|whsec_|SUPABASE_SERVICE_ROLE_KEY=.+/);
  assert.equal(existsSync(join(ROOT, ".env.production.example")), true);
  const prod = read(".env.production.example");
  assert.match(prod, /ENABLE_PLANNED_PACKAGE_PUBLIC_PURCHASE=true/);
  assert.match(prod, /Must be set only after legal review is actually completed/);
  assert.doesNotMatch(prod, /sk_live_|whsec_/);
});

test("activation docs and rollback exist; no money movement / legal bypass", () => {
  assert.equal(existsSync(join(ROOT, "docs/product/planned-package-public-launch-activation.md")), true);
  const doc = read("docs/product/planned-package-public-launch-activation.md");
  assert.match(doc, /Emergency rollback/);
  assert.match(doc, /PACKAGE_LEGAL_REVIEW_COMPLETED=true/);
  assert.match(doc, /Never hardcode a false legal attestation/);
  assert.doesNotMatch(read("lib/offers/plannedPackageLaunchProfile.ts"), /cron|setInterval/i);
  assert.doesNotMatch(read("lib/offers/createPlannedPackageStripeCheckoutSession.ts"), /transfers\.create|refunds\.create/);
});

test("i18n activation status strings", () => {
  assert.equal(t("plannedPackagePublicLaunchFlagsEnabled"), "Flags de lancement public activés");
  assert.equal(t("plannedPackagePublicLaunchLegalBlocked"), "Lancement public bloqué : revue légale requise");
  assert.equal(t("plannedPackagePublicLaunchGateReady"), "Gate de lancement public prêt");
  assert.equal(t("plannedPackageRollbackAvailable"), "Rollback disponible");
});

test("code does not hardcode PACKAGE_LEGAL_REVIEW_COMPLETED true outside test helper", () => {
  const gate = read("lib/offers/plannedPackagePublicLaunchGate.ts");
  const profile = read("lib/offers/plannedPackageLaunchProfile.ts");
  assert.match(gate, /PACKAGE_LEGAL_REVIEW_COMPLETED === ["']true["']/);
  // Test-only helper may assign when options.legalReviewCompleted === true.
  assert.match(profile, /if \(options\?\.legalReviewCompleted === true\)/);
  assert.match(profile, /Does NOT hardcode PACKAGE_LEGAL_REVIEW_COMPLETED/);
  assert.doesNotMatch(read("lib/offers/packageLaunchReadiness.ts"), /PACKAGE_LEGAL_REVIEW_COMPLETED\s*=\s*["']true["']/);
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
