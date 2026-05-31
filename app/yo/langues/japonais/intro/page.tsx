/**
 * YoPratiqo — Japonais · Intro
 *
 * Free, French-default orientation module designed for Quebec /
 * Canada audiences who are curious about Japanese — for travel,
 * culture, food, or a future of "I might want to study seriously."
 *
 * Composed of ten sections, server-rendered from
 * `lib/yo/japaneseIntro.ts`:
 *   1. Avant de commencer
 *   2. Le japonais en chiffres
 *   3. D'où vient le japonais?
 *   4. Les trois systèmes d'écriture (hiragana, katakana, kanji)
 *   5. Pourquoi le japonais sonne différent (SOV + particules)
 *   6. Tes premiers mots de politesse (audio)
 *   7. Codes culturels qui surprennent
 *   8. Quiz
 *   9. Cartes flash
 *   10. CTA — find a Japanese teacher
 *
 * Locale behaviour:
 *   - Default: FR.
 *   - `?lang=en` flips to English.
 *   - All Japanese target words/phrases render with `lang="ja"`.
 *
 * Audio:
 *   - Pronunciation served via `YoJapaneseAudioButton`, which prefers
 *     a pre-generated MP3 from Supabase Storage `yopratiqo-audio`
 *     (resolved through the manifest with
 *     `accentProfile="japanese_standard"`) and falls back to
 *     on-device Web Speech (`ja-JP`) only when an item is missing.
 *   - No OpenAI calls from the browser. No per-row API keys. The
 *     bucket URL is the public `NEXT_PUBLIC_SUPABASE_URL`.
 *
 * No Stripe, no Supabase, no payment math, no checkout, no migration,
 * no RLS policy, no marketplace logic.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  Compass,
  GraduationCap,
  HeartHandshake,
  Languages,
  PenTool,
  Sparkles,
  Sprout,
  Volume2,
} from "lucide-react";
import { SITE_URL } from "@/lib/seo/site";
import { buildYoLocaleHref, getYoLocale, lstr, t } from "@/lib/yo/localize";
import { japaneseIntro } from "@/lib/yo/japaneseIntro";
import { YoBreadcrumb } from "@/components/yo/YoBreadcrumb";
import { YoFlashcardPreview } from "@/components/yo/YoFlashcardPreview";
import { YoQuizPreview } from "@/components/yo/YoQuizPreview";
import { YoJapaneseAudioButton } from "@/components/yo/YoJapaneseAudioButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "YoPratiqo — Intro au japonais · Gratuit",
  description:
    "La langue de Tokyo, des temples, et du Japon que tu rêves de découvrir. Une intro premium gratuite pour comprendre les bases sans paniquer sur les kanji.",
  alternates: {
    canonical: `${SITE_URL}/yo/langues/japonais/intro`,
  },
  openGraph: {
    title: "YoPratiqo — Intro au japonais",
    description:
      "Première leçon gratuite : chiffres, écriture, grammaire, politesse, codes culturels, quiz et flashcards.",
    type: "website",
    url: `${SITE_URL}/yo/langues/japonais/intro`,
    locale: "fr_CA",
  },
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ lang?: string | string[] }>;
}

const PAGE_LABEL = lstr("Intro gratuite", "Free intro");

const PAGE_TITLE = lstr("Intro — 日本語", "Intro — 日本語");

const PAGE_SUBTITLE = lstr(
  "La langue de Tokyo, des temples, et du Japon que tu rêves de découvrir.",
  "The language of Tokyo, temples, and the Japan you dream about exploring.",
);

const SECTION_LABELS = {
  welcome: lstr("Avant de commencer", "Before we begin"),
  numbers: lstr("Le japonais en chiffres", "Japanese in numbers"),
  origin: lstr("D'où vient le japonais", "Where Japanese comes from"),
  writing: lstr("Les trois systèmes d'écriture", "The three writing systems"),
  sound: lstr("Pourquoi le japonais sonne différent", "Why Japanese sounds different"),
  politeness: lstr("Tes premiers mots de politesse", "Your first politeness phrases"),
  culture: lstr("Codes culturels", "Cultural codes"),
  quiz: lstr("Quiz", "Quiz"),
  flashcards: lstr("Cartes flash", "Flashcards"),
  teacher: lstr("Pratique avec un prof", "Practice with a teacher"),
} as const;

const SECTION_TITLES = {
  welcome: lstr(
    "Avant de commencer",
    "Before we begin",
  ),
  numbers: lstr(
    "Le japonais en chiffres",
    "Japanese in numbers",
  ),
  origin: lstr(
    "D'où vient le japonais?",
    "Where does Japanese come from?",
  ),
  writing: lstr(
    "Les trois systèmes d'écriture",
    "The three writing systems",
  ),
  sound: lstr(
    "Pourquoi le japonais sonne différent",
    "Why Japanese sounds different",
  ),
  politeness: lstr(
    "Tes premiers mots de politesse",
    "Your first politeness phrases",
  ),
  culture: lstr(
    "Codes culturels qui surprennent",
    "Cultural codes that surprise newcomers",
  ),
  teacher: lstr(
    "Pratique avec un vrai prof de japonais",
    "Practice with a real Japanese teacher",
  ),
} as const;

export default async function YoJapaneseIntroPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = getYoLocale(resolvedSearchParams.lang);
  const langSuffix = locale === "en" ? "?lang=en" : "";
  const toggleHref = buildYoLocaleHref(
    "/yo/langues/japonais/intro",
    locale === "fr" ? "en" : "fr",
  );

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

  return (
    <div className="min-h-[100dvh] bg-[#FAFCFB] text-[#0F6E56]">
      <main id="main-content" className="flex flex-col pb-20">
        <YoBreadcrumb
          items={[
            { label: lstr("YoPratiqo", "YoPratiqo"), href: `/yo${langSuffix}` },
            { label: lstr("Langues", "Languages"), href: `/yo/langues${langSuffix}` },
            { label: lstr("Japonais", "Japanese") },
          ]}
          locale={locale}
        />

        {/* Hero */}
        <section
          aria-labelledby="yo-ja-hero-title"
          className="relative overflow-hidden"
        >
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(188,0,45,0.16),transparent_30%),radial-gradient(circle_at_86%_18%,rgba(244,180,0,0.14),transparent_32%),linear-gradient(180deg,#fffaf0_0%,#fff4d6_45%,#ddf4f1_100%)]"
          />
          <div className="relative mx-auto flex max-w-5xl flex-col gap-4 px-5 pt-10 pb-10 sm:px-8 sm:pt-12 sm:pb-14">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#F4B400]/45 bg-white/80 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-[#0F6E56]">
                <Sparkles className="size-3.5 text-[#F4B400]" aria-hidden />
                {t(PAGE_LABEL, locale)}
              </span>
              <Link
                href={toggleHref}
                className="rounded-full border border-[#0F6E56]/15 bg-white/80 px-3 py-1.5 text-xs font-bold text-[#0F6E56] transition hover:bg-white"
              >
                {locale === "fr" ? "View in English" : "Voir en français"}
              </Link>
            </div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#1D9E75]">
              {locale === "fr" ? "YoPratiqo · Japonais" : "YoPratiqo · Japanese"}
            </p>
            <h1
              id="yo-ja-hero-title"
              className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-[#0F6E56] sm:text-4xl lg:text-[2.75rem]"
            >
              <span lang="ja">{t(PAGE_TITLE, locale)}</span>
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-[#0F6E56]/78 sm:text-lg">
              {t(PAGE_SUBTITLE, locale)}
            </p>
          </div>
        </section>

        {/* 1) Avant de commencer */}
        <section
          aria-labelledby="yo-ja-welcome-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]">
            {t(SECTION_LABELS.welcome, locale)}
          </span>
          <h2
            id="yo-ja-welcome-title"
            className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            <HeartHandshake className="size-5 text-[#1D9E75]" aria-hidden />
            {t(SECTION_TITLES.welcome, locale)}
          </h2>
          <div className="mt-4 max-w-3xl space-y-4 text-base leading-relaxed text-[#0F6E56]/85">
            <p>{t(welcomeIntro, locale)}</p>
            <p className="rounded-2xl border border-[#F4B400]/40 bg-[#FFF4D6] p-4 text-sm leading-relaxed text-[#0F6E56]">
              {t(welcomeContract, locale)}
            </p>
          </div>
        </section>

        {/* 2) Le japonais en chiffres */}
        <section
          aria-labelledby="yo-ja-numbers-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]">
            {t(SECTION_LABELS.numbers, locale)}
          </span>
          <h2
            id="yo-ja-numbers-title"
            className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            <Compass className="size-5 text-[#1D9E75]" aria-hidden />
            {t(SECTION_TITLES.numbers, locale)}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#0F6E56]/75">
            {t(numbersLeadIn, locale)}
          </p>
          <ul role="list" className="mt-6 grid gap-4 sm:grid-cols-3">
            {japaneseStats.map((stat) => (
              <li
                key={stat.id}
                className="rounded-2xl border border-teal-100 bg-white p-5 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
              >
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#1D9E75]">
                  {t(stat.label, locale)}
                </p>
                <p className="mt-2 text-xl font-semibold text-[#0F6E56]">
                  {t(stat.value, locale)}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/75">
                  {t(stat.description, locale)}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-3xl rounded-2xl border border-teal-100 bg-white/80 p-4 text-sm leading-relaxed text-[#0F6E56]/80 shadow-[0_1px_2px_rgba(15,58,52,0.04)]">
            {t(numbersTakeaway, locale)}
          </p>
        </section>

        {/* 3) D'où vient le japonais? */}
        <section
          aria-labelledby="yo-ja-origin-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]">
            {t(SECTION_LABELS.origin, locale)}
          </span>
          <h2
            id="yo-ja-origin-title"
            className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            <Sprout className="size-5 text-[#1D9E75]" aria-hidden />
            {t(SECTION_TITLES.origin, locale)}
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-[#0F6E56]/85">
            {t(originIntro, locale)}
          </p>
          <ul role="list" className="mt-6 grid gap-4 sm:grid-cols-3">
            {originPoints.map((point) => (
              <li
                key={point.id}
                className="rounded-2xl border border-teal-100 bg-white p-5 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
              >
                <p className="text-sm font-semibold text-[#0F6E56]">
                  {t(point.title, locale)}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/75">
                  {t(point.body, locale)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* 4) Les trois systèmes d'écriture */}
        <section
          aria-labelledby="yo-ja-writing-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]">
            {t(SECTION_LABELS.writing, locale)}
          </span>
          <h2
            id="yo-ja-writing-title"
            className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            <PenTool className="size-5 text-[#1D9E75]" aria-hidden />
            {t(SECTION_TITLES.writing, locale)}
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-[#0F6E56]/85">
            {t(writingIntro, locale)}
          </p>
          <ul role="list" className="mt-6 grid gap-4 lg:grid-cols-3">
            {writingSystems.map((system) => (
              <li
                key={system.id}
                className="rounded-2xl border border-teal-100 bg-white p-5 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
              >
                <div className="flex items-center gap-3">
                  <p
                    className="text-2xl font-semibold text-[#0F6E56]"
                    lang="ja"
                  >
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
                <p className="mt-3 text-sm leading-relaxed text-[#0F6E56]/80">
                  {t(system.description, locale)}
                </p>
                <div className="mt-4 rounded-xl bg-[#FFF8E1] px-3 py-2 text-sm">
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
          <div className="mt-6 max-w-3xl space-y-4">
            <p className="rounded-2xl border border-[#F4B400]/40 bg-[#FFF4D6] p-4 text-sm leading-relaxed text-[#0F6E56]">
              {t(romajiNote, locale)}
            </p>
            <p className="rounded-2xl border border-teal-100 bg-white/80 p-4 text-sm leading-relaxed text-[#0F6E56]/80 shadow-[0_1px_2px_rgba(15,58,52,0.04)]">
              {t(writingTakeaway, locale)}
            </p>
          </div>
        </section>

        {/* 5) Pourquoi le japonais sonne différent */}
        <section
          aria-labelledby="yo-ja-sound-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]">
            {t(SECTION_LABELS.sound, locale)}
          </span>
          <h2
            id="yo-ja-sound-title"
            className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            <Languages className="size-5 text-[#1D9E75]" aria-hidden />
            {t(SECTION_TITLES.sound, locale)}
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-[#0F6E56]/85">
            {t(soundIntro, locale)}
          </p>
          <ul role="list" className="mt-6 grid gap-4 sm:grid-cols-2">
            {soundPoints.map((point) => (
              <li
                key={point.id}
                className="rounded-2xl border border-teal-100 bg-white p-5 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
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
          <p className="mt-6 max-w-3xl rounded-2xl border border-teal-100 bg-white/80 p-4 text-sm leading-relaxed text-[#0F6E56]/80 shadow-[0_1px_2px_rgba(15,58,52,0.04)]">
            {t(soundTakeaway, locale)}
          </p>
        </section>

        {/* 6) Tes premiers mots de politesse */}
        <section
          aria-labelledby="yo-ja-politeness-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]">
            {t(SECTION_LABELS.politeness, locale)}
          </span>
          <h2
            id="yo-ja-politeness-title"
            className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            <Volume2 className="size-5 text-[#1D9E75]" aria-hidden />
            {t(SECTION_TITLES.politeness, locale)}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#0F6E56]/75">
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

        {/* 7) Codes culturels */}
        <section
          aria-labelledby="yo-ja-culture-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]">
            {t(SECTION_LABELS.culture, locale)}
          </span>
          <h2
            id="yo-ja-culture-title"
            className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            <BookOpen className="size-5 text-[#1D9E75]" aria-hidden />
            {t(SECTION_TITLES.culture, locale)}
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-[#0F6E56]/85">
            {t(cultureIntro, locale)}
          </p>
          <ul role="list" className="mt-6 grid gap-4 sm:grid-cols-2">
            {culturalCodes.map((code) => (
              <li
                key={code.id}
                className="rounded-2xl border border-teal-100 bg-white p-5 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
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

        {/* 8) Quiz */}
        <section
          aria-labelledby="yo-ja-quiz-title"
          className="pt-2"
        >
          <h2 id="yo-ja-quiz-title" className="sr-only">
            {t(SECTION_LABELS.quiz, locale)}
          </h2>
          <YoQuizPreview questions={quizQuestions} locale={locale} />
        </section>

        {/* 9) Flashcards */}
        <section
          aria-labelledby="yo-ja-flashcards-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]">
            {t(SECTION_LABELS.flashcards, locale)}
          </span>
          <h2
            id="yo-ja-flashcards-title"
            className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            <GraduationCap className="size-5 text-[#1D9E75]" aria-hidden />
            {locale === "fr"
              ? "Tout le vocabulaire en un coup d'œil"
              : "All the vocabulary at a glance"}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#0F6E56]/75">
            {locale === "fr"
              ? "Six paquets thématiques : la langue dans le monde, les systèmes d'écriture, la politesse essentielle, se présenter, partir, et concepts grammaticaux. Audio inclus, prononciation standard."
              : "Six thematic decks: language in the world, writing systems, core politeness, introductions, leaving, and grammar concepts. Audio included, standard pronunciation."}
          </p>
          <ul role="list" className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#1D9E75]">
                  {group.cards.length}{" "}
                  {locale === "fr" ? "cartes" : "cards"}
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

        {/* 10) Teacher CTA */}
        <section
          aria-labelledby="yo-ja-teacher-title"
          className="mx-auto w-full max-w-5xl px-5 pt-12 sm:px-8 sm:pt-16"
        >
          <div className="flex flex-col items-start gap-4 rounded-3xl border border-[#F4B400]/45 bg-gradient-to-br from-[#FFF4D6] via-white to-[#DDF4F1] p-6 shadow-[0_1px_2px_rgba(15,58,52,0.04)] sm:p-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#0F6E56] ring-1 ring-[#F4B400]/45">
              <GraduationCap className="size-3.5 text-[#F4B400]" aria-hidden />
              {t(SECTION_LABELS.teacher, locale)}
            </span>
            <h2
              id="yo-ja-teacher-title"
              className="text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
            >
              {t(SECTION_TITLES.teacher, locale)}
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-[#0F6E56]/85">
              {t(teacherBody, locale)}
            </p>
            <Link
              href={`/trouver-un-prof${langSuffix}`}
              className="ds-btn-primary inline-flex items-center justify-center gap-2 text-center text-sm sm:text-base"
            >
              {t(teacherCta, locale)}
              <span aria-hidden>→</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
