/**
 * YoPratiqo — pre-generated audio manifest.
 *
 * Single source of truth for every static MP3 we ship through Supabase
 * Storage. The same registry is consumed by:
 *
 *   - `scripts/generate-yopratiqo-audio.ts`  → reads `text` / `storagePath`,
 *     calls OpenAI's `/v1/audio/speech`, uploads MP3 to Supabase Storage.
 *     The script is the ONLY caller that touches `OPENAI_API_KEY` or the
 *     service-role key. It runs locally / from CI, never in the browser.
 *
 *   - `components/yo/YoAudioPlayer.tsx`      → reads `storagePath` and
 *     resolves it to the public Supabase Storage URL. Never touches a
 *     secret; the browser uses the project's anon URL only.
 *
 *   - `tests/yo/yopratiqoAudio.test.ts`      → asserts manifest stability
 *     (deterministic ids, ASCII-only paths, .mp3 suffix, no duplicates).
 *
 * Pedagogical scope (Phase 1):
 *   - FIXED lesson content only: vocabulary words, short phrases, and a
 *     dialogue line. Audio is generated once, then served as a static
 *     asset. Dynamic learner-typed text is intentionally out of scope —
 *     no live OpenAI TTS is wired into the UI.
 *
 * Bilingual contract:
 *   - YoPratiqo's UI is FR/EN; the language being TAUGHT here is Spanish
 *     (`targetLanguage: "es"`), so `text` stays a plain Spanish string.
 *     The manifest never assumes a French-only audience.
 *
 * Storage path convention (deterministic, ASCII-only, no spaces, no
 * accents — enforced by the path-builder helper below and by tests):
 *
 *     yo/<targetLanguage>/<moduleId>/<lessonId>/<type>/<slug>.mp3
 *
 *   e.g.  yo/es/intro-a1/universal-words/word/hola.mp3
 *         yo/es/voyage/republique-dominicaine/a1/lesson-01/phrase/me-llamo.mp3
 *
 * No Supabase / Stripe / payment / migration / RLS / booking / search /
 * teacher-dashboard logic in this file. Pure data + path helpers.
 */

import type { YoTargetLanguage } from "@/lib/yo/types";

// ─────────────────────────────────────────────────────────────────────
// Bucket + base path conventions (shared with the generator script and
// the AudioPlayer)
// ─────────────────────────────────────────────────────────────────────

/**
 * Public-read bucket name. Override at deploy time only via the
 * `YOPRATIQO_AUDIO_BUCKET` env var (read by the generator script);
 * the client uses this constant directly because the bucket name is
 * not a secret — only the service-role key is, and the browser never
 * sees it.
 */
export const YOPRATIQO_AUDIO_BUCKET_DEFAULT = "yopratiqo-audio" as const;

/** Top-level prefix every YoPratiqo audio object lives under. */
export const YOPRATIQO_AUDIO_ROOT_PREFIX = "yo" as const;

// ─────────────────────────────────────────────────────────────────────
// Item shape
// ─────────────────────────────────────────────────────────────────────

export type YoAudioItemType = "word" | "phrase" | "dialogue" | "instruction";

/**
 * A single audio object the generator must produce and the player can
 * reference. Every field except `voiceHint` is required — the generator
 * uses `text` as the TTS input and uploads the result at `storagePath`.
 */
export interface YoAudioItem {
  /**
   * Stable, globally-unique identifier. Convention:
   *   <targetLanguage>-<moduleId>-<type>-<slug>
   *
   * Stability rule: never rename — downstream Supabase rows / lesson
   * components address audio by `id`. If a word's text changes, allocate
   * a NEW id rather than mutating an existing one (so an in-flight cache
   * does not point to stale audio).
   */
  id: string;

  /** ISO 639-1 code of the language being TAUGHT (here always `es`). */
  targetLanguage: YoTargetLanguage;

  /** Module slug. ASCII-only, kebab-case (e.g. `intro-a1`, `voyage`). */
  moduleId: string;

  /** Lesson slug within the module. ASCII-only, kebab-case. */
  lessonId: string;

  type: YoAudioItemType;

  /** Plain Spanish text passed verbatim to the TTS engine. */
  text: string;

  /**
   * Deterministic Supabase Storage object path inside the bucket.
   * MUST end in `.mp3`, MUST contain no spaces / accents / uppercase.
   * Built by `buildStoragePath()` so the manifest stays self-consistent.
   */
  storagePath: string;

  /**
   * Optional BCP-47 hint for regional accent (e.g. `es-DO` for Dominican
   * Republic content). Phase 1 doesn't switch voice based on this — the
   * generator falls back to its global default voice — but the field is
   * recorded so we can split into `<region>/normal` and `<region>/slow`
   * variants later without renaming items.
   */
  voiceHint?: string;
}

// ─────────────────────────────────────────────────────────────────────
// Slug + path helpers (pure, exported so tests can assert invariants)
// ─────────────────────────────────────────────────────────────────────

