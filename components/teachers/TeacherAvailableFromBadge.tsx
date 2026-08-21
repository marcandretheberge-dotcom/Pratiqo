"use client";

import { getAvailableFromBadge } from "@/lib/teachers/availabilityStartDate";
import type { Locale } from "@/lib/i18n/types";
import type { TranslationKey } from "@/lib/translations";
import { cn } from "@/lib/utils";

export function TeacherAvailableFromBadge({
  availableFromDate,
  locale,
  todayIso,
  t,
  className,
}: {
  availableFromDate: string | null | undefined;
  locale: Locale;
  todayIso: string;
  t: (key: TranslationKey) => string;
  className?: string;
}) {
  const badge = getAvailableFromBadge(availableFromDate, locale, todayIso);
  if (!badge) return null;

  const label =
    badge.kind === "month"
      ? t("availableFromBadgeMonth").replace("{month}", badge.monthLabel)
      : t("availableFromBadgeDay")
          .replace("{day}", String(badge.day))
          .replace("{month}", badge.monthLabel);

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-lg border border-teal-200/80 bg-teal-50 px-2 py-1 text-[11px] font-semibold text-teal-800",
        className,
      )}
      data-testid="teacher-available-from-badge"
    >
      <span className="truncate">{label}</span>
    </span>
  );
}
