/**
 * YoAdaptiveStepShell
 *
 * Single entry-point that picks the right shell for the active
 * viewport. Mirrors `<YoAdaptiveShell>` but uses the new
 * `<YoMobileAppStepShell>` (button-driven step navigator) on
 * mobile instead of the old `<YoMobileAppShell>` (swipe-only
 * scroll-snap pager).
 *
 * This is the canonical way to opt a YoPratiqo "after-/yo-landing"
 * surface into the world-class app shell:
 *
 *   - Mobile / tablet portrait → `<YoMobileAppStepShell>` (explicit
 *     Next/Back chrome, viewport-locked, swipe is secondary).
 *   - Desktop / large tablet → `<YoDesktopLearningWorkspace>`
 *     (left rail / centre / right rail product workspace).
 *
 * Two distinct sub-trees means:
 *   1. Tests can verify the mobile and desktop DOM differ.
 *   2. Each shell mounts the affordances best suited to its
 *      viewport (mobile gets buttons + dots; desktop gets rails).
 *
 * Privacy / safety profile
 * ------------------------
 *   • Pure layout composition. Server component. No client
 *     hooks, no API, no persistence, no payment library, no
 *     Supabase, no audio, no quiz data, no AI summary.
 */

import { cn } from "@/lib/utils";
import {
  YoMobileAppStepShell,
  type YoMobileAppStepShellProps,
} from "@/components/yo/YoMobileAppStepShell";
import {
  YoDesktopLearningWorkspace,
  type YoDesktopLearningWorkspaceProps,
} from "@/components/yo/YoDesktopLearningWorkspace";

export type YoAdaptiveStepShellProps = {
  /** Stable per-surface slug for tests + analytics. */
  surfaceId: string;
  /**
   * Mobile sub-tree options. The mobile header and step
   * navigator are owned by the mobile sub-tree only — they
   * never bleed onto desktop, so each viewport gets the chrome
   * it deserves.
   */
  mobile: Omit<YoMobileAppStepShellProps, "surfaceId" | "className"> & {
    className?: string;
  };
  /**
   * Desktop sub-tree options. The desktop header / rails /
   * centre are owned by the desktop sub-tree only, so the
   * desktop layout is never just the mobile shell scaled up.
   */
  desktop: Omit<YoDesktopLearningWorkspaceProps, "surfaceId" | "className"> & {
    className?: string;
  };
  /** Extra wrapper class. */
  className?: string;
};

export function YoAdaptiveStepShell({
  surfaceId,
  mobile,
  desktop,
  className,
}: YoAdaptiveStepShellProps): React.JSX.Element {
  return (
    <div
      data-testid="yo-adaptive-step-shell"
      data-yo-adaptive-step-shell="true"
      data-yo-adaptive-step-shell-surface={surfaceId}
      // `h-[100dvh]` only — combining `min-h-[100vh]` resolves to
      // `100vh` on iOS Safari while the bottom toolbar is visible.
      // `overflow-x-hidden` clips any leak from a sticky/fixed
      // child that escapes its `overflow-hidden` ancestor (a
      // known Safari stacking-context bug).
      className={cn("h-[100dvh] overflow-x-hidden", className)}
    >
      <YoMobileAppStepShell surfaceId={surfaceId} {...mobile} />
      <YoDesktopLearningWorkspace surfaceId={surfaceId} {...desktop} />
    </div>
  );
}

export default YoAdaptiveStepShell;
