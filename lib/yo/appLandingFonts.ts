/**
 * lib/yo/appLandingFonts.ts
 *
 * Self-hosted Google fonts for the YoPratiqo app-like landing surface
 * (`/yo` hub hero). Co-locating them with the YoPratiqo namespace
 * means Next only bundles the font files for routes that actually
 * import them — the global marketplace pages keep using the local
 * Inter face declared in `app/layout.tsx` and never pay for these.
 *
 * Font choices echo the YoPratiqo prototype theme:
 *   • Newsreader — editorial serif for app-like onboarding headlines.
 *   • Caveat     — warm script accent for the small teal handwritten
 *                  ribbon above / below the headline.
 *
 * Both fonts ship with `display: "swap"` so the page never blocks on
 * font load (no FOIT). The Latin subset covers FR + EN + ES with no
 * extra cost. `next/font/google` self-hosts the files at build time
 * so the browser makes no request to Google.
 */

import { Caveat, Newsreader } from "next/font/google";

export const appDisplayFont = Newsreader({
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--yo-app-display",
});

export const appScriptFont = Caveat({
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "700"],
  variable: "--yo-app-script",
});
