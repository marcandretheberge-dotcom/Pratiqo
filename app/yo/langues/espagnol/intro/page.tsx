/**
 * YoPratiqo — Espagnol · Intro globale A1
 *
 * Universal Spanish primer that sits *above* the country modules in
 * the new IA: YoPratiqo → Langues → Espagnol → Intro globale.
 *
 * Composed of nine sections, all server-rendered from
 * `lib/yo/spanishIntroA1.ts`:
 *   1. Spanish in the world
 *   2. Origin of the language
 *   3. Spanish-speaking countries
 *   4. Why Spanish changes by country
 *   5. Universal first words
 *   6. Quiz (reuses YoQuizPreview)
 *   7. Flashcards (reuses YoFlashcardPreview)
 *   8. Choose your destination
 *   9. Teacher bridge
 *
 * Locale behaviour: French by default, English via `?lang=en`. Spanish
 * target phrases render with `lang="es"` per the project rule.
 *
 * No Supabase, no Stripe, no payment math, no checkout, no marketplace.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  Compass,
  Globe2,
  GraduationCap,
  MessageCircle,
  Music2,
  Sparkles,
} from "lucide-react";
import { buildYoLocaleHref, getYoLocale, lstr, t } from "@/lib/yo/localize";
import { buildYoPratiqoMetadata } from "@/lib/yo/yopratiqoSeo";
import { spanishIntroA1 } from "@/lib/yo/spanishIntroA1";
import { YoBreadcrumb } from "@/components/yo/YoBreadcrumb";
import { YoCoachPanel } from "@/components/yo/YoCoachPanel";
import { YoFlashcardPreview } from "@/components/yo/YoFlashcardPreview";
import { YoQuizPreview } from "@/components/yo/YoQuizPreview";
import { YoReadingPreview } from "@/components/yo/YoReadingPreview";
import { YoSpanishAudioButton } from "@/components/yo/YoSpanishAudioButton";

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

const PAGE_TITLE = lstr(
  "Intro — El Español",
  "Intro — El Español",
);

const PAGE_SUBTITLE = lstr(
  "La langue qui connecte un demi-milliard de personnes.",
  "The language that connects half a billion people.",
);

const SECTION_LABELS = {
  worldEyebrow: lstr("L’espagnol dans le monde", "Spanish in the world"),
  originEyebrow: lstr("D’où vient l’espagnol ?", "Where does Spanish come from?"),
  countriesEyebrow: lstr("Les pays hispanophones", "Spanish-speaking countries"),
  variationsEyebrow: lstr(
    "Pourquoi l’espagnol change selon le pays",
    "Why Spanish changes by country",
  ),
  wordsEyebrow: lstr("Tes premiers mots universels", "Your first universal words"),
  wordsBody: lstr(
    "Ces mots fonctionnent dans tous les pays hispanophones. Ils sont ton billet d’entrée.",
    "These words work in every Spanish-speaking country. They are your entry ticket.",
  ),
  quizEyebrow: lstr("Petit quiz culturel", "Short culture quiz"),
  flashEyebrow: lstr("Flashcards universelles", "Universal flashcards"),
  destinationsEyebrow: lstr("Choisis ta destination", "Choose your destination"),
  destinationsBody: lstr(
    "Chaque pays a son rythme et ses expressions. Commence par celui qui te parle le plus.",
    "Each country has its own rhythm and expressions. Start with the one that calls to you.",
  ),
  teacherEyebrow: lstr("Pont vers un professeur", "Bridge to a teacher"),
};

const ORIGIN_TITLE = lstr(
  "De Rome à 500 millions de voix",
  "From Rome to 500 million voices",
);

const COUNTRIES_TITLE = lstr(
  "L’espagnol s’étend sur quatre continents",
  "Spanish spans four continents",
);

const VARIATIONS_TITLE = lstr(
  "Une langue, plusieurs musiques",
  "One language, many musics",
);

const WORDS_TITLE = lstr(
  "Les mots qui ouvrent toutes les portes",
  "The words that open every door",
);

const DESTINATIONS_TITLE = lstr(
  "Une fois prêt, choisis un pays",
  "When you’re ready, pick a country",
);

const TEACHER_TITLE = lstr(
  "Tu veux pratiquer avec un vrai prof ?",
  "Want to practice with a real teacher?",
);

const TEACHER_BODY = lstr(
  "Pratique avec un professeur d’espagnol Pratiqo — local d’ici ou natif du pays que tu veux visiter. Tu apprends d’abord avec Yo, puis tu parles avec une vraie personne.",
  "Practice with a Pratiqo Spanish teacher — local to you or native to the country you want to visit. You learn first with Yo, then talk with a real person.",
);

const TEACHER_CTA = lstr(
  "Trouver un prof d’espagnol",
  "Find a Spanish teacher",
);

// HUB_COPY-style trust labels for the YoPratiqo 12-month access + money-back promise.
// Localized via t(...) so no FR/EN string is hardcoded inline in JSX.
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
  const teacherBridgeHref = `/trouver-un-prof${langSuffix}`;

  return (
    <div className="min-h-[100dvh] bg-[#FAFCFB] text-[#0F6E56]">
      <main id="main-content" className="flex flex-col pb-20">
        <YoBreadcrumb
          items={[
            { label: lstr("YoPratiqo", "YoPratiqo"), href: `/yo${langSuffix}` },
            {
              label: lstr("Langues", "Languages"),
              href: `/yo/langues${langSuffix}`,
            },
            {
              label: lstr("Espagnol", "Spanish"),
              href: `/yo/langues/espagnol${langSuffix}`,
            },
            { label: lstr("Intro globale", "Global intro") },
          ]}
          locale={locale}
        />

        {/* Hero */}
        <section
          aria-labelledby="yo-spanish-intro-title"
          className="relative overflow-hidden"
        >
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(244,180,0,0.18),transparent_30%),radial-gradient(circle_at_86%_18%,rgba(221,244,241,0.85),transparent_32%),linear-gradient(180deg,#fffbf0_0%,#fff4d6_45%,#ddf4f1_100%)]"
          />
          <div className="relative mx-auto flex max-w-5xl flex-col gap-4 px-5 pt-10 pb-10 sm:px-8 sm:pt-12 sm:pb-14">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#F4B400]/45 bg-white/80 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-[#0F6E56]">
                <Sparkles className="size-3.5 text-[#F4B400]" aria-hidden />
                {locale === "fr" ? "Intro gratuite" : "Free intro"}
              </span>
              <Link
                href={toggleHref}
                className="rounded-full border border-[#0F6E56]/15 bg-white/80 px-3 py-1.5 text-xs font-bold text-[#0F6E56] transition hover:bg-white"
              >
                {locale === "fr" ? "View in English" : "Voir en français"}
              </Link>
            </div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#1D9E75]">
              YoPratiqo · {locale === "fr" ? "Espagnol" : "Spanish"}
            </p>
            <h1
              id="yo-spanish-intro-title"
              className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-[#0F6E56] sm:text-4xl lg:text-[2.75rem]"
            >
              {t(PAGE_TITLE, locale)}
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-[#0F6E56]/78 sm:text-lg">
              {t(PAGE_SUBTITLE, locale)}
            </p>
          </div>
        </section>

        {/* 1) Spanish in the world */}
        <section
          aria-labelledby="yo-spanish-world-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]">
            {t(SECTION_LABELS.worldEyebrow, locale)}
          </span>
          <h2
            id="yo-spanish-world-title"
            className="mt-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            {locale === "fr"
              ? "Une langue qui voyage avec ses parlants"
              : "A language that travels with its speakers"}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#0F6E56]/78 sm:text-[0.95rem]">
            {t(worldIntro, locale)}
          </p>
          <ul role="list" className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {worldStats.map((stat) => (
              <li
                key={stat.id}
                className="flex flex-col gap-1 rounded-2xl border border-teal-100 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
              >
                <span className="text-2xl font-semibold tracking-tight text-[#0F6E56] sm:text-3xl">
                  {t(stat.value, locale)}
                </span>
                <span className="text-xs leading-snug text-[#0F6E56]/70 sm:text-sm">
                  {t(stat.label, locale)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* 2) Origin of the language */}
        <section
          aria-labelledby="yo-spanish-origin-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]">
            {t(SECTION_LABELS.originEyebrow, locale)}
          </span>
          <h2
            id="yo-spanish-origin-title"
            className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            <BookOpen className="size-5 text-[#1D9E75]" aria-hidden />
            {t(ORIGIN_TITLE, locale)}
          </h2>
          <ol role="list" className="mt-6 grid gap-3">
            {originTimeline.map((step) => (
              <li
                key={step.id}
                className="grid gap-2 rounded-2xl border border-teal-100 bg-white p-4 sm:grid-cols-[140px_1fr] sm:items-start sm:gap-4 sm:p-5"
              >
                <span className="ds-label text-[#F4B400]">{t(step.era, locale)}</span>
                <p className="text-sm leading-relaxed text-[#0F6E56]/78">
                  {t(step.description, locale)}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* 3) Spanish-speaking countries */}
        <section
          aria-labelledby="yo-spanish-countries-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]">
            {t(SECTION_LABELS.countriesEyebrow, locale)}
          </span>
          <h2
            id="yo-spanish-countries-title"
            className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            <Globe2 className="size-5 text-[#1D9E75]" aria-hidden />
            {t(COUNTRIES_TITLE, locale)}
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
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

        {/* 4) Why Spanish changes by country */}
        <section
          aria-labelledby="yo-spanish-variations-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]">
            {t(SECTION_LABELS.variationsEyebrow, locale)}
          </span>
          <h2
            id="yo-spanish-variations-title"
            className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            <Music2 className="size-5 text-[#1D9E75]" aria-hidden />
            {t(VARIATIONS_TITLE, locale)}
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
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

        {/* 5) Universal first words */}
        <section
          aria-labelledby="yo-spanish-words-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]">
            {t(SECTION_LABELS.wordsEyebrow, locale)}
          </span>
          <h2
            id="yo-spanish-words-title"
            className="mt-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            {t(WORDS_TITLE, locale)}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#0F6E56]/78">
            {t(SECTION_LABELS.wordsBody, locale)}
          </p>
          <ul role="list" className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {universalWords.map((word) => {
              return (
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
              );
            })}
          </ul>
        </section>

        {/* 5b) Guided reading — short A1 Spanish text + reading quiz */}
        <YoReadingPreview section={readingSection} locale={locale} />

        {/* 6) Quiz — reuses YoQuizPreview */}
        <YoQuizPreview questions={quizQuestions} locale={locale} />

        {/* 7) Flashcards — reuses YoFlashcardPreview (autoplay + audio) */}
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

        {/* 7b) YoPratiqo Coach — deterministic next-step recommendation */}
        <YoCoachPanel
          options={coachOptions}
          locale={locale}
          teacherHref={teacherBridgeHref}
        />

        {/* 8) Choose your destination */}
        <section
          aria-labelledby="yo-spanish-destinations-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]">
            {t(SECTION_LABELS.destinationsEyebrow, locale)}
          </span>
          <h2
            id="yo-spanish-destinations-title"
            className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            <Compass className="size-5 text-[#1D9E75]" aria-hidden />
            {t(DESTINATIONS_TITLE, locale)}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#0F6E56]/78">
            {t(SECTION_LABELS.destinationsBody, locale)}
          </p>
          {/* Trust strip: surface the YoPratiqo 12-month access + 30-day money-back
              promise at the moment buyers transition from the free intro to
              a paid country module — the closest analogue to a buy block on
              this otherwise-free page. */}
          <div className="mt-5 flex flex-col gap-2 rounded-2xl border border-[#DDF4F1] bg-white/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
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
          <ul role="list" className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                      {t(dest.name, locale)}
                    </h3>
                    <span
                      className={
                        "text-[10px] font-black uppercase tracking-[0.14em] " +
                        (isAvailable
                          ? "text-[#0F6E56]"
                          : "text-[#0F6E56]/55")
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

        {/* 9) Teacher bridge */}
        <section
          aria-labelledby="yo-spanish-teacher-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <div className="relative overflow-hidden rounded-3xl border border-[#F4B400]/35 bg-gradient-to-br from-[#FFF4D6] via-white to-[#DDF4F1] p-6 shadow-[0_8px_24px_rgba(15,58,52,0.07)] sm:p-8">
            <div
              aria-hidden
              className="absolute -right-16 -top-16 size-52 rounded-full bg-[#F4B400]/20 blur-3xl"
            />
            <div className="relative grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-center">
              <div>
                <span className="ds-label text-[#8a5a17]">
                  {t(SECTION_LABELS.teacherEyebrow, locale)}
                </span>
                <h2
                  id="yo-spanish-teacher-title"
                  className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#1a3a32] sm:text-[1.65rem]"
                >
                  <GraduationCap
                    className="size-5 text-[#0F6E56]"
                    aria-hidden
                  />
                  {t(TEACHER_TITLE, locale)}
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#1a3a32]/78 sm:text-[0.95rem]">
                  {t(TEACHER_BODY, locale)}
                </p>
              </div>
              <div className="flex flex-col gap-3 lg:items-end">
                <Link
                  href="/trouver-un-prof"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0F6E56] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(15,110,86,0.22)] transition hover:bg-[#0b5b47]"
                >
                  <MessageCircle className="size-4" aria-hidden />
                  {t(TEACHER_CTA, locale)}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
