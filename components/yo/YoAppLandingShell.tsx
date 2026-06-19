/**
 * YoAppLandingShell
 *
 * Mobile-first "premium app onboarding" shell for the public /yo
 * surface. Wraps the hero + value strip inside a narrow centered
 * column so the experience feels like a phone screen even on
 * desktop — instead of the wide marketing layout that /yo had
 * before. Existing marketing sections (pillars, disciplines,
 * companion onboarding, final CTA) continue to render below this
 * shell at their original full widths.
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
  className?: string;
};

export function YoAppLandingShell({
  children,
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
        // descendants can opt-in via a Tailwind arbitrary font-family
        // utility without changing the rest of the page's font stack.
        appDisplayFont.variable,
        appScriptFont.variable,
        className,
      )}
    >
      {/*
        * Narrow app-like column. Mobile-first single column with
        * generous side padding so the layout never overflows or
        * looks "websitey" on a 360px viewport. On md+ the column is
        * intentionally clamped (~520px) so the desktop view keeps
        * the phone-screen rhythm — no giant desktop whitespace,
        * no wide hero. Larger breakpoints get a touch more room
        * (max-w-xl) to accommodate side-by-side cat tiles without
        * forcing wraps.
        */}
      <div
        className={cn(
          "mx-auto flex w-full max-w-[520px] flex-col gap-6 px-5",
          "sm:max-w-[560px] sm:gap-7 sm:px-6",
          "lg:max-w-xl lg:gap-8",
        )}
      >
        {children}
      </div>
    </section>
  );
}

export default YoAppLandingShell;
