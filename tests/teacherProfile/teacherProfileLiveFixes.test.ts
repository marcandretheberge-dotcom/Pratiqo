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

test("availability card: always shows schedule CTA link", () => {
  assert.match(VERIFICATION_PAGE, /teacherProfileMgmtAvailabilityCta/);
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

test("AI assistant: bearer token auth uses getUser(token) on server route", () => {
  assert.match(AI_ROUTE, /getUser\(token\)/);
  assert.doesNotMatch(stripJsComments(AI_ROUTE), /teacher_onboarding_complete\s*===\s*true/);
});

test("AI assistant: surfaces missing-key and forbidden errors without exposing API keys", () => {
  assert.match(AI_COMPONENT, /aiAssistantErrorMissingKey/);
  assert.match(AI_COMPONENT, /aiAssistantErrorForbidden/);
  assert.doesNotMatch(AI_COMPONENT, /ANTHROPIC_API_KEY/);
  assert.doesNotMatch(AI_COMPONENT, /x-api-key/);
});

test("i18n: live-fix keys exist in fr / en / es", () => {
  for (const locale of [FR, EN, ES]) {
    for (const key of [
      "aiAssistantErrorMissingKey",
      "aiAssistantErrorForbidden",
      "teacherProfileMgmtAvailabilityCta",
      "zoneRadiusKmLabel",
      "zoneRadiusKmHelper",
      "verificationZonePrivacyNote",
    ]) {
      assert.ok(locale[key]?.trim(), `missing ${key}`);
    }
  }
  assert.match(FR.teacherProfileMgmtAvailabilityCta, /Modifier mon horaire/);
  assert.equal(EN.teacherProfileMgmtAvailabilityCta, "Edit my schedule");
  assert.match(ES.teacherProfileMgmtAvailabilityCta, /Editar mi horario/);
});
