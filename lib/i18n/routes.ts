/**
 * Public route registry — single source of truth for the sitemap, hreflang
 * alternates, and any cross-route navigation helper that needs to know which
 * URL belongs to which locale.
 *
 * ## State machine
 *
 * Each entry has a `localized` flag and a `paths: Record<Locale, string>` map:
 *
 *   - `localized: true` (default for marketing/SEO routes post step 1.3) — the
 *     route is served from `app/[locale]/…`. Each locale gets a URL prefixed
 *     with its short code (e.g. `/fr/tarifs`, `/en/tarifs`, `/es/tarifs`). The
 *     sitemap emits one entry per route with `alternates.languages`; the
 *     page's `metadata.alternates.languages` is the same map. The unprefixed
 *     form 301-redirects to the cookie-detected (or default) locale at the
 *     proxy layer.
 *
 *     Most routes share the same slug across locales because their slug is
 *     already a brand term (`/blog`, `/group-sessions`, `/teacher/profile`)
 *     or a French marketing slug we keep for SEO equity (`/tarifs`,
 *     `/trouver-un-prof`, `/francisation`). The `become-teacher` route is the
 *     one early case of true per-locale slugs (`/en/become-teacher` vs
 *     `/fr/devenir-enseignant`).
 *
 *   - `localized: false` — the route is served from a single unprefixed URL
 *     and ignores the locale segment (e.g. `/login` and other auth/OAuth
 *     callbacks). The sitemap emits ONE entry with no hreflang languages map.
 */

import type { Locale } from "./types";
import { ROUTING_DEFAULT_LOCALE, withLocale } from "./routing";

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
 * Convenience: build a localized registry entry whose three locales share the
 * same slug (e.g. `/tarifs` → `/{locale}/tarifs`).
 */
function localizedSame(
  key: string,
  path: string,
  meta?: Pick<PublicRoute, "changeFrequency" | "priority">,
): PublicRoute {
  return {
    key,
    paths: { en: path, fr: path, es: path },
    localized: true,
    changeFrequency: meta?.changeFrequency,
    priority: meta?.priority,
  };
}

/** Public URL that stays unprefixed (OAuth, auth flows). */
function unlocalized(
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
  localizedSame("home", "/", { changeFrequency: "weekly", priority: 1.0 }),
  {
    key: "become-teacher",
    paths: { en: "/become-teacher", fr: "/devenir-enseignant", es: "/become-teacher" },
    localized: true,
    changeFrequency: "monthly",
    priority: 0.9,
  },
  localizedSame("teacher-profile-hub", "/teacher/profile", { changeFrequency: "weekly", priority: 0.75 }),
  localizedSame("group-sessions", "/group-sessions", { changeFrequency: "daily", priority: 0.8 }),
  localizedSame("tarifs", "/tarifs", { changeFrequency: "monthly", priority: 0.8 }),
  localizedSame("trouver-un-prof", "/trouver-un-prof", { changeFrequency: "monthly", priority: 0.85 }),
  localizedSame("francisation", "/francisation", { changeFrequency: "monthly", priority: 0.85 }),
  unlocalized("login", "/login", { changeFrequency: "yearly", priority: 0.6 }),
  localizedSame("cgu", "/cgu", { changeFrequency: "yearly", priority: 0.4 }),
  localizedSame("confidentialite", "/confidentialite", { changeFrequency: "yearly", priority: 0.4 }),
  localizedSame("annulation", "/annulation", { changeFrequency: "yearly", priority: 0.4 }),
  localizedSame("blog", "/blog", { changeFrequency: "daily", priority: 0.9 }),
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
  if (route.localized) {
    return withLocale(route.paths[ROUTING_DEFAULT_LOCALE], ROUTING_DEFAULT_LOCALE);
  }
  return route.paths[ROUTING_DEFAULT_LOCALE];
}
