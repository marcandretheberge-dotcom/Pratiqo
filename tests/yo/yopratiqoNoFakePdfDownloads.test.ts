import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { yoPrintableResources } from "../../lib/yo/printableResources";

const ROOT = process.cwd();

const registeredPdfResources = yoPrintableResources.filter((resource) => resource.type === "pdf");
assert.equal(
  registeredPdfResources.length,
  0,
  "No PDF resources should be registered until real PDF assets exist",
);

for (const resource of yoPrintableResources) {
  assert.equal(resource.type, "print-route", `${resource.id} uses print-route while no PDFs exist`);
  assert.doesNotMatch(resource.href, /\.pdf(?:$|\?)/i, `${resource.id} must not point to a PDF`);
  assert.doesNotMatch(resource.href, /download/i, `${resource.id} must not use download wording in href`);
}

const possiblePdfPaths = yoPrintableResources
  .filter((resource) => resource.href.toLowerCase().endsWith(".pdf"))
  .map((resource) => join(ROOT, "public", resource.href.replace(/^\//, "")));

for (const pdfPath of possiblePdfPaths) {
  assert.ok(existsSync(pdfPath), `PDF asset exists: ${pdfPath}`);
}

console.log("[yo:no-fake-pdf-downloads] assertions passed");
