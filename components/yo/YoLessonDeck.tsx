"use client";

/**
 * YoLessonDeck
 *
 * Client orchestrator that turns an array of pre-rendered
 * `<YoLessonDeckScreen>` payloads into a viewport-locked,
 * one-screen-at-a-time mobile-app learning surface. The deck:
 *
 *   • Locks the learning area to `h-[100dvh]` with a flex
 *     column so the page itself never scrolls inside a module
 *     lesson — the document body is the same size as the
 *     viewport, and the only scroll allowed is a fallback
 *     inside the active screen card when content does not fit.
 *   • Mounts every screen in the DOM but only shows the active
 *     one — internal client widgets nested inside (browser
 *     audio buttons, the flashcard carousel, the
 *     `<YoMarkModuleCompletedButton>`) keep their state when
 *     the learner navigates back and forth.
 *   • Renders a `<YoLessonDeckHeader>` and a
 *     `<YoLessonDeckNav>` as the first / last flex items of the
 *     deck column so the learner always sees Back / Next
 *     without scrolling.
 *   • Exposes a compact progress strip ("3 / 11" + dot row) so
 *     the learner sees where they are at a glance.
 *   • Wires three navigation modalities:
 *       1. Buttons in the bottom nav (Back / Next).
 *       2. Keyboard ArrowLeft / ArrowRight on the page.
 *       3. Touch / pen / mouse swipe gestures on the stage
 *          (right-to-left advances, left-to-right goes back),
 *          plus an optional opt-in tap-zone navigation
 *          (`enableTapNavigation`) where the left ~30 % of the
 *          stage taps back and the right ~30 % taps forward.
 *     Every gesture path skips when the pointer starts or ends
 *     inside an interactive element (`button`, `a[href]`,
 *     `input`, `textarea`, `select`, `summary`, `details`,
 *     `[role="button"]`, `[data-no-deck-swipe]`,
 *     `[data-no-deck-tap]`) so audio buttons, quiz
 *     `<details>` reveals, the flashcard carousel, the
 *     mark-completed button, etc. are never accidentally
 *     overridden.
 *   • Resets the active screen card's scroll position to the top
 *     on each navigation so every screen feels like a fresh
 *     page; respects `prefers-reduced-motion`.
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

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { cn } from "@/lib/utils";
import { YoLessonDeckHeader } from "@/components/yo/YoLessonDeckHeader";
import { YoLessonDeckNav } from "@/components/yo/YoLessonDeckNav";
import { YoLessonDeckScreen } from "@/components/yo/YoLessonDeckScreen";
import {
  YO_LESSON_DECK_CHROME,
  type YoLessonDeckScreen as YoLessonDeckScreenModel,
} from "@/lib/yo/lessonDeckTypes";
import {
  DECK_CONTENT_MAX_WIDTH_CLASS,
  DECK_PROGRESS_STRIP_CLASSES,
  DECK_ROOT_CLASSES,
  DECK_SCREEN_HOST_CLASSES,
  DECK_STAGE_CLASSES,
} from "@/lib/yo/lessonDeckVisualContract";
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
  /**
   * Opt-in tap-zone navigation. When enabled, a clean tap on
   * the left ~30 % of the stage area is treated as Back and a
   * clean tap on the right ~30 % as Next. Interactive elements
   * (button / a / input / textarea / select / summary /
   * details / `[role="button"]` / `[data-no-deck-tap]`) are
   * never hijacked. Defaults to `false` so consumers can opt
   * in per module once they have verified their per-screen
   * interactive controls are well-protected.
   */
  enableTapNavigation?: boolean;
  className?: string;
};

/**
 * Minimum horizontal movement (in pixels) required for a
 * pointer-up to count as a swipe gesture. Below this we
 * fall through to the tap-zone / no-op classifier.
 *
 * Exported as a named constant so tests can lock it in.
 */
export const YO_LESSON_DECK_SWIPE_THRESHOLD_PX = 56;

/**
 * Maximum horizontal *or* vertical movement for a gesture to
 * still count as a "tap" (i.e. not a drag). 10 px matches the
 * platform-typical click slop.
 */
export const YO_LESSON_DECK_TAP_MAX_MOVE_PX = 10;

/**
 * Horizontal-to-vertical ratio required for a swipe gesture
 * to be treated as horizontal navigation. If `|dy| > |dx| / RATIO`
 * we ignore the swipe so vertical scrolls (and accidental
 * diagonal drags) never trigger Back / Next.
 */
export const YO_LESSON_DECK_HORIZONTAL_DOMINANCE_RATIO = 1.5;

/**
 * CSS selector listing the elements where pointer gestures
 * must NOT be hijacked by the deck. Includes both the standard
 * interactive HTML controls and the two explicit escape
 * hatches (`[data-no-deck-swipe]`, `[data-no-deck-tap]`) so
 * per-screen content can opt out surgically.
 */
const YO_LESSON_DECK_GESTURE_EXCLUDE_SELECTOR =
  'button, a[href], input, textarea, select, summary, details, [role="button"], [data-no-deck-swipe], [data-no-deck-tap]';

function isInsideInteractive(node: EventTarget | null): boolean {
  if (!(node instanceof Element)) return false;
  return Boolean(node.closest(YO_LESSON_DECK_GESTURE_EXCLUDE_SELECTOR));
}

