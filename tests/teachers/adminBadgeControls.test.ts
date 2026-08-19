/**
 * Regression suite for admin-controlled teacher trust badges.
 *
 * Covers the four layers we need to keep green for the
 * "Expérience vérifiée" / verified_experience badge:
 *
 *   1. Badge taxonomy — the helper emits the new badge only when the
 *      explicit input flag is true, sits between identity and founder
 *      in the priority order, and does NOT regress any pre-existing
 *      badge logic.
 *   2. Public surfaces — every existing card / profile call-site that
 *      builds badges via `getCompactTeacherBadges` now passes
 *      `verifiedExperience` from the teacher row, AND the safe public
 *      column lists (TEACHERS_LIST_SELECT + RelatedTeachersWidget +
 *      TeacherQuiz row shape) project the new column. The student
 *      search card no longer renders those pills; identity is a
 *      compact checkmark and experience/diploma stay in the profile.
 *   3. Admin route guardrails — POST/DELETE require admin JWT, hit a
 *      strict ALLOWED set, audit every toggle, never import Stripe /
 *      commission / founder-promo / Membre-Pro code, never touch
 *      profiles.role / profiles.plan, and never expose the service-
 *      role key to the client.
 *   4. Migration safety — the new column is NOT NULL DEFAULT false,
 *      the 069 non-service-write trigger is extended to pin the new
 *      column on self-INSERT and self-UPDATE, and only the boolean
 *      (not the audit metadata) is added to list_public_teachers().
 *
 * Plus a small i18n contract so the FR/EN/ES copy stays
 * launch-grade and never sneaks into over-claim language.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildTeacherBadges,
  getCompactTeacherBadges,
  type TeacherBadgeInput,
} from "@/lib/teachers/badges";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const ROOT = process.cwd();
function readRepoFile(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const baseInput: TeacherBadgeInput = {
  teacherId: "tch_admin_badge_test",
  identityVerified: false,
  identityStatus: null,
  stripeIdentityStatus: null,
  diplomaVerified: false,
  credentials: [],
  profilePlan: "free",
  reviewCount: 5,
  founder: false,
  verifiedExperience: false,
};

function withInput(over: Partial<TeacherBadgeInput>): TeacherBadgeInput {
  return { ...baseInput, ...over };
}

function ids(badges: ReturnType<typeof buildTeacherBadges>): string[] {
  return badges.map((b) => b.id);
}

// ────────────────────────────────────────────────────────────────────────────
// 1. Badge taxonomy
// ────────────────────────────────────────────────────────────────────────────

test("verified_experience badge does NOT appear when input flag is falsy", () => {
  assert.ok(!ids(buildTeacherBadges(withInput({ verifiedExperience: false }))).includes("verified_experience"));
  assert.ok(!ids(buildTeacherBadges(withInput({ verifiedExperience: null }))).includes("verified_experience"));
  assert.ok(!ids(buildTeacherBadges(withInput({ verifiedExperience: undefined }))).includes("verified_experience"));
});

test("verified_experience badge appears when input.verifiedExperience === true", () => {
  const badges = buildTeacherBadges(withInput({ verifiedExperience: true }));
  const badge = badges.find((b) => b.id === "verified_experience");
  assert.ok(badge, "verified_experience badge must be present when flag is true");
  assert.equal(badge?.type, "trust", "verified_experience must be a trust badge");
  assert.equal(badge?.icon, "experience");
});

test("verified_experience does NOT auto-fire from a verified diploma / experience credential", () => {
  // Product rule: uploading evidence does not grant the public badge.
  const badges = buildTeacherBadges(
    withInput({
      diplomaVerified: true,
      credentials: [{ type: "experience", verificationStatus: "verified" }],
    }),
  );
  assert.ok(
    !ids(badges).includes("verified_experience"),
    "verified_experience must be admin-controlled — uploads must not auto-grant it",
  );
});

test("verified_experience sits between identity and founder in priority order", () => {
  const badges = buildTeacherBadges(
    withInput({
      identityVerified: true,
      verifiedExperience: true,
      founder: true,
      diplomaVerified: true,
      reviewCount: 0,
      profilePlan: "pro",
    }),
  );
  assert.deepEqual(ids(badges), [
    "identity_verified",
    "verified_experience",
    "founder",
    "diploma_verified",
    "new_teacher",
    "pro",
  ]);
});

test("getCompactTeacherBadges promotes verified_experience over founder in the 2-slot cap", () => {
  // identity (10) wins slot 1, verified_experience (15) wins slot 2.
  const compact = getCompactTeacherBadges(
    withInput({ identityVerified: true, verifiedExperience: true, founder: true }),
  );
  assert.equal(compact.length, 2);
  assert.equal(compact[0].id, "identity_verified");
  assert.equal(compact[1].id, "verified_experience");
});

test("pre-existing badge order (without verified_experience input) is unchanged", () => {
  // Regression guard so the legacy badges.test.ts priority assertion
  // remains valid alongside this new badge.
  const badges = buildTeacherBadges(
    withInput({
      identityVerified: true,
      diplomaVerified: true,
      founder: true,
      reviewCount: 0,
      profilePlan: "pro",
      // verifiedExperience absent → no new badge
    }),
  );
  assert.deepEqual(ids(badges), [
    "identity_verified",
    "founder",
    "diploma_verified",
    "new_teacher",
    "pro",
  ]);
});

// ────────────────────────────────────────────────────────────────────────────
// 2. Public surfaces threaded `verifiedExperience` everywhere
// ────────────────────────────────────────────────────────────────────────────

test("TeacherProfile passes verifiedExperience into the badge input", () => {
  const src = readRepoFile("components/TeacherProfile.tsx");
  assert.match(
    src,
    /verifiedExperience:\s*teacher\.verifiedExperience/,
    "TeacherProfile badgeInput must thread teacher.verifiedExperience through",
  );
});

test("student search teacher card does not render experience as a pill", () => {
  const src = readRepoFile("app/(app)/student/search/page.tsx");
  const cardStart = src.indexOf("function TeacherCard({");
  assert.ok(cardStart >= 0, "inline TeacherCard must still exist");
  const card = src.slice(cardStart);
  assert.doesNotMatch(card, /<TeacherBadgePill\b/);
  assert.doesNotMatch(card, /verifiedExperience:\s*teacher\.verifiedExperience/);
  assert.match(
    readRepoFile("lib/teacherMapper.ts"),
    /verifiedExperience:\s*Boolean\(row\.verified_experience_active\)/,
    "teacherMapper must still project verifiedExperience for the profile",
  );
});

test("Landing teacher listing card does not render experience as a pill", () => {
  const src = readRepoFile("components/marketing/LandingTeacherListingCard.tsx");
  assert.doesNotMatch(src, /<TeacherBadgePill\b/);
  assert.doesNotMatch(src, /getCompactTeacherBadges/);
  assert.doesNotMatch(src, /verifiedExperience:\s*teacher\.verifiedExperience/);
  assert.match(src, /<TeacherCardIdentityCheck verified=\{identityVerified\}/);
});

test("HeroTeacherPreviewCards does not render experience as a pill", () => {
  const src = readRepoFile("components/marketing/HeroTeacherPreviewCards.tsx");
  assert.doesNotMatch(src, /<TeacherBadgePill\b/);
  assert.doesNotMatch(src, /getCompactTeacherBadges/);
  assert.doesNotMatch(src, /verifiedExperience:\s*teacher\.verifiedExperience/);
  assert.match(src, /<TeacherCardIdentityCheck verified=\{identityVerified\}/);
});

test("Blog RelatedTeachersWidget still selects verified_experience_active but does not render it as a pill", () => {
  const src = readRepoFile("components/blog/RelatedTeachersWidget.tsx");
  assert.doesNotMatch(src, /<TeacherBadgePill\b/);
  assert.doesNotMatch(src, /getCompactTeacherBadges/);
  assert.doesNotMatch(src, /verifiedExperience:\s*teacher\.verified_experience_active/);
  // Both .select() calls must include the column so the public surface
  // hydrates it even after the fallback query.
  const selectCalls = src.match(/\.select\([^)]*verified_experience_active[^)]*\)/g) ?? [];
  assert.ok(
    selectCalls.length >= 2,
    "both select() calls must include verified_experience_active",
  );
});

test("TeacherQuiz row shape still projects verifiedExperience; quiz card does not render it as a pill", () => {
  const src = readRepoFile("components/marketing/TeacherQuiz.tsx");
  assert.match(src, /verified_experience_active:\s*boolean\s*\|\s*null/);
  assert.match(src, /verified_experience_active:\s*t\.verifiedExperience/);
  assert.doesNotMatch(src, /<TeacherBadgePill\b/);
  assert.doesNotMatch(src, /getCompactTeacherBadges/);
  assert.match(src, /<TeacherCardIdentityCheck verified=\{identityVerified\}/);
});

test("TEACHERS_LIST_SELECT includes verified_experience_active so it flows through every list query", () => {
  const src = readRepoFile("lib/supabase/queries.ts");
  assert.match(
    src,
    /TEACHERS_LIST_SELECT[^=]*=\s*["'][^"']*verified_experience_active[^"']*["']/,
    "verified_experience_active must be in the shared safe-public select",
  );
});

test("mobile teacher card still splits name and badges into separate rows", () => {
  // The mobile QA comment block in app/(app)/student/search/page.tsx
  // explains why badges must NOT share the name row. Keep the comment
  // anchored so a future refactor that re-collapses the layout fails
  // this test and triggers a UX review.
  const src = readRepoFile("app/(app)/student/search/page.tsx");
  assert.match(
    src,
    /Mobile QA fix[\s\S]*the teacher name MUST stay visible on narrow screens/i,
    "the mobile-name-protection comment must remain in place",
  );
});

// ────────────────────────────────────────────────────────────────────────────
// 3. Admin route guardrails
// ────────────────────────────────────────────────────────────────────────────

const ADMIN_ROUTE_PATH = "app/api/admin/users/[id]/teacher-badge/route.ts";
const ADMIN_ROUTE_SRC = readRepoFile(ADMIN_ROUTE_PATH);

function stripCommentsAndStrings(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/`(?:\\.|[^`\\])*`/g, "``");
}

const ADMIN_ROUTE_CODE = stripCommentsAndStrings(ADMIN_ROUTE_SRC);

test("admin badge route requires admin JWT (requireAdminApi) for BOTH POST and DELETE", () => {
  const postBlock = ADMIN_ROUTE_SRC.match(/export\s+async\s+function\s+POST[\s\S]*?(?=export\s+async\s+function|$)/);
  const deleteBlock = ADMIN_ROUTE_SRC.match(/export\s+async\s+function\s+DELETE[\s\S]*?$/);
  assert.ok(postBlock, "POST handler must exist");
  assert.ok(deleteBlock, "DELETE handler must exist");
  assert.match(postBlock![0], /requireAdminApi\(req\)/);
  assert.match(deleteBlock![0], /requireAdminApi\(req\)/);
});

test("admin badge route uses a strict ALLOWED_BADGES allowlist", () => {
  assert.match(
    ADMIN_ROUTE_SRC,
    /ALLOWED_BADGES[\s\S]*verified_experience/,
    "verified_experience must be in the ALLOWED_BADGES map",
  );
  // The route must reject unknown badges with 400 instead of touching the DB.
  assert.match(
    ADMIN_ROUTE_SRC,
    /Badge inconnu/,
    "unknown badge keys must surface a clear error",
  );
});

test("admin badge route audits every toggle via insertAdminRoleChangeAudit", () => {
  assert.match(ADMIN_ROUTE_SRC, /insertAdminRoleChangeAudit/);
  assert.match(
    ADMIN_ROUTE_SRC,
    /source:\s*["']admin\/users\/teacher-badge["']/,
    "audit rows must be tagged with source=admin/users/teacher-badge",
  );
  // Role MUST NOT change — teacher stays teacher; reason captures the
  // badge + action so forensic queries by `reason` work.
  assert.match(ADMIN_ROUTE_SRC, /previousRole:\s*["']teacher["']/);
  assert.match(ADMIN_ROUTE_SRC, /newRole:\s*["']teacher["']/);
  assert.match(ADMIN_ROUTE_SRC, /reason:\s*`teacher-badge:\$\{badge\}:(activate|deactivate)`/);
});

test("admin badge route never imports Stripe / commission / founder-promo / Membre-Pro code", () => {
  // Each forbidden substring is checked in the comment-stripped source.
  for (const forbidden of [
    /from\s+["']stripe["']/i,
    /from\s+["']@\/lib\/payments\//,
    /from\s+["']@\/lib\/admin\/founderPromo["']/,
    /founderPromo/i,
    /commission/i,
    /membre[_\s-]?pro/i,
  ]) {
    assert.doesNotMatch(
      ADMIN_ROUTE_CODE,
      forbidden,
      `admin badge route must not reference: ${forbidden}`,
    );
  }
});

test("admin badge route never writes profiles.role / profiles.plan / Stripe columns / is_verified", () => {
  for (const forbidden of [
    /\.from\(["']profiles["']\)[\s\S]{0,200}?\.update\(/i,
    /stripe_account_id/i,
    /subscription_status/i,
    /\bplan:/i,
    /is_verified/i,
    /identity_verified/i,
    /diploma_verified/i,
  ]) {
    assert.doesNotMatch(
      ADMIN_ROUTE_CODE,
      forbidden,
      `admin badge route must not touch sensitive column / table: ${forbidden}`,
    );
  }
});

test("admin badge route never logs the actor's session token or service-role key", () => {
  assert.doesNotMatch(ADMIN_ROUTE_CODE, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(ADMIN_ROUTE_CODE, /access_token/i);
});

// ────────────────────────────────────────────────────────────────────────────
// 4. Admin UI client component safety
// ────────────────────────────────────────────────────────────────────────────

const ADMIN_CARD_SRC = readRepoFile("components/admin/TeacherBadgesCard.tsx");

test('TeacherBadgesCard is a "use client" component', () => {
  assert.match(ADMIN_CARD_SRC.split("\n").slice(0, 3).join("\n"), /["']use client["']/);
});

test("TeacherBadgesCard never imports the service-role admin client or the founder promo / Stripe libs", () => {
  // Imports are the actual exposure surface — guard them precisely.
  // (The JSX "ce qui ne change pas" copy intentionally mentions
  // commission / Stripe / promo as user-visible boundary text, which
  // is desirable, so we don't scan for those words in JSX literals.)
  const importLines = ADMIN_CARD_SRC.split("\n").filter((line) => /^\s*import\s/.test(line));
  const joined = importLines.join("\n");
  for (const forbidden of [
    /@\/lib\/supabaseAdmin/,
    /from\s+["']stripe["']/i,
    /@\/lib\/admin\/founderPromo/,
    /@\/lib\/payments\//,
  ]) {
    assert.doesNotMatch(joined, forbidden, `client card must not import: ${forbidden}`);
  }
  // Service-role env key must never appear anywhere in the client bundle.
  assert.doesNotMatch(ADMIN_CARD_SRC, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("TeacherBadgesCard renders the guard copy about uploads not auto-activating the badge", () => {
  // Anchors the product rule in the UI itself so a future copy edit
  // can't quietly remove the boundary message.
  assert.match(ADMIN_CARD_SRC, /pas automatiquement/i);
  assert.match(ADMIN_CARD_SRC, /diplôme|preuve/i);
});

test("TeacherBadgesCard mentions the guardrails it deliberately does NOT touch", () => {
  // The card spells out what it does not change so the admin can't
  // confuse it with a role/Stripe/commission control.
  for (const phrase of [/rôle/i, /Stripe/i, /commission/i, /onboarding/i]) {
    assert.match(ADMIN_CARD_SRC, phrase);
  }
});

test("TeacherBadgesCard exposes Activer + Désactiver actions and Actif / Inactif status", () => {
  assert.match(ADMIN_CARD_SRC, /Activer/);
  assert.match(ADMIN_CARD_SRC, /Désactiver/);
  assert.match(ADMIN_CARD_SRC, /Actif/);
  assert.match(ADMIN_CARD_SRC, /Inactif/);
});

test("admin user detail page wires TeacherBadgesCard for teacher profiles", () => {
  const page = readRepoFile("app/(app)/admin/users/[id]/page.tsx");
  assert.match(page, /TeacherBadgesCard/);
  assert.match(
    page,
    /verified_experience_active,\s*verified_experience_set_at,\s*verified_experience_set_by/,
    "page must fetch the badge audit metadata server-side",
  );
});

// ────────────────────────────────────────────────────────────────────────────
// 5. Migration safety
// ────────────────────────────────────────────────────────────────────────────

const MIGRATION_PATH = "supabase/migrations/081_admin_teacher_badges.sql";
const MIGRATION_SRC = readRepoFile(MIGRATION_PATH);

test("migration 081 adds verified_experience_active as NOT NULL DEFAULT false", () => {
  assert.match(
    MIGRATION_SRC,
    /verified_experience_active\s+boolean\s+NOT\s+NULL\s+DEFAULT\s+false/i,
  );
});

test("migration 081 adds the audit metadata columns (set_at + set_by)", () => {
  assert.match(MIGRATION_SRC, /verified_experience_set_at\s+timestamptz/i);
  assert.match(MIGRATION_SRC, /verified_experience_set_by\s+uuid/i);
});

test("migration 081 extends the non-service-write trigger to pin the new columns", () => {
  // Both INSERT and UPDATE branches of the trigger function must reset
  // the new columns so a teacher cannot self-grant from the browser.
  assert.match(MIGRATION_SRC, /CREATE OR REPLACE FUNCTION public\.teachers_preserve_sensitive_client_fields/);
  assert.match(
    MIGRATION_SRC,
    /NEW\.verified_experience_active\s*:=\s*false/,
    "INSERT branch must zero the badge for non-service-role JWTs",
  );
  assert.match(
    MIGRATION_SRC,
    /NEW\.verified_experience_active\s*:=\s*OLD\.verified_experience_active/,
    "UPDATE branch must preserve OLD for non-service-role JWTs",
  );
});

test("migration 081 projects ONLY the boolean (not the audit metadata) into list_public_teachers()", () => {
  // Boolean: yes
  assert.match(
    MIGRATION_SRC,
    /list_public_teachers[\s\S]*?verified_experience_active\s+boolean/i,
  );
  // Audit metadata: must NOT appear in the function's RETURNS TABLE block.
  const fnBlock = MIGRATION_SRC.match(/RETURNS TABLE \(([\s\S]*?)\)\s*LANGUAGE sql/);
  assert.ok(fnBlock, "could not locate the RETURNS TABLE block");
  assert.doesNotMatch(fnBlock![1], /verified_experience_set_at/);
  assert.doesNotMatch(fnBlock![1], /verified_experience_set_by/);
});

test("migration 081 never disables RLS, never adds permissive policies, and never grants to anon write paths", () => {
  assert.doesNotMatch(MIGRATION_SRC, /disable\s+row\s+level\s+security/i);
  assert.doesNotMatch(MIGRATION_SRC, /create\s+policy[\s\S]{0,200}?using\s*\(\s*true\s*\)/i);
  assert.doesNotMatch(MIGRATION_SRC, /grant\s+(insert|update|delete)\s+on\s+public\.teachers\s+to\s+(anon|authenticated)/i);
});

test("migration 081 does not introduce promotion / booking / commission / subscription schema changes", () => {
  // The trigger function in this migration legitimately mentions
  // `stripe_*` columns because it preserves OLD values per migration
  // 069's contract — that surface is covered by
  // tests/security/productionAccessAudit.test.ts and must not be
  // duplicated here. What this migration must NOT do is introduce any
  // NEW Stripe / payment / promo / booking writes.
  const codeOnly = MIGRATION_SRC
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
  for (const banned of [
    /admin_founder_promotions/i,
    /booking_payments/i,
    /\bcommission\b/i,
    /pro_current_period_end/i,
    /subscription_status/i,
    // No new Stripe writes — only the OLD/NULL preservation lines
    // borrowed from 069's trigger are acceptable, and those use `:=`.
    /(create|alter|insert\s+into|update)[^;]*\bstripe_/i,
  ]) {
    assert.doesNotMatch(
      codeOnly,
      banned,
      `migration 081 must not introduce: ${banned}`,
    );
  }
});

// ────────────────────────────────────────────────────────────────────────────
// 6. i18n contract
// ────────────────────────────────────────────────────────────────────────────

const FR = JSON.parse(readRepoFile("lib/i18n/locales/fr.json")) as Record<string, string>;
const EN = JSON.parse(readRepoFile("lib/i18n/locales/en.json")) as Record<string, string>;
const ES = JSON.parse(readRepoFile("lib/i18n/locales/es.json")) as Record<string, string>;

test("teacherBadgeVerifiedExperience copy exists in fr/en/es with the agreed phrasing", () => {
  assert.equal(FR.teacherBadgeVerifiedExperience, "Expérience vérifiée");
  assert.equal(EN.teacherBadgeVerifiedExperience, "Verified experience");
  assert.equal(ES.teacherBadgeVerifiedExperience, "Experiencia verificada");
});

test("teacherBadgeVerifiedExperienceDescription exists in fr/en/es", () => {
  for (const dict of [FR, EN, ES]) {
    assert.equal(typeof dict.teacherBadgeVerifiedExperienceDescription, "string");
    assert.ok((dict.teacherBadgeVerifiedExperienceDescription ?? "").length > 0);
  }
});

test("verified-experience copy must avoid overclaim language (certified / guaranteed / official endorsement)", () => {
  const banned = {
    fr: /\b(certifié|garanti|officiellement\s+approuv|gouvernement|enquête\s+de\s+crédit)\b/i,
    en: /\b(certified|guaranteed|officially\s+endorsed|government|background\s+check)\b/i,
    es: /\b(certificado|garantizado|oficialmente\s+aprobado|gobierno|verificación\s+de\s+antecedentes)\b/i,
  };
  const combinedFr = `${FR.teacherBadgeVerifiedExperience} ${FR.teacherBadgeVerifiedExperienceDescription}`;
  const combinedEn = `${EN.teacherBadgeVerifiedExperience} ${EN.teacherBadgeVerifiedExperienceDescription}`;
  const combinedEs = `${ES.teacherBadgeVerifiedExperience} ${ES.teacherBadgeVerifiedExperienceDescription}`;
  assert.doesNotMatch(combinedFr, banned.fr);
  assert.doesNotMatch(combinedEn, banned.en);
  assert.doesNotMatch(combinedEs, banned.es);
});

// ────────────────────────────────────────────────────────────────────────────
// Runner
// ────────────────────────────────────────────────────────────────────────────

async function main() {
  let passed = 0;
  const failed: Array<{ name: string; err: unknown }> = [];

  for (const { name, fn } of tests) {
    try {
      await fn();
      passed++;
      console.log(`  ok  ${name}`);
    } catch (err) {
      failed.push({ name, err });
      console.log(`  FAIL ${name}`);
    }
  }

  console.log(`\n${passed}/${tests.length} passed`);

  if (failed.length > 0) {
    for (const { name, err } of failed) {
      console.error(`\n--- ${name} ---`);
      console.error(err);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
