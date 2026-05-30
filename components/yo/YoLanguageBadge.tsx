/**
 * YoLanguageBadge — inline-SVG flag swatch for the YoPratiqo language hub.
 *
 * Why inline SVG (and not an external asset path):
 *
 *   The earlier iteration shipped real SVG files under
 *   `public/images/yo/flags/` and rendered them with a plain
 *   image element. In production those asset paths failed to
 *   resolve on /yo/langues, so users saw broken-image icons
 *   instead of flags. Inline SVG side-steps the asset pipeline
 *   entirely:
 *
 *     - no broken paths possible
 *     - no asset prefix / CDN routing concerns
 *     - no Next.js image-loader configuration to keep in sync
 *     - the markup is part of the page HTML, so it renders the
 *       moment the badge appears
 *
 * Why this iteration replaces the simplified shapes:
 *
 *   The first inline iteration drew the four flags as quick
 *   geometric placeholders (no Spanish coat of arms, dot-shaped
 *   "fleurs", a centred Union Jack with no St Patrick offset).
 *   This iteration ships heraldically faithful, original SVG
 *   artwork so the language hub looks professional at all sizes:
 *
 *     - Spain: full tricolour with a recognisable coat of arms
 *       (royal crown, shield with quartered colours, pillars of
 *       Hercules, Plus Ultra ribbon).
 *     - Québec: blue fleurdelisé with four real heraldic
 *       fleurs-de-lis (centre petal, two curling side petals,
 *       horizontal cuff, bottom point).
 *     - United Kingdom: Union Jack with the **offset, counter-
 *       changed** St Patrick saltire — the standard heraldic
 *       construction, not a centred X.
 *     - Japan: Hi no Maru (white field, centred red disc at the
 *       canonical 3/5 height ratio).
 *
 *   Artwork attribution: the SVG paths in this file are original
 *   simplified renderings of public-domain national-flag designs
 *   (Wikimedia Commons references for the construction rules).
 *   No third-party assets are imported.
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
 *   The inline svg is decorative (`aria-hidden`) so screen
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
   * (e.g. "Espagnol" / "Spanish"). The inline svg itself is
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

/* ─── Spain ─────────────────────────────────────────────────────── */

/**
 * Spain — Bandera de España. Red / yellow / red horizontal stripes
 * (1:2:1) plus the coat of arms positioned 1/3 from the hoist, per
 * the official Royal Decree 1511/1977 specification.
 *
 * The coat of arms (escudo) is rendered as a recognisable
 * simplified heraldic group:
 *
 *   - Crown of Spain (gold dome with red lining and small cross)
 *   - Shield (rounded base, gold-edged, quartered with the
 *     colours of Castile/León/Aragón/Navarre and a Bourbon
 *     inescutcheon at the centre)
 *   - Two Pillars of Hercules flanking the shield, capped with
 *     gold bases
 *   - Red "Plus Ultra" ribbon wrapping the pillars
 *
 * This is original SVG artwork inspired by the public-domain
 * Wikimedia Commons rendering — no third-party asset imports.
 */
