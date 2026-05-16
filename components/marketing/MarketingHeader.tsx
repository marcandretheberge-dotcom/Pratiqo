"use client";

import Link from "next/link";
import PratiqoLogo from "@/components/PratiqoLogo";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { CurrencySwitcher } from "@/components/CurrencySwitcher";
import { useLocale } from "@/lib/locale-context";
import { withLocaleHref } from "@/lib/i18n/marketingPaths";

/**
 * Canonical public marketing header — matches the homepage (`/fr`) nav:
 * logo, currency, language, Tarifs, Ressources, Devenir professeur, Se connecter.
 * Mobile/tablet: secondary row with main nav links (crawlable in HTML).
 */
export function MarketingHeader() {
  const { t, locale } = useLocale();
  const homeHref = withLocaleHref("/", locale);
  const tarifsHref = withLocaleHref("/tarifs", locale);
  const resourcesHref = withLocaleHref("/blog", locale);
  const becomeTeacherHref = withLocaleHref("/become-teacher", locale);

  const navLinkClass =
    "inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors";
  const mobileNavLinkClass =
    "text-[11px] font-semibold text-slate-600 hover:text-teal-700 transition-colors";

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#D3D1C7]">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-4 sm:px-6">
        <Link href={homeHref} className="flex shrink-0 items-center gap-2" aria-label={t("navHome")}>
          <span className="md:hidden">
            <PratiqoLogo variant="icon" size="md" priority={false} fetchPriority="low" loading="lazy" />
          </span>
          <span className="hidden md:block">
            <PratiqoLogo variant="full" size="md" priority={false} fetchPriority="low" loading="lazy" />
          </span>
        </Link>

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <CurrencySwitcher variant="light" />
          <LocaleSwitcher variant="light" />
          <Link href={tarifsHref} className={`${navLinkClass} hidden lg:inline-flex`}>
            {t("navPricing")}
          </Link>
          <Link href={resourcesHref} className={`${navLinkClass} hidden lg:inline-flex`}>
            {t("navResources")}
          </Link>
          <Link
            href={becomeTeacherHref}
            className="hidden items-center rounded-xl border border-teal-700 px-3 py-1.5 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-700/8 lg:inline-flex"
          >
            {t("becomeTeacher")}
          </Link>
          <Link href="/login" prefetch={false} className="shrink-0 text-sm font-medium text-teal-700 hover:underline">
            {t("signIn")}
          </Link>
        </div>
      </div>

      <nav
        className="flex justify-center gap-4 border-t border-[#E8E6DF] px-4 py-2 lg:hidden"
        aria-label={t("navResources")}
      >
        <Link href={tarifsHref} className={mobileNavLinkClass}>
          {t("navPricing")}
        </Link>
        <Link href={resourcesHref} className={mobileNavLinkClass}>
          {t("navResources")}
        </Link>
        <Link href={becomeTeacherHref} className={mobileNavLinkClass}>
          {t("becomeTeacher")}
        </Link>
      </nav>
    </header>
  );
}
