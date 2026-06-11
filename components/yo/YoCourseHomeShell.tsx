/**
 * YoCourseHomeShell
 *
 * Page wrapper for the new app-like "Course Home" surface used by
 * country-level YoPratiqo course pages (currently only the
 * Dominican Republic A1 page, but reusable for future country
 * courses). Mirrors the warm-cream / serif / script palette of
 * the /yo landing shell so the boundary between hub and course
 * home feels continuous to the learner.
 *
 * Composition
 * -----------
 *   <YoCourseHomeShell header={…}>
 *     <YoCourseHero …/>
 *     <YoCoursePath …/>
 *     <YoCourseCompanionPanel …/>
 *     … any extra sections …
 *   </YoCourseHomeShell>
 *
 * The optional `header` slot is rendered as a sticky top bar
 * outside the narrow column so the back arrow can hug the
 * viewport edge on mobile while the content stays in the
 * phone-screen rhythm below.
 *
 * Style tokens (same as /yo landing)
 * ----------------------------------
 *   bg:           #F4EFE6   warm cream
 *   surface:      #FFFFFF
 *   ink (navy):   #172642
 *   ink-soft:     #566073
 *   line:         #E7DFCF
 *   primary teal: #13A085
 *
 * Privacy / safety profile
 * ------------------------
 *   • Pure layout primitive. No client hooks, no API calls,
 *     no persistence, no payment library, no Supabase write,
 *     no audio generation, no quiz data, no AI summary.
 */

import { cn } from "@/lib/utils";
import {
  appDisplayFont,
  appScriptFont,
} from "@/lib/yo/appLandingFonts";

export type YoCourseHomeShellProps = {
  header?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function YoCourseHomeShell({
  header,
  children,
  className,
}: YoCourseHomeShellProps): React.JSX.Element {
  return (
    <div
      data-testid="yo-course-home-shell"
      data-yo-course-shell="true"
      className={cn(
        "relative w-full bg-[#F4EFE6] text-[#172642]",
        appDisplayFont.variable,
        appScriptFont.variable,
        className,
      )}
    >
      {header}
      <div
        className={cn(
          // Narrow app-like column. Mobile-first at 520px, opens
          // slightly on sm+ for the 5-card course path, and is
          // capped at max-w-3xl on lg so a 27" monitor never gets
          // the "wide website" look.
          "mx-auto flex w-full max-w-[520px] flex-col gap-6 px-5 pt-6",
          "sm:max-w-[600px] sm:gap-7 sm:px-6",
          "lg:max-w-2xl lg:gap-8",
          // Extra bottom padding leaves room for the mobile sticky
          // CTA bar (rendered separately) so the last content of
          // the page is always reachable above it.
          "pb-28 sm:pb-12",
        )}
      >
        {children}
      </div>
    </div>
  );
}

export default YoCourseHomeShell;
