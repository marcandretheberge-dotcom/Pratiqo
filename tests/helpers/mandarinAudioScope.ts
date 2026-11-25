import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mandarinCourseAudio } from "../../lib/yo/audio/mandarinCourseAudio";
import tones from "../../lib/yo/mandarin/toneAssets.json";
import { validateMp3 } from "../../scripts/generate-yopratiqo-audio";

// The approved course retains v1 for rollback and adds v2, never replacements.
const registered = new Set([
  ...mandarinCourseAudio.flatMap(({ storagePath }) => [
    `public/audio/${storagePath}`,
    `public/audio/${storagePath.replace("/v2/", "/v1/")}`,
  ]),
  ...Object.values(tones).map(({ src }) => `public${src}`),
]);
const originalFiles = new Map<string, Set<string>>();

export function isRegisteredMandarinAudioAddition(
  file: string,
  originals: ReadonlySet<string>,
): boolean {
  return registered.has(file) && !originals.has(file);
}

export function hasOnlyMandarinAudioAddition(
  file: string,
  base: string,
): boolean {
  if (!registered.has(file)) return false;
  try {
    if (!originalFiles.has(base)) {
      originalFiles.set(
        base,
        new Set(
          execFileSync(
            "git",
            ["ls-tree", "-r", "--name-only", base, "--", "public/audio"],
            { encoding: "utf8" },
          )
            .split(/\r?\n/)
            .filter(Boolean),
        ),
      );
    }
    return (
      isRegisteredMandarinAudioAddition(file, originalFiles.get(base)!) &&
      validateMp3(readFileSync(file)).durationSeconds > 0.2
    );
  } catch {
    return false;
  }
}
