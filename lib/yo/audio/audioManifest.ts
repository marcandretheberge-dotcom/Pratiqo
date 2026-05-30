/**
 * YoPratiqo — pre-generated audio manifest (aggregator).
 *
 * Single source of truth for every static MP3 we ship through Supabase
 * Storage. The same registry is consumed by:
 *
 *   - `scripts/generate-yopratiqo-audio.ts`  → reads `text` /
 *     `storagePath` / `ttsInstructions`, calls OpenAI's
 *     `/v1/audio/speech`, uploads MP3 to Supabase Storage. The script
 *     is the ONLY caller that touches a runtime OpenAI API key or the
 *     Supabase service-role key. It runs locally / from CI, never in
 *     the browser.
 *
 *   - `components/yo/YoAudioPlayer.tsx`      → reads `storagePath` and
 *     resolves it to the public Supabase Storage URL. Never touches a
 *     secret; the browser uses the project's anon URL only.
 *
 *   - `components/yo/YoSpanishAudioButton.tsx` → contextual lookup
 *     wrapper that prefers a pre-generated MP3 when available and
 *     falls back to `YoPronunciationButton` (Web Speech) otherwise.
 *
 *   - `tests/yo/yopratiqoAudio.test.ts` /
 *     `tests/yo/yopratiqoSpanishAudioCoverage.test.ts` → assert manifest
 *     stability (deterministic ids, ASCII-only paths, .mp3 suffix, no
 *     duplicates, complete accent metadata, coverage of current
 *     Spanish lesson content).
 *
 * Pedagogical scope:
 *   - FIXED lesson content only: vocabulary words, short phrases,
 *     reading sentences, and dialogue lines. Audio is generated once,
 *     then served as a static asset. Dynamic learner-typed text is
 *     intentionally out of scope — no live OpenAI TTS is wired into
 *     the UI.
 *
 * Bilingual contract:
 *   - YoPratiqo's UI is FR/EN; the language being TAUGHT here is
 *     Spanish (`targetLanguage: "es"`), so `text` stays a plain Spanish
 *     string. The manifest never assumes a French-only audience.
 *
 * Storage path convention (deterministic, ASCII-only, no spaces, no
 * accents — enforced by the path-builder helpers below and by tests):
 *
 *   - Phase 1 LEGACY layout (no accent segment, kept for backward
 *     compatibility with already-uploaded files):
 *
 *       yo/<targetLanguage>/<moduleId>/<lessonId>/<type>/<slug>.mp3
 *
 *   - Phase 2 ACCENT-AWARE layout (used by all NEW lessons):
 *
 *       yo/<targetLanguage>/<moduleId>/<lessonId>/<accentSlug>/<type>/<slug>.mp3
 *
 *   The accent segment is added per-lesson, not per-item, so a single
 *   lesson's MP3s stay grouped. Items always carry a typed
 *   `accentProfile` field — only the path layout differs.
 *
 * No Supabase / Stripe / payment / migration / RLS / booking / search /
 * teacher-dashboard logic in this file. Pure data + path helpers.
 */

import {
  YO_AUDIO_DEFAULT_ACCENT_PROFILE,
  type YoAudioAccentProfileId,
} from "@/lib/yo/audio/accentProfiles";
import {
  buildAudioSlug,
  buildLegacyStoragePath,
  buildStoragePath,
  YOPRATIQO_AUDIO_BUCKET_DEFAULT,
  YOPRATIQO_AUDIO_ROOT_PREFIX,
  type YoAudioItem,
  type YoAudioItemType,
} from "@/lib/yo/audio/audioManifest.types-internal";
import { spanishIntroAudio } from "@/lib/yo/audio/spanishIntroAudio";
import { spanishVoyageDominicanAudio } from "@/lib/yo/audio/spanishVoyageDominicanAudio";

// Re-export the public surface so existing callers
// (`@/lib/yo/audio/audioManifest`) keep working unchanged.
export {
  buildAudioSlug,
  buildLegacyStoragePath,
  buildStoragePath,
  YOPRATIQO_AUDIO_BUCKET_DEFAULT,
  YOPRATIQO_AUDIO_ROOT_PREFIX,
  YO_AUDIO_DEFAULT_ACCENT_PROFILE,
};
export type { YoAudioItem, YoAudioItemType };

