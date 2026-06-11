import Link from "next/link";
import { ArrowLeft, BookOpen, CheckCircle2, Compass, Sparkles } from "lucide-react";

import { SITE_URL } from "@/lib/seo/site";
import { buildYopratiqoCourseSchema } from "@/lib/seo/yopratiqoCourseSchema";
import { lstr, t } from "@/lib/yo/localize";
import type { YoLocale } from "@/lib/yo/types";
import type { YoPratiqoLandingContent } from "@/lib/yo/yopratiqoLandingContent";
import {
  canInjectYoPratiqoCourseSchema,
  type YoPratiqoModuleConfig,
} from "@/lib/yo/yopratiqoProductConfig";
import { YoLanguageSelector } from "@/components/yo/YoLanguageSelector";
import { YoLegalDisclaimer } from "@/components/yo/YoLegalDisclaimer";
import { YoPratiqoLogo } from "@/components/yo/YoPratiqoLogo";
import { YoTeacherBridgeCard } from "@/components/yo/YoTeacherBridgeCard";

const HERO_BADGE = lstr("Intro gratuite", "Free intro", "Intro gratis");
const INTRO_CTA = lstr(
  "Commencer l’intro gratuite",
  "Start the free intro",
  "Empezar la intro gratis",
);
const TEACHER_CTA = lstr(
  "Trouver un professeur sur Pratiqo",
  "Find a teacher on Pratiqo",
  "Buscar un profesor en Pratiqo",
);
const LEARN_TITLE = lstr(
  "Ce que tu vas travailler",
  "What you will practice",
  "Lo que vas a trabajar",
);
const WHY_TITLE = lstr("Pourquoi YoPratiqo", "Why YoPratiqo", "Por qué YoPratiqo");
const INTRO_LABEL = lstr("Parcours autonome", "Self-paced path", "Ruta autónoma");
const BRIDGE_LABEL = lstr(
  "Pont vers un professeur",
  "Teacher bridge",
  "Puente hacia un profesor",
);
const AUDIENCE_LABEL = lstr("Pour qui", "Who it is for", "Para quién");
const BACK_TO_LANGUES = lstr("Langues", "Languages", "Idiomas");

