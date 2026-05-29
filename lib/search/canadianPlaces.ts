/**
 * Canadian places dataset for the Pratiqo search autocomplete.
 *
 * Pratiqo is Canada-wide. Every province and territory must be represented so
 * that the place autocomplete stops feeling Quebec-only. This is a launch-safe
 * baseline (~150 cities/towns); a follow-up can replace this file with a
 * StatsCan-generated dataset of all population centres ≥ 5 000 inhabitants.
 *
 * Coordinates are best-effort city-centre lat/lng (decimal degrees, WGS-84).
 * `aliases` carries common alternate spellings and English/French variants
 * (e.g. "Quebec City", "Trois Rivieres") so the matcher works for users
 * regardless of accents or locale.
 *
 * Strict separation: this file is *only* place data. It contains no business
 * logic, no Stripe/Supabase/payment code, and no legal copy.
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
  /** Canonical place name as displayed (e.g. "Montréal", "St. John's"). */
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
   * matching (`Montreal` for "Montréal", `Quebec` for "Québec", etc.).
   */
  aliases?: string[];
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

/**
 * Strip diacritics + lower-case so a user typing "montreal" matches
 * "Montréal", "quebec" matches "Québec", "saint jerome" matches
 * "Saint-Jérôme", etc. Preserves spaces and apostrophes for word boundary
 * detection.
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
 * aliases, province name (FR + EN), and province code so that "ON" or
 * "Ontario" surfaces all Ontario cities.
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
  return parts.map(normalizePlaceQuery).join(" | ");
}

const QC = "Quebec";
const ON = "Ontario";
const AB = "Alberta";
const BC = "British Columbia";
const MB = "Manitoba";
const SK = "Saskatchewan";
const NS = "Nova Scotia";
const NB = "New Brunswick";
const NL = "Newfoundland and Labrador";
const PE = "Prince Edward Island";
const YT = "Yukon";
const NT = "Northwest Territories";
const NU = "Nunavut";

export const CANADIAN_PLACES: CanadianPlace[] = [
  // ── Quebec ──────────────────────────────────────────────────────────────
  { name: "Montréal", provinceCode: "QC", provinceName: QC, country: "CA", lat: 45.5017, lng: -73.5673, population: 1762949, aliases: ["Montreal"] },
  { name: "Québec", provinceCode: "QC", provinceName: QC, country: "CA", lat: 46.8139, lng: -71.2082, population: 549459, aliases: ["Quebec", "Quebec City", "Ville de Québec"] },
  { name: "Laval", provinceCode: "QC", provinceName: QC, country: "CA", lat: 45.6066, lng: -73.7124, population: 438366 },
  { name: "Gatineau", provinceCode: "QC", provinceName: QC, country: "CA", lat: 45.4765, lng: -75.7013, population: 291041 },
  { name: "Longueuil", provinceCode: "QC", provinceName: QC, country: "CA", lat: 45.5371, lng: -73.5095, population: 254483 },
  { name: "Sherbrooke", provinceCode: "QC", provinceName: QC, country: "CA", lat: 45.4042, lng: -71.8929, population: 172950 },
  { name: "Lévis", provinceCode: "QC", provinceName: QC, country: "CA", lat: 46.8031, lng: -71.1756, population: 149683, aliases: ["Levis"] },
  { name: "Saguenay", provinceCode: "QC", provinceName: QC, country: "CA", lat: 48.4279, lng: -71.0698, population: 144746 },
  { name: "Trois-Rivières", provinceCode: "QC", provinceName: QC, country: "CA", lat: 46.3432, lng: -72.5418, population: 139163, aliases: ["Trois Rivieres", "Trois-Rivieres"] },
  { name: "Terrebonne", provinceCode: "QC", provinceName: QC, country: "CA", lat: 45.7000, lng: -73.6333, population: 119944 },
  { name: "Saint-Jean-sur-Richelieu", provinceCode: "QC", provinceName: QC, country: "CA", lat: 45.3072, lng: -73.2628, population: 100554, aliases: ["Saint Jean sur Richelieu", "St-Jean-sur-Richelieu"] },
  { name: "Repentigny", provinceCode: "QC", provinceName: QC, country: "CA", lat: 45.7423, lng: -73.4592, population: 86242 },
  { name: "Brossard", provinceCode: "QC", provinceName: QC, country: "CA", lat: 45.4490, lng: -73.4523, population: 91525 },
  { name: "Drummondville", provinceCode: "QC", provinceName: QC, country: "CA", lat: 45.8838, lng: -72.4826, population: 79258 },
  { name: "Saint-Jérôme", provinceCode: "QC", provinceName: QC, country: "CA", lat: 45.7765, lng: -74.0004, population: 80059, aliases: ["Saint Jerome", "St-Jerome"] },
  { name: "Granby", provinceCode: "QC", provinceName: QC, country: "CA", lat: 45.4001, lng: -72.7320, population: 70261 },
  { name: "Blainville", provinceCode: "QC", provinceName: QC, country: "CA", lat: 45.6745, lng: -73.8780, population: 59819 },
  { name: "Saint-Hyacinthe", provinceCode: "QC", provinceName: QC, country: "CA", lat: 45.6269, lng: -72.9537, population: 59614, aliases: ["Saint Hyacinthe", "St-Hyacinthe"] },
  { name: "Shawinigan", provinceCode: "QC", provinceName: QC, country: "CA", lat: 46.5667, lng: -72.7500, population: 49714 },
  { name: "Rimouski", provinceCode: "QC", provinceName: QC, country: "CA", lat: 48.4488, lng: -68.5230, population: 48664 },
  { name: "Saint-Georges", provinceCode: "QC", provinceName: QC, country: "CA", lat: 46.1167, lng: -70.6667, population: 32954, aliases: ["Saint Georges", "St-Georges", "Saint-Georges-de-Beauce"] },
  { name: "Thetford Mines", provinceCode: "QC", provinceName: QC, country: "CA", lat: 46.1000, lng: -71.3000, population: 25700 },
  { name: "Rivière-du-Loup", provinceCode: "QC", provinceName: QC, country: "CA", lat: 47.8268, lng: -69.5418, population: 19815, aliases: ["Riviere du Loup"] },
  { name: "Victoriaville", provinceCode: "QC", provinceName: QC, country: "CA", lat: 46.0500, lng: -71.9667, population: 47585 },
  { name: "Rouyn-Noranda", provinceCode: "QC", provinceName: QC, country: "CA", lat: 48.2362, lng: -79.0231, population: 42334, aliases: ["Rouyn Noranda"] },
  { name: "Val-d’Or", provinceCode: "QC", provinceName: QC, country: "CA", lat: 48.0972, lng: -77.7825, population: 32881, aliases: ["Val d'Or", "Val dOr"] },
  { name: "Sept-Îles", provinceCode: "QC", provinceName: QC, country: "CA", lat: 50.2001, lng: -66.3821, population: 25686, aliases: ["Sept Iles"] },
  { name: "Baie-Comeau", provinceCode: "QC", provinceName: QC, country: "CA", lat: 49.2167, lng: -68.1500, population: 21508, aliases: ["Baie Comeau"] },
  { name: "Magog", provinceCode: "QC", provinceName: QC, country: "CA", lat: 45.2667, lng: -72.1500, population: 28833 },
  { name: "Beauceville", provinceCode: "QC", provinceName: QC, country: "CA", lat: 46.2166, lng: -70.7833, population: 6532 },
  { name: "Sainte-Marie", provinceCode: "QC", provinceName: QC, country: "CA", lat: 46.4500, lng: -71.0167, population: 13468, aliases: ["Sainte Marie"] },
  { name: "Saint-Joseph-de-Beauce", provinceCode: "QC", provinceName: QC, country: "CA", lat: 46.3000, lng: -70.8667, population: 5180, aliases: ["Saint Joseph de Beauce"] },
  { name: "Lac-Mégantic", provinceCode: "QC", provinceName: QC, country: "CA", lat: 45.5833, lng: -70.8833, population: 5786, aliases: ["Lac Megantic"] },
  { name: "Plessisville", provinceCode: "QC", provinceName: QC, country: "CA", lat: 46.2167, lng: -71.7667, population: 6692 },

  // ── Ontario ─────────────────────────────────────────────────────────────
  { name: "Toronto", provinceCode: "ON", provinceName: ON, country: "CA", lat: 43.6532, lng: -79.3832, population: 2794356 },
  { name: "Ottawa", provinceCode: "ON", provinceName: ON, country: "CA", lat: 45.4215, lng: -75.6972, population: 1017449 },
  { name: "Mississauga", provinceCode: "ON", provinceName: ON, country: "CA", lat: 43.5890, lng: -79.6441, population: 717961 },
  { name: "Brampton", provinceCode: "ON", provinceName: ON, country: "CA", lat: 43.7315, lng: -79.7624, population: 656480 },
  { name: "Hamilton", provinceCode: "ON", provinceName: ON, country: "CA", lat: 43.2557, lng: -79.8711, population: 569353 },
  { name: "London", provinceCode: "ON", provinceName: ON, country: "CA", lat: 42.9849, lng: -81.2453, population: 422324 },
  { name: "Markham", provinceCode: "ON", provinceName: ON, country: "CA", lat: 43.8561, lng: -79.3370, population: 338503 },
  { name: "Vaughan", provinceCode: "ON", provinceName: ON, country: "CA", lat: 43.8361, lng: -79.4985, population: 323103 },
  { name: "Kitchener", provinceCode: "ON", provinceName: ON, country: "CA", lat: 43.4516, lng: -80.4925, population: 256885 },
  { name: "Windsor", provinceCode: "ON", provinceName: ON, country: "CA", lat: 42.3149, lng: -83.0364, population: 229660 },
  { name: "Richmond Hill", provinceCode: "ON", provinceName: ON, country: "CA", lat: 43.8828, lng: -79.4403, population: 202022 },
  { name: "Oakville", provinceCode: "ON", provinceName: ON, country: "CA", lat: 43.4675, lng: -79.6877, population: 213759 },
  { name: "Burlington", provinceCode: "ON", provinceName: ON, country: "CA", lat: 43.3255, lng: -79.7990, population: 186948 },
  { name: "Greater Sudbury", provinceCode: "ON", provinceName: ON, country: "CA", lat: 46.4917, lng: -80.9930, population: 166004, aliases: ["Sudbury", "Grand Sudbury"] },
  { name: "Oshawa", provinceCode: "ON", provinceName: ON, country: "CA", lat: 43.8971, lng: -78.8658, population: 175383 },
  { name: "Barrie", provinceCode: "ON", provinceName: ON, country: "CA", lat: 44.3894, lng: -79.6903, population: 147829 },
  { name: "Guelph", provinceCode: "ON", provinceName: ON, country: "CA", lat: 43.5448, lng: -80.2482, population: 144356 },
  { name: "Cambridge", provinceCode: "ON", provinceName: ON, country: "CA", lat: 43.3601, lng: -80.3127, population: 138479 },
  { name: "Kingston", provinceCode: "ON", provinceName: ON, country: "CA", lat: 44.2312, lng: -76.4860, population: 132485 },
  { name: "Thunder Bay", provinceCode: "ON", provinceName: ON, country: "CA", lat: 48.3809, lng: -89.2477, population: 108843 },
  { name: "Waterloo", provinceCode: "ON", provinceName: ON, country: "CA", lat: 43.4643, lng: -80.5204, population: 121436 },
  { name: "St. Catharines", provinceCode: "ON", provinceName: ON, country: "CA", lat: 43.1594, lng: -79.2469, population: 136803, aliases: ["Saint Catharines", "St Catharines"] },
  { name: "Niagara Falls", provinceCode: "ON", provinceName: ON, country: "CA", lat: 43.0896, lng: -79.0849, population: 94415 },

  // ── Alberta ─────────────────────────────────────────────────────────────
  { name: "Calgary", provinceCode: "AB", provinceName: AB, country: "CA", lat: 51.0447, lng: -114.0719, population: 1306784 },
  { name: "Edmonton", provinceCode: "AB", provinceName: AB, country: "CA", lat: 53.5461, lng: -113.4938, population: 1010899 },
  { name: "Red Deer", provinceCode: "AB", provinceName: AB, country: "CA", lat: 52.2681, lng: -113.8112, population: 100844 },
  { name: "Lethbridge", provinceCode: "AB", provinceName: AB, country: "CA", lat: 49.6939, lng: -112.8418, population: 98406 },
  { name: "St. Albert", provinceCode: "AB", provinceName: AB, country: "CA", lat: 53.6305, lng: -113.6256, population: 68232, aliases: ["Saint Albert"] },
  { name: "Medicine Hat", provinceCode: "AB", provinceName: AB, country: "CA", lat: 50.0410, lng: -110.6764, population: 63271 },
  { name: "Grande Prairie", provinceCode: "AB", provinceName: AB, country: "CA", lat: 55.1707, lng: -118.7949, population: 64141 },
  { name: "Airdrie", provinceCode: "AB", provinceName: AB, country: "CA", lat: 51.2917, lng: -114.0144, population: 80603 },
  { name: "Spruce Grove", provinceCode: "AB", provinceName: AB, country: "CA", lat: 53.5450, lng: -113.9180, population: 37645 },
  { name: "Leduc", provinceCode: "AB", provinceName: AB, country: "CA", lat: 53.2664, lng: -113.5491, population: 34094 },
  { name: "Fort McMurray", provinceCode: "AB", provinceName: AB, country: "CA", lat: 56.7264, lng: -111.3803, population: 68002 },

  // ── British Columbia ───────────────────────────────────────────────────
  { name: "Vancouver", provinceCode: "BC", provinceName: BC, country: "CA", lat: 49.2827, lng: -123.1207, population: 662248 },
  { name: "Surrey", provinceCode: "BC", provinceName: BC, country: "CA", lat: 49.1913, lng: -122.8490, population: 568322 },
  { name: "Burnaby", provinceCode: "BC", provinceName: BC, country: "CA", lat: 49.2488, lng: -122.9805, population: 249125 },
  { name: "Richmond", provinceCode: "BC", provinceName: BC, country: "CA", lat: 49.1666, lng: -123.1336, population: 209937 },
  { name: "Abbotsford", provinceCode: "BC", provinceName: BC, country: "CA", lat: 49.0504, lng: -122.3045, population: 153524 },
  { name: "Coquitlam", provinceCode: "BC", provinceName: BC, country: "CA", lat: 49.2837, lng: -122.7932, population: 148625 },
  { name: "Kelowna", provinceCode: "BC", provinceName: BC, country: "CA", lat: 49.8880, lng: -119.4960, population: 144576 },
  { name: "Saanich", provinceCode: "BC", provinceName: BC, country: "CA", lat: 48.4849, lng: -123.3815, population: 117735 },
  { name: "Langley", provinceCode: "BC", provinceName: BC, country: "CA", lat: 49.1042, lng: -122.6604, population: 132603 },
  { name: "Delta", provinceCode: "BC", provinceName: BC, country: "CA", lat: 49.0847, lng: -123.0586, population: 108455 },
  { name: "Nanaimo", provinceCode: "BC", provinceName: BC, country: "CA", lat: 49.1659, lng: -123.9401, population: 99863 },
  { name: "Kamloops", provinceCode: "BC", provinceName: BC, country: "CA", lat: 50.6745, lng: -120.3273, population: 97902 },
  { name: "Victoria", provinceCode: "BC", provinceName: BC, country: "CA", lat: 48.4284, lng: -123.3656, population: 91867 },
  { name: "Prince George", provinceCode: "BC", provinceName: BC, country: "CA", lat: 53.9171, lng: -122.7497, population: 76708 },
  { name: "Chilliwack", provinceCode: "BC", provinceName: BC, country: "CA", lat: 49.1579, lng: -121.9514, population: 93203 },

  // ── Manitoba ────────────────────────────────────────────────────────────
  { name: "Winnipeg", provinceCode: "MB", provinceName: MB, country: "CA", lat: 49.8951, lng: -97.1384, population: 749607 },
  { name: "Brandon", provinceCode: "MB", provinceName: MB, country: "CA", lat: 49.8483, lng: -99.9501, population: 51313 },
  { name: "Steinbach", provinceCode: "MB", provinceName: MB, country: "CA", lat: 49.5258, lng: -96.6839, population: 17806 },
  { name: "Thompson", provinceCode: "MB", provinceName: MB, country: "CA", lat: 55.7435, lng: -97.8558, population: 13035 },
  { name: "Portage la Prairie", provinceCode: "MB", provinceName: MB, country: "CA", lat: 49.9728, lng: -98.2917, population: 13270 },

  // ── Saskatchewan ───────────────────────────────────────────────────────
  { name: "Saskatoon", provinceCode: "SK", provinceName: SK, country: "CA", lat: 52.1332, lng: -106.6700, population: 266141 },
  { name: "Regina", provinceCode: "SK", provinceName: SK, country: "CA", lat: 50.4452, lng: -104.6189, population: 226404 },
  { name: "Prince Albert", provinceCode: "SK", provinceName: SK, country: "CA", lat: 53.2034, lng: -105.7530, population: 37756 },
  { name: "Moose Jaw", provinceCode: "SK", provinceName: SK, country: "CA", lat: 50.3934, lng: -105.5519, population: 33665 },
  { name: "Swift Current", provinceCode: "SK", provinceName: SK, country: "CA", lat: 50.2854, lng: -107.7972, population: 16604 },
  { name: "Yorkton", provinceCode: "SK", provinceName: SK, country: "CA", lat: 51.2139, lng: -102.4628, population: 16280 },

  // ── Nova Scotia ────────────────────────────────────────────────────────
  { name: "Halifax", provinceCode: "NS", provinceName: NS, country: "CA", lat: 44.6488, lng: -63.5752, population: 439819 },
  { name: "Cape Breton", provinceCode: "NS", provinceName: NS, country: "CA", lat: 46.1351, lng: -60.1831, population: 93694, aliases: ["Cape Breton Regional Municipality", "Sydney"] },
  { name: "Truro", provinceCode: "NS", provinceName: NS, country: "CA", lat: 45.3672, lng: -63.2806, population: 12954 },
  { name: "New Glasgow", provinceCode: "NS", provinceName: NS, country: "CA", lat: 45.5933, lng: -62.6450, population: 9075 },
  { name: "Kentville", provinceCode: "NS", provinceName: NS, country: "CA", lat: 45.0775, lng: -64.4960, population: 6630 },
  { name: "Amherst", provinceCode: "NS", provinceName: NS, country: "CA", lat: 45.8333, lng: -64.2000, population: 9550 },
  { name: "Bridgewater", provinceCode: "NS", provinceName: NS, country: "CA", lat: 44.3789, lng: -64.5184, population: 8788 },
  { name: "Yarmouth", provinceCode: "NS", provinceName: NS, country: "CA", lat: 43.8374, lng: -66.1175, population: 6518 },

  // ── New Brunswick ──────────────────────────────────────────────────────
  { name: "Moncton", provinceCode: "NB", provinceName: NB, country: "CA", lat: 46.0878, lng: -64.7782, population: 79470 },
  { name: "Saint John", provinceCode: "NB", provinceName: NB, country: "CA", lat: 45.2733, lng: -66.0633, population: 69895 },
  { name: "Fredericton", provinceCode: "NB", provinceName: NB, country: "CA", lat: 45.9636, lng: -66.6431, population: 63116 },
  { name: "Dieppe", provinceCode: "NB", provinceName: NB, country: "CA", lat: 46.0989, lng: -64.6873, population: 28114 },
  { name: "Miramichi", provinceCode: "NB", provinceName: NB, country: "CA", lat: 47.0286, lng: -65.5025, population: 17537 },
  { name: "Edmundston", provinceCode: "NB", provinceName: NB, country: "CA", lat: 47.3737, lng: -68.3251, population: 16580 },
  { name: "Bathurst", provinceCode: "NB", provinceName: NB, country: "CA", lat: 47.6184, lng: -65.6510, population: 12157 },
  { name: "Campbellton", provinceCode: "NB", provinceName: NB, country: "CA", lat: 48.0078, lng: -66.6731, population: 6883 },

  // ── Newfoundland and Labrador ─────────────────────────────────────────
  { name: "St. John's", provinceCode: "NL", provinceName: NL, country: "CA", lat: 47.5615, lng: -52.7126, population: 110525, aliases: ["Saint Johns", "St Johns", "St. Johns"] },
  { name: "Mount Pearl", provinceCode: "NL", provinceName: NL, country: "CA", lat: 47.5189, lng: -52.8058, population: 22957 },
  { name: "Corner Brook", provinceCode: "NL", provinceName: NL, country: "CA", lat: 48.9500, lng: -57.9500, population: 19316 },
  { name: "Conception Bay South", provinceCode: "NL", provinceName: NL, country: "CA", lat: 47.5169, lng: -52.9986, population: 26199 },
  { name: "Grand Falls-Windsor", provinceCode: "NL", provinceName: NL, country: "CA", lat: 48.9333, lng: -55.6500, population: 13853, aliases: ["Grand Falls Windsor"] },
  { name: "Gander", provinceCode: "NL", provinceName: NL, country: "CA", lat: 48.9569, lng: -54.6089, population: 11688 },
  { name: "Labrador City", provinceCode: "NL", provinceName: NL, country: "CA", lat: 52.9437, lng: -66.9119, population: 7412 },

  // ── Prince Edward Island ──────────────────────────────────────────────
  { name: "Charlottetown", provinceCode: "PE", provinceName: PE, country: "CA", lat: 46.2382, lng: -63.1311, population: 38809 },
  { name: "Summerside", provinceCode: "PE", provinceName: PE, country: "CA", lat: 46.3950, lng: -63.7872, population: 16001 },
  { name: "Stratford", provinceCode: "PE", provinceName: PE, country: "CA", lat: 46.2189, lng: -63.0894, population: 10119 },

  // ── Territories ───────────────────────────────────────────────────────
  { name: "Whitehorse", provinceCode: "YT", provinceName: YT, country: "CA", lat: 60.7212, lng: -135.0568, population: 28201 },
  { name: "Yellowknife", provinceCode: "NT", provinceName: NT, country: "CA", lat: 62.4540, lng: -114.3718, population: 20340 },
  { name: "Iqaluit", provinceCode: "NU", provinceName: NU, country: "CA", lat: 63.7467, lng: -68.5170, population: 7429 },
];

/** Fast lookup index built once at module load for case/diacritic-insensitive search. */
const PLACE_INDEX = CANADIAN_PLACES.map((place) => ({
  place,
  haystack: placeSearchHaystack(place),
}));

