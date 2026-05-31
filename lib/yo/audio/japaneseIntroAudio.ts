/**
 * YoPratiqo — Japanese intro audio manifest (japanese_standard).
 *
 * Powers the audio buttons on `/yo/langues/japonais/intro`. Items
 * here use a Tokyo-standard Japanese accent profile so a learner
 * clicking the speaker icon next to ありがとうございます or
 * 私は寿司を食べます。 hears a friendly, beginner-friendly rendering.
 *
 * Slug policy — IMPORTANT:
 *   `buildAudioSlug` strips non-ASCII characters, which would turn
 *   every Japanese item into an empty slug. We therefore pass an
 *   explicit `slug` derived from a documented, deterministic romaji
 *   transliteration on EVERY item. The romaji column is a storage
 *   identifier ONLY — the lesson UI keeps the original Japanese
 *   text via `text:` and tags it `lang="ja"`. We do not promise the
 *   romaji is the canonical Hepburn / Kunrei / Nihon-shiki form;
 *   we just promise it stays stable across regenerations so already
 *   uploaded MP3s never orphan.
 *
 * Storage layout (accent-aware, mirrors the other launch modules):
 *
 *   yo/ja/japanese-intro/intro/japanese-standard/<type>/<slug>.mp3
 *
 * Item ids:
 *
 *   ja-jpi-<type>-<slug>
 *
 * (`jpi` = `japanese-intro`, kept short so dry-run logs stay
 * scannable.)
 *
 * Other Japanese variants (Kansai-ben, polite-only register, anime
 * acting voice, etc.) are intentionally OUT OF SCOPE — the module
 * ships ONE TTS profile until each variant is designed and validated
 * by a native speaker.
 *
 * No Stripe / Supabase / RLS / migrations / search / booking /
 * Membre Pro logic in this file. Pure data.
 */

import {
  buildStoragePath,
  type YoAudioItem,
  type YoAudioItemType,
} from "@/lib/yo/audio/audioManifest.types-internal";
import { getYoAudioAccentProfile } from "@/lib/yo/audio/accentProfiles";

const ACCENT = getYoAudioAccentProfile("japanese_standard");
const MODULE_ID = "japanese-intro" as const;
const LESSON_ID = "intro" as const;
const TARGET_LANGUAGE = "ja" as const;

function jpItem(input: {
  type: Extract<YoAudioItemType, "word" | "phrase" | "sentence">;
  /** Original Japanese text rendered in the lesson UI (kept as-is). */
  text: string;
  /**
   * Romaji-derived ASCII slug. Required for every Japanese item —
   * see slug policy in the file header. Lowercase, hyphen-separated,
   * no diacritics, no whitespace.
   */
  slug: string;
  notes?: string;
}): YoAudioItem {
  return {
    id: `ja-jpi-${input.type}-${input.slug}`,
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
      slug: input.slug,
      accentSegment: ACCENT.pathSlug,
    }),
    accentProfile: ACCENT.id,
    notes: input.notes,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Core anchor vocabulary — the words used in the
// numbers / origin / writing-system / grammar sections.
// ─────────────────────────────────────────────────────────────────────

const anchorWords: readonly YoAudioItem[] = [
  jpItem({ type: "word", text: "世界", slug: "sekai" }),
  jpItem({ type: "word", text: "言語", slug: "gengo" }),
  jpItem({ type: "word", text: "話す", slug: "hanasu" }),
  jpItem({ type: "word", text: "国", slug: "kuni" }),
  jpItem({ type: "word", text: "日本", slug: "nihon" }),
  jpItem({ type: "word", text: "歴史", slug: "rekishi" }),
  jpItem({ type: "word", text: "言葉", slug: "kotoba" }),
  jpItem({ type: "word", text: "書く", slug: "kaku" }),
  jpItem({ type: "word", text: "読む", slug: "yomu" }),
  jpItem({
    type: "word",
    text: "ひらがな",
    slug: "hiragana",
    notes: "Phonetic syllabary used for native Japanese words and grammar.",
  }),
  jpItem({
    type: "word",
    text: "カタカナ",
    slug: "katakana",
    notes: "Phonetic syllabary used for foreign loanwords and emphasis.",
  }),
  jpItem({
    type: "word",
    text: "漢字",
    slug: "kanji",
    notes: "Chinese-derived logographic characters.",
  }),
  jpItem({ type: "word", text: "文字", slug: "moji" }),
  jpItem({ type: "word", text: "文法", slug: "bunpou" }),
  jpItem({ type: "word", text: "動詞", slug: "doushi" }),
  jpItem({ type: "word", text: "名詞", slug: "meishi" }),
];

