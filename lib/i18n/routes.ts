/**
 * Public route registry — single source of truth for the sitemap, hreflang
 * alternates, and any cross-route navigation helper that needs to know which
 * URL belongs to which locale.
 *
 * ## State machine
 *
 * Each entry has a `localized` flag and a `paths: Record<Locale, string>` map:
 *
 *   - `localized: false` (today, pre-migration) — the route is served from a
 *     single non-prefixed URL. All three locale slots in `paths` point to the
 *     same string. The sitemap emits ONE entry per route; `metadata.alternates`
 *     emits only `canonical` (no hreflang languages map) because emitting
 *     hreflang where every alternate resolves to the same URL is a documented
 *     Google anti-pattern.
 *
 *   - `localized: true` (post step 1.3 for marketing, step 1.4 for app) — the
 *     route is migrated to `app/[locale]/...`. Each locale gets a distinct URL
 *     (e.g. fr=/fr/tarifs, en=/en/tarifs, es=/es/tarifs). The sitemap emits
 *     one entry per route with `alternates.languages`; the page's
 *     `metadata.alternates.languages` is the same map. The unprefixed form
 *     301-redirects to the default locale.
 *
 * This shape lets steps 1.3/1.4 migrate routes one at a time by flipping
 * `localized: true` and updating `paths`, without touching sitemap/metadata
 * code.
 *
 * Marketing routes that today exist as pseudo-localized siblings
 * (`/become-teacher` + `/devenir-enseignant`) stay as separate registry
 * entries until step 1.3; at that point they collapse into a single
 * `localized: true` entry whose `paths` map carries the historic French slug
 * (`/fr/devenir-enseignant`) and the English slug (`/en/become-teacher`).
 * Until then we keep both URLs indexed and 301 them to the new shape in 1.3.
 */

import type { Locale } from "./types";
import { ROUTING_DEFAULT_LOCALE } from "./routing";

export type RouteChangeFrequency =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

export interface PublicRoute {
  /** Stable internal key; used by callers needing to look up the route programmatically. */
  key: string;
  /** Per-locale absolute paths (always start with "/"). */
  paths: Record<Locale, string>;
  /** True once the route has been migrated to `app/[locale]/...`. */
  localized: boolean;
  /** Sitemap `changefreq`. Default "monthly". */
  changeFrequency?: RouteChangeFrequency;
  /** Sitemap `priority` (0.0–1.0). Default 0.7. */
  priority?: number;
}

/**
 * Convenience: build a registry entry whose three locales share the same
 * (unprefixed) path. Used during the pre-migration phase.
 */
function shared(
  key: string,
  path: string,
  meta?: Pick<PublicRoute, "changeFrequency" | "priority">,
): PublicRoute {
  return {
    key,
    paths: { en: path, fr: path, es: path },
    localized: false,
    changeFrequency: meta?.changeFrequency,
    priority: meta?.priority,
  };
}

/**
 * The complete list of *static* public routes. Dynamic routes (cities,
 * disciplines, blog posts, teacher profiles) are appended by the sitemap.
 *
 * Authenticated-only routes (dashboard, profile, messages, …) are NOT listed
 * here — they're blocked from crawlers in robots.ts and excluded from the
 * sitemap on purpose.
 */
export const PUBLIC_STATIC_ROUTES: readonly PublicRoute[] = [
  shared("home", "/", { changeFrequency: "weekly", priority: 1.0 }),
  shared("become-teacher", "/become-teacher", { changeFrequency: "monthly", priority: 0.9 }),
  shared("devenir-enseignant", "/devenir-enseignant", { changeFrequency: "monthly", priority: 0.9 }),
  shared("teacher-profile-hub", "/teacher/profile", { changeFrequency: "weekly", priority: 0.75 }),
  shared("group-sessions", "/group-sessions", { changeFrequency: "daily", priority: 0.8 }),
  shared("tarifs", "/tarifs", { changeFrequency: "monthly", priority: 0.8 }),
  shared("trouver-un-prof", "/trouver-un-prof", { changeFrequency: "monthly", priority: 0.85 }),
  shared("francisation", "/francisation", { changeFrequency: "monthly", priority: 0.85 }),
  shared("login", "/login", { changeFrequency: "yearly", priority: 0.6 }),
  shared("cgu", "/cgu", { changeFrequency: "yearly", priority: 0.4 }),
  shared("confidentialite", "/confidentialite", { changeFrequency: "yearly", priority: 0.4 }),
  shared("annulation", "/annulation", { changeFrequency: "yearly", priority: 0.4 }),
  shared("blog", "/blog", { changeFrequency: "daily", priority: 0.9 }),
];

/**
 * Look up a public route by key. Returns `undefined` if the key is unknown.
 * Useful for layouts/pages that want to derive their own `metadata.alternates`
 * from the central registry rather than hard-coding URLs in two places.
 */
export function findRoute(key: string): PublicRoute | undefined {
  return PUBLIC_STATIC_ROUTES.find((r) => r.key === key);
}

/**
 * Canonical (server-rendered) URL for a registry route. Pre-migration this is
 * the single shared path; post-migration this is the default-locale variant.
 */
export function canonicalPathFor(route: PublicRoute): string {
  return route.paths[ROUTING_DEFAULT_LOCALE];
}
