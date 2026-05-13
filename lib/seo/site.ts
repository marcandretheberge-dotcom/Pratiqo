/**
 * Canonical production origin (always use `www` for metadata, sitemap, robots,
 * JSON-LD URLs, and internal SEO links).
 *
 * For per-page metadata.alternates use `buildAlternates()` from
 * `lib/seo/alternates.ts` — it handles both the pre-migration state (canonical
 * only, no hreflang languages map) and the post-migration state (full hreflang
 * map for routes flagged `localized: true` in `lib/i18n/routes.ts`). Do not
 * hand-roll `alternates: { languages: { ... } }` blocks in pages.
 */
export const SITE_URL = "https://www.pratiqo.ca" as const;
