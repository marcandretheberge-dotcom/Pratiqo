/**
 * Teacher offers mobile layout + structured publish missing-fields polish.
 * Static/source + helper tests. Does not enable package launch flags.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  resolveTeacherOfferMissingFieldPaths,
  teacherOfferApiErrorMessage,
  teacherOfferPublishIssueLabel,
} from "../../lib/offers/display";
import { getTeacherOfferFormTypes } from "../../lib/offers/offerFormTypes";
import {
  getMissingPublishFieldsForOffer,
  missingFieldsFromPublishIssues,
  evaluateTeacherOfferPublishReadiness,
  teacherOfferDtoToPublishCandidate,
} from "../../lib/offers/publishReadiness";
import {
  OFFER_NOT_PUBLISHABLE_STATUS,
  offerNotPublishableResponseBody,
} from "../../lib/offers/offerNotPublishableResponse";
import { isPackageEntitlementsEnabled } from "../../lib/offers/packageEntitlements";
import {
  getPackageLaunchReadiness,
  PACKAGE_LAUNCH_NEVER_PRODUCTION_READY,
} from "../../lib/offers/packageLaunchReadiness";
import type { TranslationKey } from "../../lib/i18n/types";
import { t as translate } from "../../lib/translations";
import type { TeacherOfferDto } from "../../lib/offers/types";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const t = (key: TranslationKey) => translate(key, "fr");

const CARD = "components/teacher/TeacherOfferCard.tsx";
const DASHBOARD = "components/teacher/TeacherOffersDashboard.tsx";
const MISSING = "components/teacher/TeacherOfferMissingFieldsAlert.tsx";
const DISPLAY = "lib/offers/display.ts";
const CREATE_ROUTE = "app/api/teacher/offers/route.ts";
const ITEM_ROUTE = "app/api/teacher/offers/[offerId]/route.ts";
const ADMIN_READY = "app/(app)/admin/package-launch-readiness/page.tsx";

function draftOffer(overrides: Partial<TeacherOfferDto> = {}): TeacherOfferDto {
  return {
    id: "off_1",
    teacherId: "t1",
    title: "Cours de piano classique pour débutants motivés qui veulent progresser vite",
    slug: null,
    description: null,
    shortDescription: null,
    disciplineId: null,
    specialite: null,
    offerType: "private_lesson",
    format: "online",
    priceCents: 0,
    currency: "CAD",
    durationMinutes: null,
    sessionCount: null,
    capacityMin: null,
    capacityMax: null,
    level: null,
    ageMin: null,
    ageMax: null,
    requiresIdentity: false,
    requiresManualConfirmation: false,
    cancellationPreference: "standard",
    reschedulePreference: "standard",
    status: "draft",
    imageUrl: null,
    publishedAt: null,
    pausedAt: null,
    archivedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("mobile offer card stacks title above actions (no side-by-side overlap row)", () => {
  const src = read(CARD);
  assert.doesNotMatch(src, /flex flex-wrap items-start justify-between/);
  assert.match(src, /break-words/);
  assert.match(src, /flex flex-col gap-2 sm:flex-row/);
  assert.match(src, /data-testid="teacher-offer-card"/);
  assert.match(src, /TeacherOfferMissingFieldsAlert/);
});

test("long titles use break-words and full-width primary action on mobile", () => {
  const src = read(CARD);
  assert.match(src, /w-full[\s\S]*sm:w-auto/);
  assert.match(src, /teacher-offer-action-\$\{primary\}/);
  assert.match(src, /teacher-offer-action-\$\{action\}/);
});

test("structured missing-fields alert uses checklist not appended Résumé", () => {
  const alert = read(MISSING);
  assert.match(alert, /teacherOffersToComplete/);
  assert.match(alert, /teacherOffersCompleteCta/);
  assert.match(alert, /list-disc/);
  assert.equal(t("teacherOffersFieldShortDescription"), "Résumé de l’offre");
  assert.equal(t("teacherOffersToComplete"), "À compléter :");

  const msg = teacherOfferApiErrorMessage(
    {
      status: 422,
      error: "offer_not_publishable",
      missingFields: ["short_description"],
    },
    t,
  );
  assert.equal(msg, t("teacherOffersNotPublishable"));
  assert.doesNotMatch(msg, /Résumé/);
  assert.doesNotMatch(read(DISPLAY), /missing\.join/);
});

test("publish blocked when summary price duration discipline missing", () => {
  const offer = draftOffer();
  const missing = getMissingPublishFieldsForOffer(offer);
  assert.ok(missing.includes("short_description"));
  assert.ok(missing.includes("duration_minutes"));
  assert.ok(missing.includes("discipline_id"));

  const withBadPrice = evaluateTeacherOfferPublishReadiness(
    teacherOfferDtoToPublishCandidate({
      ...offer,
      priceCents: null as unknown as number,
      shortDescription: "Un cours clair pour progresser à votre rythme avec un plan simple.",
      durationMinutes: 60,
      disciplineId: "piano",
    }),
  );
  assert.equal(withBadPrice.ready, false);
  assert.ok(withBadPrice.issues.some((issue) => issue.path === "price_cents"));
});

test("publish readiness succeeds when required fields are complete", () => {
  const offer = draftOffer({
    shortDescription: "Un cours clair pour progresser à votre rythme avec un plan simple.",
    priceCents: 7000,
    durationMinutes: 60,
    disciplineId: "piano",
  });
  const result = evaluateTeacherOfferPublishReadiness(teacherOfferDtoToPublishCandidate(offer));
  assert.equal(result.ready, true);
  assert.deepEqual(getMissingPublishFieldsForOffer(offer), []);
});

test("server publish response includes 422 missingFields", () => {
  const gate = evaluateTeacherOfferPublishReadiness(teacherOfferDtoToPublishCandidate(draftOffer()));
  assert.equal(gate.ready, false);
  const body = offerNotPublishableResponseBody({
    error: "offer_not_publishable",
    issues: gate.issues,
  });
  assert.equal(body.error, "offer_not_publishable");
  assert.ok(body.missingFields.includes("short_description"));
  assert.equal(OFFER_NOT_PUBLISHABLE_STATUS, 422);
  assert.deepEqual(missingFieldsFromPublishIssues(gate.issues), body.missingFields);

  assert.match(read(CREATE_ROUTE), /OFFER_NOT_PUBLISHABLE_STATUS/);
  assert.match(read(ITEM_ROUTE), /missingFields|offerNotPublishableResponseBody/);
});

test("UI maps missing field paths to human labels", () => {
  assert.equal(teacherOfferPublishIssueLabel("short_description", t), "Résumé de l’offre");
  assert.equal(teacherOfferPublishIssueLabel("price_cents", t), "Prix (CAD)");
  assert.equal(teacherOfferPublishIssueLabel("duration_minutes", t), "Durée (minutes)");
  assert.equal(teacherOfferPublishIssueLabel("discipline_id", t), "Discipline");
  assert.deepEqual(
    resolveTeacherOfferMissingFieldPaths({ missingFields: ["short_description", "price_cents"] }),
    ["short_description", "price_cents"],
  );
});

test("dashboard shows structured missing fields and archive confirmation", () => {
  const src = read(DASHBOARD);
  assert.match(src, /TeacherOfferMissingFieldsAlert/);
  assert.match(src, /publishMissingFields/);
  assert.match(src, /getMissingPublishFieldsForOffer/);
  assert.match(src, /teacherOffersArchiveConfirmTitle/);
  assert.match(src, /archiveTarget/);
});

test("package type gated when entitlements flag is OFF", () => {
  assert.equal(isPackageEntitlementsEnabled(), false);
  assert.equal(getTeacherOfferFormTypes().includes("package"), false);
  assert.equal(getTeacherOfferFormTypes("package").includes("package"), true);
  assert.match(read("components/teacher/TeacherOfferForm.tsx"), /teacherOffersPackagesComingSoon/);
});

test("admin readiness still blocks packages without legal review", () => {
  assert.equal(PACKAGE_LAUNCH_NEVER_PRODUCTION_READY, true);
  const readiness = getPackageLaunchReadiness();
  assert.ok(
    readiness.blockers.some(
      (b) =>
        b.code === "legal_review_required" ||
        b.message.includes("PACKAGE_LEGAL_REVIEW_COMPLETED"),
    ),
  );
  assert.match(read(ADMIN_READY), /offres de cours standards peuvent fonctionner séparément/);
  assert.doesNotMatch(read(ADMIN_READY), /PACKAGE_LEGAL_REVIEW_COMPLETED\s*=\s*["']true["']/);
});

test("no package flags enabled by this polish PR surfaces", () => {
  for (const rel of [CARD, DASHBOARD, MISSING, DISPLAY, CREATE_ROUTE, ITEM_ROUTE]) {
    const src = read(rel);
    assert.doesNotMatch(src, /ENABLE_PACKAGE_ENTITLEMENTS\s*=\s*["']true["']/);
    assert.doesNotMatch(src, /PACKAGE_LEGAL_REVIEW_COMPLETED\s*=\s*["']true["']/);
  }
});

test("marketplace copy guard on teacher offers surfaces", () => {
  for (const rel of [CARD, DASHBOARD, "components/teacher/TeacherOfferForm.tsx"]) {
    const src = read(rel);
    assert.doesNotMatch(src, /Nos cours|Nos forfaits Pratiqo|Cours Pratiqo|salaire|employé|employeur/i);
  }
});

test("Stripe commission payout refund package mutation files untouched by card polish", () => {
  assert.doesNotMatch(read(CARD), /packageEntitlements|packageRedemptions|commission|payouts/);
  assert.doesNotMatch(read(DASHBOARD), /packageEntitlements|packageRedemptions|commission|checkout/);
});

for (const { name, fn } of tests) {
  fn();
  console.log(`ok - ${name}`);
}
console.log(`[offers:mobile-publish-polish] ${tests.length} tests passed`);
