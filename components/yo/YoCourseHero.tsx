/**
 * YoCourseHero
 *
 * App-like hero card for a country-level YoPratiqo course home.
 * Designed to answer the three onboarding questions immediately:
 *
 *   1. What is this?              → editorial serif headline
 *   2. Who is it for?             → body line + chip badges
 *   3. What do I do next?         → one primary CTA (full-width
 *                                   teal pill) + a quieter
 *                                   "Skip to module 2" secondary
 *                                   link
 *
 * Composition (top → bottom)
 * --------------------------
 *   1. Rounded country hero image (uses the existing
 *      `module.heroImagePath` so we keep the production tropical
 *      photograph the rest of the module already uses).
 *   2. Chip badges row (A1 → A2 / Voyage / Intro gratuite /
 *      Culture locale).
 *   3. Editorial Newsreader headline.
 *   4. Body paragraph.
 *   5. Primary CTA pill (locale-aware label + locale-aware
 *      destination — defaults to the in-page intro anchor when
 *      no authenticated progress is detected, can flip to
 *      "Continuer mon parcours" by passing a different copy via
 *      the existing locale keys).
 *   6. Secondary "Skip to module 2" link.
 *
 * The Intro is now its own no-scroll swipe lesson deck route
 * (`/yo/langues/espagnol/pays/republique-dominicaine/intro`).
 * The primary CTA launches that deck so the entry into the
 * learning path feels app-like — not "scroll into the middle
 * of a long page". The secondary link points to the first
 * paid-but-currently-free module (module 2). Both routes already
 * exist in the repo; no fake routes are invented.
 *
 * Privacy / safety profile
 * ------------------------
 *   • Pure server component. No client hooks, no API calls, no
 *     persistence, no payment library, no Supabase write, no
 *     quiz data, no AI summary, no analytics.
 */

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { YoLocale } from "@/lib/yo/types";

type Copy = {
  title: string;
  body: string;
  ctaPrimary: string;
  ctaSecondary: string;
  badges: readonly string[];
};

const COPY: Record<YoLocale, Copy> = {
  fr: {
    title: "Espagnol pour ton voyage en République dominicaine",
    body: "Apprends les phrases utiles pour commander, te déplacer, arriver à l’hôtel et parler avec confiance sur place.",
    ctaPrimary: "Commencer gratuitement",
    ctaSecondary: "Passer au Module 2",
    badges: ["A1 → A2", "Voyage", "Intro gratuite", "Culture locale"],
  },
  en: {
    title: "Spanish for your Dominican Republic trip",
    body: "Learn useful phrases to order food, get around, arrive at your hotel and speak with confidence on your trip.",
    ctaPrimary: "Start for free",
    ctaSecondary: "Skip to Module 2",
    badges: ["A1 → A2", "Travel", "Free intro", "Local culture"],
  },
  es: {
    title: "Español para tu viaje a República Dominicana",
    body: "Aprende frases útiles para pedir comida, moverte, llegar al hotel y hablar con confianza durante tu viaje.",
    ctaPrimary: "Empezar gratis",
    ctaSecondary: "Saltar al Módulo 2",
    badges: ["A1 → A2", "Viaje", "Intro gratis", "Cultura local"],
  },
};

function safeLocale(locale: YoLocale | undefined): YoLocale {
  if (locale === "en" || locale === "es") return locale;
  return "fr";
}

/**
 * Centralized hrefs so the static smoke test can grep for them
 * and a future route refactor is caught by
 * tests/yo/yopratiqoCountryCourseAppHome.test.ts.
 */
const HREFS = {
  /** Real Intro deck route — replaces the legacy
   *  `#yo-intro-experience` in-page scroll anchor so the entry
   *  into the learning path feels app-like (lesson deck) rather
   *  than "scroll into a long page". */
  intro: "/yo/langues/espagnol/pays/republique-dominicaine/intro",
  module2: "/yo/langues/espagnol/pays/republique-dominicaine/module-2",
} as const;

export type YoCourseHeroProps = {
  locale: YoLocale;
  /** Country hero image — typically `module.heroImagePath`. */
  heroImagePath: string;
  /** Localized alt text — typically `t(module.heroImageAlt, locale)`. */
  heroImageAlt: string;
  className?: string;
};

export function YoCourseHero({
  locale,
  heroImagePath,
  heroImageAlt,
  className,
}: YoCourseHeroProps): React.JSX.Element {
  const l = safeLocale(locale);
  const copy = COPY[l];

  return (
    <article
      data-testid="yo-course-hero"
      data-yo-course-hero="true"
      className={cn(
        "flex w-full flex-col items-stretch gap-5 rounded-[2rem] border border-[#E7DFCF] bg-white p-5 shadow-[0_18px_46px_rgba(23,38,66,0.07)] sm:gap-6 sm:p-6",
        className,
      )}
    >
      {/*
       * 1. Rounded country hero image.
       *
       * Uses `object-contain` so non-16:10 images (e.g. the
       * `/images/yo/app/hero.png` portrait fallback at 388x742)
       * are letterboxed against the warm cream `bg-[#EFE7D6]`
       * instead of having their top/bottom subject area cropped
       * away by `object-cover`. The wrapper still enforces an
       * `aspect-[16/10]` so the layout stays predictable when
       * the image has not yet loaded.
       */}
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[1.5rem] border border-[#E7DFCF] bg-[#EFE7D6]">
        <Image
          src={heroImagePath}
          alt={heroImageAlt}
          fill
          sizes="(min-width: 1024px) 560px, (min-width: 640px) 540px, 100vw"
          priority
          className="object-contain"
        />
      </div>

      {/* 2. Badge chips */}
      <ul
        data-testid="yo-course-hero-badges"
        className="flex flex-wrap items-center gap-1.5"
      >
        {copy.badges.map((badge) => (
          <li
            key={badge}
            className="inline-flex items-center rounded-full border border-[#13A085]/30 bg-[#E3F1EB] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#172642]"
          >
            {badge}
          </li>
        ))}
      </ul>

      {/* 3. Editorial Newsreader headline */}
      <h1
        data-testid="yo-course-hero-title"
        className="font-yo-app-display text-[26px] font-semibold leading-[1.14] tracking-tight text-[#172642] sm:text-[30px]"
      >
        {copy.title}
      </h1>

      {/* 4. Body */}
      <p className="text-[15px] leading-relaxed text-[#566073]">{copy.body}</p>

      {/* 5. Primary CTA pill */}
      <Link
        data-testid="yo-course-hero-primary-cta"
        href={HREFS.intro}
        className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#13A085] px-6 py-4 text-base font-bold text-white shadow-[0_14px_30px_rgba(19,160,133,0.26)] transition hover:bg-[#16B597]"
      >
        {copy.ctaPrimary}
        <ArrowRight
          className="size-4 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </Link>

      {/* 6. Secondary "Skip to module 2" link */}
      <Link
        data-testid="yo-course-hero-secondary-cta"
        href={HREFS.module2}
        className="inline-flex items-center justify-center gap-1 self-center text-sm font-semibold text-[#13A085] underline-offset-2 hover:underline"
      >
        {copy.ctaSecondary}
        <ChevronRight className="size-4" aria-hidden />
      </Link>
    </article>
  );
}

export default YoCourseHero;
