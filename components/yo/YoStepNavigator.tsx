"use client";

/**
 * YoStepNavigator
 *
 * Button-driven step navigator that turns a list of focused
 * "screens" into an app-like sequence the learner advances with
 * an explicit Next / Back tap (mobile) or a click / keyboard
 * arrow (desktop touchpad). Replaces the previous passive
 * horizontal scroll-snap pager (`YoScreenPager`) on every
 * learner-facing surface that is NOT a lesson deck.
 *
 * Why this exists
 * ---------------
 * `YoScreenPager` paged content by horizontal scroll-snap — a
 * swipe gesture. On a real phone many learners still read that
 * as "scroll": there is no visible chrome telling them an
 * advance button is available, the swipe fights with iOS's
 * back-edge gesture, and the dots are visual-only.
 *
 * `YoStepNavigator` instead mirrors the
 * `<YoLessonDeck />` → `<YoLessonDeckNav />` model the team
 * already ships for lessons:
 *
 *   • All steps live in the DOM at all times (so client
 *     widgets nested in inactive steps keep their state); only
 *     the active step is `block`, the others are `hidden`.
 *   • Bottom chrome is explicit: `← Back` on the left,
 *     clickable step dots in the centre, `Next →` on the
 *     right. Last step's Next becomes `Done`.
 *   • Keyboard ← / → also advance.
 *   • Optional swipe gesture is a SECONDARY input — never the
 *     only one — and is suppressed inside interactive elements
 *     (button / a[href] / input / textarea / select / summary
 *     / details / [role="button"] / [data-no-deck-swipe] /
 *     [data-no-deck-tap]) so audio buttons and quiz reveals are
 *     never hijacked.
 *
 * Variants
 * --------
 *   • `standalone` (default) — assumes the navigator OWNS the
 *     viewport. Locks itself to `h-full` so its parent
 *     `<YoAppShell>` can give it the full mobile viewport and
 *     the bottom chrome stays pinned. Used by `/yo/**` routes
 *     through `<YoAdaptiveStepShell />`.
 *   • `embedded` — assumes the navigator is rendered INSIDE a
 *     parent layout that already provides its own bottom
 *     chrome (e.g. the global `(app)` AppShell's student tab
 *     bar). Renders the bottom chrome inline above the parent
 *     bar (no `position: fixed`, no safe-area inset). Used by
 *     `/student/yopratiqo` and `/student/progress`.
 *
 * Desktop
 * -------
 * On `lg:` viewports the navigator hides itself entirely
 * (`lg:hidden`). Desktop layouts are owned by
 * `<YoDesktopLearningWorkspace />` (for `/yo/**`) or by the
 * route's own grid (for `(app)` routes), so the desktop
 * experience is never "the mobile navigator scaled up".
 *
 * Privacy / safety profile
 * ------------------------
 *   • Client component, state-only-in-memory. No API calls, no
 *     persistence, no payment library, no Supabase write, no
 *     quiz storage, no AI summary, no analytics.
 */

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import {
  YO_LESSON_DECK_CHROME,
  type YoLessonDeckChromeLabels,
} from "@/lib/yo/lessonDeckTypes";
import type { YoLocale } from "@/lib/yo/types";
import { DeckYoppoCoach } from "@/components/yo/companion/DeckYoppoCoach";
import { stopLessonAudio } from "@/lib/yo/audio/stopLessonAudio";

export type YoStepNavigatorStep = {
  /** Stable per-route slug, e.g. "welcome" / "languages-main" / "languages-secondary". */
  id: string;
  /** Optional aria label for the step (otherwise "Step N of M"). */
  label?: string;
  /** The step's content. Wrapped by the navigator in a host element. */
  content: React.ReactNode;
  /** Optional strategy only; never include an assessment answer. */
  companionHint?: string;
};

export type YoStepNavigatorVariant = "standalone" | "embedded";

