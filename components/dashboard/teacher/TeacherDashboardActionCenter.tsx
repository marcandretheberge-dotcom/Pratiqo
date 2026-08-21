/**
 * “À faire aujourd’hui” — compact action center for the teacher dashboard.
 * Uses real counts only; hides calm rows when count is zero except for schedule.
 */

"use client";

import Link from "next/link";
import { useLocale } from "@/lib/locale-context";
import { cn } from "@/lib/utils";

export type TeacherDashboardActionItem = {
  id: string;
  label: string;
  /** Optional supporting line under the label (e.g. migration guidance). */
  description?: string;
  count?: number | null;
  href: string;
  cta: string;
  /** When true, show even if count is 0. */
  alwaysShow?: boolean;
  urgent?: boolean;
};

export type TeacherDashboardActionCenterProps = {
  items: TeacherDashboardActionItem[];
  className?: string;
};

export function TeacherDashboardActionCenter({ items, className }: TeacherDashboardActionCenterProps) {
  const { t } = useLocale();
  const visible = items.filter((item) => item.alwaysShow || (typeof item.count === "number" && item.count > 0));
  const hasUrgent = visible.some(
    (item) => item.urgent && (item.alwaysShow || (typeof item.count === "number" && item.count > 0)),
  );

  return (
    <section
      className={cn(
        "rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_4px_24px_rgba(0,0,0,0.04)] sm:p-5",
        className,
      )}
      data-testid="teacher-dashboard-action-center"
      aria-labelledby="teacher-dash-action-center-heading"
    >
      <h2
        id="teacher-dash-action-center-heading"
        className="text-[11px] font-bold uppercase tracking-widest text-[#00694c]"
      >
        {t("teacherDashActionCenterTitle")}
      </h2>

      {visible.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600" data-testid="teacher-dash-action-center-empty">
          {t("teacherDashActionCenterEmpty")}
        </p>
      ) : (
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {visible.map((item) => {
            const countLabel =
              typeof item.count === "number" ? (
                <span className="tabular-nums font-bold text-slate-900">{item.count}</span>
              ) : null;
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600",
                    item.urgent && (item.alwaysShow || (item.count ?? 0) > 0)
                      ? "border-amber-200 bg-amber-50/80 hover:bg-amber-50"
                      : "border-slate-100 bg-[#fafaf8] hover:bg-slate-50",
                  )}
                  data-testid={`teacher-dash-action-${item.id}`}
                >
                  <span className="min-w-0">
                    <span className="block font-semibold text-slate-900">
                      {countLabel ? (
                        <>
                          {countLabel} {item.label}
                        </>
                      ) : (
                        item.label
                      )}
                    </span>
                    {item.description ? (
                      <span className="mt-0.5 block text-xs leading-4 text-slate-600">{item.description}</span>
                    ) : null}
                    <span className="mt-0.5 block text-xs font-medium text-teal-700">{item.cta}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {!hasUrgent && visible.length > 0 ? (
        <p className="mt-3 text-xs text-slate-500">{t("teacherDashActionCenterNoUrgent")}</p>
      ) : null}
    </section>
  );
}
