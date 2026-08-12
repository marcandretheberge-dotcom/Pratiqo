import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  RD_M3_WORKBOOK_PAGE_COUNT,
  countRdM3WorkbookResponseOpportunities,
  dominicanRepublicModule3Workbook,
  listRdM3WorkbookMechanics,
  type RdM3WorkbookPageKind,
  validateRdM3Workbook,
} from "../../lib/yo/dominicanRepublicModule3Workbook";
import { getPrintableResourceById } from "../../lib/yo/printableResources";

const ROOT = process.cwd();

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

function exists(path: string): boolean {
  return existsSync(join(ROOT, path));
}

const DATA_FILE = "lib/yo/dominicanRepublicModule3Workbook.ts";
const COMPONENT_FILE = "components/yo/DominicanRepublicModule3Workbook.tsx";
const ROUTE_FILE =
  "app/yo/langues/espagnol/pays/republique-dominicaine/module-3/ressources/fiches-pratique/page.tsx";
const MODULE3_FILE = "components/yo/DominicanRepublicModule3Content.tsx";

assert.ok(exists(DATA_FILE), "Module 3 workbook data file exists");
assert.ok(exists(COMPONENT_FILE), "Module 3 workbook renderer exists");
assert.ok(exists(ROUTE_FILE), "Module 3 workbook route exists");

assert.equal(dominicanRepublicModule3Workbook.id, "dominican-republic-module-3-workbook-v1");
assert.equal(dominicanRepublicModule3Workbook.moduleId, "dominican-republic-module-3");
assert.equal(dominicanRepublicModule3Workbook.resourceId, "rd-m3-practice-sheets");
assert.equal(dominicanRepublicModule3Workbook.targetLanguage, "es");
assert.deepEqual(dominicanRepublicModule3Workbook.learnerLocales, ["fr", "en", "es"]);

assert.ok(
  RD_M3_WORKBOOK_PAGE_COUNT >= 20 && RD_M3_WORKBOOK_PAGE_COUNT <= 22,
  `workbook has 20-22 logical pages, got ${RD_M3_WORKBOOK_PAGE_COUNT}`,
);
assert.equal(dominicanRepublicModule3Workbook.pages.length, RD_M3_WORKBOOK_PAGE_COUNT);
assert.deepEqual(
  dominicanRepublicModule3Workbook.pages.map((page) => page.pageNumber),
  Array.from({ length: RD_M3_WORKBOOK_PAGE_COUNT }, (_, index) => index + 1),
  "workbook page numbers are contiguous",
);
assert.equal(
  new Set(dominicanRepublicModule3Workbook.pages.map((page) => page.id)).size,
  dominicanRepublicModule3Workbook.pages.length,
  "workbook page ids are unique",
);

const responseCount = countRdM3WorkbookResponseOpportunities();
assert.ok(responseCount >= 160, `expected at least 160 response opportunities, got ${responseCount}`);
assert.ok(responseCount <= 220, `expected no more than 220 response opportunities, got ${responseCount}`);

const mechanics = listRdM3WorkbookMechanics();
assert.ok(mechanics.length >= 12, "workbook uses at least 12 mechanics");
for (const mechanic of [
  "menu-literacy",
  "food-recognition",
  "culture-recognition",
  "language-detective",
  "retrieval-ladder",
  "order-building",
  "constraint-solving",
  "digital-listening",
  "payment-lab",
  "guided-writing",
  "speaking-prep",
  "performance-check",
  "answer-key",
]) {
  assert.ok(mechanics.includes(mechanic), `missing mechanic: ${mechanic}`);
}

const pageKinds = new Set(dominicanRepublicModule3Workbook.pages.map((page) => page.kind));
const requiredPageKinds = [
  "diagnostic",
  "menu-scan",
  "menu-literacy",
  "food-recognition",
  "culture-recognition",
  "language-detective",
  "controlled-practice",
  "retrieval",
  "order-building",
  "constraint-lab",
  "repair-lab",
  "listening-bridge",
  "payment-lab",
  "writing",
  "speaking",
  "cumulative",
  "performance-check",
  "answer-key",
  "model-responses",
] as const satisfies readonly RdM3WorkbookPageKind[];
for (const kind of requiredPageKinds) {
  assert.ok(pageKinds.has(kind), `missing page kind: ${kind}`);
}

assert.deepEqual(
  dominicanRepublicModule3Workbook.pages.slice(-2).map((page) => page.kind),
  ["answer-key", "model-responses"],
  "solutions are isolated to the final two pages",
);
assert.equal(
  dominicanRepublicModule3Workbook.pages
    .slice(0, -2)
    .flatMap((page) => page.activities)
    .some((activity) => activity.kind === "answer-key" || activity.kind === "model-response"),
  false,
  "no answer-key/model-response activity appears under practice pages",
);
assert.deepEqual(validateRdM3Workbook(), [], "workbook answer/response integrity passes");

const componentSrc = read(COMPONENT_FILE);
assert.match(componentSrc, /data-yo-rd-m3-workbook="true"/);
assert.match(componentSrc, /data-yo-workbook-page-count/);
assert.match(componentSrc, /data-yo-workbook-response-count/);
assert.match(componentSrc, /countRdM3WorkbookPageResponses\(page\)/);
assert.match(componentSrc, /lang="es"/, "renderer marks Spanish target text with lang=es");
assert.doesNotMatch(componentSrc, /<details\b/i, "workbook renderer does not use per-exercise details answers");

const routeSrc = read(ROUTE_FILE);
assert.match(routeSrc, /DominicanRepublicModule3Workbook/);
assert.match(routeSrc, /YoPrintPageShell/);
assert.doesNotMatch(routeSrc, /DominicanModulePrintables|module3PrintablePack|printableSheets/);
assert.match(routeSrc, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/);

const module3Src = read(MODULE3_FILE);
assert.match(module3Src, /YoPrintableResourceCard/);
assert.match(module3Src, /rd-m3-practice-sheets/);
assert.doesNotMatch(module3Src, /Pourquoi ca marche/);
assert.match(module3Src, /Pourquoi ça marche/);

const resource = getPrintableResourceById("rd-m3-practice-sheets");
assert.ok(resource, "rd-m3-practice-sheets is registered");
assert.equal(resource?.type, "print-route");
assert.equal(resource?.category, "workbook", "Module 3 printable resource is now categorized as workbook");
assert.match(resource?.title.fr ?? "", /Cahier YoPratiqo 03/);
assert.match(resource?.title.en ?? "", /YoPratiqo Workbook 03/);
assert.match(resource?.title.es ?? "", /Cuaderno YoPratiqo 03/);
assert.doesNotMatch(resource?.href ?? "", /\.pdf$/i, "Module 3 resource is not a fake PDF");

console.log("[yo:dominican-m3-workbook] assertions passed");
