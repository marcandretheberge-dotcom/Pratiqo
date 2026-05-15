"use client";

import Link from "next/link";
import { useLocale } from "@/lib/locale-context";

export function TeacherProfileCompletenessCard({
  percent,
  ctaHref,
}: {
  percent: number;
  ctaHref: string;
}) {
  const { t } = useLocale();
  const safe = Math.min(100, Math.max(0, percent));

  return (
    <div className="rounded-2xl border border-[#DCEAE3] bg-white p-5 shadow-[0_14px_44px_rgba(44,44,42,0.06)]">
      <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#526056]">{t("profileCompletenessTitle")}</h3>
      <p className="mt-1 text-xs text-slate-600">{t("profileCompletenessHint")}</p>
      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-3xl font-bold tabular-nums text-[#00694c]">{safe}%</span>
          <span className="text-xs font-medium text-slate-600">{t("profileCompletenessLabel")}</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#F1EFE8]">
          <div
            className="h-full rounded-full bg-[#00694c] transition-[width] duration-500"
            style={{ width: `${safe}%` }}
          />
        </div>
      </div>
      <Link
        href={ctaHref}
        className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-[#00694c] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(0,105,76,0.22)] transition-all hover:bg-[#008560]"
      >
        {t("profileCompletenessCta")}
      </Link>
    </div>
  );
}
