/**
 * Shared types for the Canadian places autocomplete.
 *
 * Lives separately from `lib/search/canadianPlaces.ts` so the per-province
 * data modules under `lib/search/places/*` can import the type without
 * pulling in the 400+ place objects (and without creating circular imports
 * via the aggregator).
 *
 * Keep this file pure: types + tiny constants only. No business logic,
 * no Stripe/Supabase/payment code, no legal copy.
 */

export type CanadianProvinceCode =
  | "AB"
  | "BC"
  | "MB"
  | "NB"
  | "NL"
  | "NS"
  | "NT"
  | "NU"
  | "ON"
  | "PE"
  | "QC"
  | "SK"
  | "YT";

export type CanadianPlace = {
  /** Canonical place name as displayed (e.g. "Montreal", "St. John's"). */
  name: string;
  /** ISO 3166-2:CA province/territory code. */
  provinceCode: CanadianProvinceCode;
  /** Long form province/territory name in English (used for accessibility). */
  provinceName: string;
  /** Country code, always "CA" for this dataset. */
  country: "CA";
  /** Approximate centre latitude (decimal degrees). */
  lat: number;
  /** Approximate centre longitude (decimal degrees). */
  lng: number;
  /**
   * Approximate population (used for sort weight when no geo is available).
   * Optional because seed entries may not all have it; null is treated as 0
   * for sorting purposes.
   */
  population?: number | null;
  /**
   * Alternate spellings/translations used when matching the user's query.
   * Always include the diacritic-stripped form here for accent-insensitive
   * matching ("Montreal" for "Montreal", etc.). Most aliases are derived
   * mechanically by `lib/search/places/_alias.ts`; data files may add
   * curated extras (e.g. "Quebec City" for "Quebec").
   */
  aliases?: string[];
  /** Optional Quebec administrative region (e.g. "Chaudiere-Appalaches"). */
  region?: string;
  /** Optional MRC / agglomeration name. */
  mrc?: string;
  /**
   * Strategic local landmark flag: hand-picked towns the product owner
   * wants to keep visible in autocomplete even when their population
   * sits below the regional median (Beauce villages, etc.).
   */
  isStrategicLocal?: boolean;
  /** Free-text data provenance string (Statistics Canada, Donnees Quebec, etc.). */
  source?: string;
};

/** Province/territory display labels per locale. */
export const PROVINCE_LABELS_BY_LOCALE: Record<
  CanadianProvinceCode,
  { fr: string; en: string; es: string }
> = {
  AB: { fr: "Alberta", en: "Alberta", es: "Alberta" },
  BC: { fr: "Colombie-Britannique", en: "British Columbia", es: "Columbia Británica" },
  MB: { fr: "Manitoba", en: "Manitoba", es: "Manitoba" },
  NB: { fr: "Nouveau-Brunswick", en: "New Brunswick", es: "Nuevo Brunswick" },
  NL: { fr: "Terre-Neuve-et-Labrador", en: "Newfoundland and Labrador", es: "Terranova y Labrador" },
  NS: { fr: "Nouvelle-Écosse", en: "Nova Scotia", es: "Nueva Escocia" },
  NT: { fr: "Territoires du Nord-Ouest", en: "Northwest Territories", es: "Territorios del Noroeste" },
  NU: { fr: "Nunavut", en: "Nunavut", es: "Nunavut" },
  ON: { fr: "Ontario", en: "Ontario", es: "Ontario" },
  PE: { fr: "Île-du-Prince-Édouard", en: "Prince Edward Island", es: "Isla del Príncipe Eduardo" },
  QC: { fr: "Québec", en: "Quebec", es: "Quebec" },
  SK: { fr: "Saskatchewan", en: "Saskatchewan", es: "Saskatchewan" },
  YT: { fr: "Yukon", en: "Yukon", es: "Yukón" },
};
