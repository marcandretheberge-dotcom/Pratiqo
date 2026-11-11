import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import sharp from "sharp";

export const APPROVAL_PATH = "rive/yoppo-master/evidence/reference-segmentation-approval.json";
export const hashBytes = bytes => createHash("sha256").update(bytes).digest("hex");

export async function loadApprovedReference() {
  const approvalBytes = fs.readFileSync(APPROVAL_PATH);
  const approval = JSON.parse(approvalBytes);
  assert.equal(approval.status, "APPROVED_REFERENCE_NOT_APPROVED_RENDER");
  assert.deepEqual(approval.junctions, ["A", "B", "C"]);
  const proposalBytes = fs.readFileSync(approval.proposal);
  assert.equal(hashBytes(proposalBytes), approval.proposalSha256, "reviewed proposal changed after approval");
  const proposal = JSON.parse(proposalBytes);
  assert.equal(hashBytes(fs.readFileSync(proposal.source)), approval.sourceSha256, "canonical PNG changed");
  assert.equal(proposal.sourceSha256, approval.sourceSha256);
  const paths = Object.fromEntries([...proposal.parts, ...proposal.accessories].map(part => [part.id, part.path]));
  const masks = {};
  for (const part of proposal.parts) {
    const exclusions = (part.excludedReviewParts ?? []).map(id => {
      assert.ok(paths[id], `Unknown excluded part ${id}`);
      return `<path d="${paths[id]}" fill="black"/>`;
    }).join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500"><rect width="500" height="500" fill="black"/><path d="${part.path}" fill="white"/>${exclusions}</svg>`;
    const { data, info } = await sharp(Buffer.from(svg)).toColourspace("srgb").removeAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.deepEqual([info.width, info.height, info.channels], [500, 500, 3]);
    masks[part.id] = Uint8Array.from({ length: 250000 }, (_, index) => data[index * 3] >= 128 ? 1 : 0);
  }
  return { proposal, masks, approval: {
    path: APPROVAL_PATH,
    sha256: hashBytes(approvalBytes),
    proposalSha256: approval.proposalSha256,
    sourceSha256: approval.sourceSha256,
    maskRule: "Approved visible ownership envelopes rasterized with libvips SVG; membership >=128. Applied to reference only, never to restrict rendered geometry.",
    maskHashes: Object.fromEntries(Object.entries(masks).map(([name, mask]) => [name, hashBytes(mask)])),
  } };
}
