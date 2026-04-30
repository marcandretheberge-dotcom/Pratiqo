"use client";

import { useLocale } from "@/lib/locale-context";
import type { TranslationKey } from "@/lib/i18n/types";

export function TeacherDashboardStats({
  items,
}: {
  items: { labelKey: TranslationKey; value: string | number }[];
}) {
  const { t } = useLocale();
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map(({ labelKey, value }) => (
        <div
          key={labelKey}
          className="rounded-xl border border-slate-200/90 bg-white px-5 py-4 shadow-[0_4px_24px_rgba(0,0,0,0.04)]"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{t(labelKey)}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
        </div>
      ))}
    </div>
  );
}
