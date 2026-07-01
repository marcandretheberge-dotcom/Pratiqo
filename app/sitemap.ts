import type { MetadataRoute } from "next";
import { getSupabaseAdmin } from "../lib/supabaseAdmin";
import { MV_BARRIOS } from "../lib/constants/cities";
import { fetchLocalDiscoverySitemapEntries } from "../lib/seo/localTeacherDiscoveryPages";
import { SUBJECT_LANDING_PATHS } from "../lib/seo/subjectLandingPages";
import { SITE_URL } from "../lib/seo/site";
import { buildTeacherPublicProfileCanonicalUrl } from "../lib/seo/teacherPublicProfile";
import { fetchIndexableTeacherSitemapRows } from "../lib/seo/teacherPublicProfileData";
import { getPublishedResourceArticles } from "../lib/seo/resourceArticles";
import { YO_SPANISH_SEO_PATHS } from "../lib/seo/yopratiqoSpanishSeoPages";
import {
  isYoHubIndexable,
  isYoLandingPageIndexable,
  yopratiqoProductConfig,
} from "../lib/yo/yopratiqoProductConfig";
import { isGroupSessionsMarketplaceIndexable } from "../lib/groupSessionsLaunch";

const BASE_URL = SITE_URL;

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
    url: `${BASE_URL}/teacher/profile`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.75,
  },
  ...(isGroupSessionsMarketplaceIndexable()
    ? [
        {
          url: `${BASE_URL}/group-sessions`,
          lastModified: new Date(),
          changeFrequency: "daily" as const,
          priority: 0.8,
        },
      ]
    : []),
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
  // /login is intentionally excluded from the sitemap — it is a sign-in
  // surface, not a public SEO landing, and shipping it as a discovery URL
  // would split clicks away from the marketing pages and confuse Search
  // Console (the page is also kept out of `STATIC_ROUTES` to avoid emitting
  // a canonical → homepage signal).
  // Canonical legal routes only — legacy /cgu, /confidentialite, /annulation,
  // and /code-de-conduite are 308-redirected in next.config.ts and intentionally
  // excluded from the sitemap so search engines index the canonical URLs.
  {
    url: `${BASE_URL}/legal/cgu`,
    lastModified: new Date(),
    changeFrequency: "yearly",
    priority: 0.4,
  },
  {
    url: `${BASE_URL}/legal/confidentialite`,
    lastModified: new Date(),
    changeFrequency: "yearly",
    priority: 0.4,
  },
  {
    url: `${BASE_URL}/legal/annulation`,
    lastModified: new Date(),
    changeFrequency: "yearly",
    priority: 0.4,
  },
  {
    url: `${BASE_URL}/legal/code-de-conduite`,
    lastModified: new Date(),
    changeFrequency: "yearly",
    priority: 0.4,
  },
  {
    url: `${BASE_URL}/legal/conditions-professeurs`,
    lastModified: new Date(),
    changeFrequency: "yearly",
    priority: 0.4,
  },
  {
    url: `${BASE_URL}/legal/membre-pro`,
    lastModified: new Date(),
    changeFrequency: "yearly",
    priority: 0.4,
  },
  {
    url: `${BASE_URL}/legal/paiements-remboursements`,
    lastModified: new Date(),
    changeFrequency: "yearly",
    priority: 0.4,
  },
];

