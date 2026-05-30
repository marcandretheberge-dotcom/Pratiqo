/**
 * YoLanguageBadge — inline-SVG flag swatch for the YoPratiqo language hub.
 *
 * Why inline SVG (and not <img src="...">):
 *
 *   The previous iteration shipped real SVG files under
 *   `public/images/yo/flags/` and rendered them with a plain
 *   <img>. In production the asset paths failed to resolve on
 *   /yo/langues, so users saw broken-image icons instead of flags.
 *   Inline SVG side-steps the asset pipeline entirely:
 *
 *     - no broken paths possible
 *     - no asset prefix / CDN routing concerns
 *     - no Next.js image-loader configuration to keep in sync
 *     - the markup is part of the page HTML, so it renders the
 *       moment the badge appears
 *
 *   For four small flags (≤ a few hundred bytes of markup each)
 *   the bundle cost is negligible.
 *
 * Why a dedicated component (history):
 *
 *   We tried two earlier approaches and both looked broken:
 *
 *     1. Unicode regional-indicator emoji pairs (the U+1F1E6..U+1F1FF
 *        codepoints for ES / FR / GB / JP). Windows desktop browsers
 *        ship no color flag glyphs, so they degrade to bare ISO
 *        codes ("ES" / "FR" / "GB" / "JP") and look like a bug.
 *     2. CSS-painted "fake" flags via stacked linear/radial
 *        gradients. At badge size the result reads as graphic
 *        noise, not as a flag.
 *
 * Accessibility:
 *
 *   The inline <svg> is decorative (`aria-hidden`) so screen
 *   readers do not read the country name twice. The rounded
 *   wrapper carries `role="img"` + `aria-label={ariaLabel}` so
 *   SR users hear the localized language name (e.g. "Espagnol" /
 *   "Spanish") instead of the bare two-letter code.
 */

import type { ReactElement } from "react";
import { cn } from "@/lib/utils";

/**
 * Closed union of language IDs the YoPratiqo language hub knows
 * about today. Adding a new entry requires picking inline SVG
 * markup in `LANGUAGE_FLAGS` below — there are no external assets
 * to ship.
 */
export type YoLanguageBadgeId = "es" | "fr-ca" | "en" | "ja";

export interface YoLanguageBadgeProps {
  /** Which language flag to render. */
  language: YoLanguageBadgeId;
  /**
   * Localized full language name used as the rendered ARIA label
   * (e.g. "Espagnol" / "Spanish"). The inline <svg> itself is
   * `aria-hidden` so SR users hear the human name, not the slug.
   */
  ariaLabel: string;
  /** Visual size; matches the existing card density. */
  size?: "sm" | "md";
  className?: string;
}

/**
 * Common SVG attributes — every flag is authored against a uniform
 * 60×40 viewBox so they line up on the same baseline regardless of
 * each flag's official aspect ratio. `preserveAspectRatio` set to
 * `xMidYMid slice` makes the SVG behave like CSS `object-cover`
 * (fills the rounded rectangle, crops the edges if necessary).
 */
const FLAG_SVG_PROPS = {
  viewBox: "0 0 60 40",
  preserveAspectRatio: "xMidYMid slice",
  xmlns: "http://www.w3.org/2000/svg",
  "aria-hidden": true,
  focusable: false,
  className: "absolute inset-0 h-full w-full",
} as const;

/**
 * Spain — rojigualda. Red / yellow / red horizontal stripes,
 * 1:2:1 ratio. Coat of arms intentionally omitted for readability
 * at badge size.
 */
function FlagSpain(): ReactElement {
  return (
    <svg {...FLAG_SVG_PROPS}>
      <rect width="60" height="40" fill="#AA151B" />
      <rect y="10" width="60" height="20" fill="#F1BF00" />
    </svg>
  );
}

/**
 * Quebec — fleurdelisé. Blue field, white cross, four white
 * fleurs-de-lis (one per quadrant, all pointing up). Geometry is
 * simplified for a 60×40 badge: cross thickness is 4 units and the
 * fleur-de-lis is a single compact path so it reads at h-10 sizes
 * without going muddy.
 *
 * The launch scope of the French parcours is francisation /
 * Québec / Canadian French, so the `fr-ca` badge id maps to the
 * Québec flag (not the French tricolore).
 */
