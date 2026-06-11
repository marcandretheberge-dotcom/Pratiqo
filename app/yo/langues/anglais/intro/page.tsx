/**
 * YoPratiqo — Anglais · Intro (app-shell deck)
 *
 * Free, French-default orientation module designed for Quebec
 * francophone false beginners — learners who already studied
 * English at school but freeze when they need to speak. The
 * legacy long-scroll page with a 3-level breadcrumb is replaced
 * by the shared `<YoLessonDeck />` app-shell so the experience
 * is one focused screen at a time with companion presence
 * everywhere.
 *
 * What is PRESERVED verbatim:
 *   - `englishIntro` data file (no field renamed, no row deleted).
 *   - `YoEnglishAudioButton` integration with
 *     `accentProfile="canadian_english"` + `speechLang="en-CA"`.
 *   - "This is not your fault." copy + the entire welcome
 *     emotional spine.
 *   - The school-pattern critique, three regional-variant cards
 *     (American / British / Canadian), cognates + false-friends
 *     surfaces.
 *   - `YoFlashcardPreview` autoplay + the `en-CA` audio context.
 *   - `YoQuizPreview` reveal-only contract.
 *   - Every English-target string still renders with `lang="en"`.
 *   - Teacher CTA → `/trouver-un-prof?q=anglais`.
 *
 * What is NEW:
 *   - Mounts inside `<YoLessonDeck />` (viewport-locked, swipe /
 *     tap / keyboard navigation, app header with Back-to-Languages
 *     arrow + YoPratiqo logo).
 *   - Companion coach on every screen: `map` for context / vocab /
 *     culture, `confused` for the practice quiz, `celebrating`
 *     for the final teacher CTA.
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
import { englishIntro } from "@/lib/yo/englishIntro";
import { YoFlashcardPreview } from "@/components/yo/YoFlashcardPreview";
import { YoQuizPreview } from "@/components/yo/YoQuizPreview";
import { YoEnglishAudioButton } from "@/components/yo/YoEnglishAudioButton";
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
  return buildYoPratiqoMetadata("englishIntro", params.lang);
}

interface PageProps {
  searchParams: Promise<{ lang?: string | string[] }>;
}

const PAGE_TITLE = lstr("Intro — English", "Intro — English");

const PAGE_SUBTITLE = lstr(
  "Tu sais déjà plus que tu penses. On va débloquer le reste.",
  "You already know more than you think. Let's unlock the rest.",
);

// ─── Deck-screen labels ─────────────────────────────────────────────────
const DECK_LABEL_WELCOME = lstr("Avant de commencer", "Before we begin");
const DECK_TITLE_WELCOME = lstr(
  "This is not your fault.",
  "This is not your fault.",
);
const DECK_HELPER_WELCOME = lstr(
  "Un écran à la fois — balayage, tape ou flèches Back / Next.",
  "One screen at a time — swipe, tap, or arrow keys.",
);

const DECK_LABEL_NUMBERS = lstr("The numbers", "The numbers");
const DECK_TITLE_NUMBERS = lstr(
  "L'anglais en chiffres",
  "English in numbers",
);

const DECK_LABEL_SCHOOL = lstr(
  "Why school didn't work",
  "Why school didn't work",
);
const DECK_TITLE_SCHOOL = lstr(
  "Pourquoi l'école n'a pas marché — et pourquoi ça va aller",
  "Why school didn't work — and why this will",
);

const DECK_LABEL_VARIANTS = lstr(
  "American, British, Canadian",
  "American, British, Canadian",
);
const DECK_TITLE_VARIANTS = lstr(
  "Les vraies différences",
  "The real differences",
);

const DECK_LABEL_DORMANT = lstr(
  "Your dormant vocabulary",
  "Your dormant vocabulary",
);
const DECK_TITLE_DORMANT = lstr(
  "Le vocabulaire qui dort déjà dans ta tête",
  "The vocabulary already sleeping in your head",
);

const DECK_LABEL_SURVIVAL = lstr(
  "Your survival kit",
  "Your survival kit",
);
const DECK_TITLE_SURVIVAL = lstr(
  "Phrases pour reprendre confiance",
  "Phrases to take back your confidence",
);
const DECK_HELPER_SURVIVAL = lstr(
  "Tape l’audio pour entendre la prononciation canadienne.",
  "Tap the audio to hear the Canadian pronunciation.",
);

const DECK_LABEL_QUIZ = lstr("Mini quiz", "Mini quiz");
const DECK_TITLE_QUIZ = lstr(
  "Vérifie ta confiance en anglais",
  "Check your English confidence",
);
const DECK_HELPER_QUIZ = lstr(
  "Aucune note, aucun jugement. Juste des questions courtes.",
  "No grade, no judgment. Just short questions.",
);

const DECK_LABEL_FLASH = lstr("Flashcards", "Flashcards");
const DECK_TITLE_FLASH = lstr(
  "Tout le vocabulaire en un coup d'œil",
  "All the vocabulary at a glance",
);

const DECK_LABEL_TEACHER = lstr(
  "Pratique avec un prof",
  "Practice with a teacher",
);
const DECK_TITLE_TEACHER = lstr(
  "Pratique avec un vrai prof d'anglais",
  "Practice with a real English teacher",
);

export default async function YoEnglishIntroPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = getYoLocale(resolvedSearchParams.lang);
  const langSuffix = locale === "en" ? "?lang=en" : "";
  const toggleHref = buildYoLocaleHref(
    "/yo/langues/anglais/intro",
    locale === "fr" ? "en" : "fr",
  );

  const meta = getYoLanguageIntroDeckMeta("anglais");
  const backHref = `${meta.backRoute}${langSuffix}`;
  const teacherHref = `/trouver-un-prof?q=${meta.teacherSearchQuery}${
    locale === "en" ? "&lang=en" : ""
  }`;

  const {
    welcomeIntro,
    welcomeNotYourFault,
    welcomeContract,
    numbersLeadIn,
    englishStats,
    numbersTakeaway,
    schoolIntro,
    schoolPatterns,
    schoolReframe,
    schoolPermissionToTry,
    variantsIntro,
    variantCards,
    variantsTakeaway,
    cognatesIntro,
    cognateExamples,
    cognatesPower,
    falseFriendsIntro,
    falseFriends,
    survivalIntro,
    survivalPhrases,
    survivalGroupLabels,
    quizQuestions,
    flashcardGroups,
    flashcards,
    teacherBody,
    teacherCta,
  } = englishIntro;

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
          data-yo-english-intro-deck-screen="welcome"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <h1
            id="yo-en-hero-title"
            className="text-2xl font-semibold leading-tight tracking-tight text-[#0F6E56] sm:text-3xl"
          >
            <span lang="en">{t(PAGE_TITLE, locale)}</span>
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/78 sm:text-base">
            {t(PAGE_SUBTITLE, locale)}
          </p>
          <div className="mt-5 space-y-4 text-sm leading-relaxed text-[#0F6E56]/85 sm:text-base">
            <p>{t(welcomeIntro, locale)}</p>
            <p className="rounded-2xl border border-[#F4B400]/40 bg-[#FFF4D6] p-4 text-sm leading-relaxed text-[#0F6E56]">
              {t(welcomeNotYourFault, locale)}
            </p>
            <p>{t(welcomeContract, locale)}</p>
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
          data-yo-english-intro-deck-screen="numbers"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <p className="text-sm leading-relaxed text-[#0F6E56]/75">
            {t(numbersLeadIn, locale)}
          </p>
          <ul role="list" className="mt-5 grid gap-3 sm:grid-cols-3">
            {englishStats.map((stat) => (
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
      id: "school",
      kind: "culture",
      eyebrow: t(DECK_LABEL_SCHOOL, locale),
      title: t(DECK_TITLE_SCHOOL, locale),
      companionState: "map",
      content: (
        <section
          data-yo-english-intro-deck-screen="school"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <p className="text-sm leading-relaxed text-[#0F6E56]/85 sm:text-base">
            {t(schoolIntro, locale)}
          </p>
          <ul role="list" className="mt-5 space-y-3">
            {schoolPatterns.map((pattern) => (
              <li
                key={pattern.id}
                className="grid gap-2 rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)] sm:grid-cols-2"
              >
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0F6E56]/55">
                    {locale === "fr" ? "Ce que l'école faisait" : "What school did"}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-[#0F6E56]/85">
                    {t(pattern.schoolDid, locale)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#1D9E75]">
                    {locale === "fr"
                      ? "Ce que la vraie vie demande"
                      : "What real life asks for"}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-[#0F6E56]/85">
                    {t(pattern.realLifeNeeds, locale)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-5 space-y-4">
            <p className="text-sm leading-relaxed text-[#0F6E56]/85 sm:text-base">
              {t(schoolReframe, locale)}
            </p>
            <p className="rounded-2xl border border-[#F4B400]/40 bg-[#FFF4D6] p-4 text-sm leading-relaxed text-[#0F6E56]">
              {t(schoolPermissionToTry, locale)}
            </p>
          </div>
        </section>
      ),
    },
    {
      id: "variants",
      kind: "culture",
      eyebrow: t(DECK_LABEL_VARIANTS, locale),
      title: t(DECK_TITLE_VARIANTS, locale),
      companionState: "map",
      content: (
        <section
          data-yo-english-intro-deck-screen="variants"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <p className="text-sm leading-relaxed text-[#0F6E56]/85 sm:text-base">
            {t(variantsIntro, locale)}
          </p>
          <ul role="list" className="mt-5 grid gap-3 sm:grid-cols-3">
            {variantCards.map((variant) => (
              <li
                key={variant.id}
                className="rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
              >
                <p
                  className="text-base font-semibold text-[#0F6E56]"
                  lang="en"
                >
                  {t(variant.name, locale)}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/80">
                  {t(variant.description, locale)}
                </p>
                <p
                  className="mt-2 text-xs font-medium leading-relaxed text-[#0F6E56]/65"
                  lang="en"
                >
                  {t(variant.example, locale)}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-5 rounded-2xl border border-teal-100 bg-white/80 p-4 text-sm leading-relaxed text-[#0F6E56]/80 shadow-[0_1px_2px_rgba(15,58,52,0.04)]">
            {t(variantsTakeaway, locale)}
          </p>
        </section>
      ),
    },
    {
      id: "dormant",
      kind: "phrase",
      eyebrow: t(DECK_LABEL_DORMANT, locale),
      title: t(DECK_TITLE_DORMANT, locale),
      companionState: "map",
      content: (
        <section
          data-yo-english-intro-deck-screen="dormant"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <div className="space-y-4 text-sm leading-relaxed text-[#0F6E56]/85 sm:text-base">
            <p>{t(cognatesIntro, locale)}</p>
            <p className="rounded-2xl border border-[#F4B400]/40 bg-[#FFF4D6] p-4 text-sm leading-relaxed text-[#0F6E56]">
              <span className="font-semibold">Cognates · </span>
              {t(cognatesPower, locale)}
            </p>
          </div>
          <ul role="list" className="mt-5 grid gap-3 sm:grid-cols-3">
            {cognateExamples.map((cog) => (
              <li
                key={cog.id}
                className="rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
              >
                <p
                  className="text-base font-semibold text-[#0F6E56]"
                  lang="en"
                >
                  {cog.english}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[#0F6E56]/75">
                  ↔ {t(cog.french, locale)}
                </p>
              </li>
            ))}
          </ul>
          <h3 className="mt-8 text-lg font-semibold text-[#0F6E56]">
            {locale === "fr" ? "Le revers : les faux amis" : "The flip side: false friends"}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/80">
            {t(falseFriendsIntro, locale)}
          </p>
          <ul role="list" className="mt-3 grid gap-3 sm:grid-cols-2">
            {falseFriends.map((ff) => (
              <li
                key={ff.id}
                className="rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
              >
                <p
                  className="text-base font-semibold text-[#0F6E56]"
                  lang="en"
                >
                  {ff.english}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-[#0F6E56]/65">
                  <span className="font-semibold">
                    {locale === "fr" ? "Ressemble à : " : "Looks like: "}
                  </span>
                  {t(ff.looksLike, locale)}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#1D9E75]">
                  <span className="font-semibold">
                    {locale === "fr" ? "Veut dire : " : "Really means: "}
                  </span>
                  {t(ff.reallyMeans, locale)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ),
    },
    {
      id: "survival",
      kind: "phrase",
      eyebrow: t(DECK_LABEL_SURVIVAL, locale),
      title: t(DECK_TITLE_SURVIVAL, locale),
      helperText: t(DECK_HELPER_SURVIVAL, locale),
      companionState: "map",
      content: (
        <section
          data-yo-english-intro-deck-screen="survival"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <p className="text-sm leading-relaxed text-[#0F6E56]/75">
            {t(survivalIntro, locale)}
          </p>
          {(["rescue", "daily", "travel"] as const).map((groupId) => {
            const items = survivalPhrases.filter((p) => p.group === groupId);
            if (items.length === 0) return null;
            return (
              <div key={groupId} className="mt-6">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1D9E75]">
                  {t(survivalGroupLabels[groupId], locale)}
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
                          lang="en"
                        >
                          {phrase.target}
                        </p>
                        <YoEnglishAudioButton
                          text={phrase.target}
                          locale={locale}
                          moduleId="english-intro"
                          lessonId="intro"
                          accentProfile="canadian_english"
                          speechLang="en-CA"
                          size="xs"
                        />
                      </div>
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
          data-yo-english-intro-deck-screen="quiz"
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
          data-yo-english-intro-deck-screen="flashcards"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <p className="text-sm leading-relaxed text-[#0F6E56]/75">
            {locale === "fr"
              ? "Six paquets thématiques : l'anglais dans le monde, l'apprentissage, les variantes, les faux amis, les phrases de survie, et les bases du quotidien."
              : "Six thematic decks: English in the world, learning, varieties, false friends, survival phrases, and daily basics."}
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
              speechLang="en-CA"
              audioContext={{
                moduleId: "english-intro",
                lessonId: "intro",
                accentProfile: "canadian_english",
                speechLang: "en-CA",
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
          data-yo-english-intro-deck-screen="teacher"
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
