/**
 * Which URL paths are part of the public marketing surface that lives under
 * `app/[locale]/…` (step 1.3). Used by the edge proxy for 301 redirects and
 * by client navigation helpers (`withLocaleHref`, locale switcher).
 *
 * Authenticated app routes (dashboard, student, …) stay unprefixed until
 * step 1.4 — they must NOT be listed here.
 */

import { isLocale, type Locale } from "./types";
import { getLocaleFromPath, ROUTING_DEFAULT_LOCALE, stripLocale, withLocale } from "./routing";
import { findRoute, PUBLIC_STATIC_ROUTES } from "./routes";

/** French-only slug for the “become a teacher” landing (paired with `/become-teacher`). */
export const DEVENIR_ENSEIGNANT_PATH = "/devenir-enseignant";

/**
 * Returns true when `pathname` is a marketing path that should be served only
 * under `/{locale}/…` (has no locale prefix yet).
 *
 * @param pathname Must start with `/`, no locale prefix (e.g. `/tarifs`).
 */
export function isUnprefixedMarketingPath(pathname: string): boolean {
  if (!pathname || pathname === "/") return true;

  if (pathname === "/become-teacher" || pathname.startsWith("/become-teacher/")) return true;
  if (pathname === DEVENIR_ENSEIGNANT_PATH || pathname.startsWith(`${DEVENIR_ENSEIGNANT_PATH}/`)) return true;
  if (pathname === "/devenir-prof" || pathname.startsWith("/devenir-prof/")) return true;

  if (pathname === "/tarifs" || pathname.startsWith("/tarifs/")) return true;
  if (pathname === "/trouver-un-prof" || pathname.startsWith("/trouver-un-prof/")) return true;
  if (pathname === "/francisation" || pathname.startsWith("/francisation/")) return true;

  if (pathname === "/blog" || pathname.startsWith("/blog/")) return true;

  if (pathname === "/cgu" || pathname.startsWith("/cgu/")) return true;
  if (pathname === "/confidentialite" || pathname.startsWith("/confidentialite/")) return true;
  if (pathname === "/annulation" || pathname.startsWith("/annulation/")) return true;
  if (pathname === "/contact" || pathname.startsWith("/contact/")) return true;
  if (pathname === "/charte-de-confiance" || pathname.startsWith("/charte-de-confiance/")) return true;
  if (pathname === "/standards-communaute" || pathname.startsWith("/standards-communaute/")) return true;

  if (pathname === "/tuteurs-prive" || pathname.startsWith("/tuteurs-prive/")) return true;
  if (pathname === "/cours" || pathname.startsWith("/cours/")) return true;
  if (pathname === "/clases" || pathname.startsWith("/clases/")) return true;

  if (pathname === "/teacher/profile" || pathname.startsWith("/teacher/profile/")) return true;

  if (pathname === "/group-sessions") return true;
  if (/^\/group-sessions\/[^/]+$/.test(pathname)) return true;

  return false;
}

/**
 * Maps legacy marketing slugs to the canonical route key so we can resolve
 * per-locale paths (e.g. FR uses `/devenir-enseignant`, EN uses `/become-teacher`).
 */
export function marketingRouteKeyForPath(strippedPath: string): string | null {
  const p = strippedPath.split("?")[0] ?? strippedPath;
  if (p === "/become-teacher" || p.startsWith("/become-teacher/")) return "become-teacher";
  if (p === DEVENIR_ENSEIGNANT_PATH || p.startsWith(`${DEVENIR_ENSEIGNANT_PATH}/`)) return "become-teacher";
  return null;
}

/**
 * Full path including `/{locale}` for switching UI locale while staying on the
 * same logical page (handles become-teacher FR/EN slug split).
 */
export function marketingPathForLocale(strippedPath: string, targetLocale: Locale): string {
  const key = marketingRouteKeyForPath(strippedPath);
  if (key) {
    const route = findRoute(key);
    if (route?.localized) {
      const segment = route.paths[targetLocale];
      return withLocale(segment, targetLocale);
    }
  }
  return withLocale(strippedPath, targetLocale);
}

/**
 * Prefixes a marketing `href` with `/{locale}` when appropriate. Leaves
 * `/login`, `/api`, `/auth`, app-only paths, and already-prefixed URLs unchanged.
 */
