/**
 * DominicanRepublicIntroContent — premium app-like Intro deck renderer
 * for the Dominican Republic Spanish learning path.
 *
 * Server component. Composes the existing audited Intro educational
 * surfaces (`<YoIntroLearningFrame>`, `<YoCulturePanorama>`,
 * `<YoLessonCard>`, `<YoDominicanDictionary>`, `<YoFlashcardPreview>`,
 * `<YoQuizPreview>`) into a 9-screen no-scroll swipe lesson deck via
 * the shared `<YoLessonDeck />` client orchestrator. Mirrors the
 * Module 2 / 3 / 4 pattern.
 *
 * What is NEW
 * -----------
 *   - Each screen is one focused "page" of the app deck. The deck
 *     owns navigation (Back / Next, swipe, tap-zones, keyboard) and
 *     mounts the audited Intro sub-components AS-IS so every
 *     `data-testid` / `data-yo-*` marker the existing intro /
 *     country-course-home / quiz tests look for stays in the tree.
 *
 * What is PRESERVED
 * -----------------
 *   - All intro educational content (the 4 intro cards, the
 *     intro learning frame, the culture panorama, the pocket
 *     Dominican dictionary, the flashcard preview, the quiz
 *     preview).
 *   - Browser-speech audio (`<YoFlashcardPreview>` keeps its
 *     existing `audioContext` so the Intro screen still resolves
 *     to dominican-republic audio, the dictionary still resolves
 *     against the same context).
 *   - The 4 intro `YoLessonCard`s render WITHOUT `onSelect`, which
 *     keeps them as passive CTAs (no client orchestration of the
 *     detailed-section panel — that orchestrator (`YoIntroExperience`)
 *     stays mounted unchanged on the long-form Course Home below
 *     this deck for any learner who scrolls past the deck CTAs).
 *
 * What is INTENTIONALLY ABSENT
 * ----------------------------
 *   - No mark-completed button. The shared
 *     `dominicanRdModuleProgressPayload(...)` helper does not (yet)
 *     audit an `intro` / `module-1` row, so we do NOT fake a
 *     progress payload. The brief is explicit: "If not safe, make
 *     the final screen direct learners to Module 2 without adding
 *     persistence." The final screen ships a clean CTA to Module 2.
 *   - No paid unlock flow. No Stripe / price_id. Paid YoPratiqo
 *     checkout stays disabled per `yopratiqoProductConfig.ts`.
 *   - No raw quiz answer payload. The reveal-only contract owned
 *     by `<YoQuizPreview>` is unchanged.
 */

import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";

import {
  dominicanRepublicA1,
  dominicanRepublicA1ListeningDemo,
} from "@/lib/yo/dominicanRepublicA1";
import { lstr, t } from "@/lib/yo/localize";
import type { YoLocale } from "@/lib/yo/types";
import { YoLessonDeck } from "@/components/yo/YoLessonDeck";
import type { YoLessonDeckScreen } from "@/lib/yo/lessonDeckTypes";
import { YoLessonCard } from "@/components/yo/YoLessonCard";
import {
  YoCulturePanorama,
  YoIntroLearningFrame,
} from "@/components/yo/YoIntroCultureFrame";
import { YoDominicanDictionary } from "@/components/yo/YoDominicanDictionary";
import { YoFlashcardPreview } from "@/components/yo/YoFlashcardPreview";
import { YoQuizPreview } from "@/components/yo/YoQuizPreview";
import { YoAudioFeedbackProvider } from "@/components/yo/YoAudioFeedbackProvider";
import { YoListeningExercisePreview } from "@/components/yo/YoListeningExercisePreview";
import { YoYoppoReward } from "@/components/yo/YoYoppoReward";

// ─── Localized deck-screen labels (eyebrow / title / helperText) ─────────
//
// Kept short on purpose — the deck header is mobile-first and longer
// strings collapse the title font size. Every string flows through the
// shared `lstr` / `t` helpers so a future Supabase-backed CMS swap
// keeps working without touching the deck composer.

