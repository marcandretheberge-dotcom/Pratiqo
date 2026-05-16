"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import PratiqoLogo from "@/components/PratiqoLogo";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { CurrencySwitcher } from "@/components/CurrencySwitcher";
import { useLocale } from "@/lib/locale-context";
import { withLocaleHref } from "@/lib/i18n/marketingPaths";

/**
 * Canonical public marketing header - matches the homepage (`/fr`) nav:
 * logo, currency, language, Tarifs, Ressources, Devenir professeur, Se connecter.
 * Mobile/tablet: visible currency + language codes, nav links in hamburger menu.
 */
export function MarketingHeader() {
  const { t, locale } = useLocale();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [headerControlSize, setHeaderControlSize] = useState<"default" | "sm">("sm");

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileMenuOpen]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => setHeaderControlSize(media.matches ? "default" : "sm");
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const homeHref = withLocaleHref("/", locale);
  const tarifsHref = withLocaleHref("/tarifs", locale);
  const resourcesHref = withLocaleHref("/blog", locale);
  const becomeTeacherHref = withLocaleHref("/become-teacher", locale);

  const navLinkClass =
    "items-center text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors";
  const mobileNavLinkClass =
    "flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-teal-50 hover:text-teal-800";

  return (
    <header className="sticky top-0 z-50 overflow-x-clip border-b border-[#D3D1C7] bg-white">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-3 px-3 sm:px-6">
        <Link href={homeHref} className="flex shrink-0 items-center gap-2" aria-label={t("navHome")}>
          <span className="md:hidden">
            <PratiqoLogo variant="icon" size="md" priority={false} fetchPriority="low" loading="lazy" />
          </span>
          <span className="hidden md:block">
            <PratiqoLogo variant="full" size="md" priority={false} fetchPriority="low" loading="lazy" />
          </span>
        </Link>

        <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2 lg:gap-3">
          <CurrencySwitcher variant="light" size={headerControlSize} />
          <LocaleSwitcher variant="light" size={headerControlSize} />
          <Link href={tarifsHref} className={`hidden ${navLinkClass} lg:inline-flex`}>
            {t("navPricing")}
          </Link>
          <Link href={resourcesHref} className={`hidden ${navLinkClass} lg:inline-flex`}>
            {t("navResources")}
          </Link>
          <Link
            href={becomeTeacherHref}
            className="hidden items-center rounded-xl border border-teal-700 px-3 py-1.5 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-700/8 lg:inline-flex"
          >
            {t("becomeTeacher")}
          </Link>
          <Link
            href="/login"
            prefetch={false}
            className="hidden shrink-0 text-sm font-medium text-teal-700 hover:underline lg:inline-flex"
          >
            {t("signIn")}
          </Link>
          <button
            type="button"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="marketing-mobile-menu"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 lg:hidden"
          >
            {mobileMenuOpen ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
          </button>
        </div>
      </div>

      {mobileMenuOpen ? (
        <nav
          id="marketing-mobile-menu"
          className="border-t border-[#E8E6DF] bg-white px-3 py-3 shadow-sm lg:hidden"
          aria-label="Mobile navigation"
        >
          <div className="mx-auto flex max-w-[480px] flex-col gap-1">
            <Link href={tarifsHref} className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)}>
              {t("navPricing")}
            </Link>
            <Link href={resourcesHref} className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)}>
              {t("navResources")}
            </Link>
            <Link href={becomeTeacherHref} className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)}>
              {t("becomeTeacher")}
            </Link>
            <Link href="/login" prefetch={false} className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)}>
              {t("signIn")}
            </Link>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
