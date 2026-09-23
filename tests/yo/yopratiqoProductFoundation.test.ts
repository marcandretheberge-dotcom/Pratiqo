/**
 * YoPratiqo product-foundation regression suite.
 *
 * Static-source tests only: no browser, no network, no Stripe, no
 * Supabase, no RLS, no migrations, no booking logic. This guards the
 * P1 foundation for YoPratiqo as a self-paced product pillar.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { SITE_URL } from "@/lib/seo/site";
import { buildYopratiqoCourseSchema } from "@/lib/seo/yopratiqoCourseSchema";
import { yopratiqoProductConfig } from "@/lib/yo/yopratiqoProductConfig";
import {
  buildYoPratiqoMetadata,
  type YoPratiqoSeoRouteId,
} from "@/lib/yo/yopratiqoSeo";

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function exists(relativePath: string): boolean {
  return existsSync(join(REPO_ROOT, relativePath));
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const INTRO_PAGES = [
  {
    id: "english",
    seoId: "englishIntro",
    path: "/yo/langues/anglais/intro",
    file: "app/yo/langues/anglais/intro/page.tsx",
  },
  {
    id: "francais-quebec",
    seoId: "frenchQuebecIntro",
    path: "/yo/langues/francais-quebec/intro",
    file: "app/yo/langues/francais-quebec/intro/page.tsx",
  },
  {
    id: "spanish",
    seoId: "spanishIntro",
    path: "/yo/langues/espagnol/intro",
    file: "app/yo/langues/espagnol/intro/page.tsx",
  },
  {
    id: "japanese",
    seoId: "japaneseIntro",
    path: "/yo/langues/japonais/intro",
    file: "app/yo/langues/japonais/intro/page.tsx",
  },
  {
    id: "italian",
    seoId: "italianIntro",
    path: "/yo/langues/italien/intro",
    file: "app/yo/langues/italien/intro/page.tsx",
  },
] as const satisfies ReadonlyArray<{
  id: string;
  seoId: YoPratiqoSeoRouteId;
  path: string;
  file: string;
}>;

test("product config keeps exactly the five current YoPratiqo languages active", () => {
  assert.deepEqual([...yopratiqoProductConfig.currentLanguages], [
    "english",
    "francais-quebec",
    "spanish",
    "japanese",
    "italian",
  ]);
  assert.equal(yopratiqoProductConfig.currentFreeIntroModules.length, 5);

  for (const inactiveCandidate of ["korean", "portuguese", "german", "mandarin"]) {
    assert.ok(
      !yopratiqoProductConfig.currentLanguages.includes(inactiveCandidate as never),
      `${inactiveCandidate} must remain a candidate, not an active language`,
    );
  }
});

test("YoPratiqo remains free-intro only with teacher bridge enabled", () => {
  assert.equal(yopratiqoProductConfig.futurePremiumEnabled, false);
  assert.equal(yopratiqoProductConfig.teacherBridgeEnabled, true);
  // Controlled SEO exposure: hub + landing layer is indexable, intro
  // lesson pages remain noindex. `moduleIndexingEnabled` is kept as a
  // backwards-compatible alias of the intro flag.
  assert.equal(yopratiqoProductConfig.hubIndexingEnabled, true);
  assert.equal(yopratiqoProductConfig.landingPageIndexingEnabled, true);
  assert.equal(yopratiqoProductConfig.introPageIndexingEnabled, false);
  assert.equal(yopratiqoProductConfig.moduleIndexingEnabled, false);
  assert.equal(yopratiqoProductConfig.courseSchemaEnabled, true);
  assert.equal(yopratiqoProductConfig.landingPagesEnabled, true);
  assert.deepEqual([...yopratiqoProductConfig.supportedProductTypes], ["free_intro"]);

  for (const moduleConfig of yopratiqoProductConfig.currentFreeIntroModules) {
    assert.equal(moduleConfig.productType, "free_intro");
    assert.equal(moduleConfig.isAccessibleForFree, true);
    assert.equal(moduleConfig.status, "free_intro");
    // Per-module `indexable` flag is the second gate for intro pages
    // — even after `introPageIndexingEnabled` is flipped on later, an
    // individual module can still be held back. Keep it false until
    // the lesson surface is ready for public ranking.
    assert.equal(moduleConfig.indexable, false);
    assert.equal(moduleConfig.courseSchemaEligible, true);
    assert.ok(moduleConfig.landingRoute.startsWith("/yo/langues/"));
    assert.ok(moduleConfig.teacherSearchUrl.startsWith("/trouver-un-prof?q="));
  }
});

test("current YoPratiqo intro routes exist and match product config", () => {
  const configuredPaths = new Set(
    yopratiqoProductConfig.currentFreeIntroModules.map((moduleConfig) => moduleConfig.path),
  );

  for (const page of INTRO_PAGES) {
    assert.ok(exists(page.file), `${page.file} must exist`);
    assert.ok(configuredPaths.has(page.path), `${page.path} must be configured`);
  }
});

test("intro pages have unique metadata, canonical URLs, and intentional noindex robots", () => {
  const titles = new Set<string>();
  const descriptions = new Set<string>();

  for (const page of INTRO_PAGES) {
    const src = read(page.file);
    const metadata = buildYoPratiqoMetadata(page.seoId, "fr");
    assert.equal(typeof metadata.title, "string", `${page.file} title`);
    assert.equal(
      typeof metadata.description,
      "string",
      `${page.file} description`,
    );
    assert.ok(typeof metadata.title === "string" && typeof metadata.description === "string");
    assert.ok(!titles.has(metadata.title), `${page.file} title must be unique`);
    assert.ok(
      !descriptions.has(metadata.description),
      `${page.file} description must be unique`,
    );
    titles.add(metadata.title);
    descriptions.add(metadata.description);

    assert.equal(metadata.alternates?.canonical, `${SITE_URL}${page.path}`);
    assert.deepEqual(metadata.robots, { index: false, follow: false });
    assert.match(src, /generateMetadata/);
    assert.ok(
      src.includes(`buildYoPratiqoMetadata("${page.seoId}", params.lang)`),
      `${page.file} must use the central YoPratiqo metadata helper`,
    );
  }
});

test("Course schema helper emits a valid future-ready JSON-LD Course shape", () => {
  const schema = buildYopratiqoCourseSchema({
    name: "YoPratiqo — Spanish Dominican Republic A1",
    description: "A free cultural Spanish intro for beginner learners.",
    url: "/yo/voyage/republique-dominicaine",
    inLanguage: "es",
    educationalLevel: "A1",
    isAccessibleForFree: true,
    teaches: ["Spanish greetings", "Dominican culture"],
    about: ["Language learning", "Travel Spanish"],
  });

  assert.equal(schema["@context"], "https://schema.org");
  assert.equal(schema["@type"], "Course");
  assert.equal(schema.provider.name, "Cours Pratiqo Inc.");
  assert.equal(schema.provider.alternateName, "Pratiqo");
  assert.equal(schema.provider.url, SITE_URL);
  assert.equal(schema.provider.sameAs, SITE_URL);
  assert.equal(schema.url, `${SITE_URL}/yo/voyage/republique-dominicaine`);
  assert.equal(schema.inLanguage, "es");
  assert.equal(schema.educationalLevel, "A1");
  assert.equal(schema.isAccessibleForFree, true);
  assert.deepEqual(schema.teaches, ["Spanish greetings", "Dominican culture"]);
  assert.deepEqual(schema.about, ["Language learning", "Travel Spanish"]);
});

test("legal inventory documents the lawyer-review topics required before paid modules", () => {
  const inventoryPath = "docs/legal/yopratiqo-legal-inventory.md";
  assert.ok(exists(inventoryPath), "YoPratiqo legal inventory must exist");
  const src = read(inventoryPath);

  for (const requiredTopic of [
    /refund and cancellation policy/i,
    /no guarantees/i,
    /fluency/i,
    /exam success/i,
    /immigration or legal advice/i,
    /AI and Audio Disclosure/i,
    /learning progress/i,
    /quiz answers/i,
    /tax display/i,
    /checkout disclosure/i,
    /separation from marketplace bookings/i,
  ]) {
    assert.match(src, requiredTopic);
  }
});

test("product strategy doc states YoPratiqo is self-paced and separate from marketplace bookings", () => {
  const strategyPath = "docs/yopratiqo-product-strategy.md";
  assert.ok(exists(strategyPath), "YoPratiqo product strategy must exist");
  const src = read(strategyPath);

  assert.match(src, /self-paced learning product/i);
  assert.match(src, /Pratiqo Marketplace remains the live teacher booking product/i);
  assert.match(src, /Free intro/i);
  assert.match(src, /Premium module later/i);
  assert.match(src, /Teacher booking CTA/i);
  assert.match(src, /English/);
  assert.match(src, /Quebec French \/ Francisation/);
  assert.match(src, /Spanish/);
  assert.match(src, /Japanese/);
  assert.match(src, /Italian/);
  assert.match(src, /Korean/);
  assert.match(src, /Portuguese/);
  assert.match(src, /German/);
  assert.match(src, /Mandarin/);
});

test("foundation files do not import payment, booking, Supabase, or RLS logic", () => {
  // Two layers of defence:
  //   1. Strip JS comments so doc-comments that name the concept
  //      negatively (e.g. "this surface intentionally has no
  //      checkout / payments / Supabase coupling") never falsely
  //      match.
  //   2. Use word-boundary regexes so harmless config flags whose
  //      identifier happens to contain a banned substring (for
  //      example `checkoutEnabled: false`) do not trigger. Real
  //      imports / runtime references like `import stripe`,
  //      `from "@/lib/payments"`, or `BookingModal` are still
  //      caught.
  const stripComments = (src: string): string =>
    src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  const FORBIDDEN =
    /\bstripe\b|\bcheckout\b|\bpayment\b|\bbooking\b|\bsupabase\b|\brls\b|\bmigration\b/i;
  const scopedFiles = [
    "lib/yo/yopratiqoProductConfig.ts",
    "lib/seo/yopratiqoCourseSchema.ts",
  ];

  for (const file of scopedFiles) {
    const src = stripComments(read(file));
    assert.ok(
      !FORBIDDEN.test(src),
      `${file} must not import payment / booking / Supabase / RLS logic`,
    );
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

  console.log(`\n${passed} YoPratiqo product-foundation assertions passed.`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
