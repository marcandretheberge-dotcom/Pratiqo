/**
 * YoPratiqo — Espagnol · Pays · République dominicaine A1 (Course Home)
 *
 * Canonical position of the RD A1 course inside the new YoPratiqo
 * information architecture:
 *
 *   YoPratiqo → Langues → Espagnol → République dominicaine
 *
 * Replaces the original deep 4-level breadcrumb landing with an
 * app-like "Course Home" surface:
 *
 *   1. <YoCourseAppHeader />       sticky app top bar — back to
 *                                  /yo/langues/espagnol, compact
 *                                  YoPratiqo brand mark, FR/EN
 *                                  toggle. No breadcrumb trail.
 *   2. <YoCourseHero />            rounded country photo, badge
 *                                  chips, editorial serif title,
 *                                  one primary CTA pill to the
 *                                  in-page intro anchor + a small
 *                                  "skip to module 2" secondary
 *                                  link.
 *   3. <YoCoursePath />            5-step roadmap (Intro → Mods 2,
 *                                  3, 4, 5 → A2 mission) using the
 *                                  real module routes that already
 *                                  exist in the repo.
 *   4. <YoCourseCompanionPanel />  travel companion + auth-aware
 *                                  CTA wired to `/login` or
 *                                  `/student/progress`.
 *   5. <RepubliqueDominicaineContent omitHero omitLessonPath />
 *                                  the existing rich educational
 *                                  content — intro experience,
 *                                  detailed sections, dictionary,
 *                                  flashcards, quiz, unlock card,
 *                                  feature strip, printables, and
 *                                  the legacy final CTA — mounted
 *                                  BELOW the Course Home so no
 *                                  lesson content is lost. The
 *                                  duplicate hero + lesson-path
 *                                  inside that component are
 *                                  suppressed via opt-outs so
 *                                  there is exactly one hero and
 *                                  exactly one roadmap on the
 *                                  page.
 *   6. <YoStickyCourseCta />       mobile-only sticky bottom pill
 *                                  so the primary action is always
 *                                  one tap away while the learner
 *                                  reads the long-form intro.
 *
 * Locale behaviour:
 *   ?lang=en → English
 *   anything else (or absent) → French (Quebec default)
 *
 * Privacy / restricted-systems envelope:
 *   No Supabase write, no Stripe, no payment math, no checkout,
 *   no marketplace, no audio generation, no Supabase RLS edits,
 *   no migrations, no AI summary, no raw quiz exposure. The
 *   booking-time consent surface (`<YoBookingTeacherBridgeConsent
 *   />`) and the student-progress companion card
 *   (`<YoStudentCompanionCard />`) are NOT touched.
 */

import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo/site";
import { dominicanRepublicA1 } from "@/lib/yo/dominicanRepublicA1";
import { buildYoLocaleHref, getYoLocale, t } from "@/lib/yo/localize";
import { RepubliqueDominicaineContent } from "@/components/yo/RepubliqueDominicaineContent";
import { YoCourseAppHeader } from "@/components/yo/YoCourseAppHeader";
import { YoCourseCompanionPanel } from "@/components/yo/YoCourseCompanionPanel";
import { YoCourseHero } from "@/components/yo/YoCourseHero";
import { YoCoursePath, type YoCoursePathStep } from "@/components/yo/YoCoursePath";
import { YoCourseHomeShell } from "@/components/yo/YoCourseHomeShell";
import { YoStickyCourseCta } from "@/components/yo/YoStickyCourseCta";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title:
    "YoPratiqo — Espagnol République dominicaine A1",
  description:
    "Apprends à vraiment parler sur place avec culture, expressions locales et missions réelles. Parcours République dominicaine A1, $24,99 CAD.",
  alternates: {
    canonical: `${SITE_URL}/yo/langues/espagnol/pays/republique-dominicaine`,
  },
  openGraph: {
    title: "YoPratiqo — République dominicaine A1",
    description:
      "Espagnol pratique, culture dominicaine et expressions locales. $24,99 CAD.",
    type: "website",
    url: `${SITE_URL}/yo/langues/espagnol/pays/republique-dominicaine`,
    locale: "fr_CA",
  },
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ lang?: string | string[] }>;
}

/**
 * Static per-locale copy for the Course Home roadmap. We mirror
 * the source data in `lib/yo/dominicanRepublicA1.ts` (where the
 * 5 module routes + titles + statuses live) but render shorter,
 * app-style outcomes specifically tuned for the roadmap cards.
 * The legacy lesson-path data is still consumed unchanged by
 * `<YoLessonPath />` on the legacy `/yo/voyage/...` route.
 */
const ROADMAP_BASE: ReadonlyArray<
  Omit<YoCoursePathStep, "ctaLabel" | "title" | "outcome">
  & { id: "intro" | "module-2" | "module-3" | "module-4" | "module-5" }
> = [
  {
    id: "intro",
    position: 1,
    level: "A1",
    status: "next",
    href: "/yo/langues/espagnol/pays/republique-dominicaine/intro",
  },
  {
    id: "module-2",
    position: 2,
    level: "A1",
    status: "available",
    href: "/yo/langues/espagnol/pays/republique-dominicaine/module-2",
  },
  {
    id: "module-3",
    position: 3,
    level: "A1",
    status: "available",
    href: "/yo/langues/espagnol/pays/republique-dominicaine/module-3",
  },
  {
    id: "module-4",
    position: 4,
    level: "A1",
    status: "available",
    href: "/yo/langues/espagnol/pays/republique-dominicaine/module-4",
  },
  {
    id: "module-5",
    position: 5,
    level: "A2",
    status: "available",
    href: "/yo/langues/espagnol/pays/republique-dominicaine/module-5",
  },
];

