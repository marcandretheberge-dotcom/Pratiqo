/**
 * YoLanguageLandingPage
 *
 * Shared landing template used by `/yo/langues/anglais`,
 * `/yo/langues/italien`, `/yo/langues/japonais`, and
 * `/yo/langues/francais-quebec`. The Spanish hub uses its own
 * dedicated `app/yo/langues/espagnol/page.tsx` because the
 * Spanish path branches into a Country Course Home (Dominican
 * Republic) and a global intro — none of the other four
 * languages have that branching yet.
 *
 * What this used to be
 * --------------------
 * Until the world-class-shell pass this template rendered a
 * long-form marketing layout: sticky header → hero with
 * audience card → 2-column "Learn / Why" grid → 2-column
 * "Intro / Teacher bridge" cards → legal disclaimer. On a phone
 * that meant ~2000 px of vertical scroll just to reach the
 * intro CTA, while desktop felt like a flattened mobile column.
 *
 * What it is now
 * --------------
 * A real adaptive shell:
 *   • Mobile (`<lg`) — three focused steps the learner advances
 *     with explicit Back / Next chrome (see `YoStepNavigator`):
 *       1. Hero + Yoppo promise + audience card.
 *       2. Free intro preview (what you'll practice + why
 *          YoPratiqo).
 *       3. Teacher bridge + legal disclaimer + "Done" → free
 *          intro deck.
 *   • Desktop (`lg:`) — three-pane product workspace mounted
 *     via `<YoDesktopLearningWorkspace>`:
 *       - leftRail : Yoppo promise + audience card.
 *       - center   : hero + intro preview.
 *       - rightRail: teacher bridge + legal disclaimer.
 *
 * The intro CTA on the last mobile step is the route's natural
 * primary affordance — wired via `lastStepNextHref` so the
 * learner exits the step shell straight into the free intro
 * deck.
 *
 * Privacy / safety profile
 * ------------------------
 *   • Pure composition of existing primitives. Server
 *     component. No client hooks, no API, no persistence, no
 *     payment library, no auth backend, no audio, no quiz
 *     data, no AI summary. Course schema injection unchanged.
 */

import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  Compass,
  Sparkles,
} from "lucide-react";

