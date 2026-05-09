"use client";

import Link from "next/link";
import PratiqoLogo from "@/components/PratiqoLogo";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { useLocale } from "@/lib/locale-context";

export function LandingHeader() {
  const { t } = useLocale();
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
      <div className="flex items-center gap-3">
        <LocaleSwitcher variant="light" />
        <Link
          href="/tarifs"
          className="hidden sm:inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          {t("navPricing") || "Tarifs"}
        </Link>
        <Link
          href="/blog"
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
        <Link href="/login" className="text-sm text-teal-700 font-medium hover:underline">
          {t("signIn")}
        </Link>
      </div>
    </header>
  );
}
