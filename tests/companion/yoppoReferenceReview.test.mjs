import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const run = spawnSync(process.execPath, ["scripts/prepare-yoppo-reference-review.mjs"], { encoding: "utf8", timeout: 30000 });
assert.ifError(run.error);
assert.equal(run.status, 0, run.stderr);
const proposal = JSON.parse(fs.readFileSync("rive/yoppo-master/evidence/reference-segmentation-proposal.json", "utf8"));
const expected = ["headCream", "spikes", "earLeft", "earRight", "eyeLeft", "eyeRight", "torso", "armLeft", "armRight", "footLeft", "footRight", "backpack", "mouthInk", "chestEmblem"];
assert.deepEqual(proposal.parts.map(part => part.id), expected);
assert.equal(proposal.measurementIntegration, false);
assert.equal(proposal.status, "VISUAL REVIEW PENDING HUMAN REVIEW");
assert.deepEqual(proposal.junctions.map(junction => junction.id), ["A", "B", "C"]);
for (const part of proposal.parts) {
  const [x, y, width, height] = part.crop;
  assert.ok(x >= 0 && y >= 0 && width > 0 && height > 0 && x + width <= 500 && y + height <= 500, part.id);
  assert.ok(part.note && part.uncertainty);
}

const require = createRequire(import.meta.url);
const playwright = require(process.argv[2] || "playwright");
const output = path.resolve(".qa-guided/yoppo-pilot/reference-review");
const browser = await playwright.chromium.launch({ headless: true, ...(process.argv[3] ? { channel: process.argv[3] } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
  const network = [];
  const errors = [];
  page.on("request", request => { if (/^https?:/.test(request.url())) network.push(request.url()); });
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(pathToFileURL(path.join(output, "index.html")).href);
  assert.equal(await page.locator(".piece").count(), 14);
  assert.equal(await page.locator(".junction").count(), 3);
  await page.locator("#overview").screenshot({ path: path.join(output, "reference-overview.png") });
  await page.locator("#junctions").screenshot({ path: path.join(output, "reference-junctions.png") });
  await page.locator("#parts").screenshot({ path: path.join(output, "reference-parts.png") });

  await page.getByLabel("Repères", { exact: true }).uncheck();
  const original = await page.locator(".columns figure").nth(0).locator("svg").screenshot();
  const annotationHidden = await page.locator(".columns figure").nth(1).locator("svg").screenshot();
  assert.deepEqual(annotationHidden, original, "with annotations hidden, the rendered PNGs must be pixel-identical");
  await page.getByLabel("Repères", { exact: true }).check();
  assert.equal(await page.locator("#annotations").evaluate(node => getComputedStyle(node).display), "inline");
  const responsive = [];
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `horizontal overflow at ${width}`);
    assert.equal(await page.locator(".legend-item").count(), 14);
    responsive.push({ width, horizontalOverflow: false, parts: 14 });
    if (width === 390) await page.locator("#overview").screenshot({ path: path.join(output, "reference-mobile.png") });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.ok(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches));
  assert.deepEqual(network, [], "the review must work without external requests");
  assert.deepEqual(errors, []);
  const result = { status: "PASS", originalRenderedPixelsIdenticalWhenAnnotationsHidden: true, externalRequests: 0, pageErrors: [], responsive, humanApproval: "PENDING", measurementGateStatus: "UNCHANGED / BLOCKED" };
  fs.writeFileSync(path.join(output, "browser-verification.json"), JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
