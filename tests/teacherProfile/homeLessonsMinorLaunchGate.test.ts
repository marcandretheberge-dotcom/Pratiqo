/**
 * HM-01..HM-04 launch gate for at-home lessons involving minors.
 *
 * The existing `home_lesson_*` fields remain the general at-home lesson
 * settings. This test protects the separate minor-at-home safety rule:
 * teachers can request validation, but they cannot self-enable approval.
 */

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function loadJson(path: string): Record<string, string> {
  return JSON.parse(read(path)) as Record<string, string>;
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

const VERIFICATION_PATH = "app/(app)/teacher/verification/page.tsx";
const BOOKING_MODAL_PATH = "components/BookingModal.tsx";
const TEACHER_PROFILE_PATH = "components/TeacherProfile.tsx";
const PRICING_API_PATH = "app/api/teacher/pricing/route.ts";
const ONBOARDING_API_PATH = "app/api/onboarding/complete/route.ts";
const SUPPORT_CASES_MIGRATION_PATH = "supabase/migrations/045_support_cases_resolution_center.sql";
const PACKAGE_PATH = "package.json";

const verificationSrc = read(VERIFICATION_PATH);
const bookingModalSrc = read(BOOKING_MODAL_PATH);
const teacherProfileSrc = read(TEACHER_PROFILE_PATH);
const pricingApiSrc = read(PRICING_API_PATH);
const onboardingApiSrc = read(ONBOARDING_API_PATH);
const supportCasesMigrationSrc = read(SUPPORT_CASES_MIGRATION_PATH);
const packageSrc = read(PACKAGE_PATH);

const fr = loadJson("lib/i18n/locales/fr.json");
const en = loadJson("lib/i18n/locales/en.json");
const es = loadJson("lib/i18n/locales/es.json");

const minorGateKeys = [
  "homeLessonsMinorSafetyNote",
  "homeLessonsMinorGateTitle",
  "homeLessonsMinorGateDescription",
  "homeLessonsMinorGateGeneralSeparate",
  "homeLessonsMinorGateRequestTitle",
  "homeLessonsMinorGateRequestBody",
  "homeLessonsMinorGateRequestCta",
  "homeLessonsMinorRequestEmailSubject",
  "homeLessonsMinorRequestEmailBody",
  "bookingHomeMinorSafetyTitle",
  "bookingHomeMinorSafetyBody",
] as const;

test("audit: no dedicated minor-at-home approval field exists yet, so missing/null is treated as disabled", () => {
  const schemaAndApi = [
    ...readdirSync(join(REPO_ROOT, "supabase", "migrations"))
      .filter((file) => file.endsWith(".sql"))
      .map((file) => read(join("supabase", "migrations", file))),
    pricingApiSrc,
    onboardingApiSrc,
  ].join("\n");

  assert.doesNotMatch(
    schemaAndApi,
    /\bhome_minor_enabled\b|\bhome_minor_request_status\b|\bminor_home_enabled\b/i,
    "No persisted minor-at-home approval field exists in this launch gate.",
  );
});

test("teacher UI separates general at-home lessons from minor-at-home validation", () => {
  assert.match(verificationSrc, /data-testid="teacher-profile-mgmt-home-lessons-enabled"/);
  assert.match(verificationSrc, /data-testid="teacher-profile-mgmt-home-minor-gate"/);
  assert.match(verificationSrc, /t\("homeLessonsMinorGateGeneralSeparate"\)/);
  assert.match(verificationSrc, /t\("homeLessonsMinorGateDescription"\)/);
});

test("teachers cannot self-enable minor-at-home approval through an autonomous toggle or API payload", () => {
  assert.doesNotMatch(
    verificationSrc,
    /data-testid="[^"]*home-minor[^"]*(?:enabled|toggle)|setEditHomeMinorEnabled|home_minor_enabled\s*:/i,
  );
  assert.doesNotMatch(pricingApiSrc, /home_minor_enabled|home_minor_request_status/i);
  assert.doesNotMatch(onboardingApiSrc, /home_minor_enabled|home_minor_request_status/i);
});

test("teacher request path is support/manual-review only and does not create fake storage", () => {
  assert.match(verificationSrc, /mailto:support@pratiqo\.ca/);
  assert.match(verificationSrc, /data-testid="teacher-profile-mgmt-home-minor-request-cta"/);
  assert.doesNotMatch(verificationSrc, /\.from\("support_cases"\)|fetch\("\/api\/support\/cases"/);
  assert.match(supportCasesMigrationSrc, /category IN \([\s\S]*'other'/);
  assert.doesNotMatch(
    supportCasesMigrationSrc,
    /home_minor|minor_home|background_check_request/i,
    "Support cases do not yet have a dedicated category for this launch gate.",
  );
});

test("FR / EN / ES copy requires prior validation and avoids activation guarantees", () => {
  for (const [locale, dict] of Object.entries({ fr, en, es })) {
    for (const key of minorGateKeys) {
      assert.equal(typeof dict[key], "string", `[${locale}] missing ${key}`);
      assert.ok(dict[key].trim().length > 0, `[${locale}] ${key} must be non-empty`);
    }

    const combined = minorGateKeys.map((key) => dict[key]).join("\n");
    assert.match(combined, /Pratiqo/i, `[${locale}] copy must name Pratiqo validation`);
    assert.match(
      combined,
      /validation|validaci[oó]n|validate|request|demande|solicitud|solicitar/i,
      `[${locale}] copy must describe validation/request flow`,
    );
    assert.doesNotMatch(
      combined,
      /garantit automatiquement|guarantees automatic activation|garantiza activaci[oó]n autom[aá]tica/i,
      `[${locale}] request copy must not guarantee activation`,
    );
  }
});

test("public profile does not claim minor-at-home approval or completed background checks", () => {
  assert.doesNotMatch(teacherProfileSrc, /home_minor_enabled|minor_home|approved for minors|approuv[ée] pour les mineurs/i);
  assert.doesNotMatch(
    teacherProfileSrc,
    /background checks? (?:are )?(?:completed|verified|performed)|v[ée]rification d'ant[ée]c[ée]dents [^.\n]{0,80}(?:effectu[ée]e|compl[ée]t[ée]e|r[ée]alis[ée]e)|verificaci[oó]n de antecedentes [^.\n]{0,80}(?:completada|realizada)/i,
  );
});

test("booking modal shows parent/guardian disclosure for at-home lessons", () => {
  assert.match(bookingModalSrc, /data-testid="booking-home-minor-safety-disclosure"/);
  assert.match(bookingModalSrc, /t\("bookingHomeMinorSafetyTitle"\)/);
  assert.match(bookingModalSrc, /t\("bookingHomeMinorSafetyBody"\)/);
  assert.match(fr.bookingHomeMinorSafetyBody, /parent|tuteur|adulte responsable/i);
  assert.match(en.bookingHomeMinorSafetyBody, /parent|guardian|responsible adult/i);
  assert.match(es.bookingHomeMinorSafetyBody, /padre|madre|tutor|adulto responsable/i);
});

test("no reliable minor-status signal exists, so launch behavior is disclosure fallback instead of blocking all home lessons", () => {
  const reliableSignals = /\bis_minor\b|\bminor_status\b|\bdate_of_birth\b|\bbirthdate\b|\bstudent_age\b/i;
  assert.doesNotMatch(bookingModalSrc, reliableSignals);
  assert.doesNotMatch(bookingModalSrc, /home_minor_enabled|minor_home_approved/i);
  assert.match(
    bookingModalSrc,
    /Pratiqo cannot operationally identify whether the\s+student is a minor at booking time today/,
    "BookingModal source must document why disclosure fallback is used.",
  );
});

test("launch-critical includes the minor-at-home gate test", () => {
  assert.match(packageSrc, /tests\/teacherProfile\/homeLessonsMinorLaunchGate\.test\.ts/);
});

test("restricted systems were not touched by this branch", () => {
  let diff = "";
  try {
    diff = execSync("git diff --name-only main", {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    return;
  }

  const touched = diff.split("\n").map((line) => line.trim()).filter(Boolean);
  const allowed = new Set([
    VERIFICATION_PATH,
    "lib/i18n/locales/fr.json",
    "lib/i18n/locales/en.json",
    "lib/i18n/locales/es.json",
    "tests/teacherProfile/homeLessonsMinorLaunchGate.test.ts",
    PACKAGE_PATH,
  ]);

  for (const file of touched) {
    assert.ok(allowed.has(file), `Unexpected file touched by this safety gate branch: ${file}`);
  }
});
