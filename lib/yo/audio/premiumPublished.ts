import published from "./premiumPublished.json";

/** Entries are written only after generation, exact transcript validation,
 * upload and a matching public MP3 hash. A recording plan is never imported here. */
export type PremiumPublishedRecording = {
  locale: string;
  text: string;
  storagePath: string;
  model: string;
  voice: string;
  sha256: string;
  requestHash: string;
  seconds: number;
  verifiedAt: string;
};
const recordings: readonly PremiumPublishedRecording[] = published;
export function publishedPremiumAudioPath(locale: string, text: string): string | undefined {
  return recordings.find((item) => item.locale === locale && item.text === text.normalize("NFC").trim())?.storagePath;
}
