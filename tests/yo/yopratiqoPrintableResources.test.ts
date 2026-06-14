import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  getPrintableResourceById,
  getPrintableResourcesForLesson,
  getPrintableResourcesForModule,
  isPrintablePdfResource,
  isPrintableRouteResource,
  yoPrintableResources,
} from "../../lib/yo/printableResources";

const ROOT = process.cwd();

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

assert.ok(
  existsSync(join(ROOT, "lib/yo/printableResources.ts")),
  "printable resource manifest exists",
);

for (const resource of yoPrintableResources) {
  assert.ok(resource.id, "resource has id");
  assert.ok(resource.title.fr && resource.title.en && resource.title.es, `${resource.id} has localized title`);
  assert.ok(resource.description.fr && resource.description.en && resource.description.es, `${resource.id} has localized description`);
  assert.ok(resource.type === "print-route" || resource.type === "pdf", `${resource.id} has valid type`);
  assert.ok(resource.href, `${resource.id} has href`);
  assert.ok(resource.category, `${resource.id} has category`);
  assert.equal(typeof resource.available, "boolean", `${resource.id} has availability`);
}

const expectedIds = [
  "fr-qc-m1-l3-survival-kit",
  "rd-m2-arrival-kit",
  "rd-m3-practice-sheets",
  "rd-m4-exploration-sheets",
  "rd-m5-a2-workbook",
];

for (const id of expectedIds) {
  const resource = getPrintableResourceById(id);
  assert.ok(resource, `${id} is registered`);
  assert.ok(isPrintableRouteResource(resource), `${id} is a print route`);
  assert.equal(resource.type, "print-route", `${id} must not be a fake PDF`);
}

assert.equal(getPrintableResourcesForModule("dominican-republic-module-2").length, 1);
assert.equal(getPrintableResourcesForModule("dominican-republic-module-3").length, 1);
assert.equal(getPrintableResourcesForModule("dominican-republic-module-4").length, 1);
assert.equal(getPrintableResourcesForModule("dominican-republic-module-5").length, 1);
assert.equal(
  getPrintableResourcesForLesson("francais-quebec-module-1", "lecon-3")[0]?.id,
  "fr-qc-m1-l3-survival-kit",
);

for (const resource of yoPrintableResources) {
  assert.equal(isPrintablePdfResource(resource), false, `${resource.id} should not be a PDF today`);
}

const lesson3 = read("app/yo/langues/francais-quebec/module-1/lecon-3/page.tsx");
assert.match(lesson3, /YoPrintableResourceCard/, "Lesson 3 final screen uses printable card");
assert.match(lesson3, /fr-qc-m1-l3-survival-kit/, "Lesson 3 uses registered kit id");
assert.doesNotMatch(lesson3, /download|telecharger|télécharger/i, "Lesson 3 does not use fake download wording");

const card = read("components/yo/YoPrintableResourceCard.tsx");
assert.match(card, /Ouvrir le document imprimable/);
assert.match(card, /Open printable document/);
assert.match(card, /Abrir documento imprimible/);
assert.doesNotMatch(card, /download=/i);

console.log("[yo:printable-resources] assertions passed");
