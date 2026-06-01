/**
 * YoPratiqo — Quebec French / Premium Module 1 · Lesson 1 audio.
 *
 * Powers the audio buttons rendered inside the Lesson 1 free preview
 * on `/yo/langues/francais-quebec/module-1`. Items here use the
 * Quebec French accent profile so a learner clicking the speaker
 * icon next to "Salut, ça va ?" or "À tantôt" hears a Canadian
 * French rendering rather than a Parisian one.
 *
 * Coverage (Lesson 1 "Arriver au travail et saluer naturellement"):
 *   - All 14 core phrases under `content.corePhrases[*].frQuebec`.
 *   - All distinct `frQuebec` lines from the 3 mini-dialogues
 *     (reception / colleague / team lead). The single overlap
 *     "Merci, c’est apprécié." reuses the core-phrase entry through
 *     `findAudioItemForContext` rather than duplicating the manifest
 *     entry.
 *
 * Storage layout (accent-aware, mirrors the Spanish + FR Quebec
 * intro convention):
 *
 *   yo/fr/fr-quebec-workplace-survival-1/arriver-saluer/quebec-french/<type>/<slug>.mp3
 *
 * Item ids follow the pattern:
 *
 *   fr-fqp-m1l1-<type>-<slug>
 *
 * `fqp` = `francais-quebec-premium` (distinct from the intro's `fqi`
 * prefix), `m1l1` = module 1 / lesson 1.
 *
 * The shell reads these items via `findAudioItemForContext` with
 * `accentProfile: "quebec_french"` and the canonical
 * (moduleId, lessonId) triple, so adding a new core phrase or
 * dialogue line + running `npm run generate:yopratiqo-audio` is
 * enough to power its audio button — no UI change required.
 *
 * Hard safety contract for this PR:
 *   - Pure data only. No runtime TTS, no OpenAI / Web Speech import.
 *   - No microphone, no MediaRecorder, no learner-data sharing.
 *   - No Stripe / Supabase / RLS / migrations / search / booking /
 *     Membre Pro logic in this file.
 *   - The MP3 generation script is the ONLY caller that touches a
 *     runtime OpenAI key; it runs offline, never in the browser.
 */

import {
  buildAudioSlug,
  buildStoragePath,
  type YoAudioItem,
  type YoAudioItemType,
} from "@/lib/yo/audio/audioManifest.types-internal";
import { getYoAudioAccentProfile } from "@/lib/yo/audio/accentProfiles";

const ACCENT = getYoAudioAccentProfile("quebec_french");
const MODULE_ID = "fr-quebec-workplace-survival-1" as const;
const LESSON_ID = "arriver-saluer" as const;
const TARGET_LANGUAGE = "fr" as const;
const ID_PREFIX = "fr-fqp-m1l1" as const;

type FrQuebecPremiumItemType = Extract<
  YoAudioItemType,
  "phrase" | "sentence"
>;

interface FrQuebecPremiumItemInput {
  type: FrQuebecPremiumItemType;
  text: string;
  /**
   * Override the auto-derived slug. Used for dialogue lines so the
   * item id stays short and deterministic even when the line is a
   * full multi-clause sentence.
   */
  slug?: string;
  notes?: string;
}

