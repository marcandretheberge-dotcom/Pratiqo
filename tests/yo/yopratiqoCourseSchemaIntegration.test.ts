/**
 * YoPratiqo Course schema integration guard.
 *
 * Phase 1 (controlled SEO exposure): the JSON-LD Course schema is
 * published ONLY on the five language landing pages
 * (/yo/langues/{language}). The hub (/yo/langues) and the intro
 * lesson pages (/yo/langues/{language}/intro) must NOT advertise a
 * Course — the hub is a discovery URL that links to many courses
 * (one schema per landing), and intro pages stay noindex while the
 * lesson surface is still pre-launch quality. This test pins both
 * sides of that contract so an accidental flag flip cannot widen the
 * publication scope without an explicit code change.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { SITE_URL } from "@/lib/seo/site";
import { buildYopratiqoCourseSchema } from "@/lib/seo/yopratiqoCourseSchema";
import {
  canInjectYoPratiqoCourseSchema,
  shouldPublishYoCourseSchema,
  yopratiqoProductConfig,
} from "@/lib/yo/yopratiqoProductConfig";

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

test("Course schema is published on landing pages once landing indexing + courseSchemaEnabled are on", () => {
  assert.equal(yopratiqoProductConfig.landingPageIndexingEnabled, true);
  assert.equal(yopratiqoProductConfig.courseSchemaEnabled, true);

  for (const moduleConfig of yopratiqoProductConfig.currentFreeIntroModules) {
    assert.equal(
      canInjectYoPratiqoCourseSchema(moduleConfig),
      true,
      `${moduleConfig.slug} landing must publish Course JSON-LD`,
    );
    assert.equal(
      shouldPublishYoCourseSchema(moduleConfig.slug, "landing"),
      true,
      `${moduleConfig.slug} landing must publish Course JSON-LD via shouldPublishYoCourseSchema`,
    );
  }
});

test("Course schema is NOT published on the hub or on intro lesson pages", () => {
  for (const moduleConfig of yopratiqoProductConfig.currentFreeIntroModules) {
    // Hub never advertises a single Course — it is a discovery URL.
    assert.equal(
      shouldPublishYoCourseSchema(moduleConfig.slug, "hub"),
      false,
      `hub must never publish a Course schema (would mislead crawlers)`,
    );
    // Intro lesson pages stay out of Course publication while
    // `introPageIndexingEnabled` is false — and the contract holds even
    // when the per-module slug is otherwise eligible.
    assert.equal(
      shouldPublishYoCourseSchema(moduleConfig.slug, "intro"),
      false,
      `${moduleConfig.slug} intro must not publish Course JSON-LD`,
    );
  }
});

test("Course schema gate fails closed for unknown slugs", () => {
  // Defensive: a typo in a future call site must never accidentally
  // publish a schema for a non-existent module.
  assert.equal(shouldPublishYoCourseSchema("totallyMadeUp", "landing"), false);
  assert.equal(shouldPublishYoCourseSchema("", "landing"), false);
});

test("landing component guards JSON-LD injection through the central config helper", () => {
  const src = read("components/yo/YoLanguageLandingPage.tsx");
  assert.match(src, /canInjectYoPratiqoCourseSchema/);
  assert.match(src, /buildYopratiqoCourseSchema/);
  assert.match(src, /application\/ld\+json/);
  assert.match(src, /shouldInjectCourseSchema/);
});

test("Course schema helper produces safe provider and no fake commercial signals", () => {
  const schema = buildYopratiqoCourseSchema({
    name: "YoPratiqo Japanese Intro",
    description: "A free Japanese intro.",
    url: "/yo/langues/japonais",
    inLanguage: "ja",
    educationalLevel: "Beginner / A1 orientation",
    isAccessibleForFree: true,
    teaches: ["Japanese first words"],
    about: ["Language learning"],
  });
  const serialized = JSON.stringify(schema);

  assert.equal(schema["@context"], "https://schema.org");
  assert.equal(schema["@type"], "Course");
  assert.equal(schema.provider.name, "Cours Pratiqo Inc.");
  assert.equal(schema.provider.alternateName, "Pratiqo");
  assert.equal(schema.provider.url, SITE_URL);
  assert.equal(schema.provider.sameAs, SITE_URL);
  assert.equal(schema.isAccessibleForFree, true);
  assert.ok(!/aggregateRating|review|offers|price|hasCourseInstance|duration|certification|accreditation/i.test(serialized));
});

test("Course schema and landing config avoid forbidden product imports", () => {
  // Strip comments first (doc-comments may legitimately name the
  // concept negatively) and use word-boundary regexes so flags whose
  // identifier contains a banned substring (e.g. `checkoutEnabled`,
  // `publicLaunchEnabled`) do not falsely trigger.
  const stripComments = (src: string): string =>
    src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  const FORBIDDEN =
    /\bstripe\b|\bcheckout\b|\bsupabase\b|\brls\b|\bmigration\b|\bmembre\s+pro\b|\bcommission\b/i;
  for (const file of [
    "lib/seo/yopratiqoCourseSchema.ts",
    "lib/yo/yopratiqoProductConfig.ts",
    "components/yo/YoLanguageLandingPage.tsx",
  ]) {
    const src = stripComments(read(file));
    assert.ok(
      !FORBIDDEN.test(src),
      `${file} must not import forbidden product areas`,
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

  console.log(`\n${passed} YoPratiqo Course schema assertions passed.`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
