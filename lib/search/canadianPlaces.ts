/**
 * Public Canadian places aggregator for the Pratiqo Lieu autocomplete.
 *
 * The dataset is now split into two source files:
 *   - lib/search/places/quebecPlaces.ts          (Quebec-first coverage,
 *                                                 incl. Beauce strategic
 *                                                 municipalities)
 *   - lib/search/places/canadaOtherPlaces.ts     (every Canadian
 *                                                 municipality outside
 *                                                 Quebec >= 5,000 inhabitants)
 *
 * This file aggregates the two arrays, exposes the public types, and
 * implements the ranker + helpers consumed by:
 *   - components/marketing/LandingLocationSearch.tsx
 *   - lib/cities.ts (legacy backward-compat facade)
 *   - tests/search/segmentedSearchFields.test.ts
 *
 * Strict separation: this file is *only* place data + matching. It
 * contains no business logic, no Stripe/Supabase/payment code, and no
 * legal copy. Stripe pricing IDs, RLS policies, payouts and booking
 * rules live elsewhere and are not touched by this module.
 */

import {
  PROVINCE_LABELS_BY_LOCALE,
  type CanadianPlace,
  type CanadianProvinceCode,
} from "./canadianPlaces.shared";
import { QUEBEC_PLACES } from "./places/quebecPlaces";
import { CANADA_OTHER_PLACES } from "./places/canadaOtherPlaces";

export {
  PROVINCE_LABELS_BY_LOCALE,
  type CanadianPlace,
  type CanadianProvinceCode,
};

/**
 * Strip diacritics + lower-case so a user typing "montreal" matches
 * "Montréal", "quebec" matches "Québec", "saint jerome" matches
 * "Saint-Jérôme", etc. Preserves spaces (and treats hyphens / apostrophes
 * as spaces) so that multi-word queries like "saint joseph beauce"
 * tokenize correctly.
 */
