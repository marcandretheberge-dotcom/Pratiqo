/**
 * Legacy city dataset — kept ONLY as a backwards-compatible facade so older
 * callers (autocomplete inputs, type imports) keep working without churn.
 *
 * The authoritative dataset lives in `lib/search/canadianPlaces.ts`. New code
 * should import from there directly. This file used to be a small Quebec-only
 * list which made the search bar feel Quebec-only; it now projects every
 * Canadian place from the canonical dataset into the legacy `City` shape.
 *
 * Strict scope: this module is data-only. No business logic, no payments, no
 * Supabase RLS, no legal copy.
 */

import { CANADIAN_PLACES } from "./search/canadianPlaces";

export interface City {
  name: string;
  lat: number;
  lng: number;
  /** Province/territory code (e.g. "QC", "ON"). */
  province?: string;
  /** Country code; widened to keep older fixtures importable. */
  country: "CA" | "US" | "MX" | "ES";
}

export const CITIES: City[] = CANADIAN_PLACES.map((place) => ({
  name: place.name,
  lat: place.lat,
  lng: place.lng,
  province: place.provinceCode,
  country: "CA",
}));