// ── Consented public teacher SEO profiles (/professeurs/[slug]) ─────────────
//
// Only teachers who opted in to public indexing with a valid slug are listed.
// Legacy /teacher/profile/[id] URLs are not indexed.
async function fetchTeacherEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const rows = await fetchIndexableTeacherSitemapRows();
    return rows.map((row) => ({
      url: buildTeacherPublicProfileCanonicalUrl(row.slug),
      lastModified: row.lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
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

// ── City hub + discipline × city discovery pages (supply-gated) ─────────────
//
// Only URLs with at least one admin-published, indexable teacher are listed.
async function fetchLocalDiscoveryEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const rows = await fetchLocalDiscoverySitemapEntries();
    return rows.map((row) => ({
      url: `${BASE_URL}${row.path}`,
      lastModified: row.lastModified,
      changeFrequency: "monthly" as const,
      priority: row.path.startsWith("/tuteurs/") ? 0.8 : 0.75,
    }));
  } catch {
    return [];
  }
}

// ── Montevideo barrio routes ───────────────────────────────────────────────────
//
// One URL per barrio, each targeting a tighter neighbourhood search.
const BARRIO_ROUTES: MetadataRoute.Sitemap = MV_BARRIOS.map((b) => ({
  url: `${BASE_URL}/clases/montevideo/${b.slug}`,
  lastModified: new Date(),
  changeFrequency: "monthly" as const,
  priority: 0.75,
}));

// ── Group session detail URLs ──────────────────────────────────────────────────
//
// Not listed individually: sessions change often (dates, capacity). The hub
// `/group-sessions` is enough for discovery; detail pages stay crawlable via links.

// Discipline × city pages are included via fetchLocalDiscoveryEntries when supply exists.

// ── Subject landing pages ──────────────────────────────────────────────────
//
// These are intentionally subject-only pages, not city × subject pages. They
// provide useful guidance and a prefilled search CTA without pretending that a
// teacher is available in every city.
const SUBJECT_LANDING_ROUTES: MetadataRoute.Sitemap = SUBJECT_LANDING_PATHS.map((path) => ({
  url: `${BASE_URL}${path}`,
  lastModified: new Date(),
  changeFrequency: "monthly" as const,
  priority: 0.72,
}));

// ── YoPratiqo Spanish SEO acquisition pages ──────────────────────────────────
//
// Phase 1 acquisition pages under /fr/* and /en/* that route into the YoPratiqo
// product (/yo) and the teacher search (/trouver-un-prof). FR/EN counterparts
// already declare reciprocal hreflang alternates in their per-page metadata,
// so we only need to advertise each unique URL here.
const YO_SPANISH_SEO_ROUTES: MetadataRoute.Sitemap = YO_SPANISH_SEO_PATHS.map((path) => ({
  url: `${BASE_URL}${path}`,
  lastModified: new Date(),
  changeFrequency: "monthly" as const,
  priority: 0.7,
}));

// ── YoPratiqo language hub + landing pages ───────────────────────────────────
//
// Controlled SEO exposure for the YoPratiqo discovery layer:
//   - the language hub at /yo/langues
//   - the five language landing pages at /yo/langues/{language}
//
// Intro lesson pages (/yo/langues/{language}/intro) are deliberately
// EXCLUDED from the sitemap and remain noindex per
// `yopratiqoProductConfig.introPageIndexingEnabled`. Each URL is gated
// by the product config helpers so a future flag flip removes it from
// the sitemap automatically (no second source of truth).
const YO_LANGUAGE_HUB_ROUTES: MetadataRoute.Sitemap = isYoHubIndexable()
  ? [
      {
        url: `${BASE_URL}/yo/langues`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.85,
      },
    ]
  : [];

const YO_LANGUAGE_LANDING_ROUTES: MetadataRoute.Sitemap = yopratiqoProductConfig
  .currentFreeIntroModules
  .filter((moduleConfig) => isYoLandingPageIndexable(moduleConfig.slug))
  .map((moduleConfig) => ({
    url: `${BASE_URL}${moduleConfig.landingRoute}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [teacherEntries, blogEntries, localDiscoveryEntries] = await Promise.all([
    fetchTeacherEntries(),
    fetchBlogEntries(),
    fetchLocalDiscoveryEntries(),
  ]);

  // Blog hub page (static)
  const blogHubRoute: MetadataRoute.Sitemap = [{
    url: `${BASE_URL}/blog`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.9,
  }];

  const resourceHubRoute: MetadataRoute.Sitemap = [{
    url: `${BASE_URL}/ressources`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.88,
  }];

  const resourceArticleRoutes: MetadataRoute.Sitemap = getPublishedResourceArticles().map((article) => ({
    url: `${BASE_URL}/ressources/${article.slug}`,
    lastModified: new Date(article.publishedAt),
    changeFrequency: "monthly" as const,
    priority: 0.82,
  }));

  return [
    ...STATIC_ROUTES,
    ...YO_LANGUAGE_HUB_ROUTES,
    ...YO_LANGUAGE_LANDING_ROUTES,
    ...YO_SPANISH_SEO_ROUTES,
    ...blogHubRoute,
    ...blogEntries,
    ...resourceHubRoute,
    ...resourceArticleRoutes,
    ...localDiscoveryEntries,
    ...SUBJECT_LANDING_ROUTES,
    ...BARRIO_ROUTES,
    ...teacherEntries,
  ];
}