export function normalizePlaceQuery(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’`]/g, " ")
    .replace(/[-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Internal: build the searchable haystack for a place. Includes name,
 * mechanically-derived aliases (Saint↔St, Sainte↔Ste, hyphen / accent
 * variants, suffix-stripped forms — see places/_alias.ts), province
 * name (FR + EN), and province code so that "ON" or "Ontario" surfaces
 * all Ontario cities.
 */
export function placeSearchHaystack(place: CanadianPlace): string {
  const parts = [
    place.name,
    ...(place.aliases ?? []),
    place.provinceCode,
    place.provinceName,
    PROVINCE_LABELS_BY_LOCALE[place.provinceCode].fr,
    PROVINCE_LABELS_BY_LOCALE[place.provinceCode].es,
  ];
  if (place.region) parts.push(place.region);
  if (place.mrc) parts.push(place.mrc);
  return parts.map(normalizePlaceQuery).join(" | ");
}

/**
 * Deduplicate by `${name}|${provinceCode}` so that we never double-count
 * a place that may appear in both source files (defensive — should not
 * happen given the QC vs non-QC split). Strategic local + populated
 * variants win on collision.
 */
function dedupePlaces(input: CanadianPlace[]): CanadianPlace[] {
  const seen = new Map<string, CanadianPlace>();
  for (const place of input) {
    const key = `${normalizePlaceQuery(place.name)}|${place.provinceCode}`;
    const prior = seen.get(key);
    if (!prior) {
      seen.set(key, place);
      continue;
    }
    const incumbentScore =
      (prior.population ?? 0) + (prior.isStrategicLocal ? 1 : 0);
    const challengerScore =
      (place.population ?? 0) + (place.isStrategicLocal ? 1 : 0);
    if (challengerScore > incumbentScore) seen.set(key, place);
  }
  return [...seen.values()];
}

/** Final aggregated Canada-wide place list. */
export const CANADIAN_PLACES: CanadianPlace[] = dedupePlaces([
  ...QUEBEC_PLACES,
  ...CANADA_OTHER_PLACES,
]);

/** Fast lookup index built once at module load for case/diacritic-insensitive search. */
const PLACE_INDEX = CANADIAN_PLACES.map((place) => ({
  place,
  haystack: placeSearchHaystack(place),
  nameNorm: normalizePlaceQuery(place.name),
}));

/**
 * Search the Canadian places dataset.
 *
 * Returns up to `limit` matches, scored by:
 *   1. Whole needle prefix-on-name (highest)
 *   2. Whole needle word-start-on-name
 *   3. Whole needle substring on name
 *   4. Per-token hits across the haystack (so "saint joseph beauce"
 *      matches Saint-Joseph-de-Beauce even though "joseph beauce" is
 *      not a contiguous substring of the name)
 *   5. A small population-based bonus, capped so flagship cities don't
 *      bury Quebec villages whose names are an exact match
 *   6. A small strategic-local bonus when the query specifically
 *      mentions a strategic place's name
 *   7. Distance from `geo` (ascending) when a geo origin is provided
 *
 * The matcher is alias-aware via placeSearchHaystack and accent-
 * insensitive via normalizePlaceQuery. NB this function does NO
 * server calls — it is sync and pure.
 */
export function searchCanadianPlaces(
  query: string,
  options: {
    limit?: number;
    /** Optional geo origin used as a tiebreaker (sorts nearer cities first). */
    geo?: { lat: number; lng: number } | null;
    /** Optional whitelist of provinces to restrict suggestions. */
    provinces?: CanadianProvinceCode[];
  } = {},
): CanadianPlace[] {
  const limit = options.limit ?? 8;
  const needle = normalizePlaceQuery(query);
  if (needle.length < 1) return [];

  const tokens = needle.split(" ").filter(Boolean);
  const provinceFilter = options.provinces ? new Set(options.provinces) : null;

  const matches: { place: CanadianPlace; score: number; distanceKm: number | null }[] = [];

  for (const { place, haystack, nameNorm } of PLACE_INDEX) {
    if (provinceFilter && !provinceFilter.has(place.provinceCode)) continue;
    // Every query token must hit the haystack — that's how we let
    // multi-word queries land on the right place even when they cross
    // hyphen boundaries (Saint-Joseph-de-Beauce, Lac-Mégantic, etc.).
    if (!tokens.every((token) => haystack.includes(token))) continue;

    let score = 0;
    if (nameNorm.startsWith(needle)) score += 100;
    else if (nameNorm.includes(` ${needle}`)) score += 60;
    else if (nameNorm.includes(needle)) score += 30;
    else {
      // No contiguous needle hit on the name — score per-token so that
      // typing "st joseph beauce" still ranks Saint-Joseph-de-Beauce
      // higher than a city that only matches "beauce" via its alias.
      for (const token of tokens) {
        if (nameNorm.startsWith(token)) score += 8;
        else if (nameNorm.includes(` ${token}`)) score += 5;
        else if (nameNorm.includes(token)) score += 3;
      }
    }

    // Strategic-local boost: only when at least one query token actually
    // appears in the place's display name. Prevents the boost from
    // hijacking generic "saint" queries.
    if (place.isStrategicLocal) {
      for (const token of tokens) {
        if (nameNorm.includes(token)) {
          score += 6;
          break;
        }
      }
    }

    // Population bonus — capped at +6 so a 1.7M-person flagship can't
    // bury a 6k-person Beauce village whose name is an exact prefix
    // hit. The Quebec product rule is explicit: don't let population
    // alone hide smaller Beauce/Quebec places.
    score += Math.min(6, Math.floor(((place.population ?? 0) / 200000)));

    let distanceKm: number | null = null;
    if (options.geo) {
      distanceKm = approximateKm(options.geo.lat, options.geo.lng, place.lat, place.lng);
    }

    matches.push({ place, score, distanceKm });
  }

  matches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
    return (b.place.population ?? 0) - (a.place.population ?? 0);
  });

  return matches.slice(0, limit).map((entry) => entry.place);
}

/** Cheap great-circle distance in km — used here only for sort tiebreaks. */
function approximateKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Display label used in dropdowns and selected-state pills (e.g. "Toronto, ON"). */
export function formatPlaceLabel(place: CanadianPlace): string {
  return `${place.name}, ${place.provinceCode}`;
}
