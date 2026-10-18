import "next/dist/server/node-environment";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LocalTeacherDiscoveryCards } from "../../components/seo/LocalTeacherDiscoveryCards";
import { getRobotsTxtRules } from "../../lib/seo/robots";
import {
  resolveSubjectCityDiscoveryPage, resolveCityHubDiscoveryPage,
  buildLocalDiscoverySitemapEntries, buildLocalDiscoveryCollectionJsonLd,
  type RawDiscoveryTeacher,
} from "../../lib/seo/localTeacherDiscoveryPages";

const teacher = (id: number, overrides: Partial<RawDiscoveryTeacher> = {}): RawDiscoveryTeacher => ({
  id: `10000000-0000-4000-8000-${String(id).padStart(12, "0")}`,
  user_id: `20000000-0000-4000-8000-${String(id).padStart(12, "0")}`,
  name: `Teacher ${id}`, bio: "Public teacher biography describing the actual lessons offered.",
  discipline: "Français", disciplineIds: ["francais"], category: "Langues",
  city: "Saint-Georges", region: null, country_code: "CA", teaching_mode: "both",
  is_public: true, public_profile_enabled: true, search_indexing_consent: true,
  public_profile_slug: `teacher-${id}`, public_profile_last_indexable_at: "2026-10-01T00:00:00Z",
  teacher_onboarding_complete: true, profile_is_active: true,
  rating: 0, reviews: 0, price_per_lesson: 35, image_url: null, location: null,
  identity_verified: false, ...overrides,
});

test("priority pages link exact-subject online alternatives without changing local supply or sitemap", async () => {
  const local = teacher(1);
  const online = teacher(2, { teaching_mode: "online", city: null });
  const unrelated = teacher(3, { teaching_mode: "online", city: null, discipline: "Piano", disciplineIds: ["piano"] });
  const bundle = await resolveSubjectCityDiscoveryPage("francais", "saint-georges", async () => [local, online, unrelated]);
  assert.ok(bundle);
  assert.equal(bundle.localTeacherCount, 1);
  assert.equal(bundle.indexable, true);
  assert.deepEqual(bundle.teachers.map(t => t.id), [local.id, online.id]);
  assert.equal(bundle.teachers[0].isLocalSupply, true);
  assert.equal(bundle.teachers[1].isLocalSupply, false);
  assert.equal(bundle.teachers[1].isOnlineFallback, true);
  assert.deepEqual(buildLocalDiscoverySitemapEntries([local, online]), buildLocalDiscoverySitemapEntries([local]));
  const schema = JSON.stringify(buildLocalDiscoveryCollectionJsonLd(bundle));
  assert.match(schema, /D'autres options en ligne/);
  assert.doesNotMatch(schema, /AggregateRating|Review|PostalAddress/);
});

test("alternatives alone do not make an empty city indexable; non-pilot pages retain their behavior", async () => {
  const online = teacher(2, { teaching_mode: "online", city: null });
  const empty = await resolveSubjectCityDiscoveryPage("francais", "saint-georges", async () => [online]);
  assert.equal(empty?.indexable, false);
  assert.equal(empty?.localTeacherCount, 0);
  assert.equal(buildLocalDiscoverySitemapEntries([online]).length, 0);
  const otherCity = await resolveCityHubDiscoveryPage("levis", async () => [teacher(1, { city: "Lévis" }), online]);
  assert.equal(otherCity?.teachers.length, 1);
  const pilot = await resolveCityHubDiscoveryPage("saint-georges", async () => [teacher(1), online]);
  assert.equal(new Set(pilot?.teachers.map(t => t.id)).size, 2);
});

test("online teacher facts, canonical profile link and truthful request CTA exist without JavaScript", async () => {
  // tsx uses the repository's preserved JSX; Next supplies this transform in production.
  (globalThis as typeof globalThis & { React: typeof React }).React = React;
  const bundle = await resolveSubjectCityDiscoveryPage("francais", "saint-georges", async () => [
    teacher(2, { teaching_mode: "online", city: null, bookingAction: "request" }),
  ]);
  assert.ok(bundle);
  const html = renderToStaticMarkup(React.createElement(LocalTeacherDiscoveryCards, { bundle }));
  assert.match(html, /href="\/professeurs\/teacher-2"/);
  assert.match(html, /En ligne/);
  assert.match(html, /35/);
  assert.match(html, /Demander un cours/);
  assert.doesNotMatch(html, /Réserver un cours/);
});

test("Googlebot and OAI-SearchBot inherit public access without overriding private exclusions", () => {
  const rules = getRobotsTxtRules();
  assert.equal(rules.length, 1);
  assert.equal(rules[0].userAgent, "*");
  assert.equal(rules[0].allow, "/");
  for (const path of ["/admin", "/student", "/teacher", "/api/", "/checkout"]) {
    assert.ok(rules[0].disallow.some(prefix => path.startsWith(prefix) || prefix === `${path}/`), path);
  }
  for (const path of ["/professeurs/teacher-2", "/cours/francais/saint-georges", "/tuteurs/saint-georges"]) {
    assert.ok(!rules[0].disallow.some(prefix => path.startsWith(prefix)), path);
  }
});

test("publication and withdrawal expire all SEO cache layers after a successful authorized write", () => {
  const read = (path: string) => readFileSync(path, "utf8");
  for (const path of ["lib/seo/teacherPublicProfileData.ts", "lib/seo/localTeacherDiscoveryPages.ts", "app/professeurs/[slug]/page.tsx"]) {
    const source = read(path);
    const options = source.match(/\{ revalidate: SEO_\w+[^}]*\}/g) ?? [];
    assert.ok(options.length > 0, path);
    assert.ok(options.every(option => option.includes("tags: [TEACHER_PUBLIC_SEO_CACHE_TAG]")), path);
  }
  const route = read("app/api/admin/users/[id]/teacher-seo-publish/route.ts");
  assert.match(route, /revalidateTag\(TEACHER_PUBLIC_SEO_CACHE_TAG, \{ expire: 0 \}\)/);
  assert.ok(route.indexOf("requireAdminApi(req)") < route.indexOf("revalidateTag(TEACHER_PUBLIC_SEO_CACHE_TAG"));
  assert.ok(route.lastIndexOf('return NextResponse.json({ error: error.message }') < route.indexOf("revalidateTag(TEACHER_PUBLIC_SEO_CACHE_TAG"));
});
