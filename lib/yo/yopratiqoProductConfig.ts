export type YoPratiqoProductType = "free_intro";
export type YoPratiqoModuleStatus = "free_intro";

export type YoPratiqoLanguageId =
  | "english"
  | "francais-quebec"
  | "spanish"
  | "japanese"
  | "italian";

export type YoPratiqoModuleSlug =
  | "anglais"
  | "francais-quebec"
  | "espagnol"
  | "japonais"
  | "italien";

export type YoPratiqoModuleConfig = {
  id: YoPratiqoLanguageId;
  slug: YoPratiqoModuleSlug;
  languageName: string;
  languageLabelFr: string;
  languageLabelEn: string;
  path: string;
  introRoute: string;
  landingRoute: string;
  inLanguage: string;
  educationalLevel: string;
  productType: YoPratiqoProductType;
  status: YoPratiqoModuleStatus;
  isAccessibleForFree: boolean;
  indexable: boolean;
  courseSchemaEligible: boolean;
  teacherSearchQuery: string;
  teacherSearchUrl: string;
};

export const yopratiqoProductConfig = {
  productName: "YoPratiqo",
  legalOperator: "Cours Pratiqo Inc.",
  publicBrand: "Pratiqo",
  currentLanguages: [
    "english",
    "francais-quebec",
    "spanish",
    "japanese",
    "italian",
  ] as const satisfies readonly YoPratiqoLanguageId[],
  currentFreeIntroModules: [
    {
      id: "english",
      slug: "anglais",
      languageName: "English",
      languageLabelFr: "Anglais",
      languageLabelEn: "English",
      path: "/yo/langues/anglais/intro",
      introRoute: "/yo/langues/anglais/intro",
      landingRoute: "/yo/langues/anglais",
      inLanguage: "en-CA",
      educationalLevel: "Beginner / A1 orientation",
      productType: "free_intro",
      status: "free_intro",
      isAccessibleForFree: true,
      indexable: false,
      courseSchemaEligible: true,
      teacherSearchQuery: "anglais",
      teacherSearchUrl: "/trouver-un-prof?q=anglais",
    },
    {
      id: "francais-quebec",
      slug: "francais-quebec",
      languageName: "Quebec French / Francisation",
      languageLabelFr: "Français québécois",
      languageLabelEn: "Quebec French",
      path: "/yo/langues/francais-quebec/intro",
      introRoute: "/yo/langues/francais-quebec/intro",
      landingRoute: "/yo/langues/francais-quebec",
      inLanguage: "fr-CA",
      educationalLevel: "Beginner / pre-arrival orientation",
      productType: "free_intro",
      status: "free_intro",
      isAccessibleForFree: true,
      indexable: false,
      courseSchemaEligible: true,
      teacherSearchQuery: "francais",
      teacherSearchUrl: "/trouver-un-prof?q=francais",
    },
    {
      id: "spanish",
      slug: "espagnol",
      languageName: "Spanish",
      languageLabelFr: "Espagnol",
      languageLabelEn: "Spanish",
      path: "/yo/langues/espagnol/intro",
      introRoute: "/yo/langues/espagnol/intro",
      landingRoute: "/yo/langues/espagnol",
      inLanguage: "es",
      educationalLevel: "Beginner / A1 orientation",
      productType: "free_intro",
      status: "free_intro",
      isAccessibleForFree: true,
      indexable: false,
      courseSchemaEligible: true,
      teacherSearchQuery: "espagnol",
      teacherSearchUrl: "/trouver-un-prof?q=espagnol",
    },
    {
      id: "japanese",
      slug: "japonais",
      languageName: "Japanese",
      languageLabelFr: "Japonais",
      languageLabelEn: "Japanese",
      path: "/yo/langues/japonais/intro",
      introRoute: "/yo/langues/japonais/intro",
      landingRoute: "/yo/langues/japonais",
      inLanguage: "ja",
      educationalLevel: "Beginner / A1 orientation",
      productType: "free_intro",
      status: "free_intro",
      isAccessibleForFree: true,
      indexable: false,
      courseSchemaEligible: true,
      teacherSearchQuery: "japonais",
      teacherSearchUrl: "/trouver-un-prof?q=japonais",
    },
    {
      id: "italian",
      slug: "italien",
      languageName: "Italian",
      languageLabelFr: "Italien",
      languageLabelEn: "Italian",
      path: "/yo/langues/italien/intro",
      introRoute: "/yo/langues/italien/intro",
      landingRoute: "/yo/langues/italien",
      inLanguage: "it",
      educationalLevel: "Beginner / A1 orientation",
      productType: "free_intro",
      status: "free_intro",
      isAccessibleForFree: true,
      indexable: false,
      courseSchemaEligible: true,
      teacherSearchQuery: "italien",
      teacherSearchUrl: "/trouver-un-prof?q=italien",
    },
  ] as const satisfies readonly YoPratiqoModuleConfig[],
  futurePremiumEnabled: false,
  teacherBridgeEnabled: true,
  moduleIndexingEnabled: false,
  courseSchemaEnabled: false,
  landingPagesEnabled: true,
  supportedProductTypes: ["free_intro"] as const satisfies readonly YoPratiqoProductType[],
  nextLanguageCandidates: ["korean", "portuguese", "german", "mandarin"] as const,
} as const;

export const YO_MODULES_INDEXABLE = yopratiqoProductConfig.moduleIndexingEnabled;

export function getYoPratiqoModuleBySlug(
  slug: YoPratiqoModuleSlug,
): YoPratiqoModuleConfig {
  const moduleConfig = yopratiqoProductConfig.currentFreeIntroModules.find(
    (entry) => entry.slug === slug,
  );

  if (!moduleConfig) {
    throw new Error(`Unknown YoPratiqo module slug: ${slug}`);
  }

  return moduleConfig;
}

export function isYoPratiqoModuleIndexable(
  moduleConfig: YoPratiqoModuleConfig,
): boolean {
  return yopratiqoProductConfig.moduleIndexingEnabled && moduleConfig.indexable;
}

export function canInjectYoPratiqoCourseSchema(
  moduleConfig: YoPratiqoModuleConfig,
): boolean {
  return (
    yopratiqoProductConfig.courseSchemaEnabled &&
    isYoPratiqoModuleIndexable(moduleConfig) &&
    moduleConfig.courseSchemaEligible
  );
}