const DECK_LABEL_WELCOME = lstr("Mission", "Mission", "Misión");
const DECK_TITLE_WELCOME = lstr(
  "Bienvenue dans le voyage",
  "Welcome to your trip",
  "Bienvenida al viaje",
);
const DECK_HELPER_WELCOME = lstr(
  "Espagnol pratique pour la République dominicaine, un écran à la fois.",
  "Practical Spanish for the Dominican Republic, one screen at a time.",
  "Español práctico para República Dominicana, una pantalla a la vez.",
);

const DECK_LABEL_HOW = lstr(
  "Comment ça marche",
  "How the app works",
  "Cómo funciona",
);
const DECK_TITLE_HOW = lstr(
  "Apprends à ton rythme",
  "Learn at your own pace",
  "Aprende a tu ritmo",
);
const DECK_HELPER_HOW = lstr(
  "Ton compagnon de voyage te suit à chaque écran : balayage, tape, ou flèches Back / Next.",
  "Your travel companion follows you on every screen — swipe, tap, or use Back / Next.",
  "Tu compañero de viaje te acompaña en cada pantalla — desliza, toca o usa Atrás / Siguiente.",
);

const DECK_LABEL_PHRASES = lstr(
  "Premières phrases",
  "First phrases",
  "Primeras frases",
);
const DECK_TITLE_PHRASES = lstr(
  "Les 4 portes d'entrée",
  "Your 4 doorways in",
  "Las 4 puertas de entrada",
);
const DECK_HELPER_PHRASES = lstr(
  "Géographie, histoire, langue, premières phrases — chaque carte t'ouvre une partie de la RD.",
  "Geography, history, language, first phrases — each card opens a slice of the DR.",
  "Geografía, historia, lengua, primeras frases — cada tarjeta abre una parte de la RD.",
);

const DECK_LABEL_CULTURE = lstr(
  "Culture dominicaine",
  "Dominican culture",
  "Cultura dominicana",
);
const DECK_TITLE_CULTURE = lstr(
  "Le pays au-delà du resort",
  "Beyond the resort",
  "Más allá del resort",
);
const DECK_HELPER_CULTURE = lstr(
  "Quelques piliers culturels qui donnent du sens à ce que tu vas dire.",
  "A few cultural pillars that give meaning to what you're about to say.",
  "Algunos pilares culturales que dan sentido a lo que vas a decir.",
);

const DECK_LABEL_LISTENING = lstr(
  "Ecoute",
  "Listening",
  "Escucha",
);
const DECK_TITLE_LISTENING = lstr(
  "Valide le format audio",
  "Validate the audio format",
  "Valida el formato audio",
);
const DECK_HELPER_LISTENING = lstr(
  "Demo technique seulement : le vrai contenu dominicain sera redige ensuite.",
  "Technical demo only: the real Dominican content will be written next.",
  "Demo tecnica solamente: el contenido dominicano real se redactara despues.",
);

const DECK_LABEL_DICTIONARY = lstr(
  "Dictionnaire de poche",
  "Pocket dictionary",
  "Diccionario de bolsillo",
);
const DECK_TITLE_DICTIONARY = lstr(
  "Expressions dominicaines",
  "Dominican expressions",
  "Expresiones dominicanas",
);
const DECK_HELPER_DICTIONARY = lstr(
  "Tape l'audio pour entendre la prononciation locale.",
  "Tap the audio to hear the local pronunciation.",
  "Toca el audio para escuchar la pronunciación local.",
);

const DECK_LABEL_FLASHCARDS = lstr(
  "Flashcards",
  "Flashcards",
  "Tarjetas",
);
const DECK_TITLE_FLASHCARDS = lstr(
  "Mémorise les essentiels",
  "Memorize the essentials",
  "Memoriza lo esencial",
);
const DECK_HELPER_FLASHCARDS = lstr(
  "Espagnol devant, glose derrière, audio du navigateur sur chaque carte.",
  "Spanish on the front, gloss on the back, browser audio on each card.",
  "Español al frente, glosa atrás, audio del navegador en cada tarjeta.",
);

