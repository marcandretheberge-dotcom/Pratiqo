import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const evidenceRoot = path.join(root, ".qa-guided/yoppo-pilot");
fs.mkdirSync(evidenceRoot, { recursive: true });
const scratch = fs.mkdtempSync(path.join(evidenceRoot, "regression-"));
const geometryPath = path.join(scratch, "canonical.json");
const annotationPath = path.join(scratch, "canonical.png");
const source = "public/companion/travel/companion-travel-idle.png";
const hash = () => createHash("sha256").update(fs.readFileSync(source)).digest("hex");
const originalHash = hash();
const components = ["headCream", "spikes", "earLeft", "earRight", "eyeLeft", "eyeRight", "torso", "armLeft", "armRight", "footLeft", "footRight", "backpack", "mouthInk", "chestEmblem"];

const run = spawnSync(process.execPath, ["scripts/measure-yoppo-geometry.mjs", geometryPath, annotationPath], { cwd: root, encoding: "utf8", timeout: 120000 });
assert.ifError(run.error);
assert.ok(fs.existsSync(geometryPath), "diagnostics must survive a failed measurement");
assert.ok(fs.statSync(annotationPath).size > 0, "annotation must survive a failed measurement");
const audit = JSON.parse(fs.readFileSync(geometryPath, "utf8"));
assert.deepEqual(Object.keys(audit.regions), components);
assert.equal(audit.classificationReview, "VISUAL REVIEW PENDING HUMAN REVIEW");
assert.equal(run.status, audit.valid ? 0 : 1, "invalid evidence must never turn the actual gate green");
assert.deepEqual(audit.failures, Object.values(audit.regions).flatMap(region => region.failures));
assert.equal(audit.valid, audit.failures.length === 0);
for (const [name, region] of Object.entries(audit.regions)) {
  assert.equal(region.valid, region.failures.length === 0, name);
  assert.ok(region.roiExpansionHistory.length <= 3, name);
  let previous = region.initialRoi;
  for (const [i, expansion] of region.roiExpansionHistory.entries()) {
    assert.deepEqual(expansion.before, previous, name);
    assert.equal(expansion.expansionNumber, i + 1);
    assert.equal(expansion.stepPx, 12);
    assert.equal(expansion.reason, "measurement-touched-roi-edge");
    const x = expansion.touched.includes("left") ? Math.max(0, previous.x - 12) : previous.x;
    const y = expansion.touched.includes("top") ? Math.max(0, previous.y - 12) : previous.y;
    const right = expansion.touched.includes("right") ? Math.min(audit.sourceSize.width, previous.x + previous.w + 12) : previous.x + previous.w;
    const bottom = expansion.touched.includes("bottom") ? Math.min(audit.sourceSize.height, previous.y + previous.h + 12) : previous.y + previous.h;
    assert.deepEqual(expansion.after, { x, y, w: right - x, h: bottom - y }, name);
    previous = expansion.after;
  }
  assert.deepEqual(region.roi, previous, name);
  if (region.valid) assert.ok(!Object.values(region.touchesRoiEdge).some(Boolean), name);
}
assert.equal(hash(), originalHash, "measurement must not alter the canonical asset");

function rejectBeforeOpeningRender(input, expectedError) {
  const fixture = path.join(scratch, "invalid.json");
  fs.writeFileSync(fixture, JSON.stringify(input));
  const result = spawnSync(process.execPath, ["--import", "tsx", "scripts/compare-yoppo-master.ts", path.join(scratch, "must-not-be-read.png"), fixture], { cwd: root, encoding: "utf8", timeout: 30000 });
  assert.ifError(result.error);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, expectedError);
  assert.doesNotMatch(result.stderr, /Input file is missing/);
}

rejectBeforeOpeningRender({ ...audit, valid: false }, /Canonical geometry audit is invalid/);
rejectBeforeOpeningRender({ valid: true, regions: {} }, /expected all 14 measured component regions/);
const clipped = {
  valid: true,
  regions: Object.fromEntries(Object.entries(audit.regions).map(([name, region]) => [name, {
    ...region, valid: true, touchesRoiEdge: { left: name === "headCream", right: false, top: false, bottom: false },
  }])),
};
rejectBeforeOpeningRender(clipped, /Canonical geometry measurements still touch ROI edges/);
console.log("Yoppo measurement diagnostics: evidence, all regions, exact ROI expansion, source preservation and fail-closed comparison: PASS");
