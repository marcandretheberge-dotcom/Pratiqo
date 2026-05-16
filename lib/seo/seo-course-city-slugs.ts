/**
 * Québec cities used for SEO course/city URL matrix (`/fr/cours/[discipline]/[city]`).
 * Slugs must exist in {@link QC_CITIES}.
 */
export const SEO_COURSE_CITY_SLUGS = [
  "montreal",
  "quebec",
  "laval",
  "longueuil",
  "sherbrooke",
  "trois-rivieres",
  "gatineau",
  "drummondville",
  "levis",
  "saint-georges",
  "brossard",
  "terrebonne",
  "blainville",
  "repentigny",
  "granby",
  "saint-hyacinthe",
  "saguenay",
  "rimouski",
  "rouyn-noranda",
  "val-dor",
] as const;

export type SeoCourseCitySlug = (typeof SEO_COURSE_CITY_SLUGS)[number];
