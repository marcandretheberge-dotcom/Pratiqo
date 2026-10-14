import "next/dist/server/node-environment";
import { getSupabaseAdmin } from "../lib/supabaseAdmin";
import { fetchTeacherPublicSeoRowById, fetchIndexableTeacherSitemapRows } from "../lib/seo/teacherPublicProfileData";
import { isTeacherMarketplaceVisibleRow, isTeacherPublicProfileIndexable, isTeacherPublicProfilePageVisible } from "../lib/seo/teacherPublicProfile";
import { getTeacherListingBookability } from "../lib/teachers/listingBookability";
import { fetchIndexableDiscoveryTeachers, resolveCityHubDiscoveryPage, resolveSubjectCityDiscoveryPage, teacherIsOnlineCapable } from "../lib/seo/localTeacherDiscoveryPages";

// Read-only. Load credentials through the process environment, never command arguments.
async function main() {
  const origin = process.env.SEO_TEST_BASE_URL ?? "https://www.pratiqo.ca";
  const inventory = process.argv.includes("--inventory");
  const paths = new Set(["/", "/tuteurs/saint-georges", "/tuteurs/levis", "/tuteurs/quebec", "/cours/francais/saint-georges", "/cours/francais/beloeil", "/cours/unknown/unknown", "/sitemap.xml", "/robots.txt"]);
  const supply = inventory ? await fetchIndexableDiscoveryTeachers() : [];
  if (inventory) {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("teachers_public").select("id");
    if (error) throw new Error("public_inventory_unavailable");
    const rows = [];
    for (const { id } of data ?? []) {
      const row = await fetchTeacherPublicSeoRowById(id);
      if (row && isTeacherMarketplaceVisibleRow(row)) rows.push(row);
    }
    const readiness = await getTeacherListingBookability(admin, rows.map((row) => row.id));
    const publicResponse = await fetch(`${origin}/api/teachers/plans?${new URLSearchParams({ ids: rows.map((row) => row.id).join(",") })}`, { signal: AbortSignal.timeout(30000) });
    if (!publicResponse.ok) throw new Error("public_bookability_unavailable");
    const publicMetadata = await publicResponse.json() as { bookingReadiness?: Record<string, boolean | null> };
    console.log(JSON.stringify({ publicApiReservable: rows.filter((row) => publicMetadata.bookingReadiness?.[row.id] === true).length, publicApiUnknown: rows.filter((row) => publicMetadata.bookingReadiness?.[row.id] == null).length, publicApiMatchesLocalEvaluation: rows.every((row) => publicMetadata.bookingReadiness?.[row.id] === readiness[row.id]) }));
    const sitemapProfiles = await fetchIndexableTeacherSitemapRows();
    const eligible = rows.filter((row) => readiness[row.id] === true);
    console.log(JSON.stringify({ inventoryAt: new Date().toISOString(), discoverable: rows.length, reservable: eligible.length, unknown: rows.filter((row) => readiness[row.id] == null).length, localDiscoveryProfiles: supply.map((row) => row.public_profile_slug), sitemapProfiles: sitemapProfiles.map((row) => row.slug) }));
    for (const row of eligible) {
      const visible = isTeacherPublicProfilePageVisible(row);
      const path = visible && row.public_profile_slug ? `/professeurs/${row.public_profile_slug}` : null;
      if (path) paths.add(path);
      const { data: publicPrice, error: priceError } = await admin.from("teachers_public").select("price_per_lesson").eq("id", row.id).maybeSingle();
      if (priceError) throw new Error("public_price_unavailable");
      console.log(JSON.stringify({ reservableProfile: path, public: visible, indexable: isTeacherPublicProfileIndexable(row), sitemap: sitemapProfiles.some((entry) => entry.slug === row.public_profile_slug), subject: row.discipline, city: row.city, format: row.teaching_mode, publicRateCad: publicPrice?.price_per_lesson }));
    }
  }
  const sitemapResponse = await fetch(`${origin}/sitemap.xml`, { signal: AbortSignal.timeout(30000) });
  const sitemap = await sitemapResponse.text();
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  console.log(JSON.stringify({ origin, sitemapStatus: sitemapResponse.status, total: urls.length, courseCity: urls.filter((url) => /\/cours\/[^/]+\/[^/]+$/.test(url)).length, cities: urls.filter((url) => /\/tuteurs\//.test(url)).length }));
  for (const url of urls.filter((url) => url.includes("/professeurs/"))) paths.add(new URL(url).pathname);
  for (const path of paths) {
    const response = await fetch(`${origin}${path}`, { redirect: "manual", headers: { "user-agent": "Googlebot" }, signal: AbortSignal.timeout(30000) });
    const html = await response.text();
    const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
    const parts = path.split("/");
    const bundle = !inventory ? null : parts[1] === "tuteurs" ? await resolveCityHubDiscoveryPage(parts[2], async () => supply) : parts[1] === "cours" ? await resolveSubjectCityDiscoveryPage(parts[2], parts[3], async () => supply) : null;
    console.log(JSON.stringify({ path, status: response.status,
      robots: html.match(/name="robots" content="([^"]*)/i)?.[1], canonical: html.match(/rel="canonical" href="([^"]*)/i)?.[1],
      title: html.match(/<title>([^<]*)/i)?.[1], description: html.match(/name="description" content="([^"]*)/i)?.[1],
      h1: [...visible.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((match) => match[1].replace(/<[^>]*>/g, "")),
      hreflang: [...html.matchAll(/hrefLang="([^"]*)" href="([^"]*)"/gi)].map((match) => [match[1], match[2]]),
      schemas: [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap((match) => [...match[1].matchAll(/"@type":"([^"]+)"/g)].map((item) => item[1])),
      profileLinks: [...visible.matchAll(/href="(\/professeurs\/[^"?]+)"/g)].map((match) => match[1]),
      inSitemap: urls.includes(`https://www.pratiqo.ca${path}`),
      evaluatedLocalPublicSupply: bundle?.localTeacherCount,
      evaluatedOnlineAlternatives: bundle ? bundle.teachers.filter((teacher) => !teacher.isLocalSupply && teacherIsOnlineCapable(teacher.teachingMode) && teacher.isOnlineFallback).length : undefined,
    }));
  }
}

main().catch(() => { console.error("SEO audit failed: verify data/network access; no credentials or private rows logged."); process.exitCode = 1; });
