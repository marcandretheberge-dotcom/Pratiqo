import Link from "next/link";
import { BookOpen, CheckCircle2, Compass, Sparkles } from "lucide-react";

import { SITE_URL } from "@/lib/seo/site";
import { buildYopratiqoCourseSchema } from "@/lib/seo/yopratiqoCourseSchema";
import { buildYoLocaleHref, lstr, t } from "@/lib/yo/localize";
import type { YoLocale } from "@/lib/yo/types";
import type { YoPratiqoLandingContent } from "@/lib/yo/yopratiqoLandingContent";
import {
  canInjectYoPratiqoCourseSchema,
  type YoPratiqoModuleConfig,
} from "@/lib/yo/yopratiqoProductConfig";
import { YoBreadcrumb } from "@/components/yo/YoBreadcrumb";
import { YoLegalDisclaimer } from "@/components/yo/YoLegalDisclaimer";
import { YoTeacherBridgeCard } from "@/components/yo/YoTeacherBridgeCard";

const HERO_BADGE = lstr("Intro gratuite", "Free intro");
const INTRO_CTA = lstr("Commencer l’intro", "Start the intro");
const TEACHER_CTA = lstr("Trouver un professeur", "Find a teacher");
const LEARN_TITLE = lstr("Ce que tu vas travailler", "What you will practice");
const WHY_TITLE = lstr("Pourquoi YoPratiqo", "Why YoPratiqo");
const INTRO_LABEL = lstr("Parcours autonome", "Self-paced path");
const BRIDGE_LABEL = lstr("Pont vers un professeur", "Teacher bridge");

export function YoLanguageLandingPage({
  locale,
  moduleConfig,
  content,
}: {
  locale: YoLocale;
  moduleConfig: YoPratiqoModuleConfig;
  content: YoPratiqoLandingContent;
}) {
  const langSuffix = locale === "en" ? "?lang=en" : "";
  const localizedLandingRoute = `${moduleConfig.landingRoute}${langSuffix}`;
  const localizedIntroRoute = `${moduleConfig.introRoute}${langSuffix}`;
  const toggleHref = buildYoLocaleHref(
    moduleConfig.landingRoute,
    locale === "fr" ? "en" : "fr",
  );
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

      <main id="main-content" className="flex flex-col pb-20">
        <YoBreadcrumb
          items={[
            { label: lstr("YoPratiqo", "YoPratiqo"), href: `/yo${langSuffix}` },
            {
              label: lstr("Langues", "Languages"),
              href: `/yo/langues${langSuffix}`,
            },
            {
              label: lstr(moduleConfig.languageLabelFr, moduleConfig.languageLabelEn),
              href: localizedLandingRoute,
            },
          ]}
          locale={locale}
        />

        <section
          aria-labelledby="yo-language-landing-title"
          className="relative overflow-hidden"
        >
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(244,180,0,0.18),transparent_30%),radial-gradient(circle_at_86%_18%,rgba(221,244,241,0.9),transparent_34%),linear-gradient(180deg,#fffbf0_0%,#fff4d6_48%,#ddf4f1_100%)]"
          />
          <div className="relative mx-auto grid max-w-6xl gap-8 px-5 pt-10 pb-12 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pt-14 lg:pb-16">
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#F4B400]/45 bg-white/82 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-[#0F6E56]">
                  <Sparkles className="size-3.5 text-[#F4B400]" aria-hidden />
                  {t(HERO_BADGE, locale)}
                </span>
                <Link
                  href={toggleHref}
                  className="rounded-full border border-[#0F6E56]/15 bg-white/80 px-3 py-1.5 text-xs font-bold text-[#0F6E56] transition hover:bg-white"
                >
                  {locale === "fr" ? "View in English" : "Voir en français"}
                </Link>
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
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href={localizedIntroRoute}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0F6E56] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(15,110,86,0.22)] transition hover:bg-[#0b5b47]"
                >
                  <BookOpen className="size-4" aria-hidden />
                  {t(INTRO_CTA, locale)}
                </Link>
                <Link
                  href={moduleConfig.teacherSearchUrl}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#F4B400]/60 bg-[#FFF4D6] px-5 py-3 text-sm font-bold text-[#0F6E56] transition hover:bg-white"
                >
                  <Compass className="size-4" aria-hidden />
                  {t(TEACHER_CTA, locale)}
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#F4B400]/35 bg-white/84 p-5 shadow-[0_20px_50px_rgba(15,58,52,0.12)] backdrop-blur">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a5a17]">
                {t(INTRO_LABEL, locale)}
              </p>
              <div className="mt-4 grid gap-3">
                {content.learnBullets.slice(0, 4).map((item) => (
                  <div key={item.fr} className="flex items-start gap-3 rounded-2xl bg-[#DDF4F1]/55 p-3">
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
          <article className="rounded-3xl border border-[#DDF4F1] bg-white p-6 shadow-[0_8px_24px_rgba(15,58,52,0.06)]">
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

          <article className="rounded-3xl border border-[#DDF4F1] bg-white p-6 shadow-[0_8px_24px_rgba(15,58,52,0.06)]">
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
          <article className="rounded-3xl border border-[#F4B400]/35 bg-[#FFF4D6] p-6 shadow-[0_8px_24px_rgba(15,58,52,0.06)]">
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
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-[#0F6E56] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0b5b47]"
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