/**
 * Convert a free-form Spanish phrase into a path-safe ASCII slug.
 * Removes accents (NFD + strip combining marks), lowercases, replaces
 * any run of non `[a-z0-9]` with `-`, trims leading/trailing dashes.
 */
export function buildAudioSlug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Build the canonical storage path for a manifest item. Kept pure so
 * `audioManifest.ts` is the single source of truth for the layout —
 * the generator and the AudioPlayer both call this rather than
 * concatenating strings inline.
 */
export function buildStoragePath(input: {
  targetLanguage: YoTargetLanguage;
  moduleId: string;
  lessonId: string;
  type: YoAudioItemType;
  slug: string;
}): string {
  const { targetLanguage, moduleId, lessonId, type, slug } = input;
  return `${YOPRATIQO_AUDIO_ROOT_PREFIX}/${targetLanguage}/${moduleId}/${lessonId}/${type}/${slug}.mp3`;
}

// ─────────────────────────────────────────────────────────────────────
// Phase 1 manifest — small, curated set
// ─────────────────────────────────────────────────────────────────────
//
// Scope chosen to match the "3 to 5 vocabulary words, 1 to 2 phrases,
// optionally 1 dialogue" budget in the project brief. All items are
// pan-Hispanic A1-safe except the final dialogue line which is a
// recognizable Dominican Republic greeting (used by the YoPratiqo
// Voyage / République dominicaine module). Adding more items later is
// purely additive — the generator is idempotent.
//
function defineWord(
  text: string,
  slugOverride?: string,
  voiceHint?: string,
): YoAudioItem {
  const slug = slugOverride ?? buildAudioSlug(text);
  return {
    id: `es-intro-a1-word-${slug}`,
    targetLanguage: "es",
    moduleId: "intro-a1",
    lessonId: "universal-words",
    type: "word",
    text,
    storagePath: buildStoragePath({
      targetLanguage: "es",
      moduleId: "intro-a1",
      lessonId: "universal-words",
      type: "word",
      slug,
    }),
    voiceHint,
  };
}

function definePhrase(
  text: string,
  slugOverride?: string,
  voiceHint?: string,
): YoAudioItem {
  const slug = slugOverride ?? buildAudioSlug(text);
  return {
    id: `es-intro-a1-phrase-${slug}`,
    targetLanguage: "es",
    moduleId: "intro-a1",
    lessonId: "universal-words",
    type: "phrase",
    text,
    storagePath: buildStoragePath({
      targetLanguage: "es",
      moduleId: "intro-a1",
      lessonId: "universal-words",
      type: "phrase",
      slug,
    }),
    voiceHint,
  };
}

function defineDialogue(input: {
  moduleId: string;
  lessonId: string;
  text: string;
  slug: string;
  voiceHint?: string;
}): YoAudioItem {
  return {
    id: `es-${input.moduleId}-dialogue-${input.slug}`,
    targetLanguage: "es",
    moduleId: input.moduleId,
    lessonId: input.lessonId,
    type: "dialogue",
    text: input.text,
    storagePath: buildStoragePath({
      targetLanguage: "es",
      moduleId: input.moduleId,
      lessonId: input.lessonId,
      type: "dialogue",
      slug: input.slug,
    }),
    voiceHint: input.voiceHint,
  };
}

export const YOPRATIQO_AUDIO_MANIFEST: readonly YoAudioItem[] = [
  // 5 universal Spanish words (pan-Hispanic A1-safe). Sourced from the
  // `universalWords` list in `lib/yo/spanishIntroA1.ts`. Slugs are stable
  // even if the manifest order changes.
  defineWord("Hola"),
  defineWord("Gracias"),
  defineWord("Por favor"),
  defineWord("Buenos días", "buenos-dias"),
  defineWord("Mucho gusto"),

  // 2 short phrases. We pass the *spoken* form to the TTS engine
  // (without UI-only ellipsis) so the generated MP3 reads naturally.
  definePhrase("¿Cómo estás?", "como-estas"),
  definePhrase("Me llamo", "me-llamo"),

  // 1 dialogue line — Dominican Republic greeting for the Voyage module.
  // Country-specific, so we record the regional hint without forcing
  // the generator's voice yet (Phase 1 uses the global default voice).
  defineDialogue({
    moduleId: "voyage",
    lessonId: "republique-dominicaine-a1-lesson-01",
    text: "¿Qué lo qué?",
    slug: "que-lo-que",
    voiceHint: "es-DO",
  }),
] as const;

// ─────────────────────────────────────────────────────────────────────
// Lookup helpers
// ─────────────────────────────────────────────────────────────────────

/**
 * Look up an audio item by its Spanish text (the form rendered in the
 * lesson UI). Comparison normalises whitespace + ellipsis so a UI
 * string like `"Me llamo…"` still matches `"Me llamo"` in the manifest.
 *
 * Returns `undefined` when no audio has been authored for the text yet
 * — callers MUST handle that path (the AudioPlayer falls back to a
 * disabled state, the lesson page falls back to the Web Speech button).
 */
export function findAudioItemByText(text: string): YoAudioItem | undefined {
  const needle = normaliseLookup(text);
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
