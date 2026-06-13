import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const manifestPath = "lib/yo/printableResources.ts";
const routePath = "app/yo/langues/francais-quebec/module-1/lecon-3/kit-de-survie/page.tsx";
const lessonPath = "app/yo/langues/francais-quebec/module-1/lecon-3/page.tsx";
const primitivePath = "components/yo/YoInteractiveLessonPrimitives.tsx";

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

assert.ok(existsSync(join(ROOT, manifestPath)), "printable manifest exists");
assert.ok(existsSync(join(ROOT, routePath)), "print-friendly route exists");

const manifest = read(manifestPath);
const route = read(routePath);
const lesson = read(lessonPath);
const primitive = read(primitivePath);

assert.match(manifest, /type: "print-route"/);
assert.match(manifest, /fr-qc-m1-l3-survival-kit/);
assert.match(manifest, /kit-de-survie/);
assert.doesNotMatch(manifest, /type: "pdf"/);

assert.match(route, /Kit de survie Pratiqo/);
assert.match(route, /YoPrintButton/);
assert.match(route, /@media print/);
assert.match(route, /Imprimer le kit|Print kit|Imprimir kit/);
assert.doesNotMatch(route, /\.pdf|download=/i, "do not fake a PDF download");

assert.match(primitive, /export function YoPrintableResourceCard/);
assert.match(primitive, /window\.print\(\)/);
assert.match(lesson, /YoPrintableResourceCard/);
assert.match(lesson, /Ouvrir le kit imprimable/);
assert.doesNotMatch(lesson, /<section[\s\S]{0,80}Kit de survie Pratiqo[\s\S]{800,}<\/section>/);

console.log("[yo:printable-resources] assertions passed");
