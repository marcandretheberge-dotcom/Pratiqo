// The browser needs exact text/path lookup, not every provider/provenance field.
import index from "./premiumIndex.json";

/** Entries require validated generated audio and a matching delivered MP3 hash:
 * public download for Storage objects, repository bytes for bundled files.
 * A recording plan is never imported here. */
export type PremiumPublishedRecording = {
  locale: string;
  text: string;
  storagePath: string;
  model: string;
  voice: string;
  sha256: string;
  /** The exact Realtime request hash, when that provider generated the source. */
  requestHash?: string;
  /** Original generated batch bytes for bundled recordings, not a fabricated request hash. */
  sourceBatchSha256?: string;
  seconds: number;
  verifiedAt: string;
  /** Transcript/format verification does not certify a native regional accent. */
  nativeAccentReviewed?: boolean;
};
const paths: Readonly<Record<string, Readonly<Record<string, string>>>> = index;
const localHashPattern = /^[a-f0-9]{64}$/;
const localPath = (locale: string, hash: string) => `/audio/yo/premium/${locale}/${hash}.mp3`;
const publishedLocalPaths = new Set(Object.entries(paths).flatMap(([locale, texts]) =>
  Object.values(texts).filter(value => localHashPattern.test(value)).map(hash => localPath(locale, hash))));

/** Only canonical paths backed by the reviewed registry may use local delivery. */
export function isPublishedPremiumLocalAudioPath(path: string): boolean {
  return publishedLocalPaths.has(path);
}

export function publishedPremiumAudioPath(locale: string, text: string): string | undefined {
  if (!Object.hasOwn(paths, locale)) return undefined;
  const texts = paths[locale], key = text.normalize("NFC").trim();
  if (!Object.hasOwn(texts, key)) return undefined;
  const value = texts[key];
  return localHashPattern.test(value) ? localPath(locale, value) : value;
}
