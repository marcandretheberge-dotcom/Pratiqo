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
  onLieuIntentChange,
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
  /** Forwarded to LandingLocationSearch to flip results mode while typing. */
  onLieuIntentChange?: (hasIntent: boolean) => void;
}) {
  const { t } = useLocale();

  const fmtOptions: { v: LandingFormatFilter; lab: TranslationKey }[] = [
    { v: "all", lab: "landingHomepageAnyFormat" },
    { v: "online", lab: "landingFormatOnlineOpt" },
    { v: "in_person", lab: "landingFormatInPersonOpt" },
    { v: "hybrid", lab: "landingFormatHybridOpt" },
  ];

  return (
    <form
      role="search"
      aria-label={t("landingSearchSubmit")}
      onSubmit={(event) => {
        event.preventDefault();
        onSearchSubmit();
      }}
      className="min-w-0 text-left"
    >
      <div className="grid min-w-0 grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <div className="col-span-full min-w-0 space-y-1.5">
          <label htmlFor="landing-discipline" className="sr-only">
            {t("landingSearchDisciplineLabel")}
          </label>
          <div>
            <SmartSearchInput
              inputId="landing-discipline"
              onSubmit={onSearchSubmit}
              value={searchQuery}
              onChange={onSearchQueryChange}
              teachers={teachersForSearch}
              geo={geo}
              onSelectTeacher={onSelectTeacher}
              onSelectDiscipline={onSelectDiscipline}
              // The Quoi segment is subject-only. Cities live in the
              // dedicated Lieu segment so place suggestions can never
              // overwrite the subject text. (See LandingLocationSearch
              // below for the dedicated place autocomplete.)
              disableCitySuggestions
              inputPlaceholderKey={searchInputPlaceholderKey}
              shellClassName="min-h-16 rounded-xl border-teal-800/25 px-5 py-4 shadow-[0_4px_24px_rgba(15,110,86,0.06)]"
              inputClassName="text-base sm:text-lg"
            />
          </div>
        </div>

        <div className="min-w-0 space-y-1">
          <label className="block text-xs font-medium text-neutral-600" htmlFor="landing-location">
            {t("landingSearchLocationLabel")}
          </label>
          <LandingLocationSearch
            inputId="landing-location"
            value={locationSearch}
            onChange={onLocationSearchChange}
            geo={geo}
            onSelectCity={onSelectCity}
            onIntentChange={onLieuIntentChange}
            placeholderKey="landingHomepageLocationPlaceholder"
            className="w-full min-w-0"
            shellClassName="h-12 rounded-lg px-3 py-2 shadow-none"
            inputClassName="text-base"
          />
        </div>

        <div className="min-w-0 space-y-1">
          <label htmlFor="landing-format" className="block text-xs font-medium text-neutral-600">
            {t("landingSearchFormatLabel")}
          </label>
          <select
            id="landing-format"
            value={formatFilter}
            onChange={(e) => onFormatFilterChange(e.target.value as LandingFormatFilter)}
            aria-label={t("landingSearchFormatLabel")}
            className="h-12 w-full min-w-0 rounded-lg border border-[#E0DED5] bg-white px-2 text-base text-[#2C2C2A] outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/30"
          >
            {fmtOptions.map((o) => (
              <option key={o.v} value={o.v}>
                {t(o.lab)}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-full self-end sm:col-span-1">
          <button
            type="submit"
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0c5c48] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            <Search size={16} aria-hidden />
            {t("landingSearchSubmit")}
          </button>
        </div>
      </div>
    </form>
  );
}
