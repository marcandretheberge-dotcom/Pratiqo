/**
 * Teacher dashboard UI for Mes offres de cours.
 * Static + helper tests. No Stripe, booking, or public catalog coverage.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildTeacherOfferWritePayload,
  dollarsInputToPriceCents,
  emptyTeacherOfferFormValues,
  priceCentsToDollarsInput,
  teacherOfferPayloadHasForbiddenKeys,
} from "../../lib/offers/clientPayload";
import {
  formatTeacherOfferFormatLabel,
  formatTeacherOfferStatusLabel,
  formatTeacherOfferTypeLabel,
  getTeacherOfferStatusActions,
} from "../../lib/offers/display";
import type { TranslationKey } from "../../lib/i18n/types";
import { t as translate } from "../../lib/translations";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const PAGE = "app/(app)/teacher/offers/page.tsx";
const DASHBOARD = "components/teacher/TeacherOffersDashboard.tsx";
const FORM = "components/teacher/TeacherOfferForm.tsx";
const CARD = "components/teacher/TeacherOfferCard.tsx";
const NAV = "components/teacher/teacherNavConfig.ts";
const SHELL = "components/AppShell.tsx";
const CLIENT = "lib/offers/teacherOffersClient.ts";
const PAYLOAD = "lib/offers/clientPayload.ts";

const t = (key: TranslationKey) => translate(key, "fr");

test("teacher offers dashboard route/page exists", () => {
  assert.equal(existsSync(join(ROOT, PAGE)), true);
  assert.equal(existsSync(join(ROOT, DASHBOARD)), true);
  assert.match(read(PAGE), /TeacherOffersDashboard/);
  assert.match(read(DASHBOARD), /teacherOffersTitle/);
});

test("page title Mes offres de cours renders", () => {
  assert.equal(t("teacherOffersTitle"), "Mes offres de cours");
  assert.match(read(DASHBOARD), /t\("teacherOffersTitle"\)/);
});

test("empty state renders when GET returns no offers", () => {
  const src = read(DASHBOARD);
  assert.match(src, /offers\.length === 0/);
  assert.match(src, /teacherOffersEmptyTitle/);
  assert.match(src, /teacherOffersEmptyBody/);
  assert.match(src, /teacherOffersCreateCta/);
});

test("list renders offers from { offers }", () => {
  const src = read(DASHBOARD);
  assert.match(src, /fetchTeacherOffers/);
  assert.match(src, /result\.data\.offers/);
  assert.match(src, /TeacherOfferCard/);
  assert.match(read(CLIENT), /\/api\/teacher\/offers/);
  assert.match(read(CLIENT), /offers: \(payload as \{ offers: TeacherOfferDto\[\] \}\)\.offers/);
});

test("offer labels render human-readable type/format/status", () => {
  assert.equal(formatTeacherOfferTypeLabel("private_lesson", t), "Cours privé");
  assert.equal(formatTeacherOfferTypeLabel("package", t), "Forfait");
  assert.equal(formatTeacherOfferTypeLabel("intro_session", t), "Séance d’introduction");
  assert.equal(formatTeacherOfferFormatLabel("online", t), "En ligne");
  assert.equal(formatTeacherOfferFormatLabel("in_person", t), "Présentiel");
  assert.equal(formatTeacherOfferStatusLabel("draft", t), "Brouillon");
  assert.equal(formatTeacherOfferStatusLabel("published", t), "Publiée");
  assert.doesNotMatch(formatTeacherOfferTypeLabel("private_lesson", t), /private_lesson/);
  assert.match(read(CARD), /formatTeacherOfferTypeLabel/);
  assert.match(read(FORM), /TEACHER_OFFER_MVP_TYPES/);
  assert.doesNotMatch(read(FORM), /workshop|group_class|cohort|self_paced_bridge/);
});

test("create form converts CAD dollars to price_cents correctly", () => {
  assert.equal(dollarsInputToPriceCents("70.00"), 7000);
  assert.equal(dollarsInputToPriceCents("70"), 7000);
  assert.equal(dollarsInputToPriceCents("70,50"), 7050);
  assert.equal(dollarsInputToPriceCents("0.10"), 10);
  assert.equal(dollarsInputToPriceCents("-1"), null);
  assert.equal(dollarsInputToPriceCents("70.123"), null);
  assert.equal(priceCentsToDollarsInput(7000), "70.00");
});

test("create form submits POST with mutable fields only", () => {
  const values = emptyTeacherOfferFormValues();
  values.title = "Cours de piano";
  values.offerType = "private_lesson";
  values.format = "online";
  values.priceDollars = "70.00";
  const parsed = buildTeacherOfferWritePayload(values);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.body.price_cents, 7000);
  assert.equal(parsed.body.offer_type, "private_lesson");
  assert.equal(teacherOfferPayloadHasForbiddenKeys(parsed.body), false);
  assert.equal("teacher_id" in parsed.body, false);
  assert.equal("created_by" in parsed.body, false);
  assert.equal("published_at" in parsed.body, false);
  assert.match(read(CLIENT), /method: "POST"/);
  assert.match(read(DASHBOARD), /createTeacherOffer\(body\)/);
});

test("edit form submits PATCH /api/teacher/offers/[offerId]", () => {
  assert.match(read(CLIENT), /method: "PATCH"/);
  assert.match(read(CLIENT), /\/api\/teacher\/offers\/\$\{offerId\}/);
  assert.match(read(DASHBOARD), /updateTeacherOffer\(editingId, body\)/);
});

test("publish action sends status published", () => {
  const src = read(DASHBOARD);
  assert.match(src, /status = action === "pause" \? "paused" : "published"/);
  assert.match(src, /updateTeacherOffer\(offer\.id, \{ status \}\)/);
  assert.match(src, /Future: published offer limits will depend on plan\/founder status/);
  assert.match(src, /handleSave\("published"\)/);
});

test("form builder shows guided sections checklist and preview", () => {
  const form = read(FORM);
  assert.match(form, /teacherOffersSectionEssentials/);
  assert.match(form, /teacherOffersSectionPresentation/);
  assert.match(form, /teacherOffersSectionAdvanced/);
  assert.match(form, /TeacherOfferPublishChecklist/);
  assert.match(form, /TeacherOfferPreview/);
  assert.match(form, /teacherOffersSaveDraft/);
  assert.match(form, /teacherOffersPublish/);
  assert.match(form, /teacherOffersPlaceholderTitle/);
  assert.doesNotMatch(form, /workshop|group_class|cohort|self_paced_bridge/);
});

test("draft save remains available when publish is not ready", () => {
  const dashboard = read(DASHBOARD);
  assert.match(dashboard, /onSaveDraft=\{\(\) => void handleSave\("draft"\)\}/);
  assert.match(dashboard, /onPublish=\{\(\) => void handleSave\("published"\)\}/);
  assert.match(read(FORM), /disabled=\{saving \|\| !publishReady\}/);
});

test("pause action sends status paused", () => {
  assert.deepEqual(getTeacherOfferStatusActions("published"), ["edit", "pause", "archive"]);
  assert.match(read(DASHBOARD), /"paused"/);
});

test("archive action uses DELETE", () => {
  assert.match(read(CLIENT), /method: "DELETE"/);
  assert.match(read(DASHBOARD), /archiveTeacherOffer/);
  assert.match(read(DASHBOARD), /teacherOffersArchiveConfirmTitle/);
});

test("archived offers do not show restore/publish action", () => {
  assert.deepEqual(getTeacherOfferStatusActions("archived"), ["view"]);
  assert.doesNotMatch(read(DASHBOARD), /restore|reactivat/i);
  assert.match(read(DASHBOARD), /editor === "view"/);
});

test("API validation errors are displayed", () => {
  const src = read(DASHBOARD);
  assert.match(src, /teacherOfferApiErrorMessage/);
  assert.match(src, /formErrors/);
  assert.match(read(FORM), /teacherOfferFormErrorKey/);
});

test("loading and error states render", () => {
  const src = read(DASHBOARD);
  assert.match(src, /teacherOffersLoading/);
  assert.match(src, /loadError/);
  assert.match(src, /teacherOffersRetry/);
});

test("navigation includes teacher offers link for teacher dashboard only", () => {
  const nav = read(NAV);
  assert.match(nav, /\/teacher\/offers/);
  assert.match(nav, /teacherOffersNav/);
  assert.doesNotMatch(read(SHELL), /href: "\/teacher\/offers"/);
  const studentNav = read(SHELL).match(/const STUDENT_NAV[\s\S]*?;/)?.[0] ?? "";
  assert.doesNotMatch(studentNav, /teacherOffersNav|\/teacher\/offers/);
});

test("no Stripe/payment/checkout/booking files changed", () => {
  for (const rel of [
    "app/api/stripe/checkout/route.ts",
    "app/api/stripe/webhook/route.ts",
    "lib/payments/commission.ts",
    "lib/pricing/bookingCharge.ts",
    "components/BookingModal.tsx",
    "components/TeacherProfile.tsx",
  ]) {
    const src = read(rel);
    assert.doesNotMatch(src, /\/api\/teacher\/offers/);
    assert.doesNotMatch(src, /TeacherOffersDashboard/);
  }
});

test("no Mes formules / formules product label introduced", () => {
  for (const rel of [PAGE, DASHBOARD, FORM, CARD, NAV, PAYLOAD, "lib/offers/display.ts", "lib/i18n/locales/fr.json"]) {
    const src = read(rel);
    assert.doesNotMatch(src, /Mes formules/);
    assert.doesNotMatch(src, /\bformules\b/);
    assert.doesNotMatch(src, /\bannonces\b/);
  }
  assert.match(read("lib/i18n/locales/fr.json"), /"teacherOffersTypePackage": "Forfait"/);
});

test("client payload validation mirrors required fields", () => {
  const empty = buildTeacherOfferWritePayload(emptyTeacherOfferFormValues());
  assert.equal(empty.ok, false);
  if (empty.ok) return;
  assert.ok(empty.errors.includes("title"));
  assert.ok(empty.errors.includes("price"));
});

(async () => {
  let passed = 0;
  for (const { name, fn } of tests) {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  }
  console.log(`\n[offers:teacher-offers-dashboard] ${passed} assertions passed.`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