export function YoLanguageLandingPage({
  locale,
  moduleConfig,
  content,
}: {
  locale: YoLocale;
  moduleConfig: YoPratiqoModuleConfig;
  content: YoPratiqoLandingContent;
}) {
  const langSuffix = locale === "fr" ? "" : `?lang=${locale}`;
  void langSuffix;
  const localizedIntroRoute =
    locale === "fr"
      ? moduleConfig.introRoute
      : `${moduleConfig.introRoute}?lang=${locale}`;
  const backToLanguesHref = locale === "fr" ? "/yo/langues" : `/yo/langues?lang=${locale}`;
  const shouldInjectCourseSchema = canInjectYoPratiqoCourseSchema(moduleConfig);
  const courseSchema = shouldInjectCourseSchema
    ? buildYopratiqoCourseSchema({
        name: content.schemaName,
        description: content.schemaDescription,
        url: `${SITE_URL}${moduleConfig.landingRoute}`,
        inLanguage: moduleConfig.inLanguage,
        educationalLevel: moduleConfig.educationalLevel,
        isAccessibleForFree: moduleConfig.isAccessibleForFree,
        teaches: content.teaches,
        about: content.about,
      })
    : null;

  return (
    <div className="min-h-[100dvh] bg-[#FAFCFB] text-[#0F6E56]">
      {courseSchema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(courseSchema) }}
        />
      ) : null}

      {/* App-style header replaces the legacy three-level breadcrumb +
          one-off "View in English" pill so this landing inherits the
          same chrome rhythm as `/yo/langues` and the deck routes. */}
      <header
        data-testid="yo-language-landing-app-header"
        data-yo-language-landing-header="true"
        className="sticky top-0 z-40 border-b border-[#E7DFCF] bg-[#FAFCFB]/95 backdrop-blur"
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-3 sm:h-16 sm:px-6">
          <Link
            data-testid="yo-language-landing-back"
            href={backToLanguesHref}
            aria-label={t(BACK_TO_LANGUES, locale)}
            className="inline-flex items-center gap-2 rounded-full border border-[#E7DFCF] bg-white/70 px-2.5 py-1.5 text-sm font-semibold text-[#172642] transition hover:bg-white sm:px-3"
          >
            <ArrowLeft className="size-4" aria-hidden />
            <span className="hidden sm:inline">{t(BACK_TO_LANGUES, locale)}</span>
          </Link>
          <div className="flex min-w-0 items-center justify-center gap-2">
            <span className="hidden sm:inline-flex">
              <YoPratiqoLogo size="sm" priority={false} />
            </span>
            <span className="truncate text-sm font-semibold text-[#172642] sm:text-[15px]">
              {t(lstr(moduleConfig.languageLabelFr, moduleConfig.languageLabelEn), locale)}
            </span>
          </div>
          <YoLanguageSelector
            locale={locale}
            pathname={moduleConfig.landingRoute}
            size="sm"
          />
        </div>
      </header>

      <main id="main-content" className="flex flex-col pb-20">
        <section
          aria-labelledby="yo-language-landing-title"
          className="relative overflow-hidden"
        >
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(244,180,0,0.18),transparent_30%),radial-gradient(circle_at_86%_18%,rgba(221,244,241,0.9),transparent_34%),linear-gradient(180deg,#fffbf0_0%,#fff4d6_48%,#ddf4f1_100%)]"
          />
          <div className="relative mx-auto grid max-w-6xl gap-8 px-5 pt-10 pb-12 sm:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:pt-16 lg:pb-18">
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#F4B400]/45 bg-white/82 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-[#0F6E56]">
                  <Sparkles className="size-3.5 text-[#F4B400]" aria-hidden />
                  {t(HERO_BADGE, locale)}
                </span>
              </div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#1D9E75]">
                YoPratiqo · {t(lstr(moduleConfig.languageLabelFr, moduleConfig.languageLabelEn), locale)}
              </p>
              <h1
                id="yo-language-landing-title"
                className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-[#0F6E56] sm:text-4xl lg:text-[3rem]"
              >
                {t(content.heroTitle, locale)}
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-[#0F6E56]/78 sm:text-lg">
                {t(content.heroSubtitle, locale)}
              </p>
              <div className="flex flex-col gap-3 pt-1 sm:flex-row">
                <Link
                  href={localizedIntroRoute}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0F6E56] px-6 py-3.5 text-sm font-bold text-white shadow-[0_16px_36px_rgba(15,110,86,0.24)] transition hover:bg-[#0b5b47]"
                >
                  <BookOpen className="size-4" aria-hidden />
                  {t(INTRO_CTA, locale)}
                </Link>
                <Link
                  href={moduleConfig.teacherSearchUrl}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#F4B400]/60 bg-[#FFF4D6]/85 px-5 py-3 text-sm font-bold text-[#0F6E56] transition hover:bg-white"
                >
                  <Compass className="size-4" aria-hidden />
                  {t(TEACHER_CTA, locale)}
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#F4B400]/35 bg-white/88 p-5 shadow-[0_20px_50px_rgba(15,58,52,0.12)] backdrop-blur sm:p-6">
              <div className="rounded-2xl border border-[#DDF4F1] bg-[#FAFCFB] p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#1D9E75]">
                  {t(AUDIENCE_LABEL, locale)}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/82">
                  {t(content.audience, locale)}
                </p>
              </div>
              <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-[#8a5a17]">
                {t(INTRO_LABEL, locale)}
              </p>
              <div className="mt-4 grid gap-3">
                {content.learnBullets.slice(0, 4).map((item) => (
                  <div key={item.fr} className="flex items-start gap-3 rounded-2xl bg-[#DDF4F1]/55 p-3.5">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#1D9E75]" aria-hidden />
                    <p className="text-sm leading-relaxed text-[#0F6E56]/82">
                      {t(item, locale)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-6xl gap-5 px-5 pt-10 sm:px-8 lg:grid-cols-2">
          <article className="rounded-3xl border border-[#DDF4F1] bg-white p-6 shadow-[0_8px_24px_rgba(15,58,52,0.06)] sm:p-7">
            <h2 className="text-xl font-semibold tracking-tight text-[#0F6E56]">
              {t(LEARN_TITLE, locale)}
            </h2>
            <ul className="mt-4 space-y-3">
              {content.learnBullets.map((item) => (
                <li key={item.fr} className="flex gap-3 text-sm leading-relaxed text-[#0F6E56]/78">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#1D9E75]" aria-hidden />
                  <span>{t(item, locale)}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-3xl border border-[#DDF4F1] bg-white p-6 shadow-[0_8px_24px_rgba(15,58,52,0.06)] sm:p-7">
            <h2 className="text-xl font-semibold tracking-tight text-[#0F6E56]">
              {t(WHY_TITLE, locale)}
            </h2>
            <ul className="mt-4 space-y-3">
              {content.whyBullets.map((item) => (
                <li key={item.fr} className="flex gap-3 text-sm leading-relaxed text-[#0F6E56]/78">
                  <Sparkles className="mt-0.5 size-4 shrink-0 text-[#F4B400]" aria-hidden />
                  <span>{t(item, locale)}</span>
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="mx-auto grid w-full max-w-6xl gap-5 px-5 pt-8 sm:px-8 lg:grid-cols-2">
          <article className="rounded-3xl border border-[#F4B400]/45 bg-[#FFF4D6] p-6 shadow-[0_10px_28px_rgba(15,58,52,0.08)] sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8a5a17]">
              {t(INTRO_LABEL, locale)}
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-[#0F6E56]">
              {t(content.introCardTitle, locale)}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/76">
              {t(content.introCardBody, locale)}
            </p>
            <Link
              href={localizedIntroRoute}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-[#0F6E56] px-6 py-3.5 text-sm font-bold text-white shadow-[0_14px_34px_rgba(15,110,86,0.18)] transition hover:bg-[#0b5b47]"
            >
              {t(INTRO_CTA, locale)}
              <span aria-hidden>→</span>
            </Link>
          </article>

          <YoTeacherBridgeCard
            locale={locale}
            moduleConfig={moduleConfig}
            title={content.teacherCardTitle}
            body={content.teacherCardBody}
          />
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 pt-8 sm:px-8">
          <div className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-[#1D9E75]">
            {t(BRIDGE_LABEL, locale)}
          </div>
          <YoLegalDisclaimer locale={locale} />
        </section>
      </main>
    </div>
  );
}
