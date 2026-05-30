/**
 * YoPratiqo — Français · Intro: Moving to Quebec (pre-arrival)
 *
 * Free, English-first orientation module for international learners
 * considering moving to Quebec. Unlike the Spanish intro (FR-default
 * for the Quebec audience), this page defaults to English because
 * the audience is pre-arrival, international, and English is their
 * lingua franca.
 *
 * Composed of nine sections, server-rendered from
 * `lib/yo/frenchQuebecIntro.ts`:
 *   1. Welcome to Quebec French
 *   2. Quebec French vs France French
 *   3. First survival words (with audio)
 *   4. Quebec in 3 minutes
 *   5. Language levels: CEFR · CLB/NCLC · Échelle québécoise
 *   6. Culture survival kit
 *   7. Mini quiz (reuses YoQuizPreview)
 *   8. Flashcards (grouped + reuses YoFlashcardPreview)
 *   9. Teacher CTA
 *
 * Locale behaviour:
 *   - Default: EN (audience is international).
 *   - `?lang=fr` flips to French.
 *   - All Quebec-French target words render with `lang="fr-CA"`.
 *
 * Audio:
 *   - Pronunciation is served via `YoFrenchAudioButton`, which prefers
 *     a pre-generated MP3 from the Supabase Storage `yopratiqo-audio`
 *     bucket (resolved through the manifest with
 *     `accentProfile="quebec_french"`) and falls back to on-device
 *     Web Speech with BCP-47 `fr-CA` only when an item is missing.
 *     No OpenAI calls from the browser; no per-row API keys; the
 *     bucket URL is the public `NEXT_PUBLIC_SUPABASE_URL`.
 *
 * No Stripe, no Supabase, no payment math, no checkout, no migration,
 * no RLS policy, no marketplace logic.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Compass,
  GraduationCap,
  HandHeart,
  Heart,
  Info,
  Languages,
  MapPin,
  MessageCircle,
  Snowflake,
  Sparkles,
  Train,
  Utensils,
  Wallet,
} from "lucide-react";
import { SITE_URL } from "@/lib/seo/site";
import { buildYoLocaleHref, lstr, t } from "@/lib/yo/localize";
import type { YoLocale } from "@/lib/yo/types";
import { frenchQuebecIntro } from "@/lib/yo/frenchQuebecIntro";
import { YoBreadcrumb } from "@/components/yo/YoBreadcrumb";
import { YoFlashcardPreview } from "@/components/yo/YoFlashcardPreview";
import { YoQuizPreview } from "@/components/yo/YoQuizPreview";
import { YoFrenchAudioButton } from "@/components/yo/YoFrenchAudioButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "YoPratiqo — Moving to Quebec · Free pre-arrival French intro",
  description:
    "An English-first introduction to Quebec French for people thinking about moving to Quebec. Survival words, culture, language scales, mini quiz, and flashcards.",
  alternates: {
    canonical: `${SITE_URL}/yo/langues/francais-quebec/intro`,
  },
  openGraph: {
    title: "YoPratiqo — Moving to Quebec · Pre-arrival French intro",
    description:
      "Quebec French essentials for people considering a move to Quebec — survival vocabulary, culture, and language levels, English-first.",
    type: "website",
    url: `${SITE_URL}/yo/langues/francais-quebec/intro`,
    locale: "en_CA",
  },
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ lang?: string | string[] }>;
}

/**
 * Resolve a `?lang=` param into a locale, defaulting to EN.
 *
 * The shared `getYoLocale` helper defaults to FR (Quebec audience).
 * For this pre-arrival module the audience is international, so EN
 * is the better default. We override locally instead of touching
 * the shared helper.
 */
function resolveIntroLocale(input?: string | string[] | null): YoLocale {
  const raw = Array.isArray(input) ? input[0] : input;
  if (typeof raw !== "string") return "en";
  const normalized = raw.trim().toLowerCase();
  return normalized === "fr" ? "fr" : "en";
}

const PAGE_LABEL = lstr(
  "Pré-arrivée gratuite",
  "Free pre-arrival",
);

const PAGE_TITLE = lstr(
  "Bienvenue. Tu déménages au Québec ?",
  "Bienvenue. Are you moving to Quebec?",
);

