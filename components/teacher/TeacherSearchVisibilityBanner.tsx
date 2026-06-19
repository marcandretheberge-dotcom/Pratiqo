"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { useLocale } from "@/lib/locale-context";

export function TeacherSearchVisibilityBanner({
  ctaHref = "/teacher/verification",
}: {
  ctaHref?: string;
}) {
  const { t } = useLocale();

  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-2xl border border-amber-200/90 bg-amber-50/90 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
    >
      <div className="flex min-w-0 items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-amber-950">{t("teacherSearchVisibilityBannerTitle")}</p>
          <p className="text-sm text-amber-900/90">{t("teacherSearchVisibilityBannerBody")}</p>
        </div>
      </div>
      <Link
        href={ctaHref}
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-amber-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-900"
      >
        {t("teacherSearchVisibilityBannerCta")}
      </Link>
    </div>
  );
}