import { SITE_URL } from "@/lib/seo/site";
import { buildYopratiqoCourseSchema } from "@/lib/seo/yopratiqoCourseSchema";
import { lstr, t } from "@/lib/yo/localize";
import type { YoLocale } from "@/lib/yo/types";
import type { YoPratiqoLandingContent } from "@/lib/yo/yopratiqoLandingContent";
import {
  canInjectYoPratiqoCourseSchema,
  type YoPratiqoModuleConfig,
} from "@/lib/yo/yopratiqoProductConfig";
import { YoAdaptiveStepShell } from "@/components/yo/YoAdaptiveStepShell";
import { YoAppHeader } from "@/components/yo/YoAppHeader";
import { YoLegalDisclaimer } from "@/components/yo/YoLegalDisclaimer";
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
const WHY_TITLE = lstr("Pourquoi cette méthode", "Why this method", "Por qué este método");
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
  const localizedIntroRoute =
    locale === "fr"
      ? moduleConfig.introRoute
      : `${moduleConfig.introRoute}?lang=${locale}`;
  const backToLanguesHref = `/yo/langues${langSuffix}`;
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

  const languageLabel = t(
    lstr(moduleConfig.languageLabelFr, moduleConfig.languageLabelEn),
    locale,
  );

  // ─── Reusable blocks ──────────────────────────────────────────
  // Each block is rendered as JSX once and then composed into
  // both the mobile step screens AND the desktop workspace rails
  // so the two sub-trees stay visually consistent without
  // duplicating copy.

  const heroBlock = (
    <section
      aria-labelledby="yo-language-landing-title"
      className="flex flex-col gap-5"
    >
      <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#F4B400]/45 bg-white/85 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-[#0F6E56]">
        <Sparkles className="size-3.5 text-[#F4B400]" aria-hidden />
        {t(HERO_BADGE, locale)}
      </span>
      <p className="text-xs font-black uppercase tracking-[0.22em] text-[#1D9E75]">
        {languageLabel}
      </p>
      <h1
        id="yo-language-landing-title"
        className="text-2xl font-semibold leading-tight tracking-tight text-[#0F6E56] break-words sm:text-3xl lg:text-4xl"
      >
        {t(content.heroTitle, locale)}
      </h1>
      <p className="text-sm leading-relaxed text-[#0F6E56]/82 sm:text-base">
        {t(content.heroSubtitle, locale)}
      </p>
    </section>
  );

  const audienceBlock = (
    <section className="rounded-2xl border border-[#DDF4F1] bg-white/90 p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)]">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#1D9E75]">
        {t(AUDIENCE_LABEL, locale)}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/82">
        {t(content.audience, locale)}
      </p>
    </section>
  );

  const learnBlock = (
    <article className="rounded-3xl border border-[#DDF4F1] bg-white p-5 shadow-[0_8px_24px_rgba(15,58,52,0.06)] sm:p-6">
      <h2 className="text-lg font-semibold tracking-tight text-[#0F6E56] sm:text-xl">
        {t(LEARN_TITLE, locale)}
      </h2>
      <ul className="mt-3 space-y-3">
        {content.learnBullets.map((item) => (
          <li
            key={item.fr}
            className="flex gap-3 text-sm leading-relaxed text-[#0F6E56]/82"
          >
            <CheckCircle2
              className="mt-0.5 size-4 shrink-0 text-[#1D9E75]"
              aria-hidden
            />
            <span>{t(item, locale)}</span>
          </li>
        ))}
      </ul>
    </article>
  );

  const whyBlock = (
    <article className="rounded-3xl border border-[#DDF4F1] bg-white p-5 shadow-[0_8px_24px_rgba(15,58,52,0.06)] sm:p-6">
      <h2 className="text-lg font-semibold tracking-tight text-[#0F6E56] sm:text-xl">
        {t(WHY_TITLE, locale)}
      </h2>
      <ul className="mt-3 space-y-3">
        {content.whyBullets.map((item) => (
          <li
            key={item.fr}
            className="flex gap-3 text-sm leading-relaxed text-[#0F6E56]/82"
          >
            <Sparkles
              className="mt-0.5 size-4 shrink-0 text-[#F4B400]"
              aria-hidden
            />
            <span>{t(item, locale)}</span>
          </li>
        ))}
      </ul>
    </article>
  );

  const introCardBlock = (
    <article className="rounded-3xl border border-[#F4B400]/45 bg-[#FFF4D6] p-5 shadow-[0_10px_28px_rgba(15,58,52,0.08)] sm:p-6">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a5a17]">
        {t(INTRO_LABEL, locale)}
      </p>
      <h2 className="mt-2 text-lg font-semibold tracking-tight text-[#0F6E56] sm:text-xl">
        {t(content.introCardTitle, locale)}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/82">
        {t(content.introCardBody, locale)}
      </p>
      <Link
        href={localizedIntroRoute}
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-[#0F6E56] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(15,110,86,0.18)] transition hover:bg-[#0b5b47]"
      >
        <BookOpen className="size-4" aria-hidden />
        {t(INTRO_CTA, locale)}
      </Link>
    </article>
  );

  const teacherBridgeBlock = (
    <div className="flex flex-col gap-3">
      <YoTeacherBridgeCard
        locale={locale}
        moduleConfig={moduleConfig}
        title={content.teacherCardTitle}
        body={content.teacherCardBody}
      />
      <Link
        href={moduleConfig.teacherSearchUrl}
        className="inline-flex items-center justify-center gap-2 rounded-full border border-[#F4B400]/60 bg-[#FFF4D6]/85 px-5 py-3 text-sm font-bold text-[#0F6E56] transition hover:bg-white"
      >
        <Compass className="size-4" aria-hidden />
        {t(TEACHER_CTA, locale)}
      </Link>
    </div>
  );

  const legalBlock = (
    <section>
      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#1D9E75]">
        {t(BRIDGE_LABEL, locale)}
      </p>
      <YoLegalDisclaimer locale={locale} />
    </section>
  );

  // ─── Mobile steps ─────────────────────────────────────────────
  const stepHero = (
    <div className="flex w-full flex-col gap-4 px-4 py-4">
      {heroBlock}
      {audienceBlock}
    </div>
  );
  const stepIntroPreview = (
    <div className="flex w-full flex-col gap-4 px-4 py-4">
      {learnBlock}
      {whyBlock}
    </div>
  );
  const stepTeacherBridge = (
    <div className="flex w-full flex-col gap-4 px-4 py-4">
      {introCardBlock}
      {teacherBridgeBlock}
      {legalBlock}
    </div>
  );

  // ─── Headers ──────────────────────────────────────────────────
  const mobileHeader = (
    <YoAppHeader
      locale={locale}
      backHref={backToLanguesHref}
      backLabel={t(BACK_TO_LANGUES, locale)}
      title={languageLabel}
      selectorPath={moduleConfig.landingRoute}
      surfaceId={`${moduleConfig.slug}-landing`}
      appearance="mobile"
    />
  );
  const desktopHeader = (
    <YoAppHeader
      locale={locale}
      backHref={backToLanguesHref}
      backLabel={t(BACK_TO_LANGUES, locale)}
      title={languageLabel}
      selectorPath={moduleConfig.landingRoute}
      surfaceId={`${moduleConfig.slug}-landing`}
      appearance="desktop"
    />
  );

  return (
    <>
      {courseSchema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(courseSchema) }}
        />
      ) : null}
      <YoAdaptiveStepShell
        surfaceId={`${moduleConfig.slug}-landing`}
        mobile={{
          header: mobileHeader,
          locale,
          background:
            "bg-[linear-gradient(180deg,#FAFCFB_0%,#F4EFE6_55%,#FBF7EE_100%)]",
          stepsAriaLabel:
            locale === "en"
              ? `${languageLabel} landing`
              : locale === "es"
                ? `Landing ${languageLabel}`
                : `Accueil ${languageLabel}`,
          rootBackHref: backToLanguesHref,
          rootBackLabel: t(BACK_TO_LANGUES, locale),
          // The final-step "Done" button takes the learner straight
          // into the free intro deck — the natural primary CTA out
          // of this landing.
          lastStepNextHref: localizedIntroRoute,
          lastStepNextLabel: t(INTRO_CTA, locale),
          steps: [
            {
              id: "hero",
              label:
                locale === "en"
                  ? "Why this language"
                  : locale === "es"
                    ? "Por qué este idioma"
                    : "Pourquoi cette langue",
              content: stepHero,
            },
            {
              id: "intro-preview",
              label:
                locale === "en"
                  ? "What's in the free intro"
                  : locale === "es"
                    ? "Qué hay en la intro gratis"
                    : "Ce qu’il y a dans l’intro",
              content: stepIntroPreview,
            },
            {
              id: "teacher-bridge",
              label:
                locale === "en"
                  ? "Teacher bridge & next step"
                  : locale === "es"
                    ? "Puente al profesor"
                    : "Pont vers le prof",
              content: stepTeacherBridge,
            },
          ],
        }}
        desktop={{
          header: desktopHeader,
          background:
            "bg-[linear-gradient(180deg,#FAFCFB_0%,#F4EFE6_55%,#FBF7EE_100%)]",
          leftRail: (
            <div className="flex flex-col gap-4">
              {heroBlock}
              {audienceBlock}
            </div>
          ),
          center: (
            <div className="flex flex-col gap-5">
              {introCardBlock}
              {learnBlock}
              {whyBlock}
            </div>
          ),
          rightRail: (
            <div className="flex flex-col gap-4">
              {teacherBridgeBlock}
              {legalBlock}
            </div>
          ),
        }}
      />
    </>
  );
}
