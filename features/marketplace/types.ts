import type { Teacher } from "@/types";
import type { MapBounds } from "@/components/SearchMapView";
import type { StudentLocationPrefs } from "@/lib/studentLocationSearch";
import type { TeacherPreference, TeacherSearchFormat } from "@/lib/teacherSearchCriteria";

export type MarketplaceGeo = { lat: number; lng: number } | null;

export type MarketplaceRadius = 5 | 10 | 25 | 50 | "all" | "online";

export type MarketplaceSortMode = "relevance" | "nearest" | "trusted";

export type MarketplaceFormatFilter = "all" | "online" | "in_person" | "at_home" | "hybrid";

export type MarketplaceAdvancedFilters = {
  minRating: string;
  maxPrice: string;
  verifiedOnly: boolean;
  language: string;
  level: string;
  availability: string;
  teacherPreference: TeacherPreference | "";
  formatExtra: TeacherSearchFormat | "";
};

export type MarketplaceAdvancedFilterMode = "all" | "verifiedOnly";

export type NearbyTeacherDistanceMap = Map<string, number> | null;

export type MarketplaceSearchState = {
  teachers: Teacher[];
  searchQuery: string;
  activeCat: string;
  geo: MarketplaceGeo;
  sortMode: MarketplaceSortMode;
  mapBounds: MapBounds | null;
  formatFilter: MarketplaceFormatFilter;
  advancedFilters: MarketplaceAdvancedFilters;
  advancedFilterMode?: MarketplaceAdvancedFilterMode;
  radius?: MarketplaceRadius;
  nearbyServerResult?: NearbyTeacherDistanceMap;
  studentPrefs?: StudentLocationPrefs | null;
};

export function createDefaultMarketplaceAdvancedFilters(): MarketplaceAdvancedFilters {
  return {
    minRating: "",
    maxPrice: "",
    verifiedOnly: false,
    language: "",
    level: "",
    availability: "",
    teacherPreference: "",
    formatExtra: "",
  };
}

export function landingFormatToTeacherSearchFormat(
  formatFilter: MarketplaceFormatFilter,
): TeacherSearchFormat {
  if (formatFilter === "online") return "online";
  if (formatFilter === "in_person") return "in_person";
  if (formatFilter === "at_home") return "at_home";
  if (formatFilter === "hybrid") return "hybrid";
  return "no_preference";
}

export function teacherSearchFormatToLandingFormat(
  format: TeacherSearchFormat | "",
): MarketplaceFormatFilter {
  if (format === "online" || format === "in_person" || format === "at_home" || format === "hybrid") {
    return format;
  }
  return "all";
}
