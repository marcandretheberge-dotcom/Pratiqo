"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  ChevronRight,
  GraduationCap,
  Languages,
  Music2,
  Search,
  SlidersHorizontal,
  UserRoundSearch,
} from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import type { TranslationKey } from "@/lib/i18n/types";
import type { Teacher } from "@/types";
import type { City } from "@/lib/cities";
import type { LandingFormatFilter } from "@/lib/landingTeacherFilter";
import { SmartSearchInput } from "@/components/SmartSearchInput";
import { LandingLocationSearch } from "@/components/marketing/LandingLocationSearch";

export type LandingSearchHeroProps = {
  query: string;
  onQueryChange: (q: string) => void;
  teachers: Teacher[];
  geo: { lat: number; lng: number } | null;
  onSelectTeacher: (t: Teacher) => void;
  onSelectDiscipline: (label: string) => void;
  locationQuery: string;
  onLocationQueryChange: (v: string) => void;
  onSelectCity: (city: City) => void;
  formatValue: LandingFormatFilter;
  onFormatChange: (v: LandingFormatFilter) => void;
  onSubmit: () => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  advancedOpen: boolean;
  onToggleAdvanced: () => void;
  onOpenQuiz?: () => void;
  /** Landing default: true. Search surfaces can hide it for focus. */
  showIntentToggle?: boolean;
  /** Landing default: true. Search surfaces should usually hide it. */
  showQuizCta?: boolean;
  /** Landing default: true. Search surfaces may hide it. */
  showOtherDisciplinesNote?: boolean;
  /** Optional slot under the advanced filters trigger. */
  extraUnderAdvanced?: React.ReactNode;
  /**
   * Forwarded to LandingLocationSearch so the parent surface can flip
   * into results mode the moment a user starts typing in the Lieu
   * field — not only after they pick a city. Optional: surfaces that
   * already track intent through other means (e.g. /student/search)
   * can ignore it.
   */
  onLocationIntentChange?: (hasIntent: boolean) => void;
};

function intentButton(active: boolean) {
  return cn(
    "inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold transition-colors sm:flex-initial sm:px-7",
    active ? "bg-teal-700 text-white shadow-sm" : "bg-transparent text-[#2C2C2A] hover:bg-white/70",
  );
}

function categoryChip(active: boolean, isAll: boolean) {
  return cn(
    "inline-flex h-12 items-center gap-2 rounded-full border px-6 text-sm font-semibold shadow-sm transition-colors",
    isAll && active
      ? "border-teal-700 bg-teal-700 text-white"
      : active
        ? "border-teal-500/35 bg-teal-500/15 text-teal-700"
        : "border-[#DCEAE3] bg-white text-[#2C2C2A] hover:bg-[#FAFCFB]",
  );
}

