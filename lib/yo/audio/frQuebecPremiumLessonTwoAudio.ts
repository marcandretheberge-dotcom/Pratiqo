/**
 * YoPratiqo — Quebec French / Premium Module 1 · Lesson 2 audio.
 *
 * Powers the audio buttons rendered inside the Lesson 2 free preview
 * on `/yo/langues/francais-quebec/module-1`. Items here use the
 * Quebec French accent profile so a learner clicking the speaker
 * icon next to "Pis", "Mets.", "Pas de problème.", etc. hears a
 * Canadian French rendering rather than a Parisian one.
 *
 * Coverage (Lesson 2 "Comprendre les consignes simples"):
 *   - Group A — 6 Quebec oral marker audio targets (Pis / Tiens. /
 *     Tenez. / Tiens / Tenez / Là. / Tantôt.)
 *   - Group B — 24 imperative forms (tu + vous for each of the 12
 *     key verbs: mets/mettez, prends/prenez, …)
 *   - Group C — 3 real workplace examples (multi-clause sentences
 *     chaining several key verbs; not present as direct fields in
 *     the lesson content, listed here as standalone audio targets)
 *   - Group D — 8 confirmation formulas (the 5 lesson formulas +
 *     3 "Oui, …"-prefixed variants commonly heard at work)
 *   - Group E — 5 reformulation formulas (mirror the 5 lesson
 *     reformulation prompts; placeholders use `spokenText` so they
 *     are not pronounced literally)
 *   - Group F — 5 mini-scenario lines (a separate end-to-end
 *     workplace scenario distinct from the lesson-content scenario)
 *
 * Storage layout (accent-aware, mirrors Lesson 1):
 *
 *   yo/fr/fr-quebec-workplace-survival-1/comprendre-consignes-simples/quebec-french/<type>/<slug>.mp3
 *
 * Item ids follow the pattern:
 *
 *   fr-fqp-m1l2-<type>-<slug>
 *
 * `fqp` = `francais-quebec-premium`, `m1l2` = module 1 / lesson 2.
 *
 * The shell reads these items via `findAudioItemForContext` with
 * `accentProfile: "quebec_french"` and the canonical
 * (moduleId, lessonId) triple. The lookup helper normalises text
 * by lowercasing + stripping diacritics + trimming, so the audio
 * entry for "Pis" resolves the marker "pis" rendered in the UI,
 * the imperative "Mets." is keyed off the typed imperative string
 * the renderer derives from `verb.infinitive`, etc.
 *
 * Strings that have no UI counterpart (Group C, the 3 "Oui, …"
 * extras of Group D, Group F) are still recorded — they're part of
 * the lesson's audio catalogue and may be surfaced by future
 * pronunciation drills without changing the manifest.
 *
 * Hard safety contract for this PR:
 *   - Pure data only. No runtime TTS, no OpenAI / Web Speech import.
 *   - No microphone, no MediaRecorder, no learner-data sharing.
 *   - No Stripe / Supabase / RLS / migrations / search / booking /
 *     Membre Pro logic in this file.
 *   - The MP3 generation script is the ONLY caller that touches a
 *     runtime OpenAI key; it runs offline, never in the browser.
 *   - No MP3 binary files are added by this PR. The script generates
 *     them on demand from these manifest entries (offline / CI).
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
const LESSON_ID = "comprendre-consignes-simples" as const;
const TARGET_LANGUAGE = "fr" as const;
const ID_PREFIX = "fr-fqp-m1l2" as const;

const QUEBEC_FRENCH_PRONUNCIATION_HINT =
  "Prononcer en français québécois naturel. Ne pas utiliser une prononciation anglaise. Les mots français qui ressemblent à l’anglais doivent être prononcés comme du français.";
const QUEBEC_FRENCH_SLASH_VARIANTS_HINT =
  "Lire comme deux variantes françaises distinctes. Ne pas prononcer le symbole “/”. Ne pas lire comme une fraction.";
const QUEBEC_FRENCH_PLACEHOLDER_HINT =
  "Ne pas prononcer le placeholder. Lire la phrase naturellement en français québécois.";

type FrQuebecPremiumItemType = Extract<
  YoAudioItemType,
  "phrase" | "sentence"
>;

interface FrQuebecPremiumItemInput {
  type: FrQuebecPremiumItemType;
  text: string;
  /**
   * Override the auto-derived slug. Used for long sentences (scenario
   * lines, real workplace examples, reformulations) so item ids stay
   * short and deterministic even when the text spans multiple clauses.
   */
  slug?: string;
  spokenText?: string;
  pronunciationHint?: string;
  ttsInstructions?: string;
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
    spokenText: input.spokenText,
    pronunciationHint: input.pronunciationHint,
    storagePath: buildStoragePath({
      targetLanguage: TARGET_LANGUAGE,
      moduleId: MODULE_ID,
      lessonId: LESSON_ID,
      type: input.type,
      slug,
      accentSegment: ACCENT.pathSlug,
    }),
    accentProfile: ACCENT.id,
    ttsInstructions: input.ttsInstructions,
    voiceHint: ACCENT.bcp47Hint,
    notes: input.notes,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Group A — Quebec oral markers (6 audio targets)