export type YoStepNavigatorProps = {
  /** Ordered, non-empty list of steps. */
  steps: ReadonlyArray<YoStepNavigatorStep>;
  /** Stable per-route slug for tests + analytics. */
  surfaceId: string;
  /** Locale drives the localized Back / Next / Done / progress labels. */
  locale: YoLocale;
  /** Optional aria label for the whole step region. */
  ariaLabel?: string;
  /** Optional initial step index. Clamped to `[0, steps.length - 1]`. */
  initialIndex?: number;
  /**
   * Visual + layout variant.
   *  - `standalone` (default): full-height column, viewport-owning,
   *    bottom chrome pinned with safe-area inset.
   *  - `embedded`: inline chrome, no viewport lock — for use inside
   *    a parent shell that already owns the bottom chrome (e.g. the
   *    `(app)` AppShell).
   */
  variant?: YoStepNavigatorVariant;
  /**
   * Optional Back-link target when the learner is on the first step.
   * If omitted, the Back button is disabled on step 0. Typically the
   * parent route (e.g. `/yo/langues` for the Spanish hub).
   */
  rootBackHref?: string;
  /** Optional label override for the root Back link on step 0. */
  rootBackLabel?: string;
  /**
   * Optional destination for the final step's Next button. When set,
   * the Next button on the last step becomes a `<Link>` to this
   * href — the natural "exit" of the step shell (e.g. starting the
   * Intro deck after the Course Home steps). When omitted, the Next
   * button on the last step becomes a disabled "Done" indicator.
   */
  lastStepNextHref?: string;
  /** Optional label override for the last-step Next link. */
  lastStepNextLabel?: string;
  className?: string;
  companion?: boolean;
};

// Re-use the deck gesture thresholds so the swipe feel is the same
// across decks and step navigators.
export const YO_STEP_NAVIGATOR_SWIPE_THRESHOLD_PX = 56;
export const YO_STEP_NAVIGATOR_TAP_MAX_MOVE_PX = 10;
export const YO_STEP_NAVIGATOR_HORIZONTAL_DOMINANCE_RATIO = 1.5;

const STEP_NAVIGATOR_GESTURE_EXCLUDE_SELECTOR =
  'button, a[href], input, textarea, select, summary, details, [role="button"], [data-no-deck-swipe], [data-no-deck-tap]';

function isInsideInteractive(node: EventTarget | null): boolean {
  if (!(node instanceof Element)) return false;
  return Boolean(node.closest(STEP_NAVIGATOR_GESTURE_EXCLUDE_SELECTOR));
}

