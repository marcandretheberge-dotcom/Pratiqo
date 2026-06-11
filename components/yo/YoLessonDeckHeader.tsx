/**
 * YoLessonDeckHeader
 *
 * App-style top bar for the lesson deck. Sits at the top of the
 * deck's `h-[100dvh]` flex column (no longer page-`sticky` — the
 * parent owns the viewport-lock, so sticky positioning is moot)
 * and replaces the legacy 5-level breadcrumb (`YoPratiqo ›
 * Langues › Espagnol › R.D. › Module 2`) with three focused
 * affordances:
 *
 *   - one back arrow / "Course Home" link that points back to
 *     the country course home (one level up — never all the way
 *     to /yo);
 *   - the compact module label so the learner always knows
 *     where they are;
 *   - an FR/EN toggle.
 *
 * The progress strip (dots / "3 / 9") is rendered separately by
 * the deck client component itself, so this file stays a clean
 * server component.
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
import {
  YO_LESSON_DECK_CHROME,
  type YoLessonDeckChromeLabels,
} from "@/lib/yo/lessonDeckTypes";
import {
  DECK_CONTENT_MAX_WIDTH_CLASS,
  DECK_HEADER_CLASSES,
  DECK_HEADER_ROW_CLASSES,
} from "@/lib/yo/lessonDeckVisualContract";
import type { YoLocale } from "@/lib/yo/types";

export type YoLessonDeckHeaderProps = {
  locale: YoLocale;
  /** Where the back arrow points — typically the country course home. */
  backHref: string;
  /**
   * Legacy FR/EN toggle href. Preserved as a fallback path used by the
   * `<YoLanguageSelector />` (the selector falls back to
   * `usePathname()` when a route has client navigation enabled, but
   * deck pages are server components so we pass the explicit base
   * pathname derived from `toggleHref` to keep ES / FR / EN flips
   * predictable on static surfaces).
   */
  toggleHref: string;
  /** Visible compact label, e.g. "Module 2 · RD A1". */
  moduleLabel: string;
  /**
   * Optional whitelist of locales the current deck route ships copy
   * for. Defaults to all three — pass explicitly to dim ES when a
   * route only has FR/EN strings.
   */
  availableLocales?: ReadonlyArray<YoLocale>;
  /**
   * Explicit base pathname for the language selector. When omitted,
   * the selector uses `usePathname()`. Pass when the deck lives at a
   * sub-route but the language flip should anchor a different base.
   */
  selectorPath?: string;
  className?: string;
};

/**
 * Strip the trailing `?lang=...` query (if any) from the legacy
 * `toggleHref` so we can reuse it as the canonical pathname for the
 * `<YoLanguageSelector />`. Pure helper — exported only for tests.
 */
export function extractBasePathFromToggleHref(toggleHref: string): string {
  const queryIndex = toggleHref.indexOf("?");
  return queryIndex >= 0 ? toggleHref.slice(0, queryIndex) : toggleHref;
}

export function YoLessonDeckHeader({
  locale,
  backHref,
  toggleHref,
  moduleLabel,
  availableLocales,
  selectorPath,
  className,
}: YoLessonDeckHeaderProps): React.JSX.Element {
  const labels: YoLessonDeckChromeLabels = YO_LESSON_DECK_CHROME[locale];
  const baseSelectorPath =
    selectorPath ?? extractBasePathFromToggleHref(toggleHref);
  return (
    <header
      data-testid="yo-lesson-deck-header"
      data-yo-lesson-deck-header="true"
      data-no-deck-swipe="true"
      data-no-deck-tap="true"
      className={cn(DECK_HEADER_CLASSES, className)}
    >
      <div className={cn(DECK_HEADER_ROW_CLASSES, DECK_CONTENT_MAX_WIDTH_CLASS)}>
        <Link
          data-testid="yo-lesson-deck-header-back"
          href={backHref}
          aria-label={labels.back}
          className="inline-flex items-center gap-2 rounded-full border border-[#E7DFCF] bg-white/70 px-2.5 py-1.5 text-sm font-semibold text-[#172642] transition hover:bg-white sm:px-3"
        >
          <ArrowLeft className="size-4" aria-hidden />
          <span className="hidden sm:inline">{labels.back}</span>
        </Link>

        <div className="flex min-w-0 items-center justify-center gap-2">
          <span className="hidden sm:inline-flex">
            <YoPratiqoLogo size="sm" priority={false} />
          </span>
          <span
            data-testid="yo-lesson-deck-header-module-label"
            className="truncate text-sm font-semibold text-[#172642] sm:text-[15px]"
          >
            {moduleLabel}
          </span>
        </div>

        <div data-testid="yo-lesson-deck-header-lang-toggle">
          <YoLanguageSelector
            locale={locale}
            pathname={baseSelectorPath}
            availableLocales={availableLocales}
            size="sm"
          />
        </div>
      </div>
    </header>
  );
}

export default YoLessonDeckHeader;