//
// Capitalised + terminal-period variants because that's how the audio
// performs (a teacher modelling "Pis" pauses briefly, like a sentence
// of its own). The shell binds the audio button to the lower-case
// `marker.marker` rendered in the UI — `findAudioItemForContext`'s
// normaliser handles the case + punctuation difference for the
// straightforward markers (pis / là / tantôt). The combined
// "tiens / tenez" marker now has its own MP3-backed manifest entry;
// `spokenText` reads the two variants separately instead of
// pronouncing the slash.
// ─────────────────────────────────────────────────────────────────────

const oralMarkers: readonly YoAudioItem[] = [
  frQcPremiumItem({ type: "phrase", text: "Pis" }),
  frQcPremiumItem({
    type: "phrase",
    text: "Tiens.",
    pronunciationHint: QUEBEC_FRENCH_PRONUNCIATION_HINT,
  }),
  frQcPremiumItem({
    type: "phrase",
    text: "Tenez.",
    pronunciationHint: QUEBEC_FRENCH_PRONUNCIATION_HINT,
  }),
  frQcPremiumItem({
    type: "phrase",
    text: "Tiens / Tenez",
    slug: "tiens-tenez",
    spokenText: "Tiens. Tenez.",
    pronunciationHint: QUEBEC_FRENCH_SLASH_VARIANTS_HINT,
    notes:
      "Visible slash variant; generated audio reads the two forms separately.",
  }),
  frQcPremiumItem({
    type: "phrase",
    text: "Là.",
    slug: "la",
    pronunciationHint: QUEBEC_FRENCH_PRONUNCIATION_HINT,
  }),
  frQcPremiumItem({
    type: "phrase",
    text: "Tantôt.",
    slug: "tantot",
    pronunciationHint: QUEBEC_FRENCH_PRONUNCIATION_HINT,
    notes:
      "Quebec idiom — means « later today », not « soon » in general.",
  }),
];

// ─────────────────────────────────────────────────────────────────────
// Group B — 12 key verbs × tu/vous imperatives = 24 items
//
// Order matches the lesson's `keyVerbs` array (6 physical, then 6
// administrative). For each verb the tu form precedes the vous form.
// Slugs are explicit (rather than derived) so a re-generation never
// silently picks a different slug when a contributor adjusts the
// terminal punctuation.
// ─────────────────────────────────────────────────────────────────────

