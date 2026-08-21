"use client";

import Link from "next/link";
import { useLocale } from "@/lib/locale-context";

type Props = {
  /** When true, emphasize that legacy Matin/Après-midi/Soir blocks are unused. */
  hasLegacyBlocks: boolean;
};

/**
 * Strong non-blocking banner on Horaire while precise intervals are missing.
 */
export function TeacherScheduleIntervalMigrationBanner({ hasLegacyBlocks }: Props) {
  const { t } = useLocale();

  return (
    <div
      className="rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm sm:p-5"
      data-testid="teacher-schedule-interval-migration-banner"
      role="status"
    >
      <p className="text-sm font-bold text-amber-950">{t("weeklyIntervalsMigrationBannerTitle")}</p>
      <p className="mt-1 text-xs leading-5 text-amber-900">{t("weeklyIntervalsMigrationBannerBody")}</p>
      {hasLegacyBlocks ? (
        <p className="mt-2 text-xs leading-5 font-semibold text-amber-950">
          {t("weeklyIntervalsMigrationBannerLegacyNote")}
        </p>
      ) : (
        <p className="mt-2 text-xs leading-5 text-amber-900">{t("weeklyIntervalsMigrationTeacherHint")}</p>
      )}
      <Link
        href="#teacher-weekly-intervals-editor"
        className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-teal-700 px-3 text-xs font-bold text-white hover:bg-teal-800"
        data-testid="teacher-schedule-interval-migration-banner-cta"
      >
        {t("weeklyIntervalsMigrationBannerCta")}
      </Link>
    </div>
  );
}
