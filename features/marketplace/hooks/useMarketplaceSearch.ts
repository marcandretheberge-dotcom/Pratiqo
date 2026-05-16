"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { isPratiqoVerified } from "@/lib/verification";
import type { Teacher } from "@/types";
import { computeMarketplaceResults } from "@/features/marketplace/utils/computeMarketplaceResults";
import {
  createDefaultMarketplaceAdvancedFilters,
  teacherSearchFormatToLandingFormat,
  type MarketplaceAdvancedFilterMode,
  type MarketplaceAdvancedFilters,
  type MarketplaceFormatFilter,
  type MarketplaceGeo,
  type MarketplaceRadius,
  type MarketplaceSortMode,
  type NearbyTeacherDistanceMap,
} from "@/features/marketplace/types";
import type { MapBounds } from "@/components/SearchMapView";
import type { StudentLocationPrefs } from "@/lib/studentLocationSearch";
import type { TeacherSearchFormat } from "@/lib/teacherSearchCriteria";

export function useMarketplaceSearch({
  teachers,
  geo,
  mapBounds,
  radius,
  nearbyServerResult,
  studentPrefs,
  initialSortMode = "relevance",
  advancedFilterMode = "all",
  onCriteriaChange,
  deferCriteriaChange = false,
}: {
  teachers: Teacher[];
  geo: MarketplaceGeo;
  mapBounds: MapBounds | null;
  radius?: MarketplaceRadius;
  nearbyServerResult?: NearbyTeacherDistanceMap;
  studentPrefs?: StudentLocationPrefs | null;
  initialSortMode?: MarketplaceSortMode;
  advancedFilterMode?: MarketplaceAdvancedFilterMode;
  onCriteriaChange?: () => void;
  deferCriteriaChange?: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>("All");
  const [sortMode, setSortMode] = useState<MarketplaceSortMode>(initialSortMode);
  const [formatFilter, setFormatFilter] = useState<MarketplaceFormatFilter>("all");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [adv, setAdv] = useState<MarketplaceAdvancedFilters>(() => createDefaultMarketplaceAdvancedFilters());

  useEffect(() => {
    if (!onCriteriaChange) return;
    if (deferCriteriaChange) {
      queueMicrotask(onCriteriaChange);
      return;
    }
    onCriteriaChange();
  }, [searchQuery, activeCat, formatFilter, adv, radius, onCriteriaChange, deferCriteriaChange]);

  const results = useMemo(
    () =>
      computeMarketplaceResults({
        teachers,
        searchQuery,
        activeCat,
        geo,
        sortMode,
        mapBounds,
        formatFilter,
        advancedFilters: adv,
        advancedFilterMode,
        radius,
        nearbyServerResult,
        studentPrefs,
      }),
    [
      teachers,
      searchQuery,
      activeCat,
      geo,
      sortMode,
      mapBounds,
      formatFilter,
      adv,
      advancedFilterMode,
      radius,
      nearbyServerResult,
      studentPrefs,
    ],
  );

  const filteredTeachers = useMemo(() => results.map((row) => row.teacher), [results]);

  const formatValue = useMemo(
    () => teacherSearchFormatToLandingFormat(adv.formatExtra),
    [adv.formatExtra],
  );

  const setFormatValue = useCallback((value: MarketplaceFormatFilter) => {
    const next: TeacherSearchFormat | "" = value === "all" ? "" : value;
    setAdv((current) => ({ ...current, formatExtra: next }));
  }, []);

  const verifiedTeacherCount = useMemo(
    () =>
      teachers.filter((teacher) =>
        isPratiqoVerified({
          isVerified: teacher.isVerified,
          identityVerified: teacher.identityVerified,
          verificationLevel: teacher.verificationLevel ?? null,
        }),
      ).length,
    [teachers],
  );

  const resetAdvancedFilters = useCallback(() => {
    setAdv(createDefaultMarketplaceAdvancedFilters());
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    activeCat,
    setActiveCat,
    sortMode,
    setSortMode,
    formatFilter,
    setFormatFilter,
    formatValue,
    setFormatValue,
    advancedOpen,
    setAdvancedOpen,
    adv,
    setAdv,
    resetAdvancedFilters,
    results,
    filteredTeachers,
    verifiedTeacherCount,
  };
}
