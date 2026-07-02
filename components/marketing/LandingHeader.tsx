"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import PratiqoLogo from "@/components/PratiqoLogo";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { useLocale } from "@/lib/locale-context";
import { YoNavButton } from "@/components/yo/YoNavButton";
import { resolveLoginHrefWithPendingTeacherIntent } from "@/lib/auth/pendingTeacherIntent";

export function LandingHeader() {
  const { t } = useLocale();
  const [loginHref, setLoginHref] = useState("/login");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setLoginHref(resolveLoginHrefWithPendingTeacherIntent("/login"));
  }, []);

  const loginLabel = t("navLogin");
  const mobileLinks = [
    { href: "/trouver-un-prof", label: t("findTeacher") },
    { href: "/devenir-enseignant", label: t("becomeTeacher") },
    { href: "/tarifs", label: t("navPricing") || "Tarifs" },
    { href: "/ressources", label: t("navResources") },
    { href: "/blog", label: t("navBlog") },
    { href: loginHref, label: loginLabel, prefetch: false },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#D3D1C7] h-14 flex items-center justify-between px-4 sm:px-6">
      <Link href="/" className="flex items-center gap-2">
        <span className="md:hidden">
          <PratiqoLogo variant="icon" size="md" priority={false} fetchPriority="low" loading="lazy" />
        </span>
        <span className="hidden md:block">
          <PratiqoLogo variant="full" size="md" priority={false} fetchPriority="low" loading="lazy" />
        </span>
      </Link>
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden sm:flex items-center gap-3">
          <YoNavButton />
          <LocaleSwitcher variant="light" />
        </div>
        <Link
          href="/tarifs"
          className="hidden sm:inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          {t("navPricing") || "Tarifs"}
        </Link>
        <Link
          href="/ressources"
          className="hidden sm:inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          {t("navResources")}
        </Link>
        <Link
          href="/devenir-enseignant"
          className="hidden sm:inline-flex items-center rounded-xl border border-teal-700 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-700/8 transition-colors"
        >
          {t("becomeTeacher")}
        </Link>
        <Link
          href={loginHref}
          prefetch={false}
          data-testid="landing-mobile-login-link"
          className="inline-flex shrink-0 items-center rounded-xl border border-teal-700 px-3 py-1.5 text-xs font-bold text-teal-700 transition-colors hover:bg-teal-700/8 sm:rounded-none sm:border-0 sm:px-0 sm:py-0 sm:text-sm sm:font-medium sm:hover:bg-transparent sm:hover:underline"
        >
          {loginLabel}
        </Link>
        <button
          type="button"
          aria-label={mobileMenuOpen ? t("navCloseMenu") : t("navOpenMenu")}
          aria-expanded={mobileMenuOpen}
          aria-controls="landing-mobile-menu"
          onClick={() => setMobileMenuOpen((open) => !open)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 sm:hidden"
          data-testid="landing-mobile-menu-button"
        >
          {mobileMenuOpen ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
        </button>
      </div>
      {mobileMenuOpen ? (
        <div
          id="landing-mobile-menu"
          className="absolute left-4 right-4 top-[calc(100%+8px)] rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_20px_60px_rgba(15,23,42,0.16)] sm:hidden"
          data-testid="landing-mobile-menu"
        >
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
            <YoNavButton variant="mobile" />
            <LocaleSwitcher variant="light" compact />
          </div>
          <nav aria-label={t("navMobileMenuLabel")} className="grid gap-1">
            {mobileLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={item.prefetch}
                onClick={() => setMobileMenuOpen(false)}
                className="flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
