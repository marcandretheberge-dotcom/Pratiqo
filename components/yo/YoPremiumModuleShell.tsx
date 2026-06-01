/**
 * YoPremiumModuleShell — shared, server-only renderer for the
 * "Bientôt disponible" / "Coming soon" premium module preview.
 *
 * Why this component exists
 * -------------------------
 * The first premium YoPratiqo module is a content shell, NOT a live
 * paid product. A dedicated shell renderer keeps the "do not pretend
 * to be live" contract centralised:
 *
 *   - No checkout button, no fake price, no fake discount.
 *   - No fake countdown, no fake reviews, no fake ratings.
 *   - Course JSON-LD is intentionally NOT injected (would falsely
 *     signal a live product to crawlers; gated separately in the root
 *     layout's `<YoCourseJsonLdHead />`).
 *   - The route is `noindex` via `buildYoPratiqoMetadata` and excluded
 *     from `app/sitemap.ts`.
 *   - The teacher-bridge CTA points to /trouver-un-prof (the real,
 *     free way to reach a Pratiqo teacher today).
 *
 * The component is a Server Component (no `"use client"`, no hooks,
 * no browser API). It can be safely composed inside any page.tsx
 * without forcing a client boundary.
 *
 * Honest copy contract
 * --------------------
 * The shell never claims:
 *   - guaranteed fluency
 *   - guaranteed exam success (TEF / TEFAQ / TCF / TCFQ / IELTS / …)
 *   - guaranteed employment outcome
 *   - guaranteed immigration result
 *   - government accreditation / OQLF / MIFI partnership
 *
 * The shell always carries the legal-safe disclaimer (rendered via
 * `YoLegalDisclaimer`) so a learner browsing the preview understands
 * the educational nature of the future product.
 */

import Link from "next/link";
import {
  Clock,
  Compass,
  GraduationCap,
  Lock,
  MessageCircle,
  Sparkles,
} from "lucide-react";

import { lstr, t } from "@/lib/yo/localize";
import type { YoLocale, YoLocalizedString } from "@/lib/yo/types";
import { YoBreadcrumb } from "@/components/yo/YoBreadcrumb";
import { YoLegalDisclaimer } from "@/components/yo/YoLegalDisclaimer";
import type { FrQuebecModuleLesson } from "@/lib/yo/frQuebecWorkplaceSurvivalModule";

export interface YoPremiumModuleShellProps {
  locale: YoLocale;
  /** Display title in both languages. */
  titleFr: string;
  titleEn: string;
  /** One-line tagline rendered under the hero title. */
  taglineFr: string;
  taglineEn: string;
  /** Audience description (newcomers / Canadian learners / workers). */
  audienceFr: string;
  audienceEn: string;
  /** Honest disclaimer surfaced directly below the audience block. */
  honestPromiseFr: string;
  honestPromiseEn: string;
  /** Lessons rendered as locked/preview cards. Expected length: 7. */
  lessons: readonly FrQuebecModuleLesson[];
  /** Teacher-bridge title + body (rendered above the /trouver-un-prof CTA). */
  teacherBridgeTitleFr: string;
  teacherBridgeTitleEn: string;
  teacherBridgeBodyFr: string;
  teacherBridgeBodyEn: string;
  /** Coming-soon notice copy rendered near the bottom of the page. */
  comingSoonBodyFr: string;
  comingSoonBodyEn: string;
  /** Breadcrumb labels for the language hub crumb (e.g. "Français québécois"). */
  languageBreadcrumbFr: string;
  languageBreadcrumbEn: string;
  /** Localized "future module" leaf crumb. */
  futureCrumbFr: string;
  futureCrumbEn: string;
  /**
   * Path back to the free intro for the same language. Rendered as a
   * primary visible CTA in the hero; the shell never links to a paid
   * destination because no paid surface exists yet.
   */
  introHref: string;
  /** Path to the teacher-search bridge (always `/trouver-un-prof?q=…`). */
  teacherBridgeHref: string;
  /**
   * Optional path to the YoPratiqo language hub for the breadcrumb.
   * Defaults to "/yo/langues" when omitted.
   */
  hubHref?: string;
}

