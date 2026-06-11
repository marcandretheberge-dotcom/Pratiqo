/**
 * YoAppHeader
 *
 * Single, canonical app-style top bar for every YoPratiqo "app-mode"
 * surface (catalog, Spanish hub, country Course Home, intros once
 * adopted). Replaces both the legacy 3/4-level breadcrumb chains AND
 * the one-off "View in English" pill with three focused affordances:
 *
 *   - left   : back / home link (icon-only on mobile, icon + label on
 *              sm+),
 *   - center : compact YoPratiqo logo + the screen's own title (the
 *              title truncates rather than wrapping so a 320 px
 *              viewport never grows the header to two rows),
 *   - right  : real `<YoLanguageSelector />` (FR / EN / ES with
 *              honest disabled states).
 *
 * The header is `shrink-0` and uses the same backdrop / border tokens
 * as the deck header so the catalog → intro transition feels like
 * one continuous app.
 *
 * Privacy / safety profile
 * ------------------------
 *   • Server component. No client hooks, no API, no persistence, no
 *     payment library, no Supabase, no audio, no quiz data, no AI
 *     summary. The right-hand pill bar is a client component
 *     (`<YoLanguageSelector />`) that only reads `usePathname()`.
 */

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { YoPratiqoLogo } from "@/components/yo/YoPratiqoLogo";
import { YoLanguageSelector } from "@/components/yo/YoLanguageSelector";
import type { YoLocale } from "@/lib/yo/types";

const BACK_ARIA: Record<YoLocale, string> = {
  fr: "Retour",
  en: "Back",
  es: "Atrás",
};

export type YoAppHeaderProps = {
  locale: YoLocale;
  /** Where the back arrow points. Required — never `null`. */
  backHref: string;
  /** Optional visible back label (e.g. "Langues"). Hidden on mobile. */
  backLabel?: string;
  /** Center title — the screen's own name. Truncates. */
  title: string;
  /** Optional shorter title used on `sm-` if `title` is long. */
  compactTitle?: string;
  /**
   * Path used by the language selector to build locale-flipped URLs.
   * Defaults to `usePathname()` inside the selector — pass explicitly
   * only when the selector should anchor to a parent route.
   */
  selectorPath?: string;
  /**
   * Whitelist of locales the current screen supports. Defaults to
   * all three. Set explicitly to `["fr","en"]` etc. when ES copy is
   * not ready so the ES pill renders as disabled instead of linking
   * to a fallback.
   */
  availableLocales?: ReadonlyArray<YoLocale>;
  /** Hide the logo cluster on very narrow viewports — defaults to false. */
  hideLogoOnMobile?: boolean;
  /** Extra wrapper class — never replaces the chrome. */
  className?: string;
  /** Stable per-screen id for tests. */
  surfaceId?: string;
};

export function YoAppHeader({
  locale,
  backHref,
  backLabel,
  title,
  compactTitle,
  selectorPath,
  availableLocales,
  hideLogoOnMobile,
  className,
  surfaceId,
}: YoAppHeaderProps): React.JSX.Element {
  const ariaBack = BACK_ARIA[locale] ?? BACK_ARIA.fr;
  const visibleTitle = compactTitle ?? title;
  return (
    <header
      data-testid="yo-app-header"
      data-yo-app-header="true"
      data-yo-app-header-surface={surfaceId}
      className={cn(
        "relative z-40 border-b border-[#E7DFCF] bg-[#F4EFE6]/95 backdrop-blur-md",
        className,
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:h-16 sm:px-6">
        <Link
          data-testid="yo-app-header-back"
          href={backHref}
          aria-label={backLabel ?? ariaBack}
          className="inline-flex items-center gap-2 rounded-full border border-[#E7DFCF] bg-white/70 px-2.5 py-1.5 text-sm font-semibold text-[#172642] transition hover:bg-white sm:px-3"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {backLabel ? (
            <span className="hidden sm:inline">{backLabel}</span>
          ) : null}
        </Link>

        <div className="flex min-w-0 items-center justify-center gap-2">
          <span
            className={cn(
              "inline-flex",
              hideLogoOnMobile ? "hidden sm:inline-flex" : "",
            )}
          >
            <YoPratiqoLogo size="sm" priority={false} />
          </span>
          <span
            data-testid="yo-app-header-title"
            className="truncate text-sm font-semibold text-[#172642] sm:text-[15px]"
          >
            <span className="hidden sm:inline">{title}</span>
            <span className="sm:hidden">{visibleTitle}</span>
          </span>
        </div>

        <YoLanguageSelector
          locale={locale}
          pathname={selectorPath}
          availableLocales={availableLocales}
          size="sm"
        />
      </div>
    </header>
  );
}

export default YoAppHeader;
