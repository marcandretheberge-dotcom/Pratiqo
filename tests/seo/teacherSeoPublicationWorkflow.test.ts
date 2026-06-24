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

test("admin publish blocked when teaching format is missing", () => {
  const row = {
    ...baseRow,
    public_profile_enabled: true,
    search_indexing_consent: true,
    public_profile_slug: "marie-d-espagnol-levis",
    teaching_mode: "",
  };
  const evaluation = evaluateTeacherSeoPublication(row, "fr");
  assert.ok(evaluation.adminPublishBlockers.includes("teaching_format"));
  assert.equal(evaluation.canAdminPublish, false);
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

test("admin publish remains available when teacher is already public but admin marker is missing", () => {
  const row = {
    ...baseRow,
    is_public: true,
    public_profile_enabled: true,
    search_indexing_consent: true,
    public_profile_slug: "marie-d-espagnol-levis",
    public_profile_last_indexable_at: null,
  };
  const evaluation = evaluateTeacherSeoPublication(row, "fr");
  assert.equal(evaluation.isPublic, true);
  assert.equal(evaluation.adminPublished, false);
  assert.equal(evaluation.publicProfileLastIndexableAt, null);
  assert.equal(evaluation.isSitemapEligible, false);
  assert.equal(evaluation.canAdminPublish, true);
});

test("teacher self-serve visibility + consent without admin marker is not indexable", () => {
  const row = {
    ...baseRow,
    is_public: true,
    public_profile_enabled: true,
    search_indexing_consent: true,
    public_profile_slug: "marie-d-espagnol-levis",
    public_profile_last_indexable_at: null,
  };
  assert.equal(isTeacherPublicProfilePageVisible(row), true);
  assert.equal(isTeacherPublicProfileIndexable(row), false);
  const evaluation = evaluateTeacherSeoPublication(row, "fr");
  assert.equal(evaluation.isSitemapEligible, false);
  assert.ok(evaluation.missingReasonKeys.includes("not_admin_published"));
});

test("teacher seo request route does not set admin publication marker", () => {
  const teacherRoute = read("app/api/teacher/profile/seo-publication/route.ts");
  assert.doesNotMatch(teacherRoute, /public_profile_last_indexable_at:\s*now/);
  assert.doesNotMatch(teacherRoute, /public_profile_last_indexable_at:\s*new Date/);
});

test("teacher visibility route does not set admin publication marker", () => {
  const visibilityRoute = read("app/api/teacher/profile/visibility/route.ts");
  assert.doesNotMatch(visibilityRoute, /public_profile_last_indexable_at/);
});

test("admin unpublish clears admin publication marker", () => {
  const adminRoute = read("app/api/admin/users/[id]/teacher-seo-publish/route.ts");
  assert.match(adminRoute, /public_profile_last_indexable_at:\s*null/);
});

test("indexability requires admin publication marker in central helper", () => {
  const helper = read("lib/seo/teacherPublicProfile.ts");
  assert.match(helper, /isTeacherAdminSeoPublished/);
  assert.match(helper, /public_profile_last_indexable_at/);
});

test("published teacher is indexable and sitemap eligible", () => {
  const row = {
    ...baseRow,
    is_public: true,
    public_profile_enabled: true,
    search_indexing_consent: true,
    public_profile_slug: "marie-d-espagnol-levis",
    public_profile_last_indexable_at: "2026-06-01T12:00:00.000Z",
  };
  assert.equal(isTeacherPublicProfileIndexable(row), true);
  const evaluation = evaluateTeacherSeoPublication(row, "fr");
  assert.equal(evaluation.isSitemapEligible, true);
  assert.equal(evaluation.adminPublished, true);
  assert.equal(evaluation.publicProfileLastIndexableAt, "2026-06-01T12:00:00.000Z");
  assert.equal(evaluation.canAdminPublish, false);
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

test("admin SEO publication card is visible, explicit, and shows blockers inside the card", () => {
  const card = read("components/admin/TeacherSeoPublicationCard.tsx");
  assert.match(card, /Publication SEO du profil/);
  assert.match(
    card,
    /Contrôlez si ce profil de professeur peut être publié dans Google et ajouté au sitemap\./,
  );
  assert.match(card, /Non demandé/);
  assert.match(card, /Demandé par le professeur/);
  assert.match(card, /Prêt pour publication/);
  assert.match(card, /Publié dans le sitemap/);
  assert.match(card, /Bloqué/);
  assert.match(card, /public_profile_last_indexable_at/);
  assert.match(card, /admin-teacher-seo-publish-button/);
  assert.match(card, /admin-teacher-seo-unpublish-button/);
  assert.match(card, /Le professeur doit d&apos;abord demander la publication et accepter l&apos;indexation\./);
  assert.match(
    card,
    /Connect Stripe doit être complété avant la publication d&apos;un profil qui accepte les réservations payantes\./,
  );
  assert.match(card, /generatedTitle/);
  assert.match(card, /generatedDescription/);
  assert.match(card, /canonicalUrl/);
});

test("admin SEO publication card does not hardcode named teacher IDs or names", () => {
  const adminPage = read("app/(app)/admin/users/[id]/page.tsx");
  const card = read("components/admin/TeacherSeoPublicationCard.tsx");
  const publishRoute = read("app/api/admin/users/[id]/teacher-seo-publish/route.ts");
  for (const source of [adminPage, card, publishRoute]) {
    assert.doesNotMatch(source, /Francis Audet/i);
    assert.doesNotMatch(source, /El profe Juan/i);
    assert.doesNotMatch(source, /70e4047e-b6e4-4b58-a049-ce10af676150/i);
    assert.doesNotMatch(source, /c84a6d10-e987-4f08-a6e1-fcb260cab632/i);
  }
});

test("non-admin access to SEO publish API is rejected through requireAdminApi", () => {
  const adminRoute = read("app/api/admin/users/[id]/teacher-seo-publish/route.ts");
  assert.match(adminRoute, /requireAdminApi\(req\)/);
  assert.match(adminRoute, /if \(auth\.status === "error"\) return auth\.response/);
});

test("professeurs page does not expose private fields", () => {
  const pageSrc = read("app/professeurs/[slug]/page.tsx");
  assert.doesNotMatch(pageSrc, /identity_status/);
  assert.doesNotMatch(pageSrc, /diploma_url/);
  assert.doesNotMatch(pageSrc, /stripe_connect/);
});

console.log("[seo:teacherSeoPublicationWorkflow] tests passed");
