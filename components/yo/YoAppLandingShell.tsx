/**
 * YoAppLandingShell
 *
 * Mobile-first "premium app onboarding" shell for the public /yo
 * surface. Below `lg`, wraps the hero + value strip inside a
 * narrow centered column so the experience feels like a phone
 * screen. At `lg+`, becomes a real desktop hero band: the hero +
 * value strip sit in a left column and the optional `visual` slot
 * (e.g. the featured course preview) sits in a right column, inside
 * a `max-w-6xl` band — instead of the old narrow phone column
 * stretched onto a wide monitor. Existing marketing sections
 * (pillars, disciplines, companion onboarding, final CTA) continue
 * to render below this shell at their original full widths.
 *
 * Design tokens (echoed from the prototype theme — see
 *  `pratiqo-theme.jsx` warm-cream look in the prototype zip):
 *
 *   ┌────────────────┬──────────────────────────────────────────┐
 *   │ token          │ value                                    │
 *   ├────────────────┼──────────────────────────────────────────┤
 *   │ bg             │ #F4EFE6  warm cream page background      │
 *   │ surface        │ #FFFFFF  hero card + tiles               │
 *   │ surface-soft   │ #FBF7EE  pillars / chips                 │
 *   │ ink (navy)     │ #172642  primary text + brush quote bg   │
 *   │ ink-soft       │ #566073  body / captions                 │
 *   │ line           │ #E7DFCF  hairline borders                │
 *   │ primary (teal) │ #13A085  CTA, script accent              │
 *   │ tint           │ #E3F1EB  teal-tinted chips               │
 *   │ sand           │ #EFE7D6  soft secondary bg               │
 *   └────────────────┴──────────────────────────────────────────┘
 *
 * The shell is a pure layout primitive — no business logic, no
 * client state, no API calls. Safe to render in any server tree.
 */

import { cn } from "@/lib/utils";
import {
  appDisplayFont,
  appScriptFont,
} from "@/lib/yo/appLandingFonts";

export type YoAppLandingShellProps = {
  children: React.ReactNode;
  /**
   * Optional right-column visual on `lg+` (e.g. the featured course
   * preview card). Renders stacked below `children` on mobile/tablet
   * since the layout is a single column below `lg`.
   */
  visual?: React.ReactNode;
  className?: string;
};

export function YoAppLandingShell({
  children,
  visual,
  className,
}: YoAppLandingShellProps): React.JSX.Element {
  return (
    <section
      data-testid="yo-app-landing-shell"
      data-yo-app-shell="true"
      className={cn(
        // Warm cream page background lives on the section itself so
        // the shell doesn't depend on a global body color. Existing
        // marketing sections below sit on their own backgrounds.
        "relative w-full bg-[#F4EFE6] py-8 sm:py-12",
        // Expose the two app-like font families as CSS variables so
        // descendants can opt-in via Tailwind arbitrary font utilities
        // bound to these variables, without changing the rest of the
        // page's font stack.
        appDisplayFont.variable,
        appScriptFont.variable,
        className,
      )}
    >
      {/*
        * Mobile/tablet: narrow single column with generous side
        * padding so the layout never overflows or looks "websitey"
        * on a 360px viewport. Desktop (`lg+`): a real two-column
        * hero band — hero + value strip on the left, the optional
        * `visual` slot on the right — inside a `max-w-6xl` band so
        * the page uses the available width instead of forcing the
        * phone-screen rhythm onto a wide monitor.
        */}
      <div
        className={cn(
          "mx-auto flex w-full max-w-[520px] flex-col gap-6 px-5",
          "sm:max-w-[560px] sm:gap-7 sm:px-6",
          "lg:max-w-6xl lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-12 lg:px-8",
        )}
      >
        <div className="flex flex-col gap-6 sm:gap-7 lg:gap-8">
          {children}
        </div>
        {visual ? <div className="lg:pt-2">{visual}</div> : null}
      </div>
    </section>
  );
}

export default YoAppLandingShell;
