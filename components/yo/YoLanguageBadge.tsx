/**
 * YoLanguageBadge - CSS-painted flag swatch for the YoPratiqo language hub.
 *
 * Windows desktop browsers do not reliably render Unicode flag emoji. This
 * component keeps the badge visual intentional across desktop and mobile,
 * without putting language letters inside the flag.
 */

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export type YoLanguageBadgeId = "es" | "fr-ca" | "en" | "ja";

export interface YoLanguageBadgeProps {
  language: YoLanguageBadgeId;
  ariaLabel: string;
  size?: "sm" | "md";
  className?: string;
}

interface LanguageBadgeStyle {
  background: string;
  overlayStyle?: CSSProperties;
}

const LANGUAGE_BADGE_STYLES: Record<YoLanguageBadgeId, LanguageBadgeStyle> = {
  es: {
    background:
      "linear-gradient(180deg,#C8102E 0%,#C8102E 28%,#FFC72C 28%,#FFC72C 72%,#C8102E 72%,#C8102E 100%)",
  },
  "fr-ca": {
    background: "linear-gradient(180deg,#003DA5 0%,#003DA5 100%)",
    overlayStyle: {
      backgroundImage:
        "radial-gradient(circle at 26% 28%, #FFFFFF 0%, #FFFFFF 5.5%, transparent 6%),radial-gradient(circle at 74% 28%, #FFFFFF 0%, #FFFFFF 5.5%, transparent 6%),radial-gradient(circle at 26% 72%, #FFFFFF 0%, #FFFFFF 5.5%, transparent 6%),radial-gradient(circle at 74% 72%, #FFFFFF 0%, #FFFFFF 5.5%, transparent 6%),linear-gradient(90deg, transparent 0%, transparent 43%, #FFFFFF 43%, #FFFFFF 57%, transparent 57%, transparent 100%),linear-gradient(180deg, transparent 0%, transparent 42%, #FFFFFF 42%, #FFFFFF 58%, transparent 58%, transparent 100%)",
    },
  },
  en: {
    background: "linear-gradient(180deg,#012169 0%,#012169 100%)",
    overlayStyle: {
      backgroundImage:
        "linear-gradient(90deg, transparent 0%, transparent 42%, #FFFFFF 42%, #FFFFFF 58%, transparent 58%, transparent 100%),linear-gradient(180deg, transparent 0%, transparent 40%, #FFFFFF 40%, #FFFFFF 60%, transparent 60%, transparent 100%),linear-gradient(90deg, transparent 0%, transparent 46%, #C8102E 46%, #C8102E 54%, transparent 54%, transparent 100%),linear-gradient(180deg, transparent 0%, transparent 45%, #C8102E 45%, #C8102E 55%, transparent 55%, transparent 100%),linear-gradient(35deg, transparent 0%, transparent 46%, rgba(255,255,255,0.9) 46%, rgba(255,255,255,0.9) 54%, transparent 54%, transparent 100%),linear-gradient(-35deg, transparent 0%, transparent 46%, rgba(255,255,255,0.9) 46%, rgba(255,255,255,0.9) 54%, transparent 54%, transparent 100%)",
    },
  },
  ja: {
    background: "linear-gradient(180deg,#FFFFFF 0%,#FFFFFF 100%)",
    overlayStyle: {
      backgroundImage:
        "radial-gradient(circle at 50% 50%, #BC002D 0%, #BC002D 30%, transparent 31%)",
    },
  },
};

const SIZE_STYLES = {
  sm: {
    container: "h-9 w-12 rounded-md",
  },
  md: {
    container: "h-11 w-14 rounded-lg",
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
        "relative inline-flex shrink-0 overflow-hidden ring-1 ring-black/5 shadow-[0_1px_2px_rgba(15,58,52,0.10)]",
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
    </span>
  );
}
