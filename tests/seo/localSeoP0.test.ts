import "next/dist/server/node-environment";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildLocalDiscoverySitemapEntries, resolveCityHubDiscoveryPage, resolveSubjectCityDiscoveryPage, type RawDiscoveryTeacher } from "../../lib/seo/localTeacherDiscoveryPages";
import { buildTeacherPublicProfileJsonLd, buildTeacherPublicProfileTitle, isTeacherPublicProfileIndexable, resolveTeacherSeoCityLabel } from "../../lib/seo/teacherPublicProfile";
import { formatTeacherSeoTeachingFormatLabel, localizeTeacherSeoSubject } from "../../lib/seo/teacherPublicProfileLabels";
import type { Teacher } from "../../types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getTeacherListingBookability } from "../../lib/teachers/listingBookability";

const fixture = (i: number, overrides: Partial<RawDiscoveryTeacher> = {}): RawDiscoveryTeacher => ({
  id: `10000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
  user_id: `20000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
  name: `Professeur ${i}`, bio: "Professeur proposant des cours selon les objectifs de chaque élève.",
  discipline: "Français", disciplineIds: ["francais"], category: "Langues",
  city: "Saint-Georges", region: "Chaudière-Appalaches", country_code: "CA",
  teaching_mode: "both", is_public: true, public_profile_enabled: true,
  search_indexing_consent: true, public_profile_slug: `professeur-${i}`,
  public_profile_last_indexable_at: "2026-09-01T00:00:00Z", teacher_onboarding_complete: true,
  profile_is_active: true, is_demo: false, rating: 0, reviews: 0, price_per_lesson: 40.5,
  image_url: null, location: null, identity_verified: false, ...overrides,
});

test("public supply is dynamic; five public profiles do not imply five open calendars", async () => {
  const rows = Array.from({ length: 5 }, (_, i) => fixture(i));
  assert.equal(rows.filter(isTeacherPublicProfileIndexable).length, 5);
  const bundle = await resolveCityHubDiscoveryPage("saint-georges", async () => rows);
  assert.equal(bundle?.localTeacherCount, 5);
  assert.equal(bundle?.teachers.length, 5);
  assert.equal(new Set(bundle?.teachers.map(teacher => teacher.id)).size, 5, "one result per public teacher");
  assert.equal(isTeacherPublicProfileIndexable(fixture(6, { public_profile_enabled: false })), false);
  assert.equal(isTeacherPublicProfileIndexable(fixture(7, { search_indexing_consent: false })), false);
  // Slot eligibility stays in listingBookability; temporary calendar changes must not unpublish SEO.
  assert.equal(isTeacherPublicProfileIndexable({ ...fixture(8), ...{ availability: [], bookingReady: false } }), true);
});

test("five reservable public fixtures are selected through the existing calendar and eligibility helper", async () => {
  const rows = Array.from({ length: 6 }, (_, i) => fixture(i));
  const calendars = rows.map((row, i) => ({ ...row,
    stripe_account_id: "acct_fixture", stripe_connect_onboarding_complete: true,
    stripe_connect_charges_enabled: true, stripe_connect_payouts_enabled: true,
    stripe_connect_requirements_due: [], stripe_connect_disabled_reason: null,
    availability: i < 5 ? ["Lun Matin"] : [], schedule_mode: "legacy_blocks", default_lesson_duration_minutes: 60,
  }));
  const client = { from(table: string) {
    const query = {
      select() { return query; }, in() { return query; }, eq() { return query; },
      gte() { return query; }, lte() { return query; }, gt() { return query; }, lt() { return query; },
      then(resolve: (value: unknown) => unknown) {
        const data = table === "teachers" ? calendars : [];
        return Promise.resolve(resolve({ data, error: null, count: data.length }));
      },
    };
    return query;
  } } as unknown as SupabaseClient;
  const readiness = await getTeacherListingBookability(client, rows.map((row) => row.id), new Date("2026-10-05T12:00:00-04:00"));
  assert.equal(rows.filter((row) => isTeacherPublicProfileIndexable(row) && readiness[row.id] === true).length, 5);
  assert.equal(rows.filter(isTeacherPublicProfileIndexable).length, 6, "the full calendar remains publicly indexable");
});

