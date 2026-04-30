/**
 * City record used across all country markets.
 *
 * slug        — URL-safe identifier (used in route segments)
 * region      — Province / département shown in meta titles
 * countryCode — ISO 3166-1 alpha-2 (e.g. "CA", "UY")
 * lat / lng   — City centre coordinates for proximity matching
 */
export interface QcCity {
  name: string;
  slug: string;
  region: string;
  /** ISO 3166-1 alpha-2 country code. Defaults to "CA" for existing QC entries. */
  countryCode: string;
  lat: number;
  lng: number;
  /**
   * Initial Google Maps zoom level for this entry's landing page.
   * City-wide pages default to 12; neighbourhood (barrio) pages use 14–15
   * to show the immediate vicinity rather than the whole city.
   */
  defaultZoom?: number;
  /**
   * Slug of the parent city, used to build breadcrumb paths.
   * Only set for sub-city entries (barrios / neighbourhoods).
   */
  parentCity?: string;
}

export const QC_CITIES: QcCity[] = [
  // ── Grand Montréal ──────────────────────────────────────────────────────
  { name: "Montréal",              slug: "montreal",              region: "Île-de-Montréal",              countryCode: "CA", lat: 45.5017, lng: -73.5673 },
  { name: "Laval",                 slug: "laval",                 region: "Laval",                        countryCode: "CA", lat: 45.6066, lng: -73.7124 },
  { name: "Longueuil",             slug: "longueuil",             region: "Montérégie",                   countryCode: "CA", lat: 45.5316, lng: -73.5188 },
  { name: "Brossard",              slug: "brossard",              region: "Montérégie",                   countryCode: "CA", lat: 45.4617, lng: -73.4750 },
  { name: "Dollard-des-Ormeaux",   slug: "dollard-des-ormeaux",   region: "Île-de-Montréal",              countryCode: "CA", lat: 45.4971, lng: -73.8110 },
  { name: "Châteauguay",           slug: "chateauguay",           region: "Montérégie",                   countryCode: "CA", lat: 45.3820, lng: -73.7484 },
  { name: "Repentigny",            slug: "repentigny",            region: "Lanaudière",                   countryCode: "CA", lat: 45.7473, lng: -73.4612 },
  { name: "Terrebonne",            slug: "terrebonne",            region: "Lanaudière",                   countryCode: "CA", lat: 45.7047, lng: -73.6490 },
  { name: "Blainville",            slug: "blainville",            region: "Laurentides",                  countryCode: "CA", lat: 45.6729, lng: -73.8793 },
  { name: "Mirabel",               slug: "mirabel",               region: "Laurentides",                  countryCode: "CA", lat: 45.6503, lng: -74.0835 },
  { name: "Mascouche",             slug: "mascouche",             region: "Lanaudière",                   countryCode: "CA", lat: 45.7487, lng: -73.5979 },
  { name: "Vaudreuil-Dorion",      slug: "vaudreuil-dorion",      region: "Montérégie",                   countryCode: "CA", lat: 45.4016, lng: -74.0349 },
  { name: "Sainte-Julie",          slug: "sainte-julie",          region: "Montérégie",                   countryCode: "CA", lat: 45.5892, lng: -73.3454 },
  { name: "Varennes",              slug: "varennes",              region: "Montérégie",                   countryCode: "CA", lat: 45.6842, lng: -73.3789 },
  { name: "Chambly",               slug: "chambly",               region: "Montérégie",                   countryCode: "CA", lat: 45.4475, lng: -73.2879 },
  { name: "L'Assomption",          slug: "l-assomption",          region: "Lanaudière",                   countryCode: "CA", lat: 45.8258, lng: -73.4280 },
  { name: "Beloeil",               slug: "beloeil",               region: "Montérégie",                   countryCode: "CA", lat: 45.5664, lng: -73.2024 },

  // ── Capitale-Nationale & Chaudière-Appalaches ────────────────────────────
  { name: "Québec",                slug: "quebec",                region: "Capitale-Nationale",           countryCode: "CA", lat: 46.8139, lng: -71.2082 },
  { name: "Lévis",                 slug: "levis",                 region: "Chaudière-Appalaches",         countryCode: "CA", lat: 46.8031, lng: -71.1756 },
  { name: "Saint-Georges",         slug: "saint-georges",         region: "Chaudière-Appalaches",         countryCode: "CA", lat: 46.1167, lng: -70.6667 },
  { name: "Sainte-Marie",          slug: "sainte-marie",          region: "Chaudière-Appalaches",         countryCode: "CA", lat: 46.4500, lng: -71.0167 },
  { name: "Beauceville",           slug: "beauceville",           region: "Chaudière-Appalaches",         countryCode: "CA", lat: 46.2166, lng: -70.7833 },
  { name: "Thetford Mines",        slug: "thetford-mines",        region: "Chaudière-Appalaches",         countryCode: "CA", lat: 46.1000, lng: -71.3000 },

  // ── Laurentides & Lanaudière ────────────────────────────────────────────
  { name: "Saint-Jérôme",          slug: "saint-jerome",          region: "Laurentides",                  countryCode: "CA", lat: 45.7765, lng: -74.0004 },
  { name: "Mont-Tremblant",        slug: "mont-tremblant",        region: "Laurentides",                  countryCode: "CA", lat: 46.1186, lng: -74.5956 },
  { name: "Joliette",              slug: "joliette",              region: "Lanaudière",                   countryCode: "CA", lat: 46.0306, lng: -73.4481 },

  // ── Montérégie ──────────────────────────────────────────────────────────
  { name: "Saint-Jean-sur-Richelieu", slug: "saint-jean-sur-richelieu", region: "Montérégie",            countryCode: "CA", lat: 45.3135, lng: -73.2717 },
  { name: "Granby",                slug: "granby",                region: "Montérégie",                   countryCode: "CA", lat: 45.4012, lng: -72.7323 },
  { name: "Saint-Hyacinthe",       slug: "saint-hyacinthe",       region: "Montérégie",                   countryCode: "CA", lat: 45.6269, lng: -72.9537 },
  { name: "Sorel-Tracy",           slug: "sorel-tracy",           region: "Montérégie",                   countryCode: "CA", lat: 46.0476, lng: -73.1174 },

  // ── Outaouais ───────────────────────────────────────────────────────────
  { name: "Gatineau",              slug: "gatineau",              region: "Outaouais",                    countryCode: "CA", lat: 45.4765, lng: -75.7013 },

  // ── Mauricie ────────────────────────────────────────────────────────────
  { name: "Trois-Rivières",        slug: "trois-rivieres",        region: "Mauricie",                     countryCode: "CA", lat: 46.3432, lng: -72.5418 },
  { name: "Shawinigan",            slug: "shawinigan",            region: "Mauricie",                     countryCode: "CA", lat: 46.5706, lng: -72.7490 },

  // ── Centre-du-Québec ────────────────────────────────────────────────────
  { name: "Drummondville",         slug: "drummondville",         region: "Centre-du-Québec",             countryCode: "CA", lat: 45.8838, lng: -72.4826 },
  { name: "Victoriaville",         slug: "victoriaville",         region: "Centre-du-Québec",             countryCode: "CA", lat: 46.0500, lng: -71.9667 },

  // ── Estrie ──────────────────────────────────────────────────────────────
  { name: "Sherbrooke",            slug: "sherbrooke",            region: "Estrie",                       countryCode: "CA", lat: 45.4042, lng: -71.8929 },
  { name: "Magog",                 slug: "magog",                 region: "Estrie",                       countryCode: "CA", lat: 45.2667, lng: -72.1500 },
  { name: "Coaticook",             slug: "coaticook",             region: "Estrie",                       countryCode: "CA", lat: 45.1333, lng: -71.8000 },
  { name: "Lac-Mégantic",          slug: "lac-megantic",          region: "Estrie",                       countryCode: "CA", lat: 45.5833, lng: -70.8833 },

  // ── Saguenay–Lac-Saint-Jean ─────────────────────────────────────────────
  { name: "Saguenay",              slug: "saguenay",              region: "Saguenay–Lac-Saint-Jean",      countryCode: "CA", lat: 48.4279, lng: -71.0698 },
  { name: "Alma",                  slug: "alma",                  region: "Saguenay–Lac-Saint-Jean",      countryCode: "CA", lat: 48.5500, lng: -71.6500 },

  // ── Bas-Saint-Laurent ───────────────────────────────────────────────────
  { name: "Rimouski",              slug: "rimouski",              region: "Bas-Saint-Laurent",            countryCode: "CA", lat: 48.4488, lng: -68.5319 },
  { name: "Rivière-du-Loup",       slug: "riviere-du-loup",       region: "Bas-Saint-Laurent",            countryCode: "CA", lat: 47.8327, lng: -69.5348 },
  { name: "Matane",                slug: "matane",                region: "Bas-Saint-Laurent",            countryCode: "CA", lat: 48.8485, lng: -67.5310 },
  { name: "La Pocatière",          slug: "la-pocatiere",          region: "Bas-Saint-Laurent",            countryCode: "CA", lat: 47.3627, lng: -69.9965 },

  // ── Abitibi-Témiscamingue ────────────────────────────────────────────────
  { name: "Rouyn-Noranda",         slug: "rouyn-noranda",         region: "Abitibi-Témiscamingue",        countryCode: "CA", lat: 48.2361, lng: -79.0226 },
  { name: "Val-d'Or",              slug: "val-dor",               region: "Abitibi-Témiscamingue",        countryCode: "CA", lat: 48.0999, lng: -77.7902 },
  { name: "Amos",                  slug: "amos",                  region: "Abitibi-Témiscamingue",        countryCode: "CA", lat: 48.5677, lng: -78.1229 },

  // ── Côte-Nord ───────────────────────────────────────────────────────────
  { name: "Sept-Îles",             slug: "sept-iles",             region: "Côte-Nord",                    countryCode: "CA", lat: 50.2210, lng: -66.3839 },
  { name: "Baie-Comeau",           slug: "baie-comeau",           region: "Côte-Nord",                    countryCode: "CA", lat: 49.2205, lng: -68.1497 },

  // ── Gaspésie ────────────────────────────────────────────────────────────
  { name: "Gaspé",                 slug: "gaspe",                 region: "Gaspésie–Îles-de-la-Madeleine", countryCode: "CA", lat: 48.8281, lng: -64.4796 },
];

