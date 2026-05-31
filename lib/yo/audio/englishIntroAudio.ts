/**
 * YoPratiqo — English intro audio manifest (canadian_english).
 *
 * Powers the audio buttons on `/yo/langues/anglais/intro`. Items
 * here use a Canadian English accent profile so a Quebec-francophone
 * learner clicking the speaker icon next to "How much is it?" or
 * "Bear with me, please." hears a friendly, day-to-day Canadian
 * rendering — the variety they're most likely to need at the
 * grocery store, at work, and on the phone.
 *
 * Storage layout (accent-aware, mirrors the Italian + Quebec French
 * conventions):
 *
 *   yo/en/english-intro/intro/canadian-english/<type>/<slug>.mp3
 *
 * Item ids follow the same shape as the other modules:
 *
 *   en-eni-<type>-<slug>
 *
 * (`eni` = `english-intro`, kept short so logs stay readable.)
 *
 * The page reads these items via `findAudioItemForContext` with
 * `accentProfile: "canadian_english"`, so adding a new word here +
 * running `npm run generate:yopratiqo-audio` is enough to power the
 * audio button — no UI change required.
 *
 * Other English variants (American, British, Australian, etc.) are
 * intentionally OUT OF SCOPE — the module discusses regional
 * differences in CONTENT, but ships ONE TTS profile so we never
 * over-promise on the audio output. See
 * `lib/yo/audio/accentProfiles.ts` for the policy.
 *
 * No Stripe / Supabase / RLS / migrations / search / booking /
 * Membre Pro logic in this file. Pure data.
 */

import {
  buildAudioSlug,
  buildStoragePath,
  type YoAudioItem,
  type YoAudioItemType,
} from "@/lib/yo/audio/audioManifest.types-internal";
import { getYoAudioAccentProfile } from "@/lib/yo/audio/accentProfiles";

const ACCENT = getYoAudioAccentProfile("canadian_english");
const MODULE_ID = "english-intro" as const;
const LESSON_ID = "intro" as const;
const TARGET_LANGUAGE = "en" as const;

