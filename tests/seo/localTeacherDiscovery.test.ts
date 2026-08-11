/**
 * Local teacher discovery SEO engine — city hub + subject×city pages.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import sitemap from "../../app/sitemap";
import { SITE_URL } from "../../lib/seo/site";
import {
  buildCityHubPath,
  buildSubjectCityH1,
  buildSubjectCityPath,
  buildSubjectCityTitle,
  fetchIndexableDiscoveryTeachers,
  rankTeachersForCity,
  teacherMatchesDiscipline,
  teacherIsOnlineCapable,
  toDiscoveryCard,
  type RawDiscoveryTeacher,
} from "../../lib/seo/localTeacherDiscoveryPages";
import { isTeacherPublicProfileIndexable } from "../../lib/seo/teacherPublicProfile";
import { findDisciplineBySlug } from "../../lib/seo/disciplines";
import { findCityBySlug } from "../../lib/constants/cities";
import { resolveTeacherDisciplineHubHref } from "../../lib/seo/resolveTeacherDisciplineLink";

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function test(name: string, fn: () => void | Promise<void>): void {
  tests.push({ name, fn });
}

const tests: Array<{ name: string; fn: () => void | Promise<void> }> = [];

const cityHubPageSrc = read("app/tuteurs/[citySlug]/page.tsx");
const subjectCityPageSrc = read("app/cours/[disciplineSlug]/[citySlug]/page.tsx");
const legacyRedirectSrc = read("app/tuteurs-prive/[citySlug]/page.tsx");
const helperSrc = read("lib/seo/localTeacherDiscoveryPages.ts");
const viewSrc = read("components/seo/LocalTeacherDiscoveryView.tsx");
const cardsSrc = read("components/seo/LocalTeacherDiscoveryCards.tsx");
const sitemapSrc = read("app/sitemap.ts");
const nextConfigSrc = read("next.config.ts");

function baseIndexableTeacher(overrides: Partial<RawDiscoveryTeacher> = {}): RawDiscoveryTeacher {
  return {
    id: "afe6eab4-f40d-4d84-add9-8e061184ef6f",
    user_id: "0bbed16d-e677-47b3-9c87-03fca0109704",
    name: "El profe Juan",
    bio: "Professeur passionné avec plus de dix ans d'expérience en classe et en ligne pour tous les niveaux.",
    discipline: "Espagnol",
    category: "Langues",
    city: "Saint-Georges",
    region: "Chaudière-Appalaches",
    country_code: "CA",
    teaching_mode: "both",
    is_public: true,
    deactivated_at: null,
    deleted_at: null,
    is_demo: false,
    identity_verification_failed: false,
    public_profile_enabled: true,
    search_indexing_consent: true,
    public_profile_slug: "juan-e-espagnol-saint-georges",
    public_profile_last_indexable_at: "2026-06-10T12:00:00.000Z",
    teacher_onboarding_complete: true,
    profile_is_active: true,
    profile_deactivated_at: null,
    profile_deleted_at: null,
    profile_anonymized_at: null,
    subject_count: 1,
    rating: 0,
    reviews: 0,
    price_per_lesson: 20,
    image_url: null,
    location: { public: { lat: 46.12, lng: -70.67 } },
    identity_verified: true,
    ...overrides,
  };
}

test("canonical city hub route is /tuteurs/[citySlug]", () => {
  assert.equal(buildCityHubPath("laval"), "/tuteurs/laval");
  assert.match(cityHubPageSrc, /resolveCityHubDiscoveryPage/);
  assert.match(cityHubPageSrc, /fetchIndexableDiscoveryTeachers|localTeacherDiscoveryPages/);
  assert.match(cityHubPageSrc, /notFound\(\)/);
  assert.match(cityHubPageSrc, /!bundle\.indexable/);
});

test("subject+city route uses central discovery helper and 404s without supply", () => {
  assert.equal(buildSubjectCityPath("espagnol", "saint-georges"), "/cours/espagnol/saint-georges");
  assert.match(subjectCityPageSrc, /resolveSubjectCityDiscoveryPage/);
  assert.match(subjectCityPageSrc, /LocalTeacherDiscoveryView/);
  assert.doesNotMatch(subjectCityPageSrc, /TEACHERS_PUBLIC_TABLE/);
});

test("legacy /tuteurs-prive redirects to /tuteurs", () => {
  assert.match(legacyRedirectSrc, /redirect\(/);
  assert.match(legacyRedirectSrc, /buildCityHubPath/);
  assert.match(nextConfigSrc, /tuteurs-prive\/:citySlug/);
  assert.match(nextConfigSrc, /\/tuteurs\/:citySlug/);
});

test("Spanish Saint-Georges copy matches SEO brief", () => {
  const discipline = findDisciplineBySlug("espagnol")!;
  const city = findCityBySlug("saint-georges")!;
  assert.equal(buildSubjectCityH1(discipline, city.name), "Professeurs d'espagnol à Saint-Georges");
  assert.equal(
    buildSubjectCityTitle(discipline, city.name),
    "Professeurs d'espagnol à Saint-Georges | Pratiqo",
  );
});

test("guitar teacher does not match Spanish discipline filter", () => {
  const spanish = findDisciplineBySlug("espagnol")!;
  const guitar = baseIndexableTeacher({
    id: "11111111-1111-4111-8111-111111111111",
    user_id: "22222222-2222-4222-8222-222222222222",
    name: "Francis Audet",
    discipline: "Guitare",
    category: "Musique",
    public_profile_slug: "francis-a-guitare-saint-georges",
  });
  const juan = baseIndexableTeacher();
  assert.equal(teacherMatchesDiscipline(juan, spanish), true);
  assert.equal(teacherMatchesDiscipline(guitar, spanish), false);
});

test("teacher without admin marker is excluded from indexable discovery fetch query", () => {
  assert.match(helperSrc, /public_profile_last_indexable_at/);
  assert.match(helperSrc, /isTeacherPublicProfileIndexable/);
  assert.match(helperSrc, /\.not\("public_profile_last_indexable_at", "is", null\)/);
});

test("self-requested teacher without admin marker is excluded before ranking", () => {
  assert.match(helperSrc, /isTeacherPublicProfileIndexable/);
  const selfRequestedOnly = baseIndexableTeacher({
    public_profile_last_indexable_at: null,
  });
  // rankTeachersForCity is supply-only; production fetch drops non-indexable rows first.
  const city = findCityBySlug("saint-georges")!;
  const spanish = findDisciplineBySlug("espagnol")!;
  const { ranked } = rankTeachersForCity([selfRequestedOnly], city, { discipline: spanish });
  assert.equal(ranked.length, 1, "rank helper alone does not re-check admin marker");
});

test("removed demo teacher is excluded from local SEO discovery", () => {
  const removedDemo = baseIndexableTeacher({
    name: "Removed Demo Teacher",
    is_public: false,
    is_demo: true,
    public_profile_enabled: false,
    search_indexing_consent: false,
    public_profile_last_indexable_at: null,
  });
  assert.equal(isTeacherPublicProfileIndexable(removedDemo), false);
  assert.match(helperSrc, /isTeacherPublicProfileIndexable/);
});

test("admin-published Spanish teacher ranks for Saint-Georges subject page", () => {
  const city = findCityBySlug("saint-georges")!;
  const spanish = findDisciplineBySlug("espagnol")!;
  const juan = baseIndexableTeacher();
  const { ranked } = rankTeachersForCity([juan], city, { discipline: spanish });
  assert.equal(ranked.length, 1);
  const card = toDiscoveryCard(ranked[0]!);
  assert.equal(card.profilePath, "/professeurs/juan-e-espagnol-saint-georges");
});

test("online-capable teachers can appear as intentional fallback", () => {
  assert.equal(teacherIsOnlineCapable("online"), true);
  assert.equal(teacherIsOnlineCapable("both"), true);
  assert.equal(teacherIsOnlineCapable("person"), false);
});

test("teacher cards link to /professeurs/[slug] not legacy profile URLs", () => {
  assert.match(cardsSrc, /teacher\.profilePath/);
  assert.doesNotMatch(cardsSrc, /\/teacher\/profile\//);
  assert.doesNotMatch(viewSrc, /tuteurs trouvés|professeurs trouvés/i);
  assert.doesNotMatch(viewSrc, /Réservez directement en ligne/i);
  assert.doesNotMatch(viewSrc, /Tuteurs vérifiés/i);
});

test("structured data stays conservative — no Review/AggregateRating/Product/Course", () => {
  assert.match(cityHubPageSrc, /CollectionPage|buildLocalDiscoveryCollectionJsonLd/);
  assert.doesNotMatch(cityHubPageSrc, /AggregateRating|reviewCount|ratingValue|"@type":\s*"Course"/);
  assert.doesNotMatch(subjectCityPageSrc, /AggregateRating|reviewCount|ratingValue|"@type":\s*"Product"/);
  assert.doesNotMatch(helperSrc, /AggregateRating|"@type":\s*"Event"/);
});

test("subject+city page links to broad subject page and city hub", () => {
  assert.match(viewSrc, /broadSubjectPath/);
  assert.match(viewSrc, /cityHubPath/);
  assert.match(viewSrc, /\/trouver-un-prof/);
  assert.match(viewSrc, /\/devenir-professeur/);
});

test("teacher profile resolves local subject+city href", () => {
  assert.equal(
    resolveTeacherDisciplineHubHref({
      discipline: "Espagnol",
      city: "Saint-Georges",
      region: "Chaudière-Appalaches",
    }),
    "/cours/espagnol/saint-georges",
  );
});

test("sitemap uses supply-gated local discovery entries", async () => {
  assert.match(sitemapSrc, /fetchLocalDiscoverySitemapEntries/);
  assert.doesNotMatch(sitemapSrc, /tuteurs-prive/);
  const entries = await sitemap();
  const urls = entries.map((e) => e.url);
  assert.ok(!urls.some((u) => u.includes("/tuteurs-prive/")), "legacy city hub URLs must not ship in sitemap");
  assert.ok(!urls.some((u) => u.includes("/teacher/profile/")), "legacy teacher profile URLs must not ship in sitemap");
  assert.ok(!urls.some((u) => u.includes("/clases/montevideo/")), "old Uruguay barrio URLs must not ship in sitemap");
});

test("restricted systems untouched in local discovery diff surface", () => {
  for (const src of [helperSrc, cityHubPageSrc, subjectCityPageSrc, viewSrc]) {
    assert.doesNotMatch(src, /stripe_connect|checkout|refund|commission|membre.?pro|yopratiqo/i);
  }
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[seo:localTeacherDiscovery] ${tests.length} tests passed`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
