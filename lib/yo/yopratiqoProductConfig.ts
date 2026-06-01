export type YoPratiqoProductType = "free_intro" | "future_premium_module";
export type YoPratiqoModuleStatus = "free_intro" | "planned";

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
 * for public ranking. The "future_premium" type is reserved for paid
 * module shells that exist on disk for future development but must
 * never be advertised, indexed, or made purchasable yet.
 */
export type YoPratiqoPageType =
  | "hub"
  | "landing"
  | "intro"
  | "future_premium";

/**
 * Future paid premium module config. The first published shell is the
 * Quebec French / Francisation workplace-survival module living at
 * /yo/langues/francais-quebec/module-1. Every flag below is keyed off
 * the global `premiumModulesEnabled` switch so a single boolean can
 * keep the whole surface dormant. Nothing here is checkout-eligible
 * until `premiumModulesEnabled` is intentionally flipped on AND the
 * per-module `publicLaunchEnabled` / `checkoutEnabled` flags are
 * audited for the launch.
 */
export type YoPratiqoFuturePremiumModuleConfig = {
  /** Stable identifier used by tests and future Supabase rows. */
  id: string;
  /** Slug of the language hub the module belongs to. */
  languageSlug: YoPratiqoModuleSlug;
  /** Canonical public route for the module shell. */
  route: string;
  /** Lifecycle status — kept narrow so a future flip is reviewable. */
  status: "planned";
  /** Product taxonomy key. Always `future_premium_module` for this list. */
  productType: Extract<YoPratiqoProductType, "future_premium_module">;
  /**
   * Whether the module is publicly available for purchase. Must remain
   * `false` until the entire premium surface is launch-ready.
   */
  publicLaunchEnabled: boolean;
  /**
   * Whether checkout is wired to a payment processor. Pinned to
   * `false` for the duration of the shell — the shell intentionally
   * carries no Stripe / payments / commission coupling.
   */
  checkoutEnabled: boolean;
  /**
   * Whether the module shell route is indexable by search engines.
   * Stays `false` until both `premiumModulesEnabled` and
   * `publicLaunchEnabled` are true.
   */
  indexable: boolean;
  /**
   * Whether the module is allowed to advertise a Course JSON-LD
   * schema. False for shells — Course schema would falsely signal a
   * live product to crawlers.
   */
  courseSchemaEligible: boolean;
  /**
   * Whether the page renders the Pratiqo teacher-bridge CTA. Allowed
   * even on the shell because /trouver-un-prof is the canonical free
   * way to reach a real teacher today.
   */
  teacherBridgeEnabled: boolean;
  /**
   * Internal pricing hypothesis in CAD cents. Kept as a planning input
   * only — the shell never surfaces it as a live checkout price. Must
   * never be rendered without an explicit "Bientôt disponible" / "Not
   * yet available" qualifier.
   */
  priceHypothesisCadCents: number;
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
  // ── Future premium modules (shells only) ──────────────────────────────
  //
  // Every entry below is an internal/future-ready content shell. None of
  // them are publicly purchasable today. Two layered flags must agree
  // before any premium surface goes live:
  //   1. `premiumModulesEnabled` (this object) — global kill switch
  //   2. per-entry `publicLaunchEnabled` AND `checkoutEnabled`
  // The first published shell is the Quebec French / Francisation
  // workplace-survival module at /yo/langues/francais-quebec/module-1.
  premiumModulesEnabled: false,
  futurePremiumModules: [
    {
      id: "fr-quebec-workplace-survival-1",
      languageSlug: "francais-quebec",
      route: "/yo/langues/francais-quebec/module-1",
      status: "planned",
      productType: "future_premium_module",
      publicLaunchEnabled: false,
      checkoutEnabled: false,
      indexable: false,
      courseSchemaEligible: false,
      teacherBridgeEnabled: true,
      priceHypothesisCadCents: 2499,
    },
  ] as const satisfies readonly YoPratiqoFuturePremiumModuleConfig[],
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
  // The premium product surface is intentionally NOT in
  // `supportedProductTypes` while it is still a shell. Adding it here
  // would imply the surface is ready for runtime checks like checkout
  // gating; keep the type union narrow until launch.
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

// ─────────────────────────────────────────────────────────────────────
// Future premium module helpers
// ─────────────────────────────────────────────────────────────────────
//
// The functions below are deliberately read-only / fail-closed. They
// exist so call sites never have to remember the precedence order
// between the global kill switch and the per-module flags — every
// gate funnels through `isYoPremiumModulePubliclyAvailable` and
// `isYoPremiumModuleCheckoutEnabled` so a future flip stays auditable
// with `git log`.

/** Look up a future premium module by stable id. */
export function getYoFuturePremiumModuleById(
  id: string,
): YoPratiqoFuturePremiumModuleConfig | null {
  const entry = yopratiqoProductConfig.futurePremiumModules.find(
    (m) => m.id === id,
  );
  return entry ?? null;
}

/** Look up a future premium module by canonical route. */
export function getYoFuturePremiumModuleByRoute(
  route: string,
): YoPratiqoFuturePremiumModuleConfig | null {
  const entry = yopratiqoProductConfig.futurePremiumModules.find(
    (m) => m.route === route,
  );
  return entry ?? null;
}

/**
 * Whether a future premium module is publicly available right now.
 * Both gates must agree:
 *   1. `premiumModulesEnabled` (global)
 *   2. per-module `publicLaunchEnabled`
 * Returns `false` for unknown ids so a typo can never accidentally
 * surface a module as publicly available.
 */
export function isYoPremiumModulePubliclyAvailable(id: string): boolean {
  if (!yopratiqoProductConfig.premiumModulesEnabled) return false;
  const entry = getYoFuturePremiumModuleById(id);
  return entry !== null && entry.publicLaunchEnabled;
}

/**
 * Whether checkout is allowed for a future premium module. This is a
 * stricter gate than public availability — even a publicly listed
 * module can have `checkoutEnabled: false` while a payment integration
 * is being audited. Returns `false` for unknown ids.
 */
export function isYoPremiumModuleCheckoutEnabled(id: string): boolean {
  if (!yopratiqoProductConfig.premiumModulesEnabled) return false;
  const entry = getYoFuturePremiumModuleById(id);
  return (
    entry !== null && entry.publicLaunchEnabled && entry.checkoutEnabled
  );
}

/**
 * Whether a future premium module shell is allowed to be indexed by
 * search engines. The shell stays noindex until the entire surface is
 * launch-ready — the per-module `indexable` flag is a defensive
 * second gate so we never accidentally surface a half-built module.
 */
export function isYoPremiumModuleIndexable(id: string): boolean {
  if (!yopratiqoProductConfig.premiumModulesEnabled) return false;
  const entry = getYoFuturePremiumModuleById(id);
  return entry !== null && entry.publicLaunchEnabled && entry.indexable;
}
