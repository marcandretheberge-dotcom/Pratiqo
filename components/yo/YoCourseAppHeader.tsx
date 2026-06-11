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
import type { YoLocale } from "@/lib/yo/types";

type Copy = {
  backLabel: string;
  toggleLabel: string;
  /** Visible course label, e.g. "République dominicaine". */
  courseLabel: string;
  /** Screen-reader-only annotation for the back link. */
  backAria: string;
};

const COPY: Record<YoLocale, Copy> = {
  fr: {
    backLabel: "Langues",
    toggleLabel: "View in English",
    courseLabel: "République dominicaine",
    backAria: "Retour à Langues",
  },
  en: {
    backLabel: "Languages",
    toggleLabel: "Voir en français",
    courseLabel: "Dominican Republic",
    backAria: "Back to Languages",
  },
  es: {
    backLabel: "Idiomas",
    toggleLabel: "Voir en français",
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
  /** Where the FR/EN toggle points (with `?lang=` flipped). */
  toggleHref: string;
  className?: string;
};

export function YoCourseAppHeader({
  locale,
  backHref,
  toggleHref,
  className,
}: YoCourseAppHeaderProps): React.JSX.Element {
  const l = safeLocale(locale);
  const copy = COPY[l];
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

        {/* Right: lang toggle. Kept compact so it doesn't push the
            center label off-screen on mobile. */}
        <Link
          data-testid="yo-course-app-header-lang-toggle"
          href={toggleHref}
          className="inline-flex items-center rounded-full border border-[#E7DFCF] bg-white/70 px-2.5 py-1.5 text-xs font-bold text-[#172642] transition hover:bg-white sm:px-3"
        >
          {copy.toggleLabel}
        </Link>
      </div>
    </header>
  );
}

export default YoCourseAppHeader;
