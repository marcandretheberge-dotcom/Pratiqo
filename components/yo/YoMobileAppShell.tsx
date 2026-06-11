/**
 * YoMobileAppShell
 *
 * Mobile-only sub-tree of a `<YoAdaptiveShell>` (or used directly).
 * Composes the existing `<YoAppShell>` primitive with a built-in
 * `<YoScreenPager>` so every "after-/yo-landing" surface on a phone
 * lays its content out as N focused screens instead of a single
 * vertically scrolled column.
 *
 * Behaviour
 * ---------
 *   - Wraps an `<YoAppShell>` (locks `h-[100dvh] overflow-hidden`,
 *     keeps the header in the shrink-0 slot, exposes an optional
 *     bottom action zone).
 *   - The central pane is a `<YoScreenPager>` track of N pages
 *     (1 page if no overflow is needed, 2-3 pages otherwise) so
 *     the body never vertically scrolls.
 *   - Hidden on `lg+` so the desktop workspace takes over.
 *
 * Privacy / safety profile
 * ------------------------
 *   • Pure layout composition. Server component. No client hooks,
 *     no API, no persistence, no payment library, no Supabase,
 *     no audio, no quiz data, no AI summary.
 */

import { cn } from "@/lib/utils";
import { YoAppShell } from "@/components/yo/YoAppShell";
import {
  YoScreenPager,
  type YoScreenPagerScreen,
} from "@/components/yo/YoScreenPager";

export type YoMobileAppShellProps = {
  /** Header — typically the mobile `<YoAppHeader>`. */
  header?: React.ReactNode;
  /**
   * Ordered list of focused screens. Each screen fits one viewport
   * via the embedded `<YoScreenPager>`. Pass a single screen when
   * the surface genuinely fits on a phone (e.g. an empty state).
   */
  screens: ReadonlyArray<YoScreenPagerScreen>;
  /** Optional bottom action bar. Pinned above the home indicator. */
  bottom?: React.ReactNode;
  /** Optional pager aria-label, e.g. "Choose your language". */
  pagerAriaLabel?: string;
  /**
   * Override the background. Defaults to the deck warm-cream
   * gradient so the catalog → intro transition stays continuous.
   */
  background?: string;
  /** Stable per-surface slug for tests + analytics. */
  surfaceId: string;
  /** Extra wrapper class — never replaces the no-scroll contract. */
  className?: string;
};

export function YoMobileAppShell({
  header,
  screens,
  bottom,
  pagerAriaLabel,
  background,
  surfaceId,
  className,
}: YoMobileAppShellProps): React.JSX.Element {
  return (
    <div
      data-testid="yo-mobile-app-shell"
      data-yo-mobile-app-shell="true"
      data-yo-mobile-app-shell-surface={surfaceId}
      className={cn("lg:hidden", className)}
    >
      <YoAppShell
        surfaceId={surfaceId}
        background={background}
        header={header}
        bottom={bottom}
      >
        <YoScreenPager
          surfaceId={surfaceId}
          ariaLabel={pagerAriaLabel}
          screens={screens}
        />
      </YoAppShell>
    </div>
  );
}

export default YoMobileAppShell;
