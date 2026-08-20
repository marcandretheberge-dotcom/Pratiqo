/**
 * Publish quality gate for Mes offres de cours.
 * Drafts may be incomplete; published offers must meet a minimum public-quality bar.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { emptyTeacherOfferFormValues } from "../../lib/offers/clientPayload";
import {
  assertTeacherOfferPublishable,
  createInputToPublishCandidate,
  evaluateTeacherOfferPublishReadiness,
  formValuesToPublishCandidate,
  getTeacherOfferPublishChecklist,
  isTeacherOfferFormPublishReady,
  mergeTeacherOfferForPublishCheck,
  TEACHER_OFFER_PUBLISH_SHORT_DESCRIPTION_MIN,
} from "../../lib/offers/publishReadiness";
import type { TeacherOfferCreateInput, TeacherOfferDto } from "../../lib/offers/types";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const tests: Array<{ name: string; fn: () => void }> = [];
function test(name: string, fn: () => void) {
  tests.push({ name, fn });
}

const READY_SUMMARY =
  "Un cours clair et motivant pour apprendre les bases, poser vos questions et progresser.";

function readyCreate(overrides: Partial<TeacherOfferCreateInput> = {}): TeacherOfferCreateInput {
  return {
    title: "Cours privé de piano",
    slug: null,
    shortDescription: READY_SUMMARY,
    description: null,
    disciplineId: "piano",
    specialite: null,
    offerType: "private_lesson",
    format: "online",
    status: "published",
    imageUrl: null,
    priceCents: 7000,
    currency: "CAD",
    durationMinutes: 60,
    sessionCount: null,
    capacityMin: null,
    capacityMax: null,
    level: null,
    ageMin: null,
    ageMax: null,
    requiresIdentity: false,
    requiresManualConfirmation: false,
    ...overrides,
  };
}

function dto(partial: Partial<TeacherOfferDto> = {}): TeacherOfferDto {
  return {
    id: "offer-1",
    teacherId: "teacher-1",
    title: "Piano",
    slug: null,
    shortDescription: READY_SUMMARY,
    description: null,
    disciplineId: "piano",
    specialite: null,
    offerType: "private_lesson",
    format: "online",
    status: "draft",
    imageUrl: null,
    priceCents: 7000,
    currency: "CAD",
    durationMinutes: 60,
    sessionCount: null,
    capacityMin: null,
    capacityMax: null,
    level: null,
    ageMin: null,
    ageMax: null,
    requiresIdentity: false,
    requiresManualConfirmation: false,
    publishedAt: null,
    pausedAt: null,
    archivedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...partial,
  };
}

test("publish requires disciplineId, durationMinutes, and shortDescription", () => {
  const missingDiscipline = evaluateTeacherOfferPublishReadiness(
    createInputToPublishCandidate(readyCreate({ disciplineId: null })),
  );
  assert.equal(missingDiscipline.ready, false);
  assert.ok(missingDiscipline.issues.some((issue) => issue.path === "discipline_id"));

  const missingDuration = evaluateTeacherOfferPublishReadiness(
    createInputToPublishCandidate(readyCreate({ durationMinutes: null })),
  );
  assert.equal(missingDuration.ready, false);
  assert.ok(missingDuration.issues.some((issue) => issue.path === "duration_minutes"));

  const missingSummary = evaluateTeacherOfferPublishReadiness(
    createInputToPublishCandidate(readyCreate({ shortDescription: "Trop court" })),
  );
  assert.equal(missingSummary.ready, false);
  assert.ok(missingSummary.issues.some((issue) => issue.path === "short_description"));
  assert.ok(READY_SUMMARY.length >= TEACHER_OFFER_PUBLISH_SHORT_DESCRIPTION_MIN);
});

test("package publish requires sessionCount", () => {
  const missing = assertTeacherOfferPublishable(
    createInputToPublishCandidate(
      readyCreate({ offerType: "package", sessionCount: null, title: "Forfait piano" }),
    ),
  );
  assert.equal(missing.ok, false);
  if (missing.ok) return;
  assert.equal(missing.error, "offer_not_publishable");
  assert.ok(missing.issues.some((issue) => issue.path === "session_count"));

  const ok = assertTeacherOfferPublishable(
    createInputToPublishCandidate(
      readyCreate({ offerType: "package", sessionCount: 5, title: "Forfait piano" }),
    ),
  );
  assert.equal(ok.ok, true);
});

test("complete publish candidate is accepted", () => {
  const result = assertTeacherOfferPublishable(createInputToPublishCandidate(readyCreate()));
  assert.equal(result.ok, true);
});

test("PATCH publish merges current offer before validating", () => {
  const current = dto({
    shortDescription: null,
    disciplineId: null,
    durationMinutes: null,
  });
  const incomplete = assertTeacherOfferPublishable(
    mergeTeacherOfferForPublishCheck(current, { status: "published" }),
  );
  assert.equal(incomplete.ok, false);
  if (incomplete.ok) return;
  assert.equal(incomplete.error, "offer_not_publishable");
  assert.ok(incomplete.issues.some((issue) => issue.path === "discipline_id"));
  assert.ok(incomplete.issues.some((issue) => issue.path === "duration_minutes"));
  assert.ok(incomplete.issues.some((issue) => issue.path === "short_description"));

  const complete = assertTeacherOfferPublishable(
    mergeTeacherOfferForPublishCheck(current, {
      status: "published",
      disciplineId: "piano",
      durationMinutes: 60,
      shortDescription: READY_SUMMARY,
    }),
  );
  assert.equal(complete.ok, true);
});

test("draft form values remain saveable while publish checklist is incomplete", () => {
  const values = emptyTeacherOfferFormValues();
  values.title = "Brouillon piano";
  values.priceDollars = "70.00";
  assert.equal(isTeacherOfferFormPublishReady(values), false);
  const checklist = getTeacherOfferPublishChecklist(values);
  assert.ok(checklist.some((item) => item.id === "disciplineId" && !item.ok));
  assert.ok(checklist.some((item) => item.id === "shortDescription" && !item.ok));
});

test("form publish readiness requires package session count", () => {
  const values = emptyTeacherOfferFormValues();
  values.title = "Forfait espagnol";
  values.offerType = "package";
  values.disciplineId = "espagnol";
  values.priceDollars = "250.00";
  values.durationMinutes = "60";
  values.shortDescription = READY_SUMMARY;
  values.sessionCount = "";
  assert.equal(isTeacherOfferFormPublishReady(values), false);
  values.sessionCount = "5";
  assert.equal(isTeacherOfferFormPublishReady(values), true);
  assert.equal(formValuesToPublishCandidate(values).sessionCount, 5);
});

test("API routes enforce offer_not_publishable on publish", () => {
  const createRoute = read("app/api/teacher/offers/route.ts");
  const itemRoute = read("app/api/teacher/offers/[offerId]/route.ts");
  assert.match(createRoute, /assertTeacherOfferPublishable/);
  assert.match(createRoute, /offer_not_publishable|publishGate\.error/);
  assert.match(itemRoute, /mergeTeacherOfferForPublishCheck/);
  assert.match(itemRoute, /nextStatus === "published"/);
});

test("offer builder UI shows sections checklist preview and dual actions", () => {
  const form = read("components/teacher/TeacherOfferForm.tsx");
  const dashboard = read("components/teacher/TeacherOffersDashboard.tsx");
  const preview = read("components/teacher/TeacherOfferPreview.tsx");
  const checklist = read("components/teacher/TeacherOfferPublishChecklist.tsx");

  assert.match(form, /teacherOffersSectionEssentials/);
  assert.match(form, /teacherOffersSectionPresentation/);
  assert.match(form, /teacherOffersSectionAdvanced/);
  assert.match(form, /teacherOffersPlaceholderTitle/);
  assert.match(form, /teacherOffersPlaceholderShortDescription/);
  assert.match(form, /TeacherOfferPublishChecklist/);
  assert.match(form, /TeacherOfferPreview/);
  assert.match(form, /onSaveDraft/);
  assert.match(form, /onPublish/);
  assert.match(form, /teacherOffersPublishDisabledHint/);
  assert.doesNotMatch(form, /workshop|group_class|cohort|self_paced_bridge/);
  assert.doesNotMatch(form, /type=["']file["']|drag.?drop|image upload/i);

  assert.match(dashboard, /handleSave\("draft"\)/);
  assert.match(dashboard, /handleSave\("published"\)/);
  assert.match(dashboard, /max-w-5xl/);

  assert.match(preview, /never fetches teacher_offers|Uses form state only/i);
  assert.match(preview, /Future PR: offer cover image upload/);
  assert.doesNotMatch(preview, /fetch\(|from\(["']teacher_offers["']\)/);
  assert.match(checklist, /teacherOffersPublishReady|teacherOffersPublishIncomplete/);
});

test("no Stripe payment booking package redemption or catalog surface", () => {
  for (const rel of [
    "lib/offers/publishReadiness.ts",
    "components/teacher/TeacherOfferForm.tsx",
    "components/teacher/TeacherOfferPreview.tsx",
    "components/teacher/TeacherOfferPublishChecklist.tsx",
    "components/teacher/TeacherOffersDashboard.tsx",
  ]) {
    const src = read(rel);
    assert.doesNotMatch(src, /Mes formules|\bformules\b|\bannonces\b/);
    assert.doesNotMatch(src, /package_entitlements|remaining_sessions|used_sessions/);
    assert.doesNotMatch(src, /stripe|checkout\.sessions|application_fee/i);
  }
  assert.doesNotMatch(read("app/api/stripe/checkout/route.ts"), /publishReadiness|TeacherOfferForm/);
  assert.doesNotMatch(read("components/BookingModal.tsx"), /TeacherOfferPublishChecklist/);
});

for (const { name, fn } of tests) {
  fn();
  console.log(`ok - ${name}`);
}
console.log(`[offers:publish-readiness] ${tests.length} tests passed`);
