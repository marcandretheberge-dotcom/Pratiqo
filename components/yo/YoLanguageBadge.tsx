/**
 * YoLanguageBadge — small CSS-only flag swatch for the YoPratiqo
 * language hub.
 *
 * Why a dedicated component:
 *
 * The previous design relied on Unicode regional-indicator pairs
 * (the country-flag emoji codepoints in U+1F1E6..U+1F1FF). On Windows
 * desktop browsers — including Chrome and Edge — the OS ships NO color
 * emoji flag glyphs, so the regional-indicator pair degrades to its
 * raw two-letter form ("ES", "FR", "GB", "JP"). The result looked
 * broken / accidental.
 *
 * Rather than gambling on emoji font availability per platform, we
 * render an intentional CSS-painted badge: the two-letter ISO code
 * sits on a flag-themed colored background, with a clean rounded
 * shape that matches the rest of the YoPratiqo language card design.
 *
 * Pure server component, no client state, no asset files needed.
 *
 * Accessibility:
 *   - Visual swatches are decorative (`aria-hidden`).
 *   - The two-letter code stays in the DOM as plain text so an
 *     `aria-label` on the parent badge announces the full language
 *     name (passed in by the caller) instead of the bare code.
 */

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * Closed union of language IDs the YoPratiqo language hub knows
 * about today. Adding a new entry requires picking a flag-themed
 * palette in `LANGUAGE_BADGE_STYLES` below.
 */
export type YoLanguageBadgeId = "es" | "fr-ca" | "en" | "ja";

export interface YoLanguageBadgeProps {
  /** Which language palette + ISO code to render. */
  language: YoLanguageBadgeId;
  /**
   * Localized full language name used as the rendered ARIA label
   * (e.g. "Espagnol" / "Spanish"). The bare two-letter code is
   * marked `aria-hidden` so screen readers announce the human name.
   */
  ariaLabel: string;
  /** Visual size; matches the existing card density. */
  size?: "sm" | "md";
  className?: string;
}

interface LanguageBadgeStyle {
  /** Bold uppercase 2-letter code rendered inside the swatch. */
  code: string;
  /**
   * CSS gradient that paints the badge background. Picked to evoke
   * the flag without depending on emoji rendering. Each gradient is
   * intentionally stripped down to two or three flat colors so the
   * code on top stays legible on every variant.
   */
  background: string;
  /**
   * Tailwind classes for the code label (color + optional shadow)
   * tuned per palette so the contrast ratio stays comfortable.
   */
  codeClass: string;
  /**
   * Optional inline-style overlay (e.g. Japan's red sun) that we
   * cannot easily express via Tailwind classes. Drawn underneath
   * the code label so it stays readable.
   */
  overlayStyle?: CSSProperties;
}

const LANGUAGE_BADGE_STYLES: Record<YoLanguageBadgeId, LanguageBadgeStyle> = {
  // Spain — red / yellow / red horizontal stripes (rojigualda).
  es: {
    code: "ES",
    background:
      "linear-gradient(180deg,#C8102E 0%,#C8102E 28%,#FFC72C 28%,#FFC72C 72%,#C8102E 72%,#C8102E 100%)",
    // Dark code over the central yellow band reads cleanly without
    // a text shadow, which keeps the badge feeling crisp.
    codeClass: "text-[#1F1A00]",
  },
  // Canada — red / white / red vertical stripes. We use the
  // Canadian palette (rather than the French tricolore) because the
  // launch scope of the French parcours is francisation / Québec-
  // Canada, not all global French variants.
  "fr-ca": {
    code: "FR",
    background:
      "linear-gradient(90deg,#D52B1E 0%,#D52B1E 25%,#FFFFFF 25%,#FFFFFF 75%,#D52B1E 75%,#D52B1E 100%)",
    codeClass: "text-[#7A0F0A]",
  },
  // United Kingdom — simplified flat navy panel, white code.
  // We deliberately do not try to draw the Union Jack in CSS;
  // a clean navy block reads as "EN" without looking like a glitch.
  en: {
    code: "EN",
    background: "linear-gradient(180deg,#012169 0%,#012169 100%)",
    codeClass: "text-white drop-shadow-[0_1px_0_rgba(0,0,0,0.25)]",
  },
  // Japan — white field with a centered red disc. The disc lives
  // in `overlayStyle` so it scales with the badge size.
  ja: {
    code: "JP",
    background: "linear-gradient(180deg,#FFFFFF 0%,#FFFFFF 100%)",
    codeClass: "text-[#1F1A1A]",
    overlayStyle: {
      backgroundImage:
        "radial-gradient(circle at 50% 50%, #BC002D 0%, #BC002D 30%, transparent 31%)",
    },
  },
};

const SIZE_STYLES = {
  sm: {
    container: "h-9 w-12 rounded-md text-[0.7rem] tracking-[0.18em]",
  },
  md: {
    container: "h-11 w-14 rounded-lg text-[0.78rem] tracking-[0.2em]",
  },
} as const;

export function YoLanguageBadge({
  language,
  ariaLabel,
  size = "md",
  className,
}: YoLanguageBadgeProps) {
  const style = LANGUAGE_BADGE_STYLES[language];
  const sizing = SIZE_STYLES[size];

  return (
    <span
      role="img"
      aria-label={ariaLabel}
      data-yo-language-badge={language}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden font-black ring-1 ring-black/5 shadow-[0_1px_2px_rgba(15,58,52,0.10)]",
        sizing.container,
        className,
      )}
      style={{ backgroundImage: style.background }}
    >
      {style.overlayStyle ? (
        <span
          aria-hidden
          className="absolute inset-0"
          style={style.overlayStyle}
        />
      ) : null}
      <span aria-hidden className={cn("relative", style.codeClass)}>
        {style.code}
      </span>
    </span>
  );
}
