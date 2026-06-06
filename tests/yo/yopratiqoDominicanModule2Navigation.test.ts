/**
 * YoPratiqo Dominican Republic navigation regression.
 *
 * Ensures Module 2 can hand off to Module 3 and the country path exposes
 * only real routes.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { dominicanRepublicA1 } from "@/lib/yo/dominicanRepublicA1";

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

const COUNTRY_CONTENT_FILE = "components/yo/RepubliqueDominicaineContent.tsx";
const LESSON_PATH_FILE = "components/yo/YoLessonPath.tsx";
const MODULE_2_CONTENT_FILE = "components/yo/DominicanRepublicModule2Content.tsx";
const MODULE_2_PAGE_FILE =
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-2/page.tsx";
const MODULE_3_PAGE_FILE =
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-3/page.tsx";
const TYPES_FILE = "lib/yo/types.ts";

test("Module 2 and Module 3 route files both exist", () => {
  assert.ok(exists(MODULE_2_PAGE_FILE), "Module 2 route missing");
  assert.ok(exists(MODULE_3_PAGE_FILE), "Module 3 route missing");
});

test("Module 2 teaser links to Module 3", () => {
  const src = read(MODULE_2_CONTENT_FILE);
  assert.ok(src.includes("/yo/langues/espagnol/pays/republique-dominicaine/module-3"));
  assert.ok(src.includes("Ouvrir le module 3"));
  assert.ok(src.includes("Open Module 3"));
  assert.ok(src.includes("Abrir el módulo 3"));
});

test("lesson path type supports optional real hrefs", () => {
  const types = read(TYPES_FILE);
  assert.match(types, /href\?:\s*string/);
  const path = read(LESSON_PATH_FILE);
  assert.ok(path.includes("step.href ?? activeHref"));
});

test("country page preserves locale on Module 2 and Module 3 links", () => {
  const src = read(COUNTRY_CONTENT_FILE);
  assert.ok(src.includes("localizedLessonPath"));
  assert.ok(src.includes("`?lang=${locale}`"));
});

test("Dominican path exposes only Modules 2 and 3 as available premium routes", () => {
  const steps = dominicanRepublicA1.lessonPath;
  const liveSteps = steps.filter((step) => step.status === "available");
  assert.deepEqual(
    liveSteps.map((step) => step.position),
    [2, 3],
  );
  assert.equal(
    liveSteps[0]?.href,
    "/yo/langues/espagnol/pays/republique-dominicaine/module-2",
  );
  assert.equal(
    liveSteps[1]?.href,
    "/yo/langues/espagnol/pays/republique-dominicaine/module-3",
  );
});

test("Modules 4 and 5 remain coming soon without fake links", () => {
  const module4 = dominicanRepublicA1.lessonPath.find((step) => step.position === 4);
  const module5 = dominicanRepublicA1.lessonPath.find((step) => step.position === 5);
  assert.equal(module4?.status, "locked");
  assert.equal(module4?.href, undefined);
  assert.match(module4?.ctaLabel.fr ?? "", /Bientôt/);
  assert.equal(module5?.status, "locked");
  assert.equal(module5?.href, undefined);
  assert.match(module5?.ctaLabel.en ?? "", /Coming soon/);
});

test("Module 3 does not create links for future modules", () => {
  const module3 = read("components/yo/DominicanRepublicModule3Content.tsx");
  assert.ok(!module3.includes("/module-4"));
  assert.ok(!module3.includes("/module-5"));
});

let passed = 0;
let failed = 0;

(async () => {
  console.log(`\nRunning ${tests.length} tests - YoPratiqo Dominican Module 2/3 navigation\n`);

  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  ✓  ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗  ${name}`);
      if (err instanceof Error) console.error(`     ${err.message}`);
      failed++;
    }
  }

  console.log(`\n${passed} passed · ${failed} failed\n`);
  if (failed > 0) process.exit(1);
})();