const DECK_LABEL_QUIZ = lstr(
  "Mini quiz",
  "Mini quiz",
  "Mini quiz",
);
const DECK_TITLE_QUIZ = lstr(
  "Vérifie ton intro",
  "Check your intro",
  "Verifica tu intro",
);
const DECK_HELPER_QUIZ = lstr(
  "Cinq questions courtes en espagnol. La traduction n'apparaît qu'après ton choix.",
  "Five short Spanish questions. The translation appears only after your pick.",
  "Cinco preguntas cortas en español. La traducción aparece solo después de tu elección.",
);

const DECK_LABEL_READY = lstr(
  "Prêt·e",
  "You're ready",
  "Listo",
);
const DECK_TITLE_READY = lstr(
  "Direction le Module 2",
  "On to Module 2",
  "Vamos al Módulo 2",
);
const DECK_HELPER_READY = lstr(
  "Hôtel, aéroport et premiers pas sur place. Ton compagnon t'attend dans la suite.",
  "Hotel, airport, and your first steps on the ground. Your companion is waiting in Module 2.",
  "Hotel, aeropuerto y tus primeros pasos in situ. Tu compañero te espera en el Módulo 2.",
);

const DECK_MODULE_LABEL = lstr(
  "Intro · RD A1",
  "Intro · DR A1",
  "Intro · RD A1",
);

const READY_NEXT_HEADLINE = lstr(
  "Module 2 — Hôtel et aéroport",
  "Module 2 — Hotel & airport",
  "Módulo 2 — Hotel y aeropuerto",
);

const READY_NEXT_BLURB = lstr(
  "Tu enchaînes avec les phrases concrètes pour passer la douane, prendre un taxi et faire ton check-in.",
  "Next up: the real phrases for clearing customs, grabbing a taxi, and checking into your hotel.",
  "Sigue con las frases reales para pasar la aduana, tomar un taxi y hacer tu check-in.",
);

const READY_NEXT_CTA = lstr(
  "Ouvrir le Module 2",
  "Open Module 2",
  "Abrir el Módulo 2",
);

const READY_BACK_TO_COURSE_HOME = lstr(
  "Retour à l'accueil du parcours",
  "Back to course home",
  "Volver al inicio del curso",
);

const WELCOME_TAGLINE = lstr(
  "Intro · République dominicaine · A1",
  "Intro · Dominican Republic · A1",
  "Intro · República Dominicana · A1",
);

// ─── Deck composer ──────────────────────────────────────────────────────
//
// 9 focused, app-like screens. Companion visual states follow the
// brief's contract:
//   - `map` for navigation / context / immersion screens
//   - `confused` for the practice quiz screen
//   - `celebrating` for the final "Ready for Module 2" screen
// `teacher_ready` is intentionally not used — the Intro has no live
// teacher-bridge message today.

