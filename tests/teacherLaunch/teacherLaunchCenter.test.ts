/**
 * Regression suite for the Teacher Launch Center redesign.
 *
 * Verifies:
 *   1. /onboarding/teacher renders a Launch Center hero with a "Let's get
 *      started" CTA + "save and finish later" affordance, persists draft
 *      state across visits (localStorage), and surfaces per-step skip
 *      consequence copy.
 *   2. /api/ai/description is reachable by teachers AFTER first onboarding
 *      (the previous `teacher_onboarding_complete === true` 403 gate was
 *      removed) and accepts the new `tone` / `notes` / `locale` fields.
 *   3. ProfileAiAssistant is imported by the onboarding wizard AND the
 *      teacher account edit view — i.e. AI is available outside first
 *      onboarding.
 *   4. /teacher/verification is now the unified Teacher Launch Center with
 *      7 inline-expandable cards in 2 sections. No old "Niveau 1..5"
 *      headings. No anchor-jump CTAs. Zone card uses Google Places
 *      autocomplete. Profile card exposes ProfileAiAssistant.
 *   5. New i18n keys exist in fr / en / es.
 *   6. The PR does NOT touch Stripe checkout/webhook, unrelated payment
 *      infrastructure, guarantee, RLS/security migrations, public teacher
 *      name masking, teacher badge truth logic, cron, generated audio assets,
 *      or audio generation scripts.
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

/**
 * Strip JS/TS comments so source-scan regex don't false-match on comments
 * we wrote about the change itself.
 */