export function YoStepNavigator({
  steps,
  surfaceId,
  locale,
  ariaLabel,
  initialIndex = 0,
  variant = "standalone",
  rootBackHref,
  rootBackLabel,
  lastStepNextHref,
  lastStepNextLabel,
  className,
  companion = false,
}: YoStepNavigatorProps): React.JSX.Element {
  const total = steps.length;
  if (total === 0) {
    throw new Error("YoStepNavigator requires at least one step");
  }

  const labels: YoLessonDeckChromeLabels = YO_LESSON_DECK_CHROME[locale];
  const safeInitial = useMemo(() => {
    if (initialIndex < 0) return 0;
    if (initialIndex >= total) return total - 1;
    return initialIndex;
  }, [initialIndex, total]);

  const [currentIndex, setCurrentIndex] = useState(safeInitial);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const activeStepRef = useRef<HTMLDivElement | null>(null);
  const pointerStart = useRef<
    | {
        x: number;
        y: number;
        valid: boolean;
      }
    | null
  >(null);

  // Stable id for aria-controls wiring between dots and the stage.
  const reactId = useId();
  const stageId = `yo-step-navigator-stage-${reactId}`;

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);
  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(total - 1, i + 1));
  }, [total]);
  const goTo = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= total) return;
      setCurrentIndex(idx);
    },
    [total],
  );

  // Keyboard arrow navigation. Doesn't hijack typing in form fields.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.defaultPrevented || document.querySelector("dialog[open]")) return;
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName?.toLowerCase();
        if (
          tag === "input" ||
          tag === "textarea" ||
          tag === "select" ||
          target.isContentEditable || target.closest("[data-yoppo-controls]")
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

  // Reset the active step's internal scroll to the top on each
  // navigation so every step feels like a fresh page. Respects
  // prefers-reduced-motion.
  useEffect(() => {
    const node = activeStepRef.current;
    stopLessonAudio();
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

  // Pointer gesture handlers — swipe is a SECONDARY input.
  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== undefined && event.button !== 0) {
        pointerStart.current = null;
        return;
      }
      pointerStart.current = {
        x: event.clientX,
        y: event.clientY,
        valid: !isInsideInteractive(event.target),
      };
    },
    [],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const start = pointerStart.current;
      pointerStart.current = null;
      if (!start || !start.valid) return;
      if (isInsideInteractive(event.target)) return;

      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);

      if (
        adx >= YO_STEP_NAVIGATOR_SWIPE_THRESHOLD_PX &&
        adx >= ady * YO_STEP_NAVIGATOR_HORIZONTAL_DOMINANCE_RATIO
      ) {
        if (dx < 0) {
          goNext();
        } else {
          goPrev();
        }
      }
    },
    [goPrev, goNext],
  );

  const onPointerCancel = useCallback(() => {
    pointerStart.current = null;
  }, []);

  const atFirst = currentIndex <= 0;
  const atLast = currentIndex >= total - 1;
  const nextLabel = atLast ? labels.finish : labels.next;
  const NextIcon = atLast ? Check : ArrowRight;

  // ─── Layout classes ─────────────────────────────────────────
  // Standalone: full-height flex column owning the viewport,
  // hidden on desktop because the workspace is the layout there.
  // Embedded: inline flex column; bottom chrome lives in-flow.
  const rootClasses = cn(
    "relative flex w-full flex-col",
    variant === "standalone" ? "h-full min-h-0 lg:hidden" : "",
    className,
  );
  const stageClasses = cn(
    "relative flex w-full min-w-0 flex-col",
    variant === "standalone"
      ? "flex-1 min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain"
      : "",
  );
  const navClasses = cn(
    "shrink-0",
    variant === "standalone"
      ? // The standalone variant assumes the navigator is mounted in
        // a `YoAppShell` whose `bottom` slot already provides safe-
        // area inset + border. We add a light top divider here so the
        // chrome reads as a separate strip when the stage is short.
        "border-t border-[#E7DFCF] bg-[#F4EFE6]/96 px-4 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-3 backdrop-blur-md"
      : "mt-4 rounded-2xl border border-[#E7DFCF] bg-white/85 p-3",
  );

  return (
    <div
      data-testid="yo-step-navigator"
      data-yo-step-navigator="true"
      data-yo-step-navigator-surface={surfaceId}
      data-yo-step-navigator-variant={variant}
      data-yo-step-navigator-total={String(total)}
      data-yo-step-navigator-current={String(currentIndex)}
      role="region"
      aria-roledescription="paged content"
      aria-label={ariaLabel ?? labels.progressAnnouncement(currentIndex + 1, total)}
      className={rootClasses}
    >
      {/* Stage — mounts every step but only the active one is visible. */}
      <div
        ref={stageRef}
        id={stageId}
        data-testid="yo-step-navigator-stage"
        data-yo-step-navigator-stage="true"
        className={stageClasses}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={onPointerCancel}
      >
        {steps.map((step, idx) => {
          const isActive = idx === currentIndex;
          return (
            <div
              key={step.id}
              ref={isActive ? activeStepRef : undefined}
              data-testid="yo-step-navigator-step"
              data-yo-step-navigator-step={step.id}
              data-yo-step-navigator-step-index={String(idx)}
              data-yo-step-navigator-step-active={isActive ? "true" : "false"}
              aria-hidden={!isActive}
              aria-roledescription="slide"
              aria-label={step.label ?? labels.progressAnnouncement(idx + 1, total)}
              className={cn(
                "w-full min-w-0",
                variant === "standalone" ? "min-h-full" : "",
                isActive ? "block" : "hidden",
              )}
            >
              {step.content}
            </div>
          );
        })}
      </div>

      {companion ? <DeckYoppoCoach locale={locale} screen={{ kind: "practice", title: steps[currentIndex].label ?? ariaLabel ?? labels.progressAnnouncement(currentIndex + 1, total), helperText: steps[currentIndex].companionHint }} /> : null}
      {/* Bottom chrome — explicit Back / dots / Next. */}
      <nav
        data-testid="yo-step-navigator-nav"
        data-yo-step-navigator-nav="true"
        data-no-deck-swipe="true"
        data-no-deck-tap="true"
        aria-label={labels.progressAnnouncement(currentIndex + 1, total)}
        className={navClasses}
      >
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2">
          {/* Back */}
          {atFirst && rootBackHref ? (
            // First step + a root-back-href: render a link so the
            // learner can exit the step navigator and return to the
            // parent route in one tap.
            <Link
              href={rootBackHref}
              data-testid="yo-step-navigator-back-link"
              aria-label={rootBackLabel ?? labels.back}
              className="inline-flex items-center gap-2 rounded-full border border-[#E7DFCF] bg-white/85 px-3 py-2 text-sm font-semibold text-[#172642] transition hover:bg-white"
            >
              <ArrowLeft className="size-4" aria-hidden />
              <span className="hidden sm:inline">{rootBackLabel ?? labels.back}</span>
            </Link>
          ) : (
            <button
              type="button"
              data-testid="yo-step-navigator-back"
              onClick={goPrev}
              disabled={atFirst}
              aria-disabled={atFirst}
              aria-controls={stageId}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border border-[#E7DFCF] bg-white/85 px-3 py-2 text-sm font-semibold text-[#172642] transition",
                atFirst ? "cursor-not-allowed opacity-40" : "hover:bg-white",
              )}
            >
              <ArrowLeft className="size-4" aria-hidden />
              <span className="hidden sm:inline">{labels.prev}</span>
            </button>
          )}

          {/* Dots — clickable to jump to a specific step. */}
          <ol
            data-testid="yo-step-navigator-dots"
            className="flex flex-1 items-center justify-center gap-1.5"
          >
            {steps.map((step, idx) => {
              const isActive = idx === currentIndex;
              const isPast = idx < currentIndex;
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    data-testid="yo-step-navigator-dot"
                    data-yo-step-navigator-dot-id={step.id}
                    data-yo-step-navigator-dot-index={String(idx)}
                    data-yo-step-navigator-dot-active={isActive ? "true" : "false"}
                    onClick={() => goTo(idx)}
                    aria-current={isActive ? "step" : undefined}
                    aria-controls={stageId}
                    aria-label={
                      step.label ?? labels.progressAnnouncement(idx + 1, total)
                    }
                    className={cn(
                      "block h-1.5 rounded-full transition-all hover:opacity-90",
                      isActive
                        ? "w-6 bg-[#0F6E56]"
                        : isPast
                          ? "w-3 bg-[#0F6E56]/70"
                          : "w-3 bg-[#0F6E56]/25",
                    )}
                  />
                </li>
              );
            })}
          </ol>

          {/* Next / Done — on the last step we either navigate
              (lastStepNextHref) or render a disabled "Done"
              indicator. Otherwise we advance the local index. */}
          {atLast && lastStepNextHref ? (
            <Link
              href={lastStepNextHref}
              data-testid="yo-step-navigator-next-link"
              data-yo-step-navigator-next-href={lastStepNextHref}
              aria-label={lastStepNextLabel ?? labels.finish}
              className="inline-flex items-center gap-2 rounded-full bg-[#13A085] px-4 py-2 text-sm font-bold text-white shadow-[0_10px_24px_rgba(19,160,133,0.22)] transition hover:bg-[#16B597]"
            >
              <span>{lastStepNextLabel ?? labels.finish}</span>
              <Check className="size-4" aria-hidden />
            </Link>
          ) : (
            <button
              type="button"
              data-testid="yo-step-navigator-next"
              onClick={goNext}
              disabled={atLast}
              aria-disabled={atLast}
              aria-controls={stageId}
              className={cn(
                "inline-flex items-center gap-2 rounded-full bg-[#13A085] px-4 py-2 text-sm font-bold text-white shadow-[0_10px_24px_rgba(19,160,133,0.22)] transition",
                atLast ? "cursor-not-allowed opacity-60" : "hover:bg-[#16B597]",
              )}
            >
              <span>{nextLabel}</span>
              <NextIcon className="size-4" aria-hidden />
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}

export default YoStepNavigator;