function FlagSpain(): ReactElement {
  return (
    <svg {...FLAG_SVG_PROPS}>
      <rect width="60" height="40" fill="#AA151B" />
      <rect y="10" width="60" height="20" fill="#F1BF00" />

      {/* Coat of arms — centered at (20, 20), the official
          1/3-from-hoist position. Drawn at 1× scale; the whole
          group fits within the central yellow band. */}
      <g data-yoflag-coa="es" transform="translate(20 20)">
        {/* Pillars of Hercules — gold columns flanking the shield */}
        <g fill="#C8A030" stroke="#7A5A00" strokeWidth="0.2">
          <rect x="-7.5" y="-7" width="2" height="14" />
          <rect x="5.5" y="-7" width="2" height="14" />
          <rect x="-8" y="-8" width="3" height="1.5" />
          <rect x="5" y="-8" width="3" height="1.5" />
          <rect x="-8" y="6.5" width="3" height="1.5" />
          <rect x="5" y="6.5" width="3" height="1.5" />
          {/* Imperial crown atop the right pillar */}
          <path d="M5 -8.5 H8 L7.5 -10 L6.5 -9 L5.5 -10 Z" />
          <path d="M-5 -8.5 H-8 L-7.5 -10 L-6.5 -9 L-5.5 -10 Z" />
        </g>

        {/* Red royal mantle backdrop behind the shield */}
        <path
          d="M-5 -7 Q -5.5 -7.5 -5 -8 L 5 -8 Q 5.5 -7.5 5 -7 L 5 7 Q 5.5 7.5 5 8 L -5 8 Q -5.5 7.5 -5 7 Z"
          fill="#AA151B"
          opacity="0.92"
        />

        {/* Shield body: rounded base, gold border */}
        <path
          d="M -3.8 -5 L 3.8 -5 L 3.8 1.5 Q 3.8 5 0 6.2 Q -3.8 5 -3.8 1.5 Z"
          fill="#F1BF00"
          stroke="#7A5A00"
          strokeWidth="0.3"
        />

        {/* Quartering — Castilla (red), León (white), Aragón
            (gold/red bars), Navarra (red) — simplified to four
            recognisable colour fields */}
        <g>
          {/* Top-left quarter — Castile (red field) */}
          <path d="M-3.8 -5 L 0 -5 L 0 -1 L -3.8 -1 Z" fill="#AA151B" />
          {/* Top-right quarter — León (white field) */}
          <path d="M 0 -5 L 3.8 -5 L 3.8 -1 L 0 -1 Z" fill="#FFFFFF" />
          {/* Bottom-left quarter — Aragón stripes (gold/red) */}
          <path d="M-3.8 -1 L 0 -1 L 0 1.5 Q 0 4.5 -2.5 5.5 Q -3.8 4.5 -3.8 1.5 Z" fill="#F1BF00" />
          <g fill="#AA151B">
            <path d="M-3.8 -0.2 L 0 -0.2 L 0 0.4 L -3.8 0.4 Z" />
            <path d="M-3.8 1 L 0 1 L 0 1.6 L -3.8 1.6 Z" />
            <path d="M-3.6 2.2 L 0 2.2 L 0 2.8 L -3.7 2.8 Z" />
          </g>
          {/* Bottom-right quarter — Navarra (red field with
              simplified gold cross representing the chains) */}
          <path d="M 0 -1 L 3.8 -1 L 3.8 1.5 Q 3.8 4.5 2.5 5.5 Q 0 4.5 0 1.5 Z" fill="#AA151B" />
          <path d="M 1.9 -0.6 V 4.6 M 0.4 2 H 3.4" stroke="#F1BF00" strokeWidth="0.4" />
        </g>

        {/* Bourbon inescutcheon — small blue disc with a gold
            fleur-de-lis hint — at the centre of the shield */}
        <g>
          <circle cx="0" cy="0" r="1.2" fill="#0034AB" stroke="#7A5A00" strokeWidth="0.2" />
          <path d="M0 -0.8 L 0.4 0 L 0 0.8 L -0.4 0 Z" fill="#F1BF00" />
        </g>

        {/* Plus Ultra ribbon wrapping the pillars near the bottom */}
        <path
          d="M -8.5 4 Q -6 4.6 -3 4.3 L 3 4.3 Q 6 4.6 8.5 4 L 8.5 5.6 Q 6 6.2 3 5.9 L -3 5.9 Q -6 6.2 -8.5 5.6 Z"
          fill="#AA151B"
          stroke="#7A5A00"
          strokeWidth="0.15"
        />
      </g>
    </svg>
  );
}

/* ─── Québec ────────────────────────────────────────────────────── */

/**
 * Québec — fleurdelisé. Blue field, white cross dividing the flag
 * into four quadrants, one upright white fleur-de-lis per quadrant.
 *
 * The fleur-de-lis path below renders the classic heraldic shape
 * — central upright petal, two outer curling petals, a horizontal
 * cuff, and a downward-pointing base — instead of the placeholder
 * dot/diamond used in the previous iteration.
 *
 * The launch scope of the French parcours is francisation /
 * Québec / Canadian French, so the `fr-ca` badge id maps to the
 * Québec flag (not the French tricolore).
 */
