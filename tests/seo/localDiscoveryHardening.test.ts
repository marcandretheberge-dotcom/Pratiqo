import "next/dist/server/node-environment";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildLocalDiscoveryCollectionJsonLd,
  buildLocalDiscoverySitemapEntries,
  resolveCityHubDiscoveryPage,
  resolveSubjectCityDiscoveryPage,
  teacherHasLocalDiscoverySupply,
  teacherMatchesDiscipline,
  type RawDiscoveryTeacher,
} from "../../lib/seo/localTeacherDiscoveryPages";
import { findCityBySlug } from "../../lib/constants/cities";
import { findDisciplineBySlug } from "../../lib/seo/disciplines";
import { shouldIncludeInSitemap } from "../../lib/seo/sitemap";
import nextConfig from "../../next.config";
import { unstable_getResponseFromNextConfig } from "next/experimental/testing/server";
import type { TeacherTeachingZone } from "../../types";
import { emptySupplySitemap } from "./emptySupplySitemap";

const city = findCityBySlug("saint-georges")!;
const french = findDisciplineBySlug("francais")!;
const spanish = findDisciplineBySlug("espagnol")!;
const teacher = (overrides: Partial<RawDiscoveryTeacher> = {}): RawDiscoveryTeacher => ({
  id: "11111111-1111-4111-8111-111111111111", user_id: "22222222-2222-4222-8222-222222222222", name: "Prof Test",
  bio: "Professeur de langues avec une expérience pédagogique et des cours adaptés aux élèves.",
  discipline: "Français", category: "Langues", disciplineIds: ["francais"],
  city: "Saint-Georges", region: "Chaudière-Appalaches", country_code: "CA",
  teaching_mode: "both", is_public: true, deactivated_at: null, deleted_at: null,
  is_demo: false, identity_verification_failed: false,
  public_profile_enabled: true, search_indexing_consent: true,
  public_profile_slug: "prof-test-francais", public_profile_last_indexable_at: "2026-09-01T00:00:00Z",
  teacher_onboarding_complete: true, profile_is_active: true,
  profile_deactivated_at: null, profile_deleted_at: null, profile_anonymized_at: null,
  subject_count: 1, rating: 0, reviews: 0, price_per_lesson: 30,
  image_url: null, location: { public: { lat: city.lat, lng: city.lng } },
  identity_verified: true, ...overrides,
});

const zone = (overrides: Partial<TeacherTeachingZone> = {}): TeacherTeachingZone => ({
  id: "zone", teacherId: "teacher-fixture", labelPublic: "Saint-Georges", city: "Saint-Georges",
  countryCode: "CA", lat: city.lat, lng: city.lng, radiusKm: 10, zoneKind: "service_area",
  isPrimary: true, isActive: true, sortOrder: 0, supportsAtTeacherPlace: true,
  supportsAtStudentPlace: true, supportsPublicPlace: false, ...overrides,
});

test("specific discipline matching never treats Langues as every language", () => {
  assert.equal(teacherMatchesDiscipline(teacher(), french), true);
  assert.equal(teacherMatchesDiscipline(teacher(), spanish), false);
  const es = teacher({ discipline: "Espagnol", disciplineIds: ["espagnol"] });
  assert.equal(teacherMatchesDiscipline(es, spanish), true);
  assert.equal(teacherMatchesDiscipline(es, french), false);
  for (const slug of ["francais", "espagnol", "anglais", "francisation"]) {
    assert.equal(teacherMatchesDiscipline(teacher({ discipline: "Langues", disciplineIds: [] }), findDisciplineBySlug(slug)!), false);
  }
  assert.equal(teacherMatchesDiscipline(teacher({ disciplineIds: ["francais", "espagnol"] }), spanish), true);
  assert.equal(teacherMatchesDiscipline(teacher({ discipline: "French", disciplineIds: [] }), french), true);
});

test("broad category aliases retain local supply without qualifying specific subjects", () => {
  const music = findDisciplineBySlug("musique")!;
  const row = teacher({ category: "music", discipline: "Violon", disciplineIds: ["violon"] });
  assert.equal(teacherMatchesDiscipline(row, music), true);
  assert.equal(teacherMatchesDiscipline(row, findDisciplineBySlug("piano")!), false);
  assert.ok(buildLocalDiscoverySitemapEntries([row]).some((entry) => entry.path === "/cours/musique/saint-georges"));
});