const HERO_LABEL = lstr("Module futur YoPratiqo", "Future YoPratiqo module");
const COMING_SOON_PILL = lstr("Bientôt disponible", "Coming soon");
const AUDIENCE_LABEL = lstr("Pour qui", "Who it is for");
const HONEST_PROMISE_LABEL = lstr(
  "Notre engagement honnête",
  "Our honest commitment",
);
const LESSON_OUTLINE_LABEL = lstr(
  "Aperçu des 7 leçons",
  "Preview of the 7 lessons",
);
const LESSON_OUTLINE_TITLE = lstr(
  "Sept courtes leçons, sept situations concrètes",
  "Seven short lessons, seven concrete situations",
);
const LESSON_OUTLINE_BODY = lstr(
  "Chaque leçon est une mini-mise en situation : un contexte, trois objectifs et quelques phrases utiles. Le but est toujours de mieux préparer la prochaine séance avec un vrai professeur.",
  "Each lesson is a small role-play: a context, three goals, and a few useful phrases. The aim is always to better prepare the next session with a real teacher.",
);
const LESSON_LOCKED_LABEL = lstr("Verrouillé · futur", "Locked · upcoming");
const LESSON_GOALS_LABEL = lstr("Objectifs", "Learning goals");
const LESSON_BRIDGE_LABEL = lstr("Avec un professeur", "With a teacher");

const TEACHER_BRIDGE_LABEL = lstr(
  "Pont vers un professeur",
  "Teacher bridge",
);
const TEACHER_BRIDGE_CTA = lstr(
  "Trouver un professeur sur Pratiqo",
  "Find a teacher on Pratiqo",
);

const RETURN_INTRO_CTA = lstr(
  "Retour à l’intro gratuite",
  "Back to the free intro",
);
const FIND_TEACHER_CTA = lstr(
  "Trouver un professeur",
  "Find a teacher",
);

const COMING_SOON_LABEL = lstr(
  "À propos de ce module",
  "About this module",
);
const COMING_SOON_TITLE = lstr(
  "Aperçu d’un futur module YoPratiqo",
  "Preview of a future YoPratiqo module",
);
const NO_CHECKOUT_PILL = lstr(
  "Achat indisponible pour le moment",
  "Purchase not available yet",
);
const NO_PAID_ACCESS_PILL = lstr(
  "Accès payant non activé",
  "Paid access not active",
);
const NO_PRICE_PILL = lstr(
  "Aucun prix en vigueur",
  "No live pricing in effect",
);

function formatMinutes(minutes: number, locale: YoLocale): string {
  return locale === "fr" ? `≈ ${minutes} min` : `≈ ${minutes} min`;
}

