"use client";

/**
 * YoLanguageSelector
 *
 * Compact, real FR / EN / ES selector for the YoPratiqo app shell.
 * Replaces every one-off "View in English" / "Voir en français" pill
 * that used to live on /yo/langues, the language landings, the deck
 * headers, and the country course header.
 *
 * Design intent
 * -------------
 *   • Always-visible but compact (segmented mini-bar of three pills
 *     on sm+, single-cell select on xs). Never causes layout shift
 *     between locale flips.
 *   • Each pill is a real `<Link>` to the current pathname with the
 *     target `?lang=` flipped, so the user stays on the same screen
 *     after switching locale — no navigation back to the catalog.
 *   • Locales that the current route does not support can be declared
 *     `disabled` via the `availableLocales` prop. Disabled locales
 *     render as `aria-disabled` dimmed text — never a broken link.
 *
 * Privacy / safety profile
 * ------------------------
 *   • Pure client component that only reads `usePathname()` to build
 *     the locale-flipped href. No API, no persistence, no payment
 *     library, no Supabase write, no audio, no quiz data.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { buildYoLocaleHref } from "@/lib/yo/localize";
import type { YoLocale } from "@/lib/yo/types";

/** Locale codes the selector knows about. Mirrors `YO_LOCALES`. */
export const YO_LANGUAGE_SELECTOR_LOCALES = ["fr", "en", "es"] as const;

type Copy = {
  ariaLabel: string;
  short: string;
  long: string;
};

/**
 * Per-locale visible label. The compact `short` form ("FR" / "EN" /
 * "ES") is used in the pill, the `long` form is exposed as the
 * accessible name so screen readers always announce the full
 * language.
 */
const COPY: Record<(typeof YO_LANGUAGE_SELECTOR_LOCALES)[number], Copy> = {
  fr: { ariaLabel: "Français", short: "FR", long: "Français" },
  en: { ariaLabel: "English", short: "EN", long: "English" },
  es: { ariaLabel: "Español", short: "ES", long: "Español" },
};

/**
 * Screen-reader-only group label per active locale. Kept tiny —
 * the visible UI is the three pills.
 */
const GROUP_ARIA_LABEL: Record<YoLocale, string> = {
  fr: "Sélecteur de langue YoPratiqo",
  en: "YoPratiqo language selector",
  es: "Selector de idioma YoPratiqo",
};

export type YoLanguageSelectorProps = {
  /** Active locale — the matching pill is rendered as the current page. */
  locale: YoLocale;
  /**
   * Optional override of the path used to build locale-flipped URLs.
   * Defaults to `usePathname()` so callers don't need to thread the
   * path manually. Provide explicitly if the selector renders inside
   * a sub-route that should anchor back to a different base path.
   */
  pathname?: string;
  /**
   * Whitelist of locales the current route truly supports. Defaults
   * to all three — set this when a specific screen only ships FR/EN
   * copy so ES dims honestly instead of taking the user to a
   * fallback page.
   */
  availableLocales?: ReadonlyArray<YoLocale>;
  /** Visual size — `sm` for in-header use, `md` for stand-alone use. */
  size?: "sm" | "md";
  /**
   * Visual variant:
   *   - "pill-bar"           : the canonical compact three-pill
   *                            segmented bar used by mobile + most
   *                            headers (default).
   *   - "desktop-dropdown"   : a desktop-friendly compact dropdown
   *                            rendered as a single labelled control.
   *                            Used by `<YoAppHeader appearance="desktop">`
   *                            so the desktop top bar doesn't feel
   *                            like a mobile-app chrome.
   */
  variant?: "pill-bar" | "desktop-dropdown";
  /** Extra wrapper class — never replaces the base styling. */
  className?: string;
};

