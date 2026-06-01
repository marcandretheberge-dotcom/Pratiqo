/**
 * YoPratiqo controlled-indexation regression suite.
 *
 * Phase 1 SEO exposure: index ONLY the hub + the five language landing
 * pages. Intro lesson pages stay noindex until the lesson surface is
 * ready for public ranking. This test pins both sides of that contract
 * — including the Course schema gate, the sitemap, the canonical
 * origin, and the scope guards (no Stripe / Supabase / RLS / migrations
 * / booking / Membre Pro / commission / audio coupling).
 *
 * Static-source + pure-helper tests only. No browser, no network,
 * no Stripe, no payments, no Supabase calls.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import sitemap from "@/app/sitemap";
import { SITE_URL } from "@/lib/seo/site";
import {
  buildYopratiqoCourseSchema,
  type YopratiqoCourseSchema,
} from "@/lib/seo/yopratiqoCourseSchema";
import {
  isYoHubIndexable,
  isYoIntroPageIndexable,
  isYoLandingPageIndexable,
  shouldPublishYoCourseSchema,
  yopratiqoProductConfig,
  type YoPratiqoModuleSlug,
} from "@/lib/yo/yopratiqoProductConfig";
import {
  buildYoPratiqoMetadata,
  isYoPratiqoRouteIndexable,
  yopratiqoSeoEntries,
} from "@/lib/yo/yopratiqoSeo";

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const LANGUAGE_SLUGS: readonly YoPratiqoModuleSlug[] = [
  "anglais",
  "francais-quebec",
  "espagnol",
  "japonais",
  "italien",
];

const LANDING_ROUTE_IDS = [
  "englishLanding",
  "frenchQuebecLanding",
  "spanishLanding",
  "japaneseLanding",
  "italianLanding",
] as const;

const INTRO_ROUTE_IDS = [
  "englishIntro",
  "frenchQuebecIntro",
  "spanishIntro",
  "japaneseIntro",
  "italianIntro",
] as const;

// ── 1. Hub indexability ────────────────────────────────────────────────

test("/yo/langues hub is indexable in phase 1", () => {
  assert.equal(isYoHubIndexable(), true);
  const metadata = buildYoPratiqoMetadata("languageHub", "fr");
  assert.deepEqual(metadata.robots, { index: true, follow: true });
  assert.equal(
    metadata.alternates?.canonical,
    `${SITE_URL}/yo/langues`,
    "hub canonical must use https://www.pratiqo.ca",
  );
});

// ── 2. Five language landing pages indexability ────────────────────────

test("all five /yo/langues/{language} landing pages are indexable", () => {
  for (const slug of LANGUAGE_SLUGS) {
    assert.equal(
      isYoLandingPageIndexable(slug),
      true,
      `${slug} landing must be indexable`,
    );
  }
  for (const routeId of LANDING_ROUTE_IDS) {
    const metadata = buildYoPratiqoMetadata(routeId, "fr");
    assert.deepEqual(
      metadata.robots,
      { index: true, follow: true },
      `${routeId} metadata must be index:true / follow:true`,
    );
  }
});

// ── 3. Five intro lesson pages remain noindex ──────────────────────────

test("all five /yo/langues/{language}/intro pages remain noindex", () => {
  for (const slug of LANGUAGE_SLUGS) {
    assert.equal(
      isYoIntroPageIndexable(slug),
      false,
      `${slug} intro must remain noindex`,
    );
  }
  for (const routeId of INTRO_ROUTE_IDS) {
    const metadata = buildYoPratiqoMetadata(routeId, "fr");
    assert.deepEqual(
      metadata.robots,
      { index: false, follow: false },
      `${routeId} metadata must be index:false / follow:false`,
    );
  }
});

// ── 4 & 5. Sitemap behaviour ──────────────────────────────────────────

test("sitemap includes /yo/langues and the five landing pages, but no intro pages", async () => {
  const entries = await sitemap();
  const urls = new Set(entries.map((entry) => entry.url));

  assert.ok(
    urls.has(`${SITE_URL}/yo/langues`),
    "sitemap must include the YoPratiqo language hub",
  );
  for (const slug of LANGUAGE_SLUGS) {
    assert.ok(
      urls.has(`${SITE_URL}/yo/langues/${slug}`),
      `sitemap must include the /yo/langues/${slug} landing page`,
    );
  }
  for (const slug of LANGUAGE_SLUGS) {
    assert.ok(
      !urls.has(`${SITE_URL}/yo/langues/${slug}/intro`),
      `sitemap must NOT include /yo/langues/${slug}/intro (lesson surface stays noindex)`,
    );
  }
});

// ── 6 & 7. Course schema publication scope ────────────────────────────

test("Course schema is injected ONLY on the five language landing pages", () => {
  for (const slug of LANGUAGE_SLUGS) {
    assert.equal(
      shouldPublishYoCourseSchema(slug, "landing"),
      true,
      `${slug} landing must publish Course schema`,
    );
  }
});

test("Course schema is NEVER injected on hub or intro pages", () => {
  for (const slug of LANGUAGE_SLUGS) {
    assert.equal(
      shouldPublishYoCourseSchema(slug, "hub"),
      false,
      `Course schema must not be injected on the hub for ${slug}`,
    );
    assert.equal(
      shouldPublishYoCourseSchema(slug, "intro"),
      false,
      `Course schema must not be injected on the ${slug} intro page`,
    );
  }
});

// ── 8. Course schema provider identity ────────────────────────────────

test("Course schema provider is Cours Pratiqo Inc. / Pratiqo and pinned to www.pratiqo.ca", () => {
  for (const slug of LANGUAGE_SLUGS) {
    const moduleConfig = yopratiqoProductConfig.currentFreeIntroModules.find(
      (entry) => entry.slug === slug,
    );
    assert.ok(moduleConfig, `${slug} module must exist in product config`);
    const schema: YopratiqoCourseSchema = buildYopratiqoCourseSchema({
      name: `YoPratiqo ${moduleConfig!.languageName} Intro`,
      description: `A free intro for ${moduleConfig!.languageName}.`,
      url: moduleConfig!.landingRoute,
      inLanguage: moduleConfig!.inLanguage,
      educationalLevel: moduleConfig!.educationalLevel,
      isAccessibleForFree: moduleConfig!.isAccessibleForFree,
    });
    assert.equal(schema["@context"], "https://schema.org");
    assert.equal(schema["@type"], "Course");
    assert.equal(schema.provider["@type"], "Organization");
    assert.equal(schema.provider.name, "Cours Pratiqo Inc.");
    assert.equal(schema.provider.alternateName, "Pratiqo");
    assert.equal(schema.provider.url, SITE_URL);
    assert.equal(schema.provider.sameAs, SITE_URL);
    assert.equal(schema.url, `${SITE_URL}${moduleConfig!.landingRoute}`);
    assert.equal(schema.isAccessibleForFree, true);
  }
});

// ── 9. No fake commercial signals in the Course schema shape ──────────

test("Course schema has NO ratings / reviews / prices / offers / instances / certifications / accreditation", () => {
  // Sample one module — the schema shape is identical across modules.
  const schema = buildYopratiqoCourseSchema({
    name: "YoPratiqo Japanese Intro",
    description: "A free Japanese intro module.",
    url: "/yo/langues/japonais",
    inLanguage: "ja",
    educationalLevel: "Beginner / A1 orientation",
    isAccessibleForFree: true,
    teaches: ["Japanese first words"],
    about: ["Language learning"],
  });
  const serialized = JSON.stringify(schema);

  for (const forbidden of [
    "aggregateRating",
    "review",
    "offers",
    "price",
    "priceCurrency",
    "hasCourseInstance",
    "courseInstance",
    "certification",
    "accreditation",
    "guaranteedOutcome",
  ]) {
    assert.ok(
      !new RegExp(`\\b${forbidden}\\b`, "i").test(serialized),
      `Course schema must not advertise ${forbidden}`,
    );
  }
});

// ── 10. Canonical URLs use www.pratiqo.ca for every YoPratiqo route ──

test("all YoPratiqo metadata canonicals use https://www.pratiqo.ca", () => {
  for (const routeId of Object.keys(yopratiqoSeoEntries) as Array<
    keyof typeof yopratiqoSeoEntries
  >) {
    const metadata = buildYoPratiqoMetadata(routeId, "fr");
    const canonical = String(metadata.alternates?.canonical ?? "");
    assert.ok(
      canonical.startsWith("https://www.pratiqo.ca/"),
      `${routeId} canonical must start with https://www.pratiqo.ca (got "${canonical}")`,
    );
  }
});

// ── 11. Repository-wide ban on pratiqo.com ───────────────────────────

test("YoPratiqo SEO + product config + sitemap never reference pratiqo.com", () => {
  for (const file of [
    "lib/yo/yopratiqoProductConfig.ts",
    "lib/yo/yopratiqoSeo.ts",
    "lib/seo/yopratiqoCourseSchema.ts",
    "components/yo/YoLanguageLandingPage.tsx",
    "app/sitemap.ts",
    "app/yo/langues/page.tsx",
    "app/yo/langues/anglais/page.tsx",
    "app/yo/langues/francais-quebec/page.tsx",
    "app/yo/langues/espagnol/page.tsx",
    "app/yo/langues/japonais/page.tsx",
    "app/yo/langues/italien/page.tsx",
  ]) {
    const src = read(file);
    assert.ok(
      !/pratiqo\.com/i.test(src),
      `${file} must not reference pratiqo.com`,
    );
  }
});

// ── 12 & 13. No premium / paid checkout ─────────────────────────────

test("futurePremiumEnabled stays false and no paid checkout is wired", () => {
  assert.equal(yopratiqoProductConfig.futurePremiumEnabled, false);
  assert.deepEqual(
    [...yopratiqoProductConfig.supportedProductTypes],
    ["free_intro"],
    "supportedProductTypes must remain free_intro only",
  );
  for (const moduleConfig of yopratiqoProductConfig.currentFreeIntroModules) {
    assert.equal(moduleConfig.isAccessibleForFree, true);
    assert.equal(moduleConfig.productType, "free_intro");
    assert.equal(moduleConfig.status, "free_intro");
  }

  // Defensive source scan: no checkout / paid module imports landed in
  // the indexation-touching files.
  for (const file of [
    "lib/yo/yopratiqoProductConfig.ts",
    "lib/yo/yopratiqoSeo.ts",
    "lib/seo/yopratiqoCourseSchema.ts",
    "app/sitemap.ts",
  ]) {
    const src = read(file);
    assert.ok(
      !/\bcheckout\b|\bpaywall\b|\bpaid_module\b/i.test(src),
      `${file} must not introduce a paid checkout/paywall path`,
    );
  }
});

// ── 14. Scope guard — no out-of-bounds imports in this PR's surface ──

test("indexation surface does not touch Stripe / payments / Supabase / RLS / migrations / booking / Membre Pro / audio", () => {
  const stripComments = (src: string): string =>
    src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

  const forbidden: Array<[RegExp, string]> = [
    [/\bstripe\b/i, "Stripe"],
    [/@\/lib\/payments/, "payments lib"],
    [/getSupabaseClient|@\/lib\/supabase/, "Supabase client"],
    [/supabase\/migrations/, "Supabase migration import"],
    [/\bRLS\b/, "RLS reference"],
    [/@\/components\/BookingModal/, "Booking modal"],
    [/\bmembrePro\b|\bMembrePro\b|\bmembre_pro\b/, "Membre Pro config"],
    [/\bcommission\b/i, "commission math"],
    [/yopratiqoAudio|YOPRATIQO_AUDIO_MANIFEST/, "YoPratiqo audio manifest"],
  ];
  for (const file of [
    "lib/yo/yopratiqoProductConfig.ts",
    "lib/yo/yopratiqoSeo.ts",
    "lib/seo/yopratiqoCourseSchema.ts",
  ]) {
    const src = stripComments(read(file));
    for (const [re, label] of forbidden) {
      assert.ok(
        !re.test(src),
        `${file} must not reference ${label} (${re}) — out of scope`,
      );
    }
  }
});

// ── Sanity check: route-aware helper composition ─────────────────────

test("route-aware indexability helpers compose correctly with metadata gate", () => {
  // Hub
  assert.equal(isYoPratiqoRouteIndexable("languageHub"), true);
  // Landing pages
  for (const routeId of LANDING_ROUTE_IDS) {
    assert.equal(isYoPratiqoRouteIndexable(routeId), true);
  }
  // Intro pages
  for (const routeId of INTRO_ROUTE_IDS) {
    assert.equal(isYoPratiqoRouteIndexable(routeId), false);
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
  console.log(`\n${passed} YoPratiqo controlled-indexation assertions passed.`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
