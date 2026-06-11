/**
 * YoAppShell
 *
 * Viewport-locked root used by every "after-/yo-landing" surface of
 * the YoPratiqo product (`/yo/langues`, the Spanish hub, the country
 * Course Home, etc.). Replaces the previous mix of `min-h-[100dvh]`
 * scrollable pages with one consistent app shell that:
 *
 *   - locks the layout to `h-[100dvh]` (with `100vh` fallback),
 *   - prevents page-level scrolling (`overflow-hidden`),
 *   - exposes three slots — top `header`, central `main`, optional
 *     `bottom` action bar,
 *   - lets each consumer opt the central slot into its own scrolled
 *     pane via the `<YoAppShellScroller>` sub-primitive when the
 *     content must overflow without leaking scroll up to the body.
 *
 * The shell is safe-area aware (`env(safe-area-inset-bottom)`), uses
 * the same warm-cream gradient as the deck so /yo/langues → intro →
 * module path feels continuous, and ships data-attributes for tests.
 *
 * Privacy / safety profile
 * ------------------------
 *   • Pure layout primitive. Server component. No client hooks, no
 *     API, no persistence, no payment library, no Supabase, no
 *     audio, no quiz data, no AI summary.
 */

import { cn } from "@/lib/utils";

export type YoAppShellProps = {
  /** Top-of-viewport slot. Typically `<YoAppHeader />`. */
  header?: React.ReactNode;
  /** Central slot. Should be a flex column that fits the viewport. */
  children: React.ReactNode;
  /** Optional bottom action bar. Stays pinned just above the home indicator. */
  bottom?: React.ReactNode;
  /**
   * Override the background. Defaults to the deck warm-cream gradient
   * so the surface aligns with `/yo/langues/.../intro` and modules.
   */
  background?: string;
  /** Extra wrapper class — never replaces the viewport-lock contract. */
  className?: string;
  /**
   * Stable per-route slug for tests and analytics, e.g.
   * `"langues"`, `"spanish-hub"`, `"rd-course-home"`.
   */
  surfaceId?: string;
};

const DEFAULT_BACKGROUND =
  "bg-[linear-gradient(180deg,#F4EFE6_0%,#FBF7EE_55%,#F4EFE6_100%)]";

export function YoAppShell({
  header,
  children,
  bottom,
  background,
  className,
  surfaceId,
}: YoAppShellProps): React.JSX.Element {
  return (
    <div
      data-testid="yo-app-shell"
      data-yo-app-shell="true"
      data-yo-app-shell-surface={surfaceId}
      className={cn(
        "relative flex h-[100dvh] min-h-[100vh] flex-col overflow-hidden overscroll-contain text-[#172642]",
        background ?? DEFAULT_BACKGROUND,
        className,
      )}
    >
      {header ? (
        <div data-yo-app-shell-header-slot="true" className="shrink-0">
          {header}
        </div>
      ) : null}

      <main
        id="main-content"
        data-yo-app-shell-main="true"
        className="relative flex min-h-0 flex-1 flex-col"
      >
        {children}
      </main>

      {bottom ? (
        <div
          data-yo-app-shell-bottom-slot="true"
          className="shrink-0 border-t border-[#E7DFCF] bg-[#F4EFE6]/96 px-4 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-3 backdrop-blur-md"
        >
          {bottom}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Optional scrolling sub-region for the central `main` slot. Use this
 * when a single screen genuinely needs more content than the viewport
 * allows (e.g. a long catalog tile grid) — the scroll is scoped to
 * the sub-region instead of the document, so the header / bottom slot
 * remain pinned.
 */
export function YoAppShellScroller({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <div
      data-testid="yo-app-shell-scroller"
      data-yo-app-shell-scroller="true"
      className={cn(
        "relative flex-1 overflow-y-auto overscroll-contain",
        className,
      )}
    >
      {children}
    </div>
  );
}

export default YoAppShell;
