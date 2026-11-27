// Compact exact-text index only. Provider provenance stays in the separate manifest.
import index from "./italianInterestIndex.json";

const prefix = "/audio/yo/italian-interests/v1/";
const hashes: Readonly<Record<string, string>> = index;
const validHash = /^[a-f0-9]{64}$/;
const paths: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(hashes)
    .filter(([, hash]) => validHash.test(hash))
    .map(([text, hash]) => [text, `${prefix}${hash}.mp3`]),
);
const publishedPaths = new Set(Object.values(paths));

/** Only repository-backed recordings in the selected Violetta edition are local audio. */
export function isPublishedItalianInterestAudioPath(path: string): boolean {
  return publishedPaths.has(path);
}

/** Match the exact authored Italian text; no approximation of nouns or numbers. */
export function italianInterestAudioPaths(): Readonly<Record<string, string>> {
  return paths;
}