export function YoPremiumModuleShell(props: YoPremiumModuleShellProps) {
  const {
    locale,
    titleFr,
    titleEn,
    taglineFr,
    taglineEn,
    audienceFr,
    audienceEn,
    honestPromiseFr,
    honestPromiseEn,
    lessons,
    teacherBridgeTitleFr,
    teacherBridgeTitleEn,
    teacherBridgeBodyFr,
    teacherBridgeBodyEn,
    comingSoonBodyFr,
    comingSoonBodyEn,
    languageBreadcrumbFr,
    languageBreadcrumbEn,
    futureCrumbFr,
    futureCrumbEn,
    introHref,
    teacherBridgeHref,
    hubHref = "/yo/langues",
  } = props;

  const title: YoLocalizedString = lstr(titleFr, titleEn);
  const tagline: YoLocalizedString = lstr(taglineFr, taglineEn);
  const audience: YoLocalizedString = lstr(audienceFr, audienceEn);
  const honestPromise: YoLocalizedString = lstr(
    honestPromiseFr,
    honestPromiseEn,
  );
  const teacherBridgeTitle: YoLocalizedString = lstr(
    teacherBridgeTitleFr,
    teacherBridgeTitleEn,
  );
  const teacherBridgeBody: YoLocalizedString = lstr(
    teacherBridgeBodyFr,
    teacherBridgeBodyEn,
  );
  const comingSoonBody: YoLocalizedString = lstr(
    comingSoonBodyFr,
    comingSoonBodyEn,
  );
  const languageCrumb: YoLocalizedString = lstr(
    languageBreadcrumbFr,
    languageBreadcrumbEn,
  );
  const futureCrumb: YoLocalizedString = lstr(futureCrumbFr, futureCrumbEn);

  return (
    <div className="min-h-[100dvh] bg-[#FAFCFB] text-[#0F6E56]">
      <main id="main-content" className="flex flex-col pb-20">
        <YoBreadcrumb
          items={[
            { label: lstr("YoPratiqo", "YoPratiqo"), href: "/yo" },
            { label: lstr("Langues", "Languages"), href: hubHref },
            { label: languageCrumb, href: introHref.replace(/\/intro$/, "") },
            { label: futureCrumb },
          ]}
          locale={locale}
        />

        {/* Hero — “Bientôt disponible” */}
        <section
          aria-labelledby="yo-fr-qc-mod1-title"
          className="relative overflow-hidden"
        >
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(15,110,86,0.18),transparent_30%),radial-gradient(circle_at_86%_18%,rgba(244,180,0,0.18),transparent_32%),linear-gradient(180deg,#fbfdff_0%,#dde9f4_45%,#ddf4f1_100%)]"
          />
          <div className="relative mx-auto flex max-w-5xl flex-col gap-4 px-5 pt-10 pb-10 sm:px-8 sm:pt-12 sm:pb-14">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#0F6E56]/30 bg-white/80 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-[#0F6E56]">
                <Sparkles className="size-3.5 text-[#F4B400]" aria-hidden />
                {t(HERO_LABEL, locale)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F4B400]/45 bg-[#FFF4D6] px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-[#8a5a17]">
                <Clock className="size-3.5" aria-hidden />
                {t(COMING_SOON_PILL, locale)}
              </span>
            </div>
            <h1
              id="yo-fr-qc-mod1-title"
              className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-[#0F6E56] sm:text-4xl lg:text-[2.75rem]"
            >
              {t(title, locale)}
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-[#0F6E56]/78 sm:text-lg">
              {t(tagline, locale)}
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <Link
                href={introHref}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#0F6E56]/18 bg-white px-5 py-3 text-sm font-bold text-[#0F6E56] transition hover:bg-[#DDF4F1]/70"
              >
                <Compass className="size-4" aria-hidden />
                {t(RETURN_INTRO_CTA, locale)}
              </Link>
              <Link
                href={teacherBridgeHref}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0F6E56] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(15,110,86,0.22)] transition hover:bg-[#0b5b47]"
              >
                <MessageCircle className="size-4" aria-hidden />
                {t(FIND_TEACHER_CTA, locale)}
              </Link>
            </div>
          </div>
        </section>

        {/* Audience + honest promise */}
        <section
          aria-labelledby="yo-fr-qc-mod1-audience-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]">
            {t(AUDIENCE_LABEL, locale)}
          </span>
          <h2
            id="yo-fr-qc-mod1-audience-title"
            className="mt-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.65rem]"
          >
            {locale === "fr"
              ? "Pensé pour les apprenants déjà au Québec ou en route"
              : "Built for learners already in Quebec — or on their way"}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#0F6E56]/78 sm:text-[0.95rem]">
            {t(audience, locale)}
          </p>

          <div className="mt-5 rounded-2xl border border-[#DDF4F1] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)] sm:px-5 sm:py-5">
            <p className="text-[0.8rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
              {t(HONEST_PROMISE_LABEL, locale)}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/80">
              {t(honestPromise, locale)}
            </p>
          </div>
        </section>

        {/* Lesson outline — 7 cards (locked / future status) */}
        <section
          aria-labelledby="yo-fr-qc-mod1-outline-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]">
            {t(LESSON_OUTLINE_LABEL, locale)}
          </span>
          <h2
            id="yo-fr-qc-mod1-outline-title"
            className="mt-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            {t(LESSON_OUTLINE_TITLE, locale)}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#0F6E56]/78">
            {t(LESSON_OUTLINE_BODY, locale)}
          </p>
          <ol
            role="list"
            className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {lessons.map((lesson, index) => (
              <li
                key={lesson.id}
                className="flex flex-col gap-3 rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)] sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0F6E56]/55">
                      {locale === "fr"
                        ? `Leçon ${index + 1}`
                        : `Lesson ${index + 1}`}
                    </p>
                    <h3 className="mt-1 text-base font-semibold leading-snug text-[#0F6E56]">
                      {locale === "fr" ? lesson.titleFr : lesson.titleEn}
                    </h3>
                  </div>
                  <span
                    aria-label={t(LESSON_LOCKED_LABEL, locale)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#FFF4D6] px-2 py-1 text-[0.65rem] font-black uppercase tracking-[0.14em] text-[#8a5a17]"
                  >
                    <Lock className="size-3" aria-hidden />
                    {t(LESSON_LOCKED_LABEL, locale)}
                  </span>
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0F6E56]/60">
                  <Clock className="mr-1 inline size-3" aria-hidden />
                  {formatMinutes(lesson.estimatedMinutes, locale)}
                </p>
                <p className="text-sm leading-relaxed text-[#0F6E56]/80">
                  {locale === "fr" ? lesson.scenarioFr : lesson.scenarioEn}
                </p>
                <div>
                  <p className="text-[0.7rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/55">
                    {t(LESSON_GOALS_LABEL, locale)}
                  </p>
                  <ul
                    role="list"
                    className="mt-1 space-y-1 text-sm leading-relaxed text-[#0F6E56]/76"
                  >
                    {(locale === "fr"
                      ? lesson.learningGoalsFr
                      : lesson.learningGoalsEn
                    ).map((goal, goalIndex) => (
                      <li
                        key={`${lesson.id}-goal-${goalIndex}`}
                        className="flex gap-2"
                      >
                        <span
                          aria-hidden
                          className="mt-1 inline-block size-1.5 shrink-0 rounded-full bg-[#1D9E75]"
                        />
                        {goal}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="rounded-xl bg-[#DDF4F1]/50 px-3 py-2 text-xs leading-relaxed text-[#0F6E56]/78">
                  <span className="font-black uppercase tracking-[0.12em] text-[#1D9E75]">
                    {t(LESSON_BRIDGE_LABEL, locale)}.
                  </span>{" "}
                  {locale === "fr"
                    ? lesson.teacherBridgePromptFr
                    : lesson.teacherBridgePromptEn}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* Teacher bridge */}
        <section
          aria-labelledby="yo-fr-qc-mod1-bridge-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <article className="relative overflow-hidden rounded-3xl border border-[#F4B400]/35 bg-gradient-to-br from-[#FFF4D6] via-white to-[#DDF4F1] p-6 shadow-[0_8px_24px_rgba(15,58,52,0.07)] sm:p-8">
            <div
              aria-hidden
              className="absolute -right-16 -top-16 size-52 rounded-full bg-[#F4B400]/20 blur-3xl"
            />
            <div className="relative grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-center">
              <div>
                <span className="ds-label text-[#8a5a17]">
                  {t(TEACHER_BRIDGE_LABEL, locale)}
                </span>
                <h2
                  id="yo-fr-qc-mod1-bridge-title"
                  className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#1a3a32] sm:text-[1.65rem]"
                >
                  <GraduationCap
                    className="size-5 text-[#0F6E56]"
                    aria-hidden
                  />
                  {t(teacherBridgeTitle, locale)}
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#1a3a32]/78 sm:text-[0.95rem]">
                  {t(teacherBridgeBody, locale)}
                </p>
              </div>
              <div className="flex flex-col gap-3 lg:items-end">
                <Link
                  href={teacherBridgeHref}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0F6E56] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(15,110,86,0.22)] transition hover:bg-[#0b5b47]"
                >
                  <MessageCircle className="size-4" aria-hidden />
                  {t(TEACHER_BRIDGE_CTA, locale)}
                </Link>
              </div>
            </div>
          </article>
        </section>

        {/* Coming-soon notice */}
        <section
          aria-labelledby="yo-fr-qc-mod1-coming-soon-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]">
            {t(COMING_SOON_LABEL, locale)}
          </span>
          <h2
            id="yo-fr-qc-mod1-coming-soon-title"
            className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            <Lock className="size-5 text-[#1D9E75]" aria-hidden />
            {t(COMING_SOON_TITLE, locale)}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#0F6E56]/78 sm:text-[0.95rem]">
            {t(comingSoonBody, locale)}
          </p>
          <ul
            role="list"
            className="mt-5 flex flex-wrap gap-2"
          >
            <li className="inline-flex items-center gap-1.5 rounded-full border border-[#F4B400]/45 bg-[#FFF4D6] px-3 py-1.5 text-xs font-bold text-[#8a5a17]">
              <Lock className="size-3.5" aria-hidden />
              {t(NO_CHECKOUT_PILL, locale)}
            </li>
            <li className="inline-flex items-center gap-1.5 rounded-full border border-[#F4B400]/45 bg-[#FFF4D6] px-3 py-1.5 text-xs font-bold text-[#8a5a17]">
              <Lock className="size-3.5" aria-hidden />
              {t(NO_PAID_ACCESS_PILL, locale)}
            </li>
            <li className="inline-flex items-center gap-1.5 rounded-full border border-[#F4B400]/45 bg-[#FFF4D6] px-3 py-1.5 text-xs font-bold text-[#8a5a17]">
              <Lock className="size-3.5" aria-hidden />
              {t(NO_PRICE_PILL, locale)}
            </li>
          </ul>
        </section>

        {/* Legal-safe disclaimer */}
        <section
          aria-label={
            locale === "fr"
              ? "Avis légal éducatif"
              : "Educational legal notice"
          }
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <YoLegalDisclaimer locale={locale} />
        </section>
      </main>
    </div>
  );
}
