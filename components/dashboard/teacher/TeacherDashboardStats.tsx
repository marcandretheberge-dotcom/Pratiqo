"use client";

import { useLocale } from "@/lib/locale-context";
import type { TranslationKey } from "@/lib/i18n/types";

export type TeacherStatItem = {
  labelKey: TranslationKey;
  value: string | number;
  /**
   * Optional secondary line, e.g. "≈ EUR 314" when the viewer picked a
   * non-CAD display currency. Accounting tiles ("This month") use this to
   * keep the CAD truth prominent while still acknowledging the selector.
   */
  approx?: string | null;
};

export function TeacherDashboardStats({ items }: { items: TeacherStatItem[] }) {
  const { t } = useLocale();
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map(({ labelKey, value, approx }) => (
        <div
          key={labelKey}
          className="rounded-xl border border-slate-200/90 bg-white px-5 py-4 shadow-[0_4px_24px_rgba(0,0,0,0.04)]"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{t(labelKey)}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
          {approx ? (
            <p className="mt-0.5 text-[11px] font-semibold tabular-nums text-slate-500">{approx}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