export function withLocaleHref(href: string, locale: Locale): string {
  if (!href || href.startsWith("mailto:") || href.startsWith("tel:")) return href;
  if (/^https?:\/\//i.test(href)) return href;

  const hashIdx = href.indexOf("#");
  const hash = hashIdx >= 0 ? href.slice(hashIdx) : "";
  const beforeHash = hashIdx >= 0 ? href.slice(0, hashIdx) : href;
  const qIdx = beforeHash.indexOf("?");
  const query = qIdx >= 0 ? beforeHash.slice(qIdx) : "";
  const pathname = qIdx >= 0 ? beforeHash.slice(0, qIdx) : beforeHash;

  if (!pathname.startsWith("/")) return href;

  const firstSeg = pathname.split("/")[1];
  if (firstSeg && isLocale(firstSeg)) return href;

  if (!isUnprefixedMarketingPath(pathname)) return href;

  const key = marketingRouteKeyForPath(pathname);
  if (key) {
    const route = findRoute(key);
    if (route?.localized) {
      const segment = route.paths[locale];
      return `${withLocale(segment, locale)}${query}${hash}`;
    }
  }

  return `${withLocale(pathname, locale)}${query}${hash}`;
}

/**
 * Unprefixed marketing URLs always 301 to the **French** locale prefix (`/fr/…`)
 * so canonicals, sitemap `<loc>`, and crawl entry points stay aligned for
 * pratiqo.ca SEO. After redirect, `withLocaleHref` prefixes further in-app
 * navigation using the active locale segment.
 */
export function legacyMarketingRedirectPath(pathname: string, search: string): string {
  const pathOnly = pathname.split("?")[0] || pathname;
  const target = ROUTING_DEFAULT_LOCALE;

  // become-teacher / devenir-enseignant share a logical page but use locale-
  // specific slugs (EN: /become-teacher, FR: /devenir-enseignant). Resolve
  // through the route registry so the redirect lands on the correct locale slug.
  const key = marketingRouteKeyForPath(pathOnly);
  if (key) {
    const route = findRoute(key);
    if (route?.localized) {
      const segment = route.paths[target];
      const base = withLocale(segment, target);
      // For become-teacher we currently have no sub-paths in the registry, so
      // append nothing — falling through to the generic branch below would
      // mis-prefix sub-routes if any were added without registry updates.
      return `${base}${search}`;
    }
  }

  return `${withLocale(pathOnly, target)}${search}`;
}

/** Slug aliases for legacy English/Globish paths not present in `PUBLIC_STATIC_ROUTES`. */
const EXTRA_LOCALIZED_SLUG_PREFIXES: { prefix: string; targetSegment: string }[] = [
  { prefix: "/find-a-teacher", targetSegment: "/trouver-un-prof" },
  { prefix: "/pricing", targetSegment: "/tarifs" },
];

/**
 * When the URL is already prefixed with `/{locale}/…` but the path segment is
 * a **different locale’s marketing slug** (e.g. `/fr/become-teacher`), return
 * the proper 301 target. Returns `null` when no correction applies.
 *
 * Does not rewrite app-shell paths (`/student`, `/teacher/schedule`, …).
 */
export function localizedMarketingSlugRedirect(pathname: string, search: string): string | null {
  const locale = getLocaleFromPath(pathname);
  if (!locale) return null;

  const stripped = stripLocale(pathname);
  const qIdx = stripped.indexOf("?");
  const pathOnly = (qIdx >= 0 ? stripped.slice(0, qIdx) : stripped) || "/";

  for (const { prefix, targetSegment } of EXTRA_LOCALIZED_SLUG_PREFIXES) {
    if (pathOnly === prefix || pathOnly.startsWith(`${prefix}/`)) {
      const suffix = pathOnly.slice(prefix.length);
      return `${withLocale(`${targetSegment}${suffix}`, locale)}${search}`;
    }
  }

  for (const route of PUBLIC_STATIC_ROUTES) {
    if (!route.localized) continue;

    const expected = route.paths[locale];
    if (pathOnly === expected || pathOnly.startsWith(`${expected}/`)) {
      continue;
    }

    const variants = new Set(Object.values(route.paths));
    for (const wrongPath of variants) {
      if (wrongPath === expected) continue;
      if (pathOnly === wrongPath || pathOnly.startsWith(`${wrongPath}/`)) {
        const suffix = pathOnly.slice(wrongPath.length);
        return `${withLocale(`${expected}${suffix}`, locale)}${search}`;
      }
    }
  }

  return null;
}
