/**
 * YoAppBottomBar
 *
 * Pinned bottom action zone used by `<YoAppShell>` (mobile + the
 * smaller desktop viewports where the bottom action zone is still
 * the cleanest place for the primary CTA). Renders inside the
 * `bottom` slot of `<YoAppShell>` so the shell wraps it with the
 * safe-area + border tokens.
 *
 * Behaviour
 * ---------
 *   - Left: optional secondary action (e.g. "Back to languages").
 *   - Right: primary CTA — full-width on mobile, auto-width on sm+.
 *   - Hint: optional one-line context above the primary CTA.
 *   - Hidden on `lg+` by default (the desktop workspace usually
 *     ships its own primary CTA in the centre pane). Override
 *     with `appearance="always"` to keep it on desktop too.
 *
 * Privacy / safety profile
 * ------------------------
 *   • Pure layout primitive. Server component. No client hooks,
 *     no API, no persistence, no payment library, no Supabase,
 *     no audio, no quiz data, no AI summary.
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type YoAppBottomBarProps = {
  /** Primary CTA href. */
  primaryHref: string;
  /** Primary CTA label. */
  primaryLabel: string;
  /** Optional one-line hint above the CTA. */
  hint?: string;
  /** Optional secondary action (rendered as a link). */
  secondary?: { href: string; label: string };
  /** Stable per-surface slug for tests + analytics. */
  surfaceId: string;
  /**
   * Visibility profile:
   *   - "mobile-only"  : hidden on `lg+` (the default; desktop has
   *                      its own in-page CTA in the workspace).
   *   - "always"       : visible on every viewport.
   */
  appearance?: "mobile-only" | "always";
  /** Extra wrapper class. */
  className?: string;
};

export function YoAppBottomBar({
  primaryHref,
  primaryLabel,
  hint,
  secondary,
  surfaceId,
  appearance = "mobile-only",
  className,
}: YoAppBottomBarProps): React.JSX.Element {
  return (
    <div
      data-testid="yo-app-bottom-bar"
      data-yo-app-bottom-bar="true"
      data-yo-app-bottom-bar-surface={surfaceId}
      data-yo-app-bottom-bar-appearance={appearance}
      className={cn(
        "mx-auto flex w-full max-w-3xl flex-col gap-2",
        appearance === "mobile-only" ? "lg:hidden" : "",
        className,
      )}
    >
      {hint ? (
        <p className="text-center text-[11px] font-semibold text-[#0F6E56]/70">
          {hint}
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        {secondary ? (
          <Link
            href={secondary.href}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#E7DFCF] bg-white/80 px-3 py-2 text-xs font-semibold text-[#172642] transition hover:bg-white"
          >
            {secondary.label}
          </Link>
        ) : null}
        <Link
          href={primaryHref}
          data-testid="yo-app-bottom-bar-primary"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#0F6E56] px-4 py-3 text-sm font-bold text-white shadow-[0_8px_22px_rgba(15,110,86,0.25)] transition hover:bg-[#0d5f4a]"
        >
          {primaryLabel}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

export default YoAppBottomBar;
