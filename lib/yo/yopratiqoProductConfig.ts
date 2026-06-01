export type YoPratiqoProductType = "free_intro";

export type YoPratiqoLanguageId =
  | "english"
  | "francais-quebec"
  | "spanish"
  | "japanese"
  | "italian";

export type YoPratiqoModuleConfig = {
  id: YoPratiqoLanguageId;
  languageName: string;
  path: string;
  inLanguage: string;
  educationalLevel: string;
  productType: YoPratiqoProductType;
  isAccessibleForFree: boolean;
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
      languageName: "English",
      path: "/yo/langues/anglais/intro",
      inLanguage: "en-CA",
      educationalLevel: "Beginner / A1 orientation",
      productType: "free_intro",
      isAccessibleForFree: true,
    },
    {
      id: "francais-quebec",
      languageName: "Quebec French / Francisation",
      path: "/yo/langues/francais-quebec/intro",
      inLanguage: "fr-CA",
      educationalLevel: "Beginner / pre-arrival orientation",
      productType: "free_intro",
      isAccessibleForFree: true,
    },
    {
      id: "spanish",
      languageName: "Spanish",
      path: "/yo/langues/espagnol/intro",
      inLanguage: "es",
      educationalLevel: "Beginner / A1 orientation",
      productType: "free_intro",
      isAccessibleForFree: true,
    },
    {
      id: "japanese",
      languageName: "Japanese",
      path: "/yo/langues/japonais/intro",
      inLanguage: "ja",
      educationalLevel: "Beginner / A1 orientation",
      productType: "free_intro",
      isAccessibleForFree: true,
    },
    {
      id: "italian",
      languageName: "Italian",
      path: "/yo/langues/italien/intro",
      inLanguage: "it",
      educationalLevel: "Beginner / A1 orientation",
      productType: "free_intro",
      isAccessibleForFree: true,
    },
  ] as const satisfies readonly YoPratiqoModuleConfig[],
  futurePremiumEnabled: false,
  teacherBridgeEnabled: true,
  moduleIndexingEnabled: false,
  supportedProductTypes: ["free_intro"] as const satisfies readonly YoPratiqoProductType[],
  nextLanguageCandidates: ["korean", "portuguese", "german", "mandarin"] as const,
} as const;

export const YO_MODULES_INDEXABLE = yopratiqoProductConfig.moduleIndexingEnabled;
