/**
 * YoCourseAppHeader
 *
 * Sticky top bar for the country-level Course Home. Replaces the
 * 4-level breadcrumb (`YoPratiqo › Langues › Espagnol › R.D.`)
 * with two app-style affordances:
 *
 *   - a single back arrow / "Langues" back link that points one
 *     level up (to the Spanish-language hub), and
 *   - a tiny in-header brand identity (YoPratiqo logo at sm) so
 *     the surface still reads as "inside YoPratiqo".
 *
 * Layout
 * ------
 *   Mobile : [← back] [course title centered]                    [FR/EN]
 *   Desktop: [← Langues] [YoPratiqo logo + course label]         [FR/EN]
 *
 * Both layouts collapse cleanly on a 320px viewport — no overflow,
 * no horizontal scroll, no clipped logo.
 *
 * Privacy / safety profile
 * ------------------------
 *   • Pure server component. No client hooks, no API calls, no
 *     persistence, no payment library, no Supabase write, no
 *     quiz data.
 */

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { YoPratiqoLogo } from "@/components/yo/YoPratiqoLogo";
import { YoLanguageSelector } from "@/components/yo/YoLanguageSelector";
import { extractBasePathFromToggleHref } from "@/components/yo/YoLessonDeckHeader";
import type { YoLocale } from "@/lib/yo/types";

type Copy = {
  backLabel: string;
  /** Visible course label, e.g. "République dominicaine". */
  courseLabel: string;
  /** Screen-reader-only annotation for the back link. */
  backAria: string;
};

const COPY: Record<YoLocale, Copy> = {
  fr: {
    backLabel: "Langues",
    courseLabel: "République dominicaine",
    backAria: "Retour à Langues",
  },
  en: {
    backLabel: "Languages",
    courseLabel: "Dominican Republic",
    backAria: "Back to Languages",
  },
  es: {
    backLabel: "Idiomas",
    courseLabel: "República Dominicana",
    backAria: "Volver a Idiomas",
  },
};

function safeLocale(locale: YoLocale | undefined): YoLocale {
  if (locale === "en" || locale === "es") return locale;
  return "fr";
}

export type YoCourseAppHeaderProps = {
  locale: YoLocale;
  /** Where the back arrow / back link points. */
  backHref: string;
  /**
   * Legacy FR/EN toggle href — preserved for back-compat. The
   * `<YoLanguageSelector />` rebuilds the locale flips on its own,
   * but we reuse the pathname stem so callers don't need to refactor.
   */
  toggleHref: string;
  /**
   * Optional whitelist of locales the screen ships copy for.
   * Defaults to all three.
   */
  availableLocales?: ReadonlyArray<YoLocale>;
  className?: string;
};

export function YoCourseAppHeader({
  locale,
  backHref,
  toggleHref,
  availableLocales,
  className,
}: YoCourseAppHeaderProps): React.JSX.Element {
  const l = safeLocale(locale);
  const copy = COPY[l];
  const selectorPath = extractBasePathFromToggleHref(toggleHref);
  return (
    <header
      data-testid="yo-course-app-header"
      data-yo-course-header="true"
      className={cn(
        "sticky top-0 z-40 border-b border-[#E7DFCF] bg-[#F4EFE6]/92 backdrop-blur-md",
        className,
      )}
    >
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-3 sm:h-16 sm:px-6">
        {/* Left: back arrow + label. Icon-only on mobile so the
            course title can stay readable in the center; full
            "← Langues" link on sm+. */}
        <Link
          data-testid="yo-course-app-header-back"
          href={backHref}
          aria-label={copy.backAria}
          className="inline-flex items-center gap-2 rounded-full border border-[#E7DFCF] bg-white/70 px-2.5 py-1.5 text-sm font-semibold text-[#172642] transition hover:bg-white sm:px-3"
        >
          <ArrowLeft className="size-4" aria-hidden />
          <span className="hidden sm:inline">{copy.backLabel}</span>
        </Link>

        {/* Center: compact YoPratiqo brand + course label. The
            label truncates rather than wrapping so the header
            never grows past one row on 320px. */}
        <div className="flex min-w-0 items-center justify-center gap-2">
          <span className="hidden sm:inline-flex">
            <YoPratiqoLogo size="sm" priority={false} />
          </span>
          <span
            data-testid="yo-course-app-header-title"
            className="truncate text-sm font-semibold text-[#172642] sm:text-[15px]"
          >
            {copy.courseLabel}
          </span>
        </div>

        {/* Right: real FR/EN/ES language selector. Replaces the
            one-off "View in English" pill so the user can hop to any
            supported locale without leaving the screen. */}
        <div data-testid="yo-course-app-header-lang-toggle">
          <YoLanguageSelector
            locale={l}
            pathname={selectorPath}
            availableLocales={availableLocales}
            size="sm"
          />
        </div>
      </div>
    </header>
  );
}

export default YoCourseAppHeader;
