/**
 * Phase 1 planned packages skeleton — flags default OFF, no checkout/payout.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getTeacherOfferFormTypes } from "../../lib/offers/offerFormTypes";
import {
  assertPlannedPackageDraftAllowed,
  assertPlannedPackagePublishAllowed,
  canPubliclyPurchasePlannedPackage,
  canShowPlannedPackageOnPublicProfile,
  getPlannedPackagePublicLaunchBlockers,
  isPlannedPackageOfferType,
  isPlannedPackagesEnabled,
  isValidPlannedPackageSessionCount,
  PLANNED_PACKAGE_SESSION_COUNT_MIN,
} from "../../lib/offers/plannedPackages";
import { evaluateTeacherOfferPublishReadiness } from "../../lib/offers/publishReadiness";
import { filterPublishedPublicTeacherOffers } from "../../lib/offers/publicTeacherOfferDto";
import { getPackageLaunchReadiness } from "../../lib/offers/packageLaunchReadiness";
import type { TranslationKey } from "../../lib/i18n/types";
import { t as translate } from "../../lib/translations";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const tests: Array<{ name: string; fn: () => void }> = [];
function test(name: string, fn: () => void) {
  tests.push({ name, fn });
}

const t = (key: TranslationKey) => translate(key, "fr");

const prev = {
  planned: process.env.ENABLE_PLANNED_PACKAGES,
  plannedUi: process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGES,
  legal: process.env.PACKAGE_LEGAL_REVIEW_COMPLETED,
  entitlements: process.env.ENABLE_PACKAGE_ENTITLEMENTS,
};

function resetFlags() {
  delete process.env.ENABLE_PLANNED_PACKAGES;
  delete process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGES;
  delete process.env.PACKAGE_LEGAL_REVIEW_COMPLETED;
  delete process.env.ENABLE_PACKAGE_ENTITLEMENTS;
}

test("planned packages flag defaults OFF", () => {
  resetFlags();
  assert.equal(isPlannedPackagesEnabled(), false);
  assert.equal(getTeacherOfferFormTypes().includes("package"), false);
  assert.equal(assertPlannedPackageDraftAllowed("package").ok, false);
});

test("planned packages flag ON allows draft form type", () => {
  resetFlags();
  process.env.ENABLE_PLANNED_PACKAGES = "true";
  assert.equal(isPlannedPackagesEnabled(), true);
  assert.equal(getTeacherOfferFormTypes().includes("package"), true);
  assert.equal(assertPlannedPackageDraftAllowed("package").ok, true);
  assert.equal(isPlannedPackageOfferType("package"), true);
});

test("session_count must be >= 2 for planned package publish readiness", () => {
  const missing = evaluateTeacherOfferPublishReadiness({
    title: "Préparation audition",
    offerType: "package",
    disciplineId: "piano",
    format: "online",
    priceCents: 20000,
    durationMinutes: 60,
    shortDescription: "Un parcours clair de quatre séances pour préparer votre audition.",
    sessionCount: 1,
  });
  assert.equal(missing.ready, false);
  assert.ok(missing.issues.some((i) => i.path === "session_count"));

  const ok = evaluateTeacherOfferPublishReadiness({
    title: "Préparation audition",
    offerType: "package",
    disciplineId: "piano",
    format: "online",
    priceCents: 20000,
    durationMinutes: 60,
    shortDescription: "Un parcours clair de quatre séances pour préparer votre audition.",
    sessionCount: PLANNED_PACKAGE_SESSION_COUNT_MIN,
  });
  assert.equal(ok.ready, true);
  assert.equal(isValidPlannedPackageSessionCount(2), true);
  assert.equal(isValidPlannedPackageSessionCount(1), false);
});

test("price duration and session fields required for planned packages", () => {
  const result = evaluateTeacherOfferPublishReadiness({
    title: "Préparation audition",
    offerType: "package",
    disciplineId: null,
    format: "online",
    priceCents: null,
    durationMinutes: null,
    shortDescription: "Un parcours clair de quatre séances pour préparer votre audition.",
    sessionCount: null,
  });
  assert.equal(result.ready, false);
  const paths = result.issues.map((i) => i.path);
  assert.ok(paths.includes("price_cents"));
  assert.ok(paths.includes("duration_minutes"));
  assert.ok(paths.includes("session_count"));
  assert.ok(paths.includes("discipline_id"));
});

test("planned package cannot be publicly purchasable without legal review and launch gates", () => {
  resetFlags();
  process.env.ENABLE_PLANNED_PACKAGES = "true";
  process.env.ENABLE_PACKAGE_ENTITLEMENTS = "true";
  process.env.PACKAGE_LEGAL_REVIEW_COMPLETED = "true";
  // Skeleton always keeps progressive payout / refund draft blockers.
  assert.equal(canPubliclyPurchasePlannedPackage(), false);
  assert.ok(getPlannedPackagePublicLaunchBlockers().includes("progressive_payout_not_ready"));
  assert.ok(getPlannedPackagePublicLaunchBlockers().includes("package_refund_policy_draft"));

  resetFlags();
  const blocked = assertPlannedPackagePublishAllowed("package");
  assert.equal(blocked.ok, false);
  if (!blocked.ok) {
    assert.ok(blocked.blockers.includes("package_legal_review_required"));
    assert.ok(blocked.blockers.includes("package_purchase_disabled"));
  }
});

test("public profile hides planned packages while purchase is blocked", () => {
  resetFlags();
  assert.equal(canShowPlannedPackageOnPublicProfile(), false);
  const rows = [
    {
      id: "o1",
      teacher_id: "t1",
      title: "Cours privé",
      offer_type: "private_lesson",
      format: "online",
      status: "published",
      currency: "CAD",
      price_cents: 7000,
      published_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      requires_identity: false,
      requires_manual_confirmation: false,
      cancellation_preference: "standard",
      reschedule_preference: "standard",
    },
    {
      id: "o2",
      teacher_id: "t1",
      title: "Forfait planifié",
      offer_type: "package",
      format: "online",
      status: "published",
      currency: "CAD",
      price_cents: 20000,
      session_count: 4,
      duration_minutes: 60,
      published_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      requires_identity: false,
      requires_manual_confirmation: false,
      cancellation_preference: "standard",
      reschedule_preference: "standard",
    },
  ];
  const filtered = filterPublishedPublicTeacherOffers(rows, "t1");
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.offerType, "private_lesson");
});

test("admin readiness shows Phase 1 and keeps legal blocker", () => {
  resetFlags();
  const readiness = getPackageLaunchReadiness();
  assert.equal(readiness.checks.plannedPackageSkeletonPresent, true);
  assert.equal(readiness.checks.plannedPackagePublicPurchaseBlocked, true);
  assert.equal(readiness.checks.progressivePayoutNotImplemented, true);
  assert.equal(readiness.checks.refundPolicyStillDraft, true);
  assert.equal(readiness.checks.legalReviewCompletedSignal, false);
  assert.ok(readiness.blockers.some((b) => b.code === "legal_review_required"));

  const page = read("app/(app)/admin/package-launch-readiness/page.tsx");
  assert.match(page, /Phase 1 — Forfaits planifiés/);
  assert.match(page, /package-launch-phase1/);
  assert.doesNotMatch(page, /type=["']checkbox["']/);
});

test("API routes gate planned package draft and publish", () => {
  assert.match(read("app/api/teacher/offers/route.ts"), /assertPlannedPackageDraftAllowed/);
  assert.match(read("app/api/teacher/offers/route.ts"), /assertPlannedPackagePublishAllowed/);
  assert.match(read("app/api/teacher/offers/[offerId]/route.ts"), /assertPlannedPackagePublishAllowed/);
  assert.match(read("components/teacher/TeacherOfferForm.tsx"), /teacherOffersPlannedPackageHint/);
});

test("i18n planned package labels", () => {
  assert.equal(t("teacherOffersTypePackage"), "Forfait planifié");
  assert.equal(t("teacherOffersFieldSessionCount"), "Nombre de séances");
  assert.match(t("teacherOffersPlannedPackageHint"), /séances proposées par vous/);
  assert.match(t("teacherOffersBlockerLegalReview"), /Revue légale/);
});

test("no Stripe checkout or mutation surfaces changed by planned package skeleton", () => {
  assert.doesNotMatch(read("lib/offers/plannedPackages.ts"), /stripe|checkout\.sessions|application_fee/i);
  assert.doesNotMatch(read("app/api/stripe/checkout/route.ts"), /plannedPackages|ENABLE_PLANNED_PACKAGES/);
  assert.doesNotMatch(read("lib/payments/commission.ts"), /ENABLE_PLANNED_PACKAGES/);
  assert.doesNotMatch(read("lib/payments/refunds.ts"), /ENABLE_PLANNED_PACKAGES/);
  assert.doesNotMatch(read("lib/offers/packageEntitlements.ts"), /ENABLE_PLANNED_PACKAGES/);
  assert.doesNotMatch(read("lib/offers/packageRedemptions.ts"), /ENABLE_PLANNED_PACKAGES/);
  assert.doesNotMatch(read("lib/offers/plannedPackages.ts"), /ENABLE_PACKAGE_ENTITLEMENTS\s*=\s*["']true["']/);
  assert.equal(existsSync(join(ROOT, "lib/offers/plannedPackages.ts")), true);
});

test("marketplace copy guard on planned package surfaces", () => {
  for (const rel of [
    "lib/offers/plannedPackages.ts",
    "components/teacher/TeacherOfferForm.tsx",
    "app/(app)/admin/package-launch-readiness/page.tsx",
  ]) {
    const src = read(rel);
    assert.doesNotMatch(src, /Forfait Pratiqo|Banque d[’']heures|Nos forfaits|salaire|Pratiqo assigne/i);
  }
});

for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } finally {
    // restore between tests partially via resetFlags in each; final restore below
  }
}

if (prev.planned === undefined) delete process.env.ENABLE_PLANNED_PACKAGES;
else process.env.ENABLE_PLANNED_PACKAGES = prev.planned;
if (prev.plannedUi === undefined) delete process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGES;
else process.env.NEXT_PUBLIC_ENABLE_PLANNED_PACKAGES = prev.plannedUi;
if (prev.legal === undefined) delete process.env.PACKAGE_LEGAL_REVIEW_COMPLETED;
else process.env.PACKAGE_LEGAL_REVIEW_COMPLETED = prev.legal;
if (prev.entitlements === undefined) delete process.env.ENABLE_PACKAGE_ENTITLEMENTS;
else process.env.ENABLE_PACKAGE_ENTITLEMENTS = prev.entitlements;

console.log(`[offers:planned-packages-skeleton] ${tests.length} tests passed`);
