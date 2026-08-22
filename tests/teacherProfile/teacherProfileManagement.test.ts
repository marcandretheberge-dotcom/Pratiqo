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
const NAV_PATH = "components/teacher/teacherNavConfig.ts";
const PREVIEW_PATH = "components/teacher/TeacherPublicProfilePreview.tsx";
const VISIBILITY_CARD_PATH = "components/teacher/TeacherProfileVisibilityCard.tsx";
const ACCOUNT_VIEW_PATH = "components/teacher/TeacherAccountView.tsx";
const MY_PROFILE_PATH = "app/(app)/teacher/my-profile/page.tsx";
const EN = "lib/i18n/locales/en.json";
const FR = "lib/i18n/locales/fr.json";
const ES = "lib/i18n/locales/es.json";

const verificationSrc = read(VERIFICATION_PATH);
const zoneStepSrc = read(ZONE_STEP_PATH);
const navSrc = read(NAV_PATH);
const previewSrc = read(PREVIEW_PATH);
const visibilityCardSrc = read(VISIBILITY_CARD_PATH);
const accountViewSrc = read(ACCOUNT_VIEW_PATH);
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
  "teacherRateAutosaveSaving",
  "teacherRateAutosaveSaved",
  "teacherRateAutosaveError",
  "teacherProfileMgmtAvailabilityDesc",
  "teacherProfileMgmtAvailabilityCta",
  "teacherProfileMgmtDisciplinesDesc",
  "teacherProfileMgmtDisciplinesSaveBtn",
  "teacherProfileMgmtTrustDesc",
  "teacherProfileMgmtPaymentsDesc",
  "teacherProfileMgmtPaymentsCta",
  "teacherSeoStatusPayments",
  "teacherSeoStatusPayouts",
  "teacherPaymentsActivated",
  "teacherPaymentsNotActivated",
  "teacherPayoutsActivated",
  "teacherPayoutsNotActivated",
  "teacherProfileVisiblePaymentsWarningTitle",
  "teacherProfileVisiblePaymentsWarningBody",
  "teacherProfileVisiblePaymentsWarningCta",
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
  // The teacher pricing card now uses the hourly-rate-aware preview that
  // prorates the typed CAD/h figure by the actual lesson duration before
  // showing the commission/net breakdown. The old TeacherPayoutPreview is
  // still exported for legacy callers, but the pricing card no longer
  // misuses it as if the hourly rate were a flat session price.
  assert.match(verificationSrc, /TeacherHourlyRatePreview/);
  assert.match(verificationSrc, /data-testid="teacher-profile-mgmt-card-offer-pricing"/);
});

