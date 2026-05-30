/**
 * YoPratiqo — accent profiles for pre-generated audio.
 *
 * Why this file:
 *
 * Phase 1 generated audio with a single global voice/instruction. As we
 * add more lesson content (Dominican Republic dictionary + dialogue,
 * Quebec French pre-arrival intro, future Puerto Rico / Uruguay
 * modules), learners benefit when the recording sounds like the
 * country they're studying.
 *
 * Important caveats — codified here so the docs and the generator
 * carry the same disclaimer:
 *
 *   1. OpenAI TTS is BEST-EFFORT for regional accents. The
 *      `instructions` field steers prosody / phrasing but does not
 *      guarantee a perfect native accent.
 *   2. We never claim "native [country] speaker." UI copy, marketing,
 *      and tests must avoid that wording.
 *   3. We only generate accent variants where it is pedagogically
 *      relevant (local expressions, country-specific dialogue lines).
 *      Pan-Hispanic vocabulary (e.g. "Buenos días", "Gracias") falls
 *      back to the latin_american_neutral profile — the same MP3 is
 *      reused across modules to keep the bucket lean.
 *
 * Profile scope:
 *   - Spanish profiles cover the existing `intro-a1` and `voyage / RD`
 *     modules.
 *   - `quebec_french` covers the Quebec / francisation module
 *     (`francais-quebec-intro`). Adding more French variants (Parisian,
 *     African, etc.) is OUT OF SCOPE for the launch and must not be
 *     added here speculatively.
 *
 * No client component imports this file directly today; it is consumed
 * by:
 *   - `lib/yo/audio/audioManifest.ts` (typed default selection per item)
 *   - `scripts/generate-yopratiqo-audio.ts` (passes `instructions` into
 *     OpenAI's `/v1/audio/speech` call when supported by the model)
 *
 * Adding a new profile: append to `YO_AUDIO_ACCENT_PROFILES` below;
 * `tests/yo/yopratiqoAudio.test.ts` enforces that every manifest item
 * references a known profile id.
 */

/**
 * Closed union of accent profile ids. Adding a value here is a
 * compile-time switch every consumer must handle.
 */
export type YoAudioAccentProfileId =
  | "latin_american_neutral"
  | "dominican_republic"
  | "puerto_rico"
  | "rioplatense_uruguay"
  | "spain_neutral"
  | "quebec_french";

export interface YoAudioAccentProfile {
  id: YoAudioAccentProfileId;
  /**
   * Path-safe slug used inside the Supabase Storage object key when a
   * manifest item opts into the accent-aware path layout. Stays
   * lowercase ASCII with hyphens (no underscores) so it lines up with
   * the rest of the storage path convention.
   */
  pathSlug: string;
  /**
   * Human-readable label, mainly for dry-run logs and tests. We
   * intentionally do not localize this — it's an internal generator
   * detail, never rendered in the lesson UI.
   */
  label: string;
  /**
   * `instructions` text passed to OpenAI's `/v1/audio/speech`
   * `instructions` field (when the model supports it — currently
   * `gpt-4o-mini-tts` and similar). Phrased to favour clarity over
   * dramatic regional features so beginner learners stay comfortable.
   */
  ttsInstructions: string;
  /**
   * Default OpenAI voice id used for this profile. Picked per
   * accent so generations sound coherent without changing the
   * generator's defaults. Override at runtime via the
   * `YOPRATIQO_TTS_VOICE` env var.
   */
  defaultVoice: string;
  /**
   * Optional BCP-47 hint a learner-facing surface can show next to
   * the audio player (e.g. "es-DO"). Phase 2 reserved.
   */
  bcp47Hint?: string;
}

/**
 * Default profile — used when an item omits `accentProfile`. Keeping
 * the default explicit avoids accidentally promoting a regional
 * variant for general intro content.
 */
export const YO_AUDIO_DEFAULT_ACCENT_PROFILE: YoAudioAccentProfileId =
  "latin_american_neutral";

const PROFILES: Record<YoAudioAccentProfileId, YoAudioAccentProfile> = {
  latin_american_neutral: {
    id: "latin_american_neutral",
    pathSlug: "latin-american-neutral",
    label: "Latin American (neutral)",
    ttsInstructions:
      "Speak in clear, friendly Latin American Spanish for beginner learners. Use a natural pace, neutral pronunciation, and warm tone. Do not exaggerate any specific country accent.",
    defaultVoice: "alloy",
    bcp47Hint: "es-419",
  },
  dominican_republic: {
    id: "dominican_republic",
    pathSlug: "dominican-republic",
    label: "Dominican Republic",
    ttsInstructions:
      "Speak in clear Dominican Republic Spanish with a light Caribbean rhythm. Keep pronunciation understandable for beginner learners. Do not exaggerate slang, do not drop syllables, do not speed up.",
    defaultVoice: "alloy",
    bcp47Hint: "es-DO",
  },
  puerto_rico: {
    id: "puerto_rico",
    pathSlug: "puerto-rico",
    label: "Puerto Rico",
    ttsInstructions:
      "Speak in clear Puerto Rican Spanish with a light Caribbean rhythm. Keep it understandable for beginner learners. Do not exaggerate regional features or speed up.",
    defaultVoice: "alloy",
    bcp47Hint: "es-PR",
  },
  rioplatense_uruguay: {
    id: "rioplatense_uruguay",
    pathSlug: "rioplatense-uruguay",
    label: "Rioplatense (Uruguay)",
    ttsInstructions:
      "Speak in clear Uruguayan Rioplatense Spanish with natural intonation. Keep it understandable for beginner learners. Do not overdo regional features such as the sh-sound for ll/y.",
    defaultVoice: "alloy",
    bcp47Hint: "es-UY",
  },
  spain_neutral: {
    id: "spain_neutral",
    pathSlug: "spain-neutral",
    label: "Spain (neutral European Spanish)",
    ttsInstructions:
      "Speak in clear European Spanish from Spain, beginner-friendly and natural. Keep distincion (z and soft c as a th-like sound) but stay easy to follow.",
    defaultVoice: "alloy",
    bcp47Hint: "es-ES",
  },
  quebec_french: {
    id: "quebec_french",
    pathSlug: "quebec-french",
    label: "Quebec French",
    ttsInstructions:
      "Speak in clear, friendly Quebec French for beginner learners. Use a natural but slightly slower pace. Keep pronunciation understandable for newcomers. Do not exaggerate slang or caricature the accent.",
    defaultVoice: "alloy",
    bcp47Hint: "fr-CA",
  },
};

export const YO_AUDIO_ACCENT_PROFILES: readonly YoAudioAccentProfile[] =
  Object.values(PROFILES);

/**
 * Lookup helper. Throws when `id` is not registered — so a typo in the
 * manifest fails the generator pre-flight rather than silently
 * substituting the default profile.
 */
export function getYoAudioAccentProfile(
  id: YoAudioAccentProfileId,
): YoAudioAccentProfile {
  const profile = PROFILES[id];
  if (!profile) {
    throw new Error(`Unknown YoPratiqo audio accent profile: ${id}`);
  }
  return profile;
}
