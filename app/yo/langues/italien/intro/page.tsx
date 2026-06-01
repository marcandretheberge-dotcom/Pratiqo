/**
 * YoPratiqo — Italiano · Intro
 *
 * Free, French-default orientation module for learners curious about
 * Italian. The audience is the Quebec / Canada base, so the page
 * defaults to French and exposes English via `?lang=en`.
 *
 * Composed of nine sections, server-rendered from
 * `lib/yo/italianIntro.ts`:
 *   1. Avant de commencer (welcome)
 *   2. L'italien en chiffres (numbers)
 *   3. D'où vient l'italien? (origin)
 *   4. Les régions italiennes (regions)
 *   5. Un italien, mille Italiens (dialects)
 *   6. Tes premiers mots (first words, with audio)
 *   7. Quiz (reuses YoQuizPreview)
 *   8. Cartes flash (reuses YoFlashcardPreview)
 *   9. CTA — find an Italian teacher
 *
 * Locale behaviour:
 *   - Default: FR.
 *   - `?lang=en` flips to English.
 *   - All Italian target words render with `lang="it"`.
 *
 * Audio:
 *   - Pronunciation served via `YoItalianAudioButton`, which prefers
 *     a pre-generated MP3 from Supabase Storage `yopratiqo-audio`
 *     (resolved through the manifest with
 *     `accentProfile="italian_standard"`) and falls back to on-device
 *     Web Speech (`it-IT`) only when an item is missing.
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
  Globe2,
  GraduationCap,
  Languages,
  MapPin,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { buildYoLocaleHref, getYoLocale, lstr, t } from "@/lib/yo/localize";
import { buildYoPratiqoMetadata } from "@/lib/yo/yopratiqoSeo";
import type { YoLocale } from "@/lib/yo/types";
import { italianIntro } from "@/lib/yo/italianIntro";
import { YoBreadcrumb } from "@/components/yo/YoBreadcrumb";
import { YoFlashcardPreview } from "@/components/yo/YoFlashcardPreview";
import { YoQuizPreview } from "@/components/yo/YoQuizPreview";
import { YoItalianAudioButton } from "@/components/yo/YoItalianAudioButton";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string | string[] }>;
}): Promise<Metadata> {
  const params = await searchParams;
  return buildYoPratiqoMetadata("italianIntro", params.lang);
}

interface PageProps {
  searchParams: Promise<{ lang?: string | string[] }>;
}

const PAGE_LABEL = lstr("Intro gratuite", "Free intro");

const PAGE_TITLE = lstr(
  "Intro — L’Italiano",
  "Intro — L’Italiano",
);

const PAGE_SUBTITLE = lstr(
  "La langue de Dante, de la cuisine, et de mille collines.",
  "The language of Dante, of cuisine, and of a thousand hills.",
);

const SECTION_LABELS = {
  welcome: lstr("Avant de commencer", "Before we begin"),
  stats: lstr("L’italien en chiffres", "Italian in numbers"),
  origin: lstr("D’où vient l’italien ?", "Where does Italian come from?"),
  regions: lstr("Les régions italiennes", "The Italian regions"),
  dialects: lstr("Un italien, mille Italiens", "One Italian, a thousand Italians"),
  firstWords: lstr("Tes premiers mots", "Your first words"),
  quiz: lstr("Quiz", "Quiz"),
  flashcards: lstr("Cartes flash", "Flashcards"),
  teacher: lstr("Pratique avec un prof", "Practice with a teacher"),
} as const;

const SECTION_TITLES = {
  welcome: lstr(
    "Une langue chaude, claire, musicale — sans le mythe.",
    "A warm, clear, musical language — without the myth.",
  ),
  stats: lstr(
    "Quelques repères pour situer la langue",
    "A few landmarks to situate the language",
  ),
  origin: lstr(
    "De Dante à la radio — comment l’italien standard est né",
    "From Dante to radio — how standard Italian was born",
  ),
  regions: lstr(
    "Trois grandes zones, vingt régions, mille saveurs",
    "Three big zones, twenty regions, a thousand flavours",
  ),
  dialects: lstr(
    "L’italien standard, et tout le reste",
    "Standard Italian, and everything else",
  ),
  firstWords: lstr(
    "Les premiers mots qui ouvrent les portes",
    "The first words that open doors",
  ),
  teacher: lstr(
    "Pratique avec un vrai prof d’italien",
    "Practice with a real Italian teacher",
  ),
} as const;

export default async function YoItalianIntroPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = getYoLocale(resolvedSearchParams.lang);
  const langSuffix = locale === "en" ? "?lang=en" : "";
  const toggleHref = buildYoLocaleHref(
    "/yo/langues/italien/intro",
    locale === "fr" ? "en" : "fr",
  );

  const {
    welcomeIntro,
    welcomePromise,
    welcomeCulturalNote,
    italianStatsLeadIn,
    italianStats,
    originIntro,
    originBeats,
    regionsLeadIn,
    regionGroups,
    dialectIntro,
    dialectStrategicNote,
    dialectExamplesIntro,
    dialectExamples,
    firstWordsIntro,
    firstWords,
    firstWordsGroupLabels,
    quizQuestions,
    flashcardGroups,
    flashcards,
    teacherBody,
    teacherCta,
  } = italianIntro;

  return (
    <div className="min-h-[100dvh] bg-[#FAFCFB] text-[#0F6E56]">
      <main id="main-content" className="flex flex-col pb-20">
        <YoBreadcrumb
          items={[
            { label: lstr("YoPratiqo", "YoPratiqo"), href: `/yo${langSuffix}` },
            { label: lstr("Langues", "Languages"), href: `/yo/langues${langSuffix}` },
            { label: lstr("Italien", "Italian") },
          ]}
          locale={locale}
        />

        {/* Hero */}
        <section
          aria-labelledby="yo-it-hero-title"
          className="relative overflow-hidden"
        >
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(0,146,70,0.16),transparent_30%),radial-gradient(circle_at_86%_18%,rgba(206,43,55,0.14),transparent_32%),linear-gradient(180deg,#fffaf0_0%,#fff4d6_45%,#ddf4f1_100%)]"
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
              {locale === "fr" ? "YoPratiqo · Italien" : "YoPratiqo · Italian"}
            </p>
            <h1
              id="yo-it-hero-title"
              className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-[#0F6E56] sm:text-4xl lg:text-[2.75rem]"
            >
              {t(PAGE_TITLE, locale)}
            </h1>
            <p
              className="max-w-2xl text-base leading-relaxed text-[#0F6E56]/78 sm:text-lg"
              lang="it"
            >
              {t(PAGE_SUBTITLE, locale)}
            </p>
          </div>
        </section>

        {/* 1) Avant de commencer */}
        <section
          aria-labelledby="yo-it-welcome-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]">
            {t(SECTION_LABELS.welcome, locale)}
          </span>
          <h2
            id="yo-it-welcome-title"
            className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            <Sparkles className="size-5 text-[#1D9E75]" aria-hidden />
            {t(SECTION_TITLES.welcome, locale)}
          </h2>
          <div className="mt-4 max-w-3xl space-y-4 text-base leading-relaxed text-[#0F6E56]/85">
            <p>{t(welcomeIntro, locale)}</p>
            <p>{t(welcomePromise, locale)}</p>
            <p className="rounded-2xl border border-teal-100 bg-white/80 p-4 text-sm leading-relaxed text-[#0F6E56]/75 shadow-[0_1px_2px_rgba(15,58,52,0.04)]">
              {t(welcomeCulturalNote, locale)}
            </p>
          </div>
        </section>

        {/* 2) L'italien en chiffres */}
        <section
          aria-labelledby="yo-it-stats-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]">
            {t(SECTION_LABELS.stats, locale)}
          </span>
          <h2
            id="yo-it-stats-title"
            className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            <Globe2 className="size-5 text-[#1D9E75]" aria-hidden />
            {t(SECTION_TITLES.stats, locale)}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#0F6E56]/75">
            {t(italianStatsLeadIn, locale)}
          </p>
          <ul role="list" className="mt-6 grid gap-4 sm:grid-cols-3">
            {italianStats.map((stat) => (
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
        </section>

        {/* 3) D'où vient l'italien ? */}
        <section
          aria-labelledby="yo-it-origin-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]">
            {t(SECTION_LABELS.origin, locale)}
          </span>
          <h2
            id="yo-it-origin-title"
            className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            <BookOpen className="size-5 text-[#1D9E75]" aria-hidden />
            {t(SECTION_TITLES.origin, locale)}
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-[#0F6E56]/85">
            {t(originIntro, locale)}
          </p>
          <ol role="list" className="mt-6 space-y-3">
            {originBeats.map((beat, index) => (
              <li
                key={beat.id}
                className="flex gap-4 rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
              >
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#FFF4D6] text-sm font-black text-[#0F6E56]"
                >
                  {index + 1}
                </span>
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#1D9E75]">
                    {t(beat.era, locale)}
                  </p>
                  <p className="text-sm leading-relaxed text-[#0F6E56]/85">
                    {t(beat.body, locale)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* 4) Les régions italiennes */}
        <section
          aria-labelledby="yo-it-regions-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]">
            {t(SECTION_LABELS.regions, locale)}
          </span>
          <h2
            id="yo-it-regions-title"
            className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            <MapPin className="size-5 text-[#1D9E75]" aria-hidden />
            {t(SECTION_TITLES.regions, locale)}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#0F6E56]/75">
            {t(regionsLeadIn, locale)}
          </p>
          <ul role="list" className="mt-6 grid gap-4 sm:grid-cols-3">
            {regionGroups.map((group) => (
              <li
                key={group.id}
                className="rounded-2xl border border-teal-100 bg-white p-5 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
              >
                <p className="text-base font-semibold text-[#0F6E56]">
                  {t(group.name, locale)}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/80">
                  {t(group.description, locale)}
                </p>
                <p
                  className="mt-3 text-xs font-medium leading-relaxed text-[#0F6E56]/65"
                  lang="it"
                >
                  {t(group.examples, locale)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* 5) Un italien, mille Italiens */}
        <section
          aria-labelledby="yo-it-dialects-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]">
            {t(SECTION_LABELS.dialects, locale)}
          </span>
          <h2
            id="yo-it-dialects-title"
            className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            <Languages className="size-5 text-[#1D9E75]" aria-hidden />
            {t(SECTION_TITLES.dialects, locale)}
          </h2>
          <div className="mt-4 max-w-3xl space-y-4 text-base leading-relaxed text-[#0F6E56]/85">
            <p>{t(dialectIntro, locale)}</p>
            <p className="rounded-2xl border border-[#F4B400]/40 bg-[#FFF4D6] p-4 text-sm leading-relaxed text-[#0F6E56]">
              <span className="font-semibold">
                {locale === "fr" ? "À retenir : " : "Key takeaway: "}
              </span>
              {t(dialectStrategicNote, locale)}
            </p>
          </div>
          <p className="mt-6 max-w-3xl text-sm leading-relaxed text-[#0F6E56]/75">
            {t(dialectExamplesIntro, locale)}
          </p>
          <ul role="list" className="mt-3 grid gap-3 sm:grid-cols-2">
            {dialectExamples.map((example) => (
              <li
                key={example.id}
                className="rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
              >
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#1D9E75]">
                  {t(example.meaning, locale)}
                </p>
                <p
                  className="mt-2 text-base font-semibold text-[#0F6E56]"
                  lang="it"
                >
                  {example.standard}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#0F6E56]/70">
                  {t(example.regional, locale)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* 6) Tes premiers mots */}
        <section
          aria-labelledby="yo-it-first-words-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]">
            {t(SECTION_LABELS.firstWords, locale)}
          </span>
          <h2
            id="yo-it-first-words-title"
            className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            <MessageCircle className="size-5 text-[#1D9E75]" aria-hidden />
            {t(SECTION_TITLES.firstWords, locale)}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#0F6E56]/75">
            {t(firstWordsIntro, locale)}
          </p>
          {(["greetings", "courtesy", "useful"] as const).map((groupId) => {
            const items = firstWords.filter((word) => word.group === groupId);
            if (items.length === 0) return null;
            return (
              <div key={groupId} className="mt-6">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1D9E75]">
                  {t(firstWordsGroupLabels[groupId], locale)}
                </p>
                <ul role="list" className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((word) => (
                    <li
                      key={word.id}
                      className="rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className="text-lg font-semibold text-[#0F6E56]"
                          lang="it"
                        >
                          {word.target}
                        </p>
                        <YoItalianAudioButton
                          text={word.target}
                          locale={locale}
                          moduleId="italian-intro"
                          lessonId="intro"
                          accentProfile="italian_standard"
                          speechLang="it-IT"
                          size="xs"
                        />
                      </div>
                      <p className="mt-1 text-sm text-[#0F6E56]/80">
                        {t(word.translation, locale)}
                      </p>
                      {word.hint ? (
                        <p className="mt-2 text-xs leading-relaxed text-[#0F6E56]/60">
                          {t(word.hint, locale)}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>

        {/* 7) Quiz */}
        <section
          aria-labelledby="yo-it-quiz-title"
          className="pt-2"
        >
          <h2 id="yo-it-quiz-title" className="sr-only">
            {t(SECTION_LABELS.quiz, locale)}
          </h2>
          <YoQuizPreview questions={quizQuestions} locale={locale} />
        </section>

        {/* 8) Flashcards */}
        <section
          aria-labelledby="yo-it-flashcards-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]">
            {t(SECTION_LABELS.flashcards, locale)}
          </span>
          <h2
            id="yo-it-flashcards-title"
            className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            <Compass className="size-5 text-[#1D9E75]" aria-hidden />
            {locale === "fr"
              ? "Tout le vocabulaire en un coup d’œil"
              : "All the vocabulary at a glance"}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#0F6E56]/75">
            {locale === "fr"
              ? "Six paquets thématiques : la langue dans le monde, l’histoire, les régions, la politesse, les mots-outils, le voyage. Audio inclus, prononciation italienne standard."
              : "Six thematic decks: the language in the world, history, regions, courtesy, useful expressions, travel. Audio included, standard Italian pronunciation."}
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
              speechLang="it-IT"
              audioContext={{
                moduleId: "italian-intro",
                lessonId: "intro",
                accentProfile: "italian_standard",
                speechLang: "it-IT",
              }}
            />
          </div>
        </section>

        {/* 9) Teacher CTA */}
        <section
          aria-labelledby="yo-it-teacher-title"
          className="mx-auto w-full max-w-5xl px-5 pt-12 sm:px-8 sm:pt-16"
        >
          <div className="flex flex-col items-start gap-4 rounded-3xl border border-[#F4B400]/45 bg-gradient-to-br from-[#FFF4D6] via-white to-[#DDF4F1] p-6 shadow-[0_1px_2px_rgba(15,58,52,0.04)] sm:p-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#0F6E56] ring-1 ring-[#F4B400]/45">
              <GraduationCap className="size-3.5 text-[#F4B400]" aria-hidden />
              {t(SECTION_LABELS.teacher, locale)}
            </span>
            <h2
              id="yo-it-teacher-title"
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
