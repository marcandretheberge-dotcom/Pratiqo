import {
  AUTH_ROUTE_PATHS,
  PUBLIC_INDEXABLE_EXACT_PATHS,
  PRIVATE_ROUTE_PREFIXES,
  RENDER_ASSET_ALLOW_PREFIXES,
  SITE_HOSTNAME,
  SITE_URL,
} from "@/lib/seo/config";

function normalizePath(pathname: string): string {
  const cleaned = pathname.trim() || "/";
  const withLeadingSlash = cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
  const withoutHash = withLeadingSlash.split("#")[0] ?? "/";
  const withoutQuery = withoutHash.split("?")[0] ?? "/";
  const collapsed = withoutQuery.replace(/\/{2,}/g, "/");
  if (collapsed === "/") return "/";
  return collapsed.replace(/\/+$/g, "");
}

export function getCanonicalPath(pathname = "/"): string {
  if (/^https?:\/\//i.test(pathname)) {
    try {
      return normalizePath(new URL(pathname).pathname);
    } catch {
      return "/";
    }
  }
  return normalizePath(pathname);
}

export function getCanonicalUrl(pathname = "/"): string {
  const path = getCanonicalPath(pathname);
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}

export function getCanonicalHost(): string {
  return SITE_HOSTNAME;
}

export function isPreviewOrLocalOrigin(origin: string): boolean {
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

export function isSeoAuthRoute(pathname: string): boolean {
  const path = getCanonicalPath(pathname);
  return AUTH_ROUTE_PATHS.some((route) => path === route || path.startsWith(`${route}/`));
}

export function isRenderAssetPath(pathname: string): boolean {
  const path = getCanonicalPath(pathname);
  return RENDER_ASSET_ALLOW_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix));
}

export function isPrivateSeoRoute(pathname: string): boolean {
  const path = getCanonicalPath(pathname);
  return PRIVATE_ROUTE_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix));
}

export function isKnownPublicSeoRoute(pathname: string): boolean {
  const path = getCanonicalPath(pathname);
  if (PUBLIC_INDEXABLE_EXACT_PATHS.includes(path as (typeof PUBLIC_INDEXABLE_EXACT_PATHS)[number])) {
    return true;
  }

  if (
    path.startsWith("/blog/") ||
    path.startsWith("/ressources/") ||
    path.startsWith("/cours/") ||
    path.startsWith("/tuteurs/") ||
    path.startsWith("/professeurs/")
  ) {
    return true;
  }

  // YoPratiqo Spanish acquisition pages currently live under explicit /fr/* and /en/* URLs.
  return /^\/(?:fr|en)\/[^/]+/.test(path);
}

export function getCanonicalSearchPath(pathname = "/trouver-un-prof"): string {
  const path = getCanonicalPath(pathname);
  if (path === "/recherche" || path === "/search" || path === "/trouver-un-prof") {
    return "/trouver-un-prof";
  }
  if (path.startsWith("/cours/") || path.startsWith("/tuteurs/")) return path;
  return "/trouver-un-prof";
}
