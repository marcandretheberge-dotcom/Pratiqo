/**
 * YoAppValueStrip
 *
 * Four small app-like tiles that sit directly under the hero card
 * on the public /yo onboarding surface. Each tile pairs a
 * prototype illustration with a tiny localized label so the
 * landing screen communicates the four pillars of the YoPratiqo
 * experience visually, in the same warm cream / navy / teal
 * palette as the hero.
 *
 * Tiles:
 *   • travel   → "Voyage / Travel / Viaja"
 *   • culture  → "Culture / Culture / Cultura"
 *   • talk     → "Parle / Speak / Habla"
 *   • explore  → "Explore / Explore / Explora"
 *
 * The illustration PNGs are imported from the YoPratiqo prototype
 * pack (`public/images/yo/app/cat-*.png`, 264×264 transparent
 * RGBA). They are decorative — the visible label carries the
 * accessible meaning, so the images receive `alt=""` to avoid
 * double-announcing the tile name to screen readers.
 *
 * Privacy / safety profile
 * ------------------------
 *   • Server component. No client hooks, no API calls, no
 *     persistence, no payment library, no Supabase write, no
 *     quiz data.
 */

import Image from "next/image";

import { cn } from "@/lib/utils";
import type { YoLocale } from "@/lib/yo/types";

type Tile = {
  id: "travel" | "culture" | "talk" | "explore";
  src: string;
  /** Tiny tile labels keyed by locale. */
  label: Record<YoLocale, string>;
};

const TILES: readonly Tile[] = [
  {
    id: "travel",
    src: "/images/yo/app/cat-travel.png",
    label: { fr: "Voyage", en: "Travel", es: "Viaja" },
  },
  {
    id: "culture",
    src: "/images/yo/app/cat-culture.png",
    label: { fr: "Culture", en: "Culture", es: "Cultura" },
  },
  {
    id: "talk",
    src: "/images/yo/app/cat-talk.png",
    label: { fr: "Parle", en: "Speak", es: "Habla" },
  },
  {
    id: "explore",
    src: "/images/yo/app/cat-explore.png",
    label: { fr: "Explore", en: "Explore", es: "Explora" },
  },
] as const;

function safeLocale(locale: YoLocale | undefined): YoLocale {
  if (locale === "en" || locale === "es") return locale;
  return "fr";
}

export type YoAppValueStripProps = {
  locale: YoLocale;
  className?: string;
};

export function YoAppValueStrip({
  locale,
  className,
}: YoAppValueStripProps): React.JSX.Element {
  const l = safeLocale(locale);
  return (
    <ul
      data-testid="yo-app-value-strip"
      data-yo-app-value-strip="true"
      aria-label={
        l === "fr"
          ? "Quatre piliers YoPratiqo"
          : l === "es"
            ? "Cuatro pilares de YoPratiqo"
            : "Four YoPratiqo pillars"
      }
      className={cn(
        // Mobile-first 2×2 grid so all four tiles are visible on a
        // single phone screen without horizontal scrolling. The
        // sm+ breakpoint widens the row to a single line of four,
        // matching the prototype mockup's horizontal value strip.
        "grid w-full grid-cols-2 gap-3 sm:grid-cols-4",
        className,
      )}
    >
      {TILES.map((tile) => (
        <li
          key={tile.id}
          data-yo-app-value-strip-tile={tile.id}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-[#E7DFCF] bg-white px-3 py-4 text-center shadow-[0_6px_18px_rgba(23,38,66,0.05)]"
        >
          <Image
            src={tile.src}
            alt=""
            width={264}
            height={264}
            sizes="80px"
            className="size-16 object-contain"
          />
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#172642]">
            {tile.label[l]}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default YoAppValueStrip;
