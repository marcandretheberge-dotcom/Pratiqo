import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import sitemap from "../../app/sitemap";
import { SITE_URL } from "../../lib/seo/site";
import {
  SUBJECT_LANDING_PAGES,
  SUBJECT_LANDING_PATHS,
  buildSubjectLandingMetadata,
  buildSubjectSearchHref,
} from "../../lib/seo/subjectLandingPages";
import { searchSubjectBuckets } from "../../lib/search/subjectBuckets";
import type { Locale } from "../../lib/i18n/types";

const root = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8").replace(/\r\n/g, "\n");
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const subjectSeoSrc = read("lib/seo/subjectLandingPages.ts");
const subjectPageSrc = read("app/cours/[disciplineSlug]/page.tsx");
const trouverUnProfSrc = read("app/(marketing)/trouver-un-prof/page.tsx");

const expected = {
  coach_trainer: {
    slug: "coach-entraineur",
    frTitle: "Coach et entraîneur privé au Québec | Pratiqo",
    enTitle: "Private coaches and trainers in Quebec | Pratiqo",
    esTitle: "Entrenadores y coaches privados en Quebec | Pratiqo",
    frH1: "Trouver un coach ou entraîneur privé",
    enH1: "Find a private coach or trainer",
    esH1: "Encuentra un coach o entrenador privado",
    query: "coach",
  },
  cooking: {
    slug: "cuisine",
    frTitle: "Cours de cuisine privés au Québec | Pratiqo",
    enTitle: "Private cooking classes in Quebec | Pratiqo",
    esTitle: "Clases privadas de cocina en Quebec | Pratiqo",
    frH1: "Trouver un cours de cuisine",
    enH1: "Find a cooking class",
    esH1: "Encuentra una clase de cocina",
    query: "cuisine",
  },
  martial_arts: {
    slug: "arts-martiaux",
    frTitle: "Cours d'arts martiaux au Québec | Pratiqo",
    enTitle: "Martial arts classes in Quebec | Pratiqo",
    esTitle: "Clases de artes marciales en Quebec | Pratiqo",
    frH1: "Trouver un cours d'arts martiaux",
    enH1: "Find a martial arts class",
    esH1: "Encuentra una clase de artes marciales",
    query: "arts martiaux",
  },
  dance: {
    slug: "danse",
    frTitle: "Cours de danse privés au Québec | Pratiqo",
    enTitle: "Private dance classes in Quebec | Pratiqo",
    esTitle: "Clases privadas de danza y baile en Quebec | Pratiqo",
    frH1: "Trouver un cours de danse",
    enH1: "Find a dance class",
    esH1: "Encuentra una clase de danza o baile",
    query: "danse",
  },
  photography: {
    slug: "photographie",
    frTitle: "Cours de photographie privés | Pratiqo",
    enTitle: "Private photography lessons | Pratiqo",
    esTitle: "Clases privadas de fotografía | Pratiqo",
    frH1: "Trouver un cours de photographie",
    enH1: "Find a photography class",
    esH1: "Encuentra una clase de fotografía",
    query: "photographie",
  },
} as const;

test("subject landing metadata source covers the lifestyle disciplines", () => {
  assert.equal(SUBJECT_LANDING_PAGES.length, 5);
  for (const [key, entry] of Object.entries(expected)) {
    const page = SUBJECT_LANDING_PAGES.find((item) => item.key === key);
    assert.ok(page, `${key} must be registered`);
    assert.equal(page.slug, entry.slug);
    assert.equal(page.searchQuery, entry.query);
  }
});

test("SEO metadata exists in FR / EN / ES with self-referencing canonicals", () => {
  for (const page of SUBJECT_LANDING_PAGES) {
    const entry = expected[page.key];
    const checks: Array<[Locale, string]> = [
      ["fr", entry.frTitle],
      ["en", entry.enTitle],
      ["es", entry.esTitle],
    ];

    for (const [locale, title] of checks) {
      const metadata = buildSubjectLandingMetadata(page, locale);
      const robots = metadata.robots as { index?: boolean; follow?: boolean } | undefined;
      const twitter = metadata.twitter as { card?: string } | undefined;
      assert.equal(metadata.title, title);
      assert.equal(metadata.alternates?.canonical, `${SITE_URL}/cours/${entry.slug}`);
      assert.equal(robots?.index, true);
      assert.equal(robots?.follow, true);
      assert.ok(String(metadata.description).length >= 60, `${page.key}.${locale} description is too short`);
      assert.equal(metadata.openGraph?.url, `${SITE_URL}/cours/${entry.slug}`);
      assert.equal(twitter?.card, "summary_large_image");
    }
  }
});

