import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";

export const manifestPath="rive/yoppo-master/evidence/freeze-manifest.json";
export const hash = data => createHash("sha256").update(data).digest("hex");
export const frozenFiles = [
  "scripts/audit-yoppo-master.mjs", "scripts/measure-yoppo-geometry.mjs", "scripts/compare-yoppo-master.ts",
  "lib/companion/yoppoRigContract.ts", ".github/workflows/yoppo-rive-pilot-review.yml",
  "scripts/yoppo-reference-masks.mjs", "scripts/yoppo-component-metrics.ts", "scripts/yoppo-part-labels.json",
  "scripts/export-yoppo-part-labels.py", "scripts/render-yoppo-pilot.mjs", "scripts/check-yoppo-freeze.mjs",
  "scripts/yoppo-iteration-policy.mjs",
  "scripts/write-yoppo-freeze.ts", "rive/yoppo-master/evidence/reference-segmentation-proposal.json",
  "rive/yoppo-master/evidence/reference-segmentation-approval.json", ".gitattributes",
  "tests/companion/yoppoApprovedReference.test.ts", "tests/companion/yoppoGeometryDiagnostics.test.mjs",
  "tests/companion/yoppoIterationPolicy.test.mjs",
  "scripts/yoppo-capture-alpha.ts", "scripts/check-yoppo-capture.ts",
  "tests/companion/yoppoCaptureAlpha.test.ts",
  "rive/yoppo-transparency-probe/scene.rml", "rive/yoppo-transparency-probe/rive.yaml",
];
export function verifyFreeze() {
  const manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8"));
  assert.equal(manifest.branch,"feat/yoppo-rive-pilot-20261110");
  const branch=execFileSync("git",["branch","--show-current"],{encoding:"utf8"}).trim();
  assert.equal(branch || (process.env.GITHUB_ACTIONS ? process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME : ""),manifest.branch);
  execFileSync("git",["merge-base","--is-ancestor",manifest.freezeCommit,"HEAD"]);
  assert.deepEqual(Object.keys(manifest.files),frozenFiles);
  for(const file of frozenFiles) {
    assert.equal(hash(fs.readFileSync(file)),manifest.files[file],`Frozen file changed: ${file}`);
    assert.equal(hash(execFileSync("git",["show",`${manifest.freezeCommit}:${file}`])),manifest.files[file],`Freeze commit mismatch: ${file}`);
  }
  return manifest;
}
if(process.argv[1]?.replaceAll("\\","/").endsWith("/check-yoppo-freeze.mjs")) {
  verifyFreeze();
  console.log("Yoppo measurement freeze integrity: PASS");
}