const ROADMAP_COPY = {
  fr: {
    intro: {
      title: "Intro",
      outcome: "Premières phrases utiles, culture et expressions du quotidien.",
      cta: "Commencer",
    },
    module2: {
      title: "Hôtel & aéroport",
      outcome: "Passer la douane, prendre un taxi, faire le check-in.",
      cta: "Ouvrir",
    },
    module3: {
      title: "Bouffe & culture locale",
      outcome: "Lire un menu, commander, payer, demander l’addition.",
      cta: "Ouvrir",
    },
    module4: {
      title: "Se déplacer & explorer",
      outcome: "Demander son chemin, prendre la guagua, raconter ta journée.",
      cta: "Ouvrir",
    },
    module5: {
      title: "Mission finale A2",
      outcome: "Capstone voyage : résoudre les imprévus et clore ton parcours.",
      cta: "Mission finale",
    },
  },
  en: {
    intro: {
      title: "Intro",
      outcome: "First useful phrases, culture, and everyday expressions.",
      cta: "Start",
    },
    module2: {
      title: "Hotel & airport",
      outcome: "Customs, taxi, hotel check-in, the first 30 minutes on the ground.",
      cta: "Open",
    },
    module3: {
      title: "Food & local culture",
      outcome: "Reading a menu, ordering, paying, asking for the bill.",
      cta: "Open",
    },
    module4: {
      title: "Get around & explore",
      outcome: "Asking directions, taking the guagua, telling your day.",
      cta: "Open",
    },
    module5: {
      title: "Final A2 mission",
      outcome: "Travel capstone: handle the unexpected and close your trip.",
      cta: "Final mission",
    },
  },
  es: {
    intro: {
      title: "Intro",
      outcome: "Primeras frases útiles, cultura y expresiones del día a día.",
      cta: "Empezar",
    },
    module2: {
      title: "Hotel y aeropuerto",
      outcome: "Aduana, taxi, check-in en el hotel, los primeros 30 minutos.",
      cta: "Abrir",
    },
    module3: {
      title: "Comida y cultura local",
      outcome: "Leer un menú, pedir, pagar, pedir la cuenta.",
      cta: "Abrir",
    },
    module4: {
      title: "Moverte y explorar",
      outcome: "Pedir direcciones, tomar la guagua, contar tu día.",
      cta: "Abrir",
    },
    module5: {
      title: "Misión final A2",
      outcome: "Capstone de viaje: resolver imprevistos y cerrar tu trayecto.",
      cta: "Misión final",
    },
  },
} as const;

const COURSE_HOME_COPY = {
  fr: { stickyCta: "Commencer gratuitement" },
  en: { stickyCta: "Start for free" },
  es: { stickyCta: "Empezar gratis" },
} as const;

function buildRoadmap(locale: "fr" | "en" | "es"): YoCoursePathStep[] {
  const copy = ROADMAP_COPY[locale];
  return ROADMAP_BASE.map((step) => {
    const c =
      step.id === "intro"
        ? copy.intro
        : step.id === "module-2"
          ? copy.module2
          : step.id === "module-3"
            ? copy.module3
            : step.id === "module-4"
              ? copy.module4
              : copy.module5;
    return {
      position: step.position,
      title: c.title,
      outcome: c.outcome,
      level: step.level,
      status: step.status,
      ctaLabel: c.cta,
      href: step.href,
    };
  });
}

export default async function YoEspagnolRepubliqueDominicainePage({
  searchParams,
}: PageProps) {
  const resolvedSearchParams = await searchParams;
  const locale = getYoLocale(resolvedSearchParams.lang);
  const langSuffix = locale === "en" ? "?lang=en" : "";

  const { module } = dominicanRepublicA1;
  const heroImageAlt = t(module.heroImageAlt ?? module.destinationLabel, locale);

  // Back nav points one step up the canonical IA — to the
  // Spanish-language hub, not the YoPratiqo home — so the user
  // can fan back out to other Spanish countries quickly.
  const backHref = `/yo/langues/espagnol${langSuffix}`;
  const toggleHref = buildYoLocaleHref(
    "/yo/langues/espagnol/pays/republique-dominicaine",
    locale === "fr" ? "en" : "fr",
  );

  const roadmap = buildRoadmap(locale);
  const stickyCopy = COURSE_HOME_COPY[locale];

  return (
    <YoCourseHomeShell
      header={
        <YoCourseAppHeader
          locale={locale}
          backHref={backHref}
          toggleHref={toggleHref}
        />
      }
    >
      <YoCourseHero
        locale={locale}
        heroImagePath={module.heroImagePath ?? "/images/yo/app/hero.png"}
        heroImageAlt={heroImageAlt}
      />

      <YoCoursePath locale={locale} steps={roadmap} />

      <YoCourseCompanionPanel locale={locale} />

      {/* Long-form educational content kept intact and moved below
          the app-style Course Home. The duplicate marketing hero
          and legacy lesson-path inside this component are opted
          out so the page has exactly one hero (above) and exactly
          one roadmap (above). The free intro experience,
          dictionary, flashcards, quiz, unlock card, feature strip,
          printables, and existing final CTA all render unchanged
          here so any deep link to `#yo-intro-experience` keeps
          working AND so any learner who scrolls past the deck
          CTAs can still access the long-form content. The
          PRIMARY learning flow now goes through the
          `/intro` deck route — the legacy anchor is preserved
          for backward compatibility only. */}
      <div id="yo-intro-experience" className="scroll-mt-20">
        <RepubliqueDominicaineContent
          locale={locale}
          omitHero
          omitLessonPath
        />
      </div>

      <YoStickyCourseCta
        href="/yo/langues/espagnol/pays/republique-dominicaine/intro"
        label={stickyCopy.stickyCta}
      />
    </YoCourseHomeShell>
  );
}
