import type { TeacherSearchCriteria } from "@/lib/teacherSearchCriteria";
import {
  applyRadiusFilter,
  buildTeacherSearchRows,
  filterTeacherPool,
  sortRows,
  type TeacherSearchRow,
} from "@/lib/teacherSearchEngine";
import { applyMapBoundsFilter } from "@/features/marketplace/searchRows";
import {
  landingFormatToTeacherSearchFormat,
  type MarketplaceSearchState,
} from "@/features/marketplace/types";

function finiteNumberFromInput(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildCriteria(state: MarketplaceSearchState): TeacherSearchCriteria {
  const advanced = state.advancedFilters;
  const mode = state.advancedFilterMode ?? "all";
  const criteria: TeacherSearchCriteria = {
    category: state.activeCat,
    searchQuery: state.searchQuery,
  };

  if (mode === "verifiedOnly") {
    criteria.verifiedOnly = advanced.verifiedOnly || undefined;
    return criteria;
  }

  const format = advanced.formatExtra || landingFormatToTeacherSearchFormat(state.formatFilter);
  const minRating = finiteNumberFromInput(advanced.minRating);
  const maxPrice = finiteNumberFromInput(advanced.maxPrice);

  return {
    ...criteria,
    format,
    minRating,
    maxPrice,
    verifiedOnly: advanced.verifiedOnly ? true : undefined,
    language: advanced.language.trim() || undefined,
    level: advanced.level.trim() || undefined,
    availability: advanced.availability.trim() || undefined,
    teacherPreference: advanced.teacherPreference || undefined,
  };
}

function applyNearbyDistanceSource(
  rows: TeacherSearchRow[],
  state: MarketplaceSearchState,
): TeacherSearchRow[] {
  const radius = state.radius;
  if (!radius) return rows;

  if (
    state.nearbyServerResult &&
    state.nearbyServerResult.size > 0 &&
    state.geo &&
    typeof radius === "number"
  ) {
    const serverFiltered = rows
      .filter(({ teacher }) => state.nearbyServerResult?.has(teacher.id))
      .map((row) => ({
        ...row,
        distanceKm: state.nearbyServerResult?.get(row.teacher.id) ?? row.distanceKm,
      }));

    return serverFiltered.length === 0 && rows.length > 0
      ? applyRadiusFilter(rows, radius)
      : serverFiltered;
  }

  return applyRadiusFilter(rows, state.geo ? radius : radius === "online" ? "online" : "all");
}

export function computeMarketplaceResults(state: MarketplaceSearchState): TeacherSearchRow[] {
  const pool = filterTeacherPool(state.teachers, buildCriteria(state));
  let rows = buildTeacherSearchRows(pool, { geo: state.geo });

  rows = applyNearbyDistanceSource(rows, state);
  rows = applyMapBoundsFilter(rows, state.mapBounds);

  return sortRows(rows, {
    sortMode: state.sortMode,
    studentPrefs: state.studentPrefs ?? null,
  });
}