const keyVerbImperatives: readonly YoAudioItem[] = [
  // mettre
  frQcPremiumItem({
    type: "phrase",
    text: "Mets.",
    slug: "mets",
    spokenText: "Mets la boîte.",
    pronunciationHint: QUEBEC_FRENCH_PRONUNCIATION_HINT,
  }),
  frQcPremiumItem({ type: "phrase", text: "Mettez.", slug: "mettez" }),
  // prendre
  frQcPremiumItem({
    type: "phrase",
    text: "Prends.",
    slug: "prends",
    spokenText: "Prends ton casque.",
    pronunciationHint: QUEBEC_FRENCH_PRONUNCIATION_HINT,
  }),
  frQcPremiumItem({ type: "phrase", text: "Prenez.", slug: "prenez" }),
  // apporter
  frQcPremiumItem({ type: "phrase", text: "Apporte.", slug: "apporte" }),
  frQcPremiumItem({ type: "phrase", text: "Apportez.", slug: "apportez" }),
  // ranger
  frQcPremiumItem({
    type: "phrase",
    text: "Range.",
    slug: "range",
    spokenText: "Range tes affaires.",
    pronunciationHint:
      "Prononcer en français québécois. “Range” est le verbe français “ranger”, prononcé /ʁɑ̃ʒ/, pas le mot anglais “range”.",
  }),
  frQcPremiumItem({ type: "phrase", text: "Rangez.", slug: "rangez" }),
  // ouvrir
  frQcPremiumItem({
    type: "phrase",
    text: "Ouvre.",
    slug: "ouvre",
    spokenText: "Ouvre la porte.",
    pronunciationHint: QUEBEC_FRENCH_PRONUNCIATION_HINT,
  }),
  frQcPremiumItem({ type: "phrase", text: "Ouvrez.", slug: "ouvrez" }),
  // fermer
  frQcPremiumItem({
    type: "phrase",
    text: "Ferme.",
    slug: "ferme",
    spokenText: "Ferme la porte.",
    pronunciationHint: QUEBEC_FRENCH_PRONUNCIATION_HINT,
  }),
  frQcPremiumItem({ type: "phrase", text: "Fermez.", slug: "fermez" }),
  // signer
  frQcPremiumItem({
    type: "phrase",
    text: "Signe.",
    slug: "signe",
    spokenText: "Signe le formulaire.",
    pronunciationHint: QUEBEC_FRENCH_PRONUNCIATION_HINT,
  }),
  frQcPremiumItem({ type: "phrase", text: "Signez.", slug: "signez" }),
  // remplir
  frQcPremiumItem({ type: "phrase", text: "Remplis.", slug: "remplis" }),
  frQcPremiumItem({
    type: "phrase",
    text: "Remplissez.",
    slug: "remplissez",
  }),
  // vérifier
  frQcPremiumItem({
    type: "phrase",
    text: "Vérifie.",
    slug: "verifie",
    spokenText: "Vérifie la quantité.",
    pronunciationHint: QUEBEC_FRENCH_PRONUNCIATION_HINT,
  }),
  frQcPremiumItem({ type: "phrase", text: "Vérifiez.", slug: "verifiez" }),
  // envoyer
  frQcPremiumItem({
    type: "phrase",
    text: "Envoie.",
    slug: "envoie",
    spokenText: "Envoie le courriel.",
    pronunciationHint: QUEBEC_FRENCH_PRONUNCIATION_HINT,
  }),
  frQcPremiumItem({ type: "phrase", text: "Envoyez.", slug: "envoyez" }),
  // imprimer
  frQcPremiumItem({ type: "phrase", text: "Imprime.", slug: "imprime" }),
  frQcPremiumItem({ type: "phrase", text: "Imprimez.", slug: "imprimez" }),
  // appeler
  frQcPremiumItem({
    type: "phrase",
    text: "Appelle.",
    slug: "appelle",
    spokenText: "Appelle Mathieu.",
    pronunciationHint: QUEBEC_FRENCH_PRONUNCIATION_HINT,
  }),
  frQcPremiumItem({ type: "phrase", text: "Appelez.", slug: "appelez" }),
];

// ─────────────────────────────────────────────────────────────────────
// Group C — Real workplace examples (3 items)
//
// These are stand-alone audio catalogue entries — they do NOT match
// any field in the lesson 2 content data, so the per-verb
// `exampleFr` button in the UI falls back to Web Speech for these.
// Curly apostrophes are intentional so a future pronunciation drill
// that pipes the exact same string through `findAudioItemForContext`
// resolves byte-for-byte.
// ─────────────────────────────────────────────────────────────────────

const workplaceExamples: readonly YoAudioItem[] = [
  frQcPremiumItem({
    type: "sentence",
    text:
      "Tiens, signe ce formulaire pis remplis la section du bas, s’il te plaît.",
    slug: "ex-tiens-signe-formulaire-remplis-section-bas",
  }),
  frQcPremiumItem({
    type: "sentence",
    text:
      "Mets la boîte sur l’étagère du haut, pis ferme la porte en sortant.",
    slug: "ex-mets-boite-etagere-haut-ferme-porte",
  }),
  frQcPremiumItem({
    type: "sentence",
    text:
      "Prends une pause à 10h30, pis reviens à 10h45 pour l’ouverture.",
    slug: "ex-prends-pause-1030-reviens-1045-ouverture",
  }),
];

// ─────────────────────────────────────────────────────────────────────
// Group D — Confirmation formulas (8 items)
//
// The first 5 mirror the lesson 2 `confirmationFormulas` (same
// `targetFr` strings with curly apostrophes so the contextual lookup
// resolves the lesson rendering). The 3 trailing "Oui, …" variants
// are extra workplace-friendly forms recorded for the audio
// catalogue; they do not appear in the lesson UI and stay
// addressable by id / storage path only.
// ─────────────────────────────────────────────────────────────────────