test("local supply excludes online-only, distant and region-only relationships", () => {
  assert.equal(teacherHasLocalDiscoverySupply(teacher(), city), true);
  assert.equal(teacherHasLocalDiscoverySupply(teacher({ teaching_mode: "online" }), city), false);
  assert.equal(teacherHasLocalDiscoverySupply(teacher({ city: "Québec" }), city), false);
  assert.equal(teacherHasLocalDiscoverySupply(teacher({ city: null }), city), false);
  assert.equal(teacherHasLocalDiscoverySupply(teacher({ teaching_mode: "online", teachingZones: [zone()] }), city), false);
});

test("declared service zones and their actual radius qualify local supply", () => {
  assert.equal(teacherHasLocalDiscoverySupply(teacher({ city: "Montréal", teachingZones: [zone()] }), city), true);
  assert.equal(teacherHasLocalDiscoverySupply(teacher({ teachingZones: [zone({ city: "Autre ville", lat: city.lat + 0.01 })] }), city), true);
  assert.equal(teacherHasLocalDiscoverySupply(teacher({ teachingZones: [zone({ city: "Montréal", lat: 45.5, lng: -73.6 })] }), city), false);
  assert.equal(teacherHasLocalDiscoverySupply(teacher({ city: "Montréal", teachingZones: [zone({ isActive: false })] }), city), false);
});

test("course and city bundles cross the RSC boundary as plain structured data", async () => {
  for (const bundle of [
    await resolveSubjectCityDiscoveryPage("francais", city.slug, async () => [teacher()]),
    await resolveSubjectCityDiscoveryPage("espagnol", city.slug, async () => [teacher({ discipline: "Espagnol", disciplineIds: ["espagnol"] })]),
    await resolveCityHubDiscoveryPage(city.slug, async () => [teacher()]),
  ]) {
    assert.ok(bundle);
    assert.equal(bundle.indexable, true);
    assert.deepEqual(structuredClone(bundle), bundle, "functions and component definitions cannot be cloned");
    assert.doesNotThrow(() => JSON.stringify(buildLocalDiscoveryCollectionJsonLd(bundle)));
    assert.match(bundle.canonicalUrl, /^https:\/\/www\.pratiqo\.ca\//);
    if (bundle.discipline) assert.deepEqual(Object.keys(bundle.discipline).sort(), ["faq", "name", "slug"]);
  }
});

test("empty and online-only course pages resolve but are absent from sitemap", async () => {
  for (const pool of [[], [teacher({ teaching_mode: "online" })], [teacher({ city: "Québec" })]]) {
    const bundle = await resolveSubjectCityDiscoveryPage("francais", city.slug, async () => pool);
    assert.ok(bundle);
    assert.equal(bundle.indexable, false);
    assert.ok(!buildLocalDiscoverySitemapEntries(pool).some((entry) => entry.path === bundle.canonicalPath));
  }
});

test("unpublished and inactive teachers cannot qualify local URLs", async () => {
  for (const row of [teacher({ public_profile_enabled: false }), teacher({ profile_is_active: false }), teacher({ marketplace_discovery_opt_out: true }), teacher({ public_profile_last_indexable_at: null })]) {
    assert.deepEqual(buildLocalDiscoverySitemapEntries([row]), []);
    const bundle = await resolveSubjectCityDiscoveryPage("francais", city.slug, async () => [row]);
    assert.equal(bundle?.indexable, false);
  }
});

test("invalid slugs return null before consulting the database; data errors reject", async () => {
  const fail = async (): Promise<RawDiscoveryTeacher[]> => { throw new Error("simulated database outage"); };
  assert.equal(await resolveSubjectCityDiscoveryPage("unknown", city.slug, fail), null);
  assert.equal(await resolveSubjectCityDiscoveryPage("francais", "unknown", fail), null);
  assert.equal(await resolveCityHubDiscoveryPage("unknown", fail), null);
  await assert.rejects(resolveSubjectCityDiscoveryPage("francais", city.slug, fail), /database outage/);
  await assert.rejects(resolveCityHubDiscoveryPage(city.slug, fail), /database outage/);
});

test("a database failure cannot publish a successful empty local sitemap", async () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  await assert.rejects(emptySupplySitemap(async (input) => {
    const url = new URL(String(input));
    const isLocalSupply = url.pathname.endsWith("/teachers") &&
      (url.searchParams.get("select") ?? "").split(",").includes("category");
    return new Response(JSON.stringify(isLocalSupply ? { code: "XX000", message: "simulated outage" } : []),
      { status: isLocalSupply ? 400 : 200, headers: { "content-type": "application/json" } });
  }), /local_discovery_teachers_unavailable/);
  assert.equal(globalThis.fetch, originalFetch);
  assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL, originalUrl);
  assert.equal(process.env.SUPABASE_SERVICE_ROLE_KEY, originalKey);
  await emptySupplySitemap();
  assert.equal(globalThis.fetch, originalFetch);
  assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL, originalUrl);
  assert.equal(process.env.SUPABASE_SERVICE_ROLE_KEY, originalKey);
});

