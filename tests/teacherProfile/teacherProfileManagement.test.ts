/**
 * Teacher profile management IA — /teacher/verification visible labels and structure.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";

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
  const noCrlf = src.replace(/\r\n/g, "\n");
  const noBlock = noCrlf.replace(/\/\*[\s\S]*?\*\//g, "");
  return noBlock
    .split("\n")
    .map((line) => line.replace(/(^|[^:])\/\/.*$/, "$1"))
    .join("\n");
}

function loadJson(path: string): Record<string, string> {
  return JSON.parse(readFileSync(join(REPO_ROOT, path), "utf8")) as Record<string, string>;
}

const VERIFICATION_PATH = "app/(app)/teacher/verification/page.tsx";
const ZONE_STEP_PATH = "app/(app)/teacher/verification/components/ZoneStep.tsx";
const NAV_PATH = "components/TeacherTopNav.tsx";
const PREVIEW_PATH = "components/teacher/TeacherPublicProfilePreview.tsx";
const MY_PROFILE_PATH = "app/(app)/teacher/my-profile/page.tsx";
const EN = "lib/i18n/locales/en.json";
const FR = "lib/i18n/locales/fr.json";
const ES = "lib/i18n/locales/es.json";

const verificationSrc = read(VERIFICATION_PATH);
const zoneStepSrc = read(ZONE_STEP_PATH);
const navSrc = read(NAV_PATH);
const previewSrc = read(PREVIEW_PATH);
const myProfileSrc = read(MY_PROFILE_PATH);

const PROFILE_MGMT_KEYS = [
  "teacherProfileManagementNav",
  "teacherProfileManagementTitle",
  "teacherProfileManagementSubtitle",
  "teacherPublicProfileLabel",
  "teacherPublicProfilePreviewLead",
  "teacherPublicProfileEditCta",
  "teacherPublicProfileViewCta",
  "teacherProfileMgmtSectionPublicProfile",
  "teacherProfileMgmtSectionDisciplinesFormats",
  "teacherProfileMgmtSectionOfferPricing",
  "teacherProfileMgmtSectionAvailability",
  "teacherProfileMgmtSectionTeachingZone",
  "teacherProfileMgmtSectionTrust",
  "teacherProfileMgmtSectionPayments",
  "teacherProfileMgmtOfferPricingDesc",
  "teacherProfileMgmtOfferPricingSaveBtn",
  "teacherProfileMgmtAvailabilityDesc",
  "teacherProfileMgmtAvailabilityCta",
  "teacherProfileMgmtDisciplinesDesc",
  "teacherProfileMgmtDisciplinesSaveBtn",
  "teacherProfileMgmtTrustDesc",
  "teacherProfileMgmtPaymentsDesc",
  "teacherProfileMgmtPaymentsCta",
  "zoneRadiusKmLabel",
  "zoneRadiusKmHelper",
  "verificationZonePrivacyNote",
];

test("nav: uses Profile management label key, not Vérification as visible main label", () => {
  assert.match(navSrc, /labelKey:\s*"teacherProfileManagementNav"/);
  assert.match(navSrc, /href:\s*"\/teacher\/verification"/);
  const fr = loadJson(FR);
  const en = loadJson(EN);
  const es = loadJson(ES);
  assert.equal(fr.teacherProfileManagementNav, "Gestion du profil");
  assert.equal(en.teacherProfileManagementNav, "Profile management");
  assert.equal(es.teacherProfileManagementNav, "Gestión del perfil");
  assert.equal(fr.teacherVerification, "Gestion du profil");
});

test("page: title is teacher profile management, not launch center", () => {
  const stripped = stripJsComments(verificationSrc);
  assert.match(stripped, /teacherProfileManagementTitle/);
  assert.match(stripped, /teacherProfileManagementSubtitle/);
  assert.doesNotMatch(stripped, /teacherLaunchCenterTitle/);
  assert.doesNotMatch(stripped, /Sparkles/);
  const fr = loadJson(FR);
  assert.equal(fr.teacherProfileManagementTitle, "Gestion du profil professeur");
});

test("page: seven profile management sections with test ids", () => {
  for (const sectionId of [
    "teacher-profile-mgmt-section-public-profile",
    "teacher-profile-mgmt-section-disciplines-formats",
    "teacher-profile-mgmt-section-offer-pricing",
    "teacher-profile-mgmt-section-availability",
    "teacher-profile-mgmt-section-teaching-zone",
    "teacher-profile-mgmt-section-trust",
    "teacher-profile-mgmt-section-payments",
  ]) {
    assert.ok(
      verificationSrc.includes(`data-testid="${sectionId}"`),
      `missing section test id ${sectionId}`,
    );
  }
});

test("page: offer & pricing card uses new copy and intro offer fields", () => {
  assert.match(verificationSrc, /teacherProfileMgmtSectionOfferPricing/);
  assert.match(verificationSrc, /teacherProfileMgmtOfferPricingDesc/);
  assert.match(verificationSrc, /intro_session_enabled/);
  assert.match(verificationSrc, /TeacherPayoutPreview/);
  assert.match(verificationSrc, /data-testid="teacher-profile-mgmt-card-offer-pricing"/);
});

test("page: availability links to schedule with duration summary CTA", () => {
  assert.match(verificationSrc, /ctaHref="\/teacher\/schedule"/);
  assert.match(verificationSrc, /editScheduleAndDuration/);
  assert.match(verificationSrc, /lessonDurationSummaryText/);
});

test("zone: home travel radius label/helper and simplified privacy copy", () => {
  assert.match(zoneStepSrc, /zoneRadiusKmLabel/);
  assert.match(zoneStepSrc, /zoneRadiusKmHelper/);
  assert.match(zoneStepSrc, /verificationZonePrivacyNote/);
  const fr = loadJson(FR);
  assert.match(fr.zoneRadiusKmLabel, /Distance maximale pour les cours à domicile/);
  assert.match(fr.verificationZonePrivacyNote, /zone approximative de 1 km/);
});

test("page: ProfileAiAssistant remains in public profile section", () => {
  assert.match(verificationSrc, /<ProfileAiAssistant\b/);
  assert.match(verificationSrc, /teacher-profile-mgmt-ai-toggle/);
});

test("page: Studio is not used for this page", () => {
  const stripped = stripJsComments(verificationSrc);
  assert.doesNotMatch(stripped, /\bStudio\b/);
  assert.doesNotMatch(stripped, /AI Studio/);
  assert.doesNotMatch(stripped, /Teacher Studio/);
});

test("public preview: my-profile is preview-only, not duplicate edit hub", () => {
  assert.match(myProfileSrc, /TeacherPublicProfilePreview/);
  assert.doesNotMatch(myProfileSrc, /TeacherAccountView/);
  assert.match(previewSrc, /data-testid="teacher-public-profile-preview"/);
  assert.match(previewSrc, /teacher-public-profile-edit-cta/);
  assert.match(previewSrc, /href="\/teacher\/verification"/);
  assert.doesNotMatch(previewSrc, /<textarea/);
});

test("i18n: profile management keys exist in fr / en / es", () => {
  const dicts = { en: loadJson(EN), fr: loadJson(FR), es: loadJson(ES) };
  for (const locale of Object.keys(dicts)) {
    for (const key of PROFILE_MGMT_KEYS) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(dicts[locale as keyof typeof dicts], key) &&
          dicts[locale as keyof typeof dicts][key].trim().length > 0,
        `${locale}.json missing key "${key}"`,
      );
    }
  }
});

test("forbidden files: branch does not touch Stripe/payments/security/migrations/cron", () => {
  let mergeBase: string;
  try {
    mergeBase = execSync("git merge-base HEAD origin/main", { encoding: "utf8" }).trim();
  } catch {
    console.warn("# skipped — could not determine merge-base with origin/main");
    return;
  }
  let changed: string[];
  try {
    changed = execSync(`git diff --name-only ${mergeBase} HEAD`, { encoding: "utf8" })
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    console.warn("# skipped — git diff failed");
    return;
  }

  const forbidden: { label: string; re: RegExp }[] = [
    { label: "Stripe checkout/webhook routes", re: /^app\/api\/stripe\// },
    { label: "payment routes", re: /^app\/api\/(payments|payouts|refunds|webhooks)\// },
    { label: "payment library helpers", re: /^lib\/payments\// },
    { label: "guarantee logic", re: /^lib\/guarantee\/|^app\/api\/guarantee\// },
    { label: "Supabase migrations", re: /^supabase\/migrations\// },
    { label: "RLS / security helpers", re: /^lib\/security\/|^lib\/rls\// },
    { label: "cron jobs", re: /^app\/api\/cron\// },
    { label: "teacher badge truth logic", re: /^lib\/teacherTrust\.|^lib\/badges\./ },
    { label: "public teacher name masking", re: /^lib\/identity\/displayName\./ },
  ];

  // Intentional exception for the student search visibility/photo PR on this branch.
  // Migration 071 is scoped to marketplace discovery only: adds teachers.is_demo,
  // rebuilds teachers_public with profile_photo_url, and filters demo/orphan rows.
  // All other supabase/migrations/* changes relative to origin/main remain forbidden.
  const approvedMigrationExceptions = new Set([
    "supabase/migrations/071_student_search_visibility_photo.sql",
    "supabase/migrations/072_teacher_default_lesson_duration.sql",
    "supabase/migrations/073_student_saved_location.sql",
  ]);

  const approvedStripeCheckoutExceptions = new Set(["app/api/stripe/checkout/route.ts"]);

  const violations: string[] = [];
  for (const file of changed) {
    for (const rule of forbidden) {
      if (rule.re.test(file)) {
        if (rule.label === "Supabase migrations" && approvedMigrationExceptions.has(file)) {
          continue;
        }
        if (rule.label === "Stripe checkout/webhook routes" && approvedStripeCheckoutExceptions.has(file)) {
          continue;
        }
        violations.push(`${file} (${rule.label})`);
      }
    }
  }
  assert.deepEqual(violations, [], `forbidden files were modified:\n  ${violations.join("\n  ")}`);
});

test("source scan: no React component introduces AI Studio nav for teachers", () => {
  const offenders: string[] = [];
  function walk(dir: string): void {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const rel = relative(REPO_ROOT, full);
      if (rel.startsWith(`node_modules${sep}`) || rel.startsWith(`.next${sep}`)) continue;
      const stat = statSync(full);
      if (stat.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(tsx|ts)$/.test(entry)) continue;
      const src = stripJsComments(readFileSync(full, "utf8").replace(/\r\n/g, "\n"));
      if (/AI Studio|Teacher Studio|Studio professeur/.test(src)) offenders.push(rel);
    }
  }
  walk(join(REPO_ROOT, "app"));
  walk(join(REPO_ROOT, "components"));
  assert.deepEqual(offenders, [], `Studio naming found in: ${offenders.join(", ")}`);
});