const confirmationFormulas: readonly YoAudioItem[] = [
  frQcPremiumItem({
    type: "phrase",
    text: "Parfait.",
    pronunciationHint: QUEBEC_FRENCH_PRONUNCIATION_HINT,
  }),
  frQcPremiumItem({
    type: "phrase",
    text: "OK, c’est bon.",
    slug: "ok-c-est-bon",
  }),
  frQcPremiumItem({
    type: "phrase",
    text: "D’accord, je m’en occupe.",
    slug: "d-accord-je-m-en-occupe",
  }),
  frQcPremiumItem({
    type: "phrase",
    text: "Pas de problème.",
    slug: "pas-de-probleme",
  }),
  frQcPremiumItem({
    type: "phrase",
    text: "Compris.",
    pronunciationHint: QUEBEC_FRENCH_PRONUNCIATION_HINT,
  }),
  frQcPremiumItem({
    type: "phrase",
    text: "Oui, parfait.",
    slug: "oui-parfait",
  }),
  frQcPremiumItem({
    type: "phrase",
    text: "Oui, c’est bon.",
    slug: "oui-c-est-bon",
  }),
  frQcPremiumItem({
    type: "phrase",
    text: "Oui, je m’en occupe.",
    slug: "oui-je-m-en-occupe",
  }),
];

// ─────────────────────────────────────────────────────────────────────
// Group E — Reformulation formulas (5 items)
//
// Mirror the lesson 2 `reformulationFormulas`. The first entry keeps
// the visible `[X]` placeholder so contextual lookup resolves the UI
// string, while `spokenText` removes the placeholder for natural TTS.
// ─────────────────────────────────────────────────────────────────────

const reformulationFormulas: readonly YoAudioItem[] = [
  frQcPremiumItem({
    type: "sentence",
    text: "Excuse-moi, t’as dit quoi pour [X] ?",
    slug: "rf-excuse-moi-tas-dit-quoi-pour-la-boite",
    spokenText: "Excuse-moi, t’as dit quoi ?",
    pronunciationHint:
      QUEBEC_FRENCH_PLACEHOLDER_HINT + " Ne pas prononcer “[X]”.",
  }),
  frQcPremiumItem({
    type: "sentence",
    text: "Pardon, peux-tu redire la dernière partie ?",
    slug: "rf-pardon-peux-tu-redire-la-derniere-partie",
  }),
  frQcPremiumItem({
    type: "sentence",
    text: "Attends — la boîte sur l’étagère, c’est ça ?",
    slug: "rf-attends-la-boite-sur-etagere-cest-ca",
  }),
  frQcPremiumItem({
    type: "sentence",
    text:
      "Je veux juste m’assurer — c’est avant ou après la pause ?",
    slug: "rf-je-veux-juste-massurer-avant-ou-apres-la-pause",
  }),
  frQcPremiumItem({
    type: "sentence",
    text:
      "Désolé, je veux être sûr de bien faire — peux-tu reprendre depuis le début ?",
    slug: "rf-desole-peux-tu-reprendre-depuis-le-debut",
  }),
];

// ─────────────────────────────────────────────────────────────────────
// Group F — Mini-scenario lines (5 items)
//
// Audio-only mini-scenario — distinct from the lesson 2 mini-scenario
// in `content.miniScenario`. The lesson scenario stays a pure-text
// teaching artefact; this audio scenario gives a second, fully
// recorded end-to-end example a future pronunciation drill can play
// straight through. Slug prefixes encode the speaker + line order
// (`sc-l1-…`) so reading the storage tree on Supabase is intuitive.
// ─────────────────────────────────────────────────────────────────────

const miniScenarioLines: readonly YoAudioItem[] = [
  frQcPremiumItem({
    type: "sentence",
    text:
      "OK, là tu prends la boîte rouge dans l’entrepôt, tu la mets sur l’étagère 3, pis tu signes le formulaire dans le bureau de Sophie avant midi.",
    slug: "sc-l1-supervisor-prends-mets-signes-trois-actions",
  }),
  frQcPremiumItem({
    type: "sentence",
    text: "Attends — l’étagère 3, c’est en haut ou en bas ?",
    slug: "sc-l2-learner-etagere-3-haut-ou-bas",
  }),
  frQcPremiumItem({
    type: "sentence",
    text: "En haut, sur la tablette du milieu.",
    slug: "sc-l3-supervisor-en-haut-tablette-du-milieu",
  }),
  frQcPremiumItem({
    type: "sentence",
    text:
      "Parfait, c’est bon. La boîte rouge sur l’étagère 3 du haut, et je signe le formulaire chez Sophie avant midi.",
    slug: "sc-l4-learner-confirmation-boite-rouge-etagere-3",
  }),
  frQcPremiumItem({
    type: "phrase",
    text: "Exactement.",
    slug: "sc-l5-supervisor-exactement",
  }),
];

export const frQuebecPremiumLessonTwoAudio: readonly YoAudioItem[] = [
  ...oralMarkers,
  ...keyVerbImperatives,
  ...workplaceExamples,
  ...confirmationFormulas,
  ...reformulationFormulas,
  ...miniScenarioLines,
];