function frQcPremiumItem(input: FrQuebecPremiumItemInput): YoAudioItem {
  const slug = input.slug ?? buildAudioSlug(input.text);
  return {
    id: `${ID_PREFIX}-${input.type}-${slug}`,
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
    voiceHint: ACCENT.bcp47Hint,
    notes: input.notes,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Core phrases — Lesson 1 `content.corePhrases[*].frQuebec`
//
// Strings MUST stay in sync with `lib/yo/frQuebecWorkplaceSurvivalModule.ts`
// (the test file pulls them straight from that module and verifies a
// manifest entry resolves for each one). Curly apostrophes (’ U+2019)
// are intentional so `findAudioItemForContext`'s normaliser matches
// the rendered text byte-for-byte.
// ─────────────────────────────────────────────────────────────────────

const corePhrases: readonly YoAudioItem[] = [
  frQcPremiumItem({
    type: "phrase",
    text: "Salut, ça va ?",
    slug: "salut-ca-va",
  }),
  frQcPremiumItem({
    type: "phrase",
    text: "Bonjour, enchanté.",
  }),
  frQcPremiumItem({
    type: "sentence",
    text: "Je suis nouveau dans l’équipe.",
  }),
  frQcPremiumItem({
    type: "sentence",
    text: "Je commence aujourd’hui.",
  }),
  frQcPremiumItem({
    type: "sentence",
    text: "Tu peux me tutoyer.",
  }),
  frQcPremiumItem({
    type: "sentence",
    text: "Est-ce que je peux vous tutoyer ?",
    slug: "est-ce-que-je-peux-vous-tutoyer",
  }),
  frQcPremiumItem({
    type: "sentence",
    text: "Je vais m’installer ici.",
  }),
  frQcPremiumItem({
    type: "sentence",
    text: "Je cherche la salle de réunion.",
  }),
  frQcPremiumItem({
    type: "sentence",
    text: "Je ne suis pas encore habitué au système.",
  }),
  frQcPremiumItem({
    type: "sentence",
    text: "Peux-tu me montrer rapidement ?",
    slug: "peux-tu-me-montrer-rapidement",
  }),
  frQcPremiumItem({
    type: "sentence",
    text: "Je te remercie.",
  }),
  frQcPremiumItem({
    type: "sentence",
    text: "Merci, c’est apprécié.",
  }),
  frQcPremiumItem({
    type: "phrase",
    text: "À tantôt.",
    slug: "a-tantot",
    notes: "Quebec idiom — means « later today », not « soon ».",
  }),
  frQcPremiumItem({
    type: "phrase",
    text: "Bonne journée.",
  }),
];

// ─────────────────────────────────────────────────────────────────────
// Mini-dialogues — every distinct `frQuebec` line from the 3 mini
// scenarios (`d-reception`, `d-collegue`, `d-responsable`).
//
// "Merci, c’est apprécié." appears verbatim in d-reception line 4 AND
// in core phrase p12. We intentionally do NOT duplicate the manifest
// entry: `findAudioItemForContext` resolves the dialogue lookup to
// the same core-phrase MP3 via the (moduleId, accentProfile) match.
// ─────────────────────────────────────────────────────────────────────

const dialogueLines: readonly YoAudioItem[] = [
  // d-reception — at the front desk on day one
  frQcPremiumItem({
    type: "sentence",
    text: "Bonjour ! Bienvenue. Je peux vous aider ?",
    slug: "d-reception-l1-bonjour-bienvenue",
  }),
  frQcPremiumItem({
    type: "sentence",
    text: "Bonjour. Je commence aujourd’hui dans l’équipe. C’est mon premier jour.",
    slug: "d-reception-l2-je-commence-aujourd-hui-premier-jour",
  }),
  frQcPremiumItem({
    type: "sentence",
    text: "Parfait. Je préviens votre responsable. Vous pouvez vous installer en attendant.",
    slug: "d-reception-l3-je-previens-votre-responsable",
  }),
  // d-reception line 4 ("Merci, c’est apprécié.") is intentionally
  // omitted — covered by the core phrase entry above.

  // d-collegue — first coworker stops by the desk
  frQcPremiumItem({
    type: "sentence",
    text: "Allô ! Tu dois être la nouvelle personne, non ?",
    slug: "d-collegue-l1-allo-tu-dois-etre-la-nouvelle-personne",
  }),
  frQcPremiumItem({
    type: "sentence",
    text: "Oui, je commence aujourd’hui. Enchanté, je suis nouveau dans l’équipe.",
    slug: "d-collegue-l2-oui-enchante-je-suis-nouveau",
  }),
  frQcPremiumItem({
    type: "sentence",
    text: "Bienvenue ! Tu peux me tutoyer, on est pas mal informels ici.",
    slug: "d-collegue-l3-bienvenue-tu-peux-me-tutoyer",
  }),
  frQcPremiumItem({
    type: "sentence",
    text: "Avec plaisir. Peux-tu me montrer rapidement où est la salle de réunion ?",
    slug: "d-collegue-l4-avec-plaisir-salle-de-reunion",
  }),

  // d-responsable — team lead introduces themselves
  frQcPremiumItem({
    type: "sentence",
    text: "Bonjour, je suis Marie, la responsable de l’équipe. Bienvenue !",
    slug: "d-responsable-l1-je-suis-marie-la-responsable",
  }),
  frQcPremiumItem({
    type: "sentence",
    text: "Bonjour Marie, enchanté. Je suis content d’être ici.",
    slug: "d-responsable-l2-bonjour-marie-content-d-etre-ici",
  }),
  frQcPremiumItem({
    type: "sentence",
    text: "Si tu as des questions aujourd’hui, n’hésite pas. On prendra cinq minutes en fin de journée pour faire le point.",
    slug: "d-responsable-l3-si-tu-as-des-questions-fin-de-journee",
  }),
  frQcPremiumItem({
    type: "sentence",
    text: "Parfait. Je ne suis pas encore habitué au système, j’aurai sûrement quelques questions de base.",
    slug: "d-responsable-l4-pas-encore-habitue-questions-de-base",
  }),
];

export const frQuebecPremiumLessonOneAudio: readonly YoAudioItem[] = [
  ...corePhrases,
  ...dialogueLines,
];
