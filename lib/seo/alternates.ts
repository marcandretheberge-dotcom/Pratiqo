/**
 * Per-page metadata.alternates builder.
 *
 * Each Next.js `generateMetadata` (or static `metadata`) that wants correct
 * hreflang annotations should call `buildAlternates()` instead of hand-rolling
 * the `alternates: { canonical, languages }` block.
 *
 * Why a helper?
 *   - Pre-migration (today), most public routes are served from a single
 *     non-prefixed URL. The right SEO call is `canonical` ONLY — no hreflang
 *     `languages` map at all, because Google explicitly recommends against
 *     hreflang where every alternate resolves to the same URL.
 *   - Post-migration, the same routes will serve distinct URLs per locale and
 *     should emit a `languages` map with one entry per supported locale plus
 *     `x-default`.
 *
 * The helper handles both states from one call site, so step 1.3/1.4 just
 * need to flip the route registry — no per-page changes required.
 */

import type { Metadata } from "next";
import { SITE_URL } from "./site";
import {
  LOCALE_BCP47,
  LOCALES,
  ROUTING_DEFAULT_LOCALE,
  withLocale,
} from "../i18n/routing";
import {
  findRoute,
  type PublicRoute,
} from "../i18n/routes";

type Alternates = NonNullable<Metadata["alternates"]>;

export interface BuildAlternatesOptions {
  /**
   * Route registry key. If supplied and found, the helper derives the
   * canonical and (when localized) the languages map automatically.
   */
  routeKey?: string;
  /**
   * Path-relative override for routes not in the static registry (dynamic
   * routes like `/blog/[slug]`, `/teacher/profile/[id]`,
   * `/tuteurs-prive/[citySlug]`). Pre-migration this becomes the canonical
   * URL; post-migration callers should pass a `localizedPaths` map alongside
   * to emit per-locale alternates.
   */
  path?: string;
  /**
   * Optional per-locale paths for dynamic routes that have been migrated
   * (e.g. `/fr/blog/mon-billet`, `/en/blog/my-post`, `/es/blog/mi-articulo`).
   * When provided, the helper emits hreflang alternates.
   */
  localizedPaths?: Partial<Record<keyof typeof LOCALE_BCP47, string>>;
}

/**
 * Build the `alternates` block for a Next.js `Metadata` object. Returns just
 * the `alternates` payload — callers spread it into their `Metadata`.
 *
 *   export const metadata: Metadata = {
 *     title: "Tarifs",
 *     ...buildAlternates({ routeKey: "tarifs" }),
 *   };
 */
export function buildAlternates(options: BuildAlternatesOptions): Pick<Metadata, "alternates"> {
  const route = options.routeKey ? findRoute(options.routeKey) : undefined;

  const segmentPath =
    route?.paths[ROUTING_DEFAULT_LOCALE] ??
    options.localizedPaths?.[ROUTING_DEFAULT_LOCALE] ??
    options.path ??
    "/";

  const localized = route?.localized ?? Boolean(options.localizedPaths);

  const canonical = localized
    ? absUrl(withLocale(segmentPath, ROUTING_DEFAULT_LOCALE))
    : absUrl(segmentPath);

  if (!localized) {
    return { alternates: { canonical } };
  }

  const languages: Record<string, string> = {};
  for (const locale of LOCALES) {
    const segment = route?.paths[locale] ?? options.localizedPaths?.[locale];
    if (segment) languages[LOCALE_BCP47[locale]] = absUrl(withLocale(segment, locale));
  }
  languages["x-default"] = canonical;

  const alternates: Alternates = { canonical, languages };
  return { alternates };
}

/**
 * Convenience used by the sitemap: returns the hreflang `languages` map for a
 * route (or `undefined` if the route is not yet localized). Sitemap entries
 * take this shape under `alternates.languages` in `MetadataRoute.Sitemap`.
 */
export function sitemapAlternates(route: PublicRoute): Record<string, string> | undefined {
  if (!route.localized) return undefined;
  const map: Record<string, string> = {};
  for (const locale of LOCALES) {
    map[LOCALE_BCP47[locale]] = absUrl(withLocale(route.paths[locale], locale));
  }
  map["x-default"] = absUrl(withLocale(route.paths[ROUTING_DEFAULT_LOCALE], ROUTING_DEFAULT_LOCALE));
  return map;
}

function absUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