export function YoLessonDeck({
  locale,
  moduleLabel,
  backHref,
  toggleHref,
  screens,
  initialIndex = 0,
  enableTapNavigation = false,
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
  const activeScreenRef = useRef<HTMLDivElement | null>(null);
  const pointerStart = useRef<
    | {
        x: number;
        y: number;
        valid: boolean;
      }
    | null
  >(null);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);
  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(total - 1, i + 1));
  }, [total]);

  // Keyboard navigation — preserved verbatim from the previous
  // deck so ArrowLeft / ArrowRight on a desktop browser keeps
  // working.
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

  // Each new screen starts at the top of the active card. We
  // scroll the card's own internal scroll container (not the
  // document) so the deck stays viewport-locked. Respects
  // `prefers-reduced-motion`.
  useEffect(() => {
    const node = activeScreenRef.current;
    if (!node) return;
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      node.scrollTo({
        top: 0,
        left: 0,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    } catch {
      node.scrollTop = 0;
      node.scrollLeft = 0;
    }
  }, [currentIndex]);

  // ─── Gesture handlers ──────────────────────────────────────
  // Attached to the stage container. On `pointerdown` we record
  // the start position and decide whether the gesture is
  // "valid" (i.e. did not start inside an interactive element).
  // On `pointerup` we classify the gesture as swipe / tap /
  // no-op and call goPrev / goNext accordingly. Vertical drags
  // are always ignored so the fallback per-card scroll inside
  // a tall screen keeps working.

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    // Only react to primary pointer (left mouse button or
    // single touch). Multi-touch / right-click never triggers
    // deck navigation.
    if (event.button !== undefined && event.button !== 0) {
      pointerStart.current = null;
      return;
    }
    pointerStart.current = {
      x: event.clientX,
      y: event.clientY,
      valid: !isInsideInteractive(event.target),
    };
  }, []);

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const start = pointerStart.current;
      pointerStart.current = null;
      if (!start || !start.valid) return;

      // Re-check the release target — if the user started in a
      // safe area but lifted on a button (e.g. dragged across
      // an audio control), respect the button click and skip
      // deck navigation.
      if (isInsideInteractive(event.target)) return;

      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);

      // Horizontal swipe path
      if (
        adx >= YO_LESSON_DECK_SWIPE_THRESHOLD_PX &&
        adx >= ady * YO_LESSON_DECK_HORIZONTAL_DOMINANCE_RATIO
      ) {
        if (dx < 0) {
          goNext();
        } else {
          goPrev();
        }
        return;
      }

      // Vertical-dominant drag → ignore (let any internal scroll
      // container handle it natively).
      if (ady > adx) return;

      // Tap-zone path (opt-in)
      if (!enableTapNavigation) return;
      if (
        adx > YO_LESSON_DECK_TAP_MAX_MOVE_PX ||
        ady > YO_LESSON_DECK_TAP_MAX_MOVE_PX
      ) {
        return;
      }
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      if (rect.width <= 0) return;
      const xPct = (event.clientX - rect.left) / rect.width;
      if (xPct < 0.3) {
        goPrev();
      } else if (xPct > 0.7) {
        goNext();
      }
    },
    [enableTapNavigation, goNext, goPrev],
  );

  const onPointerCancel = useCallback(() => {
    pointerStart.current = null;
  }, []);

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
      data-yo-lesson-deck-tap-navigation={enableTapNavigation ? "on" : "off"}
      // Viewport-locked: h-[100dvh] with a flex column so the
      // header / progress / stage / nav share the viewport
      // exactly. `overflow-hidden` on the root makes sure no
      // accidental child can grow the document body. Class
      // string is the canonical `DECK_ROOT_CLASSES` from the
      // shared visual contract so every deck route inherits the
      // same warm-cream gradient and viewport behaviour.
      className={cn(DECK_ROOT_CLASSES, className)}
    >
      <YoLessonDeckHeader
        locale={locale}
        moduleLabel={moduleLabel}
        backHref={backHref}
        toggleHref={toggleHref}
      />

      {/* Progress strip — compact "3 / 11" + dot row. Sits
          between the header and the stage so it is always
          visible without any document scroll. Width is locked
          to the shared deck content column so the strip lines
          up with the stage and the nav below. */}
      <div
        data-testid="yo-lesson-deck-progress"
        data-no-deck-swipe="true"
        data-no-deck-tap="true"
        aria-live="polite"
        aria-atomic="true"
        className={cn(
          DECK_PROGRESS_STRIP_CLASSES,
          DECK_CONTENT_MAX_WIDTH_CLASS,
        )}
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

      {/* Stage — fills the remaining viewport space. Each
          screen is positioned absolutely so they all share the
          stage's box; only the active one is visible. The
          fallback per-card scroll is enabled with
          `overflow-y-auto overscroll-contain` so a single
          unusually long screen stays usable without leaking
          scroll up to the document. Width is locked to the
          shared deck content column. */}
      <div
        ref={stageRef}
        data-testid="yo-lesson-deck-stage"
        data-yo-lesson-deck-stage="true"
        className={cn(DECK_STAGE_CLASSES, DECK_CONTENT_MAX_WIDTH_CLASS)}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={onPointerCancel}
      >
        {screens.map((screen, idx) => {
          const isActive = idx === currentIndex;
          return (
            <div
              key={screen.id}
              ref={isActive ? activeScreenRef : undefined}
              data-testid="yo-lesson-deck-screen-host"
              data-yo-lesson-deck-screen-host-id={screen.id}
              data-yo-lesson-deck-screen-host-active={isActive}
              aria-hidden={!isActive}
              className={cn(
                DECK_SCREEN_HOST_CLASSES,
                isActive ? "block" : "hidden",
              )}
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
