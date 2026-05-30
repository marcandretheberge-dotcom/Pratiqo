/**
 * YoLanguageBadge — real SVG flag swatch for the YoPratiqo language hub.
 *
 * Why a dedicated component:
 *
 *   We previously tried two approaches and both looked broken:
 *
 *     1. Unicode regional-indicator emoji pairs (the U+1F1E6..U+1F1FF
 *        codepoints for ES / FR / GB / JP). Windows desktop browsers
 *        ship no color flag glyphs, so they degrade to bare ISO codes
 *        ("ES" / "FR" / "GB" / "JP") and look like a bug.
 *     2. CSS-painted "fake" flags via stacked linear/radial gradients.
 *        At small badge sizes the result reads as graphic noise, not
 *        as a flag.
 *
 *   This iteration ships **real** local SVG flag assets under
 *   `public/images/yo/flags/`. Local assets keep the language hub
 *   self-hosted (no third-party flag CDN, no font dependency) and
 *   render identically across desktop and mobile.
 *
 *   We deliberately use a plain `<img>` (not `next/image`) because
 *   the assets are tiny inline SVGs (≤ 1 KB) where the optimization
 *   pipeline buys us nothing and only adds the `dangerouslyAllowSVG`
 *   surface area to next.config.
 *
 * Accessibility:
 *
 *   The visible asset is decorative (`alt=""`) so screen readers do
 *   not read the country name twice. The rounded wrapper carries
 *   `role="img"` + `aria-label={ariaLabel}` so SR users hear the
 *   localized language name (e.g. "Espagnol" / "Spanish") instead
 *   of the bare two-letter code.
 */

import { cn } from "@/lib/utils";

/**
 * Closed union of language IDs the YoPratiqo language hub knows
 * about today. Adding a new entry requires shipping an SVG asset
 * under `public/images/yo/flags/<slug>.svg` and registering the
 * mapping in `LANGUAGE_FLAG_ASSETS` below.
 */
export type YoLanguageBadgeId = "es" | "fr-ca" | "en" | "ja";

export interface YoLanguageBadgeProps {
  /** Which language flag to render. */
  language: YoLanguageBadgeId;
  /**
   * Localized full language name used as the rendered ARIA label
   * (e.g. "Espagnol" / "Spanish"). The decorative `<img>` itself
   * carries `alt=""` so SR users hear the human name, not the slug.
   */
  ariaLabel: string;
  /** Visual size; matches the existing card density. */
  size?: "sm" | "md";
  className?: string;
}

interface LanguageFlagAsset {
  /** Path under `/public`, served as a static asset. */
  src: string;
}

/**
 * Maps each badge id to its local flag asset. The launch scope of
 * the French parcours is francisation / Québec / Canadian French,
 * so we ship the Québec fleurdelisé (not the French tricolore) for
 * the `fr-ca` id. Keeping the id as `fr-ca` (not `fr-qc`) preserves
 * the existing data contract on `/yo/langues/page.tsx`.
 */
const LANGUAGE_FLAG_ASSETS: Record<YoLanguageBadgeId, LanguageFlagAsset> = {
  es: { src: "/images/yo/flags/es.svg" },
  "fr-ca": { src: "/images/yo/flags/fr-qc.svg" },
  en: { src: "/images/yo/flags/en.svg" },
  ja: { src: "/images/yo/flags/ja.svg" },
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
  const asset = LANGUAGE_FLAG_ASSETS[language];
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={asset.src}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        className="h-full w-full select-none object-cover"
      />
    </span>
  );
}
