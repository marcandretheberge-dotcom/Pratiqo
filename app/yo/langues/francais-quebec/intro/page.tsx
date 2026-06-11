/**
 * YoPratiqo — Français · Intro: Moving to Quebec (pre-arrival)
 *
 * Free, English-first orientation module for international learners
 * considering moving to Quebec. Unlike the Spanish intro (FR-default
 * for the Quebec audience), this page defaults to English because
 * the audience is pre-arrival, international, and English is their
 * lingua franca. `?lang=fr` flips to French.
 *
 * The legacy long-scroll page with a 3-level breadcrumb is replaced
 * by the shared `<YoLessonDeck />` app-shell so the experience is
 * one focused screen at a time with companion presence everywhere.
 *
 * What is PRESERVED verbatim:
 *   - `frenchQuebecIntro` data file (no field renamed, no row
 *     deleted).
 *   - `YoFrenchAudioButton` integration with
 *     `accentProfile="quebec_french"` + `speechLang="fr-CA"`.
 *   - The Quebec-vs-France comparison table, survival vocabulary,
 *     Quebec quick-stats + culture cards, CEFR / CLB-NCLC /
 *     Échelle québécoise scales side-by-side, culture survival
 *     kit with iconography.
 *   - `YoFlashcardPreview` autoplay + the `fr-CA` audio context.
 *   - `YoQuizPreview` reveal-only contract.
 *   - Every Quebec-French target string still renders with
 *     `lang="fr-CA"`.
 *   - Official-sources disclaimer (Canada.ca / Québec.ca / IRCC /
 *     MIFI mention) verbatim.
 *   - The upcoming workplace-module bridge card at the end —
 *     mounted on the deck's teacher screen so learners can still
 *     opt into the preview.
 *   - Teacher CTA → `/trouver-un-prof?q=francais`.
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
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle2,
  GraduationCap,
  HandHeart,
  Heart,
  Info,
  Languages,
  MessageCircle,
  Snowflake,
  Train,
  Utensils,
  Wallet,
} from "lucide-react";

import { buildYoLocaleHref, lstr, t } from "@/lib/yo/localize";
import { buildYoPratiqoMetadata } from "@/lib/yo/yopratiqoSeo";
import type { YoLocale } from "@/lib/yo/types";
import { frenchQuebecIntro } from "@/lib/yo/frenchQuebecIntro";
import { YoFlashcardPreview } from "@/components/yo/YoFlashcardPreview";
import { YoQuizPreview } from "@/components/yo/YoQuizPreview";
import { YoFrenchAudioButton } from "@/components/yo/YoFrenchAudioButton";
import { YoUpcomingModuleCard } from "@/components/yo/YoUpcomingModuleCard";
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
  return buildYoPratiqoMetadata("frenchQuebecIntro", params.lang);
}

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

const PAGE_TITLE = lstr(
  "Bienvenue. Tu déménages au Québec ?",
  "Bienvenue. Are you moving to Quebec?",
);

const PAGE_SUBTITLE = lstr(
  "Une première leçon, environ 6 à 8 minutes, pour comprendre le français du Québec et arriver mieux préparé.",
  "A first lesson, around 6–8 minutes, to understand Quebec French and arrive better prepared.",
);

// ─── Deck-screen labels ─────────────────────────────────────────────────
const DECK_LABEL_WELCOME = lstr("Bienvenue", "Welcome");
const DECK_TITLE_WELCOME = lstr(
  "Pas le « français de Paris ». Le français du Québec.",
  "Not “French from Paris.” Quebec French.",
);
const DECK_HELPER_WELCOME = lstr(
  "Un écran à la fois — balayage, tape ou flèches Back / Next.",
  "One screen at a time — swipe, tap, or arrow keys.",
);

const DECK_LABEL_COMPARISON = lstr(
  "Québécois vs Français de France",
  "Quebec French vs France French",
);
const DECK_TITLE_COMPARISON = lstr(
  "Une langue, deux variantes nord-américaine et européenne",
  "One language, North-American and European varieties",
);

const DECK_LABEL_SURVIVAL = lstr(
  "Premiers mots de survie",
  "First survival words",
);
const DECK_TITLE_SURVIVAL = lstr(
  "Les premiers mots qui ouvrent les portes",
  "First words that open doors",
);
const DECK_HELPER_SURVIVAL = lstr(
  "Tape l’audio pour entendre la prononciation québécoise.",
  "Tap the audio to hear the Quebec pronunciation.",
);

const DECK_LABEL_QUEBEC = lstr(
  "Le Québec en 3 minutes",
  "Quebec in 3 minutes",
);
const DECK_TITLE_QUEBEC = lstr(
  "Une province nord-américaine francophone",
  "A French-speaking North-American province",
);

const DECK_LABEL_LEVELS = lstr("Niveaux de langue", "Language levels");
const DECK_TITLE_LEVELS = lstr(
  "CECR, NCLC/CLB, Échelle québécoise",
  "CEFR, CLB/NCLC, Échelle québécoise",
);

const DECK_LABEL_KIT = lstr(
  "Trousse de survie culturelle",
  "Culture survival kit",
);
const DECK_TITLE_KIT = lstr(
  "Petits réflexes pour les premiers jours",
  "Small reflexes for your first days",
);

const DECK_LABEL_QUIZ = lstr("Mini quiz", "Mini quiz");
const DECK_TITLE_QUIZ = lstr(
  "Vois si les mots ont déjà accroché",
  "See if the words have stuck",
);
const DECK_HELPER_QUIZ = lstr(
  "Six questions rapides, pas de jugement.",
  "Six quick questions, no judgment.",
);

const DECK_LABEL_FLASH = lstr("Flashcards", "Flashcards");
const DECK_TITLE_FLASH = lstr(
  "Six paquets, vingt mots à mémoriser",
  "Six decks, twenty words to memorise",
);

const DECK_LABEL_TEACHER = lstr(
  "Pratique avec un prof",
  "Practice with a teacher",
);
const DECK_TITLE_TEACHER = lstr(
  "Pratique avec un vrai prof de français du Québec",
  "Practice with a real Quebec French teacher",
);

const TEACHER_BODY = lstr(
  "Une fois que tu connais ces mots, parler avec une vraie personne accélère tout. Les profs Pratiqo de français te corrigent, t’expliquent les nuances québécoises et t’aident à arriver en confiance.",
  "Once you know these words, speaking with a real person accelerates everything. Pratiqo French teachers correct you, explain Quebec nuances, and help you arrive with confidence.",
);

const TEACHER_CTA = lstr(
  "Trouver un prof de français",
  "Find a French teacher",
);

const twelveMonthAccessLabel = lstr("Accès 12 mois", "12-month access");
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

  const meta = getYoLanguageIntroDeckMeta("francais-quebec");
  // The hub default locale is FR; pre-arrival back link respects
  // whichever language the learner picked on the intro deck.
  const backHref =
    locale === "en"
      ? `${meta.backRoute}?lang=en`
      : `${meta.backRoute}?lang=fr`;
  const teacherHref = `/trouver-un-prof?q=${meta.teacherSearchQuery}${
    locale === "en" ? "&lang=en" : ""
  }`;

  // Locale-aware destination for the upcoming Quebec French
  // workplace module shell — preserved verbatim from the old
  // long-scroll page and surfaced on the deck teacher screen so
  // learners can still opt into the preview.
  const upcomingModuleHref =
    locale === "fr"
      ? "/yo/langues/francais-quebec/module-1?lang=fr"
      : "/yo/langues/francais-quebec/module-1?lang=en";

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
          data-yo-fr-qc-intro-deck-screen="welcome"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <h1
            id="yo-fr-qc-intro-title"
            className="text-2xl font-semibold leading-tight tracking-tight text-[#0F6E56] sm:text-3xl"
          >
            {t(PAGE_TITLE, locale)}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/78 sm:text-base">
            {t(PAGE_SUBTITLE, locale)}
          </p>
          <p className="mt-5 text-sm leading-relaxed text-[#0F6E56]/85 sm:text-base">
            {t(welcomeIntro, locale)}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[#0F6E56]/85 sm:text-base">
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
      ),
    },
    {
      id: "comparison",
      kind: "culture",
      eyebrow: t(DECK_LABEL_COMPARISON, locale),
      title: t(DECK_TITLE_COMPARISON, locale),
      companionState: "map",
      content: (
        <section
          data-yo-fr-qc-intro-deck-screen="comparison"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <p className="text-sm leading-relaxed text-[#0F6E56]/78">
            {t(qcVsFrIntro, locale)}
          </p>
          <div className="mt-5 overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-[0_1px_2px_rgba(15,58,52,0.04)]">
            <table className="min-w-full text-left text-sm">
              <caption className="sr-only">
                {t(DECK_TITLE_COMPARISON, locale)}
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
                      <p
                        className="font-semibold text-[#0F6E56]"
                        lang="fr-CA"
                      >
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
          data-yo-fr-qc-intro-deck-screen="survival"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <p className="text-sm leading-relaxed text-[#0F6E56]/78">
            {locale === "fr"
              ? "Appuie sur l’icône audio pour entendre la prononciation québécoise."
              : "Tap the audio icon to hear the Quebec pronunciation."}
          </p>
          <ul role="list" className="mt-5 grid gap-3 sm:grid-cols-2">
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
      ),
    },
    {
      id: "quebec",
      kind: "culture",
      eyebrow: t(DECK_LABEL_QUEBEC, locale),
      title: t(DECK_TITLE_QUEBEC, locale),
      companionState: "map",
      content: (
        <section
          data-yo-fr-qc-intro-deck-screen="quebec"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <ul role="list" className="grid gap-3 sm:grid-cols-2">
            {quebecQuickStats.map((stat) => (
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
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {quebecFacts.map((fact) => (
              <article
                key={fact.id}
                className="rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
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
      ),
    },
    {
      id: "levels",
      kind: "culture",
      eyebrow: t(DECK_LABEL_LEVELS, locale),
      title: t(DECK_TITLE_LEVELS, locale),
      companionState: "map",
      content: (
        <section
          data-yo-fr-qc-intro-deck-screen="levels"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <p className="text-sm leading-relaxed text-[#0F6E56]/78">
            {t(languageLevelsLeadIn, locale)}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {languageScales.map((scale) => (
              <article
                key={scale.id}
                className="rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
              >
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0F6E56]/55">
                  {t(scale.scope, locale)}
                </p>
                <h3 className="mt-1 text-base font-semibold text-[#0F6E56]">
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
      ),
    },
    {
      id: "kit",
      kind: "culture",
      eyebrow: t(DECK_LABEL_KIT, locale),
      title: t(DECK_TITLE_KIT, locale),
      companionState: "map",
      content: (
        <section
          data-yo-fr-qc-intro-deck-screen="kit"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <ul role="list" className="grid gap-3 sm:grid-cols-2">
            {survivalKit.map((tip) => {
              const Icon = KIT_ICONS[tip.iconHint];
              return (
                <li
                  key={tip.id}
                  className="flex gap-3 rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
                >
                  <span
                    aria-hidden
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#DDF4F1] text-[#0F6E56]"
                  >
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-[#0F6E56]">
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
          data-yo-fr-qc-intro-deck-screen="quiz"
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
          data-yo-fr-qc-intro-deck-screen="flashcards"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <p className="text-sm leading-relaxed text-[#0F6E56]/78">
            {locale === "fr"
              ? "Survole d’abord les groupes pour avoir une carte mentale, puis active la lecture autoplay du paquet complet juste en dessous."
              : "Browse the groups first for a mental map, then start the full-deck autoplay player just below."}
          </p>
          <ul role="list" className="mt-5 grid gap-3 sm:grid-cols-2">
            {flashcardGroups.map((group) => (
              <article
                key={group.id}
                className="rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
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
          data-yo-fr-qc-intro-deck-screen="teacher"
          className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8"
        >
          <div className="relative overflow-hidden rounded-3xl border border-[#F4B400]/35 bg-gradient-to-br from-[#FFF4D6] via-white to-[#DDF4F1] p-6 shadow-[0_18px_44px_rgba(15,58,52,0.08)] sm:p-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#0F6E56] ring-1 ring-[#F4B400]/45">
              <GraduationCap className="size-3.5 text-[#F4B400]" aria-hidden />
              {t(DECK_LABEL_TEACHER, locale)}
            </span>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#1a3a32]/85 sm:text-base">
              {t(TEACHER_BODY, locale)}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-[#0F6E56]">
                <CheckCircle2 className="size-3.5" aria-hidden />
                {t(twelveMonthAccessLabel, locale)}
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
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={teacherHref}
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
          {/*
           * Upcoming-module bridge — preserved verbatim from the
           * legacy long-scroll page so learners can still opt into
           * the workplace module preview. No checkout, no Stripe,
           * no Course schema.
           */}
          <div className="mt-6">
            <YoUpcomingModuleCard locale={locale} href={upcomingModuleHref} />
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
