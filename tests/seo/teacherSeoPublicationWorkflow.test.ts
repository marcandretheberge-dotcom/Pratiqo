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
  resolveTeacherGoogleSeoPublicationStatus,
  teacherHasPublicTeachingFormat,
  teacherHasRequestedSeoPublication,
} from "../../lib/seo/teacherSeoPublication";
import {
  buildTeacherPublicProfileDescription,
  isTeacherPublicProfileIndexable,
  isTeacherPublicProfilePageVisible,
  isTeacherSeoAcceptedTeachingMode,
  resolveTeacherSeoCityLabel,
} from "../../lib/seo/teacherPublicProfile";
import { formatTeacherSeoTeachingFormatLabel } from "../../lib/seo/teacherPublicProfileLabels";

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

test("admin publish is not blocked when payout readiness is missing", () => {
  const row = {
    ...baseRow,
    public_profile_enabled: true,
    search_indexing_consent: true,
    public_profile_slug: "marie-d-espagnol-levis",
    stripe_connect_payouts_enabled: false,
  };
  const blockers = collectTeacherSeoAdminPublishBlockers(row);
  assert.doesNotMatch(blockers.join(","), /payout_not_ready/);
  const evaluation = evaluateTeacherSeoPublication(row, "fr");
  assert.equal(evaluation.canAdminPublish, true);
  assert.equal(evaluation.paymentReady, true);
  assert.equal(evaluation.payoutReady, false);
  assert.ok(evaluation.bookingBlockers.includes("payout_not_ready"));
});