/**
 * Search the Canadian places dataset.
 *
 * Returns up to `limit` matches sorted by:
 * 1. Exact prefix match on the place name (case/diacritic-insensitive).
 * 2. Population (descending) when no geo is given.
 * 3. Distance from `geo` (ascending) when a geo origin is provided.
 *
 * The matcher is alias-aware: typing "quebec city" matches "Québec",
 * "rouyn noranda" matches "Rouyn-Noranda", "saint john" matches both
 * "Saint John" (NB) and "St. John's" (NL).
 *
 * NB this function does NO server calls. It is sync and pure.
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

  const provinceFilter = options.provinces ? new Set(options.provinces) : null;

  const matches: { place: CanadianPlace; score: number; distanceKm: number | null }[] = [];

  for (const { place, haystack } of PLACE_INDEX) {
    if (provinceFilter && !provinceFilter.has(place.provinceCode)) continue;
    if (!haystack.includes(needle)) continue;
    const nameNormalized = normalizePlaceQuery(place.name);

    // Score: prefer prefix matches > word-start matches > substring.
    let score = 0;
    if (nameNormalized.startsWith(needle)) score += 100;
    else if (nameNormalized.includes(` ${needle}`)) score += 60;
    else if (nameNormalized.includes(needle)) score += 30;
    else score += 10;

    score += Math.min(20, Math.floor(((place.population ?? 0) / 50000) * 2));

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
