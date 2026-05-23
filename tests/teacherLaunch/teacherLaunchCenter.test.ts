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
 *   4. /teacher/verification no longer uses "verificationLevel{1..5}Title"
 *      as the primary structure. The five new student-facing unlock cards
 *      (map / home / identity / diploma / payments) render via stable
 *      data-testid hooks.
 *   5. New i18n keys exist in fr / en / es.
 *   6. The PR does NOT touch Stripe checkout/webhook, payment math,
 *      commission, payouts, refunds, guarantee, RLS/security migrations,
 *      public teacher name masking, teacher badge truth logic, or cron.
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
const AI_ROUTE_PATH = "app/api/ai/description/route.ts";
const AI_SCHEMA_PATH = "lib/validation/schemas.ts";
const AI_COMPONENT_PATH = "components/teacher/ProfileAiAssistant.tsx";
const TEACHER_ACCOUNT_PATH = "components/teacher/TeacherAccountView.tsx";
const EN = "lib/i18n/locales/en.json";
const FR = "lib/i18n/locales/fr.json";
const ES = "lib/i18n/locales/es.json";

const onboardingSrc = read(ONBOARDING_PATH);
const verificationSrc = read(VERIFICATION_PATH);
const aiRouteSrc = read(AI_ROUTE_PATH);
const aiSchemaSrc = read(AI_SCHEMA_PATH);
const aiComponentSrc = read(AI_COMPONENT_PATH);
const accountSrc = read(TEACHER_ACCOUNT_PATH);

// ---------------------------------------------------------------------------
// 1. Teacher Launch Center on /onboarding/teacher
// ---------------------------------------------------------------------------

test("onboarding: imports ProfileAiAssistant", () => {
  assert.match(
    onboardingSrc,
    /import\s*\{\s*ProfileAiAssistant\s*\}\s*from\s*"@\/components\/teacher\/ProfileAiAssistant"/,
  );
});

test("onboarding: renders the Launch Center hero with the start CTA", () => {
  assert.match(onboardingSrc, /data-testid="teacher-launch-hero"/);
  assert.match(onboardingSrc, /data-testid="teacher-launch-start-cta"/);
  assert.match(onboardingSrc, /teacherLaunchHeroTitle/);
  assert.match(onboardingSrc, /teacherLaunchStartCta/);
});

test("onboarding: surfaces the save-and-finish-later affordance", () => {
  assert.match(onboardingSrc, /data-testid="teacher-launch-save-exit"/);
  assert.match(onboardingSrc, /teacherLaunchSaveAndExitCta/);
});

test("onboarding: per-step skip CTA + consequence text are rendered", () => {
  assert.match(onboardingSrc, /data-testid="teacher-launch-skip-cta"/);
  assert.match(onboardingSrc, /data-testid="teacher-launch-skip-consequence"/);
  assert.match(onboardingSrc, /teacherLaunchSkipCta/);
  // Per-step skip consequence keys (profile / location / pricing) must be wired.
  const stripped = stripJsComments(onboardingSrc);
  assert.match(stripped, /teacherLaunchSkipProfile/);
  assert.match(stripped, /teacherLaunchSkipLocation/);
  assert.match(stripped, /teacherLaunchSkipPricing/);
});

