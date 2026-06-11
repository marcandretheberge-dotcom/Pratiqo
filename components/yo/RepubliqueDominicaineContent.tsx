/**
 * RepubliqueDominicaineContent — shared body for the Espagnol RD A1 module.
 *
 * Extracted so two server-component pages can mount the same UI without
 * duplicating ~80 lines of composition:
 *
 *   app/yo/voyage/republique-dominicaine/page.tsx            (legacy)
 *   app/yo/langues/espagnol/pays/republique-dominicaine/page.tsx (new IA)
 *
 * Both routes resolve their own `?lang=` server-side, pass the resolved
 * `locale` here, and decide which breadcrumb trail (if any) to render.
 *
 * This file owns no business logic, no Supabase access, no Stripe, no
 * payment math. It only composes existing Yo components against the
 * hardcoded `dominicanRepublicA1` data file — same as before — and
 * adds an optional breadcrumb on top.
 */

import { dominicanRepublicA1 } from "@/lib/yo/dominicanRepublicA1";
import { t } from "@/lib/yo/localize";
import { YO_COPY } from "@/lib/yo/copy";
import type { YoLocale } from "@/lib/yo/types";
import { YoVoyageHero } from "@/components/yo/YoVoyageHero";
import { YoLessonPath } from "@/components/yo/YoLessonPath";
import { YoIntroExperience } from "@/components/yo/YoIntroExperience";
import { YoUnlockCard } from "@/components/yo/YoUnlockCard";
import { YoFeatureStrip } from "@/components/yo/YoFeatureStrip";
import {
  YoBreadcrumb,
  type YoBreadcrumbItem,
} from "@/components/yo/YoBreadcrumb";
import { DominicanModulePrintables } from "@/components/yo/DominicanModulePrintables";
import { module1PrintablePack } from "@/lib/yo/dominicanRepublicPrintables";

export interface RepubliqueDominicaineContentProps {
  locale: YoLocale;
  /** Optional breadcrumb trail above the hero. When omitted (legacy
   *  /yo/voyage/republique-dominicaine route), no breadcrumb is shown. */
  breadcrumb?: YoBreadcrumbItem[];
  /**
   * Suppress the wide `<YoVoyageHero />` marketing hero. Used by
   * the new app-like Course Home on the canonical
   * `/yo/langues/espagnol/pays/republique-dominicaine` route,
   * which mounts its own focused `<YoCourseHero />` above this
   * component. The legacy `/yo/voyage/...` route omits this prop
   * (defaults `false`) so its existing layout is preserved.
   */
  omitHero?: boolean;
  /**
   * Suppress the legacy `<YoLessonPath />` block. Same rationale
   * as `omitHero` — the Course Home renders its own
   * `<YoCoursePath />` higher on the page.
   */
  omitLessonPath?: boolean;
}

export function RepubliqueDominicaineContent({
  locale,
  breadcrumb,
  omitHero = false,
  omitLessonPath = false,
}: RepubliqueDominicaineContentProps) {
  const {
    module,
    lessonPath,
    detailedSections,
    dominicanDictionary,
    flashcardDeck,
    quizQuestions,
    introProgress,
    unlockFeatures,
    bottomFeatures,
  } = dominicanRepublicA1;

  const introLesson = module.lessons.find((lesson) => lesson.position === 1);
  const introCards = introLesson?.cards ?? [];
  const langSuffix = locale === "fr" ? "" : `?lang=${locale}`;
  const localizedLessonPath = lessonPath.map((step) =>
    step.href
      ? {
          ...step,
          href: `${step.href}${langSuffix}`,
        }
      : step,
  );

  const finalCtaEyebrow = t(YO_COPY.finalCta.eyebrow, locale);
  const finalCtaTitle = t(YO_COPY.finalCta.title, locale);
  const finalCtaBody = t(YO_COPY.finalCta.body, locale);
  const finalCtaButton = t(YO_COPY.finalCta.cta, locale);
  const finalCtaFootnote = t(YO_COPY.finalCta.footnote, locale);

  return (
    <div className="overflow-x-hidden bg-[#FAFCFB]">
      <main id="main-content" className="flex min-w-0 flex-col pb-20">
        {breadcrumb && breadcrumb.length > 0 ? (
          <YoBreadcrumb items={breadcrumb} locale={locale} />
        ) : null}

        {omitHero ? null : <YoVoyageHero module={module} locale={locale} />}

        {omitLessonPath ? null : (
          <YoLessonPath
            steps={localizedLessonPath}
            locale={locale}
            activeHref="#yo-progress-title"
          />
        )}

        <YoIntroExperience
          introCards={introCards}
          detailedSections={detailedSections}
          dominicanDictionary={dominicanDictionary}
          flashcardDeck={flashcardDeck}
          quizQuestions={quizQuestions}
          introProgress={introProgress}
          locale={locale}
          destinationLabel={module.destinationLabel}
          cultureImagePath={module.cultureImagePath}
          cultureImageAlt={module.cultureImageAlt}
        />

        <YoUnlockCard
          features={unlockFeatures}
          locale={locale}
          priceCents={module.priceCents}
          currency={module.currency}
          imagePath={module.cultureImagePath}
          imageAlt={module.cultureImageAlt}
        />

        <YoFeatureStrip features={bottomFeatures} locale={locale} />

        {/* Printable practice worksheets — vocabulary match,
            fill-in-the-blank dialogues, and a short production
            prompt that lets the learner actively practise the
            first Dominican words. Self-contained: every exercise
            ships with a collapsible answer key. */}
        <DominicanModulePrintables pack={module1PrintablePack} locale={locale} />

        <section
          aria-labelledby="yo-final-cta-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <div className="relative overflow-hidden rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-700 via-teal-600 to-teal-500 p-7 text-white shadow-[0_8px_24px_rgba(15,58,52,0.18)] sm:p-10">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-white/10 blur-3xl"
            />
            <div className="relative grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-center">
              <div className="flex flex-col gap-3">
                <span className="ds-label text-white/80">
                  {finalCtaEyebrow}
                </span>
                <h2
                  id="yo-final-cta-title"
                  className="text-2xl font-medium tracking-tight sm:text-3xl"
                >
                  {finalCtaTitle}
                </h2>
                <p className="max-w-xl text-sm leading-relaxed text-white/90 sm:text-[0.95rem]">
                  {finalCtaBody}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
                <a
                  href="#yo-progress-title"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-teal-800 transition hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-teal-700 sm:text-base"
                >
                  {finalCtaButton}
                  <span aria-hidden>→</span>
                </a>
                <p className="text-xs text-white/80 lg:text-right">
                  {finalCtaFootnote}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
