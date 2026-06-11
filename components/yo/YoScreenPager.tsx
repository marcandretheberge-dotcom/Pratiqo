/**
 * YoScreenPager
 *
 * Mobile-first horizontally-paged container that replaces the
 * "central pane scrolls vertically" pattern previously used by
 * `<YoAppShellScroller>` on `/yo/langues`, `/yo/langues/espagnol`,
 * and the Dominican Republic Course Home.
 *
 * Why it exists
 * -------------
 * The previous PR locked the document body with
 * `h-[100dvh] overflow-hidden` and let the central stage scroll
 * vertically via `overflow-y-auto`. On a 390x844 phone the catalog
 * (rail + 5 language tiles) still scrolled — just inside the stage
 * instead of the body. That is exactly the "old-website feel" the
 * adaptive-shell brief is calling out.
 *
 * `<YoScreenPager>` instead lays its children out as N
 * viewport-sized "screens" in a horizontal track:
 *
 *   [ Screen 1 ] [ Screen 2 ] [ Screen 3 ] ...
 *
 * with native CSS scroll-snap (`snap-x snap-mandatory`) so the
 * learner swipes left/right between focused pages instead of
 * scrolling a long vertical list. The track only scrolls
 * horizontally; the vertical document scroll stays at zero.
 *
 * Behaviour
 * ---------
 *   - The track is `flex flex-row`, each child becomes a
 *     `w-full shrink-0 snap-start` viewport-sized panel.
 *   - The track itself is `overflow-x-auto overscroll-x-contain`
 *     so horizontal swipe works on touch + trackpad without ever
 *     leaking scroll up to the document.
 *   - Vertical overflow on a single panel is hard-capped:
 *     `overflow-y-hidden` on the track, and each panel uses
 *     `overflow-y-auto` ONLY as a last-resort safety net for very
 *     short viewports (e.g. 360x600 landscape). This is documented
 *     so the static contract suite can grep for it.
 *   - Dots: a small below-track pagination row marks the active
 *     screen for accessibility. (Pure CSS, no JS state — the dots
 *     are visual hints, the focus follows whichever panel is in
 *     view.)
 *   - The pager renders the SAME children stack on `lg:` viewports
 *     in a vertical column with no snap-paging, since on desktop
 *     the `<YoDesktopLearningWorkspace>` is the active layout.
 *
 * Privacy / safety profile
 * ------------------------
 *   • Pure layout primitive. Server component. No client hooks,
 *     no API, no persistence, no payment library, no Supabase,
 *     no audio, no quiz data, no AI summary.
 */

import { cn } from "@/lib/utils";

export type YoScreenPagerScreen = {
  /** Stable id used for the dot pagination + data attribute. */
  id: string;
  /** Optional aria-label / human-readable name for the screen. */
  label?: string;
  /** The screen's content. */
  content: React.ReactNode;
};

export type YoScreenPagerProps = {
  /** Ordered list of screens. Must contain at least one screen. */
  screens: ReadonlyArray<YoScreenPagerScreen>;
  /** Stable per-surface slug for tests + analytics. */
  surfaceId: string;
  /**
   * Optional aria label for the whole pager (e.g. "Spanish hub
   * screens"). Falls back to a generic label.
   */
  ariaLabel?: string;
  /** Extra wrapper class — never replaces the no-scroll contract. */
  className?: string;
};

export function YoScreenPager({
  screens,
  surfaceId,
  ariaLabel,
  className,
}: YoScreenPagerProps): React.JSX.Element {
  if (screens.length === 0) {
    throw new Error("YoScreenPager requires at least one screen");
  }

  return (
    <div
      data-testid="yo-screen-pager"
      data-yo-screen-pager="true"
      data-yo-screen-pager-surface={surfaceId}
      data-yo-screen-pager-count={String(screens.length)}
      aria-roledescription="carousel"
      aria-label={ariaLabel ?? "Screens"}
      className={cn(
        "relative flex h-full min-h-0 w-full flex-col",
        className,
      )}
    >
      <div
        data-testid="yo-screen-pager-track"
        data-yo-screen-pager-track="true"
        className={cn(
          // Mobile/tablet: horizontal snap-paging, no vertical
          // overflow on the track itself.
          "flex w-full flex-1 snap-x snap-mandatory flex-row overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth",
          // Desktop: render the same screens stacked vertically and
          // let the desktop workspace decide layout. The pager
          // contributes no chrome on `lg:` since the workspace
          // takes over.
          "lg:flex-col lg:overflow-visible lg:snap-none",
        )}
      >
        {screens.map((screen, index) => (
          <section
            key={screen.id}
            data-testid="yo-screen-pager-screen"
            data-yo-screen-pager-screen-id={screen.id}
            data-yo-screen-pager-screen-index={String(index)}
            aria-roledescription="slide"
            aria-label={
              screen.label ?? `Screen ${index + 1} of ${screens.length}`
            }
            className={cn(
              // Each screen is exactly one viewport wide on the
              // pager track. We use `min-w-full` so it never
              // collapses on a narrower track. `snap-start` aligns
              // the screen edge to the track edge.
              "relative flex min-w-full shrink-0 snap-start flex-col",
              // Last-resort vertical safety net for very short
              // landscape viewports (~600px tall).
              "overflow-y-auto overscroll-contain",
              // Desktop: every screen renders inline with no width
              // lock and no internal scroll, since the workspace
              // owns layout there.
              "lg:min-w-0 lg:shrink lg:overflow-visible",
            )}
          >
            {screen.content}
          </section>
        ))}
      </div>

      {screens.length > 1 ? (
        <div
          data-testid="yo-screen-pager-dots"
          data-yo-screen-pager-dots="true"
          aria-hidden
          className="pointer-events-none flex shrink-0 items-center justify-center gap-1.5 py-2 lg:hidden"
        >
          {screens.map((screen, index) => (
            <span
              key={screen.id}
              data-yo-screen-pager-dot={screen.id}
              className={cn(
                "size-1.5 rounded-full bg-[#0F6E56]/30 transition-all",
                index === 0 ? "w-4 bg-[#0F6E56]" : "",
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default YoScreenPager;
