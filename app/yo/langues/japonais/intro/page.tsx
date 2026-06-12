/**
 * YoPratiqo — Japonais · Intro (app-shell deck)
 *
 * Free, French-default orientation module for Quebec / Canada
 * audiences curious about Japanese. The legacy long-scroll page
 * with a 3-level breadcrumb is replaced by the shared
 * `<YoLessonDeck />` app-shell — same surface the Dominican
 * Republic Spanish path uses — so the experience is one focused
 * screen at a time with companion presence on every screen.
 *
 * What is PRESERVED verbatim:
 *   - `japaneseIntro` data file (no field renamed, no row deleted).
 *   - `YoJapaneseAudioButton` integration with
 *     `accentProfile="japanese_standard"` + `speechLang="ja-JP"`.
 *   - The hiragana / katakana / kanji writing-system cards
 *     showcase, with native names tagged `lang="ja"`.
 *   - The SOV anchor sentence (`私は寿司を食べます。`) and all
 *     politeness-phrase target strings.
 *   - `YoFlashcardPreview` autoplay + `ja-JP` audio context.
 *   - `YoQuizPreview` reveal-only contract.
 *   - Cultural-codes coverage (shoes, no tipping, quiet trains,
 *     two-hand exchange, indirect no).
 *   - The audio chip lists for core vocab, origin-era reading,
 *     writing extras, and grammar terms.
 *   - Teacher CTA → `/trouver-un-prof?q=japonais`.
 *
 * What is NEW:
 *   - Mounts inside `<YoLessonDeck />` (viewport-locked, swipe /
 *     tap / keyboard navigation, app header with Back-to-Languages
 *     arrow + YoPratiqo logo).
 *   - Companion coach on every screen: `map` for context / vocab /
 *     culture, `confused` for the practice quiz, `celebrating` for
 *     the final teacher CTA.
 *
 * No Stripe, no Supabase, no payment math, no checkout, no
 * migration, no RLS, no Membre Pro / commission code, no raw
 * quiz answers, no AI summary, no audio-gen scripts.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, GraduationCap, MessageCircle } from "lucide-react";

import { buildYoLocaleHref, getYoLocale, lstr, t } from "@/lib/yo/localize";
import { buildYoPratiqoMetadata } from "@/lib/yo/yopratiqoSeo";
import { japaneseIntro } from "@/lib/yo/japaneseIntro";
import { YoFlashcardPreview } from "@/components/yo/YoFlashcardPreview";
import { YoQuizPreview } from "@/components/yo/YoQuizPreview";
import { YoJapaneseAudioButton } from "@/components/yo/YoJapaneseAudioButton";
import { YoLessonDeck } from "@/components/yo/YoLessonDeck";
import type { YoLessonDeckScreen } from "@/lib/yo/lessonDeckTypes";
import { getYoLanguageIntroDeckMeta } from "@/lib/yo/languageIntroDecks";
import type { YoLocale } from "@/lib/yo/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string | string[] }>;
}): Promise<Metadata> {
  const params = await searchParams;
  return buildYoPratiqoMetadata("japaneseIntro", params.lang);
}

interface PageProps {
  searchParams: Promise<{ lang?: string | string[] }>;
}

const PAGE_TITLE = lstr("Intro — 日本語", "Intro — 日本語");

const PAGE_SUBTITLE = lstr(
  "La langue de Tokyo, des temples, et du Japon que tu rêves de découvrir.",
  "The language of Tokyo, temples, and the Japan you dream about exploring.",
);

// ─── Deck-screen labels ─────────────────────────────────────────────────
const DECK_LABEL_WELCOME = lstr("Avant de commencer", "Before we begin");
const DECK_TITLE_WELCOME = lstr(
  "Bienvenue dans le japonais",
  "Welcome to Japanese",
);
const DECK_HELPER_WELCOME = lstr(
  "Un écran à la fois — balayage, tape ou flèches Back / Next.",
  "One screen at a time — swipe, tap, or arrow keys.",
);

const DECK_LABEL_NUMBERS = lstr(
  "Le japonais en chiffres",
  "Japanese in numbers",
);
const DECK_TITLE_NUMBERS = lstr(
  "Quelques repères pour situer la langue",
  "A few landmarks to situate the language",
);

const DECK_LABEL_ORIGIN = lstr(
  "D’où vient le japonais",
  "Where Japanese comes from",
);
const DECK_TITLE_ORIGIN = lstr(
  "D’où vient le japonais ?",
  "Where does Japanese come from?",
);

const DECK_LABEL_WRITING = lstr(
  "Les trois systèmes d’écriture",
  "The three writing systems",
);
const DECK_TITLE_WRITING = lstr(
  "Hiragana, katakana, kanji",
  "Hiragana, katakana, kanji",
);

const DECK_LABEL_SOUND = lstr(
  "Pourquoi le japonais sonne différent",
  "Why Japanese sounds different",
);
const DECK_TITLE_SOUND = lstr(
  "Sujet–Objet–Verbe et particules",
  "Subject–Object–Verb and particles",
);

const DECK_LABEL_POLITENESS = lstr(
  "Tes premiers mots de politesse",
  "Your first politeness phrases",
);
const DECK_TITLE_POLITENESS = lstr(
  "Les mots de politesse qui ouvrent les portes",
  "Politeness phrases that open doors",
);
const DECK_HELPER_POLITENESS = lstr(
  "Tape l’audio pour entendre la prononciation standard.",
  "Tap the audio to hear standard pronunciation.",
);

const DECK_LABEL_CULTURE = lstr("Codes culturels", "Cultural codes");
const DECK_TITLE_CULTURE = lstr(
  "Codes culturels qui surprennent",
  "Cultural codes that surprise newcomers",
);

const DECK_LABEL_QUIZ = lstr("Mini quiz", "Mini quiz");
const DECK_TITLE_QUIZ = lstr(
  "Vérifie ton intro japonaise",
  "Check your Japanese intro",
);
const DECK_HELPER_QUIZ = lstr(
  "Cinq questions courtes. Aucune note.",
  "Five short questions. No grade.",
);

const DECK_LABEL_FLASH = lstr("Cartes flash", "Flashcards");
const DECK_TITLE_FLASH = lstr(
  "Tout le vocabulaire en un coup d’œil",
  "All the vocabulary at a glance",
);

const DECK_LABEL_TEACHER = lstr(
  "Pratique avec un prof",
  "Practice with a teacher",
);
const DECK_TITLE_TEACHER = lstr(
  "Pratique avec un vrai prof de japonais",
  "Practice with a real Japanese teacher",
);

// ─── Audio chip helpers (preserved from legacy long-scroll page) ────────
type JapaneseAudioTargetType = "word" | "phrase" | "sentence";

interface JapaneseAudioTarget {
  text: string;
  romaji: string;
  type: JapaneseAudioTargetType;
}

const CORE_VOCAB_AUDIO_TARGETS: readonly JapaneseAudioTarget[] = [
  { text: "世界", romaji: "sekai", type: "word" },
  { text: "言語", romaji: "gengo", type: "word" },
  { text: "話す", romaji: "hanasu", type: "word" },
  { text: "国", romaji: "kuni", type: "word" },
  { text: "日本", romaji: "nihon", type: "word" },
];

const ORIGIN_READING_AUDIO_TARGETS: readonly JapaneseAudioTarget[] = [
  { text: "歴史", romaji: "rekishi", type: "word" },
  { text: "言葉", romaji: "kotoba", type: "word" },
  { text: "書く", romaji: "kaku", type: "word" },
  { text: "読む", romaji: "yomu", type: "word" },
];

const WRITING_EXTRA_AUDIO_TARGETS: readonly JapaneseAudioTarget[] = [
  { text: "文字", romaji: "moji", type: "word" },
];

const GRAMMAR_AUDIO_TARGETS: readonly JapaneseAudioTarget[] = [
  { text: "文法", romaji: "bunpo", type: "word" },
  { text: "動詞", romaji: "doshi", type: "word" },
  { text: "名詞", romaji: "meishi", type: "word" },
];

const POLITENESS_WORD_TARGETS = new Set([
  "ようこそ",
  "こんにちは",
  "こんばんは",
  "すみません",
  "はい",
  "いいえ",
  "おめでとう",
]);

function getJapaneseAudioType(text: string): JapaneseAudioTargetType {
  if (text === "私は寿司を食べます。") return "sentence";
  if (POLITENESS_WORD_TARGETS.has(text)) return "word";
  return "phrase";
}

function JapaneseAudioChipList({
  items,
  locale,
}: {
  items: readonly JapaneseAudioTarget[];
  locale: YoLocale;
}) {
  return (
    <ul role="list" className="mt-4 grid gap-3 sm:grid-cols-2">
      {items.map((target) => (
        <li
          key={target.text}
          className="flex items-center justify-between gap-3 rounded-2xl border border-teal-100 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
        >
          <div className="min-w-0">
            <p className="text-base font-semibold text-[#0F6E56]" lang="ja">
              {target.text}
            </p>
            <p className="mt-0.5 text-xs text-[#0F6E56]/60">{target.romaji}</p>
          </div>
          <YoJapaneseAudioButton
            text={target.text}
            locale={locale}
            moduleId="japanese-intro"
            lessonId="intro"
            type={target.type}
            accentProfile="japanese_standard"
            speechLang="ja-JP"
            size="xs"
          />
        </li>
      ))}
    </ul>
  );
}

export default async function YoJapaneseIntroPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = getYoLocale(resolvedSearchParams.lang);
  const langSuffix = locale === "en" ? "?lang=en" : "";
  const toggleHref = buildYoLocaleHref(
    "/yo/langues/japonais/intro",
    locale === "fr" ? "en" : "fr",
  );

  const meta = getYoLanguageIntroDeckMeta("japonais");
  const backHref = `${meta.backRoute}${langSuffix}`;
  const teacherHref = `/trouver-un-prof?q=${meta.teacherSearchQuery}${
    locale === "en" ? "&lang=en" : ""
  }`;

  const {
    welcomeIntro,
    welcomeContract,
    numbersLeadIn,
    japaneseStats,
    numbersTakeaway,
    originIntro,
    originPoints,
    writingIntro,
    writingSystems,
    romajiNote,
    writingTakeaway,
    soundIntro,
    soundPoints,
    soundTakeaway,
    politenessIntro,
    politenessPhrases,
    politenessGroupLabels,
    cultureIntro,
    culturalCodes,
    quizQuestions,
    flashcardGroups,
    flashcards,
    teacherBody,
    teacherCta,
  } = japaneseIntro;

  const screens: YoLessonDeckScreen[] = [
    {
      id: "welcome",
      kind: "mission",
      eyebrow: t(DECK_LABEL_WELCOME, locale),
      title: t(DECK_TITLE_WELCOME, locale),
      helperText: t(DECK_HELPER_WELCOME, locale),
      companionState: "map",
      content: (
        <section
          data-yo-japanese-intro-deck-screen="welcome"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <h1
            id="yo-ja-hero-title"
            className="text-2xl font-semibold leading-tight tracking-tight text-[#0F6E56] sm:text-3xl"
          >
            <span lang="ja">{t(PAGE_TITLE, locale)}</span>
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/78 sm:text-base">
            {t(PAGE_SUBTITLE, locale)}
          </p>
          <div className="mt-5 space-y-4 text-sm leading-relaxed text-[#0F6E56]/85 sm:text-base">
            <p>{t(welcomeIntro, locale)}</p>
            <p className="rounded-2xl border border-[#F4B400]/40 bg-[#FFF4D6] p-4 text-sm leading-relaxed text-[#0F6E56]">
              {t(welcomeContract, locale)}
            </p>
          </div>
        </section>
      ),
    },
    {
      id: "numbers",
      kind: "mission",
      eyebrow: t(DECK_LABEL_NUMBERS, locale),
      title: t(DECK_TITLE_NUMBERS, locale),
      companionState: "map",
      content: (
        <section
          data-yo-japanese-intro-deck-screen="numbers"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <p className="text-sm leading-relaxed text-[#0F6E56]/75">
            {t(numbersLeadIn, locale)}
          </p>
          <JapaneseAudioChipList
            items={CORE_VOCAB_AUDIO_TARGETS}
            locale={locale}
          />
          <ul role="list" className="mt-6 grid gap-3 sm:grid-cols-3">
            {japaneseStats.map((stat) => (
              <li
                key={stat.id}
                className="rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
              >
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#1D9E75]">
                  {t(stat.label, locale)}
                </p>
                <p className="mt-1 text-lg font-semibold text-[#0F6E56]">
                  {t(stat.value, locale)}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#0F6E56]/75">
                  {t(stat.description, locale)}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-5 rounded-2xl border border-teal-100 bg-white/80 p-4 text-sm leading-relaxed text-[#0F6E56]/80 shadow-[0_1px_2px_rgba(15,58,52,0.04)]">
            {t(numbersTakeaway, locale)}
          </p>
        </section>
      ),
    },
    {
      id: "origin",
      kind: "culture",
      eyebrow: t(DECK_LABEL_ORIGIN, locale),
      title: t(DECK_TITLE_ORIGIN, locale),
      companionState: "map",
      content: (
        <section
          data-yo-japanese-intro-deck-screen="origin"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <p className="text-sm leading-relaxed text-[#0F6E56]/85 sm:text-base">
            {t(originIntro, locale)}
          </p>
          <JapaneseAudioChipList
            items={ORIGIN_READING_AUDIO_TARGETS}
            locale={locale}
          />
          <ul role="list" className="mt-5 grid gap-3 sm:grid-cols-3">
            {originPoints.map((point) => (
              <li
                key={point.id}
                className="rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
              >
                <p className="text-sm font-semibold text-[#0F6E56]">
                  {t(point.title, locale)}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[#0F6E56]/75">
                  {t(point.body, locale)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ),
    },
    {
      id: "writing",
      kind: "culture",
      eyebrow: t(DECK_LABEL_WRITING, locale),
      title: t(DECK_TITLE_WRITING, locale),
      companionState: "map",
      content: (
        <section
          data-yo-japanese-intro-deck-screen="writing"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <p className="text-sm leading-relaxed text-[#0F6E56]/85 sm:text-base">
            {t(writingIntro, locale)}
          </p>
          <ul role="list" className="mt-5 grid gap-3 sm:grid-cols-3">
            {writingSystems.map((system) => (
              <li
                key={system.id}
                className="rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
              >
                <div className="flex items-center gap-2">
                  <p className="text-xl font-semibold text-[#0F6E56]" lang="ja">
                    {system.nativeName}
                  </p>
                  <YoJapaneseAudioButton
                    text={system.nativeName}
                    locale={locale}
                    moduleId="japanese-intro"
                    lessonId="intro"
                    type="word"
                    accentProfile="japanese_standard"
                    speechLang="ja-JP"
                    size="xs"
                  />
                </div>
                <p className="mt-1 text-xs font-medium tracking-wide text-[#0F6E56]/65">
                  {system.romaji} · {t(system.label, locale)}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/80">
                  {t(system.description, locale)}
                </p>
                <div className="mt-3 rounded-xl bg-[#FFF8E1] px-3 py-2 text-sm">
                  <p className="text-[#0F6E56]" lang="ja">
                    {system.example.native}
                  </p>
                  <p className="mt-1 text-xs text-[#0F6E56]/60">
                    {system.example.romaji}
                  </p>
                </div>
                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-[#1D9E75]">
                  {t(system.size, locale)}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-5 space-y-3">
            <JapaneseAudioChipList
              items={WRITING_EXTRA_AUDIO_TARGETS}
              locale={locale}
            />
            <p className="rounded-2xl border border-[#F4B400]/40 bg-[#FFF4D6] p-4 text-sm leading-relaxed text-[#0F6E56]">
              {t(romajiNote, locale)}
            </p>
            <p className="rounded-2xl border border-teal-100 bg-white/80 p-4 text-sm leading-relaxed text-[#0F6E56]/80 shadow-[0_1px_2px_rgba(15,58,52,0.04)]">
              {t(writingTakeaway, locale)}
            </p>
          </div>
        </section>
      ),
    },
    {
      id: "sound",
      kind: "culture",
      eyebrow: t(DECK_LABEL_SOUND, locale),
      title: t(DECK_TITLE_SOUND, locale),
      companionState: "map",
      content: (
        <section
          data-yo-japanese-intro-deck-screen="sound"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <p className="text-sm leading-relaxed text-[#0F6E56]/85 sm:text-base">
            {t(soundIntro, locale)}
          </p>
          <JapaneseAudioChipList
            items={GRAMMAR_AUDIO_TARGETS}
            locale={locale}
          />
          <ul role="list" className="mt-5 grid gap-3 sm:grid-cols-2">
            {soundPoints.map((point) => (
              <li
                key={point.id}
                className="rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
              >
                <p className="text-sm font-semibold text-[#0F6E56]">
                  {t(point.title, locale)}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/80">
                  {t(point.body, locale)}
                </p>
                {point.example ? (
                  <div className="mt-3 rounded-xl bg-[#DDF4F1]/60 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className="text-base font-semibold text-[#0F6E56]"
                        lang="ja"
                      >
                        {point.example.native}
                      </p>
                      <YoJapaneseAudioButton
                        text={point.example.native}
                        locale={locale}
                        moduleId="japanese-intro"
                        lessonId="intro"
                        type="sentence"
                        accentProfile="japanese_standard"
                        speechLang="ja-JP"
                        size="xs"
                      />
                    </div>
                    <p className="mt-1 text-xs text-[#0F6E56]/60">
                      {point.example.romaji}
                    </p>
                    <p className="mt-1 text-xs text-[#0F6E56]/75">
                      {t(point.example.gloss, locale)}
                    </p>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="mt-5 rounded-2xl border border-teal-100 bg-white/80 p-4 text-sm leading-relaxed text-[#0F6E56]/80 shadow-[0_1px_2px_rgba(15,58,52,0.04)]">
            {t(soundTakeaway, locale)}
          </p>
        </section>
      ),
    },
    {
      id: "politeness",
      kind: "phrase",
      eyebrow: t(DECK_LABEL_POLITENESS, locale),
      title: t(DECK_TITLE_POLITENESS, locale),
      helperText: t(DECK_HELPER_POLITENESS, locale),
      companionState: "map",
      content: (
        <section
          data-yo-japanese-intro-deck-screen="politeness"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <p className="text-sm leading-relaxed text-[#0F6E56]/75">
            {t(politenessIntro, locale)}
          </p>
          {(["greetings", "core", "introductions", "leaving"] as const).map(
            (groupId) => {
              const items = politenessPhrases.filter((p) => p.group === groupId);
              if (items.length === 0) return null;
              return (
                <div key={groupId} className="mt-6">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1D9E75]">
                    {t(politenessGroupLabels[groupId], locale)}
                  </p>
                  <ul role="list" className="mt-3 grid gap-3 sm:grid-cols-2">
                    {items.map((phrase) => (
                      <li
                        key={phrase.id}
                        className="rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className="text-base font-semibold text-[#0F6E56]"
                            lang="ja"
                          >
                            {phrase.target}
                          </p>
                          <YoJapaneseAudioButton
                            text={phrase.target}
                            locale={locale}
                            moduleId="japanese-intro"
                            lessonId="intro"
                            type={getJapaneseAudioType(phrase.target)}
                            accentProfile="japanese_standard"
                            speechLang="ja-JP"
                            size="xs"
                          />
                        </div>
                        <p className="mt-1 text-xs text-[#0F6E56]/55">
                          {phrase.romaji}
                        </p>
                        <p className="mt-1 text-sm text-[#0F6E56]/80">
                          {t(phrase.translation, locale)}
                        </p>
                        {phrase.hint ? (
                          <p className="mt-2 text-xs leading-relaxed text-[#0F6E56]/60">
                            {t(phrase.hint, locale)}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            },
          )}
        </section>
      ),
    },
    {
      id: "culture",
      kind: "culture",
      eyebrow: t(DECK_LABEL_CULTURE, locale),
      title: t(DECK_TITLE_CULTURE, locale),
      companionState: "map",
      content: (
        <section
          data-yo-japanese-intro-deck-screen="culture"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <p className="text-sm leading-relaxed text-[#0F6E56]/85 sm:text-base">
            {t(cultureIntro, locale)}
          </p>
          <ul role="list" className="mt-5 grid gap-3 sm:grid-cols-2">
            {culturalCodes.map((code) => (
              <li
                key={code.id}
                className="rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
              >
                <p className="text-sm font-semibold text-[#0F6E56]">
                  {t(code.title, locale)}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/80">
                  {t(code.body, locale)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ),
    },
    {
      id: "quiz",
      kind: "quiz",
      eyebrow: t(DECK_LABEL_QUIZ, locale),
      title: t(DECK_TITLE_QUIZ, locale),
      helperText: t(DECK_HELPER_QUIZ, locale),
      companionState: "confused",
      content: (
        <div
          data-yo-japanese-intro-deck-screen="quiz"
          className="mx-auto w-full max-w-3xl"
        >
          <YoQuizPreview questions={quizQuestions} locale={locale} />
        </div>
      ),
    },
    {
      id: "flashcards",
      kind: "practice",
      eyebrow: t(DECK_LABEL_FLASH, locale),
      title: t(DECK_TITLE_FLASH, locale),
      companionState: "map",
      content: (
        <section
          data-yo-japanese-intro-deck-screen="flashcards"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <p className="text-sm leading-relaxed text-[#0F6E56]/75">
            {locale === "fr"
              ? "Six paquets thématiques : la langue dans le monde, les systèmes d'écriture, la politesse essentielle, se présenter, partir, et concepts grammaticaux."
              : "Six thematic decks: language in the world, writing systems, core politeness, introductions, leaving, and grammar concepts."}
          </p>
          <ul role="list" className="mt-5 grid gap-3 sm:grid-cols-2">
            {flashcardGroups.map((group) => (
              <li
                key={group.id}
                className="rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
              >
                <p className="text-sm font-semibold text-[#0F6E56]">
                  {t(group.title, locale)}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-[#0F6E56]/70">
                  {t(group.description, locale)}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <YoFlashcardPreview
              cards={flashcards}
              locale={locale}
              speechLang="ja-JP"
              audioContext={{
                moduleId: "japanese-intro",
                lessonId: "intro",
                accentProfile: "japanese_standard",
                speechLang: "ja-JP",
              }}
            />
          </div>
        </section>
      ),
    },
    {
      id: "teacher",
      kind: "completion",
      eyebrow: t(DECK_LABEL_TEACHER, locale),
      title: t(DECK_TITLE_TEACHER, locale),
      companionState: "celebrating",
      content: (
        <section
          data-yo-japanese-intro-deck-screen="teacher"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <div className="relative overflow-hidden rounded-3xl border border-[#F4B400]/45 bg-gradient-to-br from-[#FFF4D6] via-white to-[#DDF4F1] p-6 shadow-[0_18px_44px_rgba(15,58,52,0.08)] sm:p-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#0F6E56] ring-1 ring-[#F4B400]/45">
              <GraduationCap className="size-3.5 text-[#F4B400]" aria-hidden />
              {t(DECK_LABEL_TEACHER, locale)}
            </span>
            <p className="mt-4 text-sm leading-relaxed text-[#0F6E56]/85 sm:text-base">
              {t(teacherBody, locale)}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={teacherHref}
                className="ds-btn-primary inline-flex items-center justify-center gap-2 text-center text-sm sm:text-base"
              >
                <MessageCircle className="size-4" aria-hidden />
                {t(teacherCta, locale)}
              </Link>
              <Link
                href={`/yo/langues${langSuffix}`}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#0F6E56]/25 bg-white px-5 py-3 text-sm font-bold text-[#0F6E56] transition hover:bg-[#F4FBF9]"
              >
                <BookOpen className="size-4" aria-hidden />
                {locale === "fr"
                  ? "Choisir une autre langue"
                  : "Choose another language"}
              </Link>
            </div>
          </div>
        </section>
      ),
    },
  ];

  return (
    <YoLessonDeck
      locale={locale}
      moduleLabel={t(meta.moduleLabel, locale)}
      backHref={backHref}
      toggleHref={toggleHref}
      screens={screens}
      enableTapNavigation
    />
  );
}
