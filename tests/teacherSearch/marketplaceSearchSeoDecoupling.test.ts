/**
 * Regression: marketplace teacher search must stay independent from SEO consent.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { applyTeacherListingMetadata } from "../../lib/teacherListingMetadata";
import {
  isTeacherMarketplaceVisibleRow,
} from "../../lib/teachers/marketplaceVisibility";
import {
  isTeacherPublicProfileIndexable,
  isTeacherPublicProfilePageVisible,
} from "../../lib/seo/teacherPublicProfile";
import type { Teacher } from "../../types";

const ROOT = process.cwd();
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
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

const TEACHER_ID = "afe6eab4-f40d-4d84-add9-8e061184ef6f";
const USER_ID = "0bbed16d-e677-47b3-9c87-03fca0109704";

const marketplaceVisibleNoSeoConsent = {
  id: TEACHER_ID,
  user_id: USER_ID,
  name: "Marie Dubois",
  bio: "Professeure passionnée avec plus de dix ans d'expérience en classe et en ligne.",
  discipline: "Espagnol",
  city: "Lévis",
  region: "QC",
  is_public: true,
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
};

function teacherEntity(): Teacher {
  return {
    id: TEACHER_ID,
    name: "Marie Dubois",
    discipline: "Espagnol",
    category: "Langues",
    rating: 4.5,
    reviews: 2,
    distance: 0,
    pricePerLesson: 45,
    bio: "Bio",
    imageUrl: "https://cdn.example.com/avatar.webp",
    availability: [],
    location: { lat: 46.8, lng: -71.2 },
    isVerified: true,
    teachingMode: "both",
    languages: ["fr"],
    levels: ["beginner"],
  };
}

test("marketplace-visible teacher without SEO consent is not indexable", () => {
  assert.equal(isTeacherMarketplaceVisibleRow(marketplaceVisibleNoSeoConsent), true);
  assert.equal(isTeacherPublicProfilePageVisible(marketplaceVisibleNoSeoConsent), false);
  assert.equal(isTeacherPublicProfileIndexable(marketplaceVisibleNoSeoConsent), false);
});

test("applyTeacherListingMetadata keeps teachers when eligibleTeacherIds is empty", () => {
  const merged = applyTeacherListingMetadata([teacherEntity()], {
    plans: { [TEACHER_ID]: "free" },
    photos: {},
    eligibleTeacherIds: [],
  });
  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.id, TEACHER_ID);
});

test("applyTeacherListingMetadata still excludes ineligible ids when provided", () => {
  const merged = applyTeacherListingMetadata([teacherEntity()], {
    eligibleTeacherIds: ["00000000-0000-4000-8000-000000000099"],
  });
  assert.equal(merged.length, 0);
});

test("landing search still reads teachers_public and does not import SEO helpers", () => {
  const landing = read("app/LandingPageClient.tsx");
  assert.match(landing, /TEACHERS_PUBLIC_TABLE/);
  assert.match(landing, /applyTeacherListingMetadata/);
  assert.doesNotMatch(landing, /teacherPublicProfile|search_indexing_consent|public_profile_enabled/);
});

test("student search still reads teachers_public and does not import SEO helpers", () => {
  const search = read("app/(app)/student/search/page.tsx");
  assert.match(search, /TEACHERS_PUBLIC_TABLE/);
  assert.match(search, /applyTeacherListingMetadata/);
  assert.doesNotMatch(search, /teacherPublicProfile|search_indexing_consent|public_profile_enabled/);
});

test("plans API uses marketplace visibility helper, not SEO consent fields", () => {
  const route = read("app/api/teachers/plans/route.ts");
  assert.match(route, /isTeacherMarketplaceVisibleRow/);
  assert.doesNotMatch(route, /search_indexing_consent|public_profile_enabled|teacherPublicProfile/);
});

test("plans API returns 500 when batch lookup finds no rows (listing fallback)", () => {
  const route = read("app/api/teachers/plans/route.ts");
  assert.match(route, /if \(!teachers\?\.length\)/);
  assert.match(route, /status:\s*500/);
});

test("sitemap still uses SEO-only indexable teacher fetch", () => {
  const sitemap = read("app/sitemap.ts");
  assert.match(sitemap, /fetchIndexableTeacherSitemapRows/);
  assert.doesNotMatch(sitemap, /TEACHERS_PUBLIC_TABLE/);
});

test("demo teacher remains excluded from marketplace visibility", () => {
  assert.equal(
    isTeacherMarketplaceVisibleRow({ ...marketplaceVisibleNoSeoConsent, is_demo: true }),
    false,
  );
});

test("removed demo teacher remains excluded from marketplace visibility", () => {
  const removedDemo = {
    ...marketplaceVisibleNoSeoConsent,
    name: "Removed Demo Teacher",
    is_public: false,
    is_demo: true,
    public_profile_enabled: false,
    search_indexing_consent: false,
    public_profile_slug: null,
  };
  assert.equal(isTeacherMarketplaceVisibleRow(removedDemo), false);
  assert.equal(isTeacherPublicProfilePageVisible(removedDemo), false);
  assert.equal(isTeacherPublicProfileIndexable(removedDemo), false);
});

test("optional demo seed no longer includes the removed Sophie teacher", () => {
  const constants = read("constants.ts");
  const seed = read("lib/seed.ts");
  assert.doesNotMatch(constants, /Sophie Martin/);
  assert.doesNotMatch(seed, /teacher_id:\s*"1"/);
});

console.log("[teacherSearch:marketplaceSeoDecoupling] tests passed");
