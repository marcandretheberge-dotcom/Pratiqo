/**
 * YoPratiqo SEO metadata regression suite.
 *
 * Static-source + pure-helper tests only. No browser, network,
 * Stripe, Supabase, RLS, migrations, booking/search internals,
 * Membre Pro, legal pages, or generated audio files.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { SITE_URL } from "@/lib/seo/site";
import { buildYopratiqoCourseSchema } from "@/lib/seo/yopratiqoCourseSchema";
import {
  buildYoPratiqoMetadata,
  isYoPratiqoRouteIndexable,
  yopratiqoSeoEntries,
  type YoPratiqoSeoRouteId,
} from "@/lib/yo/yopratiqoSeo";
import { yopratiqoProductConfig } from "@/lib/yo/yopratiqoProductConfig";

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const ROUTES: Array<{ id: YoPratiqoSeoRouteId; file: string; route: string }> = [
  {
    id: "languageHub",
    file: "app/yo/langues/page.tsx",
    route: "/yo/langues",
  },
  {
    id: "englishLanding",
    file: "app/yo/langues/anglais/page.tsx",
    route: "/yo/langues/anglais",
  },
  {
    id: "frenchQuebecLanding",
    file: "app/yo/langues/francais-quebec/page.tsx",
    route: "/yo/langues/francais-quebec",
  },
  {
    id: "spanishLanding",
    file: "app/yo/langues/espagnol/page.tsx",
    route: "/yo/langues/espagnol",
  },
  {
    id: "japaneseLanding",
    file: "app/yo/langues/japonais/page.tsx",
    route: "/yo/langues/japonais",
  },
  {
    id: "italianLanding",
    file: "app/yo/langues/italien/page.tsx",
    route: "/yo/langues/italien",
  },
  {
    id: "spanishIntro",
    file: "app/yo/langues/espagnol/intro/page.tsx",
    route: "/yo/langues/espagnol/intro",
  },
  {
    id: "frenchQuebecIntro",
    file: "app/yo/langues/francais-quebec/intro/page.tsx",
    route: "/yo/langues/francais-quebec/intro",
  },
  {
    id: "italianIntro",
    file: "app/yo/langues/italien/intro/page.tsx",
    route: "/yo/langues/italien/intro",
  },
  {
    id: "englishIntro",
    file: "app/yo/langues/anglais/intro/page.tsx",
    route: "/yo/langues/anglais/intro",
  },
  {
    id: "japaneseIntro",
    file: "app/yo/langues/japonais/intro/page.tsx",
    route: "/yo/langues/japonais/intro",
  },
];

test("YoPratiqo SEO config covers the language hub and all five intro routes", () => {
  assert.deepEqual(
    Object.keys(yopratiqoSeoEntries).sort(),
    [
      "englishIntro",
      "englishLanding",
      "frenchQuebecIntro",
      "frenchQuebecLanding",
      "italianIntro",
      "italianLanding",
      "japaneseIntro",
      "japaneseLanding",
      "languageHub",
      "spanishIntro",
      "spanishLanding",
    ],
  );

  for (const route of ROUTES) {
    assert.equal(yopratiqoSeoEntries[route.id].route, route.route);
  }
});

test("YoPratiqo SEO config contains French and English metadata for every route", () => {
  const titles = new Set<string>();
  const descriptions = new Set<string>();

  for (const route of ROUTES) {
    const entry = yopratiqoSeoEntries[route.id];
    for (const locale of ["fr", "en"] as const) {
      const copy = entry.copy[locale];
      assert.ok(copy.title.includes("YoPratiqo"), `${route.id}.${locale} title`);
      assert.ok(copy.description.length > 80, `${route.id}.${locale} description`);
      assert.ok(!titles.has(copy.title), `${copy.title} must be unique`);
      assert.ok(
        !descriptions.has(copy.description),
        `${copy.description} must be unique`,
      );
      titles.add(copy.title);
      descriptions.add(copy.description);
    }
  }
});

test("metadata helper emits canonical, OpenGraph, Twitter, and route-aware robots fields", () => {
  // Page-type taxonomy: hub + landing pages are indexable in phase 1,
  // intro lesson pages remain noindex. The assertion picks the
  // expected robots posture from the YoPratiqoSeoEntry's pageType so
  // a future routing addition automatically inherits the right gate.
  for (const route of ROUTES) {
    const metadata = buildYoPratiqoMetadata(route.id, "en");
    const canonical = `${SITE_URL}${route.route}`;

    assert.equal(metadata.alternates?.canonical, canonical);
    assert.equal(metadata.openGraph?.url, canonical);
    assert.equal(metadata.openGraph?.siteName, "Pratiqo");
    assert.equal(metadata.openGraph?.type, "website");
    assert.ok(metadata.openGraph?.images, `${route.id} must include an OG image`);
    assert.equal(metadata.twitter?.card, "summary_large_image");
    assert.ok(metadata.twitter?.title, `${route.id} must include Twitter title`);
    assert.ok(
      metadata.twitter?.description,
      `${route.id} must include Twitter description`,
    );
    assert.ok(metadata.twitter?.images, `${route.id} must include Twitter image`);

    const pageType = yopratiqoSeoEntries[route.id].pageType;
    const expectedIndex = isYoPratiqoRouteIndexable(route.id);
    assert.deepEqual(
      metadata.robots,
      { index: expectedIndex, follow: expectedIndex },
      `${route.id} (${pageType}) robots posture must match the route-aware gate`,
    );
  }
});

test("intro pages stay noindex while introPageIndexingEnabled is off", () => {
  assert.equal(yopratiqoProductConfig.introPageIndexingEnabled, false);
  for (const introId of [
    "spanishIntro",
    "frenchQuebecIntro",
    "italianIntro",
    "englishIntro",
    "japaneseIntro",
  ] as const) {
    const metadata = buildYoPratiqoMetadata(introId, "fr");
    assert.deepEqual(
      metadata.robots,
      { index: false, follow: false },
      `${introId} must remain noindex/nofollow`,
    );
  }
});

test("canonical URLs use www.pratiqo.ca and never pratiqo.com", () => {
  for (const route of ROUTES) {
    const metadata = buildYoPratiqoMetadata(route.id, "fr");
    const serialized = JSON.stringify(metadata);

    assert.ok(serialized.includes("https://www.pratiqo.ca"));
    assert.ok(!serialized.includes("pratiqo.com"));
  }
});

test("YoPratiqo pages call the central SEO helper instead of carrying scattered metadata", () => {
  for (const route of ROUTES) {
    const src = read(route.file);
    assert.match(src, /generateMetadata/);
    assert.match(src, /buildYoPratiqoMetadata/);
    assert.ok(
      src.includes(`buildYoPratiqoMetadata("${route.id}", params.lang)`),
      `${route.file} must request the ${route.id} metadata entry`,
    );
    assert.ok(!/export\s+const\s+metadata\s*:/.test(src));
    assert.ok(!/pratiqo\.com\b/.test(src));
  }
});

test("Course schema helper names Pratiqo / Cours Pratiqo Inc. without fake commercial signals", () => {
  const schema = buildYopratiqoCourseSchema({
    name: "YoPratiqo Spanish Intro",
    description: "A free Spanish intro module.",
    url: "/yo/langues/espagnol/intro",
    inLanguage: "es",
    educationalLevel: "A1",
    isAccessibleForFree: true,
    teaches: ["Spanish first words"],
    about: ["Language learning"],
  });
  const serialized = JSON.stringify(schema);

  assert.equal(schema["@type"], "Course");
  assert.equal(schema.provider.name, "Cours Pratiqo Inc.");
  assert.equal(schema.provider.alternateName, "Pratiqo");
  assert.equal(schema.provider.sameAs, SITE_URL);
  assert.equal(schema.url, `${SITE_URL}/yo/langues/espagnol/intro`);
  assert.ok(!/aggregateRating|review|offers|price|hasCourseInstance/i.test(serialized));
});

test("Yo SEO files do not import forbidden product areas", () => {
  for (const file of [
    "lib/yo/yopratiqoSeo.ts",
    "lib/yo/yopratiqoProductConfig.ts",
    "lib/seo/yopratiqoCourseSchema.ts",
  ]) {
    const src = read(file);
    assert.ok(!/stripe|checkout|payment|supabase|rls|migration|booking/i.test(src));
  }
});

(async () => {
  let passed = 0;

  for (const entry of tests) {
    try {
      await entry.fn();
      passed += 1;
      console.log(`ok - ${entry.name}`);
    } catch (error) {
      console.error(`not ok - ${entry.name}`);
      throw error;
    }
  }

  console.log(`\n${passed} YoPratiqo SEO metadata assertions passed.`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
