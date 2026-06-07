/**
 * YoPratiqo Dominican Republic navigation regression.
 *
 * Ensures the Dominican module path stays coherent as new modules go
 * live. With the A2 capstone (Module 5) now shipped:
 *   - Module 2 still hands off to Module 3.
 *   - Module 3 still hands off to Module 4.
 *   - Module 4 now hands off to Module 5 (the A2 capstone).
 *   - Module 5 route file exists and is reachable from the country path.
 *   - There is NO fake Module 6 link anywhere; lessonPath has 5 lessons.
 *   - The country page preserves locale on every module link.
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
const MODULE_3_CONTENT_FILE = "components/yo/DominicanRepublicModule3Content.tsx";
const MODULE_4_CONTENT_FILE = "components/yo/DominicanRepublicModule4Content.tsx";
const MODULE_2_PAGE_FILE =
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-2/page.tsx";
const MODULE_3_PAGE_FILE =
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-3/page.tsx";
const MODULE_4_PAGE_FILE =
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-4/page.tsx";
const MODULE_5_PAGE_FILE =
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-5/page.tsx";
const TYPES_FILE = "lib/yo/types.ts";

test("Module 2, 3, 4, and 5 route files all exist", () => {
  assert.ok(exists(MODULE_2_PAGE_FILE), "Module 2 route missing");
  assert.ok(exists(MODULE_3_PAGE_FILE), "Module 3 route missing");
  assert.ok(exists(MODULE_4_PAGE_FILE), "Module 4 route missing");
  assert.ok(exists(MODULE_5_PAGE_FILE), "Module 5 route missing");
});

test("Module 2 teaser still links to Module 3", () => {
  const src = read(MODULE_2_CONTENT_FILE);
  assert.ok(src.includes("/yo/langues/espagnol/pays/republique-dominicaine/module-3"));
  assert.ok(src.includes("Ouvrir le module 3"));
  assert.ok(src.includes("Open Module 3"));
  assert.ok(src.includes("Abrir el módulo 3"));
});

test("Module 3 teaser still links to Module 4", () => {
  const src = read(MODULE_3_CONTENT_FILE);
  assert.ok(src.includes("/yo/langues/espagnol/pays/republique-dominicaine/module-4"));
  assert.ok(src.includes("Ouvrir le module 4"));
  assert.ok(src.includes("Open Module 4"));
  assert.ok(src.includes("Abrir el módulo 4"));
});

test("Module 4 teaser now links forward to Module 5 (A2 capstone)", () => {
  const src = read(MODULE_4_CONTENT_FILE);
  assert.ok(
    src.includes("/yo/langues/espagnol/pays/republique-dominicaine/module-5"),
    "Module 4 must link to Module 5",
  );
  assert.ok(src.includes("Ouvrir le module 5"));
  assert.ok(src.includes("Open Module 5"));
  assert.ok(src.includes("Abrir el módulo 5"));
});

test("Module 3 does not link to a non-existent Module 5", () => {
  const src = read(MODULE_3_CONTENT_FILE);
  assert.ok(!src.includes("/module-5"), "Module 3 must not link to Module 5");
});

test("lesson path type supports optional real hrefs", () => {
  const types = read(TYPES_FILE);
  assert.match(types, /href\?:\s*string/);
  const path = read(LESSON_PATH_FILE);
  assert.ok(path.includes("step.href ?? activeHref"));
});

test("country page preserves locale on every module link", () => {
  const src = read(COUNTRY_CONTENT_FILE);
  assert.ok(src.includes("localizedLessonPath"));
  assert.ok(src.includes("`?lang=${locale}`"));
});

test("Dominican path exposes Modules 2, 3, 4, and 5 as live premium routes", () => {
  const steps = dominicanRepublicA1.lessonPath;
  const liveSteps = steps.filter((step) => step.status === "available");
  assert.deepEqual(
    liveSteps.map((step) => step.position),
    [2, 3, 4, 5],
  );
  assert.equal(
    liveSteps[0]?.href,
    "/yo/langues/espagnol/pays/republique-dominicaine/module-2",
  );
  assert.equal(
    liveSteps[1]?.href,
    "/yo/langues/espagnol/pays/republique-dominicaine/module-3",
  );
  assert.equal(
    liveSteps[2]?.href,
    "/yo/langues/espagnol/pays/republique-dominicaine/module-4",
  );
  assert.equal(
    liveSteps[3]?.href,
    "/yo/langues/espagnol/pays/republique-dominicaine/module-5",
  );
});

test("Module 5 is live with a real working route (A2 capstone)", () => {
  const module5 = dominicanRepublicA1.lessonPath.find((step) => step.position === 5);
  assert.equal(module5?.status, "available");
  assert.equal(
    module5?.href,
    "/yo/langues/espagnol/pays/republique-dominicaine/module-5",
  );
  assert.match(module5?.ctaLabel.fr ?? "", /Ouvrir/);
  assert.match(module5?.ctaLabel.en ?? "", /Open/);
  assert.match(module5?.ctaLabel.es ?? "", /Abrir/);
});

test("No fake Module 6 link exists (lesson path stops at 5)", () => {
  const steps = dominicanRepublicA1.lessonPath;
  assert.equal(steps.length, 5, "Dominican lesson path must have exactly 5 lessons");
  const filesToCheck = [
    MODULE_2_CONTENT_FILE,
    MODULE_3_CONTENT_FILE,
    MODULE_4_CONTENT_FILE,
    "components/yo/DominicanRepublicModule5Content.tsx",
    COUNTRY_CONTENT_FILE,
  ];
  for (const file of filesToCheck) {
    if (!exists(file)) continue;
    const src = read(file);
    assert.ok(!src.includes("/module-6"), `Fake Module 6 link found in ${file}`);
  }
});

let passed = 0;
let failed = 0;

(async () => {
  console.log(
    `\nRunning ${tests.length} tests - YoPratiqo Dominican Module 2/3/4/5 navigation\n`,
  );

  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  \u2713  ${name}`);
      passed++;
    } catch (err) {
      console.error(`  \u2717  ${name}`);
      if (err instanceof Error) console.error(`     ${err.message}`);
      failed++;
    }
  }

  console.log(`\n${passed} passed \u00b7 ${failed} failed\n`);
  if (failed > 0) process.exit(1);
})();
