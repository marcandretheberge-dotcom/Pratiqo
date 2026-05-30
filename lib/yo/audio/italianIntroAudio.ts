/**
 * YoPratiqo — Italian intro audio manifest (italian_standard).
 *
 * Powers the audio buttons on `/yo/langues/italien/intro`. Items here
 * use a standard-Italian accent profile so a learner clicking the
 * speaker icon next to "il dialetto" or "Quanto costa?" hears a
 * neutral / mainstream Italian rendering rather than a regional one.
 *
 * Storage layout (accent-aware, mirrors the Quebec French module
 * convention):
 *
 *   yo/it/italian-intro/intro/italian-standard/<type>/<slug>.mp3
 *
 * Item ids follow the same shape as the other modules:
 *
 *   it-iti-<type>-<slug>
 *
 * (`iti` = `italian-intro`, kept short so logs stay readable.)
 *
 * The page reads these items via `findAudioItemForContext` with
 * `accentProfile: "italian_standard"`, so adding a new word here +
 * running `npm run generate:yopratiqo-audio` is enough to power the
 * audio button — no UI change required.
 *
 * Regional Italian (Tuscan, Sicilian, Roman, Neapolitan, etc.) is
 * intentionally OUT OF SCOPE — see `lib/yo/audio/accentProfiles.ts`.
 *
 * No Stripe / Supabase / RLS / migrations / search / booking / Membre
 * Pro logic in this file. Pure data.
 */

import {
  buildAudioSlug,
  buildStoragePath,
  type YoAudioItem,
  type YoAudioItemType,
} from "@/lib/yo/audio/audioManifest.types-internal";
import { getYoAudioAccentProfile } from "@/lib/yo/audio/accentProfiles";

const ACCENT = getYoAudioAccentProfile("italian_standard");
const MODULE_ID = "italian-intro" as const;
const LESSON_ID = "intro" as const;
const TARGET_LANGUAGE = "it" as const;

function itItem(input: {
  type: Extract<YoAudioItemType, "word" | "phrase" | "sentence">;
  text: string;
  /** Override the auto-derived slug (e.g. for very long phrases). */
  slug?: string;
  notes?: string;
}): YoAudioItem {
  const slug = input.slug ?? buildAudioSlug(input.text);
  return {
    id: `it-iti-${input.type}-${slug}`,
    targetLanguage: TARGET_LANGUAGE,
    moduleId: MODULE_ID,
    lessonId: LESSON_ID,
    type: input.type,
    text: input.text,
    storagePath: buildStoragePath({
      targetLanguage: TARGET_LANGUAGE,
      moduleId: MODULE_ID,
      lessonId: LESSON_ID,
      type: input.type,
      slug,
      accentSegment: ACCENT.pathSlug,
    }),
    accentProfile: ACCENT.id,
    notes: input.notes,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Anchor vocabulary — words used in the explanatory sections (1-5).
// "Il mondo / la lingua / parlare / il paese / milioni" anchor the
// "Italian in numbers" + "Where does Italian come from?" panels.
// ─────────────────────────────────────────────────────────────────────

const anchorWords: readonly YoAudioItem[] = [
  itItem({ type: "word", text: "il mondo" }),
  itItem({ type: "word", text: "la lingua" }),
  itItem({ type: "word", text: "parlare" }),
  itItem({ type: "word", text: "il paese" }),
  itItem({ type: "word", text: "milioni" }),
  itItem({ type: "word", text: "la storia" }),
  itItem({ type: "word", text: "il latino" }),
  itItem({ type: "word", text: "la parola" }),
  itItem({ type: "word", text: "il dialetto" }),
  itItem({ type: "word", text: "la regione" }),
  itItem({ type: "word", text: "la città" }),
  itItem({ type: "word", text: "il nord" }),
  itItem({ type: "word", text: "il centro" }),
  itItem({ type: "word", text: "il sud" }),
  itItem({ type: "word", text: "diverso" }),
  itItem({ type: "word", text: "uguale" }),
  itItem({
    type: "word",
    text: "l’accento",
    slug: "l-accento",
    notes:
      "Curly apostrophe in display form; slug uses ASCII hyphen so the storage path stays portable.",
  }),
];

// ─────────────────────────────────────────────────────────────────────
// First survival expressions — the "Tes premiers mots" surface. These
// are the items learners click most, so coverage MUST stay 100%.
// ─────────────────────────────────────────────────────────────────────

const firstWords: readonly YoAudioItem[] = [
  itItem({ type: "word", text: "Ciao" }),
  itItem({ type: "word", text: "Buongiorno" }),
  itItem({ type: "word", text: "Buonasera" }),
  itItem({ type: "word", text: "Buonanotte" }),
  itItem({ type: "word", text: "Grazie" }),
  itItem({
    type: "word",
    text: "Prego",
    notes:
      "Multipurpose courtesy word — used for 'you're welcome', 'please go ahead', and 'how can I help'.",
  }),
  itItem({
    type: "phrase",
    text: "Per favore",
    slug: "per-favore",
  }),
  itItem({
    type: "word",
    text: "Scusi",
    notes: "Formal 'excuse me' (Lei form).",
  }),
  itItem({
    type: "word",
    text: "Scusa",
    notes: "Informal 'excuse me' (tu form).",
  }),
  itItem({
    type: "phrase",
    text: "Dove?",
    slug: "dove",
  }),
  itItem({
    type: "phrase",
    text: "Quanto costa?",
    slug: "quanto-costa",
  }),
  itItem({
    type: "phrase",
    text: "Vorrei",
    notes:
      "Polite 'I would like' — pairs with any noun (un caffè, un biglietto, …).",
  }),
  itItem({
    type: "phrase",
    text: "Non capisco",
    slug: "non-capisco",
  }),
  itItem({
    type: "phrase",
    text: "Parla francese?",
    slug: "parla-francese",
  }),
  itItem({
    type: "phrase",
    text: "Parla inglese?",
    slug: "parla-inglese",
  }),
];

export const italianIntroAudio: readonly YoAudioItem[] = [
  ...anchorWords,
  ...firstWords,
];