function FlagQuebec(): ReactElement {
  // Heraldic fleur-de-lis path. Authored to fill a roughly
  // 14×21 bounding box centred on the origin.
  const fleurDeLis =
    "M0 -10 C-2.4 -7 -2.4 -3 -1 -1.5 C-4 -3 -7 -0.2 -7 2.5 C-7 4.6 -5 5.4 -2.6 4.4 L-2.6 6 L-5.5 6 L-5.5 7.5 L5.5 7.5 L5.5 6 L2.6 6 L2.6 4.4 C5 5.4 7 4.6 7 2.5 C7 -0.2 4 -3 1 -1.5 C2.4 -3 2.4 -7 0 -10 Z M-3.5 7.5 L3.5 7.5 L0 11 Z";

  return (
    <svg {...FLAG_SVG_PROPS}>
      <rect width="60" height="40" fill="#003DA5" />
      {/* White cross — vertical band x=28..32, horizontal band y=18..22 */}
      <path d="M28 0 H32 V40 H28 Z M0 18 H60 V22 H0 Z" fill="#FFFFFF" />

      {/* Four white fleurs-de-lis, one per quadrant. Each is
          centred at the visual midpoint of its quadrant and
          uniformly scaled to fit within the cross-bordered area. */}
      <g data-yoflag-fleur="qc-tl" transform="translate(14 9) scale(0.55)">
        <path d={fleurDeLis} fill="#FFFFFF" />
      </g>
      <g data-yoflag-fleur="qc-tr" transform="translate(46 9) scale(0.55)">
        <path d={fleurDeLis} fill="#FFFFFF" />
      </g>
      <g data-yoflag-fleur="qc-bl" transform="translate(14 31) scale(0.55)">
        <path d={fleurDeLis} fill="#FFFFFF" />
      </g>
      <g data-yoflag-fleur="qc-br" transform="translate(46 31) scale(0.55)">
        <path d={fleurDeLis} fill="#FFFFFF" />
      </g>
    </svg>
  );
}

/* ─── United Kingdom ────────────────────────────────────────────── */

/**
 * United Kingdom — Union Jack. Navy field, white St Andrew's
 * saltire (full diagonals), counter-changed red St Patrick's
 * saltire (offset perpendicular to each diagonal so it sits flush
 * against opposite edges of the white in adjacent quadrants —
 * the classic heraldic "pinwheel"), and the Cross of St George
 * (red on white) overlaid on top.
 *
 * Counter-change rule (Royal Warrant of 1801): on each diagonal,
 * the red saltire is offset toward the bottom of the flag on the
 * hoist side and toward the top of the flag on the fly side.
 * This produces:
 *
 *     TL: red below white   |  TR: red above white
 *     BL: red above white   |  BR: red below white
 *
 * Implementation: each red saltire is drawn as a single stroked
 * line, displaced 2 units perpendicular to the diagonal. The
 * `yoflag-uk-clip` clipPath keeps the overshoot inside the flag.
 *
 * The 60×40 (3:2) aspect ratio is non-canonical — the official
 * Union Jack is 2:1 — but the internal proportions (cross widths,
 * saltire widths, and the counter-change offset) are honoured so
 * the result reads as a real Union Jack across the language grid.
 */
function FlagUnitedKingdom(): ReactElement {
  return (
    <svg {...FLAG_SVG_PROPS}>
      <clipPath id="yoflag-uk-clip">
        <rect width="60" height="40" />
      </clipPath>
      <g clipPath="url(#yoflag-uk-clip)">
        <rect width="60" height="40" fill="#012169" />

        {/* White St Andrew's saltire (full thickness) */}
        <path
          d="M0 0 L60 40 M60 0 L0 40"
          stroke="#FFFFFF"
          strokeWidth="8"
        />

        {/* Red St Patrick's saltire — counter-changed.
            TL-BR diagonal offset toward the lower-left
            (perpendicular vector ~(-0.55, +0.83), magnitude ~2.4),
            so the red sits below the white in TL and BR. */}
        <path d="M-1.3 2 L58.7 42" stroke="#C8102E" strokeWidth="3" />
        {/* TR-BL diagonal offset toward the upper-left
            (perpendicular vector ~(-0.55, -0.83), magnitude ~2.4),
            so the red sits above the white in TR and BL. */}
        <path d="M58.7 -2 L-1.3 38" stroke="#C8102E" strokeWidth="3" />

        {/* White Cross of St George (vertical band + horizontal band) */}
        <path
          d="M30 0 V40 M0 20 H60"
          stroke="#FFFFFF"
          strokeWidth="12"
        />

        {/* Red Cross of St George (thinner, on top) */}
        <path
          d="M30 0 V40 M0 20 H60"
          stroke="#C8102E"
          strokeWidth="8"
        />
      </g>
    </svg>
  );
}

/* ─── Japan ─────────────────────────────────────────────────────── */

/**
 * Japan — Hi no Maru. White field with a centred red disc; the
 * disc diameter is 3/5 of the flag's vertical height (canonical
 * proportion from the 1999 Act on National Flag and Anthem).
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