// ─────────────────────────────────────────────────────────────────────
// Composed manifest
// ─────────────────────────────────────────────────────────────────────
//
// Splitting per-content-source keeps each data file readable and lets
// future locales (FR francisation, EN, JA) live next to their lesson
// data without bloating this aggregator. Order is meaningful: Phase 1
// entries come first so dry-run logs read top-down through the project's
// learning history.

export const YOPRATIQO_AUDIO_MANIFEST: readonly YoAudioItem[] = [
  ...spanishIntroAudio,
  ...spanishVoyageDominicanAudio,
] as const;

// ─────────────────────────────────────────────────────────────────────
// Lookup helpers
// ─────────────────────────────────────────────────────────────────────

/**
 * Contextual lookup. Prefer this over `findAudioItemByText` whenever
 * the caller knows the surrounding lesson — it handles the case where
 * the same Spanish text is recorded under multiple accent profiles
 * (e.g. a generic "Buenos días" in `latin_american_neutral` AND a
 * Caribbean-flavoured one in `dominican_republic`).
 *
 * Resolution order:
 *   1. Exact match on (moduleId, lessonId, type, normalised text,
 *      accentProfile).
 *   2. Match on (moduleId, normalised text, accentProfile) — handy when
 *      the lesson splits a single dialogue into multiple sub-lessons.
 *   3. Match on (normalised text, accentProfile) — same word, any
 *      module.
 *   4. Match on (normalised text, latin_american_neutral) — graceful
 *      degrade to the neutral baseline so a non-Caribbean module never
 *      breaks just because we did not ship every accent variant.
 *   5. Plain text match (any accent).
 *
 * Returns `undefined` only when nothing matches; callers MUST handle
 * that — the wrapper component falls back to Web Speech.
 */
export interface YoAudioLookupContext {
  text: string;
  moduleId?: string;
  lessonId?: string;
  type?: YoAudioItemType;
  accentProfile?: YoAudioAccentProfileId;
}

export function findAudioItemForContext(
  context: YoAudioLookupContext,
): YoAudioItem | undefined {
  const needle = normaliseLookup(context.text);
  if (!needle) return undefined;

  const sameText = YOPRATIQO_AUDIO_MANIFEST.filter(
    (item) => normaliseLookup(item.text) === needle,
  );
  if (sameText.length === 0) return undefined;

  const accent = context.accentProfile;

  if (context.moduleId && context.lessonId && context.type && accent) {
    const exact = sameText.find(
      (item) =>
        item.moduleId === context.moduleId &&
        item.lessonId === context.lessonId &&
        item.type === context.type &&
        item.accentProfile === accent,
    );
    if (exact) return exact;
  }

  if (context.moduleId && accent) {
    const moduleMatch = sameText.find(
      (item) =>
        item.moduleId === context.moduleId && item.accentProfile === accent,
    );
    if (moduleMatch) return moduleMatch;
  }

  if (accent) {
    const accentMatch = sameText.find(
      (item) => item.accentProfile === accent,
    );
    if (accentMatch) return accentMatch;

    const neutralFallback = sameText.find(
      (item) => item.accentProfile === YO_AUDIO_DEFAULT_ACCENT_PROFILE,
    );
    if (neutralFallback) return neutralFallback;
  }

  return sameText[0];
}

/**
 * Look up an audio item by its Spanish text (the form rendered in the
 * lesson UI). Kept for backward compatibility with the Phase 1 callers
 * — new code should prefer `findAudioItemForContext` so it can pick the
 * right accent variant when multiple exist.
 */
export function findAudioItemByText(text: string): YoAudioItem | undefined {
  const needle = normaliseLookup(text);
  if (!needle) return undefined;
  return YOPRATIQO_AUDIO_MANIFEST.find(
    (item) => normaliseLookup(item.text) === needle,
  );
}

export function findAudioItemById(id: string): YoAudioItem | undefined {
  return YOPRATIQO_AUDIO_MANIFEST.find((item) => item.id === id);
}

function normaliseLookup(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[…\u2026]+$/g, "") // trailing horizontal ellipsis (UI variant)
    .replace(/\.{3,}$/g, "")     // trailing ASCII ellipsis
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
