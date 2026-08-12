import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  RD_M2_WORKBOOK_PAGE_COUNT,
  countRdM2WorkbookResponseOpportunities,
  dominicanRepublicModule2Workbook,
  listRdM2WorkbookMechanics,
  type RdM2WorkbookPageKind,
} from "../../lib/yo/dominicanRepublicModule2Workbook";
import { getPrintableResourceById } from "../../lib/yo/printableResources";

const ROOT = process.cwd();

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

function exists(path: string): boolean {
  return existsSync(join(ROOT, path));
}

const DATA_FILE = "lib/yo/dominicanRepublicModule2Workbook.ts";
const COMPONENT_FILE = "components/yo/DominicanRepublicModule2Workbook.tsx";
const ROUTE_FILE =
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-2/ressources/kit-arrivee/page.tsx";
const MODULE2_FILE = "components/yo/DominicanRepublicModule2Content.tsx";

assert.ok(exists(DATA_FILE), "Module 2 workbook data file exists");
assert.ok(exists(COMPONENT_FILE), "Module 2 workbook renderer exists");
assert.ok(exists(ROUTE_FILE), "Module 2 workbook route exists");

assert.equal(dominicanRepublicModule2Workbook.id, "dominican-republic-module-2-workbook-v1-1");
assert.equal(dominicanRepublicModule2Workbook.moduleId, "dominican-republic-module-2");
assert.equal(dominicanRepublicModule2Workbook.resourceId, "rd-m2-arrival-kit");
assert.equal(dominicanRepublicModule2Workbook.targetLanguage, "es");
assert.deepEqual(dominicanRepublicModule2Workbook.learnerLocales, ["fr", "en", "es"]);

assert.equal(RD_M2_WORKBOOK_PAGE_COUNT, 20, "workbook has 20 logical pages");
assert.equal(dominicanRepublicModule2Workbook.pages.length, 20, "workbook page array has 20 pages");
assert.deepEqual(
  dominicanRepublicModule2Workbook.pages.map((page) => page.pageNumber),
  Array.from({ length: 20 }, (_, index) => index + 1),
  "workbook page numbers are contiguous",
);
assert.equal(
  new Set(dominicanRepublicModule2Workbook.pages.map((page) => page.id)).size,
  20,
  "workbook page ids are unique",
);

// Every counted response is now derived from an item that reserves
// writing space, so this range describes real learner work rather than
// a hand-declared total.
const responseCount = countRdM2WorkbookResponseOpportunities();
assert.ok(responseCount >= 150, `expected at least 150 response opportunities, got ${responseCount}`);
assert.ok(responseCount <= 240, `expected no more than 240 response opportunities, got ${responseCount}`);

const mechanics = listRdM2WorkbookMechanics();
assert.ok(mechanics.length >= 10, "workbook uses at least 10 practice mechanics");
for (const mechanic of [
  "contextual-input",
  "listening-simulation",
  "reading",
  "writing",
  "speaking-prep",
  "cumulative-retrieval",
  "performance-check",
  "self-assessment",
  "answer-key",
]) {
  assert.ok(mechanics.includes(mechanic), `missing mechanic: ${mechanic}`);
}

const pageKinds = new Set(dominicanRepublicModule2Workbook.pages.map((page) => page.kind));
const requiredPageKinds = [
  "diagnostic",
  "scenario",
  "language-detective",
  "controlled-practice",
  "retrieval",
  "conversation",
  "taxi-lab",
  "hotel-checkin",
  "hotel-problems",
  "listening-lab",
  "dominican-awareness",
  "reading",
  "writing",
  "speaking",
  "cumulative",
  "performance-check",
  "answer-key",
  "model-responses",
] as const satisfies readonly RdM2WorkbookPageKind[];
for (const kind of requiredPageKinds) {
  assert.ok(pageKinds.has(kind), `missing page kind: ${kind}`);
}

assert.deepEqual(
  dominicanRepublicModule2Workbook.pages.slice(-2).map((page) => page.kind),
  ["answer-key", "model-responses"],
  "solutions are isolated to the final two pages",
);
assert.equal(
  dominicanRepublicModule2Workbook.pages
    .slice(0, 18)
    .flatMap((page) => page.activities)
    .some((activity) => activity.kind === "answer-key" || activity.kind === "model-response"),
  false,
  "no answer-key/model-response activity appears under practice pages",
);

for (const page of dominicanRepublicModule2Workbook.pages) {
  assert.ok(page.title.fr && page.title.en && page.title.es, `${page.id} has FR/EN/ES title`);
  assert.ok(page.purpose.fr && page.purpose.en && page.purpose.es, `${page.id} has FR/EN/ES purpose`);
  assert.ok(page.activities.length > 0, `${page.id} has at least one activity`);
  for (const activity of page.activities) {
    assert.ok(activity.title.fr && activity.title.en && activity.title.es, `${activity.id} has localized title`);
    assert.ok(activity.instructions.fr && activity.instructions.en && activity.instructions.es, `${activity.id} has localized instructions`);
  }
}

assert.ok(
  dominicanRepublicModule2Workbook.pages.some((page) =>
    page.activities.some((activity) => activity.inputLines && activity.inputLines.length >= 3),
  ),
  "workbook includes contextual input",
);
assert.ok(
  dominicanRepublicModule2Workbook.pages.filter((page) =>
    page.activities.some((activity) => activity.inputLines && activity.inputLines.length >= 3),
  ).length >= 2,
  "workbook includes at least two contextual inputs",
);

const componentSrc = read(COMPONENT_FILE);
assert.match(componentSrc, /data-yo-rd-m2-workbook="true"/);
assert.match(componentSrc, /data-yo-workbook-page-count/);
assert.match(componentSrc, /data-yo-workbook-response-count/);
assert.match(componentSrc, /lang="es"/, "renderer marks Spanish target text with lang=es");
assert.doesNotMatch(componentSrc, /<details\b/i, "workbook renderer does not use per-exercise details answers");

const routeSrc = read(ROUTE_FILE);
assert.match(routeSrc, /DominicanRepublicModule2Workbook/);
assert.doesNotMatch(routeSrc, /DominicanModulePrintables|module2PrintablePack/);
assert.match(routeSrc, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/);

const module2Src = read(MODULE2_FILE);
assert.match(module2Src, /YoPrintableResourceCard/);
assert.match(module2Src, /rd-m2-arrival-kit/);
assert.match(module2Src, /Cahier imprimable|Printable workbook|Cuaderno imprimible/);

const resource = getPrintableResourceById("rd-m2-arrival-kit");
assert.ok(resource, "rd-m2-arrival-kit is registered");
assert.equal(resource?.type, "print-route");
assert.equal(resource?.category, "workbook", "Module 2 printable resource is now categorized as workbook");
assert.doesNotMatch(resource?.href ?? "", /\.pdf$/i, "Module 2 resource is not a fake PDF");

console.log("[yo:dominican-m2-workbook] assertions passed");