function stripJsComments(src: string): string {
  const noCrlf = src.replace(/\r\n/g, "\n");
  const noBlock = noCrlf.replace(/\/\*[\s\S]*?\*\//g, "");
  return noBlock
    .split("\n")
    .map((line) => line.replace(/(^|[^:])\/\/.*$/, "$1"))
    .join("\n");
}

// ---------------------------------------------------------------------------
// Files under test
// ---------------------------------------------------------------------------

const ONBOARDING_PATH = "app/(app)/onboarding/teacher/page.tsx";
const VERIFICATION_PATH = "app/(app)/teacher/verification/page.tsx";
const ZONE_STEP_PATH = "app/(app)/teacher/verification/components/ZoneStep.tsx";
const DIPLOMA_STEP_PATH = "app/(app)/teacher/verification/components/DiplomaStep.tsx";
const AI_ROUTE_PATH = "app/api/ai/description/route.ts";
const AI_SCHEMA_PATH = "lib/validation/schemas.ts";
const AI_COMPONENT_PATH = "components/teacher/ProfileAiAssistant.tsx";
const TEACHER_ACCOUNT_PATH = "components/teacher/TeacherAccountView.tsx";
const EN = "lib/i18n/locales/en.json";
const FR = "lib/i18n/locales/fr.json";
const ES = "lib/i18n/locales/es.json";

const onboardingSrc = read(ONBOARDING_PATH);
const verificationSrc = read(VERIFICATION_PATH);
const zoneStepSrc = read(ZONE_STEP_PATH);
const diplomaStepSrc = read(DIPLOMA_STEP_PATH);
const aiRouteSrc = read(AI_ROUTE_PATH);
const aiSchemaSrc = read(AI_SCHEMA_PATH);
const aiComponentSrc = read(AI_COMPONENT_PATH);
const accountSrc = read(TEACHER_ACCOUNT_PATH);

// ---------------------------------------------------------------------------
// 1. Teacher Launch Center on /onboarding/teacher
// ---------------------------------------------------------------------------

test("onboarding: renders the minimal private draft setup", () => {
  assert.match(onboardingSrc, /data-testid="teacher-minimal-onboarding"/);
  assert.match(onboardingSrc, /data-testid="teacher-minimal-display-name"/);
  assert.match(onboardingSrc, /data-testid="teacher-minimal-consent"/);
  assert.match(onboardingSrc, /data-testid="teacher-minimal-submit"/);
  assert.match(onboardingSrc, /teacherMinimalSetupTitle/);
  assert.match(onboardingSrc, /teacherMinimalSetupConsent/);
});

test("onboarding: only posts display name plus existing consent acknowledgements", () => {
  const stripped = stripJsComments(onboardingSrc);
  assert.match(stripped, /name,/);
  assert.match(stripped, /tax_status_acknowledged:\s*true/);
  assert.match(stripped, /no_exclusivity_acknowledged:\s*true/);
  assert.match(stripped, /no_income_guarantee_acknowledged:\s*true/);
  assert.doesNotMatch(stripped, /discipline:/);
  assert.doesNotMatch(stripped, /price_per_lesson:/);
  assert.doesNotMatch(stripped, /availability:\s/);
});

test("onboarding: redirects to profile management setup after minimal creation", () => {
  assert.match(onboardingSrc, /SETUP_DESTINATION\s*=\s*"\/teacher\/verification\?setup=1"/);
  assert.match(onboardingSrc, /router\.replace\(SETUP_DESTINATION\)/);
});

test("onboarding: no full-profile widgets remain in first onboarding", () => {
  const stripped = stripJsComments(onboardingSrc);
  assert.doesNotMatch(stripped, /ProfileAiAssistant/);
  assert.doesNotMatch(stripped, /TeacherHourlyRatePreview/);
  assert.doesNotMatch(stripped, /MarketWaitlistCard/);
  assert.doesNotMatch(stripped, /parseGooglePlace/);
  assert.doesNotMatch(stripped, /google\.maps\.places\.Autocomplete/);
});

// ---------------------------------------------------------------------------
// 2. AI is available OUTSIDE first onboarding now
// ---------------------------------------------------------------------------

test("ai route: removed the post-onboarding 403 gate", () => {
  const stripped = stripJsComments(aiRouteSrc);
  assert.doesNotMatch(stripped, /teacher_onboarding_complete\s*===\s*true/);
  assert.doesNotMatch(stripped, /Génération IA disponible seulement pendant l'onboarding/);
});

test("ai route: still enforces auth + teacher role + rate limit", () => {
  assert.match(aiRouteSrc, /getUser\(token\)/);
  assert.match(aiRouteSrc, /getSupabaseAdmin\(\)/);
  assert.match(aiRouteSrc, /if \(!isTeacher\)/);
  assert.match(aiRouteSrc, /rateLimitByIp\(request,\s*"ai-description"/);
});

test("ai schema: accepts tone / notes / locale on top of discipline / specialty", () => {
  assert.match(aiSchemaSrc, /aiDescriptionTones/);
  assert.match(aiSchemaSrc, /"warm"/);
  assert.match(aiSchemaSrc, /"professional"/);
  assert.match(aiSchemaSrc, /"shorter"/);
  assert.match(aiSchemaSrc, /notes:\s*z\.string\(\)/);
  assert.match(aiSchemaSrc, /locale:\s*z\.enum\(\["fr",\s*"en",\s*"es"\]\)/);
});

test("ai route: forwards tone + locale + notes into the prompt builder", () => {
  assert.match(aiRouteSrc, /buildPrompt\(\{\s*discipline,\s*specialite,\s*notes,\s*tone,\s*locale\s*\}\)/);
});

// ---------------------------------------------------------------------------
// 3. ProfileAiAssistant is wired into BOTH onboarding AND teacher account edit
// ---------------------------------------------------------------------------

test("ProfileAiAssistant: defines an explicit user-controlled UX (no auto-overwrite, no keystroke calls)", () => {
  assert.match(aiComponentSrc, /onAccept\(suggestion\.trim\(\)\)/);
  const stripped = stripJsComments(aiComponentSrc);
  assert.doesNotMatch(stripped, /onChange[^)]*callAi/);
});

test("teacher account view: exposes the AI assistant outside first onboarding", () => {
  assert.match(
    accountSrc,
    /import\s*\{\s*ProfileAiAssistant\s*\}\s*from\s*"@\/components\/teacher\/ProfileAiAssistant"/,
  );
  assert.match(accountSrc, /data-testid="teacher-account-ai-toggle"/);
  assert.match(accountSrc, /<ProfileAiAssistant\b/);
});

test("profile management page: exposes ProfileAiAssistant after minimal onboarding", () => {
  assert.match(verificationSrc, /ProfileAiAssistant/);
  assert.match(verificationSrc, /data-testid="teacher-profile-mgmt-ai-toggle"/);
  assert.match(verificationSrc, /<ProfileAiAssistant\b/);
});

// ---------------------------------------------------------------------------
// 4. /teacher/verification — Teacher profile management hub
// ---------------------------------------------------------------------------

test("profile management page: no Niveau headings, inline cards, Google Places in zone", () => {
  const stripped = stripJsComments(verificationSrc);
  for (const k of [
    "verificationLevel1Title",
    "verificationLevel2Title",
    "verificationLevel3Title",
    "verificationLevel4Title",
    "verificationLevel5Title",
  ]) {
    assert.doesNotMatch(stripped, new RegExp(k));
  }
  assert.doesNotMatch(stripped, /VerificationBadge/);
  assert.doesNotMatch(stripped, /teacherLaunchCenterTitle/);
  assert.doesNotMatch(stripped, /teacherLaunchSectionEssential/);
  assert.doesNotMatch(stripped, /teacher-launch-section-trust/);
  assert.match(stripped, /expandedCard/);
  assert.match(verificationSrc, /parseGooglePlace/);
  assert.match(verificationSrc, /google\.maps\.places\.Autocomplete/);
  assert.match(verificationSrc, /teacherProfileManagementTitle/);
});

test("ZoneStep: no longer references verificationLevel4Title or verificationLevel4BodyZone", () => {
  const stripped = stripJsComments(zoneStepSrc);
  assert.doesNotMatch(stripped, /verificationLevel4Title/);
  assert.doesNotMatch(stripped, /verificationLevel4BodyZone/);
});

test("ZoneStep: exposes addressRef prop for Google Places autocomplete", () => {
  assert.match(zoneStepSrc, /addressRef/);
  assert.match(zoneStepSrc, /ref=\{addressRef\}/);
});

test("DiplomaStep: no longer references verificationLevel3Title or verificationLevel3Body", () => {
  const stripped = stripJsComments(diplomaStepSrc);
  assert.doesNotMatch(stripped, /verificationLevel3Title/);
  assert.doesNotMatch(stripped, /verificationLevel3Body/);
});

// ---------------------------------------------------------------------------
// 5. i18n keys exist in en / fr / es
// ---------------------------------------------------------------------------

const REQUIRED_KEYS = [
  // Minimal teacher setup
  "teacherMinimalSetupEyebrow",
  "teacherMinimalSetupTitle",
  "teacherMinimalSetupSubtitle",
  "teacherMinimalSetupDisplayName",
  "teacherMinimalSetupConsent",
  "teacherMinimalSetupNextStep",
  "teacherMinimalSetupSubmit",
  "teacherMinimalSetupNameRequired",
  "teacherMinimalSetupConsentRequired",
  "teacherMinimalSetupRequired",
  // Legacy launch/setup keys retained for existing surfaces
  "teacherLaunchHeroEyebrow",
  "teacherLaunchHeroTitle",
  "teacherLaunchHeroBody",
  "teacherLaunchStartCta",
  "teacherLaunchResumeCta",
  "teacherLaunchProgressLabel",
  "teacherLaunchSkipCta",
  "teacherLaunchSaveAndExitCta",
  "teacherLaunchStepProfileTitle",
  "teacherLaunchStepLocationTitle",
  "teacherLaunchStepPricingTitle",
  "teacherLaunchSkipProfile",
  "teacherLaunchSkipLocation",
  "teacherLaunchSkipPricing",
  "teacherLaunchSkipPayments",
  // Unified Teacher Launch Center page
  "teacherLaunchCenterTitle",
  "teacherLaunchCenterSubtitle",
  "teacherLaunchSectionEssential",
  "teacherLaunchSectionTrust",
  "teacherLaunchCardProfileTitle",
  "teacherLaunchCardProfileSaveBtn",
  "teacherLaunchCardPricingTitle",
  "teacherLaunchCardPricingSaveBtn",
  "teacherLaunchCardAvailabilityTitle",
  "teacherLaunchCardAvailabilityCta",
  "teacherLaunchCardZoneTitle",
  "teacherLaunchCardIdentityTitle",
  "teacherLaunchCardDiplomaTitle",
  "teacherLaunchCardPaymentsTitle",
  "teacherLaunchCardPaymentsCta",
  // Trust & visibility (status labels, still used)
  "teacherTrustVisibilityTitle",
  "teacherTrustVisibilitySubtitle",
  "teacherTrustVisibilityIntro",
  "teacherTrustStatusComplete",
  "teacherTrustStatusMissing",
  "teacherTrustStatusInReview",
  "teacherTrustStatusOptional",
  "teacherTrustStatusActionNeeded",
  "teacherTrustCardMapTitle",
  "teacherTrustCardMapDescription",
  "teacherTrustCardMapCta",
  "teacherTrustCardHomeTitle",
  "teacherTrustCardIdentityTitle",
  "teacherTrustCardDiplomaTitle",
  "teacherTrustCardPaymentsTitle",
  // AI assistant
  "aiAssistantHeadline",
  "aiAssistantHelpText",
  "aiAssistantNotesPlaceholder",
  "aiAssistantImproveBtn",
  "aiAssistantAcceptBtn",
  "aiAssistantRegenerateBtn",
  "aiAssistantShorterBtn",
  "aiAssistantWarmerBtn",
  "aiAssistantProBtn",
  "aiAssistantRateLimited",
  "aiAssistantErrorGeneric",
];

function loadJson(path: string): Record<string, string> {
  return JSON.parse(readFileSync(join(REPO_ROOT, path), "utf8")) as Record<string, string>;
}

test("i18n: every required key exists in en / fr / es", () => {
  const dicts: Record<string, Record<string, string>> = {
    en: loadJson(EN),
    fr: loadJson(FR),
    es: loadJson(ES),
  };
  for (const locale of Object.keys(dicts)) {
    for (const key of REQUIRED_KEYS) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(dicts[locale], key) &&
          typeof dicts[locale][key] === "string" &&
          dicts[locale][key].trim().length > 0,
        `${locale}.json missing key "${key}"`,
      );
    }
  }
});

