/**
 * YoPratiqo landing-page regression suite.
 *
 * Static-source + pure-helper tests only. No browser, no network, no
 * Stripe, Supabase, RLS, migrations, booking, search internals,
 * Membre Pro, or audio files.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { SITE_URL } from "@/lib/seo/site";
import { buildYoPratiqoMetadata } from "@/lib/yo/yopratiqoSeo";
import {
  getYoPratiqoModuleBySlug,
  yopratiqoProductConfig,
  type YoPratiqoModuleSlug,
} from "@/lib/yo/yopratiqoProductConfig";

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

const LANDING_ROUTES: Array<{
  slug: YoPratiqoModuleSlug;
  seoId:
    | "englishLanding"
    | "frenchQuebecLanding"
    | "spanishLanding"
    | "japaneseLanding"
    | "italianLanding";
  file: string;
}> = [
  {
    slug: "anglais",
    seoId: "englishLanding",
    file: "app/yo/langues/anglais/page.tsx",
  },
  {
    slug: "francais-quebec",
    seoId: "frenchQuebecLanding",
    file: "app/yo/langues/francais-quebec/page.tsx",
  },
  {
    slug: "espagnol",
    seoId: "spanishLanding",
    file: "app/yo/langues/espagnol/page.tsx",
  },
  {
    slug: "japonais",
    seoId: "japaneseLanding",
    file: "app/yo/langues/japonais/page.tsx",
  },
  {
    slug: "italien",
    seoId: "italianLanding",
    file: "app/yo/langues/italien/page.tsx",
  },
];

test("all five YoPratiqo language landing routes exist", () => {
  assert.equal(yopratiqoProductConfig.currentFreeIntroModules.length, 5);

  for (const route of LANDING_ROUTES) {
    assert.ok(exists(route.file), `${route.file} must exist`);
    const moduleConfig = getYoPratiqoModuleBySlug(route.slug);
    assert.equal(route.file, `app${moduleConfig.landingRoute}/page.tsx`);
  }
});

test("landing pages use the shared landing component and central metadata helper", () => {
  for (const route of LANDING_ROUTES) {
    const src = read(route.file);
    assert.match(src, /YoLanguageLandingPage/);
    assert.match(src, /generateMetadata/);
    assert.ok(
      src.includes(`buildYoPratiqoMetadata("${route.seoId}", params.lang)`),
      `${route.file} must request ${route.seoId}`,
    );
    assert.ok(!/pratiqo\.com\b/.test(src));
  }
});

test("landing config links every page to its intro route and teacher CTA", () => {
  for (const route of LANDING_ROUTES) {
    const moduleConfig = getYoPratiqoModuleBySlug(route.slug);
    assert.ok(moduleConfig.introRoute.endsWith("/intro"));
    assert.ok(moduleConfig.landingRoute.startsWith("/yo/langues/"));
    assert.ok(moduleConfig.teacherSearchUrl.startsWith("/trouver-un-prof?q="));
    assert.ok(!moduleConfig.teacherSearchUrl.includes("pratiqo.com"));
  }

  const landingComponent = read("components/yo/YoLanguageLandingPage.tsx");
  const teacherBridge = read("components/yo/YoTeacherBridgeCard.tsx");
  assert.match(landingComponent, /moduleConfig\.introRoute/);
  assert.match(landingComponent, /moduleConfig\.teacherSearchUrl/);
  assert.match(teacherBridge, /moduleConfig\.teacherSearchUrl/);
});

test("landing pages have a clear primary intro CTA and secondary teacher CTA", () => {
  const landingComponent = read("components/yo/YoLanguageLandingPage.tsx");
  const teacherBridge = read("components/yo/YoTeacherBridgeCard.tsx");

  assert.match(landingComponent, /Start the free intro/);
  assert.match(landingComponent, /Commencer l.intro gratuite/);
  assert.match(landingComponent, /Find a teacher on Pratiqo/);
  assert.match(landingComponent, /Trouver un professeur sur Pratiqo/);
  assert.match(landingComponent, /bg-\[#0F6E56\]/);
  assert.match(teacherBridge, /Find a teacher on Pratiqo/);
  assert.match(teacherBridge, /border border-\[#0F6E56\]/);
});

test("landing metadata canonicals use www.pratiqo.ca and obey noindex config", () => {
  for (const route of LANDING_ROUTES) {
    const moduleConfig = getYoPratiqoModuleBySlug(route.slug);
    const metadata = buildYoPratiqoMetadata(route.seoId, "fr");

    assert.equal(
      metadata.alternates?.canonical,
      `${SITE_URL}${moduleConfig.landingRoute}`,
    );
    assert.ok(JSON.stringify(metadata).includes("https://www.pratiqo.ca"));
    assert.ok(!JSON.stringify(metadata).includes("pratiqo.com"));
    assert.deepEqual(metadata.robots, {
      index: yopratiqoProductConfig.moduleIndexingEnabled,
      follow: yopratiqoProductConfig.moduleIndexingEnabled,
    });
    assert.equal(metadata.robots?.index, false);
  }
});

test("landing pages include legal-safe educational disclaimer copy", () => {
  const disclaimer = read("components/yo/YoLegalDisclaimer.tsx");
  assert.match(disclaimer, /garantie de maîtrise d’une langue/);
  assert.match(disclaimer, /no guarantee of language fluency/);
  assert.match(disclaimer, /exam success/);
  assert.match(disclaimer, /immigration outcomes/);
  assert.match(disclaimer, /not legal or immigration advice/);
  assert.match(disclaimer, /teacher marketplace bookings remain separate/);
});

test("landing copy avoids unsafe guarantees, fake social proof, and fake pricing", () => {
  const sources = [
    read("lib/yo/yopratiqoLandingContent.ts"),
    read("components/yo/YoLegalDisclaimer.tsx"),
    read("components/yo/YoLanguageLandingPage.tsx"),
    read("components/yo/YoTeacherBridgeCard.tsx"),
  ].join("\n");

  for (const banned of [
    /guaranteed fluency/i,
    /guaranteed exam success/i,
    /guaranteed immigration result/i,
    /government accredited/i,
    /accrédité par le gouvernement/i,
    /fake reviews/i,
    /fake ratings/i,
    /\b4\.9\b/,
    /\b5-star\b/i,
    /\$\d/,
    /€\d/,
  ]) {
    assert.ok(!banned.test(sources), `unsafe copy matched ${banned}`);
  }
});

test("indexing and Course schema stay disabled until explicitly enabled", () => {
  assert.equal(yopratiqoProductConfig.moduleIndexingEnabled, false);
  assert.equal(yopratiqoProductConfig.courseSchemaEnabled, false);
});

test("lawyer-review document exists and covers required topics", () => {
  const docPath = "docs/legal/yopratiqo-lawyer-review.md";
  assert.ok(exists(docPath), "lawyer review document must exist");
  const src = read(docPath);

  assert.match(src, /DRAFT — FOR LAWYER REVIEW ONLY/);
  for (const topic of [
    /refund and cancellation/i,
    /no fluency guarantee/i,
    /privacy and Law 25/i,
    /tax display/i,
    /AI-generated audio/i,
    /teacher marketplace bookings remain a separate/i,
  ]) {
    assert.match(src, topic);
  }
});

test("landing-layer files do not import forbidden product areas", () => {
  for (const file of [
    "components/yo/YoLanguageLandingPage.tsx",
    "components/yo/YoTeacherBridgeCard.tsx",
    "components/yo/YoLegalDisclaimer.tsx",
    "lib/yo/yopratiqoLandingContent.ts",
  ]) {
    const src = read(file);
    assert.ok(!/stripe|supabase|rls|\bmigration\b|membre pro|commission/i.test(src));
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

  console.log(`\n${passed} YoPratiqo landing-page assertions passed.`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
