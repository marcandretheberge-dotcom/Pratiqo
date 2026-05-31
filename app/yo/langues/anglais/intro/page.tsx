/**
 * YoPratiqo — Anglais · Intro
 *
 * Free, French-default orientation module designed for Quebec
 * francophone false beginners — learners who already studied English
 * at school but freeze when they need to speak. The audience is the
 * Quebec / Canada base, so the page defaults to French and exposes
 * English via `?lang=en`.
 *
 * Composed of nine sections, server-rendered from
 * `lib/yo/englishIntro.ts`:
 *   1. Avant de commencer (welcome + "This is not your fault")
 *   2. The numbers — L'anglais en chiffres
 *   3. Why school didn't work — Pourquoi l'école n'a pas marché
 *   4. American, British, Canadian — Les vraies différences
 *   5. Your dormant vocabulary — Cognates + faux amis
 *   6. Your survival kit — Phrases pour reprendre confiance (audio)
 *   7. Quiz (reuses YoQuizPreview)
 *   8. Cartes flash (reuses YoFlashcardPreview)
 *   9. CTA — find an English teacher
 *
 * Locale behaviour:
 *   - Default: FR.
 *   - `?lang=en` flips to English.
 *   - All English target words render with `lang="en"`.
 *
 * Audio:
 *   - Pronunciation served via `YoEnglishAudioButton`, which prefers
 *     a pre-generated MP3 from Supabase Storage `yopratiqo-audio`
 *     (resolved through the manifest with
 *     `accentProfile="canadian_english"`) and falls back to on-device
 *     Web Speech (`en-CA`) only when an item is missing.
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
  KeyRound,
  Languages,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { SITE_URL } from "@/lib/seo/site";
import { buildYoLocaleHref, getYoLocale, lstr, t } from "@/lib/yo/localize";
import { englishIntro } from "@/lib/yo/englishIntro";
import { YoBreadcrumb } from "@/components/yo/YoBreadcrumb";
import { YoFlashcardPreview } from "@/components/yo/YoFlashcardPreview";
import { YoQuizPreview } from "@/components/yo/YoQuizPreview";
import { YoEnglishAudioButton } from "@/components/yo/YoEnglishAudioButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "YoPratiqo — Intro à l'anglais · Gratuit",
  description:
    "Tu sais déjà plus d'anglais que tu penses. Une intro premium gratuite pour reprendre confiance, comprendre les variantes et apprendre des phrases qui débloquent une conversation.",
  alternates: {
    canonical: `${SITE_URL}/yo/langues/anglais/intro`,
  },
  openGraph: {
    title: "YoPratiqo — Intro à l'anglais",
    description:
      "Première leçon gratuite pour faux débutants : variantes, vocabulaire dormant, phrases de survie, quiz et flashcards.",
    type: "website",
    url: `${SITE_URL}/yo/langues/anglais/intro`,
    locale: "fr_CA",
  },
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ lang?: string | string[] }>;
}

const PAGE_LABEL = lstr("Intro gratuite", "Free intro");

const PAGE_TITLE = lstr("Intro — English", "Intro — English");

const PAGE_SUBTITLE = lstr(
  "Tu sais déjà plus que tu penses. On va débloquer le reste.",
  "You already know more than you think. Let's unlock the rest.",
);

const SECTION_LABELS = {
  welcome: lstr("Avant de commencer", "Before we begin"),
  numbers: lstr("The numbers", "The numbers"),
  school: lstr("Why school didn't work", "Why school didn't work"),
  variants: lstr("American, British, Canadian", "American, British, Canadian"),
  dormant: lstr("Your dormant vocabulary", "Your dormant vocabulary"),
  survival: lstr("Your survival kit", "Your survival kit"),
  quiz: lstr("Quiz", "Quiz"),
  flashcards: lstr("Flashcards", "Flashcards"),
  teacher: lstr("Pratique avec un prof", "Practice with a teacher"),
} as const;

const SECTION_TITLES = {
  welcome: lstr(
    "This is not your fault.",
    "This is not your fault.",
  ),
  numbers: lstr(
    "L'anglais en chiffres",
    "English in numbers",
  ),
  school: lstr(
    "Pourquoi l'école n'a pas marché — et pourquoi ça va aller",
    "Why school didn't work — and why this will",
  ),
  variants: lstr(
    "Les vraies différences entre américain, britannique et canadien",
    "The real differences between American, British, and Canadian",
  ),
  dormant: lstr(
    "Le vocabulaire qui dort déjà dans ta tête",
    "The vocabulary already sleeping in your head",
  ),
  survival: lstr(
    "Phrases pour reprendre confiance",
    "Phrases to take back your confidence",
  ),
  teacher: lstr(
    "Pratique avec un vrai prof d'anglais",
    "Practice with a real English teacher",
  ),
} as const;

export default async function YoEnglishIntroPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = getYoLocale(resolvedSearchParams.lang);
  const langSuffix = locale === "en" ? "?lang=en" : "";
  const toggleHref = buildYoLocaleHref(
    "/yo/langues/anglais/intro",
    locale === "fr" ? "en" : "fr",
  );

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

  return (
    <div className="min-h-[100dvh] bg-[#FAFCFB] text-[#0F6E56]">
      <main id="main-content" className="flex flex-col pb-20">
        <YoBreadcrumb
          items={[
            { label: lstr("YoPratiqo", "YoPratiqo"), href: `/yo${langSuffix}` },
            { label: lstr("Langues", "Languages"), href: `/yo/langues${langSuffix}` },
            { label: lstr("Anglais", "English") },
          ]}
          locale={locale}
        />

        {/* Hero */}
        <section
          aria-labelledby="yo-en-hero-title"
          className="relative overflow-hidden"
        >
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(1,33,105,0.14),transparent_30%),radial-gradient(circle_at_86%_18%,rgba(200,16,46,0.14),transparent_32%),linear-gradient(180deg,#fffaf0_0%,#fff4d6_45%,#ddf4f1_100%)]"
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
              {locale === "fr" ? "YoPratiqo · Anglais" : "YoPratiqo · English"}
            </p>
            <h1
              id="yo-en-hero-title"
              className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-[#0F6E56] sm:text-4xl lg:text-[2.75rem]"
            >
              {t(PAGE_TITLE, locale)}
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-[#0F6E56]/78 sm:text-lg">
              {t(PAGE_SUBTITLE, locale)}
            </p>
          </div>
        </section>

        {/* 1) Avant de commencer */}
        <section
          aria-labelledby="yo-en-welcome-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]">
            {t(SECTION_LABELS.welcome, locale)}
          </span>
          <h2
            id="yo-en-welcome-title"
            className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            <HeartHandshake className="size-5 text-[#1D9E75]" aria-hidden />
            <span lang="en">{t(SECTION_TITLES.welcome, locale)}</span>
          </h2>
          <div className="mt-4 max-w-3xl space-y-4 text-base leading-relaxed text-[#0F6E56]/85">
            <p>{t(welcomeIntro, locale)}</p>
            <p className="rounded-2xl border border-[#F4B400]/40 bg-[#FFF4D6] p-4 text-sm leading-relaxed text-[#0F6E56]">
              {t(welcomeNotYourFault, locale)}
            </p>
            <p>{t(welcomeContract, locale)}</p>
          </div>
        </section>

        {/* 2) The numbers */}
        <section
          aria-labelledby="yo-en-numbers-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]" lang="en">
            {t(SECTION_LABELS.numbers, locale)}
          </span>
          <h2
            id="yo-en-numbers-title"
            className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            <Compass className="size-5 text-[#1D9E75]" aria-hidden />
            {t(SECTION_TITLES.numbers, locale)}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#0F6E56]/75">
            {t(numbersLeadIn, locale)}
          </p>
          <ul role="list" className="mt-6 grid gap-4 sm:grid-cols-3">
            {englishStats.map((stat) => (
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

        {/* 3) Why school didn't work */}
        <section
          aria-labelledby="yo-en-school-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]" lang="en">
            {t(SECTION_LABELS.school, locale)}
          </span>
          <h2
            id="yo-en-school-title"
            className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            <BookOpen className="size-5 text-[#1D9E75]" aria-hidden />
            {t(SECTION_TITLES.school, locale)}
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-[#0F6E56]/85">
            {t(schoolIntro, locale)}
          </p>
          <ul role="list" className="mt-6 space-y-3">
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
                    {locale === "fr" ? "Ce que la vraie vie demande" : "What real life asks for"}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-[#0F6E56]/85">
                    {t(pattern.realLifeNeeds, locale)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6 max-w-3xl space-y-4">
            <p className="text-base leading-relaxed text-[#0F6E56]/85">
              {t(schoolReframe, locale)}
            </p>
            <p className="rounded-2xl border border-[#F4B400]/40 bg-[#FFF4D6] p-4 text-sm leading-relaxed text-[#0F6E56]">
              {t(schoolPermissionToTry, locale)}
            </p>
          </div>
        </section>

        {/* 4) American, British, Canadian */}
        <section
          aria-labelledby="yo-en-variants-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]" lang="en">
            {t(SECTION_LABELS.variants, locale)}
          </span>
          <h2
            id="yo-en-variants-title"
            className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            <Languages className="size-5 text-[#1D9E75]" aria-hidden />
            {t(SECTION_TITLES.variants, locale)}
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-[#0F6E56]/85">
            {t(variantsIntro, locale)}
          </p>
          <ul role="list" className="mt-6 grid gap-4 sm:grid-cols-3">
            {variantCards.map((variant) => (
              <li
                key={variant.id}
                className="rounded-2xl border border-teal-100 bg-white p-5 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
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
                  className="mt-3 text-xs font-medium leading-relaxed text-[#0F6E56]/65"
                  lang="en"
                >
                  {t(variant.example, locale)}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-3xl rounded-2xl border border-teal-100 bg-white/80 p-4 text-sm leading-relaxed text-[#0F6E56]/80 shadow-[0_1px_2px_rgba(15,58,52,0.04)]">
            {t(variantsTakeaway, locale)}
          </p>
        </section>

        {/* 5) Your dormant vocabulary */}
        <section
          aria-labelledby="yo-en-dormant-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]" lang="en">
            {t(SECTION_LABELS.dormant, locale)}
          </span>
          <h2
            id="yo-en-dormant-title"
            className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            <KeyRound className="size-5 text-[#1D9E75]" aria-hidden />
            {t(SECTION_TITLES.dormant, locale)}
          </h2>
          <div className="mt-4 max-w-3xl space-y-4 text-base leading-relaxed text-[#0F6E56]/85">
            <p>{t(cognatesIntro, locale)}</p>
            <p className="rounded-2xl border border-[#F4B400]/40 bg-[#FFF4D6] p-4 text-sm leading-relaxed text-[#0F6E56]">
              <span className="font-semibold">
                {locale === "fr" ? "Cognates · " : "Cognates · "}
              </span>
              {t(cognatesPower, locale)}
            </p>
          </div>
          <ul role="list" className="mt-6 grid gap-3 sm:grid-cols-3">
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
          <h3 className="mt-10 text-lg font-semibold text-[#0F6E56]">
            {locale === "fr" ? "Le revers : les faux amis" : "The flip side: false friends"}
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#0F6E56]/80">
            {t(falseFriendsIntro, locale)}
          </p>
          <ul role="list" className="mt-4 grid gap-3 sm:grid-cols-2">
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

        {/* 6) Your survival kit */}
        <section
          aria-labelledby="yo-en-survival-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]" lang="en">
            {t(SECTION_LABELS.survival, locale)}
          </span>
          <h2
            id="yo-en-survival-title"
            className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            <MessageCircle className="size-5 text-[#1D9E75]" aria-hidden />
            {t(SECTION_TITLES.survival, locale)}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#0F6E56]/75">
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
                <ul role="list" className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
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

        {/* 7) Quiz */}
        <section
          aria-labelledby="yo-en-quiz-title"
          className="pt-2"
        >
          <h2 id="yo-en-quiz-title" className="sr-only">
            {t(SECTION_LABELS.quiz, locale)}
          </h2>
          <YoQuizPreview questions={quizQuestions} locale={locale} />
        </section>

        {/* 8) Flashcards */}
        <section
          aria-labelledby="yo-en-flashcards-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]">
            {t(SECTION_LABELS.flashcards, locale)}
          </span>
          <h2
            id="yo-en-flashcards-title"
            className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            <GraduationCap className="size-5 text-[#1D9E75]" aria-hidden />
            {locale === "fr"
              ? "Tout le vocabulaire en un coup d'œil"
              : "All the vocabulary at a glance"}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#0F6E56]/75">
            {locale === "fr"
              ? "Six paquets thématiques : l'anglais dans le monde, l'apprentissage, les variantes, les faux amis, les phrases de survie, et les bases du quotidien. Audio inclus, prononciation canadienne."
              : "Six thematic decks: English in the world, learning, varieties, false friends, survival phrases, and daily basics. Audio included, Canadian pronunciation."}
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

        {/* 9) Teacher CTA */}
        <section
          aria-labelledby="yo-en-teacher-title"
          className="mx-auto w-full max-w-5xl px-5 pt-12 sm:px-8 sm:pt-16"
        >
          <div className="flex flex-col items-start gap-4 rounded-3xl border border-[#F4B400]/45 bg-gradient-to-br from-[#FFF4D6] via-white to-[#DDF4F1] p-6 shadow-[0_1px_2px_rgba(15,58,52,0.04)] sm:p-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#0F6E56] ring-1 ring-[#F4B400]/45">
              <GraduationCap className="size-3.5 text-[#F4B400]" aria-hidden />
              {t(SECTION_LABELS.teacher, locale)}
            </span>
            <h2
              id="yo-en-teacher-title"
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
