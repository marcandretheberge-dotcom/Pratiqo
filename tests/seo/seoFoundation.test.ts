import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { SITE_URL } from "../../lib/seo/site";
import {
  buildCityDisciplineMetadata,
  buildDisciplineMetadata,
  buildLocalizedAlternates,
  buildPageMetadata,
  buildTeacherProfileMetadata,
} from "../../lib/seo/metadata";
import { getRobotsForRoute, getRobotsSitemapUrl, getRobotsTxtRules, shouldIndexRoute } from "../../lib/seo/robots";
import {
  filterSitemapEntries,
  shouldIncludeInSitemap,
  shouldIndexCityDisciplinePage,
  shouldIndexDisciplinePage,
} from "../../lib/seo/sitemap";
import {
  getCanonicalPath,
  getCanonicalSearchPath,
  getCanonicalUrl,
  isPreviewOrLocalOrigin,
} from "../../lib/seo/urls";
import {
  buildBreadcrumbListJsonLd,
  buildWebsiteJsonLd,
  findUnsupportedStructuredDataClaims,
  hasUnsupportedStructuredDataClaims,
  serializeSafeJsonLd,
} from "../../lib/seo/structuredData";

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

test("canonical URLs always use www.pratiqo.ca and strip query/hash/trailing slash", () => {
  assert.equal(SITE_URL, "https://www.pratiqo.ca");
  assert.equal(getCanonicalPath("https://preview.vercel.app/cours/piano?x=1#top"), "/cours/piano");
  assert.equal(getCanonicalUrl("/cours/piano/?x=1#top"), "https://www.pratiqo.ca/cours/piano");
  assert.equal(getCanonicalUrl("/"), "https://www.pratiqo.ca");
  assert.equal(isPreviewOrLocalOrigin("https://pratiqo-git-test.vercel.app"), true);
  assert.equal(isPreviewOrLocalOrigin("http://localhost:3000"), true);
});

test("query-param search canonical policy avoids duplicate indexed search URLs", () => {
  assert.equal(getCanonicalSearchPath("/recherche?discipline=piano&ville=quebec"), "/trouver-un-prof");
  assert.equal(getCanonicalSearchPath("/search?q=piano"), "/trouver-un-prof");
  assert.equal(getCanonicalSearchPath("/trouver-un-prof?q=piano"), "/trouver-un-prof");
  assert.equal(getCanonicalSearchPath("/cours/piano/quebec?q=ignored"), "/cours/piano/quebec");
});

test("private, auth, API, checkout, student, and teacher routes are noindex", () => {
  for (const route of [
    "/admin",
    "/admin/users",
    "/api/teachers",
    "/checkout/session",
    "/connexion",
    "/login",
    "/messages",
    "/onboarding/teacher",
    "/student/search",
    "/teacher/settings",
    "/teacher/profile/example",
  ]) {
    assert.equal(shouldIndexRoute(route), false, `${route} must not be indexable`);
    assert.deepEqual(getRobotsForRoute(route), { index: false, follow: false });
  }
});

test("public SEO routes remain indexable by route policy", () => {
  for (const route of [
    "/",
    "/trouver-un-prof",
    "/trouver-mon-prof",
    "/tarifs",
    "/uy",
    "/legal/cgu",
    "/cours/piano",
    "/cours/piano/quebec",
    "/tuteurs/quebec",
    "/professeurs/marie-d-piano-quebec",
    "/fr/spanish-lessons-dominican-republic",
  ]) {
    assert.equal(shouldIndexRoute(route), true, `${route} should be eligible for indexation policy`);
  }
});

test("robots policy includes sitemap and blocks private routes without blocking render assets", () => {
  assert.equal(getRobotsSitemapUrl(), "https://www.pratiqo.ca/sitemap.xml");
  const rules = getRobotsTxtRules();
  const disallow = new Set(rules.flatMap((rule) => rule.disallow));
  for (const route of ["/admin", "/api/", "/teacher/settings", "/student/choose-companion", "/checkout/"]) {
    assert.ok(disallow.has(route), `${route} should be in robots disallow policy`);
  }
  for (const asset of ["/_next/static/", "/_next/image", "/fonts/", "/icons/", "/manifest.json"]) {
    assert.equal(disallow.has(asset), false, `${asset} must remain renderable`);
  }
});

test("sitemap helper excludes private, auth, duplicate query, and preview URLs", () => {
  assert.equal(shouldIncludeInSitemap("https://www.pratiqo.ca/cours/piano"), true);
  assert.equal(shouldIncludeInSitemap("https://www.pratiqo.ca/admin"), false);
  assert.equal(shouldIncludeInSitemap("https://www.pratiqo.ca/login"), false);
  assert.equal(shouldIncludeInSitemap("https://pratiqo-git-test.vercel.app/cours/piano"), false);

  const filtered = filterSitemapEntries([
    { url: "https://www.pratiqo.ca/cours/piano" },
    { url: "https://www.pratiqo.ca/cours/piano" },
    { url: "https://www.pratiqo.ca/student/search" },
    { url: "https://preview.vercel.app/cours/piano" },
  ]);
  assert.deepEqual(filtered.map((entry) => entry.url), ["https://www.pratiqo.ca/cours/piano"]);
});

