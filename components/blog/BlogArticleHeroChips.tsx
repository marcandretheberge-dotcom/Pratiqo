"use client";

import Link from "next/link";
import { useLocale } from "@/lib/locale-context";
import type { Locale } from "@/lib/i18n/types";

function teacherSignupHref(locale: Locale): string {
  return locale === "fr" ? "/devenir-enseignant" : "/become-teacher";
}

export function BlogArticleHeroChips({ showTeacherChip }: { showTeacherChip: boolean }) {
  const { t, locale } = useLocale();
  const teach = teacherSignupHref(locale);

  return (
    <div className="mt-7 flex flex-wrap gap-2">
      <Link
        href="/student/search"
        className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
      >
        {t("blogFindTeacherCta")}
      </Link>
      <Link
        href="/tarifs"
        className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
      >
        {t("blogViewPricingCta")}
      </Link>
      {showTeacherChip ? (
        <Link
          href={teach}
          className="inline-flex items-center rounded-full border border-[#7FE0C3]/40 bg-[#7FE0C3]/15 px-4 py-2 text-xs font-semibold text-[#E8FFF8] transition-colors hover:bg-[#7FE0C3]/25"
        >
          {t("blogBecomeTeacherCta")}
        </Link>
      ) : null}
    </div>
  );
}
