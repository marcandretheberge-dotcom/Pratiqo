"use client";

import Link from "next/link";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import { teacherSetupSectionHref } from "@/lib/auth/teacherLoginRouting";
import type { TeacherSetupChecklistItem } from "@/lib/teachers/teacherSetupProgress";

export function TeacherProfileSetupChecklist({
  items,
  ctaHref,
}: {
  items: TeacherSetupChecklistItem[];
  ctaHref: string;
}) {
  const { t } = useLocale();
  const incomplete = items.filter((item) => !item.done);

  if (incomplete.length === 0) return null;

  return (
    <div
      className="rounded-2xl border border-teal-200/80 bg-white p-5 shadow-sm"
      data-testid="teacher-profile-setup-checklist"
    >
      <p className="text-sm font-semibold text-slate-900">{t("teacherSetupChecklistTitle")}</p>
      <p className="mt-1 text-sm text-slate-600">{t("teacherSetupChecklistBody")}</p>
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={teacherSetupSectionHref(item.id)}
              className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm transition hover:bg-teal-50/80"
            >
              {item.done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-700" aria-hidden />
              ) : (
                <CircleDashed className="h-4 w-4 shrink-0 text-amber-700" aria-hidden />
              )}
              <span className={item.done ? "text-slate-600 line-through" : "font-medium text-slate-900"}>
                {t(item.labelKey)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href={ctaHref}
        className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
        data-testid="teacher-setup-checklist-cta"
      >
        {t("teacherSearchVisibilityBannerCta")}
      </Link>
    </div>
  );
}
