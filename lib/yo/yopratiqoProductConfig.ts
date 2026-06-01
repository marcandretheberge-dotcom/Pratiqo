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

/**
 * Page-type taxonomy used by the metadata helper, sitemap, and Course
 * schema gates. We deliberately separate the three layers because the
 * SEO posture is different for each:
 *
 *   - "hub"     → /yo/langues               — indexable, public discovery
 *   - "landing" → /yo/langues/{language}    — indexable, Course schema
 *   - "intro"   → /yo/langues/{language}/intro
 *                                          — kept noindex while the
 *                                            interactive lesson surface
 *                                            is still pre-launch quality
 *
 * This first SEO exposure step indexes ONLY the hub + landing layer.
 * Intro lesson pages remain noindex until the lesson product is ready
 * for public ranking.
 */
export type YoPratiqoPageType = "hub" | "landing" | "intro";

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
  // ── Route-aware indexing flags ───────────────────────────────────────
  //
  // The first SEO exposure step indexes ONLY the public discovery layer:
  //   - the YoPratiqo language hub (/yo/langues)
  //   - the five language landing pages (/yo/langues/{language})
  //
  // The interactive intro lesson pages stay noindex on purpose until
  // the lesson surface is ready for public ranking. `moduleIndexingEnabled`
  // is kept as a backwards-compatible alias for the intro-page flag so
  // older call sites never accidentally flip intro indexing on.
  hubIndexingEnabled: true,
  landingPageIndexingEnabled: true,
  introPageIndexingEnabled: false,
  /** @deprecated Use `introPageIndexingEnabled`. Kept for backwards compatibility. */
  moduleIndexingEnabled: false,
  courseSchemaEnabled: true,
  landingPagesEnabled: true,
  supportedProductTypes: ["free_intro"] as const satisfies readonly YoPratiqoProductType[],
  nextLanguageCandidates: ["korean", "portuguese", "german", "mandarin"] as const,
} as const;

/** @deprecated Use `isYoIntroPageIndexable(slug)`. Kept for backwards compatibility. */
export const YO_MODULES_INDEXABLE = yopratiqoProductConfig.introPageIndexingEnabled;

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

export function findYoPratiqoModuleBySlug(
  slug: string,
): YoPratiqoModuleConfig | null {
  const moduleConfig = yopratiqoProductConfig.currentFreeIntroModules.find(
    (entry) => entry.slug === slug,
  );
  return moduleConfig ?? null;
}

/**
 * Whether the YoPratiqo language hub (/yo/langues) is indexable. The
 * hub is the single discovery URL that links to every language landing
 * page, so it stays indexable as soon as the discovery layer ships.
 */
export function isYoHubIndexable(): boolean {
  return yopratiqoProductConfig.hubIndexingEnabled;
}

/**
 * Whether a language landing page (e.g. /yo/langues/japonais) is
 * indexable. Returns `false` for unknown slugs so a typo can never
 * accidentally surface a page as indexable.
 */
export function isYoLandingPageIndexable(slug: string): boolean {
  if (!yopratiqoProductConfig.landingPageIndexingEnabled) return false;
  const moduleConfig = findYoPratiqoModuleBySlug(slug);
  return moduleConfig !== null;
}

/**
 * Whether a language intro lesson page (e.g.
 * /yo/langues/japonais/intro) is indexable. Both the global flag AND
 * the per-module flag must be true — the per-module override gives us
 * a defensive second gate the day intro indexing is flipped on.
 */
export function isYoIntroPageIndexable(slug: string): boolean {
  if (!yopratiqoProductConfig.introPageIndexingEnabled) return false;
  const moduleConfig = findYoPratiqoModuleBySlug(slug);
  return moduleConfig !== null && moduleConfig.indexable;
}

/**
 * Decides whether to inject the Course JSON-LD on a given page. By
 * design, Course schema is allowed ONLY on language landing pages,
 * never on the hub and never on intro pages. Even when intro indexing
 * is eventually flipped on, intro pages still must not advertise a
 * Course unless this contract is intentionally re-evaluated.
 */
export function shouldPublishYoCourseSchema(
  slug: string,
  pageType: YoPratiqoPageType,
): boolean {
  if (pageType !== "landing") return false;
  if (!yopratiqoProductConfig.courseSchemaEnabled) return false;
  if (!isYoLandingPageIndexable(slug)) return false;
  const moduleConfig = findYoPratiqoModuleBySlug(slug);
  return Boolean(moduleConfig && moduleConfig.courseSchemaEligible);
}

/**
 * Backwards-compatible wrapper used by `YoLanguageLandingPage`. Routes
 * through `shouldPublishYoCourseSchema(slug, "landing")` so all four
 * gates (page type, landing indexability, courseSchemaEnabled,
 * per-module eligibility) stay in sync.
 */
export function canInjectYoPratiqoCourseSchema(
  moduleConfig: YoPratiqoModuleConfig,
): boolean {
  return shouldPublishYoCourseSchema(moduleConfig.slug, "landing");
}

/**
 * @deprecated Use `isYoIntroPageIndexable(slug)`. Kept for backwards
 * compatibility with existing call sites that operate on a module
 * config object instead of a slug.
 */
export function isYoPratiqoModuleIndexable(
  moduleConfig: YoPratiqoModuleConfig,
): boolean {
  return isYoIntroPageIndexable(moduleConfig.slug);
}