const PAGE_SUBTITLE = lstr(
  "Une première leçon, environ 6 à 8 minutes, pour comprendre le français du Québec et arriver mieux préparé.",
  "A first lesson, around 6–8 minutes, to understand Quebec French and arrive better prepared.",
);

const SECTION_LABELS = {
  welcome: lstr("Bienvenue", "Welcome"),
  comparison: lstr(
    "Québécois vs Français de France",
    "Quebec French vs France French",
  ),
  survival: lstr("Premiers mots de survie", "First survival words"),
  quebec: lstr("Le Québec en 3 minutes", "Quebec in 3 minutes"),
  levels: lstr("Niveaux de langue", "Language levels"),
  kit: lstr("Trousse de survie culturelle", "Culture survival kit"),
  quiz: lstr("Mini quiz", "Mini quiz"),
  flashcards: lstr("Flashcards", "Flashcards"),
  teacher: lstr("Pratique avec un prof", "Practice with a teacher"),
} as const;

const SECTION_TITLES = {
  welcome: lstr(
    "Pas le « français de Paris ». Le français du Québec.",
    "Not “French from Paris.” Quebec French.",
  ),
  comparison: lstr(
    "Une langue, deux variantes nord-américaine et européenne",
    "One language, North-American and European varieties",
  ),
  survival: lstr(
    "Les premiers mots qui ouvrent les portes",
    "First words that open doors",
  ),
  quebec: lstr(
    "Une province nord-américaine francophone",
    "A French-speaking North-American province",
  ),
  levels: lstr(
    "CECR, NCLC/CLB, Échelle québécoise",
    "CEFR, CLB/NCLC, Échelle québécoise",
  ),
  kit: lstr(
    "Petits réflexes pour les premiers jours",
    "Small reflexes for your first days",
  ),
  teacher: lstr(
    "Pratique avec un vrai prof de français du Québec",
    "Practice with a real Quebec French teacher",
  ),
} as const;

const TEACHER_BODY = lstr(
  "Une fois que tu connais ces mots, parler avec une vraie personne accélère tout. Les profs Pratiqo de français te corrigent, t’expliquent les nuances québécoises et t’aident à arriver en confiance.",
  "Once you know these words, speaking with a real person accelerates everything. Pratiqo French teachers correct you, explain Quebec nuances, and help you arrive with confidence.",
);

const TEACHER_CTA = lstr(
  "Trouver un prof de français",
  "Find a French teacher",
);

const lifetimeAccessLabel = lstr("Accès à vie", "Lifetime access");
const moneyBackLabel = lstr(
  "30 jours satisfait ou remboursé",
  "30-day money-back",
);
const legalLinkLabel = lstr("Voir les conditions", "See the terms");

const KIT_ICONS = {
  greeting: HandHeart,
  language: Languages,
  health: Heart,
  winter: Snowflake,
  money: Wallet,
  transit: Train,
  food: Utensils,
  calendar: Calendar,
} as const;

