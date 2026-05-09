import type { MetadataRoute } from "next";
import { getSupabaseAdmin } from "../lib/supabaseAdmin";
import { QC_CITIES, MV_BARRIOS } from "../lib/constants/cities";
import { DISCIPLINE_CITY_PAIRS } from "../lib/seo/disciplines";

const BASE_URL = "https://pratiqo.ca";

// ── Static public routes ──────────────────────────────────────────────────────
//
// Only routes that render a real, publicly-accessible page are included.
// Authenticated-only pages (dashboard, profile, messages, …) are omitted and
// blocked in robots.ts.
const STATIC_ROUTES: MetadataRoute.Sitemap = [
  {
    url: `${BASE_URL}/`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 1.0,
  },
  {
    url: `${BASE_URL}/become-teacher`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    url: `${BASE_URL}/devenir-enseignant`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    url: `${BASE_URL}/student/search`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.9,
  },
  {
    url: `${BASE_URL}/group-sessions`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.8,
  },
  {
    url: `${BASE_URL}/tarifs`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    url: `${BASE_URL}/trouver-un-prof`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.85,
  },
  {
    url: `${BASE_URL}/francisation`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.85,
  },
  {
    url: `${BASE_URL}/login`,
    lastModified: new Date(),
    changeFrequency: "yearly",
    priority: 0.6,
  },
  {
    url: `${BASE_URL}/cgu`,
    lastModified: new Date(),
    changeFrequency: "yearly",
    priority: 0.4,
  },
  {
    url: `${BASE_URL}/confidentialite`,
    lastModified: new Date(),
    changeFrequency: "yearly",
    priority: 0.4,
  },
  {
    url: `${BASE_URL}/annulation`,
    lastModified: new Date(),
    changeFrequency: "yearly",
    priority: 0.4,
  },
];

// ── Dynamic tutor profile routes ──────────────────────────────────────────────
//
// Fetched server-side at request/build time via the service-role Supabase
// client.  Wrapped in try/catch so a DB outage never breaks the build.
async function fetchTeacherEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("teachers")
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
    // DB unavailable during static export — return empty; static routes still served.
    return [];
  }
}

// ── Blog routes ──────────────────────────────────────────────────────────────
//
// The /blog hub + individual post pages.
// Post slugs are fetched at build time so Google indexes them immediately.
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
//
// One URL per city in QC_CITIES, statically generated at build time.
// Marked as "monthly" since content changes only when new teachers join.
const CITY_ROUTES: MetadataRoute.Sitemap = QC_CITIES.map((city) => ({
  url: `${BASE_URL}/tuteurs-prive/${city.slug}`,
  lastModified: new Date(),
  changeFrequency: "monthly" as const,
  priority: 0.8,
}));

// ── Montevideo barrio routes ───────────────────────────────────────────────────
//
// One URL per barrio, each targeting a tighter neighbourhood search.
const BARRIO_ROUTES: MetadataRoute.Sitemap = MV_BARRIOS.map((b) => ({
  url: `${BASE_URL}/clases/montevideo/${b.slug}`,
  lastModified: new Date(),
  changeFrequency: "monthly" as const,
  priority: 0.75,
}));

// ── Discipline × city landing pages ───────────────────────────────────────────
//
// Pre-rendered pages for /cours/[disciplineSlug]/[citySlug].
// Limited to a curated set of discipline × city combinations.
const DISCIPLINE_CITY_ROUTES: MetadataRoute.Sitemap = DISCIPLINE_CITY_PAIRS.map((pair) => ({
  url: `${BASE_URL}/cours/${pair.disciplineSlug}/${pair.citySlug}`,
  lastModified: new Date(),
  changeFrequency: "monthly" as const,
  priority: 0.75,
}));

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [teacherEntries, blogEntries] = await Promise.all([
    fetchTeacherEntries(),
    fetchBlogEntries(),
  ]);

  // Blog hub page (static)
  const blogHubRoute: MetadataRoute.Sitemap = [{
    url: `${BASE_URL}/blog`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.9,
  }];

  return [
    ...STATIC_ROUTES,
    ...blogHubRoute,
    ...blogEntries,
    ...CITY_ROUTES,
    ...DISCIPLINE_CITY_ROUTES,
    ...BARRIO_ROUTES,
    ...teacherEntries,
  ];
}
