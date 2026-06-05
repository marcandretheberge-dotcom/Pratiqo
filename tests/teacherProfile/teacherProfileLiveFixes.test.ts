/**
 * Live-fix regression tests for teacher profile management (June launch).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

function stripJsComments(src: string): string {
  const noBlock = src.replace(/\/\*[\s\S]*?\*\//g, "");
  return noBlock
    .split("\n")
    .map((line) => line.replace(/(^|[^:])\/\/.*$/, "$1"))
    .join("\n");
}

const LOCATION_VERIFY = read("app/api/teacher/location/verify/route.ts");
const LOCATION_LIB = read("lib/teacherLocationVerification.ts");
const VERIFICATION_PAGE = read("app/(app)/teacher/verification/page.tsx");
const VERIFICATION_STATE = read("lib/verificationState.ts");
const AI_ROUTE = read("app/api/ai/description/route.ts");
const AI_COMPONENT = read("components/teacher/ProfileAiAssistant.tsx");
const PAYOUT_PREVIEW = read("components/teacher/TeacherPayoutPreview.tsx");
const PAYOUT_LIB = read("lib/payments/payoutPreview.ts");
const DISC_EDITOR = read("components/teacher/TeacherDisciplinesEditor.tsx");
const FR = JSON.parse(read("lib/i18n/locales/fr.json")) as Record<string, string>;
const EN = JSON.parse(read("lib/i18n/locales/en.json")) as Record<string, string>;
const ES = JSON.parse(read("lib/i18n/locales/es.json")) as Record<string, string>;

test("location verify: writes only allowed location_verification_method values", () => {
  assert.match(LOCATION_VERIFY, /resolveLocationVerificationWrite/);
  assert.doesNotMatch(LOCATION_VERIFY, /address_geocoding/);
  assert.match(LOCATION_LIB, /"manual"/);
  assert.match(LOCATION_LIB, /"other"/);
  for (const allowed of ["manual", "booking_history", "document", "other"]) {
    assert.ok(LOCATION_LIB.includes(`"${allowed}"`), `missing allowed method ${allowed}`);
  }
});

test("location verify: writes allowed location_verification_status values", () => {
  assert.doesNotMatch(LOCATION_VERIFY, /auto_verified/);
  assert.match(LOCATION_LIB, /status: "verified"/);
  assert.match(LOCATION_LIB, /status: "pending"/);
});

test("zone card: deriveEffectiveZoneState treats pending save as in review", () => {
  assert.match(VERIFICATION_STATE, /export function deriveEffectiveZoneState/);
  assert.match(VERIFICATION_PAGE, /deriveEffectiveZoneState/);
  assert.match(VERIFICATION_PAGE, /zoneState/);
  assert.doesNotMatch(VERIFICATION_PAGE, /state=\{vState\.zone\}/);
});

test("availability card: always shows schedule CTA link with duration summary", () => {
  assert.match(VERIFICATION_PAGE, /editScheduleAndDuration/);
  assert.match(VERIFICATION_PAGE, /lessonDurationSummaryText/);
  assert.match(VERIFICATION_PAGE, /ctaHref="\/teacher\/schedule"/);
  assert.match(VERIFICATION_PAGE, /data-testid=\{\`\$\{testid\}-cta\`\}/);
});

test("disciplines: no plain free-text discipline input on profile management page", () => {
  assert.doesNotMatch(VERIFICATION_PAGE, /\[editDiscipline, setEditDiscipline\]/);
  assert.doesNotMatch(VERIFICATION_PAGE, /value=\{editDiscipline\}/);
  assert.match(VERIFICATION_PAGE, /TeacherDisciplinesEditor/);
  assert.match(VERIFICATION_PAGE, /teacher-profile-mgmt-add-discipline/);
  assert.match(VERIFICATION_PAGE, /teacher_disciplines/);
});

test("disciplines: controlled selector uses enabled discipline catalog", () => {
  assert.match(DISC_EDITOR, /getEnabledDisciplines/);
  assert.match(DISC_EDITOR, /<select/);
  assert.match(DISC_EDITOR, /disciplineCategory/);
});

test("disciplines: language category exposes language specialty selector", () => {
  assert.match(DISC_EDITOR, /PRESET_SPECIALTIES/);
  assert.match(DISC_EDITOR, /langues/);
  assert.match(DISC_EDITOR, /Coréen/);
  assert.match(DISC_EDITOR, /Français/);
});

test("disciplines: teaching formats still saved via teaching_mode update", () => {
  assert.match(VERIFICATION_PAGE, /encodeTeachingMode/);
  assert.match(VERIFICATION_PAGE, /teaching_mode: teachingMode/);
  assert.match(VERIFICATION_PAGE, /saveDisciplinesFormats/);
});

test("profile management: pricing section uses base-rate label and hourly-rate preview", () => {
  assert.match(VERIFICATION_PAGE, /profileBaseRateLabel/);
  // The pricing card was migrated from `TeacherPayoutPreview` (which
  // accepts a flat session subtotal) to `TeacherHourlyRatePreview`, the
  // duration-aware preview built on top of the same commission helper.
  // See the launch contract: "lesson price = hourly rate * duration / 60".
  assert.match(VERIFICATION_PAGE, /TeacherHourlyRatePreview/);
});

test("AI assistant: bearer token auth uses getUser(token) on server route", () => {
  assert.match(AI_ROUTE, /getUser\(token\)/);
  assert.doesNotMatch(stripJsComments(AI_ROUTE), /teacher_onboarding_complete\s*===\s*true/);
});

test("AI assistant: server verifies teacher via admin profile role or teachers row", () => {
  assert.match(AI_ROUTE, /getSupabaseAdmin\(\)/);
  assert.match(AI_ROUTE, /\.from\("teachers"\)/);
  assert.match(AI_ROUTE, /profileRole === "teacher"/);
  assert.match(AI_ROUTE, /Boolean\(teacherRow\?\.id\)/);
  assert.doesNotMatch(stripJsComments(AI_ROUTE), /\.from\("profiles"\)[\s\S]*?\.eq\("id", user\.id\)[\s\S]*?row\?\.role !== "teacher"/);
});

test("AI assistant: non-teachers are still rejected with 403", () => {
  assert.match(AI_ROUTE, /if \(!isTeacher\)/);
  assert.match(AI_ROUTE, /status: 403/);
  assert.match(AI_ROUTE, /Réservé aux professeurs/);
});

test("AI assistant: missing Anthropic key returns 503 with anthropic_key_missing code", () => {
  assert.match(AI_ROUTE, /anthropic_key_missing/);
  assert.match(AI_ROUTE, /status: 503/);
  const keyCheckIdx = AI_ROUTE.indexOf("anthropic_key_missing");
  const teacherGateIdx = AI_ROUTE.indexOf('if (!isTeacher)');
  assert.ok(keyCheckIdx > teacherGateIdx, "missing-key check must come after teacher gate");
});

test("AI assistant: ProfileAiAssistant sends Authorization bearer header", () => {
  assert.match(AI_COMPONENT, /Authorization:\s*`Bearer \$\{token\}`/);
  assert.match(AI_COMPONENT, /session\?\.access_token/);
});

test("AI assistant: surfaces missing-key, forbidden, and generic errors from i18n", () => {
  assert.match(AI_COMPONENT, /aiAssistantErrorMissingKey/);
  assert.match(AI_COMPONENT, /aiAssistantErrorForbidden/);
  assert.match(AI_COMPONENT, /aiAssistantErrorGeneric/);
  assert.match(AI_COMPONENT, /payload\.code === "anthropic_key_missing"/);
  assert.match(AI_COMPONENT, /res\.status === 403/);
  assert.doesNotMatch(AI_COMPONENT, /ANTHROPIC_API_KEY/);
  assert.doesNotMatch(AI_COMPONENT, /x-api-key/);
});

test("TeacherPayoutPreview: uses locale display currency via formatDisplayPrice", () => {
  assert.match(PAYOUT_PREVIEW, /currency: displayCurrency/);
  assert.match(PAYOUT_PREVIEW, /formatDisplayPrice/);
  assert.match(PAYOUT_PREVIEW, /formatCurrencyAmount/);
  assert.match(PAYOUT_PREVIEW, /teacherPayoutPreviewBasePrice/);
});

test("TeacherPayoutPreview: keeps CAD as accounting source for payout math", () => {
  assert.match(PAYOUT_PREVIEW, /currency: sourceCurrency/);
  assert.match(PAYOUT_LIB, /calculateBookingAmounts/);
  assert.doesNotMatch(PAYOUT_PREVIEW, /convertCurrencyAmount/);
});

test("TeacherPayoutPreview: USD display shows converted net estimate, not CAD-only sentence", () => {
  assert.match(PAYOUT_PREVIEW, /netDisplay\.approximate \? `≈ \$\{netDisplay\.primary\}`/);
  assert.match(PAYOUT_PREVIEW, /teacherPayoutPreviewBasePrice/);
  assert.doesNotMatch(PAYOUT_PREVIEW, /formattedTeacherNet/);
});

test("currency urgent fix: no Stripe or payment math files touched in this patch set", () => {
  const touched = [
    "components/teacher/TeacherPayoutPreview.tsx",
    "app/(app)/teacher/verification/page.tsx",
    "lib/i18n/locales/fr.json",
    "lib/i18n/locales/en.json",
    "lib/i18n/locales/es.json",
  ];
  for (const file of touched) {
    const src = read(file);
    assert.doesNotMatch(src, /stripe\.(checkout|webhooks)/i);
    assert.doesNotMatch(src, /calculateBookingAmounts/);
  }
});

test("i18n: live-fix keys exist in fr / en / es", () => {
  for (const locale of [FR, EN, ES]) {
    for (const key of [
      "aiAssistantErrorMissingKey",
      "aiAssistantErrorForbidden",
      "aiAssistantErrorGeneric",
      "profileBaseRateLabel",
      "teacherPayoutPreviewBasePrice",
      "teacherProfileMgmtAvailabilityCta",
      "editScheduleAndDuration",
      "lessonDurationSummary",
      "zoneRadiusKmLabel",
      "zoneRadiusKmHelper",
      "verificationZonePrivacyNote",
    ]) {
      assert.ok(locale[key]?.trim(), `missing ${key}`);
    }
  }
  assert.match(FR.profileBaseRateLabel, /CAD/);
  assert.match(FR.aiAssistantErrorMissingKey, /pas encore configuré/i);
  assert.match(FR.aiAssistantErrorGeneric, /Impossible de générer une suggestion/);
  assert.match(FR.editScheduleAndDuration, /Modifier l'horaire et la durée/);
  assert.equal(EN.editScheduleAndDuration, "Edit schedule and duration");
  assert.match(ES.editScheduleAndDuration, /Editar horario y duración/);
});
