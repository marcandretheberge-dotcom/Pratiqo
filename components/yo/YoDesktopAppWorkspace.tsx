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
 *             max-width and overflow scoped inside each pane.
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

export type YoDesktopAppWorkspaceProps = {
  /** Left rail — context / Yoppo / promise card. Optional. */
  leftRail?: React.ReactNode;
  /** Center pane — current decision / action. Required. */
  center: React.ReactNode;
  /** Right rail — path / next-up. Optional. */
  rightRail?: React.ReactNode;
  /** Stable per-route slug for tests. */
  surfaceId?: string;
  className?: string;
};

export function YoDesktopAppWorkspace({
  leftRail,
  center,
  rightRail,
  surfaceId,
  className,
}: YoDesktopAppWorkspaceProps): React.JSX.Element {
  const hasLeft = Boolean(leftRail);
  const hasRight = Boolean(rightRail);

  const gridCols =
    hasLeft && hasRight
      ? "lg:grid-cols-[280px,minmax(0,1fr),300px]"
      : hasLeft
        ? "lg:grid-cols-[300px,minmax(0,1fr)]"
        : hasRight
          ? "lg:grid-cols-[minmax(0,1fr),320px]"
          : "lg:grid-cols-1";

  return (
    <div
      data-testid="yo-desktop-app-workspace"
      data-yo-desktop-workspace="true"
      data-yo-desktop-workspace-surface={surfaceId}
      data-yo-desktop-workspace-has-left={hasLeft ? "true" : "false"}
      data-yo-desktop-workspace-has-right={hasRight ? "true" : "false"}
      className={cn(
        "mx-auto grid h-full w-full max-w-6xl grid-cols-1 gap-4 px-3 py-4 sm:gap-5 sm:px-6 sm:py-5 lg:gap-6",
        gridCols,
        className,
      )}
    >
      {hasLeft ? (
        <aside
          data-testid="yo-desktop-workspace-left"
          data-yo-desktop-workspace-rail="left"
          className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1 lg:gap-5"
        >
          {leftRail}
        </aside>
      ) : null}

      <section
        data-testid="yo-desktop-workspace-center"
        data-yo-desktop-workspace-pane="center"
        className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1 lg:gap-5"
      >
        {center}
      </section>

      {hasRight ? (
        <aside
          data-testid="yo-desktop-workspace-right"
          data-yo-desktop-workspace-rail="right"
          className="hidden min-h-0 flex-col gap-4 overflow-y-auto pr-1 lg:flex lg:gap-5"
        >
          {rightRail}
        </aside>
      ) : null}
    </div>
  );
}

export default YoDesktopAppWorkspace;
