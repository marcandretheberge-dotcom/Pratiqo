"use client";

import { Search } from "lucide-react";
import { SmartSearchInput } from "@/components/SmartSearchInput";
import { LandingLocationSearch } from "@/components/marketing/LandingLocationSearch";
import { useLocale } from "@/lib/locale-context";
import type { Teacher } from "@/types";
import type { City } from "@/lib/cities";
import type { LandingFormatFilter } from "@/lib/landingTeacherFilter";
import type { TranslationKey } from "@/lib/translations";

export function LandingDiscoverySearch({
  searchQuery,
  onSearchQueryChange,
  locationSearch,
  onLocationSearchChange,
  geo,
  onSelectTeacher,
  onSelectDiscipline,
  onSelectCity,
  formatFilter,
  onFormatFilterChange,
  onSearchSubmit,
  searchInputPlaceholderKey,
  teachersForSearch,
}: {
  teachersForSearch: Teacher[];
  searchQuery: string;
  onSearchQueryChange: (v: string) => void;
  locationSearch: string;
  onLocationSearchChange: (v: string) => void;
  geo: { lat: number; lng: number } | null;
  onSelectTeacher: (t: Teacher) => void;
  onSelectDiscipline: (label: string) => void;
  onSelectCity: (c: City) => void;
  formatFilter: LandingFormatFilter;
  onFormatFilterChange: (v: LandingFormatFilter) => void;
  onSearchSubmit: () => void;
  searchInputPlaceholderKey: TranslationKey;
}) {
  const { t } = useLocale();

  const fmtOptions: { v: LandingFormatFilter; lab: TranslationKey }[] = [
    { v: "all", lab: "landingFormatSelectOptionAll" },
    { v: "online", lab: "landingFormatOnlineOpt" },
    { v: "in_person", lab: "landingFormatInPersonOpt" },
    { v: "hybrid", lab: "landingFormatHybridOpt" },
  ];

  return (
    <div
      role="search"
      className="rounded-3xl border border-[#E4E2DA] bg-white p-2 text-left shadow-[0_6px_20px_rgba(44,44,42,0.06)] lg:p-3 lg:shadow-[0_8px_32px_rgba(44,44,42,0.07)]"
    >
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <label htmlFor="landing-discipline" className="block pl-1 text-[10px] font-bold uppercase tracking-wider text-neutral-700">
            {t("landingSearchDisciplineLabel")}
          </label>
          <div className="[&_input]:rounded-2xl [&_>div]:rounded-2xl [&_>div]:border-[#EFECE6] [&_>div]:shadow-none">
            <SmartSearchInput
              value={searchQuery}
              onChange={onSearchQueryChange}
              teachers={teachersForSearch}
              geo={geo}
              onSelectTeacher={onSelectTeacher}
              onSelectDiscipline={(label) => {
                onSelectDiscipline(label);
                onSearchQueryChange("");
              }}
              // The Quoi segment is subject-only. Cities live in the
              // dedicated Lieu segment so place suggestions can never
              // overwrite the subject text. (See LandingLocationSearch
              // below for the dedicated place autocomplete.)
              disableCitySuggestions
              inputPlaceholderKey={searchInputPlaceholderKey}
              className=""
            />
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-1 lg:max-w-[260px]">
          <label className="block pl-1 text-[10px] font-bold uppercase tracking-wider text-neutral-700" htmlFor="landing-loc-trigger">
            {t("landingSearchLocationLabel")}
          </label>
          <LandingLocationSearch
            value={locationSearch}
            onChange={onLocationSearchChange}
            geo={geo}
            onSelectCity={onSelectCity}
            placeholderKey="landingSearchLocationPlaceholder"
            className="w-full [&_>_div]:rounded-2xl"
          />
        </div>

        <div className="min-w-0 flex-1 space-y-1 lg:max-w-[200px]">
          <label htmlFor="landing-format" className="block pl-1 text-[10px] font-bold uppercase tracking-wider text-neutral-700">
            {t("landingSearchFormatLabel")}
          </label>
          <select
            id="landing-format"
            value={formatFilter}
            onChange={(e) => onFormatFilterChange(e.target.value as LandingFormatFilter)}
            aria-label={t("landingSearchFormatLabel")}
            className="h-[46px] w-full rounded-2xl border border-[#E8E6DF] bg-[#FAFCFB] px-4 text-sm font-medium text-[#2C2C2A] outline-none ring-0 focus:border-teal-700/40"
          >
            {fmtOptions.map((o) => (
              <option key={o.v} value={o.v}>
                {t(o.lab)}
              </option>
            ))}
          </select>
        </div>

        <div className="shrink-0 pt-5 lg:pt-0 lg:pb-px">
          <button
            type="button"
            onClick={onSearchSubmit}
            className="flex h-[46px] w-full items-center justify-center gap-2 rounded-full bg-teal-700 px-8 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#0c5c48] lg:w-auto lg:min-w-[132px]"
          >
            <Search size={16} aria-hidden />
            {t("landingSearchSubmit")}
          </button>
        </div>
      </div>
    </div>
  );
}
