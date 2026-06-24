"use client";

import Link from "next/link";
import PratiqoLogo from "@/components/PratiqoLogo";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { useLocale } from "@/lib/locale-context";
import type { Locale } from "@/lib/i18n/types";

function teacherSignupHref(locale: Locale): string {
  return locale === "fr" ? "/devenir-enseignant" : "/become-teacher";
}

export function BlogPublicHeader() {
  const { t, locale } = useLocale();
  const applyHref = teacherSignupHref(locale);

  return (
    <header className="sticky top-0 z-50 border-b border-[#E8E6DE] bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label={t("navHome")}>
          <span className="md:hidden">
            <PratiqoLogo variant="icon" size="md" priority={false} fetchPriority="low" loading="lazy" />
          </span>
          <span className="hidden md:block">
            <PratiqoLogo variant="full" size="md" priority={false} fetchPriority="low" loading="lazy" />
          </span>
        </Link>

        <nav className="hidden flex-wrap items-center justify-end gap-x-1 md:flex" aria-label="Blog">
          <Link
            href="/ressources"
            className="rounded-lg px-2.5 py-2 text-xs font-semibold text-[#5C5C5C] transition-colors hover:bg-black/[0.03] hover:text-[#0F6E56]"
          >
            {t("navResources")}
          </Link>
          <Link
            href="/blog"
            className="rounded-lg px-2.5 py-2 text-xs font-semibold text-[#5C5C5C] transition-colors hover:bg-black/[0.03] hover:text-[#0F6E56]"
          >
            {t("navBlog")}
          </Link>
          <Link
            href="/tarifs"
            className="rounded-lg px-2.5 py-2 text-xs font-semibold text-[#5C5C5C] transition-colors hover:bg-black/[0.03] hover:text-[#0F6E56]"
          >
            {t("navPricing")}
          </Link>
          <Link
            href={applyHref}
            className="rounded-lg px-2.5 py-2 text-xs font-semibold text-[#5C5C5C] transition-colors hover:bg-black/[0.03] hover:text-[#0F6E56]"
          >
            {t("becomeTeacher")}
          </Link>
          <LocaleSwitcher variant="light" compact />
          <Link
            href="/login"
            className="ml-1 rounded-xl border border-[#0F6E56]/25 px-3 py-1.5 text-xs font-semibold text-[#0F6E56] transition-colors hover:bg-[#EFF8F4]"
          >
            {t("signIn")}
          </Link>
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <LocaleSwitcher variant="light" compact />
          <Link href="/login" className="rounded-lg px-2 py-1.5 text-xs font-semibold text-[#0F6E56]">
            {t("signIn")}
          </Link>
        </div>
      </div>
      <nav
        className="flex justify-center gap-3 border-t border-[#F0EFE8] px-4 py-2 text-[11px] font-semibold md:hidden"
        aria-label="Blog mobile"
      >
        <Link href="/ressources" className="text-[#5C5C5C]">
          {t("navResources")}
        </Link>
        <Link href="/blog" className="text-[#5C5C5C]">
          {t("navBlog")}
        </Link>
        <Link href="/tarifs" className="text-[#5C5C5C]">
          {t("navPricing")}
        </Link>
        <Link href={applyHref} className="text-[#5C5C5C]">
          {t("becomeTeacher")}
        </Link>
      </nav>
    </header>
  );
}
