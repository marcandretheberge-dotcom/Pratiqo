/**
 * YoAppHeroCard
 *
 * The hero card on the new app-like /yo onboarding surface.
 *
 * Composition (top → bottom, matches the phone mockup direction
 * supplied with the design brief):
 *
 *   1. Centered YoPratiqo logo (md) — the brand at the top of the
 *      "phone screen" feel, matching the prototype mockup.
 *   2. Eyebrow tagline `LEARN · PRACTICE · EXPLORE` (uppercase,
 *      tracked, navy-soft).
 *   3. Rounded hero image (`/images/yo/app/hero.png`, transparent
 *      RGBA, intrinsic 388×742 — aspect preserved, never stretched).
 *   4. Editorial serif headline (Newsreader) — localized.
 *   5. Teal handwritten script accent ribbon (Caveat) — small, warm.
 *   6. Body paragraph (Hanken-Grotesk fallback via the page's
 *      default sans).
 *   7. Navy "brush" quote card (cream text on navy) — short cultural
 *      quote, mirrors the prototype's `BrushBanner`.
 *   8. Primary CTA pill — `Start for free / Commencer gratuitement /
 *      Empezar gratis` → `/yo/langues/espagnol/pays/republique-dominicaine`.
 *   9. Free-introduction note (small, navy-soft).
 *  10. Login link — `/login?next=/student/progress`.
 *
 * Privacy / safety profile
 * ------------------------
 *   • Server component. No client hooks, no API calls, no
 *     persistence, no payment library, no quiz data, no AI
 *     summary, no analytics.
 *   • Renders only the routes already used elsewhere on `/yo` (DR
 *     module path + audited /login route).
 */

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, LogIn } from "lucide-react";

import { cn } from "@/lib/utils";
import { YoPratiqoLogo } from "@/components/yo/YoPratiqoLogo";
import type { YoLocale } from "@/lib/yo/types";

type AppHeroCopy = {
  tagline: string;
  headline: string;
  script: string;
  body: string;
  quote: string;
  ctaPrimary: string;
  freeNote: string;
  loginPre: string;
  loginLink: string;
};

const COPY: Record<YoLocale, AppHeroCopy> = {
  fr: {
    tagline: "Apprends · Pratique · Explore",
    headline: "Ton prochain voyage commence aujourd’hui.",
    script: "pour les esprits curieux",
    body: "Apprends les langues à travers la culture, de vraies conversations et des situations du quotidien.",
    quote: "Explore le monde grâce aux langues et à la culture.",
    ctaPrimary: "Commencer gratuitement",
    freeNote: "Introductions gratuites — aucune carte requise",
    loginPre: "J’ai déjà un compte",
    loginLink: "Me connecter",
  },
  en: {
    tagline: "Learn · Practice · Explore",
    headline: "Your next trip starts today.",
    script: "for curious learners",
    body: "Learn languages through culture, real conversations and everyday situations.",
    quote: "Explore the world through language & culture.",
    ctaPrimary: "Start for free",
    freeNote: "Free introductions — no card needed",
    loginPre: "I already have an account",
    loginLink: "Log in",
  },
  es: {
    tagline: "Aprende · Practica · Explora",
    headline: "Tu próximo viaje empieza hoy.",
    script: "para mentes curiosas",
    body: "Aprende idiomas a través de la cultura, conversaciones reales y situaciones de la vida diaria.",
    quote: "Explora el mundo a través del idioma y la cultura.",
    ctaPrimary: "Empezar gratis",
    freeNote: "Introducciones gratis — sin tarjeta",
    loginPre: "Ya tengo una cuenta",
    loginLink: "Iniciar sesión",
  },
};

function safeLocale(locale: YoLocale | undefined): YoLocale {
  if (locale === "en" || locale === "es") return locale;
  return "fr";
}

/**
 * Centralized hrefs so the static smoke test can grep for them and
 * a future refactor of either the DR course path or the /login
 * route is caught by `tests/yo/yopratiqoAppLikeLanding.test.ts`.
 */
const HREFS = {
  startFree: "/yo/langues/espagnol/pays/republique-dominicaine",
  login: "/login?next=/student/progress",
} as const;

export type YoAppHeroCardProps = {
  locale: YoLocale;
  className?: string;
};

