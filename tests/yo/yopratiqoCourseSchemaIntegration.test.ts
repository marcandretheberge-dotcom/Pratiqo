/**
 * YoPratiqo Course schema integration guard.
 *
 * The helper exists, but JSON-LD publication is intentionally gated by
 * product config until YoPratiqo modules are indexable.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { SITE_URL } from "@/lib/seo/site";
import { buildYopratiqoCourseSchema } from "@/lib/seo/yopratiqoCourseSchema";
import {
  canInjectYoPratiqoCourseSchema,
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

test("Course schema publication is disabled while indexing/schema flags are false", () => {
  assert.equal(yopratiqoProductConfig.moduleIndexingEnabled, false);
  assert.equal(yopratiqoProductConfig.courseSchemaEnabled, false);

  for (const moduleConfig of yopratiqoProductConfig.currentFreeIntroModules) {
    assert.equal(canInjectYoPratiqoCourseSchema(moduleConfig), false);
  }
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
  for (const file of [
    "lib/seo/yopratiqoCourseSchema.ts",
    "lib/yo/yopratiqoProductConfig.ts",
    "components/yo/YoLanguageLandingPage.tsx",
  ]) {
    const src = read(file);
    assert.ok(!/stripe|checkout|supabase|rls|\bmigration\b|membre pro|commission/i.test(src));
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
