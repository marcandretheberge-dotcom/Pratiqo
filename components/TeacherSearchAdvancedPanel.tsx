"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TeacherPreference, TeacherSearchFormat } from "@/lib/teacherSearchCriteria";
import type { TranslationKey } from "@/lib/i18n/types";

type T = (key: TranslationKey) => string;

export type AdvancedFilterValues = {
  minRating: string;
  maxPrice: string;
  verifiedOnly: boolean;
  language: string;
  level: string;
  availability: string;
  teacherPreference: TeacherPreference | "";
  formatExtra: TeacherSearchFormat | "";
};

export function TeacherSearchAdvancedPanel({
  open,
  onToggle,
  values,
  onChange,
  t,
  showFormatRow,
}: {
  open: boolean;
  onToggle: () => void;
  values: AdvancedFilterValues;
  onChange: (patch: Partial<AdvancedFilterValues>) => void;
  t: T;
  showFormatRow?: boolean;
}) {
  return (
    <div className="mt-3 rounded-2xl border border-[#E8E6DF] bg-white/90">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls="advanced-search-filters"
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold text-[#2C2C2A]"
      >
        <span>{t("advancedFilters")}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-[#6B6760] transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open ? (
        <div id="advanced-search-filters" className="space-y-3 border-t border-[#E8E6DF] px-4 pb-4 pt-3">
          {showFormatRow ? (
            <label className="block space-y-1">
              <span className="text-[11px] font-semibold text-[#6B6760]">{t("landingSearchFormatLabel")}</span>
              <select
                value={values.formatExtra}
                onChange={(e) => onChange({ formatExtra: e.target.value as TeacherSearchFormat | "" })}
                className="h-10 w-full rounded-xl border border-[#E8E6DF] bg-white px-3 text-sm font-medium text-[#2C2C2A] outline-none"
              >
                <option value="">{t("radiusAll")}</option>
                <option value="no_preference">{t("quizFormatHybridNoPreference")}</option>
                <option value="online">{t("teachingFormatOnline")}</option>
                <option value="in_person">{t("teachingFormatInPerson")}</option>
                <option value="at_home">{t("teachingFormatHome")}</option>
                <option value="hybrid">{t("teachingFormatHybrid")}</option>
              </select>
            </label>
          ) : null}
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-[#6B6760]">{t("searchFieldMinRating")}</span>
            <input
              type="number"
              min={0}
              max={5}
              step={0.5}
              value={values.minRating}
              onChange={(e) => onChange({ minRating: e.target.value })}
              placeholder="4"
              className="h-10 w-full rounded-xl border border-[#E8E6DF] px-3 text-sm outline-none"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-[#6B6760]">{t("searchFieldMaxPrice")}</span>
            <input
              type="number"
              min={0}
              value={values.maxPrice}
              onChange={(e) => onChange({ maxPrice: e.target.value })}
              className="h-10 w-full rounded-xl border border-[#E8E6DF] px-3 text-sm outline-none"
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-[#2C2C2A]">
            <input
              type="checkbox"
              checked={values.verifiedOnly}
              onChange={(e) => onChange({ verifiedOnly: e.target.checked })}
              className="h-4 w-4 rounded border-[#E8E6DF]"
            />
            {t("verifiedProfiles")}
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-[#6B6760]">{t("searchFieldLanguage")}</span>
            <input
              type="text"
              value={values.language}
              onChange={(e) => onChange({ language: e.target.value })}
              className="h-10 w-full rounded-xl border border-[#E8E6DF] px-3 text-sm outline-none"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-[#6B6760]">{t("searchFieldLevel")}</span>
            <input
              type="text"
              value={values.level}
              onChange={(e) => onChange({ level: e.target.value })}
              className="h-10 w-full rounded-xl border border-[#E8E6DF] px-3 text-sm outline-none"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-[#6B6760]">{t("searchFieldAvailability")}</span>
            <input
              type="text"
              value={values.availability}
              onChange={(e) => onChange({ availability: e.target.value })}
              className="h-10 w-full rounded-xl border border-[#E8E6DF] px-3 text-sm outline-none"
            />
          </label>
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-[#6B6760]">{t("teacherPreference")}</span>
            <select
              value={values.teacherPreference}
              onChange={(e) => onChange({ teacherPreference: e.target.value as TeacherPreference | "" })}
              className="h-10 w-full rounded-xl border border-[#E8E6DF] bg-white px-3 text-sm font-medium text-[#2C2C2A] outline-none"
            >
              <option value="">{t("teacherPreferenceNone")}</option>
              <option value="female_preferred">{t("teacherPreferenceFemale")}</option>
              <option value="male_preferred">{t("teacherPreferenceMale")}</option>
            </select>
          </div>
        </div>
      ) : null}
    </div>
  );
}
