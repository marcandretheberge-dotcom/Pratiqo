"use client";

import { X } from "lucide-react";
import {
  TeacherSearchAdvancedPanel,
  type AdvancedFilterValues,
} from "@/components/TeacherSearchAdvancedPanel";
import { useLocale } from "@/lib/locale-context";

export function MarketplaceFiltersSheet({
  open,
  onClose,
  values,
  onChange,
  showFormatRow,
}: {
  open: boolean;
  onClose: () => void;
  values: AdvancedFilterValues;
  onChange: (patch: Partial<AdvancedFilterValues>) => void;
  showFormatRow?: boolean;
}) {
  const { t } = useLocale();

  return (
    <>
      <div className="hidden lg:block">
        <TeacherSearchAdvancedPanel
          open={open}
          onToggle={onClose}
          values={values}
          onChange={onChange}
          t={t}
          showFormatRow={showFormatRow}
          hideTrigger
          panelId="advanced-search-filters"
        />
      </div>

      {open ? (
        <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true" aria-labelledby="marketplace-filters-title">
          <button
            type="button"
            aria-label={t("close")}
            className="absolute inset-0 bg-[#2C2C2A]/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[86dvh] overflow-hidden rounded-t-[28px] border border-[#DCEAE3] bg-[#FAFCFB] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E8E6DF] bg-white px-5 py-4">
              <div>
                <p id="marketplace-filters-title" className="text-base font-extrabold text-[#2C2C2A]">
                  {t("advancedFilters")}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t("close")}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E8E6DF] bg-white text-[#2C2C2A] shadow-sm transition hover:bg-[#F3FAF6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/35"
              >
                <X size={18} aria-hidden />
              </button>
            </div>

            <div className="max-h-[calc(86dvh-8.5rem)] overflow-y-auto px-4 pb-4">
              <TeacherSearchAdvancedPanel
                open
                onToggle={onClose}
                values={values}
                onChange={onChange}
                t={t}
                showFormatRow={showFormatRow}
                hideTrigger
                panelId="marketplace-filters-sheet-fields"
              />
            </div>

            <div className="border-t border-[#E8E6DF] bg-white p-4">
              <button
                type="button"
                onClick={onClose}
                className="h-12 w-full rounded-2xl bg-teal-700 text-sm font-extrabold text-white shadow-[0_12px_32px_rgba(15,110,86,0.20)] transition hover:bg-[#0B5F4A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
              >
                {t("close")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
