"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TeacherPreference, TeacherSearchFormat } from "@/lib/teacherSearchCriteria";
import type { DayKey, PeriodKey } from "@/lib/slots";
import type { TranslationKey } from "@/lib/i18n/types";

type T = (key: TranslationKey) => string;

export type AdvancedFilterValues = {
  minRating: string;
  maxPrice: string;
  verifiedOnly: boolean;
  language: string;
  level: string;
  /**
   * Structured availability filter — V1 ships with day + period dropdowns.
   * Empty string means "any". Backed by `lib/slots.ts` constants so the
   * search UI and the booking modal agree on the day/period vocabulary.
   */
  availabilityDay: DayKey | "";
  availabilityPeriod: PeriodKey | "";
  teacherPreference: TeacherPreference | "";
  formatExtra: TeacherSearchFormat | "";
};

const DAY_OPTIONS: ReadonlyArray<{ value: DayKey; labelKey: TranslationKey }> = [
  { value: "lun", labelKey: "dayMonday" },
  { value: "mar", labelKey: "dayTuesday" },
  { value: "mer", labelKey: "dayWednesday" },
  { value: "jeu", labelKey: "dayThursday" },
  { value: "ven", labelKey: "dayFriday" },
  { value: "sam", labelKey: "daySaturday" },
  { value: "dim", labelKey: "daySunday" },
] as const;

const PERIOD_OPTIONS: ReadonlyArray<{ value: PeriodKey; labelKey: TranslationKey }> = [
  { value: "matin", labelKey: "morning" },
  { value: "apresmidi", labelKey: "afternoon" },
  { value: "soir", labelKey: "evening" },
] as const;

/**
 * "Disponibilité" section — replaces the previous free-text availability
 * input. Two dropdowns + a clear button so the student can express
 * "Mardi soir" precisely. The matcher behind this is the same parser the
 * booking modal already uses, so search and booking can never disagree.
 */
function AvailabilitySection({
  values,
  onChange,
  t,
}: {
  values: AdvancedFilterValues;
  onChange: (patch: Partial<AdvancedFilterValues>) => void;
  t: T;
}) {
  const hasAny = values.availabilityDay !== "" || values.availabilityPeriod !== "";
  return (
    <fieldset
      data-testid="teacher-search-availability"
      className="space-y-2 rounded-xl border border-[#E8E6DF] bg-white px-3 py-3"
    >
      <legend className="px-1 text-[11px] font-semibold text-[#6B6760]">
        {t("searchAvailabilityLabel")}
      </legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[#6B6760]">
            {t("searchAvailabilityDay")}
          </span>
          <select
            data-testid="teacher-search-availability-day"
            value={values.availabilityDay}
            onChange={(e) => onChange({ availabilityDay: e.target.value as DayKey | "" })}
            className="h-10 w-full rounded-xl border border-[#E8E6DF] bg-white px-3 text-sm font-medium text-[#2C2C2A] outline-none"
          >
            <option value="">{t("searchAvailabilityDayAny")}</option>
            {DAY_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {t(d.labelKey)}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[#6B6760]">
            {t("searchAvailabilityPeriod")}
          </span>
          <select
            data-testid="teacher-search-availability-period"
            value={values.availabilityPeriod}
            onChange={(e) => onChange({ availabilityPeriod: e.target.value as PeriodKey | "" })}
            className="h-10 w-full rounded-xl border border-[#E8E6DF] bg-white px-3 text-sm font-medium text-[#2C2C2A] outline-none"
          >
            <option value="">{t("searchAvailabilityPeriodAny")}</option>
            {PERIOD_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {t(p.labelKey)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {hasAny ? (
        <button
          type="button"
          data-testid="teacher-search-availability-clear"
          onClick={() => onChange({ availabilityDay: "", availabilityPeriod: "" })}
          className="text-[11px] font-semibold text-teal-700 underline-offset-2 hover:underline"
        >
          {t("searchAvailabilityClear")}
        </button>
      ) : null}
    </fieldset>
  );
}

export function TeacherSearchAdvancedPanel({
  open,
  onToggle,
  values,
  onChange,
  t,
  showFormatRow,
  hideTrigger,
}: {
  open: boolean;
  onToggle: () => void;
  values: AdvancedFilterValues;
  onChange: (patch: Partial<AdvancedFilterValues>) => void;
  t: T;
  showFormatRow?: boolean;
  hideTrigger?: boolean;
}) {
  if (hideTrigger) {
    return open ? (
      <div className="mt-4 rounded-2xl border border-[#DCEAE3] bg-white shadow-[0_8px_28px_rgba(15,110,86,0.06)]">
        <div id="advanced-search-filters" className="space-y-3 px-4 pb-4 pt-4">
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
              step={1}
              value={values.maxPrice}
              onChange={(e) => onChange({ maxPrice: e.target.value })}
              placeholder="60"
              className="h-10 w-full rounded-xl border border-[#E8E6DF] px-3 text-sm outline-none"
            />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-xl border border-[#E8E6DF] bg-white px-3 py-2.5">
            <span className="text-sm font-semibold text-[#2C2C2A]">{t("verifiedTeachersOnly")}</span>
            <input
              type="checkbox"
              checked={values.verifiedOnly}
              onChange={(e) => onChange({ verifiedOnly: e.target.checked })}
              className="h-4 w-4 accent-teal-700"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-[#6B6760]">{t("searchFieldLanguage")}</span>
            <input
              type="text"
              value={values.language}
              onChange={(e) => onChange({ language: e.target.value })}
              placeholder={t("searchFieldLanguagePlaceholder")}
              className="h-10 w-full rounded-xl border border-[#E8E6DF] px-3 text-sm outline-none"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-[#6B6760]">{t("searchFieldLevel")}</span>
            <input
              type="text"
              value={values.level}
              onChange={(e) => onChange({ level: e.target.value })}
              placeholder={t("searchFieldLevelPlaceholder")}
              className="h-10 w-full rounded-xl border border-[#E8E6DF] px-3 text-sm outline-none"
            />
          </label>
          <AvailabilitySection values={values} onChange={onChange} t={t} />
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-[#6B6760]">{t("searchFieldTeacherPreference")}</span>
            <select
              value={values.teacherPreference}
              onChange={(e) => onChange({ teacherPreference: e.target.value as TeacherPreference | "" })}
              className="h-10 w-full rounded-xl border border-[#E8E6DF] bg-white px-3 text-sm font-medium text-[#2C2C2A] outline-none"
            >
              <option value="">{t("radiusAll")}</option>
              <option value="no_preference">{t("teacherPrefNoPreference")}</option>
              <option value="female_preferred">{t("teacherPrefFemale")}</option>
              <option value="male_preferred">{t("teacherPrefMale")}</option>
            </select>
          </label>
        </div>
      </div>
    ) : null;
  }

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
          <AvailabilitySection values={values} onChange={onChange} t={t} />
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
