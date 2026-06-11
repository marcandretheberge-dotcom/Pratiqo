"use client";

/**
 * YoLessonDeck
 *
 * Client orchestrator that turns an array of pre-rendered
 * `<YoLessonDeckScreen>` payloads into an app-like, one-screen-
 * at-a-time learning surface. The deck:
 *
 *   • mounts every screen in the DOM but only shows the active
 *     one — internal client widgets nested inside (browser
 *     audio buttons, the flashcard carousel, the
 *     `<YoMarkModuleCompletedButton>`) keep their state when
 *     the learner navigates back and forth;
 *   • renders a sticky `<YoLessonDeckHeader>` and a sticky
 *     `<YoLessonDeckNav>` so the learner always sees Back /
 *     Next without scrolling;
 *   • exposes a compact progress strip ("3 / 9" + dot row) so
 *     the learner sees where they are at a glance;
 *   • wires keyboard navigation (← / → on the page) for
 *     desktop, plus optional URL-hash deep links (out of scope
 *     in this PR — kept as a TODO);
 *   • smoothly scrolls to the top of the active screen when
 *     navigating, so each screen feels like a fresh page.
 *
 * The deck never persists anything by itself. Save-progress
 * persistence stays fully owned by `<YoMarkModuleCompletedButton>`
 * mounted inside the final screen's content.
 *
 * Privacy / safety profile
 * ------------------------
 *   • Client component, but state-only-in-memory. No API calls,
 *     no persistence, no payment library, no Supabase write, no
 *     quiz storage, no AI summary, no analytics.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { YoLessonDeckHeader } from "@/components/yo/YoLessonDeckHeader";
import { YoLessonDeckNav } from "@/components/yo/YoLessonDeckNav";
import { YoLessonDeckScreen } from "@/components/yo/YoLessonDeckScreen";
import {
  YO_LESSON_DECK_CHROME,
  type YoLessonDeckScreen as YoLessonDeckScreenModel,
} from "@/lib/yo/lessonDeckTypes";
import type { YoLocale } from "@/lib/yo/types";

export type YoLessonDeckProps = {
  locale: YoLocale;
  /** Visible compact module label, e.g. "Module 2 · RD A1". */
  moduleLabel: string;
  /** Where the back arrow points (typically the country course home). */
  backHref: string;
  /** Where the FR/EN toggle points. */
  toggleHref: string;
  /** The ordered, pre-rendered screens to show. */
  screens: YoLessonDeckScreenModel[];
  /**
   * Optional starting index, defaulting to 0. Useful for tests
   * and for future deep-linking.
   */
  initialIndex?: number;
  className?: string;
};

export function YoLessonDeck({
  locale,
  moduleLabel,
  backHref,
  toggleHref,
  screens,
  initialIndex = 0,
  className,
}: YoLessonDeckProps): React.JSX.Element {
  const total = screens.length;
  const labels = YO_LESSON_DECK_CHROME[locale];
  const safeInitial = useMemo(() => {
    if (total === 0) return 0;
    if (initialIndex < 0) return 0;
    if (initialIndex >= total) return total - 1;
    return initialIndex;
  }, [initialIndex, total]);

  const [currentIndex, setCurrentIndex] = useState(safeInitial);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);
  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(total - 1, i + 1));
  }, [total]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      // Don't hijack typing in form fields (none today, but
      // kept as a guard so future per-screen inputs stay safe).
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName?.toLowerCase();
        if (
          tag === "input" ||
          tag === "textarea" ||
          tag === "select" ||
          target.isContentEditable
        ) {
          return;
        }
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext]);

  useEffect(() => {
    // Scroll the deck stage into view so each screen feels like
    // a fresh page; respects user "reduce motion" preferences.
    const node = stageRef.current;
    if (!node) return;
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }, [currentIndex]);

  if (total === 0) {
    return (
      <div
        data-testid="yo-lesson-deck-empty"
        className="mx-auto max-w-md px-5 py-10 text-center text-sm text-[#566073]"
      >
        {labels.progressAnnouncement(0, 0)}
      </div>
    );
  }

  return (
    <div
      data-testid="yo-lesson-deck"
      data-yo-lesson-deck="true"
      data-yo-lesson-deck-total={total}
      className={cn(
        "relative min-h-[100dvh] bg-[linear-gradient(180deg,#F4EFE6_0%,#FBF7EE_55%,#F4EFE6_100%)]",
        className,
      )}
    >
      <YoLessonDeckHeader
        locale={locale}
        moduleLabel={moduleLabel}
        backHref={backHref}
        toggleHref={toggleHref}
      />

      <div
        ref={stageRef}
        className="mx-auto w-full max-w-[640px] scroll-mt-20 px-4 pb-32 pt-4 sm:px-6 sm:pt-6"
      >
        {/* Progress strip — compact "3 / 9" + dot row */}
        <div
          data-testid="yo-lesson-deck-progress"
          aria-live="polite"
          aria-atomic="true"
          className="mb-4 flex items-center gap-3"
        >
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#13A085]">
            {labels.progressAnnouncement(currentIndex + 1, total)}
          </span>
          <div
            aria-hidden
            className="flex flex-1 items-center gap-1.5 overflow-x-auto"
          >
            {screens.map((screen, idx) => (
              <span
                key={screen.id}
                data-testid="yo-lesson-deck-progress-dot"
                data-yo-lesson-deck-progress-active={idx === currentIndex}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition",
                  idx < currentIndex
                    ? "bg-[#13A085]"
                    : idx === currentIndex
                      ? "bg-[#172642]"
                      : "bg-[#E7DFCF]",
                )}
              />
            ))}
          </div>
        </div>

        {/* Mount every screen — only the active one is visible.
            This keeps internal client widgets (audio, flashcard
            carousel, completion button) hot when the learner
            navigates back and forth. */}
        {screens.map((screen, idx) => {
          const isActive = idx === currentIndex;
          return (
            <div
              key={screen.id}
              data-testid="yo-lesson-deck-stage"
              data-yo-lesson-deck-stage-id={screen.id}
              data-yo-lesson-deck-stage-active={isActive}
              aria-hidden={!isActive}
              className={cn(isActive ? "block" : "hidden")}
            >
              <YoLessonDeckScreen screen={screen} locale={locale} />
            </div>
          );
        })}
      </div>

      <YoLessonDeckNav
        locale={locale}
        currentIndex={currentIndex}
        total={total}
        onPrev={goPrev}
        onNext={goNext}
      />
    </div>
  );
}

export default YoLessonDeck;
