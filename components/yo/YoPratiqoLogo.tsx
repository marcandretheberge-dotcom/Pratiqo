/**
 * YoPratiqoLogo
 *
 * Reusable brand mark for YoPratiqo-specific surfaces (the /yo hub and
 * its sub-pages). This is intentionally NOT the global Pratiqo brand —
 * the main marketplace still uses `PratiqoLogo`. Mount this component
 * only on pages where the user is *inside* the YoPratiqo product, so
 * the brand split between the marketplace and the self-paced product
 * stays legible.
 *
 * Rendering contract
 * ------------------
 *   • Renders `/brand/yopratiqo-logo.png` (1000×250 transparent RGBA)
 *     through `next/image` so Next gives us responsive `srcset` and
 *     automatic format negotiation.
 *   • Preserves the source aspect ratio. The intrinsic 1000×250 is
 *     passed to `next/image` so the layout reserves the correct slot,
 *     and only the CSS `width` is set; `height` is `auto`. The logo is
 *     never stretched.
 *   • Accessible: `alt="YoPratiqo"`. If the image fails to load (e.g.
 *     missing asset in a future migration), the `alt` text falls
 *     through to the browser's default broken-image text — no broken
 *     visual is rendered next to live copy.
 *
 * Privacy / safety
 * ----------------
 *   • Pure visual component. No telemetry, no analytics, no auth, no
 *     payment data, no quiz data. Safe in server and client trees.
 */

import Image from "next/image";

import { cn } from "@/lib/utils";

export type YoPratiqoLogoSize = "sm" | "md" | "lg";

export type YoPratiqoLogoProps = {
  size?: YoPratiqoLogoSize;
  /** Render a short, locale-aware tagline beneath the logo. */
  showTagline?: boolean;
  /**
   * Optional locale for the tagline. Defaults to "fr" (Pratiqo's
   * Quebec default). Ignored when `showTagline` is false.
   */
  locale?: "fr" | "en" | "es";
  className?: string;
  /**
   * Whether to mark the underlying `next/image` as priority-loaded.
   * Off by default so this logo never accidentally competes with a
   * page's real LCP (e.g. the YoPratiqo hub's hero image).
   */
  priority?: boolean;
};

/**
 * CSS pixel widths per size. Heights auto-scale via `h-auto` so the
 * 4:1 source aspect ratio is preserved.
 */
const SIZE_WIDTH_PX: Record<YoPratiqoLogoSize, number> = {
  sm: 140,
  md: 180,
  lg: 240,
};

/** Matching `sizes` attribute so the browser picks the right srcset entry. */
const SIZE_SIZES_ATTR: Record<YoPratiqoLogoSize, string> = {
  sm: "140px",
  md: "180px",
  lg: "240px",
};

const TAGLINE: Record<"fr" | "en" | "es", string> = {
  fr: "Apprends à ton rythme",
  en: "Learn at your own pace",
  es: "Aprende a tu ritmo",
};

const TAGLINE_TEXT_SIZE: Record<YoPratiqoLogoSize, string> = {
  sm: "text-[10px]",
  md: "text-[11px]",
  lg: "text-xs",
};

const LOGO_SRC = "/brand/yopratiqo-logo.png";

export function YoPratiqoLogo({
  size = "md",
  showTagline = false,
  locale = "fr",
  className,
  priority = false,
}: YoPratiqoLogoProps): React.JSX.Element {
  const width = SIZE_WIDTH_PX[size];
  return (
    <span
      data-testid="yopratiqo-logo"
      data-yopratiqo-logo-size={size}
      className={cn("inline-flex flex-col items-start gap-1", className)}
    >
      <Image
        src={LOGO_SRC}
        alt="YoPratiqo"
        // Intrinsic source dimensions — same 4:1 aspect ratio as the
        // PNG (1000×250). `next/image` uses these to reserve layout
        // space and to pick the best srcset variant for the rendered
        // CSS width.
        width={1000}
        height={250}
        sizes={SIZE_SIZES_ATTR[size]}
        // `h-auto` plus a fixed `width` keeps the original aspect
        // ratio. `object-contain` is a safety net in case a parent
        // layout forces a height — the logo will letterbox rather
        // than stretch.
        className="block h-auto shrink-0 object-contain"
        style={{ width }}
        priority={priority}
      />
      {showTagline ? (
        <span
          className={cn(
            "block font-semibold uppercase tracking-[0.18em] text-[#0F6E56]/72",
            TAGLINE_TEXT_SIZE[size],
          )}
        >
          {TAGLINE[locale] ?? TAGLINE.fr}
        </span>
      ) : null}
    </span>
  );
}

export default YoPratiqoLogo;
