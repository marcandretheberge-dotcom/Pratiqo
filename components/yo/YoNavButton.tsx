"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type YoNavButtonVariant = "desktop" | "mobile";

/**
 * YoPratiqo navigation entry.
 *
 * Renders the brand as a single gold word — "YoPratiqo", no space —
 * with no rectangle, no icon block, no subtext, no badge. This is the
 * compact form requested for both the marketing header and the
 * authenticated AppShell, and is the fix for the previous 170 px gold
 * pill that pushed the locale switcher / login link off-screen on
 * narrow mobile viewports.
 *
 * Visual rules baked in here:
 *   - text color  #F4B400 (gold), darkens on hover
 *   - no background, no border, no shadow
 *   - inline-flex shrink-0 + whitespace-nowrap so siblings can't
 *     squash the word, but the natural width (~70 px) is small enough
 *     that it never pushes adjacent items off-screen on a 320 px+
 *     viewport
 *   - focus-visible ring matches Pratiqo's gold accent
 *
 * The link always points to `/yo` (the YoPratiqo hub). It must NOT
 * link directly to a module route such as
 * `/yo/voyage/republique-dominicaine` — the hub drives navigation.
 *
 * Both `desktop` and `mobile` variants render visually identical
 * output. The `variant` prop is kept only for backward compatibility
 * with the existing call sites in `LandingHeader` and `AppShell`.
 */
export function YoNavButton({
  variant,
  className,
}: {
  variant?: YoNavButtonVariant;
  className?: string;
}) {
  void variant; // intentionally unused — kept for call-site compat
  return (
    <Link
      href="/yo"
      aria-label="YoPratiqo"
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded px-1 text-sm font-extrabold tracking-tight text-[#F4B400] transition-colors hover:text-[#dca100] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4B400] focus-visible:ring-offset-2",
        className,
      )}
    >
      YoPratiqo
    </Link>
  );
}