// ── Uruguay ───────────────────────────────────────────────────────────────────
//
// Key markets: Montevideo (capital, 1.3 M), Salto (interior), and
// Punta del Este (premium coastal resort — strong demand for music & language
// lessons from affluent residents and expats).
//
// Preferred currency: USD for private lessons (widely used), UYU as fallback.

export const UY_CITIES: QcCity[] = [
  { name: "Montevideo",      slug: "montevideo",      region: "Montevideo",   countryCode: "UY", lat: -34.9011, lng: -56.1645 },
  { name: "Salto",           slug: "salto",           region: "Salto",        countryCode: "UY", lat: -31.3833, lng: -57.9667 },
  { name: "Punta del Este",  slug: "punta-del-este",  region: "Maldonado",    countryCode: "UY", lat: -34.9667, lng: -54.9500 },
];

// ── Montevideo barrios ────────────────────────────────────────────────────────
//
// High-demand neighbourhoods with concentrated demand for music & language
// lessons.  Each has a tighter default map zoom (14–15) to show the immediate
// vicinity rather than the whole city.

export const MV_BARRIOS: QcCity[] = [
  { name: "Pocitos",        slug: "pocitos",        region: "Montevideo", countryCode: "UY", lat: -34.9056, lng: -56.1547, defaultZoom: 15, parentCity: "montevideo" },
  { name: "Carrasco",       slug: "carrasco",       region: "Montevideo", countryCode: "UY", lat: -34.8967, lng: -56.0467, defaultZoom: 14, parentCity: "montevideo" },
  { name: "Punta Carretas", slug: "punta-carretas", region: "Montevideo", countryCode: "UY", lat: -34.9208, lng: -56.1606, defaultZoom: 15, parentCity: "montevideo" },
  { name: "Cordón",         slug: "cordon",         region: "Montevideo", countryCode: "UY", lat: -34.9025, lng: -56.1728, defaultZoom: 15, parentCity: "montevideo" },
  { name: "Malvín",         slug: "malvin",         region: "Montevideo", countryCode: "UY", lat: -34.8950, lng: -56.1183, defaultZoom: 15, parentCity: "montevideo" },
  { name: "Prado",          slug: "prado",          region: "Montevideo", countryCode: "UY", lat: -34.8773, lng: -56.1856, defaultZoom: 15, parentCity: "montevideo" },
];

/** All cities across all markets. Useful for cross-country slug lookups. */
export const ALL_CITIES: QcCity[] = [...QC_CITIES, ...UY_CITIES, ...MV_BARRIOS];

/** Look up a QC city by its URL slug. Returns undefined for unknown slugs. */
export function findCityBySlug(slug: string): QcCity | undefined {
  return QC_CITIES.find((c) => c.slug === slug);
}

/** Look up any city (all markets) by its URL slug. */
export function findAnyCityBySlug(slug: string): QcCity | undefined {
  return ALL_CITIES.find((c) => c.slug === slug);
}
