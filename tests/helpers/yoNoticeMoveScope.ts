import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

/** PR #434: only these reviewed before/after blobs may accompany the privacy copy.
 * No path-wide exception: one extra character or different base fails closed.
 */
export const reviewedYoNoticeMoves: Readonly<Record<string, readonly [string, string]>> = {
  "components/yo/italian/ItalianModuleAudio.tsx": ["a70316fa8ade00828324cb5c42a682a6747fd3c6", "0bc87da33f7bd242baae749c2cc48549796cae1d"],
  "components/yo/personalized/ItalianOnboarding.tsx": ["7465009fd753b9f86407855a60303823d0ff27f7", "24cf517da0c73b3fa05fbfc85296003bcc6848f8"],
  "components/yo/personalized/LearningAudio.tsx": ["66ded8f9ec60f06632d6d54f6ac7b501c91ccf60", "fc268644de50a9c412b7fa47a4cd50ab26ad8afe"],
};

export function isReviewedYoNoticeMove(file: string, beforeBlob: string, after: Buffer): boolean {
  if (!Object.prototype.hasOwnProperty.call(reviewedYoNoticeMoves, file)) return false;
  const [before, expected] = reviewedYoNoticeMoves[file];
  const actual = createHash("sha1").update(`blob ${after.length}\0`).update(after).digest("hex");
  return beforeBlob === before && actual === expected;
}

export function hasOnlyReviewedYoNoticeMove(file: string): boolean {
  if (!Object.prototype.hasOwnProperty.call(reviewedYoNoticeMoves, file)) return false;
  try {
    const base = execFileSync("git", ["merge-base", "HEAD", "origin/main"], { encoding: "utf8" }).trim();
    const before = execFileSync("git", ["rev-parse", `${base}:${file}`], { encoding: "utf8" }).trim();
    return isReviewedYoNoticeMove(file, before, readFileSync(file));
  } catch { return false; }
}
