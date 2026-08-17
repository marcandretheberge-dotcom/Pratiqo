import type { MetadataRoute } from "next";

import { SITE_HOSTNAME } from "@/lib/seo/config";
import { getCanonicalPath, isKnownPublicSeoRoute, isPrivateSeoRoute } from "@/lib/seo/urls";

type SitemapEntry = MetadataRoute.Sitemap[number];

export function shouldIncludeInSitemap(url: string): boolean {
  let path: string;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.toLowerCase() !== SITE_HOSTNAME) return false;
    path = getCanonicalPath(parsed.pathname);
  } catch {
    path = getCanonicalPath(url);
  }

  if (isPrivateSeoRoute(path)) return false;
  return isKnownPublicSeoRoute(path);
}

export function filterSitemapEntries(entries: MetadataRoute.Sitemap): MetadataRoute.Sitemap {
  const seen = new Set<string>();
  const out: SitemapEntry[] = [];

  for (const entry of entries) {
    if (!shouldIncludeInSitemap(entry.url)) continue;
    if (seen.has(entry.url)) continue;
    seen.add(entry.url);
    out.push(entry);
  }

  return out;
}

export function shouldIndexDisciplinePage(input: {
  active?: boolean;
  searchable?: boolean;
  hasUsefulContent?: boolean;
}): boolean {
  return input.active === true && input.searchable !== false && input.hasUsefulContent === true;
}

export function shouldIndexCityDisciplinePage(input: {
  marketSeoEnabled?: boolean;
  disciplineEnabled?: boolean;
  cityEnabled?: boolean;
  availableTeacherCount?: number | null;
  hasUsefulContent?: boolean;
}): boolean {
  if (input.marketSeoEnabled !== true) return false;
  if (input.disciplineEnabled !== true) return false;
  if (input.cityEnabled !== true) return false;
  if (typeof input.availableTeacherCount !== "number" || input.availableTeacherCount < 1) return false;
  return input.hasUsefulContent !== false;
}
