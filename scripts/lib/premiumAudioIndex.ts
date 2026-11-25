import type { PremiumPublishedRecording } from "../../lib/yo/audio/premiumPublished";

/** Derive the small public lookup from the reviewed, richer publication ledger. */
export function buildPremiumAudioIndex(recordings: readonly PremiumPublishedRecording[]) {
  const index: Record<string, Record<string, string>> = Object.create(null);
  const locales = new Set(["en-CA", "fr-CA", "es-MX", "es-419", "it-IT", "de-DE", "pt-BR", "ja-JP", "zh-CN"]);
  for (const recording of recordings) {
    const { locale, storagePath, sha256 } = recording;
    const text = recording.text.normalize("NFC").trim();
    if (!locales.has(locale) || !text || !/^[a-f0-9]{64}$/.test(sha256)) throw new Error("Invalid published recording.");
    const local = storagePath.startsWith("/audio/yo/premium/");
    if (local ? storagePath !== `/audio/yo/premium/${locale}/${sha256}.mp3` : !/^yo\/[a-z0-9/_-]+\.mp3$/.test(storagePath)) {
      throw new Error("Unverified recording path cannot enter the public index.");
    }
    const texts = index[locale] ??= Object.create(null);
    if (Object.hasOwn(texts, text)) throw new Error("Duplicate published recording.");
    texts[text] = local ? sha256 : storagePath;
  }
  return index;
}
