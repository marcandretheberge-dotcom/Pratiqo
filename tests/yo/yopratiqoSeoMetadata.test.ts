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
  // The set also includes the future-premium module shell entry
  // (`frenchQuebecModuleOne`). The shell is intentionally noindex
  // and is excluded from the per-route ROUTES iteration above; it is
  // covered by its own dedicated suite at
  // tests/yo/yopratiqoFrQuebecPremiumShell.test.ts.
  assert.deepEqual(
    Object.keys(yopratiqoSeoEntries).sort(),
    [
      "englishIntro",
      "englishLanding",
      "frenchQuebecIntro",
      "frenchQuebecLanding",
      "frenchQuebecModuleOne",
      "germanLanding",
      "hub",
      "italianIntro",
      "italianLanding",
      "japaneseIntro",
      "japaneseLanding",
      "languageHub",
      "mandarinLanding",
      "portugueseLanding",
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
    const canonical = `${SITE_URL}${route.route}${isYoPratiqoRouteIndexable(route.id) ? "?lang=en" : ""}`;

    assert.equal(metadata.alternates?.canonical, canonical);
    assert.equal(metadata.openGraph?.url, canonical);
    assert.equal(metadata.openGraph?.siteName, "Pratiqo");
    assert.ok(metadata.openGraph && "type" in metadata.openGraph);
    assert.equal(metadata.openGraph.type, "website");
    assert.ok(metadata.openGraph?.images, `${route.id} must include an OG image`);
    assert.ok(metadata.twitter && "card" in metadata.twitter);
    assert.equal(metadata.twitter.card, "summary_large_image");
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

test("Spanish Japanese metadata matches its translated landing without changing other locale fallbacks", () => {
  for (const language of ["es", ["es"], " ES "]) {
    const metadata = buildYoPratiqoMetadata("japaneseLanding", language);
    assert.equal(metadata.title, "Japonés con Yoppo | YoPratiqo — 8 módulos");
    assert.equal(metadata.openGraph?.title, metadata.title);
    assert.equal(metadata.twitter?.title, metadata.title);
    assert.equal(metadata.openGraph?.description, metadata.description);
    assert.equal(metadata.openGraph?.locale, "es_ES");
    assert.equal(metadata.alternates?.canonical, `${SITE_URL}/yo/langues/japonais?lang=es`);
  }
  assert.deepEqual(buildYoPratiqoMetadata("italianLanding", "es"), buildYoPratiqoMetadata("italianLanding", "fr"));
  assert.deepEqual(buildYoPratiqoMetadata("japaneseIntro", "es"), buildYoPratiqoMetadata("japaneseIntro", "fr"));
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
  // Two layers of defence:
  //   1. Strip JS comments so doc-comments that name the concept
  //      negatively (e.g. "this surface intentionally has no
  //      checkout / payments / Supabase coupling") never falsely
  //      match.
  //   2. Use word-boundary regexes so harmless config flags whose
  //      identifier happens to contain a banned substring (for
  //      example `checkoutEnabled: false`, `publicLaunchEnabled:
  //      false`) do not accidentally trigger. We still want the test
  //      to catch real imports / runtime references like
  //      `import stripe`, `from "@/lib/payments"`, `BookingModal`,
  //      etc.
  const stripComments = (src: string): string =>
    src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  const FORBIDDEN =
    /\bstripe\b|\bcheckout\b|\bpayment\b|\bsupabase\b|\brls\b|\bmigration\b|\bbooking\b/i;
  for (const file of [
    "lib/yo/yopratiqoSeo.ts",
    "lib/yo/yopratiqoProductConfig.ts",
    "lib/seo/yopratiqoCourseSchema.ts",
  ]) {
    const src = stripComments(read(file));
    assert.ok(!FORBIDDEN.test(src), `${file} must not import forbidden product areas`);
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
