/**
 * YoPratiqo — Espagnol · Intro globale A1 (app-shell deck)
 *
 * Universal Spanish primer that sits *above* the country modules
 * in the new IA: YoPratiqo → Langues → Espagnol → Intro globale.
 *
 * The legacy long-scroll page with a 4-level breadcrumb is
 * replaced by the shared `<YoLessonDeck />` app-shell so the
 * experience is one focused screen at a time with companion
 * presence everywhere, matching the Dominican Republic deck.
 *
 * What is PRESERVED verbatim:
 *   - `spanishIntroA1` data file (world stats, origin timeline,
 *     regions, variations, universal first words, quiz,
 *     flashcards, reading section, coach options, destinations).
 *   - `YoSpanishAudioButton` integration with
 *     `accentProfile="latin_american_neutral"` + `speechLang="es-ES"`.
 *   - `YoReadingPreview` short A1 reading + reading quiz surface.
 *   - `YoCoachPanel` deterministic next-step recommendation.
 *   - `YoFlashcardPreview` autoplay + the `es-ES` audio context.
 *   - `YoQuizPreview` reveal-only contract.
 *   - The "destinations" picker that bridges into the Dominican
 *     Republic Course Home and other Spanish-speaking countries.
 *   - The YoPratiqo 12-month access + 30-day money-back trust
 *     strip (no Stripe checkout; legal link only).
 *   - Teacher CTA → `/trouver-un-prof`.
 *
 * What is NEW:
 *   - Mounts inside `<YoLessonDeck />` (viewport-locked, swipe /
 *     tap / keyboard navigation, app header with Back-to-Languages
 *     arrow + YoPratiqo logo).
 *   - Companion coach on every screen: `map` for context / vocab /
 *     destinations, `confused` for the practice quiz,
 *     `celebrating` for the final teacher CTA.
 *
 * No Stripe, no Supabase, no payment math, no checkout, no
 * migration, no RLS, no Membre Pro / commission code, no raw
 * quiz answers, no AI summary, no audio-gen scripts.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  Compass,
  GraduationCap,
  MessageCircle,
  Music2,
} from "lucide-react";

import { buildYoLocaleHref, getYoLocale, lstr, t } from "@/lib/yo/localize";
import { buildYoPratiqoMetadata } from "@/lib/yo/yopratiqoSeo";
import { spanishIntroA1 } from "@/lib/yo/spanishIntroA1";
import { YoCoachPanel } from "@/components/yo/YoCoachPanel";
import { YoFlashcardPreview } from "@/components/yo/YoFlashcardPreview";
import { YoQuizPreview } from "@/components/yo/YoQuizPreview";
import { YoReadingPreview } from "@/components/yo/YoReadingPreview";
import { YoSpanishAudioButton } from "@/components/yo/YoSpanishAudioButton";
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
  return buildYoPratiqoMetadata("spanishIntro", params.lang);
}

interface PageProps {
  searchParams: Promise<{ lang?: string | string[] }>;
}

const PAGE_TITLE = lstr("Intro — El Español", "Intro — El Español");

const PAGE_SUBTITLE = lstr(
  "La langue qui connecte un demi-milliard de personnes.",
  "The language that connects half a billion people.",
);

// ─── Deck-screen labels ─────────────────────────────────────────────────
const DECK_LABEL_WELCOME = lstr(
  "L’espagnol dans le monde",
  "Spanish in the world",
);
const DECK_TITLE_WELCOME = lstr(
  "Une langue qui voyage avec ses parlants",
  "A language that travels with its speakers",
);
const DECK_HELPER_WELCOME = lstr(
  "Un écran à la fois — balayage, tape ou flèches Back / Next.",
  "One screen at a time — swipe, tap, or arrow keys.",
);

const DECK_LABEL_ORIGIN = lstr(
  "D’où vient l’espagnol ?",
  "Where does Spanish come from?",
);
const DECK_TITLE_ORIGIN = lstr(
  "De Rome à 500 millions de voix",
  "From Rome to 500 million voices",
);

const DECK_LABEL_COUNTRIES = lstr(
  "Les pays hispanophones",
  "Spanish-speaking countries",
);
const DECK_TITLE_COUNTRIES = lstr(
  "L’espagnol s’étend sur quatre continents",
  "Spanish spans four continents",
);

const DECK_LABEL_VARIATIONS = lstr(
  "Pourquoi l’espagnol change selon le pays",
  "Why Spanish changes by country",
);
const DECK_TITLE_VARIATIONS = lstr(
  "Une langue, plusieurs musiques",
  "One language, many musics",
);

const DECK_LABEL_WORDS = lstr(
  "Tes premiers mots universels",
  "Your first universal words",
);
const DECK_TITLE_WORDS = lstr(
  "Les mots qui ouvrent toutes les portes",
  "The words that open every door",
);
const DECK_HELPER_WORDS = lstr(
  "Tape l’audio pour entendre la prononciation.",
  "Tap the audio to hear the pronunciation.",
);

const DECK_LABEL_READING = lstr("Lecture guidée", "Guided reading");
const DECK_TITLE_READING = lstr(
  "Un court texte A1 + mini-quiz de compréhension",
  "A short A1 text + comprehension mini-quiz",
);

const DECK_LABEL_QUIZ = lstr("Petit quiz culturel", "Short culture quiz");
const DECK_TITLE_QUIZ = lstr(
  "Vérifie ton intro espagnole",
  "Check your Spanish intro",
);
const DECK_HELPER_QUIZ = lstr(
  "Cinq questions courtes. Aucune note.",
  "Five short questions. No grade.",
);

const DECK_LABEL_FLASH = lstr("Flashcards universelles", "Universal flashcards");
const DECK_TITLE_FLASH = lstr(
  "Mémorise les essentiels",
  "Memorize the essentials",
);

const DECK_LABEL_COACH = lstr(
  "Coach YoPratiqo",
  "YoPratiqo Coach",
);
const DECK_TITLE_COACH = lstr(
  "Choisis ta prochaine étape",
  "Pick your next step",
);

const DECK_LABEL_DESTINATIONS = lstr(
  "Explore les cultures",
  "Explore the cultures",
);
const DECK_TITLE_DESTINATIONS = lstr(
  "Continue ton parcours en espagnol",
  "Continue your Spanish journey",
);

const DECK_LABEL_TEACHER = lstr(
  "Pont vers un professeur",
  "Bridge to a teacher",
);
const DECK_TITLE_TEACHER = lstr(
  "Pratique avec un vrai prof",
  "Practice with a real teacher",
);

const WORDS_BODY = lstr(
  "Ces mots fonctionnent dans tous les pays hispanophones. Ils sont ton billet d’entrée.",
  "These words work in every Spanish-speaking country. They are your entry ticket.",
);

const DESTINATIONS_BODY = lstr(
  "Un même espagnol relie des voix et des cultures variées. Découvre-les dans des situations concrètes.",
  "Spanish connects varied voices and cultures. Discover them through practical situations.",
);

const TEACHER_BODY = lstr(
  "Pratique avec un professeur d’espagnol Pratiqo — local d’ici ou natif du pays que tu veux visiter. Tu apprends d’abord avec ton compagnon, puis tu parles avec une vraie personne.",
  "Practice with a Pratiqo Spanish teacher — local to you or native to the country you want to visit. You learn first with your companion, then talk with a real person.",
);

const TEACHER_CTA = lstr(
  "Trouver un prof d’espagnol",
  "Find a Spanish teacher",
);

const twelveMonthAccessLabel = lstr("Accès 12 mois", "12-month access");
const moneyBackLabel = lstr(
  "30 jours satisfait ou remboursé",
  "30-day money-back",
);
const legalLinkLabel = lstr("Voir les conditions", "See the terms");

export default async function YoEspagnolIntroPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = getYoLocale(resolvedSearchParams.lang);
  const langSuffix = locale === "en" ? "?lang=en" : "";
  const toggleHref = buildYoLocaleHref(
    "/yo/langues/espagnol/intro",
    locale === "fr" ? "en" : "fr",
  );

  const meta = getYoLanguageIntroDeckMeta("espagnol-global");
  const backHref = `${meta.backRoute}${langSuffix}`;
  const teacherBridgeHref = `/trouver-un-prof${langSuffix}`;

  const {
    worldIntro,
    worldStats,
    originTimeline,
    regions,
    variations,
    universalWords,
    quizQuestions,
    flashcards,
    readingSection,
    coachOptions,
    destinations,
  } = spanishIntroA1;

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
          data-yo-spanish-intro-deck-screen="welcome"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <h1
            id="yo-spanish-intro-title"
            className="text-2xl font-semibold leading-tight tracking-tight text-[#0F6E56] sm:text-3xl"
            lang="es"
          >
            {t(PAGE_TITLE, locale)}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/78 sm:text-base">
            {t(PAGE_SUBTITLE, locale)}
          </p>
          <p className="mt-5 text-sm leading-relaxed text-[#0F6E56]/85 sm:text-base">
            {t(worldIntro, locale)}
          </p>
          <ul role="list" className="mt-5 grid gap-3 sm:grid-cols-2">
            {worldStats.map((stat) => (
              <li
                key={stat.id}
                className="flex flex-col gap-1 rounded-2xl border border-teal-100 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
              >
                <span className="text-xl font-semibold tracking-tight text-[#0F6E56] sm:text-2xl">
                  {t(stat.value, locale)}
                </span>
                <span className="text-xs leading-snug text-[#0F6E56]/70">
                  {t(stat.label, locale)}
                </span>
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
          data-yo-spanish-intro-deck-screen="origin"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <ol role="list" className="grid gap-3">
            {originTimeline.map((step) => (
              <li
                key={step.id}
                className="grid gap-2 rounded-2xl border border-teal-100 bg-white p-4 sm:grid-cols-[140px_1fr] sm:items-start sm:gap-4 sm:p-5"
              >
                <span className="text-xs font-black uppercase tracking-[0.14em] text-[#F4B400]">
                  {t(step.era, locale)}
                </span>
                <p className="text-sm leading-relaxed text-[#0F6E56]/80">
                  {t(step.description, locale)}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ),
    },
    {
      id: "countries",
      kind: "culture",
      eyebrow: t(DECK_LABEL_COUNTRIES, locale),
      title: t(DECK_TITLE_COUNTRIES, locale),
      companionState: "map",
      content: (
        <section
          data-yo-spanish-intro-deck-screen="countries"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {regions.map((region) => (
              <article
                key={region.id}
                className="rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)] sm:p-5"
              >
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0F6E56]/55">
                  {t(region.region, locale)}
                </p>
                <h3 className="mt-1 text-base font-semibold text-[#0F6E56] sm:text-lg">
                  {t(region.countries, locale)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/72">
                  {t(region.note, locale)}
                </p>
              </article>
            ))}
          </div>
        </section>
      ),
    },
    {
      id: "variations",
      kind: "culture",
      eyebrow: t(DECK_LABEL_VARIATIONS, locale),
      title: t(DECK_TITLE_VARIATIONS, locale),
      companionState: "map",
      content: (
        <section
          data-yo-spanish-intro-deck-screen="variations"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-[#0F6E56]">
            <Music2 className="size-4 text-[#1D9E75]" aria-hidden />
            <span>
              {locale === "fr"
                ? "Un patrimoine commun, plusieurs accents"
                : "One shared heritage, many accents"}
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {variations.map((variation) => (
              <article
                key={variation.id}
                className="rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)] sm:p-5"
              >
                <h3 className="text-base font-semibold text-[#0F6E56]">
                  {t(variation.title, locale)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/72">
                  {t(variation.body, locale)}
                </p>
                {variation.example ? (
                  <p
                    className="mt-3 rounded-xl bg-[#FFF4D6] px-3 py-2 text-sm font-semibold text-[#0F6E56]"
                    lang="es"
                  >
                    {variation.example}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ),
    },
    {
      id: "words",
      kind: "phrase",
      eyebrow: t(DECK_LABEL_WORDS, locale),
      title: t(DECK_TITLE_WORDS, locale),
      helperText: t(DECK_HELPER_WORDS, locale),
      companionState: "map",
      content: (
        <section
          data-yo-spanish-intro-deck-screen="words"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <p className="text-sm leading-relaxed text-[#0F6E56]/78">
            {t(WORDS_BODY, locale)}
          </p>
          <ul role="list" className="mt-5 grid gap-3 sm:grid-cols-2">
            {universalWords.map((word) => (
              <li
                key={word.target}
                className="rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-lg font-semibold text-[#0F6E56]" lang="es">
                    {word.target}
                  </p>
                  <YoSpanishAudioButton
                    text={word.target}
                    locale={locale}
                    moduleId="intro-a1"
                    lessonId="universal-words"
                    accentProfile="latin_american_neutral"
                    speechLang="es-ES"
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
        </section>
      ),
    },
    {
      id: "reading",
      kind: "practice",
      eyebrow: t(DECK_LABEL_READING, locale),
      title: t(DECK_TITLE_READING, locale),
      companionState: "map",
      content: (
        <div
          data-yo-spanish-intro-deck-screen="reading"
          className="mx-auto w-full max-w-3xl"
        >
          <YoReadingPreview section={readingSection} locale={locale} />
        </div>
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
          data-yo-spanish-intro-deck-screen="quiz"
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
        <div
          data-yo-spanish-intro-deck-screen="flashcards"
          className="mx-auto w-full max-w-3xl"
        >
          <YoFlashcardPreview
            cards={flashcards}
            locale={locale}
            speechLang="es-ES"
            audioContext={{
              moduleId: "intro-a1",
              lessonId: "universal-words",
              accentProfile: "latin_american_neutral",
              speechLang: "es-ES",
            }}
          />
        </div>
      ),
    },
    {
      id: "coach",
      kind: "summary",
      eyebrow: t(DECK_LABEL_COACH, locale),
      title: t(DECK_TITLE_COACH, locale),
      companionState: "map",
      content: (
        <div
          data-yo-spanish-intro-deck-screen="coach"
          className="mx-auto w-full max-w-3xl"
        >
          <YoCoachPanel
            options={coachOptions}
            locale={locale}
            teacherHref={teacherBridgeHref}
          />
        </div>
      ),
    },
    {
      id: "destinations",
      kind: "summary",
      eyebrow: t(DECK_LABEL_DESTINATIONS, locale),
      title: t(DECK_TITLE_DESTINATIONS, locale),
      companionState: "map",
      content: (
        <section
          data-yo-spanish-intro-deck-screen="destinations"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <p className="text-sm leading-relaxed text-[#0F6E56]/78">
            {t(DESTINATIONS_BODY, locale)}
          </p>
          <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-[#DDF4F1] bg-white/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DDF4F1]/70 px-3 py-1 text-xs font-semibold text-[#0F6E56]">
                <CheckCircle2 className="size-3.5" aria-hidden />
                {t(twelveMonthAccessLabel, locale)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DDF4F1]/70 px-3 py-1 text-xs font-semibold text-[#0F6E56]">
                <CheckCircle2 className="size-3.5" aria-hidden />
                {t(moneyBackLabel, locale)}
              </span>
            </div>
            <Link
              href="/legal/yo-remboursement"
              className="text-xs font-medium text-[#0F6E56]/75 underline-offset-2 hover:underline"
            >
              {t(legalLinkLabel, locale)}
            </Link>
          </div>
          <ul role="list" className="mt-5 grid gap-3 sm:grid-cols-2">
            {destinations.map((dest) => {
              const isAvailable = dest.status === "available";
              const href = dest.href
                ? isAvailable && locale === "en"
                  ? `${dest.href}?lang=en`
                  : dest.href
                : undefined;
              const cardClass =
                "block rounded-2xl border p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)] transition sm:p-5 " +
                (isAvailable
                  ? "border-[#F4B400]/45 bg-[#FFF4D6] hover:bg-[#ffefbd]"
                  : "border-teal-100 bg-white/85");
              const inner = (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-[#0F6E56] sm:text-lg">
                      <Compass
                        className="mr-1 inline size-4 text-[#1D9E75]"
                        aria-hidden
                      />
                      {t(dest.name, locale)}
                    </h3>
                    <span
                      className={
                        "text-[10px] font-black uppercase tracking-[0.14em] " +
                        (isAvailable ? "text-[#0F6E56]" : "text-[#0F6E56]/55")
                      }
                    >
                      {isAvailable
                        ? locale === "fr"
                          ? "Disponible"
                          : "Available"
                        : locale === "fr"
                          ? "À venir"
                          : "Coming"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/72">
                    {t(dest.flavor, locale)}
                  </p>
                </>
              );
              return (
                <li key={dest.id}>
                  {href ? (
                    <Link href={href} className={cardClass}>
                      {inner}
                    </Link>
                  ) : (
                    <div className={cardClass} aria-disabled="true">
                      {inner}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
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
          data-yo-spanish-intro-deck-screen="teacher"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <div className="relative overflow-hidden rounded-3xl border border-[#F4B400]/35 bg-gradient-to-br from-[#FFF4D6] via-white to-[#DDF4F1] p-6 shadow-[0_18px_44px_rgba(15,58,52,0.08)] sm:p-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#0F6E56] ring-1 ring-[#F4B400]/45">
              <GraduationCap className="size-3.5 text-[#F4B400]" aria-hidden />
              {t(DECK_LABEL_TEACHER, locale)}
            </span>
            <p className="mt-4 text-sm leading-relaxed text-[#0F6E56]/85 sm:text-base">
              {t(TEACHER_BODY, locale)}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={teacherBridgeHref}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0F6E56] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(15,110,86,0.22)] transition hover:bg-[#0b5b47]"
              >
                <MessageCircle className="size-4" aria-hidden />
                {t(TEACHER_CTA, locale)}
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
      explorationJourney="spanish-intro"
      enableTapNavigation
    />
  );
}

