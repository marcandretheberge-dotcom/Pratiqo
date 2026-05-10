/**
 * Canonical production origin (always use `www` for metadata, sitemap, robots,
 * JSON-LD URLs, and internal SEO links).
 *
 * Locale / language is chosen via client cookie + same URL — there are no distinct
 * localized routes yet. Do **not** emit hreflang alternates that imply separate URLs
 * until locale routing exists; keep `alternates.canonical` on this single URL pattern.
 */
export const SITE_URL = "https://www.pratiqo.ca" as const;
