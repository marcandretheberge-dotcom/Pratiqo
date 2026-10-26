import type { Metadata } from "next";

import { ROBOTS_DISALLOW_PATHS, SITE_URL } from "@/lib/seo/config";
import { isKnownPublicSeoRoute, isPrivateSeoRoute, isRenderAssetPath, isSeoAuthRoute } from "@/lib/seo/urls";

export const INDEX_FOLLOW = { index: true, follow: true } as const;
export const NOINDEX_NOFOLLOW = { index: false, follow: false } as const;

export function shouldIndexRoute(pathname: string): boolean {
  if (isRenderAssetPath(pathname)) return false;
  if (isSeoAuthRoute(pathname)) return false;
  if (isPrivateSeoRoute(pathname)) return false;
  return isKnownPublicSeoRoute(pathname);
}

export function getRobotsForRoute(pathname: string): Metadata["robots"] {
  return shouldIndexRoute(pathname) ? INDEX_FOLLOW : NOINDEX_NOFOLLOW;
}

export function buildNoIndexMetadata(title = "Pratiqo"): Metadata {
  return {
    title,
    robots: NOINDEX_NOFOLLOW,
  };
}

export function getRobotsTxtRules() {
  return [
    {
      userAgent: "*",
      // Crawlers must reach legacy public profile details to observe their
      // canonical redirect (or noindex when no indexable profile exists).
      // The trailing slash keeps the old listing and private /teacher routes blocked.
      allow: ["/", "/teacher/profile/"],
      disallow: [...ROBOTS_DISALLOW_PATHS],
    },
  ];
}

export function getRobotsSitemapUrl(): string {
  return `${SITE_URL}/sitemap.xml`;
}