export function YoAppHeroCard({
  locale,
  className,
}: YoAppHeroCardProps): React.JSX.Element {
  const l = safeLocale(locale);
  const copy = COPY[l];

  return (
    <article
      data-testid="yo-app-hero-card"
      data-yo-app-hero="true"
      className={cn(
        "flex w-full flex-col items-center gap-6 rounded-[2rem] border border-[#E7DFCF] bg-white px-5 py-7 text-center shadow-[0_18px_46px_rgba(23,38,66,0.07)] sm:gap-7 sm:px-7 sm:py-9",
        className,
      )}
    >
      {/* 1. Centered YoPratiqo logo — re-uses the brand mark we
         already ship on the sticky header, just at md size and
         centered for the app-like onboarding rhythm. */}
      <YoPratiqoLogo size="md" priority={false} className="self-center" />

      {/* 2. Tagline eyebrow */}
      <p
        data-yo-app-hero-tagline="true"
        className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#566073]"
      >
        {copy.tagline}
      </p>

      {/* 3. Rounded hero image — transparent RGBA PNG, intrinsic
         388×742 (≈ 1:1.91 portrait). Capped at 280px wide on mobile
         so it never dominates the screen, and ~320px on desktop. */}
      <div className="relative">
        <div
          aria-hidden
          className="absolute -inset-4 rounded-[2.5rem] bg-[radial-gradient(circle,rgba(19,160,133,0.14),transparent_70%)]"
        />
        <Image
          src="/images/yo/app/hero.png"
          alt=""
          width={388}
          height={742}
          sizes="(min-width: 1024px) 320px, 280px"
          // `h-auto` keeps the 388×742 aspect intact; `w-[…]` caps
          // the display width per breakpoint so the visual stays
          // mobile-app-sized even on a large viewport.
          className="relative h-auto w-[280px] rounded-[2rem] object-contain lg:w-[320px]"
          priority
        />
      </div>

      {/* 4. Editorial serif headline */}
      <h1
        data-testid="yo-app-hero-headline"
        className="font-[var(--yo-app-display)] text-3xl font-semibold leading-[1.12] tracking-tight text-[#172642] sm:text-[34px]"
      >
        {copy.headline}
      </h1>

      {/* 5. Teal handwritten script accent — small, friendly, sits
         between the headline and the body so the page reads as a
         warm onboarding screen, not a cold marketing hero. */}
      <p
        data-testid="yo-app-hero-script"
        className="font-[var(--yo-app-script)] text-2xl font-medium text-[#13A085]"
      >
        {copy.script}
      </p>

      {/* 6. Body paragraph */}
      <p
        data-testid="yo-app-hero-body"
        className="max-w-[42ch] text-[15px] leading-relaxed text-[#566073]"
      >
        {copy.body}
      </p>

      {/* 7. Navy brush-style quote card */}
      <blockquote
        data-testid="yo-app-hero-brush-quote"
        className="relative w-full overflow-hidden rounded-[1.75rem] bg-[#172642] px-5 py-5 text-left text-[15px] leading-snug text-[#F6F1E7] shadow-[0_12px_30px_rgba(23,38,66,0.18)] sm:px-6 sm:py-6"
      >
        <span
          aria-hidden
          className="absolute -right-6 -top-6 size-24 rounded-full bg-[#13A085]/15 blur-2xl"
        />
        <span className="relative block font-[var(--yo-app-display)] italic">
          “{copy.quote}”
        </span>
      </blockquote>

      {/* 8. Primary CTA pill */}
      <Link
        data-testid="yo-app-hero-primary-cta"
        href={HREFS.startFree}
        className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#13A085] px-6 py-4 text-base font-bold text-white shadow-[0_18px_36px_rgba(19,160,133,0.28)] transition hover:bg-[#16B597]"
      >
        {copy.ctaPrimary}
        <ArrowRight
          className="size-4 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </Link>

      {/* 9. Free-introduction note */}
      <p
        data-testid="yo-app-hero-free-note"
        className="text-xs font-medium text-[#566073]"
      >
        {copy.freeNote}
      </p>

      {/* 10. Login link */}
      <p className="text-sm text-[#566073]">
        {copy.loginPre}{" "}
        <span aria-hidden className="mx-1 text-[#566073]/60">
          ·
        </span>{" "}
        <Link
          data-testid="yo-app-hero-login-link"
          href={HREFS.login}
          className="inline-flex items-center gap-1 font-bold text-[#13A085] underline-offset-2 hover:underline"
        >
          <LogIn className="size-3.5" aria-hidden />
          {copy.loginLink}
        </Link>
      </p>
    </article>
  );
}

export default YoAppHeroCard;
