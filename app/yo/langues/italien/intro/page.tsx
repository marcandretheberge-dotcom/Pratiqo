/**
 * YoPratiqo — Italiano · Intro (app-shell deck)
 *
 * Free, French-default orientation module for learners curious about
 * Italian. The page was a 9-section long-scroll surface with a
 * 3-level breadcrumb as primary navigation; this version composes
 * the SAME audited content into the shared `<YoLessonDeck />`
 * app-shell — the one the Dominican Republic Spanish path already
 * uses — so the surface feels like one focused screen at a time,
 * keeps companion presence on every screen, and removes the
 * breadcrumb-primary navigation per the all-language-intros brief.
 *
 * What is PRESERVED verbatim:
 *   - `italianIntro` data file (no field renamed, no row deleted).
 *   - `YoItalianAudioButton` integration with
 *     `accentProfile="italian_standard"` + `speechLang="it-IT"`.
 *   - `YoFlashcardPreview` autoplay + the `it-IT` audio context.
 *   - `YoQuizPreview` reveal-only contract.
 *   - Every Italian-target string still renders with `lang="it"`.
 *   - The teacher CTA still deep-links to
 *     `/trouver-un-prof?q=italien` via the shared meta helper.
 *
 * What is NEW:
 *   - Mounts inside `<YoLessonDeck />` (no-scroll viewport, swipe /
 *     tap / keyboard navigation, companion coach per screen, app
 *     header with Back-to-Languages arrow + YoPratiqo logo).
 *   - Per-screen companion states: `map` for context / vocab /
 *     culture, `confused` for the practice quiz, `celebrating` for
 *     the final teacher CTA.
 *
 * No Stripe, no Supabase, no payment math, no checkout, no
 * migration, no RLS policy, no Membre Pro / commission code, no
 * raw quiz answers, no AI summary, no audio-gen scripts.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  GraduationCap,
  Languages,
  MapPin,
  MessageCircle,
} from "lucide-react";

import { buildYoLocaleHref, getYoLocale, lstr, t } from "@/lib/yo/localize";
import { buildYoPratiqoMetadata } from "@/lib/yo/yopratiqoSeo";
import { italianIntro } from "@/lib/yo/italianIntro";
import { YoFlashcardPreview } from "@/components/yo/YoFlashcardPreview";
import { YoQuizPreview } from "@/components/yo/YoQuizPreview";
import { YoItalianAudioButton } from "@/components/yo/YoItalianAudioButton";
import { YoLessonDeck } from "@/components/yo/YoLessonDeck";
import type { YoLessonDeckScreen } from "@/lib/yo/lessonDeckTypes";
import { getYoLanguageIntroDeckMeta } from "@/lib/yo/languageIntroDecks";

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

const PAGE_TITLE = lstr("Intro — L’Italiano", "Intro — L’Italiano");

const PAGE_SUBTITLE = lstr(
  "La langue de Dante, de la cuisine, et de mille collines.",
  "The language of Dante, of cuisine, and of a thousand hills.",
);

// ─── Deck-screen labels (eyebrow / title / helperText) ──────────────────
const DECK_LABEL_WELCOME = lstr("Avant de commencer", "Before we begin");
const DECK_TITLE_WELCOME = lstr(
  "Une langue chaude, claire, musicale",
  "A warm, clear, musical language",
);
const DECK_HELPER_WELCOME = lstr(
  "Ton compagnon t’accompagne, un écran à la fois — balayage, tape ou flèches Back / Next.",
  "Your companion follows you one screen at a time — swipe, tap, or arrow keys.",
);

const DECK_LABEL_STATS = lstr("L’italien en chiffres", "Italian in numbers");
const DECK_TITLE_STATS = lstr(
  "Quelques repères pour situer la langue",
  "A few landmarks to situate the language",
);

const DECK_LABEL_ORIGIN = lstr(
  "D’où vient l’italien ?",
  "Where does Italian come from?",
);
const DECK_TITLE_ORIGIN = lstr(
  "De Dante à la radio",
  "From Dante to radio",
);

const DECK_LABEL_REGIONS = lstr("Les régions italiennes", "The Italian regions");
const DECK_TITLE_REGIONS = lstr(
  "Trois grandes zones, vingt régions, mille saveurs",
  "Three big zones, twenty regions, a thousand flavours",
);

const DECK_LABEL_DIALECTS = lstr(
  "Un italien, mille Italiens",
  "One Italian, a thousand Italians",
);
const DECK_TITLE_DIALECTS = lstr(
  "L’italien standard, et tout le reste",
  "Standard Italian, and everything else",
);

const DECK_LABEL_WORDS = lstr("Tes premiers mots", "Your first words");
const DECK_TITLE_WORDS = lstr(
  "Les premiers mots qui ouvrent les portes",
  "The first words that open doors",
);
const DECK_HELPER_WORDS = lstr(
  "Tape l’audio pour entendre la prononciation italienne standard.",
  "Tap the audio to hear standard Italian pronunciation.",
);

const DECK_LABEL_QUIZ = lstr("Mini quiz", "Mini quiz");
const DECK_TITLE_QUIZ = lstr(
  "Vérifie ton intro italienne",
  "Check your Italian intro",
);
const DECK_HELPER_QUIZ = lstr(
  "Cinq questions courtes. Aucune note, aucun jugement.",
  "Five short questions. No grade, no judgment.",
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
  "Pratique avec un vrai prof d’italien",
  "Practice with a real Italian teacher",
);

export default async function YoItalianIntroPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = getYoLocale(resolvedSearchParams.lang);
  const langSuffix = locale === "en" ? "?lang=en" : "";
  const toggleHref = buildYoLocaleHref(
    "/yo/langues/italien/intro",
    locale === "fr" ? "en" : "fr",
  );

  const meta = getYoLanguageIntroDeckMeta("italien");
  const backHref = `${meta.backRoute}${langSuffix}`;
  const teacherHref = `/trouver-un-prof?q=${meta.teacherSearchQuery}${
    locale === "en" ? "&lang=en" : ""
  }`;

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
          data-yo-italian-intro-deck-screen="welcome"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <h1
            id="yo-it-hero-title"
            className="text-2xl font-semibold leading-tight tracking-tight text-[#0F6E56] sm:text-3xl"
            lang="it"
          >
            {t(PAGE_TITLE, locale)}
          </h1>
          <p
            className="mt-2 text-sm leading-relaxed text-[#0F6E56]/78 sm:text-base"
            lang="it"
          >
            {t(PAGE_SUBTITLE, locale)}
          </p>
          <div className="mt-5 space-y-4 text-sm leading-relaxed text-[#0F6E56]/85 sm:text-base">
            <p>{t(welcomeIntro, locale)}</p>
            <p>{t(welcomePromise, locale)}</p>
            <p className="rounded-2xl border border-teal-100 bg-white/80 p-4 text-sm leading-relaxed text-[#0F6E56]/75 shadow-[0_1px_2px_rgba(15,58,52,0.04)]">
              {t(welcomeCulturalNote, locale)}
            </p>
          </div>
        </section>
      ),
    },
    {
      id: "stats",
      kind: "mission",
      eyebrow: t(DECK_LABEL_STATS, locale),
      title: t(DECK_TITLE_STATS, locale),
      companionState: "map",
      content: (
        <section
          data-yo-italian-intro-deck-screen="stats"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <p className="text-sm leading-relaxed text-[#0F6E56]/75">
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
          data-yo-italian-intro-deck-screen="origin"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <p className="text-sm leading-relaxed text-[#0F6E56]/85 sm:text-base">
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
      ),
    },
    {
      id: "regions",
      kind: "culture",
      eyebrow: t(DECK_LABEL_REGIONS, locale),
      title: t(DECK_TITLE_REGIONS, locale),
      companionState: "map",
      content: (
        <section
          data-yo-italian-intro-deck-screen="regions"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <p className="text-sm leading-relaxed text-[#0F6E56]/75">
            {t(regionsLeadIn, locale)}
          </p>
          <ul role="list" className="mt-6 grid gap-4 sm:grid-cols-3">
            {regionGroups.map((group) => (
              <li
                key={group.id}
                className="rounded-2xl border border-teal-100 bg-white p-5 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
              >
                <p className="text-base font-semibold text-[#0F6E56]">
                  <MapPin className="mr-1 inline size-4 text-[#1D9E75]" aria-hidden />
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
      ),
    },
    {
      id: "dialects",
      kind: "culture",
      eyebrow: t(DECK_LABEL_DIALECTS, locale),
      title: t(DECK_TITLE_DIALECTS, locale),
      companionState: "map",
      content: (
        <section
          data-yo-italian-intro-deck-screen="dialects"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <div className="space-y-4 text-sm leading-relaxed text-[#0F6E56]/85 sm:text-base">
            <p className="flex items-start gap-2">
              <Languages
                className="mt-0.5 size-5 shrink-0 text-[#1D9E75]"
                aria-hidden
              />
              <span>{t(dialectIntro, locale)}</span>
            </p>
            <p className="rounded-2xl border border-[#F4B400]/40 bg-[#FFF4D6] p-4 text-sm leading-relaxed text-[#0F6E56]">
              <span className="font-semibold">
                {locale === "fr" ? "À retenir : " : "Key takeaway: "}
              </span>
              {t(dialectStrategicNote, locale)}
            </p>
          </div>
          <p className="mt-6 text-sm leading-relaxed text-[#0F6E56]/75">
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
      ),
    },
    {
      id: "first-words",
      kind: "phrase",
      eyebrow: t(DECK_LABEL_WORDS, locale),
      title: t(DECK_TITLE_WORDS, locale),
      helperText: t(DECK_HELPER_WORDS, locale),
      companionState: "map",
      content: (
        <section
          data-yo-italian-intro-deck-screen="first-words"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <p className="text-sm leading-relaxed text-[#0F6E56]/75">
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
                <ul role="list" className="mt-3 grid gap-3 sm:grid-cols-2">
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
          data-yo-italian-intro-deck-screen="quiz"
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
          data-yo-italian-intro-deck-screen="flashcards"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <p className="text-sm leading-relaxed text-[#0F6E56]/75">
            {locale === "fr"
              ? "Six paquets thématiques : la langue dans le monde, l’histoire, les régions, la politesse, les mots-outils, le voyage. Audio inclus, prononciation italienne standard."
              : "Six thematic decks: the language in the world, history, regions, courtesy, useful expressions, travel. Audio included, standard Italian pronunciation."}
          </p>
          <ul role="list" className="mt-6 grid gap-3 sm:grid-cols-2">
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
          data-yo-italian-intro-deck-screen="teacher"
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
                href={buildYoLocaleHref("/yo/langues/italien/module-1", locale)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#245a46] px-5 py-3 text-sm font-bold text-white hover:bg-[#173d2e]"
              >
                <BookOpen className="size-4" aria-hidden />
                {t(lstr("Continuer : une matinée à Bologne", "Continue: a morning in Bologna", "Continuar: una mañana en Bolonia"), locale)}
              </Link>
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