test("localized H1 labels and safe CTAs are present in the source of truth", () => {
  for (const page of SUBJECT_LANDING_PAGES) {
    const entry = expected[page.key];
    assert.equal(page.content.fr.h1, entry.frH1);
    assert.equal(page.content.en.h1, entry.enH1);
    assert.equal(page.content.es.h1, entry.esH1);
    assert.match(page.content.fr.searchCta, /Chercher|Rechercher|Search|Buscar/i);
    assert.match(page.content.en.searchCta, /Search|Find/i);
    assert.match(page.content.es.searchCta, /Buscar|Encuentra/i);
  }
});

test("subject route exists and uses canonical page-level metadata conventions", () => {
  assert.ok(
    existsSync(join(root, "app", "cours", "[disciplineSlug]", "page.tsx")),
    "subject landing page route must exist at /cours/[disciplineSlug]",
  );
  assert.match(subjectPageSrc, /buildSubjectLandingMetadata/);
  assert.match(subjectPageSrc, /getLocale\(\)/);
  assert.match(subjectPageSrc, /BreadcrumbSchema/);
  assert.doesNotMatch(subjectPageSrc, /ItemList|AggregateRating|Review|LocalBusiness|Product/);
  assert.doesNotMatch(subjectPageSrc, /teacherRowToTeacher|getSupabaseAdmin|TEACHERS_PUBLIC_TABLE/);
});

test("subject pages use prefilled search CTAs without creating query URLs in the sitemap", async () => {
  const entries = await sitemap();
  const urls = entries.map((entry) => entry.url);

  for (const page of SUBJECT_LANDING_PAGES) {
    const canonical = `${SITE_URL}/cours/${page.slug}`;
    assert.ok(urls.includes(canonical), `sitemap must include ${canonical}`);
    assert.equal(buildSubjectSearchHref(page), `/trouver-un-prof?q=${encodeURIComponent(page.searchQuery)}`);
  }

  assert.ok(
    urls.every((url) => !url.includes("/trouver-un-prof?")),
    "sitemap must not include raw query search URLs",
  );
});

test("sitemap includes only subject landing pages, not empty city-by-subject combinations", async () => {
  const entries = await sitemap();
  const urls = entries.map((entry) => entry.url);

  for (const path of SUBJECT_LANDING_PATHS) {
    assert.ok(urls.includes(`${SITE_URL}${path}`), `${path} must be listed`);
    assert.ok(
      !urls.some((url) => url.startsWith(`${SITE_URL}${path}/`)),
      `${path} must not generate city combinations such as ${path}/montreal`,
    );
  }
});

test("/trouver-un-prof links internally to subject landing pages", () => {
  for (const path of SUBJECT_LANDING_PATHS) {
    assert.match(
      trouverUnProfSrc,
      new RegExp(`href:\\s*["']${path.replace(/\//g, "\\/")}["']`),
      `/trouver-un-prof must link to ${path}`,
    );
  }
});

test("structured data stays honest: BreadcrumbList only, no fake reviews or inventory lists", () => {
  assert.match(subjectPageSrc, /BreadcrumbSchema/);
  assert.doesNotMatch(subjectPageSrc, /FAQSchema|ItemList|AggregateRating|reviewCount|ratingValue|offers|price/);
  assert.doesNotMatch(subjectSeoSrc, /guaranteed|guarantee|fake reviews|fake ratings/i);
});

test("search aliases for lifestyle subjects still resolve", () => {
  const cases: Array<[string, Locale, string]> = [
    ["coach sportif", "fr", "coach_trainer"],
    ["personal trainer", "en", "coach_trainer"],
    ["entrenador personal", "es", "coach_trainer"],
    ["cuisine", "fr", "cooking"],
    ["cooking class", "en", "cooking"],
    ["cocina", "es", "cooking"],
    ["arts martiaux", "fr", "martial_arts"],
    ["martial arts", "en", "martial_arts"],
    ["artes marciales", "es", "martial_arts"],
    ["danse", "fr", "dance"],
    ["dance class", "en", "dance"],
    ["baile", "es", "dance"],
  ];

  for (const [query, locale, id] of cases) {
    const matches = searchSubjectBuckets(query, { locale, limit: 8 });
    assert.equal(matches[0]?.bucket.canonicalId, id, `${query} should resolve to ${id}`);
  }
});

test("new SEO layer does not touch restricted systems or fake teacher inventory", () => {
  const combined = [subjectSeoSrc, subjectPageSrc].join("\n");
  for (const forbidden of [
    "stripe",
    "STRIPE",
    "checkout",
    "booking_payments",
    "commission",
    "membrePro",
    "student_onboarding_consents",
    "createServerSupabaseClient",
    "supabase/migrations",
  ]) {
    assert.ok(!combined.includes(forbidden), `new SEO/search files must not reference ${forbidden}`);
  }
  assert.doesNotMatch(subjectPageSrc, /const\s+teachers\s*=|fakeTeacher|mockTeacher|testimonial|review/i);
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[seo:lifestyleSubjectSeo] ${tests.length} tests passed`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