export function LandingSearchHero({
  query,
  onQueryChange,
  teachers,
  geo,
  onSelectTeacher,
  onSelectDiscipline,
  locationQuery,
  onLocationQueryChange,
  onSelectCity,
  formatValue,
  onFormatChange,
  onSubmit,
  selectedCategory,
  onCategoryChange,
  advancedOpen,
  onToggleAdvanced,
  onOpenQuiz,
  showIntentToggle = true,
  showQuizCta = true,
  showOtherDisciplinesNote = true,
  extraUnderAdvanced,
  onLocationIntentChange,
}: LandingSearchHeroProps) {
  const { t } = useLocale();
  const [mode, setMode] = useState<"student" | "teacher">("student");

  const categories = useMemo(
    () =>
      [
        // IDs are canonical marketplace labels used by filtering (not localized).
        { id: "Musique", labelKey: "marketplaceCategoryMusic" as TranslationKey, Icon: Music2 },
        { id: "Langues", labelKey: "marketplaceCategoryLanguages" as TranslationKey, Icon: Languages },
        { id: "Tutorat académique", labelKey: "marketplaceCategoryAcademic" as TranslationKey, Icon: BookOpen },
        { id: "All", labelKey: "filterAll" as TranslationKey, Icon: null },
      ] as const,
    [],
  );

  return (
    <section className="bg-[#F3FAF6] px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1280px] pb-12 pt-14 sm:pb-14 sm:pt-16 lg:pb-16 lg:pt-20">
        <div className="mx-auto max-w-[1120px]">
          {/* Intent toggle */}
          {showIntentToggle ? (
            <div className="flex justify-center">
              <div className="inline-flex gap-1 rounded-full border border-[#DCEAE3] bg-white p-1.5 shadow-[0_8px_24px_rgba(15,110,86,0.10)]">
                <button type="button" className={intentButton(mode === "student")} onClick={() => setMode("student")}>
                  <UserRoundSearch className="h-4 w-4 opacity-90" aria-hidden />
                  {t("iAmStudent")}
                </button>
                <button type="button" className={intentButton(mode === "teacher")} onClick={() => setMode("teacher")}>
                  <GraduationCap className="h-4 w-4 opacity-90" aria-hidden />
                  {t("iAmTeacher")}
                </button>
              </div>
            </div>
          ) : null}

          <div className={cn("text-center", showIntentToggle ? "mt-10" : "mt-2 sm:mt-4")}>
            <p className="text-sm font-semibold uppercase tracking-[0.20em] text-teal-700">{t("landingEyebrowLocal")}</p>

            {mode === "student" ? (
              <>
                <h1 className="mx-auto mt-4 max-w-[1000px] text-balance text-[36px] font-semibold leading-[1.08] tracking-tight text-[#142235] sm:text-4xl lg:text-[48px] xl:text-[56px]">
                  {t("landingNeighborhoodHeadline")}
                </h1>
                <p className="mx-auto mt-4 max-w-[720px] text-center text-xl text-[#5E6B78]">{t("teacherGridCornerLesson")}</p>
              </>
            ) : (
              <>
                <h1 className="mx-auto mt-4 max-w-[1000px] text-balance text-[36px] font-semibold leading-[1.08] tracking-tight text-[#142235] sm:text-4xl lg:text-[48px] xl:text-[56px]">
                  {t("heroTeacherTitle")}
                </h1>
                <p className="mx-auto mt-4 max-w-[720px] text-center text-base leading-snug text-[#5E6B78] sm:text-lg">
                  {t("homeTeacherSub")}
                </p>
                <div className="mt-8 flex justify-center">
                  <Link
                    href="/devenir-enseignant"
                    className="inline-flex h-12 items-center justify-center rounded-2xl bg-teal-700 px-6 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(15,110,86,0.18)] hover:bg-[#0B5F4A]"
                  >
                    {t("becomeTeacher")}
                  </Link>
                </div>
              </>
            )}
          </div>

          {mode === "student" ? (
            <>
              {/* Structured search card */}
              <div className="mx-auto mt-10 w-full max-w-[1120px] rounded-[32px] border border-[#E6E1D8] bg-white p-4 shadow-[0_20px_50px_rgba(15,110,86,0.10)] sm:p-4">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.25fr_1fr_1fr_auto] lg:items-end">
                  <div className="min-w-0">
                    <p className="mb-2 text-xs font-bold tracking-[0.14em] text-[#6B6258]">{t("landingSearchDisciplineLabel")}</p>
                    <SmartSearchInput
                      value={query}
                      onChange={onQueryChange}
                      teachers={teachers}
                      geo={geo}
                      onSelectTeacher={onSelectTeacher}
                      onSelectDiscipline={onSelectDiscipline}
                      // The Quoi segment is subject-only. Place autocomplete
                      // is wired to the dedicated Lieu field below, so a city
                      // selection can never silently overwrite the subject.
                      disableCitySuggestions
                      inputPlaceholderKey="landingSearchDisciplinePlaceholder"
                      className="w-full"
                      shellClassName="h-16 min-h-[56px] border-slate-200 py-0 shadow-none [&_svg]:h-5 [&_svg]:w-5 [&_svg]:text-teal-700"
                      inputClassName="text-lg placeholder:text-slate-500"
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="mb-2 text-xs font-bold tracking-[0.14em] text-[#6B6258]">{t("landingSearchLocationLabel")}</p>
                    <LandingLocationSearch
                      value={locationQuery}
                      onChange={onLocationQueryChange}
                      geo={geo}
                      onSelectCity={onSelectCity}
                      onIntentChange={onLocationIntentChange}
                      placeholderKey="landingSearchLocationPlaceholder"
                      className="w-full"
                      shellClassName="h-16 min-h-[56px] border-slate-200 py-0 shadow-none [&_svg]:text-teal-700"
                      inputClassName="text-lg placeholder:text-slate-500"
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="mb-2 text-xs font-bold tracking-[0.14em] text-[#6B6258]">{t("landingSearchFormatLabel")}</p>
                    <select
                      value={formatValue}
                      onChange={(e) => onFormatChange(e.target.value as LandingFormatFilter)}
                      className="h-16 w-full rounded-2xl border border-slate-200 bg-white px-4 text-lg font-semibold text-[#2C2C2A] shadow-sm outline-none focus:ring-2 focus:ring-teal-500/35"
                    >
                      <option value="all">{t("landingFormatSelectOptionAll")}</option>
                      <option value="online">{t("teachingFormatOnline")}</option>
                      <option value="in_person">{t("teachingFormatInPerson")}</option>
                      <option value="at_home">{t("teachingFormatHome")}</option>
                      <option value="hybrid">{t("teachingFormatHybrid")}</option>
                    </select>
                  </div>

                  <div className="lg:flex lg:items-end">
                    <button
                      type="button"
                      onClick={onSubmit}
                      className="inline-flex h-16 w-full items-center justify-center gap-2 rounded-[24px] bg-teal-700 px-8 text-lg font-semibold text-white shadow-[0_10px_24px_rgba(15,110,86,0.22)] transition-colors hover:bg-[#0B5F4A] lg:w-auto"
                    >
                      <Search className="h-5 w-5" aria-hidden />
                      {t("landingSearchSubmit")}
                    </button>
                  </div>
                </div>
              </div>

              {/* Category chips */}
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onCategoryChange(c.id)}
                    className={categoryChip(selectedCategory === c.id, c.id === "All")}
                  >
                    {c.Icon ? <c.Icon className="h-4 w-4 opacity-90" aria-hidden /> : null}
                    {t(c.labelKey)}
                  </button>
                ))}
              </div>

              {showOtherDisciplinesNote ? (
                <p className="mt-4 text-center text-sm text-slate-600">{t("otherDisciplines")}</p>
              ) : null}

              {/* Advanced filters (trigger only; panel renders in page.tsx) */}
              <div className="mx-auto mt-7 max-w-[760px]">
                <button
                  type="button"
                  onClick={onToggleAdvanced}
                  aria-expanded={advancedOpen}
                  aria-controls="advanced-search-filters"
                  className="flex h-16 w-full items-center justify-between rounded-2xl border border-[#DCEAE3] bg-white px-5 text-left text-sm font-semibold text-[#2C2C2A] shadow-sm transition hover:bg-[#FAFCFB]"
                >
                  <span className="inline-flex items-center gap-2">
                    <SlidersHorizontal className="h-5 w-5 text-teal-700" aria-hidden />
                    {t("advancedFilters")}
                  </span>
                  <ChevronRight className={cn("h-5 w-5 text-neutral-700 transition-transform", advancedOpen && "rotate-90")} aria-hidden />
                </button>
              </div>

              {extraUnderAdvanced ? <div className="mx-auto mt-4 max-w-[760px]">{extraUnderAdvanced}</div> : null}

              {showQuizCta ? (
                <div className="mt-10 flex justify-center">
                  <button
                    type="button"
                    onClick={onOpenQuiz}
                    className="group inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#F9D24A] px-6 text-sm font-extrabold text-[#2C2C2A] shadow-[0_12px_40px_rgba(202,154,6,0.22)] ring-1 ring-black/[0.05] transition hover:brightness-[1.02]"
                  >
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-white/70 text-[#2C2C2A] ring-1 ring-black/[0.06]">
                      ✨
                    </span>
                    {t("marketplaceQuizCta")}
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
