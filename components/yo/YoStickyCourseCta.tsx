/**
 * YoStickyCourseCta
 *
 * Mobile-only sticky bottom CTA for the country Course Home. On
 * a small viewport this gives the learner one always-reachable
 * primary action without having to scroll back to the top, which
 * is the single biggest "I'm lost" failure mode in long course
 * pages. Hidden on `sm:` and up where the in-flow hero CTA is
 * always visible above the fold.
 *
 * Safety notes
 * ------------
 *   • `pb-[max(env(safe-area-inset-bottom),0.5rem)]` keeps the
 *     CTA clear of the iOS bottom home indicator.
 *   • `pointer-events-none` on the gradient halo + wrapper so
 *     only the button intercepts taps — the rest of the bar is
 *     visually soft but does not block content beneath it.
 *   • `aria-hidden` on the desktop visibility (`sm:hidden` plus
 *     this attr toggled by CSS) is intentionally omitted — the
 *     element is fully accessible on mobile, and CSS hides it on
 *     desktop where it would be redundant with the in-flow CTA.
 *   • The page shell adds `pb-28` on mobile so the very last
 *     content row is always reachable above the sticky CTA.
 *
 * Privacy / safety profile
 * ------------------------
 *   • Pure server component. No client hooks, no API calls, no
 *     persistence, no payment library, no Supabase write, no
 *     quiz data, no AI summary, no analytics.
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type YoStickyCourseCtaProps = {
  /** Localized CTA label. */
  label: string;
  /** Anchor or absolute route. */
  href: string;
  className?: string;
};

export function YoStickyCourseCta({
  label,
  href,
  className,
}: YoStickyCourseCtaProps): React.JSX.Element {
  return (
    <div
      data-testid="yo-sticky-course-cta"
      data-yo-sticky-cta="true"
      className={cn(
        // Mobile-only fixed bottom bar. `sm:hidden` so desktop
        // never sees it — the in-flow hero CTA is always above
        // the fold on a desktop viewport.
        "pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-4 sm:hidden",
        className,
      )}
    >
      {/* Soft gradient halo so the CTA reads against any
          content scrolled underneath it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-8 h-12 bg-gradient-to-t from-[#F4EFE6] to-transparent"
      />
      <Link
        href={href}
        className="pointer-events-auto relative flex w-full items-center justify-center gap-2 rounded-full bg-[#13A085] px-6 py-4 text-base font-bold text-white shadow-[0_14px_30px_rgba(19,160,133,0.34)] transition hover:bg-[#16B597]"
      >
        {label}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}

export default YoStickyCourseCta;
