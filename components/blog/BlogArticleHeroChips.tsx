"use client";

import Link from "next/link";
import { useLocale } from "@/lib/locale-context";
import { useAuth } from "@/components/AuthProvider";
import { withLocaleHref } from "@/lib/i18n/marketingPaths";

export function BlogArticleHeroChips({ showTeacherChip }: { showTeacherChip: boolean }) {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const teach = withLocaleHref("/become-teacher", locale);
  const studentSearchHref = user ? "/student/search" : "/login?next=/student/search";

  return (
    <div className="mt-7 flex flex-wrap gap-2">
      <Link
        href={studentSearchHref}
        prefetch={false}
        className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
      >
        {t("blogFindTeacherCta")}
      </Link>
      <Link
        href={withLocaleHref("/tarifs", locale)}
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