test("metadata builders use canonical host and unique page templates", () => {
  const page = buildPageMetadata({
    title: "Trouver un prof | Pratiqo",
    description: "Comparez les professeurs disponibles sur Pratiqo.",
    pathname: "/trouver-un-prof?x=1",
    locale: "fr",
  });
  assert.equal(page.alternates?.canonical, "https://www.pratiqo.ca/trouver-un-prof");
  assert.equal(page.openGraph?.url, "https://www.pratiqo.ca/trouver-un-prof");

  const discipline = buildDisciplineMetadata({ discipline: "Piano", slug: "piano" });
  assert.match(String(discipline.title), /Cours de Piano/);
  assert.equal(discipline.alternates?.canonical, "https://www.pratiqo.ca/cours/piano");

  const city = buildCityDisciplineMetadata({
    discipline: "Piano",
    disciplineSlug: "piano",
    city: "Quebec",
    citySlug: "quebec",
  });
  assert.match(String(city.title), /Cours de Piano à Quebec/);
  assert.equal(city.alternates?.canonical, "https://www.pratiqo.ca/cours/piano/quebec");

  const teacher = buildTeacherProfileMetadata({
    teacherName: "Marie D.",
    mainDiscipline: "Piano",
    slug: "marie-d-piano-quebec",
    description: "Cours de piano avec Marie.",
    indexable: true,
  });
  assert.match(String(teacher.title), /Marie D\. \| Cours de Piano \| Pratiqo/);
  assert.equal(teacher.alternates?.canonical, "https://www.pratiqo.ca/professeurs/marie-d-piano-quebec");
});

test("localized alternates normalize relative paths to canonical production URLs", () => {
  const alternates = buildLocalizedAlternates({
    canonicalPathname: "/fr/spanish-lessons-dominican-republic",
    languages: {
      fr: "/fr/spanish-lessons-dominican-republic",
      en: "/en/spanish-lessons-dominican-republic",
      "x-default": "/fr/spanish-lessons-dominican-republic",
    },
  });
  assert.equal(alternates.canonical, "https://www.pratiqo.ca/fr/spanish-lessons-dominican-republic");
  assert.equal(alternates.languages?.en, "https://www.pratiqo.ca/en/spanish-lessons-dominican-republic");
});

test("discipline and city-discipline helpers default away from thin local SEO pages", () => {
  assert.equal(shouldIndexDisciplinePage({ active: true, searchable: true, hasUsefulContent: true }), true);
  assert.equal(shouldIndexDisciplinePage({ active: true, searchable: true }), false);
  assert.equal(
    shouldIndexCityDisciplinePage({
      marketSeoEnabled: true,
      disciplineEnabled: true,
      cityEnabled: true,
      availableTeacherCount: null,
    }),
    false,
  );
  assert.equal(
    shouldIndexCityDisciplinePage({
      marketSeoEnabled: true,
      disciplineEnabled: true,
      cityEnabled: true,
      availableTeacherCount: 1,
    }),
    true,
  );
});

test("structured-data helpers allow conservative schema and block unsupported claims", () => {
  const breadcrumb = buildBreadcrumbListJsonLd([
    { name: "Accueil", href: "/" },
    { name: "Piano", href: "/cours/piano" },
  ]);
  assert.equal(hasUnsupportedStructuredDataClaims(breadcrumb), false);
  assert.equal(buildWebsiteJsonLd()["@type"], "WebSite");
  assert.match(serializeSafeJsonLd(breadcrumb), /BreadcrumbList/);

  const fakeRating = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Professeur",
    aggregateRating: { "@type": "AggregateRating", ratingValue: 5 },
  };
  assert.deepEqual(findUnsupportedStructuredDataClaims(fakeRating), ["AggregateRating"]);
  assert.equal(hasUnsupportedStructuredDataClaims(fakeRating), true);
  assert.throws(() => serializeSafeJsonLd(fakeRating), /Unsupported SEO structured-data claim/);
});

test("public SEO Supabase reads are cached and sitemap teacher counts are batched", () => {
  const teacherData = read("lib/seo/teacherPublicProfileData.ts");
  const localDiscovery = read("lib/seo/localTeacherDiscoveryPages.ts");
  const publicProfilePage = read("app/professeurs/[slug]/page.tsx");
  const sitemap = read("app/sitemap.ts");

  assert.match(teacherData, /cacheSeoData\(/);
  assert.match(teacherData, /fetchTeacherSubjectCountsByIds/);
  assert.doesNotMatch(teacherData, /for \(const raw[\s\S]{0,120}await countTeacherSubjects/);
  assert.match(localDiscovery, /cacheSeoData\(/);
  assert.match(publicProfilePage, /cacheSeoData\(/);
  assert.match(sitemap, /cacheSeoData\(/);
});

test("App Router sitemap and robots conventions are used without legacy API sitemap routes", () => {
  assert.ok(fs.existsSync(path.join(REPO_ROOT, "app/sitemap.ts")));
  assert.ok(fs.existsSync(path.join(REPO_ROOT, "app/robots.ts")));
  assert.ok(!fs.existsSync(path.join(REPO_ROOT, "pages/api/sitemap.ts")));
  assert.ok(!fs.existsSync(path.join(REPO_ROOT, "pages/api/robots.ts")));
});

test("new SEO foundation helpers do not import restricted business systems", () => {
  for (const file of [
    "lib/seo/cache.ts",
    "lib/seo/config.ts",
    "lib/seo/metadata.ts",
    "lib/seo/robots.ts",
    "lib/seo/sitemap.ts",
    "lib/seo/structuredData.ts",
    "lib/seo/teacherSubjectCounts.ts",
    "lib/seo/urls.ts",
  ]) {
    const src = read(file);
    assert.doesNotMatch(
      src,
      /from\s+["'][^"']*(stripe|payments|commissions|membrePro|yopratiqoPremiumCheckout|bookings?)/i,
    );
  }
});