function enItem(input: {
  type: Extract<YoAudioItemType, "word" | "phrase" | "sentence">;
  text: string;
  /** Override the auto-derived slug (e.g. for very long phrases). */
  slug?: string;
  notes?: string;
}): YoAudioItem {
  const slug = input.slug ?? buildAudioSlug(input.text);
  return {
    id: `en-eni-${input.type}-${slug}`,
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
// Anchor vocabulary — the words used to talk ABOUT English in the
// numbers / origin / variants explanatory sections.
// ─────────────────────────────────────────────────────────────────────

const anchorWords: readonly YoAudioItem[] = [
  enItem({ type: "word", text: "the world" }),
  enItem({ type: "word", text: "the language" }),
  enItem({ type: "word", text: "to speak" }),
  enItem({ type: "word", text: "the country" }),
  enItem({ type: "word", text: "million" }),
  enItem({ type: "word", text: "to learn" }),
  enItem({ type: "word", text: "to understand" }),
  enItem({ type: "word", text: "a mistake" }),
  enItem({ type: "word", text: "confidence" }),
  enItem({ type: "word", text: "the accent" }),
  enItem({ type: "word", text: "different" }),
  enItem({ type: "word", text: "a word" }),
  enItem({ type: "word", text: "a sentence" }),
  enItem({ type: "word", text: "vocabulary" }),
  enItem({ type: "word", text: "to recognize" }),
];

// ─────────────────────────────────────────────────────────────────────
// English variants vocabulary — anchors the
// "American / British / Canadian" section.
// ─────────────────────────────────────────────────────────────────────

const variantWords: readonly YoAudioItem[] = [
  enItem({ type: "word", text: "American" }),
  enItem({ type: "word", text: "British" }),
  enItem({ type: "word", text: "Canadian" }),
];

// ─────────────────────────────────────────────────────────────────────
// False-friends vocabulary — the section the brief explicitly asks
// for. These items sound like French words but mean something else.
// Coverage MUST stay 100% so a learner can audit each one.
// ─────────────────────────────────────────────────────────────────────

const falseFriendWords: readonly YoAudioItem[] = [
  enItem({
    type: "word",
    text: "actually",
    notes:
      "False friend — means 'in fact / really', NOT 'currently / right now'.",
  }),
  enItem({
    type: "word",
    text: "eventually",
    notes:
      "False friend — means 'in the end / at last', NOT 'possibly / éventuellement'.",
  }),
  enItem({
    type: "word",
    text: "library",
    notes:
      "False friend — means 'bibliothèque', NOT 'librairie' (which is 'bookstore').",
  }),
  enItem({
    type: "word",
    text: "sensible",
    notes:
      "False friend — means 'reasonable / sensé', NOT emotionally sensitive.",
  }),
  enItem({
    type: "word",
    text: "chair",
    notes:
      "False friend — means 'chaise', NOT 'chair' (flesh, which is 'flesh').",
  }),
  enItem({
    type: "word",
    text: "to assist",
    notes:
      "False friend — means 'to help / aider', NOT 'to attend / assister à'.",
  }),
  enItem({
    type: "word",
    text: "rest",
    notes:
      "False friend — means 'repos / pause', also 'remainder'; NOT 'rester'.",
  }),
  enItem({
    type: "word",
    text: "to demand",
    notes:
      "False friend — means 'to require firmly / exiger', NOT politely 'to ask'.",
  }),
  enItem({
    type: "word",
    text: "engaged",
    notes:
      "False friend — means 'fiancé(e)' or 'busy / occupied'; NOT 'engagé' in the political sense.",
  }),
  enItem({
    type: "word",
    text: "to pretend",
    notes:
      "False friend — means 'faire semblant', NOT 'prétendre / claim'.",
  }),
];

// ─────────────────────────────────────────────────────────────────────
// Survival phrases — the "let me catch up" toolkit. These are the
// items that unblock a Quebec false-beginner the moment a real
// conversation moves too fast.
// ─────────────────────────────────────────────────────────────────────

const survivalPhrases: readonly YoAudioItem[] = [
  enItem({
    type: "sentence",
    text: "Sorry, can you repeat that?",
    slug: "sorry-can-you-repeat-that",
  }),
  enItem({
    type: "sentence",
    text: "Could you speak more slowly, please?",
    slug: "could-you-speak-more-slowly-please",
  }),
  enItem({
    type: "phrase",
    text: "I don't understand.",
    slug: "i-dont-understand",
  }),
  enItem({
    type: "phrase",
    text: "What does that mean?",
    slug: "what-does-that-mean",
  }),
  enItem({
    type: "sentence",
    text: "How do you say… in English?",
    slug: "how-do-you-say-in-english",
  }),
  enItem({
    type: "sentence",
    text: "Sorry, my English isn't great.",
    slug: "sorry-my-english-isnt-great",
  }),
  enItem({
    type: "phrase",
    text: "Bear with me, please.",
    slug: "bear-with-me-please",
  }),
  enItem({
    type: "phrase",
    text: "Let me think for a second.",
    slug: "let-me-think-for-a-second",
  }),
];

// ─────────────────────────────────────────────────────────────────────
// Daily-basics — the absolute survival kit for the first interaction
// of the day. Short, high-frequency, easy wins.
// ─────────────────────────────────────────────────────────────────────

const dailyBasics: readonly YoAudioItem[] = [
  enItem({ type: "phrase", text: "Hi! How are you?", slug: "hi-how-are-you" }),
  enItem({ type: "phrase", text: "Thank you.", slug: "thank-you" }),
  enItem({
    type: "phrase",
    text: "You're welcome.",
    slug: "youre-welcome",
  }),
  enItem({ type: "phrase", text: "Excuse me.", slug: "excuse-me" }),
  enItem({ type: "word", text: "Sorry." }),
  enItem({
    type: "phrase",
    text: "Have a nice day!",
    slug: "have-a-nice-day",
  }),
];

// ─────────────────────────────────────────────────────────────────────
// Travel — payment, asking, finding. These are the "I went to
// Toronto and survived" phrases.
// ─────────────────────────────────────────────────────────────────────

const travelPhrases: readonly YoAudioItem[] = [
  enItem({
    type: "phrase",
    text: "I'll have a…, please.",
    slug: "ill-have-a-please",
  }),
  enItem({
    type: "phrase",
    text: "How much is it?",
    slug: "how-much-is-it",
  }),
  enItem({
    type: "phrase",
    text: "Can I pay by card?",
    slug: "can-i-pay-by-card",
  }),
  enItem({
    type: "phrase",
    text: "Where is the bathroom?",
    slug: "where-is-the-bathroom",
  }),
];

export const englishIntroAudio: readonly YoAudioItem[] = [
  ...anchorWords,
  ...variantWords,
  ...falseFriendWords,
  ...survivalPhrases,
  ...dailyBasics,
  ...travelPhrases,
];
