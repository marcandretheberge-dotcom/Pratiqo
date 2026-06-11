"use client";

/**
 * YoLessonDeckNav
 *
 * Bottom Back / Next bar for the lesson deck. Mounted by
 * `<YoLessonDeck />` as the last flex item of the viewport-
 * locked deck column; not normally imported directly by per-
 * module deck composers.
 *
 * Behavior
 * --------
 *   • Always renders both buttons.
 *   • The Back button is disabled (and `aria-disabled`) on the
 *     first screen — keeping it visible avoids layout shift
 *     between screens.
 *   • The Next button switches its label to `Finish` on the
 *     last screen so the learner sees the deck's edge clearly;
 *     this lets per-screen content like the completion screen
 *     own its own actions (e.g. the
 *     `<YoMarkModuleCompletedButton />`) without the deck
 *     pretending to be a "submit" affordance.
 *   • iOS safe-area aware (`env(safe-area-inset-bottom)`) — the
 *     bottom inset padding is applied directly on the nav so it
 *     stays pinned just above the home indicator on iPhone X+.
 *   • Sits at the bottom of the deck's `h-[100dvh]` flex column
 *     (no longer `position: fixed` — the parent owns the
 *     viewport-lock) so the deck never produces page-level
 *     scroll.
 *
 * Privacy / safety profile
 * ------------------------
 *   • Client component, but stateless apart from the props it
 *     receives. No API calls, no persistence, no payment
 *     library, no Supabase write, no quiz data.
 */

import { ArrowLeft, ArrowRight, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  YO_LESSON_DECK_CHROME,
  type YoLessonDeckChromeLabels,
} from "@/lib/yo/lessonDeckTypes";
import {
  DECK_CONTENT_MAX_WIDTH_CLASS,
  DECK_NAV_CLASSES,
  DECK_NAV_NEXT_BUTTON_CLASSES,
  DECK_NAV_PREV_BUTTON_CLASSES,
  DECK_NAV_ROW_CLASSES,
  DECK_NAV_TOP_FADE_CLASSES,
} from "@/lib/yo/lessonDeckVisualContract";
import type { YoLocale } from "@/lib/yo/types";

export type YoLessonDeckNavProps = {
  locale: YoLocale;
  currentIndex: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
};

export function YoLessonDeckNav({
  locale,
  currentIndex,
  total,
  onPrev,
  onNext,
  className,
}: YoLessonDeckNavProps): React.JSX.Element {
  const labels: YoLessonDeckChromeLabels = YO_LESSON_DECK_CHROME[locale];
  const atFirst = currentIndex <= 0;
  const atLast = currentIndex >= total - 1;
  const nextLabel = atLast ? labels.finish : labels.next;
  const NextIcon = atLast ? Check : ArrowRight;

  return (
    <nav
      data-testid="yo-lesson-deck-nav"
      data-yo-lesson-deck-nav="true"
      data-no-deck-swipe="true"
      data-no-deck-tap="true"
      aria-label={labels.progressAnnouncement(currentIndex + 1, total)}
      className={cn(DECK_NAV_CLASSES, className)}
    >
      <div aria-hidden className={DECK_NAV_TOP_FADE_CLASSES} />
      <div className={cn(DECK_NAV_ROW_CLASSES, DECK_CONTENT_MAX_WIDTH_CLASS)}>
        <button
          type="button"
          data-testid="yo-lesson-deck-nav-prev"
          onClick={onPrev}
          disabled={atFirst}
          aria-disabled={atFirst}
          className={cn(
            DECK_NAV_PREV_BUTTON_CLASSES,
            atFirst
              ? "cursor-not-allowed opacity-40"
              : "hover:bg-[#FBF7EE]",
          )}
        >
          <ArrowLeft className="size-4" aria-hidden />
          {labels.prev}
        </button>

        <button
          type="button"
          data-testid="yo-lesson-deck-nav-next"
          onClick={onNext}
          disabled={atLast}
          aria-disabled={atLast}
          className={cn(
            DECK_NAV_NEXT_BUTTON_CLASSES,
            atLast ? "cursor-not-allowed opacity-60" : "hover:bg-[#16B597]",
          )}
        >
          {nextLabel}
          <NextIcon className="size-4" aria-hidden />
        </button>
      </div>
    </nav>
  );
}

export default YoLessonDeckNav;