function buildIntroDeckScreens(locale: YoLocale): YoLessonDeckScreen[] {
  const data = dominicanRepublicA1;
  const introLesson = data.module.lessons.find((lesson) => lesson.position === 1);
  const introCards = introLesson?.cards ?? [];
  const langSuffix = locale === "fr" ? "" : `?lang=${locale}`;
  const module2Href = `/yo/langues/espagnol/pays/republique-dominicaine/module-2${langSuffix}`;
  const courseHomeHref = `/yo/langues/espagnol/pays/republique-dominicaine${langSuffix}`;
  const tagline = t(WELCOME_TAGLINE, locale);
  const readyHeadline = t(READY_NEXT_HEADLINE, locale);
  const readyBlurb = t(READY_NEXT_BLURB, locale);
  const readyCta = t(READY_NEXT_CTA, locale);
  const readyBackCourseHome = t(READY_BACK_TO_COURSE_HOME, locale);
  const heroTitle = t(data.module.heroTitle, locale);
  const heroSubtitle = t(data.module.heroSubtitle, locale);
  const introProgressTitle = t(data.introProgress.title, locale);
  const introProgressDescription = t(data.introProgress.description, locale);

  return [
    {
      id: "welcome",
      kind: "mission",
      eyebrow: t(DECK_LABEL_WELCOME, locale),
      title: t(DECK_TITLE_WELCOME, locale),
      helperText: t(DECK_HELPER_WELCOME, locale),
      companionState: "map",
      content: (
        <section
          data-yo-intro-deck-screen="welcome"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <p className="inline-flex items-center gap-1.5 rounded-full border border-teal-300/40 bg-white/80 px-3 py-1 text-[0.7rem] font-black uppercase tracking-[0.14em] text-teal-800">
            <MapPin className="size-3.5" aria-hidden />
            {tagline}
          </p>
          <h1 className="mt-3 break-words text-2xl font-semibold leading-tight tracking-tight text-[#1a3a32] sm:text-3xl">
            {heroTitle}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#1a3a32]/75 sm:text-base">
            {heroSubtitle}
          </p>
          <div className="mt-5 rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)] sm:p-5">
            <p className="text-[0.7rem] font-black uppercase tracking-[0.14em] text-teal-700/80">
              {tagline}
            </p>
            <h2 className="mt-2 text-lg font-semibold tracking-tight text-[#1a3a32] sm:text-xl">
              {introProgressTitle}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#1a3a32]/70">
              {introProgressDescription}
            </p>
            <ul
              role="list"
              className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3"
            >
              {data.introProgress.stats.map((stat) => (
                <li
                  key={stat.id}
                  className="flex min-w-0 flex-col gap-0.5 rounded-2xl bg-white px-3 py-2.5 ring-1 ring-teal-100"
                >
                  <span className="text-xl font-semibold tracking-tight text-[#1a3a32] sm:text-2xl">
                    {stat.value}
                  </span>
                  <span className="break-words text-[11px] leading-snug text-[#566073] sm:text-xs">
                    {t(stat.label, locale)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ),
    },
    {
      id: "how-it-works",
      kind: "mission",
      eyebrow: t(DECK_LABEL_HOW, locale),
      title: t(DECK_TITLE_HOW, locale),
      helperText: t(DECK_HELPER_HOW, locale),
      companionState: "map",
      content: (
        <div data-yo-intro-deck-screen="how-it-works">
          <YoIntroLearningFrame locale={locale} />
        </div>
      ),
    },
    {
      id: "phrases",
      kind: "phrase",
      eyebrow: t(DECK_LABEL_PHRASES, locale),
      title: t(DECK_TITLE_PHRASES, locale),
      helperText: t(DECK_HELPER_PHRASES, locale),
      companionState: "map",
      content: (
        <section
          data-yo-intro-deck-screen="phrases"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4">
            {introCards.map((card) => (
              <YoLessonCard key={card.id} card={card} locale={locale} />
            ))}
          </div>
        </section>
      ),
    },
    {
      id: "culture",
      kind: "culture",
      eyebrow: t(DECK_LABEL_CULTURE, locale),
      title: t(DECK_TITLE_CULTURE, locale),
      helperText: t(DECK_HELPER_CULTURE, locale),
      companionState: "map",
      content: (
        <div data-yo-intro-deck-screen="culture">
          <YoCulturePanorama
            locale={locale}
            imagePath={data.module.cultureImagePath}
            imageAlt={data.module.cultureImageAlt}
          />
        </div>
      ),
    },
    {
      id: "listening-demo",
      kind: "practice",
      eyebrow: t(DECK_LABEL_LISTENING, locale),
      title: t(DECK_TITLE_LISTENING, locale),
      helperText: t(DECK_HELPER_LISTENING, locale),
      companionState: "confused",
      content: (
        <div data-yo-intro-deck-screen="listening-demo">
          <YoListeningExercisePreview
            data={dominicanRepublicA1ListeningDemo}
            locale={locale}
          />
        </div>
      ),
    },
    {
      id: "dictionary",
      kind: "culture",
      eyebrow: t(DECK_LABEL_DICTIONARY, locale),
      title: t(DECK_TITLE_DICTIONARY, locale),
      helperText: t(DECK_HELPER_DICTIONARY, locale),
      companionState: "map",
      content: (
        <div data-yo-intro-deck-screen="dictionary">
          <YoDominicanDictionary
            expressions={data.dominicanDictionary}
            locale={locale}
            audioContext={{
              moduleId: "voyage",
              lessonId: "republique-dominicaine-a1-lesson-01",
              accentProfile: "dominican_republic",
              speechLang: "es-DO",
            }}
          />
        </div>
      ),
    },
    {
      id: "flashcards",
      kind: "practice",
      eyebrow: t(DECK_LABEL_FLASHCARDS, locale),
      title: t(DECK_TITLE_FLASHCARDS, locale),
      helperText: t(DECK_HELPER_FLASHCARDS, locale),
      companionState: "map",
      content: (
        <div data-yo-intro-deck-screen="flashcards">
          <YoFlashcardPreview
            cards={data.flashcardDeck}
            locale={locale}
            speechLang="es-DO"
            enableAudioFeedback
            compactDeck
            audioContext={{
              moduleId: "voyage",
              lessonId: "republique-dominicaine-a1-lesson-01",
              accentProfile: "dominican_republic",
              speechLang: "es-DO",
            }}
          />
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
        <div data-yo-intro-deck-screen="quiz">
          <YoQuizPreview
            questions={data.quizQuestions}
            locale={locale}
            enableAudioFeedback
            compactDeck
          />
        </div>
      ),
    },
    {
      id: "ready",
      kind: "completion",
      eyebrow: t(DECK_LABEL_READY, locale),
      title: t(DECK_TITLE_READY, locale),
      helperText: t(DECK_HELPER_READY, locale),
      companionState: "celebrating",
      content: (
        <section
          data-yo-intro-deck-screen="ready"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <YoYoppoReward show locale={locale} variant="intro-complete" />
          <div className="relative overflow-hidden rounded-3xl border border-[#F4B400]/35 bg-[#FFF4D6] p-5 shadow-[0_18px_44px_rgba(15,58,52,0.08)] sm:p-7">
            <p className="text-[0.7rem] font-black uppercase tracking-[0.16em] text-[#8a5a17]">
              {t(DECK_LABEL_READY, locale)}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#5a3f0f] sm:text-3xl">
              {readyHeadline}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#5a3f0f]/85">
              {readyBlurb}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                data-yo-intro-deck-next-module="module-2"
                href={module2Href}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0F6E56] px-5 py-3 text-sm font-black text-white transition hover:bg-[#0b5b47] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E56] focus-visible:ring-offset-2"
              >
                {readyCta}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href={courseHomeHref}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#0F6E56]/25 bg-white px-5 py-3 text-sm font-bold text-[#0F6E56] transition hover:bg-[#F4FBF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E56] focus-visible:ring-offset-2"
              >
                {readyBackCourseHome}
              </Link>
            </div>
          </div>
        </section>
      ),
    },
  ];
}

// ─── Main export ────────────────────────────────────────────────────────

export interface DominicanRepublicIntroContentProps {
  locale: YoLocale;
}

export function DominicanRepublicIntroContent({
  locale,
}: DominicanRepublicIntroContentProps) {
  const screens = buildIntroDeckScreens(locale);
  const langSuffix = locale === "fr" ? "" : `?lang=${locale}`;
  const backHref = `/yo/langues/espagnol/pays/republique-dominicaine${langSuffix}`;
  const toggleHref =
    locale === "fr"
      ? "/yo/langues/espagnol/pays/republique-dominicaine/intro?lang=en"
      : "/yo/langues/espagnol/pays/republique-dominicaine/intro";

  return (
    <YoAudioFeedbackProvider locale={locale}>
      <YoLessonDeck
        locale={locale}
        moduleLabel={t(DECK_MODULE_LABEL, locale)}
        backHref={backHref}
        toggleHref={toggleHref}
        screens={screens}
        enableTapNavigation
      />
    </YoAudioFeedbackProvider>
  );
}
