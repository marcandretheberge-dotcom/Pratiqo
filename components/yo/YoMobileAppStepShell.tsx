/**
 * YoMobileAppStepShell
 *
 * Mobile-only sub-tree of a `<YoAdaptiveStepShell>` (or used
 * directly). Composes the existing `<YoAppShell>` primitive with
 * the new `<YoStepNavigator>` so every "after-/yo-landing"
 * surface on a phone advances step-by-step via explicit
 * Next / Back chrome — never via passive vertical scroll.
 *
 * Replaces `<YoMobileAppShell>` (which paired `<YoAppShell>`
 * with the older `<YoScreenPager>` swipe-only carousel). The
 * difference is purely about input model: the step navigator
 * surfaces explicit buttons + clickable dots in addition to
 * the swipe gesture, which is the "feels like an app" change
 * the learner-facing brief calls for.
 *
 * Behaviour
 * ---------
 *   • Wraps an `<YoAppShell>` (locks `h-[100dvh]
 *     overflow-hidden`, keeps the header in the shrink-0 slot).
 *   • The central pane is a `<YoStepNavigator>` with the
 *     `standalone` variant, so the navigator owns the bottom
 *     chrome (Back / dots / Next) and pins it inside the
 *     `<YoAppShell>` body. The shell's `bottom` slot is
 *     intentionally NOT used here — putting two bottom bars on
 *     a single phone viewport is the kind of compound-chrome
 *     that previously made surfaces feel cramped.
 *   • Hidden on `lg+` so the desktop workspace takes over.
 *
 * Privacy / safety profile
 * ------------------------
 *   • Pure layout composition. Server component. No client
 *     hooks, no API, no persistence, no payment library, no
 *     Supabase, no audio, no quiz data, no AI summary.
 */

import { cn } from "@/lib/utils";
import { YoAppShell } from "@/components/yo/YoAppShell";
import {
  YoStepNavigator,
  type YoStepNavigatorStep,
} from "@/components/yo/YoStepNavigator";
import type { YoLocale } from "@/lib/yo/types";

export type YoMobileAppStepShellProps = {
  /** Header — typically the mobile `<YoAppHeader appearance="mobile" />`. */
  header?: React.ReactNode;
  /** Ordered, non-empty list of mobile steps. */
  steps: ReadonlyArray<YoStepNavigatorStep>;
  /** Locale drives the localized Back / Next / Done labels. */
  locale: YoLocale;
  /** Optional aria-label for the step region. */
  stepsAriaLabel?: string;
  /**
   * Optional Back-link target when the learner is on step 0
   * (e.g. `/yo/langues` for the Spanish hub). When omitted, the
   * Back button is disabled on the first step.
   */
  rootBackHref?: string;
  /** Optional label override for the root Back link. */
  rootBackLabel?: string;
  /**
   * Optional destination for the final step's Next button. When
   * set, "Done" becomes a `<Link>` to this href — the natural
   * exit out of the step shell into the next route (e.g. the
   * Intro deck).
   */
  lastStepNextHref?: string;
  /** Optional label override for the last-step Next link. */
  lastStepNextLabel?: string;
  /**
   * Optional secondary bottom slot (e.g. `<YoAppBottomBar>` with
   * a route-level primary CTA). Rendered BELOW the step
   * navigator's Back/dots/Next chrome inside the
   * `<YoAppShell bottom>` slot. Use sparingly — stacking two
   * bars at the bottom adds ~80 px of chrome the active step
   * has to live above. Prefer surfacing the primary CTA via
   * `lastStepNextHref` when possible.
   */
  bottom?: React.ReactNode;
  /**
   * Override the background. Defaults to the deck warm-cream
   * gradient so the catalog → intro transition stays continuous.
   */
  background?: string;
  /** Stable per-surface slug for tests + analytics. */
  surfaceId: string;
  /** Extra wrapper class — never replaces the no-scroll contract. */
  className?: string;
  companion?: boolean;
};

export function YoMobileAppStepShell({
  header,
  steps,
  locale,
  stepsAriaLabel,
  rootBackHref,
  rootBackLabel,
  lastStepNextHref,
  lastStepNextLabel,
  bottom,
  background,
  surfaceId,
  className,
  companion,
}: YoMobileAppStepShellProps): React.JSX.Element {
  return (
    <div
      data-testid="yo-mobile-app-step-shell"
      data-yo-mobile-app-step-shell="true"
      data-yo-mobile-app-step-shell-surface={surfaceId}
      className={cn("lg:hidden", className)}
    >
      <YoAppShell
        surfaceId={surfaceId}
        background={background}
        header={header}
        bottom={bottom}
      >
        <YoStepNavigator
          surfaceId={surfaceId}
          locale={locale}
          ariaLabel={stepsAriaLabel}
          steps={steps}
          companion={companion}
          variant="standalone"
          rootBackHref={rootBackHref}
          rootBackLabel={rootBackLabel}
          lastStepNextHref={lastStepNextHref}
          lastStepNextLabel={lastStepNextLabel}
        />
      </YoAppShell>
    </div>
  );
}

export default YoMobileAppStepShell;