test("complete public profile remains visible when Stripe setup is incomplete", () => {
  const row = {
    ...baseRow,
    is_public: true,
    public_profile_enabled: true,
    search_indexing_consent: true,
    public_profile_slug: "marie-d-espagnol-levis",
    stripe_account_id: null,
    stripe_connect_onboarding_complete: false,
    stripe_connect_charges_enabled: false,
    stripe_connect_payouts_enabled: false,
  };
  const evaluation = evaluateTeacherSeoPublication(row, "fr");
  assert.equal(evaluation.isPublic, true);
  assert.equal(evaluation.isPageVisible, true);
  assert.equal(evaluation.canAdminPublish, true);
  assert.equal(evaluation.paymentReady, false);
  assert.equal(evaluation.payoutReady, false);
  assert.doesNotMatch(evaluation.adminPublishBlockers.join(","), /payout_not_ready/);
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

test("teaching_mode all is an accepted public SEO teaching format", () => {
  assert.equal(isTeacherSeoAcceptedTeachingMode("all"), true);
  assert.equal(teacherHasPublicTeachingFormat({ teaching_mode: "all" }), true);
});

test("teaching_mode all satisfies SEO readiness without teaching_format blocker", () => {
  const francisStyleRow = {
    ...baseRow,
    name: "Francis Audet",
    discipline: "Guitare",
    city: "Saint-Georges",
    region: "QC",
    teaching_mode: "all",
    is_public: true,
    public_profile_enabled: true,
    search_indexing_consent: true,
    public_profile_slug: "francis-a-guitare-saint-georges",
  };
  assert.equal(isTeacherSeoProfileContentReady(francisStyleRow), true);
  const evaluation = evaluateTeacherSeoPublication(francisStyleRow, "fr");
  assert.equal(evaluation.contentReady, true);
  assert.ok(!evaluation.adminPublishBlockers.includes("teaching_format"));
  assert.ok(!evaluation.missingReasonKeys.includes("teaching_format"));
});

test("teacher with teaching_mode all can request publication when other fields complete", () => {
  const row = { ...baseRow, teaching_mode: "all" };
  assert.equal(isTeacherSeoProfileContentReady(row), true);
  assert.equal(evaluateTeacherSeoPublication(row, "fr").canRequestPublication, true);
});

test("metadata and teaching format label render safely for teaching_mode all", () => {
  const labelFr = formatTeacherSeoTeachingFormatLabel("fr", "all");
  assert.match(labelFr ?? "", /En ligne, chez le professeur et chez l'élève/);
  const labelEn = formatTeacherSeoTeachingFormatLabel("en", "all");
  assert.match(labelEn ?? "", /Online, at the teacher's place and at the student's place/);
  const cityLabel = resolveTeacherSeoCityLabel("fr", {
    city: "Saint-Georges",
    region: "QC",
    teachingMode: "all",
  });
  assert.equal(cityLabel, "Saint-Georges");
  const description = buildTeacherPublicProfileDescription({
    locale: "fr",
    subject: "Guitare",
    firstName: "Francis",
    cityLabel,
  });
  assert.match(description ?? "", /en ligne ou en personne/i);
});

test("teaching_mode all without admin marker still requires admin SEO publication", () => {
  const row = {
    ...baseRow,
    teaching_mode: "all",
    public_profile_enabled: true,
    search_indexing_consent: true,
    public_profile_slug: "marie-d-espagnol-levis",
    public_profile_last_indexable_at: null,
  };
  assert.equal(isTeacherPublicProfileIndexable(row), false);
  const evaluation = evaluateTeacherSeoPublication(row, "fr");
  assert.equal(evaluation.canAdminPublish, true);
  assert.ok(evaluation.missingReasonKeys.includes("not_admin_published"));
});

test("admin publish eligible for complete consented teacher with Stripe ready", () => {
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
  assert.equal(evaluation.googleSeoStatus, "ready_to_publish");
  assert.equal(evaluation.canAdminPublish, true);
});

test("google SEO status is not published when admin marker is missing", () => {
  const row = {
    ...baseRow,
    public_profile_enabled: false,
    search_indexing_consent: false,
  };
  const evaluation = evaluateTeacherSeoPublication(row, "fr");
  assert.equal(evaluation.googleSeoStatus, "not_published");
});

test("google SEO status is blocked when teacher requested but blockers remain", () => {
  const row = {
    ...baseRow,
    public_profile_enabled: true,
    search_indexing_consent: true,
    public_profile_slug: "",
    teaching_mode: "",
  };
  const evaluation = evaluateTeacherSeoPublication(row, "fr");
  assert.equal(evaluation.googleSeoStatus, "blocked");
});

test("google SEO status is published in Google when admin marker exists", () => {
  const row = {
    ...baseRow,
    is_public: true,
    public_profile_enabled: true,
    search_indexing_consent: true,
    public_profile_slug: "marie-d-espagnol-levis",
    public_profile_last_indexable_at: "2026-06-01T12:00:00.000Z",
  };
  const evaluation = evaluateTeacherSeoPublication(row, "fr");
  assert.equal(evaluation.googleSeoStatus, "published_in_google");
});

test("resolveTeacherGoogleSeoPublicationStatus treats partial teacher request as requested", () => {
  const status = resolveTeacherGoogleSeoPublicationStatus({
    adminPublished: false,
    teacherRequestedPublication: false,
    teacherPartialSeoRequest: true,
    adminPublishBlockers: ["search_consent_missing"],
  });
  assert.equal(status, "requested");
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

test("admin unpublish clears admin publication marker only", () => {
  const adminRoute = read("app/api/admin/users/[id]/teacher-seo-publish/route.ts");
  const unpublishBlock = adminRoute.match(/action === "unpublish"[\s\S]*?} else if \(action === "hide_marketplace"\)/);
  assert.ok(unpublishBlock, "expected unpublish branch before hide_marketplace");
  assert.match(unpublishBlock![0], /public_profile_last_indexable_at:\s*null/);
  assert.doesNotMatch(unpublishBlock![0], /is_public:\s*false/);
});

test("admin hide_marketplace action sets is_public false without clearing SEO marker in same update", () => {
  const adminRoute = read("app/api/admin/users/[id]/teacher-seo-publish/route.ts");
  assert.match(adminRoute, /hide_marketplace/);
  const hideBlock = adminRoute.match(/action === "hide_marketplace"[\s\S]*?} else \{/);
  assert.ok(hideBlock);
  assert.match(hideBlock![0], /is_public:\s*false/);
  assert.doesNotMatch(hideBlock![0], /public_profile_last_indexable_at:\s*null/);
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
  assert.equal(evaluation.canAdminRemoveFromGoogle, true);
  assert.equal(evaluation.canAdminUnpublish, true);
});

test("remove from Google eligibility requires admin marker", () => {
  const row = {
    ...baseRow,
    is_public: true,
    public_profile_enabled: true,
    search_indexing_consent: true,
    public_profile_slug: "marie-d-espagnol-levis",
    public_profile_last_indexable_at: null,
  };
  const evaluation = evaluateTeacherSeoPublication(row, "fr");
  assert.equal(evaluation.canAdminRemoveFromGoogle, false);
  assert.equal(evaluation.canAdminHideFromMarketplace, true);
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

test("admin seo publish route sets is_public on publish and hide_marketplace only", () => {
  const adminRoute = read("app/api/admin/users/[id]/teacher-seo-publish/route.ts");
  assert.match(adminRoute, /requireAdminApi/);
  assert.match(adminRoute, /collectTeacherSeoAdminPublishBlockers/);
  const publishBlock = adminRoute.match(/action === "publish"[\s\S]*?} else if \(action === "unpublish"\)/);
  assert.ok(publishBlock);
  assert.match(publishBlock![0], /is_public:\s*true/);
  const hideBlock = adminRoute.match(/action === "hide_marketplace"[\s\S]*?} else \{/);
  assert.ok(hideBlock);
  assert.match(hideBlock![0], /is_public:\s*false/);
  assert.doesNotMatch(adminRoute, /deactivated_at/);
});

test("consent API no longer requires marketplace visibility before consent", () => {
  const consentRoute = read("app/api/teacher/profile/search-indexing-consent/route.ts");
  assert.match(consentRoute, /isTeacherSeoProfileContentReady/);
  assert.doesNotMatch(consentRoute, /isTeacherMarketplaceVisibleRow/);
});

test("profile management mounts SEO readiness card (not main dashboard)", () => {
  const dashboard = read("components/Dashboard.tsx");
  const verification = read("app/(app)/teacher/verification/page.tsx");
  assert.doesNotMatch(dashboard, /TeacherSeoReadinessCard/);
  assert.match(verification, /TeacherSeoReadinessCard/);
});

test("admin user page mounts SEO publication card", () => {
  const page = read("app/(app)/admin/users/[id]/page.tsx");
  assert.match(page, /TeacherSeoPublicationCard/);
  assert.match(page, /evaluateTeacherSeoPublication/);
  assert.match(page, /fetchTeacherSeoPublicationRowByUserId/);
});

test("admin SEO publication card shows explicit Google SEO toggle section", () => {
  const card = read("components/admin/TeacherSeoPublicationCard.tsx");
  const copy = read("lib/seo/adminTeacherSeoPublicationCopy.ts");
  assert.match(card, /getAdminTeacherSeoPublicationCopy/);
  assert.match(card, /admin-teacher-seo-google-toggle-section/);
  assert.match(card, /admin-teacher-seo-status-pill/);
  assert.match(card, /admin-teacher-seo-toggle-actions/);
  assert.match(card, /admin-teacher-seo-publish-button/);
  assert.match(card, /admin-teacher-seo-unpublish-button/);
  assert.match(card, /admin-teacher-seo-hide-marketplace-button/);
  assert.match(copy, /Publication SEO Google/);
  assert.match(copy, /Publier dans Google/);
  assert.match(copy, /Retirer de Google/);
  assert.match(copy, /Non publié/);
  assert.match(copy, /Demandé/);
  assert.match(copy, /Bloqué/);
  assert.match(copy, /Prêt à publier/);
  assert.match(copy, /Publié dans Google/);
  assert.match(copy, /public_profile_last_indexable_at/);
  assert.match(
    copy,
    /Cette option contrôle l'indexation Google et l'ajout au sitemap\. Elle ne garantit pas le classement dans Google\./,
  );
  assert.match(
    copy,
    /Le professeur doit d'abord avoir un profil complet et accepter la publication publique\./,
  );
  assert.match(copy, /Visibilité marketplace Pratiqo/);
  assert.match(copy, /Rendre le profil privé sur Pratiqo/);
  assert.match(copy, /paymentStatusLabel/);
  assert.match(copy, /payoutStatusLabel/);
  assert.match(copy, /paymentWarningLabel/);
  assert.doesNotMatch(copy, /may wait to publish|attendre la publication|esperar a publicar/i);
  assert.match(card, /admin-teacher-seo-payment-warning/);
  assert.match(card, /admin-teacher-seo-payment-status/);
  assert.match(card, /admin-teacher-seo-payout-status/);
  assert.match(card, /generatedTitle/);
  assert.match(card, /generatedDescription/);
  assert.match(card, /canonicalUrl/);
});

test("admin SEO data fetcher does not depend on embedded profiles relationship", () => {
  const dataHelper = read("lib/seo/teacherPublicProfileData.ts");
  assert.doesNotMatch(dataHelper, /profiles!inner/);
  assert.match(dataHelper, /PROFILE_SEO_SELECT/);
  assert.match(dataHelper, /from\("profiles"\)/);
  assert.match(dataHelper, /fetchProfileSeoRowByUserId/);
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