// ─────────────────────────────────────────────────────────────────────
// Politeness + greetings — the survival pack a traveller drops into
// at the airport. Polite forms only.
// ─────────────────────────────────────────────────────────────────────

const politenessPhrases: readonly YoAudioItem[] = [
  jpItem({ type: "word", text: "ようこそ", slug: "youkoso" }),
  jpItem({
    type: "phrase",
    text: "おはようございます",
    slug: "ohayou-gozaimasu",
  }),
  jpItem({ type: "word", text: "こんにちは", slug: "konnichiwa" }),
  jpItem({ type: "word", text: "こんばんは", slug: "konbanwa" }),
  jpItem({
    type: "phrase",
    text: "おやすみなさい",
    slug: "oyasumi-nasai",
  }),
  jpItem({
    type: "phrase",
    text: "ありがとうございます",
    slug: "arigatou-gozaimasu",
  }),
  jpItem({ type: "word", text: "すみません", slug: "sumimasen" }),
  jpItem({
    type: "phrase",
    text: "お願いします",
    slug: "onegai-shimasu",
  }),
  jpItem({
    type: "phrase",
    text: "どういたしまして",
    slug: "dou-itashimashite",
  }),
  jpItem({ type: "word", text: "はい", slug: "hai" }),
  jpItem({ type: "word", text: "いいえ", slug: "iie" }),
  jpItem({
    type: "phrase",
    text: "はじめまして",
    slug: "hajimemashite",
  }),
  jpItem({
    type: "word",
    text: "です",
    slug: "desu",
    notes: "Polite copula. The single most useful glue word for beginners.",
  }),
  jpItem({
    type: "phrase",
    text: "よろしくお願いします",
    slug: "yoroshiku-onegai-shimasu",
  }),
  jpItem({ type: "word", text: "さようなら", slug: "sayounara" }),
  jpItem({ type: "phrase", text: "また明日", slug: "mata-ashita" }),
  jpItem({
    type: "phrase",
    text: "じゃあね",
    slug: "jaa-ne",
    notes: "Casual goodbye — only use with friends/family.",
  }),
  jpItem({
    type: "phrase",
    text: "失礼します",
    slug: "shitsurei-shimasu",
    notes:
      "Polite excuse-me / formal goodbye, e.g. when leaving a meeting room.",
  }),
  jpItem({ type: "word", text: "おめでとう", slug: "omedetou" }),
];

// ─────────────────────────────────────────────────────────────────────
// SOV showcase sentence — used in the grammar section to demonstrate
// Subject-Object-Verb word order.
//
// 私は寿司を食べます。  →  watashi-wa sushi-o tabemasu
//   I (topic) | sushi (object) | eat (polite)
// ─────────────────────────────────────────────────────────────────────

const exampleSentences: readonly YoAudioItem[] = [
  jpItem({
    type: "sentence",
    text: "私は寿司を食べます。",
    slug: "watashi-wa-sushi-o-tabemasu",
    notes:
      "SOV (Subject-Object-Verb) showcase: watashi(I) wa, sushi(o) o, tabemasu(eat).",
  }),
];

export const japaneseIntroAudio: readonly YoAudioItem[] = [
  ...anchorWords,
  ...politenessPhrases,
  ...exampleSentences,
];