test("every emitted course-city URL has the same indexable page predicate", async () => {
  const pool = [teacher(), teacher({ discipline: "Espagnol", disciplineIds: ["espagnol"], teaching_mode: "online" })];
  const entries = buildLocalDiscoverySitemapEntries(pool);
  assert.ok(entries.some((entry) => entry.path === "/cours/francais/saint-georges"));
  assert.ok(!entries.some((entry) => entry.path.startsWith("/cours/espagnol/")));
  for (const entry of entries.filter((item) => item.path.startsWith("/cours/"))) {
    const [, , subject, slug] = entry.path.split("/");
    assert.equal((await resolveSubjectCityDiscoveryPage(subject, slug, async () => pool))?.indexable, true);
  }
});

test("known legacy URLs redirect directly with 308 and preserve query values", async () => {
  const mappings = [
    ...["fr", "en", "es"].map((locale) => [`/${locale}/cours/francais/saint-georges`, "/cours/francais/saint-georges"]),
    ...["", "/fr", "/en", "/es"].map((prefix) => [`${prefix}/tuteurs-prive/saint-georges`, "/tuteurs/saint-georges"]),
  ];
  for (const [source, target] of mappings) {
    const result = await unstable_getResponseFromNextConfig({ url: `https://www.pratiqo.ca${source}?utm_source=test`, nextConfig });
    assert.equal(result.status, 308);
    const destination = new URL(result.headers.get("location")!);
    assert.equal(destination.origin + destination.pathname, `https://www.pratiqo.ca${target}`);
    assert.equal(destination.searchParams.get("utm_source"), "test");
  }
  for (const source of ["/fr/cours/unknown/saint-georges", "/fr/cours/francais/unknown", "/fr/apprendre-espagnol", "/cours/francais/saint-georges"]) {
    const result = await unstable_getResponseFromNextConfig({ url: `https://www.pratiqo.ca${source}`, nextConfig });
    assert.equal(result.headers.get("location"), null);
  }
});

test("sitemap rejects legacy, private and noncanonical URL permutations", () => {
  for (const path of ["/fr/cours/francais/saint-georges", "/en/tuteurs-prive/laval", "/tuteurs-prive/laval", "/admin", "/login", "/student", "/teacher", "/api/test", "/cours/francais/saint-georges?x=1", "/cours/francais/saint-georges#x"]) {
    assert.equal(shouldIncludeInSitemap(`https://www.pratiqo.ca${path}`), false, path);
  }
});

test("routes retain real 404s and explicit robots; map has no server runtime import", () => {
  for (const path of ["app/cours/[disciplineSlug]/[citySlug]/page.tsx", "app/tuteurs/[citySlug]/page.tsx"]) {
    const source = readFileSync(path, "utf8");
    assert.match(source, /if \(!bundle\) notFound\(\)/);
    assert.doesNotMatch(source, /if \(!bundle\.indexable\) notFound/);
    assert.match(source, /index: bundle\.indexable, follow: true/);
  }
  const map = readFileSync("components/seo/LocalTeacherDiscoveryMap.tsx", "utf8");
  assert.doesNotMatch(map, /import \{[^}]*\} from "@\/lib\/seo\/localTeacherDiscoveryPages"/);
});
