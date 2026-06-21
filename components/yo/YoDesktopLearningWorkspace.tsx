/**
 * YoDesktopLearningWorkspace
 *
 * Desktop-only sub-tree of a `<YoAdaptiveShell>` (or used
 * directly). Composes a natural-scroll desktop wrapper with a real
 * product-software workspace pattern on `lg+`:
 *
 *   ┌──────────────────────── header (desktop) ────────────────────────┐
 *   │ logo · title                                            selector │
 *   ├───────────┬────────────────────────────────────┬─────────────────┤
 *   │ leftRail  │ center (active learning content)   │ rightRail (opt) │
 *   │ identity  │                                    │ progress / path │
 *   │ Yoppo     │                                    │ teacher bridge  │
 *   └───────────┴────────────────────────────────────┴─────────────────┘
 *
 * The desktop workspace is intentionally NOT a phone shell
 * stretched to the laptop width. It uses readable max-widths,
 * lays the learner's current decision in the centre, and lets
 * Yoppo / context / progress live in the rails so the surface
 * feels like a learning product, not a marketing page.
 *
 * Behaviour
 * ---------
 *   - Unlike the mobile shell, this desktop sub-tree does NOT lock
 *     `h-[100dvh] overflow-hidden`. Desktop surfaces (the language
 *     catalogue, the country course home) want the browser to
 *     scroll the page naturally — a viewport lock here is what
 *     produced "trapped in a tiny internal scrollbar" on desktop.
 *     The header sticks to the top of the viewport while the page
 *     scrolls; the rest flows at its natural height.
 *   - The central pane renders the existing
 *     `<YoDesktopAppWorkspace>` three-pane grid.
 *   - Hidden below `lg` so the mobile shell takes over.
 *
 * Privacy / safety profile
 * ------------------------
 *   • Pure layout composition. Server component. No client hooks,
 *     no API, no persistence, no payment library, no Supabase,
 *     no audio, no quiz data, no AI summary.
 */

import { cn } from "@/lib/utils";
import {
  YoDesktopAppWorkspace,
  type YoWorkspaceCenterMaxWidth,
} from "@/components/yo/YoDesktopAppWorkspace";

const DEFAULT_BACKGROUND =
  "bg-[linear-gradient(180deg,#F4EFE6_0%,#FBF7EE_55%,#F4EFE6_100%)]";

export type YoDesktopLearningWorkspaceProps = {
  /** Desktop header. Typically a `<YoAppHeader>` with `appearance="desktop"`. */
  header?: React.ReactNode;
  /** Left rail — Yoppo / identity / promise. Optional. */
  leftRail?: React.ReactNode;
  /** Center pane — current decision / action / map. Required. */
  center: React.ReactNode;
  /** Right rail — progress / next-up / teacher bridge. Optional. */
  rightRail?: React.ReactNode;
  /** Optional bottom action bar. Pinned above the desktop footer. */
  bottom?: React.ReactNode;
  /**
   * Override the background. Defaults to the deck warm-cream
   * gradient so the desktop workspace blends with the deck.
   */
  background?: string;
  /** Stable per-surface slug for tests + analytics. */
  surfaceId: string;
  /**
   * Maximum width for the centre pane content. Defaults to `"2xl"`
   * (Phase 3 polish target). Grid-heavy surfaces should pass
   * `"4xl"` or `"none"`.
   */
  centerMaxWidth?: YoWorkspaceCenterMaxWidth;
  /** Extra wrapper class — never replaces the workspace contract. */
  className?: string;
};

export function YoDesktopLearningWorkspace({
  header,
  leftRail,
  center,
  rightRail,
  bottom,
  background,
  surfaceId,
  centerMaxWidth,
  className,
}: YoDesktopLearningWorkspaceProps): React.JSX.Element {
  return (
    <div
      data-testid="yo-desktop-learning-workspace"
      data-yo-desktop-learning-workspace="true"
      data-yo-desktop-learning-workspace-surface={surfaceId}
      data-yo-desktop-learning-workspace-has-left={leftRail ? "true" : "false"}
      data-yo-desktop-learning-workspace-has-right={
        rightRail ? "true" : "false"
      }
      className={cn("hidden lg:block", className)}
    >
      <div
        className={cn(
          "relative flex min-h-[100dvh] flex-col text-[#172642]",
          background ?? DEFAULT_BACKGROUND,
        )}
      >
        {header ? (
          <div data-yo-app-shell-header-slot="true" className="sticky top-0 z-40">
            {header}
          </div>
        ) : null}

        <main
          data-yo-app-shell-main="true"
          className="relative flex flex-1 flex-col"
        >
          <YoDesktopAppWorkspace
            surfaceId={surfaceId}
            leftRail={leftRail}
            center={center}
            rightRail={rightRail}
            centerMaxWidth={centerMaxWidth}
          />
        </main>

        {bottom ? (
          <div
            data-yo-app-shell-bottom-slot="true"
            className="sticky bottom-0 z-30 border-t border-[#E7DFCF] bg-[#F4EFE6]/96 px-4 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-3 backdrop-blur-md"
          >
            {bottom}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default YoDesktopLearningWorkspace;
