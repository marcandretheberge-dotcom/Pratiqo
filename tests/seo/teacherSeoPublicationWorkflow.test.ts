/**
 * Teacher self-serve SEO publication workflow.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  collectTeacherSeoAdminPublishBlockers,
  evaluateTeacherSeoPublication,
  isTeacherSeoProfileContentReady,
  teacherHasRequestedSeoPublication,
} from "../../lib/seo/teacherSeoPublication";
import {
  isTeacherPublicProfileIndexable,
  isTeacherPublicProfilePageVisible,
} from "../../lib/seo/teacherPublicProfile";

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

const baseRow = {
  id: "afe6eab4-f40d-4d84-add9-8e061184ef6f",
  user_id: "0bbed16d-e677-47b3-9c87-03fca0109704",
  name: "Marie Dubois",
  bio: "Professeure passionnée avec plus de dix ans d'expérience en classe et en ligne.",
  discipline: "Espagnol",
  city: "Lévis",
  region: "QC",
  country_code: "CA",
  teaching_mode: "both",
  is_public: false,
  deactivated_at: null,
  deleted_at: null,
  is_demo: false,
  identity_verification_failed: false,
  public_profile_enabled: false,
  search_indexing_consent: false,
  public_profile_slug: null,
  teacher_onboarding_complete: true,
  profile_is_active: true,
  profile_deactivated_at: null,
  profile_deleted_at: null,
  profile_anonymized_at: null,
  subject_count: 1,
  price_per_lesson: 45,
  intro_session_enabled: false,
  stripe_account_id: "acct_test",
  stripe_connect_onboarding_complete: true,
  stripe_connect_charges_enabled: true,
  stripe_connect_payouts_enabled: true,
  stripe_connect_requirements_due: [],
  stripe_connect_disabled_reason: null,
};

test("incomplete teacher sees missing SEO fields", () => {
  const row = { ...baseRow, bio: "short", discipline: "", subject_count: 0 };
  const evaluation = evaluateTeacherSeoPublication(row, "fr");
  assert.equal(evaluation.contentReady, false);
  assert.ok(evaluation.missingReasonKeys.includes("public_bio"));
  assert.ok(evaluation.missingReasonKeys.includes("main_subject"));
  assert.equal(evaluation.canRequestPublication, false);
});

test("complete teacher can request publication without is_public", () => {
  const row = { ...baseRow };
  assert.equal(isTeacherSeoProfileContentReady(row), true);
  const evaluation = evaluateTeacherSeoPublication(row, "fr");
  assert.equal(evaluation.canRequestPublication, true);
  assert.equal(evaluation.isPublic, false);
  assert.equal(evaluation.isIndexable, false);
});

test("teacher consent intent fields without admin publish", () => {
  const row = {
    ...baseRow,
    public_profile_enabled: true,
    search_indexing_consent: true,
    public_profile_slug: "marie-d-espagnol-levis",
  };
  assert.equal(teacherHasRequestedSeoPublication(row), true);
  assert.equal(isTeacherPublicProfilePageVisible(row), false);
  assert.equal(isTeacherPublicProfileIndexable(row), false);
  const evaluation = evaluateTeacherSeoPublication(row, "fr");
  assert.ok(evaluation.missingReasonKeys.includes("not_admin_published"));
});

test("admin publish blocked when consent missing", () => {
  const row = { ...baseRow, public_profile_slug: "marie-d-espagnol-levis" };
  const blockers = collectTeacherSeoAdminPublishBlockers(row);
  assert.ok(blockers.includes("search_consent_missing"));
  assert.ok(blockers.includes("public_profile_intent_missing"));
});

test("admin publish blocked when payout readiness missing and paid booking enabled", () => {
  const row = {
    ...baseRow,
    public_profile_enabled: true,
    search_indexing_consent: true,
    public_profile_slug: "marie-d-espagnol-levis",
    stripe_connect_payouts_enabled: false,
  };
  const blockers = collectTeacherSeoAdminPublishBlockers(row);
  assert.ok(blockers.includes("payout_not_ready"));
});

test("admin publish eligible for complete consented teacher with payout ready", () => {
  const row = {
    ...baseRow,
    public_profile_enabled: true,
    search_indexing_consent: true,
    public_profile_slug: "marie-d-espagnol-levis",
  };
  const blockers = collectTeacherSeoAdminPublishBlockers(row);
  assert.deepEqual(blockers, []);
  const evaluation = evaluateTeacherSeoPublication(row, "fr");
  assert.equal(evaluation.canAdminPublish, true);
});

test("published teacher is indexable and sitemap eligible", () => {
  const row = {
    ...baseRow,
    is_public: true,
    public_profile_enabled: true,
    search_indexing_consent: true,
    public_profile_slug: "marie-d-espagnol-levis",
  };
  assert.equal(isTeacherPublicProfileIndexable(row), true);
  const evaluation = evaluateTeacherSeoPublication(row, "fr");
  assert.equal(evaluation.isSitemapEligible, true);
  assert.equal(evaluation.canAdminUnpublish, true);
});

test("unpublished private teacher excluded from indexable SEO profile", () => {
  const row = {
    ...baseRow,
    is_public: false,
    public_profile_enabled: true,
    search_indexing_consent: true,
    public_profile_slug: "marie-d-espagnol-levis",
  };
  assert.equal(isTeacherPublicProfileIndexable(row), false);
});

test("teacher seo publication API route exists server-side", () => {
  const teacherRoute = read("app/api/teacher/profile/seo-publication/route.ts");
  assert.match(teacherRoute, /getSupabaseAdmin/);
  assert.match(teacherRoute, /evaluateTeacherSeoPublication/);
  assert.doesNotMatch(teacherRoute, /is_public:\s*true/);
});

test("admin seo publish route sets is_public on publish only", () => {
  const adminRoute = read("app/api/admin/users/[id]/teacher-seo-publish/route.ts");
  assert.match(adminRoute, /requireAdminApi/);
  assert.match(adminRoute, /collectTeacherSeoAdminPublishBlockers/);
  assert.match(adminRoute, /is_public:\s*true/);
  assert.match(adminRoute, /is_public:\s*false/);
  assert.doesNotMatch(adminRoute, /deactivated_at/);
});

test("consent API no longer requires marketplace visibility before consent", () => {
  const consentRoute = read("app/api/teacher/profile/search-indexing-consent/route.ts");
  assert.match(consentRoute, /isTeacherSeoProfileContentReady/);
  assert.doesNotMatch(consentRoute, /isTeacherMarketplaceVisibleRow/);
});

test("teacher dashboard mounts SEO readiness card", () => {
  const dashboard = read("components/Dashboard.tsx");
  assert.match(dashboard, /TeacherSeoReadinessCard/);
});

test("admin user page mounts SEO publication card", () => {
  const page = read("app/(app)/admin/users/[id]/page.tsx");
  assert.match(page, /TeacherSeoPublicationCard/);
  assert.match(page, /evaluateTeacherSeoPublication/);
});

test("professeurs page does not expose private fields", () => {
  const pageSrc = read("app/professeurs/[slug]/page.tsx");
  assert.doesNotMatch(pageSrc, /identity_status/);
  assert.doesNotMatch(pageSrc, /diploma_url/);
  assert.doesNotMatch(pageSrc, /stripe_connect/);
});

console.log("[seo:teacherSeoPublicationWorkflow] tests passed");