test("onboarding: persists draft to localStorage so the teacher can save and resume", () => {
  // We persist a per-user draft on every relevant state change, AND mark the
  // wizard as "started" so the hero doesn't reappear after the teacher
  // returns. These two storage prefixes are part of the Launch Center API.
  assert.match(onboardingSrc, /pratiqo-teacher-launch-draft:/);
  assert.match(onboardingSrc, /pratiqo-teacher-launch-started:/);
  assert.match(onboardingSrc, /localStorage\.setItem\(/);
  assert.match(onboardingSrc, /localStorage\.getItem\(/);
});

test("onboarding: AI assistant toggle exists on the bio step", () => {
  assert.match(onboardingSrc, /data-testid="teacher-launch-ai-toggle"/);
  assert.match(onboardingSrc, /<ProfileAiAssistant\b/);
});

// ---------------------------------------------------------------------------
// 2. AI is available OUTSIDE first onboarding now
// ---------------------------------------------------------------------------

test("ai route: removed the post-onboarding 403 gate", () => {
  const stripped = stripJsComments(aiRouteSrc);
  // The old code returned 403 specifically when teacher_onboarding_complete
  // was true. That gate must be gone — code may still mention the column
  // in comments only.
  assert.doesNotMatch(stripped, /teacher_onboarding_complete\s*===\s*true/);
  assert.doesNotMatch(stripped, /Génération IA disponible seulement pendant l'onboarding/);
});

test("ai route: still enforces auth + teacher role + rate limit", () => {
  assert.match(aiRouteSrc, /supabase\.auth\.getUser\(\)/);
  assert.match(aiRouteSrc, /row\?\.role\s*!==\s*"teacher"/);
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
  // Suggestion is held in component state and only applied via onAccept(),
  // never silently. The improve button calls callAi() explicitly.
  assert.match(aiComponentSrc, /onAccept\(suggestion\.trim\(\)\)/);
  // No setTimeout / debounce on keystrokes — assistant must not call AI
  // until the teacher clicks a button.
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

// ---------------------------------------------------------------------------
// 4. /teacher/verification is now Trust & Visibility with unlock cards
// ---------------------------------------------------------------------------

test("verification: no longer uses 'verificationLevel{1..5}Title' as primary structure", () => {
  const stripped = stripJsComments(verificationSrc);
  for (const k of [
    '"verificationLevel1Title"',
    '"verificationLevel2Title"',
    '"verificationLevel3Title"',
    '"verificationLevel4Title"',
    '"verificationLevel5Title"',
    "verificationLevel1Title",
    "verificationLevel2Title",
    "verificationLevel3Title",
    "verificationLevel4Title",
    "verificationLevel5Title",
  ]) {
    assert.doesNotMatch(
      stripped,
      new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      `verification page must no longer reference ${k} as primary structure`,
    );
  }
});

test("verification: no Niveau wording, no VerificationBadge, no marketplace-benefits sidebar", () => {
  const stripped = stripJsComments(verificationSrc);
  assert.doesNotMatch(stripped, /Niveau\s*[1-5]/);
  assert.doesNotMatch(stripped, /VerificationBadge/);
  assert.doesNotMatch(stripped, /teacherVerificationMarketplaceBenefits/);
  // Pro upsell on this page mixed business plan with trust — removed.
  assert.doesNotMatch(stripped, /verificationViewPlans/);
});

test("verification: renders the five unlock cards with stable testids", () => {
  assert.match(verificationSrc, /data-testid="teacher-trust-unlock-cards"/);
  for (const key of ["map", "home", "identity", "diploma", "payments"]) {
    assert.match(
      verificationSrc,
      new RegExp(`teacher-trust-card-\\$\\{card\\.key\\}|teacher-trust-card-${key}|key: "${key}"`),
      `unlock card for "${key}" must exist`,
    );
  }
});

test("verification: trust cards reference Trust & visibility i18n keys", () => {
  for (const k of [
    "teacherTrustVisibilityTitle",
    "teacherTrustCardMapTitle",
    "teacherTrustCardHomeTitle",
    "teacherTrustCardIdentityTitle",
    "teacherTrustCardDiplomaTitle",
    "teacherTrustCardPaymentsTitle",
    "teacherTrustStatusComplete",
    "teacherTrustStatusMissing",
    "teacherTrustStatusInReview",
    "teacherTrustStatusOptional",
  ]) {
    assert.ok(
      verificationSrc.includes(k),
      `verification page must reference i18n key "${k}"`,
    );
  }
});

test("verification: diploma stays explicitly Optional (no implied requirement)", () => {
  assert.match(verificationSrc, /optional:\s*true/);
  assert.match(verificationSrc, /data-testid="teacher-trust-diploma-optional"/);
});

// ---------------------------------------------------------------------------
// 5. i18n keys exist in en / fr / es
// ---------------------------------------------------------------------------

const REQUIRED_KEYS = [
  // Launch Center
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
  // Trust & visibility
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
// 6. Forbidden-file safety net — this PR must NOT touch payment/security paths
// ---------------------------------------------------------------------------

// The user explicitly listed surfaces this PR must not modify. We approximate
// by diffing this branch against its merge-base with origin/main and asserting
// that no file changed inside those paths. When the diff command fails (e.g.
// during local dev with no origin), we softly skip.
test("forbidden files: PR does not touch Stripe/payments/security/migrations/cron/badge truth/name masking", () => {
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

  // Forbidden directories/files (regex). Anything that matches must trigger a failure.
  const forbidden: { label: string; re: RegExp }[] = [
    { label: "Stripe checkout/webhook routes", re: /^app\/api\/stripe\// },
    { label: "payment routes (other than read-only summary on verification page)", re: /^app\/api\/(payments|payouts|refunds|webhooks)\// },
    { label: "payment library helpers", re: /^lib\/payments\// },
    { label: "commission / payout logic", re: /commission|payouts|refunds/i },
    { label: "guarantee logic", re: /^lib\/guarantee\/|^app\/api\/guarantee\// },
    { label: "Supabase migrations", re: /^supabase\/migrations\// },
    { label: "RLS / security helpers", re: /^lib\/security\/|^lib\/rls\// },
    { label: "cron jobs", re: /^app\/api\/cron\/|^\.github\/workflows\/.*cron/i },
    { label: "teacher badge truth logic", re: /^lib\/teacherTrust\.|^lib\/badges\./ },
    { label: "public teacher name masking", re: /^lib\/identity\/displayName\./ },
  ];

  const violations: string[] = [];
  for (const file of changed) {
    for (const rule of forbidden) {
      if (rule.re.test(file)) {
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
  // The only role-based 403 should be the non-teacher rejection.
  const roleChecks = stripped.match(/NextResponse\.json\([^)]*status:\s*403/g) ?? [];
  // We expect exactly one 403 branch in this route — the teacher-role gate.
  assert.equal(
    roleChecks.length,
    1,
    `expected exactly one 403 branch (teacher-only). Found ${roleChecks.length}.`,
  );
});

// ---------------------------------------------------------------------------
// Misc: source-scan no public/pre-booking surface re-introduced "Niveau" copy
// ---------------------------------------------------------------------------

test("source scan: no React component renders 'Niveau 1..5' as a heading anymore", () => {
  const offenders: string[] = [];
  const allow = new Set<string>([
    // Existing i18n keys/values still mention "Niveau" — JSON is excluded
    // from this scan, only TSX/TS source code is checked.
  ]);
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
      // Allow translation strings inside JSON, but in TS/TSX a literal "Niveau 1" .. "Niveau 5"
      // would have to come back. We only flag uppercase 'N' to avoid matching "niveau" as a French
      // common noun in long-form copy elsewhere.
      if (/"\s*Niveau\s+[1-5]\b/.test(stripped) || />\s*Niveau\s+[1-5]\b/.test(stripped)) {
        offenders.push(rel);
      }
    }
  }
  walk(join(REPO_ROOT, "app"));
  walk(join(REPO_ROOT, "components"));
  assert.deepEqual(offenders, [], `Niveau 1..5 reappeared in: ${offenders.join(", ")}`);
});
