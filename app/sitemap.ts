import type { MetadataRoute } from "next";
import { getSupabaseAdmin } from "../lib/supabaseAdmin";
import { TEACHERS_PUBLIC_TABLE } from "../lib/supabase/queries";
import { QC_CITIES, MV_BARRIOS } from "../lib/constants/cities";
import { DISCIPLINE_CITY_PAIRS } from "../lib/seo/disciplines";
import { SITE_URL } from "../lib/seo/site";
import {
  PUBLIC_STATIC_ROUTES,
  canonicalPathFor,
  type PublicRoute,
  type RouteChangeFrequency,
} from "../lib/i18n/routes";
import { sitemapAlternates } from "../lib/seo/alternates";

const BASE_URL = SITE_URL;

// ── Helpers ───────────────────────────────────────────────────────────────────

function entryFromRoute(route: PublicRoute, lastMod: Date): MetadataRoute.Sitemap[number] {
  const languages = sitemapAlternates(route);
  return {
    url: `${BASE_URL}${canonicalPathFor(route)}`,
    lastModified: lastMod,
    changeFrequency: (route.changeFrequency ?? "monthly") satisfies RouteChangeFrequency,
    priority: route.priority ?? 0.7,
    ...(languages ? { alternates: { languages } } : {}),
  };
}

// ── Static public routes ──────────────────────────────────────────────────────
//
// Driven by the central registry (lib/i18n/routes.ts) so steps 1.3/1.4 can
// flip individual routes to localized URLs without touching this file.
// Authenticated-only pages (dashboard, profile, messages, …) are omitted on
// purpose and blocked in robots.ts.
function buildStaticRoutes(now: Date): MetadataRoute.Sitemap {
  return PUBLIC_STATIC_ROUTES.map((route) => entryFromRoute(route, now));
}

// ── Dynamic tutor profile routes ──────────────────────────────────────────────
//
// Uses TEACHERS_PUBLIC_TABLE (public listing view — excludes deactivated/deleted
// rows per view definition). Count scales with active teachers; omit from sitemap
// if build-time queries become too heavy.
async function fetchTeacherEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(TEACHERS_PUBLIC_TABLE)
      .select("id, updated_at")
      .order("updated_at", { ascending: false });

    if (error || !data) return [];

    return (data as { id: string; updated_at: string | null }[]).map((row) => ({
      url: `${BASE_URL}/teacher/profile/${encodeURIComponent(row.id)}`,
      lastModified: row.updated_at ? new Date(row.updated_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    return [];
  }
}

// ── Blog routes ──────────────────────────────────────────────────────────────
async function fetchBlogEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("blog_posts")
      .select("slug, updated_at")
      .not("published_at", "is", null)
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false });

    if (error || !data) return [];

    return (data as { slug: string; updated_at: string | null }[]).map((row) => ({
      url: `${BASE_URL}/blog/${row.slug}`,
      lastModified: row.updated_at ? new Date(row.updated_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.85,
    }));
  } catch {
    return [];
  }
}

// ── City landing-page routes ───────────────────────────────────────────────────
const CITY_ROUTES: MetadataRoute.Sitemap = QC_CITIES.map((city) => ({
  url: `${BASE_URL}/tuteurs-prive/${city.slug}`,
  lastModified: new Date(),
  changeFrequency: "monthly" as const,
  priority: 0.8,
}));

// ── Montevideo barrio routes ───────────────────────────────────────────────────
const BARRIO_ROUTES: MetadataRoute.Sitemap = MV_BARRIOS.map((b) => ({
  url: `${BASE_URL}/clases/montevideo/${b.slug}`,
  lastModified: new Date(),
  changeFrequency: "monthly" as const,
  priority: 0.75,
}));

// ── Discipline × city landing pages ───────────────────────────────────────────
const DISCIPLINE_CITY_ROUTES: MetadataRoute.Sitemap = DISCIPLINE_CITY_PAIRS.map((pair) => ({
  url: `${BASE_URL}/cours/${pair.disciplineSlug}/${pair.citySlug}`,
  lastModified: new Date(),
  changeFrequency: "monthly" as const,
  priority: 0.75,
}));

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [teacherEntries, blogEntries] = await Promise.all([
    fetchTeacherEntries(),
    fetchBlogEntries(),
  ]);

  return [
    ...buildStaticRoutes(now),
    ...blogEntries,
    ...CITY_ROUTES,
    ...DISCIPLINE_CITY_ROUTES,
    ...BARRIO_ROUTES,
    ...teacherEntries,
  ];
}