test("city and discipline pages exclude alternative-only supply from sitemap", async () => {
  for (const rows of [[], [fixture(1, { teaching_mode: "online" })], [fixture(1, { city: "Montréal" })]]) {
    const bundle = await resolveCityHubDiscoveryPage("saint-georges", async () => rows);
    assert.equal(bundle?.localTeacherCount, 0);
    assert.equal(bundle?.indexable, false);
    assert.ok(bundle?.teachers.every((teacher) => teacher.isLocalSupply === false));
    assert.ok(!buildLocalDiscoverySitemapEntries(rows).some((entry) => entry.path === "/tuteurs/saint-georges"));
  }
  const online = await resolveCityHubDiscoveryPage("saint-georges", async () => [fixture(1, { teaching_mode: "online" })]);
  assert.equal(online?.teachers[0].isOnlineFallback, true, "even an online teacher living in the same city is an online alternative");
});

test("counts use exact discipline and are not limited by the nine-card display cap", async () => {
  const rows = Array.from({ length: 12 }, (_, i) => fixture(i));
  const bundle = await resolveSubjectCityDiscoveryPage("francais", "saint-georges", async () => rows);
  assert.equal(bundle?.localTeacherCount, 12);
  assert.equal(bundle?.teachers.length, 9);
  assert.deepEqual(bundle?.discipline?.faq, [], "generic FAQs must not leak through serialized client props");
  const legacy = await resolveSubjectCityDiscoveryPage("francais", "saint-georges", async () => [fixture(99, { discipline: "—" })]);
  assert.equal(legacy?.teachers[0].discipline, "Français");
  assert.equal((await resolveSubjectCityDiscoveryPage("espagnol", "saint-georges", async () => rows))?.localTeacherCount, 0);
  assert.equal(await resolveCityHubDiscoveryPage("invalid-city", async () => rows), null);
  assert.equal(await resolveSubjectCityDiscoveryPage("invalid", "saint-georges", async () => rows), null);
});

test("online-only profile metadata never implies a local in-person offer", () => {
  for (const locale of ["fr", "en", "es"] as const) {
    const cityLabel = resolveTeacherSeoCityLabel(locale, { city: "Saint-Georges", teachingMode: "online" });
    const title = buildTeacherPublicProfileTitle({ locale, subject: "Français", firstName: "Test", cityLabel });
    assert.ok(title && !title.includes("Saint-Georges"));
  }
  assert.equal(formatTeacherSeoTeachingFormatLabel("fr", "in_person"), "En personne");
  assert.equal(localizeTeacherSeoSubject("Tuteurs académiques", "fr"), "tutorat académique");
});

test("JSON-LD remains limited to visible public facts", () => {
  const teacher = { name: "Test Nom", bio: "Une approche pédagogique adaptée aux objectifs de chaque élève.", discipline: "Français", teachingMode: "online", city: "Saint-Georges" } as Teacher;
  const schema = JSON.stringify(buildTeacherPublicProfileJsonLd({ teacher, canonicalUrl: "https://www.pratiqo.ca/professeurs/test", subjects: ["Français"], locale: "fr", slug: "test" }));
  assert.match(schema, /ProfilePage/);
  assert.match(schema, /Person/);
  assert.doesNotMatch(schema, /AggregateRating|Review|PostalAddress|streetAddress/);
});

test("local copy does not inherit generic city FAQs or specialties; owner join is explicit", () => {
  const view = readFileSync("components/seo/LocalTeacherDiscoveryView.tsx", "utf8");
  assert.doesNotMatch(view, /discipline\?\.faq\.map|Montréal|DALF|30.*80/);
  assert.match(view, /D'autres options en ligne/);
  assert.match(view, /getDisciplineCitySeoGuideLinks\(bundle.discipline!.slug, bundle.city.slug, "fr"\)/);
  const source = readFileSync("lib/seo/localTeacherDiscoveryPages.ts", "utf8");
  assert.doesNotMatch(source, /profiles!inner/);
  assert.match(source, /ownersById.get\(raw.user_id\)/);
  assert.match(source, /if \(ownerError\) throw/);
  const profile = readFileSync("app/professeurs/[slug]/page.tsx", "utf8");
  assert.match(profile, /title: \{ absolute: title \}/);
  assert.match(profile, /initialTeacher=\{initialTeacher\}/);
  assert.match(profile, /const initialTeacher = \{ \.\.\.bundle.teacher, bookingAction:/);
});