function FlagQuebec(): ReactElement {
  const fleur = (
    <path
      fill="#FFFFFF"
      d="M0 -8 C -2 -5 -2 -2 -0.6 -0.6 C -3 -1.4 -6 -0.4 -6 1.6 C -6 3.4 -4 4.4 -1.4 3.4 L -1.4 5 L -5 5 L -5 6.4 L 5 6.4 L 5 5 L 1.4 5 L 1.4 3.4 C 4 4.4 6 3.4 6 1.6 C 6 -0.4 3 -1.4 0.6 -0.6 C 2 -2 2 -5 0 -8 Z M -3 7 H 3 L 0 9.4 Z"
    />
  );
  return (
    <svg {...FLAG_SVG_PROPS}>
      <rect width="60" height="40" fill="#003DA5" />
      <path d="M28 0 H32 V40 H28 Z M0 18 H60 V22 H0 Z" fill="#FFFFFF" />
      <g transform="translate(14 9) scale(0.7)">{fleur}</g>
      <g transform="translate(46 9) scale(0.7)">{fleur}</g>
      <g transform="translate(14 31) scale(0.7)">{fleur}</g>
      <g transform="translate(46 31) scale(0.7)">{fleur}</g>
    </svg>
  );
}

/**
 * United Kingdom — simplified Union Jack. We render at 3:2 (not the
 * canonical 2:1) so the badge sits flush with the other YoPratiqo
 * language flags, and the St Patrick counter-change is centred
 * rather than offset because the offset reads as a glitch at
 * badge size. This is a UI asset, not a heraldic reference.
 */
function FlagUnitedKingdom(): ReactElement {
  return (
    <svg {...FLAG_SVG_PROPS}>
      <clipPath id="yoflag-uk-clip">
        <rect width="60" height="40" />
      </clipPath>
      <g clipPath="url(#yoflag-uk-clip)">
        <rect width="60" height="40" fill="#012169" />
        <path d="M0 0 L60 40 M60 0 L0 40" stroke="#FFFFFF" strokeWidth="8" />
        <path d="M0 0 L60 40 M60 0 L0 40" stroke="#C8102E" strokeWidth="2.6" />
        <path d="M30 0 V40 M0 20 H60" stroke="#FFFFFF" strokeWidth="10" />
        <path d="M30 0 V40 M0 20 H60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
}

/**
 * Japan — Hi no Maru. White field with a centred red disc; disc
 * diameter is 3/5 of the flag height (canonical proportion).
 */
function FlagJapan(): ReactElement {
  return (
    <svg {...FLAG_SVG_PROPS}>
      <rect width="60" height="40" fill="#FFFFFF" />
      <circle cx="30" cy="20" r="12" fill="#BC002D" />
    </svg>
  );
}

/**
 * Maps each badge id to its inline-SVG renderer. Adding a new
 * entry requires registering a sibling Flag* component and listing
 * it here — no asset shipping required.
 */
const LANGUAGE_FLAGS: Record<YoLanguageBadgeId, () => ReactElement> = {
  es: FlagSpain,
  "fr-ca": FlagQuebec,
  en: FlagUnitedKingdom,
  ja: FlagJapan,
};

/**
 * Badge container sizes. Width × height is fixed so every flag in
 * the language grid lines up on the same baseline regardless of
 * the underlying flag's official aspect ratio.
 */
const SIZE_STYLES = {
  sm: {
    container: "h-8 w-11 rounded-md",
  },
  md: {
    container: "h-10 w-[3.75rem] rounded-lg",
  },
} as const;

export function YoLanguageBadge({
  language,
  ariaLabel,
  size = "md",
  className,
}: YoLanguageBadgeProps) {
  const Flag = LANGUAGE_FLAGS[language];
  const sizing = SIZE_STYLES[size];

  return (
    <span
      role="img"
      aria-label={ariaLabel}
      data-yo-language-badge={language}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-white ring-1 ring-black/10 shadow-[0_1px_2px_rgba(15,58,52,0.10)]",
        sizing.container,
        className,
      )}
    >
      <Flag />
    </span>
  );
}
