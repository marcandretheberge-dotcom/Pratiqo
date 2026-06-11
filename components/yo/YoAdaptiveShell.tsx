/**
 * YoAdaptiveShell
 *
 * Single entry-point that picks the right shell sub-tree for the
 * active viewport. Renders BOTH sub-trees and uses CSS
 * (`lg:hidden` / `hidden lg:block`) to show one. This is the
 * canonical way to opt a YoPratiqo "after-/yo-landing" surface
 * into the adaptive contract:
 *
 *   - Mobile / tablet portrait  → `<YoMobileAppShell>` (paged,
 *                                  viewport-locked, swipeable).
 *   - Desktop / large tablet    → `<YoDesktopLearningWorkspace>`
 *                                  (left rail / centre / right rail
 *                                  product workspace).
 *
 * Two distinct sub-trees means:
 *   1. Tests can verify the mobile and desktop DOM differ (i.e.
 *      desktop is not "phone shell stretched").
 *   2. Each shell can mount the affordances best suited to its
 *      viewport (e.g. mobile mounts a compact pill bar; desktop
 *      mounts a wider header with a dropdown selector).
 *
 * Privacy / safety profile
 * ------------------------
 *   • Pure layout composition. Server component. No client hooks,
 *     no API, no persistence, no payment library, no Supabase,
 *     no audio, no quiz data, no AI summary.
 */

import { cn } from "@/lib/utils";
import {
  YoMobileAppShell,
  type YoMobileAppShellProps,
} from "@/components/yo/YoMobileAppShell";
import {
  YoDesktopLearningWorkspace,
  type YoDesktopLearningWorkspaceProps,
} from "@/components/yo/YoDesktopLearningWorkspace";

export type YoAdaptiveShellProps = {
  /** Stable per-surface slug for tests + analytics. */
  surfaceId: string;
  /**
   * Mobile sub-tree options. The mobile header and pager screens
   * are owned by the mobile sub-tree only — they never bleed onto
   * desktop, so each viewport gets the chrome it deserves.
   */
  mobile: Omit<YoMobileAppShellProps, "surfaceId" | "className"> & {
    className?: string;
  };
  /**
   * Desktop sub-tree options. The desktop header / rails / centre
   * are owned by the desktop sub-tree only, so the desktop layout
   * is never just the mobile pager scaled up.
   */
  desktop: Omit<YoDesktopLearningWorkspaceProps, "surfaceId" | "className"> & {
    className?: string;
  };
  /** Extra wrapper class. */
  className?: string;
};

export function YoAdaptiveShell({
  surfaceId,
  mobile,
  desktop,
  className,
}: YoAdaptiveShellProps): React.JSX.Element {
  return (
    <div
      data-testid="yo-adaptive-shell"
      data-yo-adaptive-shell="true"
      data-yo-adaptive-shell-surface={surfaceId}
      className={cn("h-[100dvh] min-h-[100vh]", className)}
    >
      <YoMobileAppShell
        surfaceId={surfaceId}
        {...mobile}
      />
      <YoDesktopLearningWorkspace
        surfaceId={surfaceId}
        {...desktop}
      />
    </div>
  );
}

export default YoAdaptiveShell;