export function YoLanguageSelector({
  locale,
  pathname,
  availableLocales,
  size = "sm",
  variant = "pill-bar",
  className,
}: YoLanguageSelectorProps): React.JSX.Element {
  const fallbackPath = usePathname();
  const basePath = pathname ?? fallbackPath ?? "/yo/langues";
  // This legacy introduction defaults to English and only has FR/EN copy.
  const isQuebecIntro = basePath === "/yo/langues/francais-quebec/intro";
  const available = availableLocales ?? (isQuebecIntro ? ["fr", "en"] : YO_LANGUAGE_SELECTOR_LOCALES);
  const localeHref = (target: YoLocale) => isQuebecIntro && target === "fr"
    ? `${basePath}?lang=fr`
    : buildYoLocaleHref(basePath, target);
  const groupAria = GROUP_ARIA_LABEL[locale] ?? GROUP_ARIA_LABEL.fr;

  if (variant === "desktop-dropdown") {
    const activeCopy = COPY[locale];
    return (
      <div
        data-testid="yo-language-selector"
        data-yo-language-selector="true"
        data-yo-language-selector-active={locale}
        data-yo-language-selector-variant="desktop-dropdown"
        role="group"
        aria-label={groupAria}
        className={cn(
          "relative inline-flex items-center gap-2 rounded-md border border-[#E7DFCF] bg-white/90 px-2 py-1 text-sm font-semibold text-[#172642] shadow-[0_1px_2px_rgba(23,38,66,0.05)]",
          className,
        )}
      >
        <span
          data-testid="yo-language-selector-active-pill"
          data-yo-language-selector-locale={locale}
          aria-current="page"
          aria-label={activeCopy.ariaLabel}
          className="inline-flex items-center gap-1 pr-1 text-xs font-bold uppercase tracking-[0.14em] text-[#0F6E56]"
        >
          {activeCopy.short}
          <span className="text-[#172642]/55" aria-hidden>
            ·
          </span>
          <span className="text-xs font-semibold normal-case tracking-normal text-[#172642]/80">
            {activeCopy.long}
          </span>
        </span>
        <span className="inline-flex items-center gap-1 border-l border-[#E7DFCF] pl-2">
          {YO_LANGUAGE_SELECTOR_LOCALES.filter((target) => target !== locale).map(
            (target) => {
              const copy = COPY[target];
              const isAvailable = available.includes(target);
              const href = localeHref(target);
              if (!isAvailable) {
                return (
                  <span
                    key={target}
                    data-testid="yo-language-selector-disabled-pill"
                    data-yo-language-selector-locale={target}
                    aria-disabled="true"
                    aria-label={`${copy.ariaLabel} (indisponible)`}
                    className="inline-flex cursor-not-allowed items-center rounded px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#172642]/30"
                  >
                    {copy.short}
                  </span>
                );
              }
              return (
                <Link
                  key={target}
                  href={href}
                  data-testid="yo-language-selector-pill"
                  data-yo-language-selector-locale={target}
                  aria-label={copy.ariaLabel}
                  className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#172642]/70 transition hover:bg-[#F4EFE6] hover:text-[#0F6E56]"
                >
                  {copy.short}
                </Link>
              );
            },
          )}
        </span>
      </div>
    );
  }

  const pillBase = cn(
    "inline-flex items-center justify-center rounded-full font-bold uppercase tracking-[0.14em] transition",
    size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
  );

  return (
    <div
      data-testid="yo-language-selector"
      data-yo-language-selector="true"
      data-yo-language-selector-active={locale}
      data-yo-language-selector-variant="pill-bar"
      role="group"
      aria-label={groupAria}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-[#E7DFCF] bg-white/80 p-0.5 backdrop-blur",
        className,
      )}
    >
      {YO_LANGUAGE_SELECTOR_LOCALES.map((target) => {
        const copy = COPY[target];
        const isActive = target === locale;
        const isAvailable = available.includes(target);
        const href = localeHref(target);

        if (isActive) {
          return (
            <span
              key={target}
              data-testid="yo-language-selector-active-pill"
              data-yo-language-selector-locale={target}
              aria-current="page"
              aria-label={copy.ariaLabel}
              className={cn(
                pillBase,
                "bg-[#172642] text-white shadow-[0_4px_10px_rgba(23,38,66,0.18)]",
              )}
            >
              {copy.short}
            </span>
          );
        }

        if (!isAvailable) {
          return (
            <span
              key={target}
              data-testid="yo-language-selector-disabled-pill"
              data-yo-language-selector-locale={target}
              aria-disabled="true"
              aria-label={`${copy.ariaLabel} (indisponible)`}
              className={cn(pillBase, "cursor-not-allowed text-[#172642]/35")}
            >
              {copy.short}
            </span>
          );
        }

        return (
          <Link
            key={target}
            href={href}
            data-testid="yo-language-selector-pill"
            data-yo-language-selector-locale={target}
            aria-label={copy.ariaLabel}
            className={cn(
              pillBase,
              "text-[#172642] hover:bg-[#F4EFE6] hover:text-[#0F6E56]",
            )}
          >
            {copy.short}
          </Link>
        );
      })}
    </div>
  );
}

export default YoLanguageSelector;
