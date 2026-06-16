/**
 * Safe public SEO indexing for teacher profiles (/professeurs/[slug]).
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { SITE_URL } from "../../lib/seo/site";
import {
  buildTeacherPublicProfileCanonicalUrl,
  buildTeacherPublicProfileDescription,
  buildTeacherPublicProfileJsonLd,
  buildTeacherPublicProfileSlug,
  buildTeacherPublicProfileTitle,
  containsExactAddressLeak,
  isTeacherPublicProfileIndexable,
  isTeacherPublicProfilePageVisible,
  teacherPublicProfileRobots,
} from "../../lib/seo/teacherPublicProfile";
import type { Teacher } from "../../types";

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
  is_public: true,
  deactivated_at: null,
  deleted_at: null,
  is_demo: false,
  identity_status: "none",
  public_profile_enabled: true,
  search_indexing_consent: true,
  public_profile_slug: "marie-d-espagnol-levis",
  teacher_onboarding_complete: true,
  profile_is_active: true,
  profile_deactivated_at: null,
  profile_deleted_at: null,
  profile_anonymized_at: null,
  subject_count: 1,
};

test("slug format follows first-lastInitial-subject-city pattern", () => {
  assert.equal(
    buildTeacherPublicProfileSlug({ name: "Marie Dubois", mainSubject: "Espagnol", city: "Lévis" }),
    "marie-d-espagnol-levis",
  );
});

test("canonical URL uses www.pratiqo.ca and /professeurs/[slug]", () => {
  const url = buildTeacherPublicProfileCanonicalUrl("marie-d-espagnol-levis");
  assert.equal(url, "https://www.pratiqo.ca/professeurs/marie-d-espagnol-levis");
  assert.ok(url.startsWith(SITE_URL));
});

test("eligible consented teacher is indexable", () => {
  assert.equal(isTeacherPublicProfilePageVisible(baseRow), true);
  assert.equal(isTeacherPublicProfileIndexable(baseRow), true);
  assert.deepEqual(teacherPublicProfileRobots(true), { index: true, follow: true });
});

test("missing consent is not indexable and uses noindex robots", () => {
  const row = { ...baseRow, search_indexing_consent: false };
  assert.equal(isTeacherPublicProfileIndexable(row), false);
  assert.deepEqual(teacherPublicProfileRobots(false), { index: false, follow: false });
});

test("withdrawn public profile is not visible on /professeurs", () => {
  const row = { ...baseRow, public_profile_enabled: false, search_indexing_consent: false };
  assert.equal(isTeacherPublicProfilePageVisible(row), false);
});

test("sitemap uses consented /professeurs slugs only", () => {
  const sitemapSrc = read("app/sitemap.ts");
  assert.match(sitemapSrc, /fetchIndexableTeacherSitemapRows/);
  assert.match(sitemapSrc, /buildTeacherPublicProfileCanonicalUrl/);
  assert.doesNotMatch(sitemapSrc, /\/teacher\/profile\/\$\{/);
});

test("professeurs page sets ProfilePage JSON-LD without worksFor or exact address", () => {
  const teacher: Teacher = {
    id: baseRow.id,
    name: baseRow.name,
    discipline: "Espagnol",
    category: "Langues",
    rating: 4.8,
    reviews: 3,
    distance: 0,
    pricePerLesson: 45,
    bio: baseRow.bio,
    imageUrl: "https://cdn.example.com/avatar.webp",
    availability: [],
    location: { lat: 46.8, lng: -71.2, neighborhood: "Lévis" },
    city: "Lévis",
    region: "QC",
    countryCode: "CA",
    isVerified: true,
    teachingMode: "both",
    languages: ["fr"],
    levels: ["beginner"],
  };

  const jsonLd = buildTeacherPublicProfileJsonLd({
    teacher,
    canonicalUrl: buildTeacherPublicProfileCanonicalUrl("marie-d-espagnol-levis"),
    subjects: ["Espagnol", "Langues"],
  });

  assert.equal(jsonLd["@type"], "ProfilePage");
  const person = jsonLd.mainEntity as Record<string, unknown>;
  assert.equal(person["@type"], "Person");
  assert.equal(person.name, "Marie D.");
  assert.ok(!("worksFor" in jsonLd));
  assert.ok(!("worksFor" in person));
  const address = person.address as Record<string, unknown>;
  assert.equal(address.addressLocality, "Lévis");
  assert.ok(!("streetAddress" in address));
  assert.ok(!containsExactAddressLeak(JSON.stringify(jsonLd)));
});

test("French SEO title and description match product copy", () => {
  assert.equal(
    buildTeacherPublicProfileTitle({ subject: "espagnol", firstName: "Marie", city: "Lévis" }),
    "Cours de espagnol avec Marie à Lévis | Pratiqo",
  );
  assert.match(
    buildTeacherPublicProfileDescription({ subject: "espagnol", firstName: "Marie", city: "Lévis" }),
    /Réservez un cours de espagnol avec Marie, professeur sur Pratiqo à Lévis/,
  );
});

test("legacy teacher profile route redirects indexable teachers to /professeurs slug", () => {
  const pageSrc = read("app/teacher/profile/[id]/page.tsx");
  assert.match(pageSrc, /redirect\(`\/professeurs\//);
  assert.match(pageSrc, /teacherPublicProfileRobots/);
});

test("professeurs page does not render private location fields", () => {
  const pageSrc = read("app/professeurs/[slug]/page.tsx");
  assert.doesNotMatch(pageSrc, /location\.private/);
  assert.doesNotMatch(pageSrc, /formatted_address/);
  assert.doesNotMatch(pageSrc, /street_number/);
});

test("migration 082 adds consent columns and pins them in trigger", () => {
  const migration = read("supabase/migrations/082_teacher_public_seo_indexing.sql");
  assert.match(migration, /public_profile_enabled/i);
  assert.match(migration, /search_indexing_consent/i);
  assert.match(migration, /public_profile_slug/i);
  assert.match(migration, /NEW\.search_indexing_consent := OLD\.search_indexing_consent/i);
});

test("consent API route is server-side only", () => {
  const routeSrc = read("app/api/teacher/profile/search-indexing-consent/route.ts");
  assert.match(routeSrc, /getSupabaseAdmin/);
  assert.match(routeSrc, /TEACHER_PUBLIC_SEO_CONSENT_VERSION/);
});

console.log("[seo:teacherPublicProfileIndexing] tests passed");
