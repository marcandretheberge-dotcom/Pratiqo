/**
 * YoPratiqo — Quebec French intro audio manifest (quebec_french).
 *
 * Powers the audio buttons on `/yo/langues/francais-quebec/intro`. Items
 * here use a Quebec French accent profile so a future learner clicking
 * the speaker icon next to "le Québec" or "Ça va-tu ?" hears a
 * Canadian French rendering rather than a Parisian one.
 *
 * Storage layout (accent-aware, mirrors the Spanish `reading-first-text`
 * lesson convention):
 *
 *   yo/fr/francais-quebec-intro/pre-arrival-intro/quebec-french/<type>/<slug>.mp3
 *
 * Item ids follow the same pattern as the Spanish files:
 *
 *   fr-fqi-<type>-<slug>
 *
 * (`fqi` = `francais-quebec-intro`, kept short so logs stay readable.)
 *
 * The page reads these items via `findAudioItemForContext` with
 * `accentProfile: "quebec_french"`, so adding a new survival word
 * here + running `npm run generate:yopratiqo-audio` is enough to
 * power the audio button — no UI change required.
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

const ACCENT = getYoAudioAccentProfile("quebec_french");
const MODULE_ID = "francais-quebec-intro" as const;
const LESSON_ID = "pre-arrival-intro" as const;
const TARGET_LANGUAGE = "fr" as const;

function frQcItem(input: {
  type: Extract<YoAudioItemType, "word" | "phrase" | "sentence">;
  text: string;
  /** Override the auto-derived slug (e.g. for very long phrases). */
  slug?: string;
  notes?: string;
}): YoAudioItem {
  const slug = input.slug ?? buildAudioSlug(input.text);
  return {
    id: `fr-fqi-${input.type}-${slug}`,
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
// Survival vocabulary — the 19 words/phrases the intro renders in the
// "First survival words" section. These are the highest-priority items
// because they are the page's primary audio surface.
// ─────────────────────────────────────────────────────────────────────

const survivalItems: readonly YoAudioItem[] = [
  // Quebec identity
  frQcItem({ type: "word", text: "le Québec" }),
  frQcItem({ type: "word", text: "francophone" }),
  frQcItem({
    type: "word",
    text: "Bienvenue",
    notes: "In Quebec also serves as the reply to 'Merci'.",
  }),
  // Greetings
  frQcItem({ type: "word", text: "Salut" }),
  frQcItem({
    type: "phrase",
    text: "Ça va-tu ?",
    slug: "ca-va-tu",
    notes: "Quebec interrogative particle '-tu' — not the pronoun.",
  }),
  frQcItem({
    type: "phrase",
    text: "Pas pire",
    notes: "Idiomatic Quebec reply to 'Ça va-tu ?'.",
  }),
  // Daily Quebec words
  frQcItem({ type: "word", text: "un char" }),
  frQcItem({ type: "word", text: "la job" }),
  frQcItem({ type: "word", text: "frette" }),
  frQcItem({
    type: "phrase",
    text: "la fin de semaine",
    slug: "la-fin-de-semaine",
  }),
  // Meals (the classic Quebec ↔ France flip)
  frQcItem({ type: "word", text: "le déjeuner" }),
  frQcItem({ type: "word", text: "le dîner" }),
  frQcItem({ type: "word", text: "le souper" }),
  // Relationships
  frQcItem({ type: "phrase", text: "mon chum" }),
  frQcItem({ type: "phrase", text: "ma blonde" }),
  // Winter
  frQcItem({ type: "word", text: "la tuque" }),
  frQcItem({ type: "phrase", text: "les mitaines" }),
  // Bureaucracy
  frQcItem({
    type: "word",
    text: "la RAMQ",
    slug: "la-ramq",
    notes: "Régie de l'assurance maladie du Québec — read as the acronym.",
  }),
  frQcItem({
    type: "phrase",
    text: "la carte soleil",
    slug: "la-carte-soleil",
  }),
];

// ─────────────────────────────────────────────────────────────────────
// Bonus phrases — strings the page surfaces verbatim somewhere learners
// can hover/click. Kept very small on purpose so we don't generate
// audio for prose paragraphs the page does not pronounce.
// ─────────────────────────────────────────────────────────────────────

const bonusPhrases: readonly YoAudioItem[] = [
  frQcItem({
    type: "phrase",
    text: "Bonjour",
    notes: "Greeting recommended in Quebec shops on entry.",
  }),
];

export const frenchQuebecIntroAudio: readonly YoAudioItem[] = [
  ...survivalItems,
  ...bonusPhrases,
];