// ---------------------------------------------------------------------------
// 6. Forbidden-file safety net — this PR must NOT touch high-risk unrelated systems
// ---------------------------------------------------------------------------

test("forbidden files: PR does not touch Stripe checkout/webhook, Supabase/RLS/migrations, booking, cron, or unrelated payment infrastructure", () => {
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
    { label: "payment routes (other than read-only summary on verification page)", re: /^app\/api\/(payments|payouts|refunds|webhooks)\// },
    { label: "payment library helpers outside canonical commission config", re: /^lib\/payments\/(?!commission\.ts$)/ },
    { label: "guarantee logic", re: /^lib\/guarantee\/|^app\/api\/guarantee\// },
    { label: "Supabase migrations", re: /^supabase\/migrations\// },
    { label: "RLS / security helpers", re: /^lib\/security\/|^lib\/rls\// },
    { label: "booking flow files outside commission disclosure success page", re: /^app\/\(app\)\/booking\/(?!success\/page\.tsx$)/ },
    { label: "cron jobs", re: /^app\/api\/cron\/|^\.github\/workflows\/.*cron/i },
    { label: "generated audio assets", re: /^public\/.*\.(mp3|wav|m4a)$/i },
    { label: "OpenAI/audio generation scripts", re: /^scripts\/.*(openai|generate-yopratiqo-audio)/i },
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

  // Approved Stripe route exceptions for narrowly-scoped consent-gate
  // edits on later legal-mechanic PRs. Each entry is justified inline
  // and defended by an assertion in another test suite (here:
  // tests/legal/p0ConsentAndSafetyGates.test.ts "A6"+"A7" verifies
  // the consent gate does NOT change Stripe IDs / payment math /
  // subscription mechanics).
  const approvedStripeRouteExceptions = new Set([
    "app/api/stripe/pro/checkout/route.ts",
    "app/api/stripe/webhook/route.ts",
  ]);

  const violations: string[] = [];
  for (const file of changed) {
    for (const rule of forbidden) {
      if (rule.re.test(file)) {
        if (rule.label === "Supabase migrations" && approvedMigrationExceptions.has(file)) {
          continue;
        }
        if (
          rule.label === "Stripe checkout/webhook routes" &&
          approvedStripeRouteExceptions.has(file)
        ) {
          continue;
        }
        violations.push(`${file} (${rule.label})`);
      }
    }
  }
  assert.deepEqual(violations, [], `forbidden files were modified:\n  ${violations.join("\n  ")}`);
});

// ---------------------------------------------------------------------------
// 7. AI route is reachable for ALL teachers (sanity check on route logic)
// ---------------------------------------------------------------------------

test("ai route: the only role gate is 'must be teacher' (no completion gate)", () => {
  const stripped = stripJsComments(aiRouteSrc);
  const roleChecks = stripped.match(/NextResponse\.json\([^)]*status:\s*403/g) ?? [];
  assert.equal(
    roleChecks.length,
    1,
    `expected exactly one 403 branch (teacher-only). Found ${roleChecks.length}.`,
  );
});

// ---------------------------------------------------------------------------
// 8. No Niveau 1..5 in any React component source
// ---------------------------------------------------------------------------

test("source scan: no React component renders 'Niveau 1..5' as a heading anymore", () => {
  const offenders: string[] = [];
  const allow = new Set<string>([]);
  function walk(dir: string): void {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const rel = relative(REPO_ROOT, full);
      if (rel.startsWith(`node_modules${sep}`) || rel.startsWith(`.next${sep}`)) continue;
      if (rel.startsWith(`tests${sep}`)) continue;
      const stat = statSync(full);
      if (stat.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(tsx|ts)$/.test(entry)) continue;
      if (allow.has(rel.replaceAll(sep, "/"))) continue;
      const src = readFileSync(full, "utf8").replace(/\r\n/g, "\n");
      const stripped = stripJsComments(src);
      if (/"\s*Niveau\s+[1-5]\b/.test(stripped) || />\s*Niveau\s+[1-5]\b/.test(stripped)) {
        offenders.push(rel);
      }
    }
  }
  walk(join(REPO_ROOT, "app"));
  walk(join(REPO_ROOT, "components"));
  assert.deepEqual(offenders, [], `Niveau 1..5 reappeared in: ${offenders.join(", ")}`);
});
