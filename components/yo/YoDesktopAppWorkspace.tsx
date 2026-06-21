/**
 * YoDesktopAppWorkspace
 *
 * Optional layout helper that turns the central slot of a
 * `<YoAppShell />` into an app-workspace pattern on `lg:` viewports:
 *
 *   Mobile  : single column. `left` and `right` rails render stacked
 *             above and below the center content respectively, and
 *             can be set to `null` / undefined to be hidden.
 *   Desktop : three-pane grid — left rail / center / optional right
 *             rail — with the center pane sized to a readable
 *             max-width. Panes size to their natural content height
 *             and the page scrolls once; no pane scopes its own
 *             independent scroll region (that produced "left/center/
 *             right each scroll independently" on desktop).
 *
 * The helper does NOT introduce a new design system; it just lays out
 * existing primitives (e.g. catalog tiles, hero / path / companion)
 * in an app-shaped grid so desktop YoPratiqo screens stop feeling
 * like stretched mobile.
 *
 * Privacy / safety profile
 * ------------------------
 *   • Pure layout primitive. Server component. No client hooks, no
 *     API, no persistence, no payment library, no Supabase, no
 *     audio, no quiz data.
 */

import { cn } from "@/lib/utils";

/**
 * Center-pane max-width tokens.
 *
 * `"2xl"` (default) caps the center pane at `max-w-2xl` (672px),
 * which is the Phase 3 polish target for reading comfort on
 * 1440px/1920px monitors. Past ~700px of unbroken prose readers
 * have to swing their eyes too far between the start and end of
 * each line, so even a 1920px-wide laptop benefits from a hard
 * cap on the centre column.
 *
 * Tile-grid layouts (e.g. the /yo/langues catalog) need more
 * width to breathe in their `xl:grid-cols-3` configuration, so
 * they can opt out via `"4xl"` or `"none"`.
 */
export type YoWorkspaceCenterMaxWidth = "2xl" | "3xl" | "4xl" | "none";

const CENTER_MAX_WIDTH_CLASS: Record<YoWorkspaceCenterMaxWidth, string> = {
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  none: "",
};

export type YoDesktopAppWorkspaceProps = {
  /** Left rail — context / Yoppo / promise card. Optional. */
  leftRail?: React.ReactNode;
  /** Center pane — current decision / action. Required. */
  center: React.ReactNode;
  /** Right rail — path / next-up. Optional. */
  rightRail?: React.ReactNode;
  /** Stable per-route slug for tests. */
  surfaceId?: string;
  /**
   * Maximum width for the centre pane content. Defaults to `"2xl"`
   * for prose-style learning content (the Phase 3 polish target).
   * Grid-heavy surfaces (catalog tiles, deck grids) should pass
   * `"4xl"` or `"none"`.
   */
  centerMaxWidth?: YoWorkspaceCenterMaxWidth;
  className?: string;
};

export function YoDesktopAppWorkspace({
  leftRail,
  center,
  rightRail,
  surfaceId,
  centerMaxWidth = "2xl",
  className,
}: YoDesktopAppWorkspaceProps): React.JSX.Element {
  const hasLeft = Boolean(leftRail);
  const hasRight = Boolean(rightRail);
  const centerCapClass = CENTER_MAX_WIDTH_CLASS[centerMaxWidth];

  // CSS `grid-template-columns` track lists are space-separated. Commas
  // are only valid inside `minmax(...)`. The previous `_,_` form silently
  // produced an invalid declaration that every browser dropped, so the
  // workspace fell back to `grid-cols-1` (a stretched mobile column).
  // Using underscores (Tailwind's escape for the space character inside
  // arbitrary values) restores the intended 3-pane workspace.
  const gridCols =
    hasLeft && hasRight
      ? "lg:grid-cols-[280px_minmax(0,1fr)_300px]"
      : hasLeft
        ? "lg:grid-cols-[300px_minmax(0,1fr)]"
        : hasRight
          ? "lg:grid-cols-[minmax(0,1fr)_320px]"
          : "lg:grid-cols-1";

  return (
    <div
      data-testid="yo-desktop-app-workspace"
      data-yo-desktop-workspace="true"
      data-yo-desktop-workspace-surface={surfaceId}
      data-yo-desktop-workspace-has-left={hasLeft ? "true" : "false"}
      data-yo-desktop-workspace-has-right={hasRight ? "true" : "false"}
      className={cn(
        "mx-auto grid w-full max-w-6xl grid-cols-1 items-start gap-4 px-3 py-4 sm:gap-5 sm:px-6 sm:py-5 lg:gap-6",
        gridCols,
        className,
      )}
    >
      {hasLeft ? (
        <aside
          data-testid="yo-desktop-workspace-left"
          data-yo-desktop-workspace-rail="left"
          className="flex flex-col gap-4 lg:gap-5"
        >
          {leftRail}
        </aside>
      ) : null}

      <section
        data-testid="yo-desktop-workspace-center"
        data-yo-desktop-workspace-pane="center"
        data-yo-desktop-workspace-center-max-w={centerMaxWidth}
        className="flex flex-col gap-4 lg:gap-5"
      >
        <div
          data-yo-desktop-workspace-center-inner="true"
          className={cn(
            "mx-auto flex w-full flex-col gap-4 lg:gap-5",
            centerCapClass,
          )}
        >
          {center}
        </div>
      </section>

      {hasRight ? (
        <aside
          data-testid="yo-desktop-workspace-right"
          data-yo-desktop-workspace-rail="right"
          className="hidden flex-col gap-4 lg:flex lg:gap-5"
        >
          {rightRail}
        </aside>
      ) : null}
    </div>
  );
}

export default YoDesktopAppWorkspace;