export default async function YoFrancaisQuebecIntroPage({
  searchParams,
}: PageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = resolveIntroLocale(resolvedSearchParams.lang);
  const langSuffix = locale === "fr" ? "?lang=fr" : "";
  const toggleHref = buildYoLocaleHref(
    "/yo/langues/francais-quebec/intro",
    locale === "en" ? "fr" : "en",
  );

  const {
    welcomeIntro,
    welcomePromise,
    officialLanguageNote,
    qcVsFrIntro,
    qcVsFrTable,
    survivalWords,
    quebecQuickStats,
    quebecFacts,
    languageScales,
    languageLevelsLeadIn,
    officialSourcesDisclaimer,
    survivalKit,
    quizQuestions,
    flashcardGroups,
    flashcards,
  } = frenchQuebecIntro;

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
              label: lstr("Français du Québec", "Quebec French"),
            },
          ]}
          locale={locale}
        />

        {/* Hero */}
        <section
          aria-labelledby="yo-fr-qc-intro-title"
          className="relative overflow-hidden"
        >
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(15,110,86,0.18),transparent_30%),radial-gradient(circle_at_86%_18%,rgba(244,180,0,0.18),transparent_32%),linear-gradient(180deg,#fbfdff_0%,#dde9f4_45%,#ddf4f1_100%)]"
          />
          <div className="relative mx-auto flex max-w-5xl flex-col gap-4 px-5 pt-10 pb-10 sm:px-8 sm:pt-12 sm:pb-14">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#0F6E56]/30 bg-white/80 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-[#0F6E56]">
                <Sparkles className="size-3.5 text-[#F4B400]" aria-hidden />
                {t(PAGE_LABEL, locale)}
              </span>
              <Link
                href={toggleHref}
                className="rounded-full border border-[#0F6E56]/15 bg-white/80 px-3 py-1.5 text-xs font-bold text-[#0F6E56] transition hover:bg-white"
              >
                {locale === "en" ? "Voir en français" : "View in English"}
              </Link>
            </div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#1D9E75]">
              YoPratiqo · {locale === "fr" ? "Français du Québec" : "Quebec French"}
            </p>
            <h1
              id="yo-fr-qc-intro-title"
              className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-[#0F6E56] sm:text-4xl lg:text-[2.75rem]"
            >
              {t(PAGE_TITLE, locale)}
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-[#0F6E56]/78 sm:text-lg">
              {t(PAGE_SUBTITLE, locale)}
            </p>
          </div>
        </section>

        {/* 1) Welcome */}
        <section
          aria-labelledby="yo-fr-qc-welcome-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]">
            {t(SECTION_LABELS.welcome, locale)}
          </span>
          <h2
            id="yo-fr-qc-welcome-title"
            className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            <Compass className="size-5 text-[#1D9E75]" aria-hidden />
            {t(SECTION_TITLES.welcome, locale)}
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#0F6E56]/78 sm:text-[0.95rem]">
            {t(welcomeIntro, locale)}
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#0F6E56]/78 sm:text-[0.95rem]">
            {t(welcomePromise, locale)}
          </p>
          <div className="mt-5 rounded-2xl border border-[#DDF4F1] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)] sm:px-5 sm:py-5">
            <p className="flex gap-2 text-[0.8rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
              <Info className="size-4 text-[#1D9E75]" aria-hidden />
              {locale === "fr"
                ? "Politique linguistique du Québec"
                : "Quebec language policy"}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/80">
              {t(officialLanguageNote, locale)}
            </p>
          </div>
        </section>

        {/* 2) Quebec vs France comparison */}
        <section
          aria-labelledby="yo-fr-qc-comparison-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]">
            {t(SECTION_LABELS.comparison, locale)}
          </span>
          <h2
            id="yo-fr-qc-comparison-title"
            className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            <BookOpen className="size-5 text-[#1D9E75]" aria-hidden />
            {t(SECTION_TITLES.comparison, locale)}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#0F6E56]/78">
            {t(qcVsFrIntro, locale)}
          </p>
          <div className="mt-6 overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-[0_1px_2px_rgba(15,58,52,0.04)]">
            <table className="min-w-full text-left text-sm">
              <caption className="sr-only">
                {t(SECTION_TITLES.comparison, locale)}
              </caption>
              <thead className="bg-[#DDF4F1]/60 text-xs font-black uppercase tracking-[0.14em] text-[#0F6E56]">
                <tr>
                  <th scope="col" className="px-3 py-2 sm:px-4 sm:py-3">
                    {locale === "fr" ? "Concept" : "Concept"}
                  </th>
                  <th scope="col" className="px-3 py-2 sm:px-4 sm:py-3">
                    {locale === "fr" ? "Au Québec" : "In Quebec"}
                  </th>
                  <th scope="col" className="px-3 py-2 sm:px-4 sm:py-3">
                    {locale === "fr" ? "En France" : "In France"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-teal-50">
                {qcVsFrTable.map((row) => (
                  <tr key={row.id} className="align-top">
                    <th
                      scope="row"
                      className="px-3 py-3 font-medium text-[#0F6E56] sm:px-4"
                    >
                      {t(row.concept, locale)}
                    </th>
                    <td className="px-3 py-3 sm:px-4">
                      <p className="font-semibold text-[#0F6E56]" lang="fr-CA">
                        {row.quebec}
                      </p>
                      {row.note ? (
                        <p className="mt-1 text-xs leading-relaxed text-[#0F6E56]/65">
                          {t(row.note, locale)}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 sm:px-4">
                      <p className="text-[#0F6E56]/85" lang="fr">
                        {row.france}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 3) First survival words */}
        <section
          aria-labelledby="yo-fr-qc-survival-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]">
            {t(SECTION_LABELS.survival, locale)}
          </span>
          <h2
            id="yo-fr-qc-survival-title"
            className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            <MessageCircle className="size-5 text-[#1D9E75]" aria-hidden />
            {t(SECTION_TITLES.survival, locale)}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#0F6E56]/78">
            {locale === "fr"
              ? "Appuie sur l’icône audio pour entendre la prononciation québécoise."
              : "Tap the audio icon to hear the Quebec pronunciation."}
          </p>
          <ul role="list" className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {survivalWords.map((word) => (
              <li
                key={word.id}
                className="rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <p
                    className="text-lg font-semibold text-[#0F6E56]"
                    lang="fr-CA"
                  >
                    {word.target}
                  </p>
                  <YoFrenchAudioButton
                    text={word.target}
                    locale={locale}
                    moduleId="francais-quebec-intro"
                    lessonId="pre-arrival-intro"
                    accentProfile="quebec_french"
                    speechLang="fr-CA"
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

        {/* 4) Quebec in 3 minutes */}
        <section
          aria-labelledby="yo-fr-qc-quebec-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]">
            {t(SECTION_LABELS.quebec, locale)}
          </span>
          <h2
            id="yo-fr-qc-quebec-title"
            className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            <MapPin className="size-5 text-[#1D9E75]" aria-hidden />
            {t(SECTION_TITLES.quebec, locale)}
          </h2>
          <ul
            role="list"
            className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            {quebecQuickStats.map((stat) => (
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
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {quebecFacts.map((fact) => (
              <article
                key={fact.id}
                className="rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)] sm:p-5"
              >
                <h3 className="text-base font-semibold text-[#0F6E56]">
                  {t(fact.title, locale)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/72">
                  {t(fact.body, locale)}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* 5) Language levels */}
        <section
          aria-labelledby="yo-fr-qc-levels-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]">
            {t(SECTION_LABELS.levels, locale)}
          </span>
          <h2
            id="yo-fr-qc-levels-title"
            className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            <GraduationCap className="size-5 text-[#1D9E75]" aria-hidden />
            {t(SECTION_TITLES.levels, locale)}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#0F6E56]/78">
            {t(languageLevelsLeadIn, locale)}
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {languageScales.map((scale) => (
              <article
                key={scale.id}
                className="rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)] sm:p-5"
              >
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0F6E56]/55">
                  {t(scale.scope, locale)}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-[#0F6E56]">
                  {t(scale.scaleName, locale)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/80">
                  {t(scale.levels, locale)}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-[#0F6E56]/65">
                  {t(scale.usedFor, locale)}
                </p>
              </article>
            ))}
          </div>
          <div
            role="note"
            className="mt-5 flex gap-3 rounded-2xl border border-[#F4B400]/35 bg-[#FFF8E1] px-4 py-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)] sm:px-5 sm:py-5"
          >
            <AlertTriangle
              className="mt-0.5 size-5 shrink-0 text-[#8a5a17]"
              aria-hidden
            />
            <p className="text-sm leading-relaxed text-[#5a3f0f]">
              <span className="font-bold text-[#5a3f0f]">
                {locale === "fr" ? "À retenir : " : "Heads-up: "}
              </span>
              {t(officialSourcesDisclaimer, locale)}
            </p>
          </div>
        </section>

        {/* 6) Culture survival kit */}
        <section
          aria-labelledby="yo-fr-qc-kit-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]">
            {t(SECTION_LABELS.kit, locale)}
          </span>
          <h2
            id="yo-fr-qc-kit-title"
            className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            <HandHeart className="size-5 text-[#1D9E75]" aria-hidden />
            {t(SECTION_TITLES.kit, locale)}
          </h2>
          <ul role="list" className="mt-6 grid gap-3 sm:grid-cols-2">
            {survivalKit.map((tip) => {
              const Icon = KIT_ICONS[tip.iconHint];
              return (
                <li
                  key={tip.id}
                  className="flex gap-3 rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)] sm:p-5"
                >
                  <span
                    aria-hidden
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#DDF4F1] text-[#0F6E56]"
                  >
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-[#0F6E56] sm:text-base">
                      {t(tip.title, locale)}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-[#0F6E56]/72">
                      {t(tip.body, locale)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* 7) Mini quiz */}
        <section
          aria-labelledby="yo-fr-qc-quiz-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]">
            {t(SECTION_LABELS.quiz, locale)}
          </span>
          <h2
            id="yo-fr-qc-quiz-title"
            className="mt-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            {locale === "fr"
              ? "Vois si les mots ont déjà accroché"
              : "See if the words have stuck"}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#0F6E56]/78">
            {locale === "fr"
              ? "Six questions rapides, pas de jugement. C’est de l’orientation, pas un examen d’immigration."
              : "Six quick questions, no judgment. This is orientation, not an immigration exam."}
          </p>
          <div className="mt-6">
            <YoQuizPreview questions={quizQuestions} locale={locale} />
          </div>
        </section>

        {/* 8) Flashcards: grouped intro + interactive deck */}
        <section
          aria-labelledby="yo-fr-qc-flashcards-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]">
            {t(SECTION_LABELS.flashcards, locale)}
          </span>
          <h2
            id="yo-fr-qc-flashcards-title"
            className="mt-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            {locale === "fr"
              ? "Six paquets, vingt mots à mémoriser"
              : "Six decks, twenty words to memorise"}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#0F6E56]/78">
            {locale === "fr"
              ? "Survole d’abord les groupes pour avoir une carte mentale, puis active la lecture autoplay du paquet complet juste en dessous."
              : "Browse the groups first for a mental map, then start the full-deck autoplay player just below."}
          </p>
          <ul
            role="list"
            className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {flashcardGroups.map((group) => (
              <article
                key={group.id}
                className="rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)] sm:p-5"
              >
                <h3 className="text-base font-semibold text-[#0F6E56]">
                  {t(group.title, locale)}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[#0F6E56]/65">
                  {t(group.description, locale)}
                </p>
                <ul role="list" className="mt-3 flex flex-wrap gap-1.5">
                  {group.cards.map((card) => (
                    <li
                      key={card.id}
                      className="inline-flex rounded-full bg-[#DDF4F1]/70 px-2.5 py-1 text-xs font-semibold text-[#0F6E56]"
                      lang="fr-CA"
                    >
                      {card.front}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </ul>
          <div className="mt-6">
            <YoFlashcardPreview
              cards={flashcards}
              locale={locale}
              speechLang="fr-CA"
              audioContext={{
                moduleId: "francais-quebec-intro",
                lessonId: "pre-arrival-intro",
                accentProfile: "quebec_french",
                speechLang: "fr-CA",
              }}
            />
          </div>
        </section>

        {/* 9) Teacher CTA */}
        <section
          aria-labelledby="yo-fr-qc-teacher-title"
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
                  {t(SECTION_LABELS.teacher, locale)}
                </span>
                <h2
                  id="yo-fr-qc-teacher-title"
                  className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#1a3a32] sm:text-[1.65rem]"
                >
                  <GraduationCap
                    className="size-5 text-[#0F6E56]"
                    aria-hidden
                  />
                  {t(SECTION_TITLES.teacher, locale)}
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#1a3a32]/78 sm:text-[0.95rem]">
                  {t(TEACHER_BODY, locale)}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-[#0F6E56]">
                    <CheckCircle2 className="size-3.5" aria-hidden />
                    {t(lifetimeAccessLabel, locale)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-[#0F6E56]">
                    <CheckCircle2 className="size-3.5" aria-hidden />
                    {t(moneyBackLabel, locale)}
                  </span>
                  <Link
                    href="/legal/yo-remboursement"
                    className="text-xs font-medium text-[#0F6E56]/75 underline-offset-2 hover:underline"
                  >
                    {t(legalLinkLabel, locale)}
                  </Link>
                </div>
              </div>
              <div className="flex flex-col gap-3 lg:items-end">
                <Link
                  href={teacherBridgeHref}
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