test("pricing save: intro price is conditional on the intro offer checkbox", () => {
  assert.match(verificationSrc, /if \(draft\.introEnabled\) \{/);
  assert.match(verificationSrc, /introPriceRaw === ""/);
  assert.match(verificationSrc, /setEditIntroPrice\(""\)/);
  assert.match(verificationSrc, /intro_session_enabled:\s*draft\.introEnabled/);
  assert.match(verificationSrc, /intro_session_price_cents:\s*introPriceCents/);
  assert.doesNotMatch(verificationSrc, /Number\(String\(editIntroPrice \|\| ""\)\.trim\(\)\)[\s\S]{0,120}return null/);
});

test("pricing autosave: base hourly rate saves after debounce and on blur", () => {
  assert.match(verificationSrc, /pricingAutosaveTimeoutRef/);
  assert.match(verificationSrc, /setTimeout\(\(\) => \{\s*void savePricing\(\{ source: "autosave", collapseOnSuccess: false \}\);/);
  assert.match(verificationSrc, /}, 750\)/);
  assert.match(verificationSrc, /onBlur=\{\(\) => \{[\s\S]{0,260}savePricing\(\{ source: "blur", collapseOnSuccess: false \}\)/);
  assert.match(verificationSrc, /pricingSaveInFlightRef/);
  assert.match(verificationSrc, /pricingPendingAutosaveRef\.current = true/);
  assert.match(verificationSrc, /setPricingAutosaveRetryTick/);
  assert.match(verificationSrc, /savedDraftStillCurrent/);
  assert.match(verificationSrc, /teacher-profile-mgmt-rate-autosave-saving/);
  assert.match(verificationSrc, /teacher-profile-mgmt-rate-autosave-saved/);
  assert.match(verificationSrc, /teacher-profile-mgmt-rate-autosave-error/);
});

test("pricing autosave: invalid base rate and missing intro price block API writes", () => {
  assert.match(verificationSrc, /if \(!Number\.isFinite\(priceNum\) \|\| priceNum < MIN_LESSON_PRICE_DOLLARS\) \{/);
  assert.match(verificationSrc, /setPricingInlineError\(error\)/);
  assert.match(verificationSrc, /return false/);
  assert.match(verificationSrc, /if \(draft\.introEnabled\) \{/);
  assert.match(verificationSrc, /introPriceRaw === ""/);
  assert.match(verificationSrc, /intro_session_enabled:\s*draft\.introEnabled/);
  assert.match(verificationSrc, /intro_session_price_cents:\s*introPriceCents/);
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
  assert.match(previewSrc, /TEACHER_SETUP_PATH/);
  assert.match(previewSrc, /router\.replace\(TEACHER_SETUP_PATH\)/);
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

test("visibility card warns about payments without blocking public profile visibility", () => {
  assert.match(visibilityCardSrc, /paymentReady\?:\s*boolean/);
  assert.match(visibilityCardSrc, /teacher-profile-visible-payments-warning/);
  assert.match(visibilityCardSrc, /teacherProfileVisiblePaymentsWarningTitle/);
  assert.match(visibilityCardSrc, /teacherProfileVisiblePaymentsWarningBody/);
  assert.match(visibilityCardSrc, /teacher-profile-visible-payments-cta/);
  assert.match(verificationSrc, /paymentReady=\{paymentsReady\}/);
});

test("teacher account management separates profile visibility from Stripe readiness", () => {
  assert.match(accountViewSrc, /deriveTeacherReadinessContract/);
  assert.match(accountViewSrc, /profileVisibilityReady:\s*teacherIsPublic/);
  assert.match(accountViewSrc, /teacher-profile-payment-readiness-status/);
  assert.match(accountViewSrc, /teacher-profile-visible-payments-settings-warning/);
  assert.match(accountViewSrc, /teacherSeoStatusPayments/);
  assert.match(accountViewSrc, /teacherSeoStatusPayouts/);
});

test("forbidden files: branch does not touch Stripe checkout/webhook, Supabase/RLS/migrations, booking, cron, or unrelated payment infrastructure", () => {
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
    { label: "payment library helpers outside canonical commission config", re: /^lib\/payments\/(?!commission\.ts$)/ },
    { label: "guarantee logic", re: /^lib\/guarantee\/|^app\/api\/guarantee\// },
    { label: "Supabase migrations", re: /^supabase\/migrations\// },
    { label: "RLS / security helpers", re: /^lib\/security\/|^lib\/rls\// },
    { label: "booking flow files outside commission disclosure success page", re: /^app\/\(app\)\/booking\/(?!success\/page\.tsx$)/ },
    { label: "cron jobs", re: /^app\/api\/cron\/|^\.github\/workflows\/.*cron/i },
    // YoPratiqo UI/content files (components/yo/**, lib/yo/**, app/yo/**)
    // are intentionally NOT blocked here: legitimate module UI/content
    // updates (e.g. Module 2/Module 3 quiz UX + browser audio fallback)
    // must be free to land on their feature branches. Generated audio
    // assets (mp3/wav/m4a under public/) and OpenAI / audio generation
    // scripts remain forbidden by the two rules below — those are the
    // only YoPratiqo surfaces that must never change in a teacher
    // profile management PR.
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
    // Student/minor onboarding consent ledger — owner-only RLS table.
    // Defended by tests/auth/studentOnboardingConsentGate.test.ts.
    "supabase/migrations/084_student_onboarding_consents.sql",
    "supabase/migrations/085_harden_student_onboarding_consents_rls.sql",
    // Migration-number cleanup before PR #303: learner demand moved from 088 to 089.
    "supabase/migrations/088_learner_demand_funnel.sql",
    "supabase/migrations/089_learner_demand_funnel.sql",
    // Ambassador referral/reward infrastructure draft PR (#303).
    // Defended by tests/ambassadors/* and tests/security/rlsCoverage.test.ts.
    "supabase/migrations/090_ambassador_referral_tracking.sql",
    "supabase/migrations/091_ambassador_rewards_v1.sql",
    "supabase/migrations/092_ambassador_rewards_version_hardening.sql",
    "supabase/migrations/093_harden_recent_program_tables_rls.sql",
    "supabase/migrations/094_ambassador_net_contribution_economics.sql",
    // Planned package refund quote engine — quote/audit tables only, no Stripe refund.
    // Defended by tests/offers/plannedPackageRefundQuote.test.ts.
    "supabase/migrations/119_planned_package_cancellation_refund_quotes.sql",
    "supabase/migrations/120_planned_package_refund_executions.sql",
  ]);

  // Approved Stripe route exceptions for narrowly-scoped consent-gate
  // edits on later legal-mechanic PRs (e.g. V9 R02 Membre Pro
  // automatic-renewal consent). Each entry is justified inline and
  // defended by a dedicated assertion in another test suite — see
  // tests/legal/p0ConsentAndSafetyGates.test.ts ("A6"+"A7") which
  // verifies the consent gate does NOT change Stripe IDs / payment
  // math / subscription mechanics.
  const approvedStripeRouteExceptions = new Set([
    "app/api/stripe/pro/checkout/route.ts",
    "app/api/stripe/webhook/route.ts",
    // Payment-trust launch hardening (connect onboarding metadata only).
    // Defended by tests/payments/paymentTrustLaunchHardening.test.ts.
    "app/api/stripe/checkout/route.ts",
  ]);

  const approvedPaymentHelperExceptions = new Set([
    // Payment-trust launch hardening (Connect account metadata only).
    // Defended by tests/payments/paymentTrustLaunchHardening.test.ts.
    "lib/payments/connect.ts",
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
        if (
          rule.label === "payment library helpers outside canonical commission config" &&
          approvedPaymentHelperExceptions.has(file)
        ) {
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
