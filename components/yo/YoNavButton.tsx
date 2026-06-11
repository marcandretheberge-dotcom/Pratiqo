"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";

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
 * Destination policy
 * ------------------
 *   • Anonymous / not-yet-logged-in visitor → `/yo` (the public
 *     YoPratiqo product hub).
 *   • Authenticated student → `/student/yopratiqo` (the authenticated
 *     YoPratiqo hub) so logged-in learners land directly on their
 *     companion + course path instead of being kicked back to the
 *     marketing surface. Teachers + admins continue to route to `/yo`
 *     because the authenticated hub is student-only.
 *
 * This is intentionally the only routing branch in the component —
 * everything else (label, color, layout) is identical across all
 * call sites and viewports. The `variant` prop is kept purely for
 * backward compatibility with `LandingHeader` and `AppShell`.
 *
 * The brand label is ALWAYS the full word "YoPratiqo". We never
 * render "Yo" alone — see `tests/yo/yopratiqoProductShellConsistency`
 * for the assertion that locks this in.
 */
export function YoNavButton({
  variant,
  className,
}: {
  variant?: YoNavButtonVariant;
  className?: string;
}) {
  void variant; // intentionally unused — kept for call-site compat
  const { user, profile, loading } = useAuth();
  const isStudent =
    !loading && Boolean(user) && (profile?.role as string | undefined) === "student";
  // Authenticated students get the in-product YoPratiqo hub. Everyone
  // else (anonymous, teacher, admin, or while auth is still resolving)
  // keeps the public `/yo` landing as the safe default.
  const href = isStudent ? "/student/yopratiqo" : "/yo";
  return (
    <Link
      href={href}
      aria-label="YoPratiqo"
      data-testid="yo-nav-button"
      data-yo-nav-authenticated={isStudent ? "true" : "false"}
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded px-1 text-sm font-extrabold tracking-tight text-[#F4B400] transition-colors hover:text-[#dca100] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4B400] focus-visible:ring-offset-2",
        className,
      )}
    >
      YoPratiqo
    </Link>
  );
}
