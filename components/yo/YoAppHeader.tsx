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
  /**
   * Appearance profile:
   *   - "mobile"   : compact app-style top bar. Use inside
   *                  `<YoMobileAppShell>`.
   *   - "desktop"  : taller product-software top bar with the
   *                  page title on the left and a desktop-friendly
   *                  language control on the right. Use inside
   *                  `<YoDesktopLearningWorkspace>`.
   *   - "auto"     : (default) renders both profiles with
   *                  `lg:hidden` / `hidden lg:flex` so legacy
   *                  call sites keep working.
   */
  appearance?: "mobile" | "desktop" | "auto";
  /** Extra wrapper class — never replaces the chrome. */
  className?: string;
  /** Stable per-screen id for tests. */
  surfaceId?: string;
};

function MobileBar({
  locale,
  backHref,
  backLabel,
  title,
  compactTitle,
  selectorPath,
  availableLocales,
  hideLogoOnMobile,
}: Required<Pick<YoAppHeaderProps, "locale" | "backHref" | "title">> & {
  backLabel?: string;
  compactTitle?: string;
  selectorPath?: string;
  availableLocales?: ReadonlyArray<YoLocale>;
  hideLogoOnMobile?: boolean;
}): React.JSX.Element {
  const ariaBack = BACK_ARIA[locale] ?? BACK_ARIA.fr;
  const visibleTitle = compactTitle ?? title;
  return (
    <div
      data-testid="yo-app-header-mobile-bar"
      data-yo-app-header-appearance="mobile"
      className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-2 px-3"
    >
      <Link
        data-testid="yo-app-header-back"
        href={backHref}
        aria-label={backLabel ?? ariaBack}
        className="inline-flex items-center gap-2 rounded-full border border-[#E7DFCF] bg-white/70 px-2.5 py-1.5 text-sm font-semibold text-[#172642] transition hover:bg-white"
      >
        <ArrowLeft className="size-4" aria-hidden />
      </Link>

      <div className="flex min-w-0 items-center justify-center gap-2">
        <span
          className={cn(
            "inline-flex",
            hideLogoOnMobile ? "hidden" : "",
          )}
        >
          <YoPratiqoLogo size="sm" priority={false} />
        </span>
        <span
          data-testid="yo-app-header-title"
          className="truncate text-sm font-semibold text-[#172642]"
        >
          {visibleTitle}
        </span>
      </div>

      <YoLanguageSelector
        locale={locale}
        pathname={selectorPath}
        availableLocales={availableLocales}
        size="sm"
      />
    </div>
  );
}

function DesktopBar({
  locale,
  backHref,
  backLabel,
  title,
  selectorPath,
  availableLocales,
}: Required<Pick<YoAppHeaderProps, "locale" | "backHref" | "title">> & {
  backLabel?: string;
  selectorPath?: string;
  availableLocales?: ReadonlyArray<YoLocale>;
}): React.JSX.Element {
  const ariaBack = BACK_ARIA[locale] ?? BACK_ARIA.fr;
  return (
    <div
      data-testid="yo-app-header-desktop-bar"
      data-yo-app-header-appearance="desktop"
      className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-6"
    >
      <div className="flex items-center gap-4">
        <Link
          data-testid="yo-app-header-back"
          href={backHref}
          aria-label={backLabel ?? ariaBack}
          className="inline-flex items-center gap-2 rounded-full border border-[#E7DFCF] bg-white/70 px-3 py-1.5 text-sm font-semibold text-[#172642] transition hover:bg-white"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {backLabel ? <span>{backLabel}</span> : null}
        </Link>
        <span className="h-6 w-px bg-[#E7DFCF]" aria-hidden />
        <YoPratiqoLogo size="sm" priority={false} />
        <span
          data-testid="yo-app-header-title"
          className="text-base font-semibold text-[#172642]"
        >
          {title}
        </span>
      </div>

      <YoLanguageSelector
        locale={locale}
        pathname={selectorPath}
        availableLocales={availableLocales}
        size="sm"
        variant="desktop-dropdown"
      />
    </div>
  );
}

export function YoAppHeader({
  locale,
  backHref,
  backLabel,
  title,
  compactTitle,
  selectorPath,
  availableLocales,
  hideLogoOnMobile,
  appearance = "auto",
  className,
  surfaceId,
}: YoAppHeaderProps): React.JSX.Element {
  return (
    <header
      data-testid="yo-app-header"
      data-yo-app-header="true"
      data-yo-app-header-surface={surfaceId}
      data-yo-app-header-appearance={appearance}
      className={cn(
        "relative z-40 border-b border-[#E7DFCF] bg-[#F4EFE6]/95 backdrop-blur-md",
        className,
      )}
    >
      {appearance === "mobile" ? (
        <MobileBar
          locale={locale}
          backHref={backHref}
          backLabel={backLabel}
          title={title}
          compactTitle={compactTitle}
          selectorPath={selectorPath}
          availableLocales={availableLocales}
          hideLogoOnMobile={hideLogoOnMobile}
        />
      ) : appearance === "desktop" ? (
        <DesktopBar
          locale={locale}
          backHref={backHref}
          backLabel={backLabel}
          title={title}
          selectorPath={selectorPath}
          availableLocales={availableLocales}
        />
      ) : (
        <>
          <div className="lg:hidden">
            <MobileBar
              locale={locale}
              backHref={backHref}
              backLabel={backLabel}
              title={title}
              compactTitle={compactTitle}
              selectorPath={selectorPath}
              availableLocales={availableLocales}
              hideLogoOnMobile={hideLogoOnMobile}
            />
          </div>
          <div className="hidden lg:block">
            <DesktopBar
              locale={locale}
              backHref={backHref}
              backLabel={backLabel}
              title={title}
              selectorPath={selectorPath}
              availableLocales={availableLocales}
            />
          </div>
        </>
      )}
    </header>
  );
}

export default YoAppHeader;
