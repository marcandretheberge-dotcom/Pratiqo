# Pratiqo SEO Architecture Audit

Date: 2026-08-17

Scope: Pratiqo marketplace SEO architecture after the current `main` branch. This audit covers public routes, private app routes, sitemap and robots generation, canonical host behavior, structured data, teacher profile eligibility, local discovery pages, market status, and launch-safe SEO foundations. This phase is documentation-only. It does not change Stripe, booking logic, auth, RLS, Membre Pro, commission logic, YoPratiqo product logic, or market availability rules.

Reference principle: Google Search Central frames SEO as helping search engines discover, crawl, index, and understand content while helping users decide whether to click. This audit therefore prioritizes useful public pages, crawlable rendering, stable canonical URLs, honest structured data, and avoidance of thin or duplicate pages. Source: https://developers.google.com/search/docs/fundamentals/seo-starter-guide

## 1. Executive Summary

Pratiqo already has a stronger SEO base than a typical pre-launch marketplace:

- Canonical production origin is centralized as `https://www.pratiqo.ca`.
- The root layout uses `metadataBase` but intentionally avoids root-level canonical inheritance.
- Sitemap generation is explicit and excludes private app surfaces.
- Robots disallows private/app/API surfaces and advertises the sitemap.
- Public teacher SEO is consent-based and admin-published before indexing.
- Local city and subject-city SEO pages are supply-gated.
- Uruguay is modeled as a next-market page, not an active marketplace.
- Structured data is conservative and avoids fake reviews/ratings.

The main architectural risk is drift: `SITE_URL`, noindex/private-route policy, sitemap inclusion, metadata builders, and structured-data hygiene are spread across several files. The next implementation phase should add a central SEO foundation layer and regression tests without expanding indexed URL inventory.

No P0 issue was found that requires stopping after audit. Safe implementation can proceed.

## 2. Current SEO Architecture Map

Key files:

- `app/layout.tsx`: global metadataBase, app title template, OpenGraph defaults, manifest, PWA icons, no root alternates.
- `app/page.tsx`: homepage metadata and canonical.
- `app/sitemap.ts`: public sitemap with static routes, blog, resources, subject pages, supply-gated local pages, teacher profiles, YoPratiqo gates.
- `app/robots.ts`: robots policy and sitemap URL.
- `proxy.ts`: apex to www redirect, protected route guards, OAuth code forwarding.
- `next.config.ts`: permanent redirects for apex, legacy legal routes, legacy city route.
- `lib/seo/site.ts`: canonical production origin.
- `lib/seo/teacherPublicProfile.ts`: teacher SEO gating, slug, metadata copy, JSON-LD.
- `lib/seo/teacherPublicProfileData.ts`: admin data fetches for SEO teacher rows.
- `lib/seo/teacherSeoPublication.ts`: admin/publication readiness evaluation.
- `lib/seo/localTeacherDiscoveryPages.ts`: city and discipline-city supply gating, metadata text, collection JSON-LD.
- `lib/seo/subjectLandingPages.ts`: broad subject landing content and metadata.
- `lib/seo/resourceArticles.ts` and resource article files: guide/resource SEO.
- `lib/yo/yopratiqoSeo.ts` and `lib/yo/yopratiqoProductConfig.ts`: controlled YoPratiqo metadata and indexation gates.
- `lib/config/markets.ts`: Canada launched, Uruguay next market, SEO capability flags.

## 3. Public Indexable Routes

Current intended public indexable surfaces:

- `/`
- `/trouver-un-prof`
- `/trouver-mon-prof`
- `/tarifs`
- `/devenir-enseignant`
- `/become-teacher`
- `/francisation`
- `/uy`
- `/legal/cgu`
- `/legal/confidentialite`
- `/legal/annulation`
- `/legal/code-de-conduite`
- `/legal/conditions-professeurs`
- `/legal/membre-pro`
- `/legal/paiements-remboursements`
- `/blog`
- `/blog/[slug]` when published
- `/ressources`
- `/ressources/[slug]` when published
- `/cours/[disciplineSlug]` for curated broad subject pages
- `/tuteurs/[citySlug]` only when eligible supply exists
- `/cours/[disciplineSlug]/[citySlug]` only when eligible supply exists
- `/professeurs/[slug]` only when teacher visibility, consent, content, market, and admin publish gates pass
- YoPratiqo language hub/landing pages only when product config flags allow them

## 4. Private / Noindex Routes

Current private or non-SEO surfaces:

- `/api/*`
- `/auth/*`
- `/admin/*`
- `/dashboard`
- `/onboarding/*`
- `/profile`
- `/messages`
- `/booking`
- `/upgrade`
- `/loyalty`
- `/resolution`
- `/student/*`
- `/teacher/*`, except legacy/public profile handling under `/teacher/profile/*`
- `/login` and `/connexion` as auth surfaces
- YoPratiqo app/lesson/internal pages where product config says noindex

The public sitemap excludes these. Robots disallows most private roots. Some page-level `robots: { index: false, follow: false }` metadata exists for legacy/private surfaces.

## 5. Sitemap Architecture

`app/sitemap.ts` assembles:

- explicit static public routes,
- group sessions only when launch flag allows indexation,
- YoPratiqo hub/language landing pages through product config,
- YoPratiqo Spanish acquisition URLs,
- blog hub and published blog posts,
- resources hub and published resource articles,
- supply-gated local discovery pages,
- curated subject landing pages,
- admin-published teacher profiles.

Strengths:

- Uses `SITE_URL`.
- Excludes `/login`, private app routes, legacy legal paths, old Uruguay barrio experiment URLs, and private teacher profile URLs.
- Teacher sitemap rows require `public_profile_last_indexable_at`.

Gap:

- Inclusion/exclusion policy is documented in comments and tests but not yet centralized as reusable helper functions.

## 6. Robots Architecture

`app/robots.ts` allows `/`, disallows private/app/API paths, and points to `https://www.pratiqo.ca/sitemap.xml`.

Strengths:

- Does not block CSS, JS, fonts, images, or `_next` assets.
- Blocks auth/admin/private app roots.

Gap:

- The disallow list is local to `app/robots.ts`; route-level metadata and sitemap filtering cannot import the same policy yet.

## 7. Canonical URL Policy

Current policy:

- Production canonical host: `https://www.pratiqo.ca`.
- Apex `https://pratiqo.ca` redirects to `www` via `proxy.ts` and `next.config.ts`, with Vercel edge configuration documented.
- No root layout `alternates`, preventing child pages from inheriting a homepage canonical.
- Public pages generally set their own `alternates.canonical`.
- Locale is cookie-driven on the same URL except specific YoPratiqo Spanish acquisition pages.

Gap:

- There is no shared `getCanonicalUrl(pathname)` utility for new pages/tests.
- Query-param search surfaces need an explicit reusable canonical/noindex policy.

## 8. Metadata / Title / Description Status

Strong existing areas:

- Homepage has custom title, description, OG, Twitter, canonical.
- Teacher profile metadata is generated from teacher subject/name/location gates.
- Subject pages have per-locale titles/descriptions.
- Local discovery pages generate city and subject-city titles/descriptions.
- Blog/resource pages have metadata and noindex fallback for missing content.

Risks:

- Metadata templates are implemented per area; future pages could drift.
- Some public pages still embed metadata directly rather than using a central helper.
- There is no centralized max-length or fallback hygiene.

## 9. OpenGraph / Twitter Status

Current status:

- Root layout defines default OG.
- Key public pages define page-specific OG/Twitter.
- Teacher profiles use teacher photo if available, otherwise `/og-image.png`.
- Resource/blog pages generate article-style metadata.

Gap:

- There is no central `buildOpenGraphMetadata` helper to keep site name, locale mapping, and fallback image consistent.

## 10. Hreflang / Locale Status

Current policy:

- No global hreflang because Pratiqo serves the same URL with cookie-driven locale.
- YoPratiqo Spanish acquisition pages are the exception where equivalent localized URLs exist.
- Tests intentionally prevent misleading global `languages` alternates.

This is correct. Hreflang must only be emitted when stable equivalent URLs exist.

## 11. Structured Data Status

Current structured data:

- Homepage: `Organization` and `WebSite`.
- Teacher profile: `ProfilePage`, `Person`, and `BreadcrumbList`.
- Local discovery pages: `CollectionPage` with `ItemList` of public teacher profiles.
- Resource/blog pages: article/breadcrumb-style graph.
- FAQ pages use `FAQSchema` only where visible FAQ content exists.
- YoPratiqo Course schema is controlled by product config.

Strengths:

- No fake `AggregateRating` / `Review` on teacher/local pages.
- Teacher JSON-LD does not expose exact street address.
- JSON-LD serialization escapes dangerous characters.

Gaps:

- Structured-data allow/forbid policy is not centralized for tests.

## 12. Public Teacher Profile SEO Status

Teacher profile SEO is intentionally strict:

- Public route: `/professeurs/[slug]`.
- Legacy owner/profile route stays noindex or redirects when applicable.
- Visibility requires marketplace visibility, public profile enabled, onboarding complete, sufficient content, at least one subject, location or online teaching format, slug.
- Indexability also requires search indexing consent and admin publish marker.
- Sitemap rows only include admin-published indexable profiles.

This is the right approach for a marketplace: teacher profile SEO should not be automatic.

## 13. Search / Listing Page SEO Status

Search UX routes:

- `/trouver-un-prof` is an indexable marketing/search entry page.
- `/trouver-mon-prof` is an indexable learner-demand funnel.
- `/student/search` is private/authenticated and excluded.
- Query-param search URLs are used as CTAs but are not separate sitemap URLs.

Gap:

- Need a central rule documenting that query-param search URLs should not become independent indexed pages unless a clean canonical page exists.

## 14. Discipline / City SEO Status

Current:

- Broad curated pages: `/cours/[disciplineSlug]`.
- City hub pages: `/tuteurs/[citySlug]`.
- Subject-city pages: `/cours/[disciplineSlug]/[citySlug]`.
- City and subject-city pages require supply. Empty pages call `notFound()`.
- Sitemap entries are generated only for eligible supply.

This is good white-hat scaffolding. Do not mass-generate `/profs/*` or hundreds of city pages until content and supply rules are explicit.

## 15. Market SEO Status: Quebec, Canada, Uruguay, Other Countries

Canada/Quebec:

- Launched market.
- SEO, signup, search, booking, payments, payouts, and Membre Pro enabled.

Uruguay:

- Next market.
- SEO enabled for honest pre-launch page `/uy`.
- Teacher signup/search/booking/payments/payouts/Membre Pro disabled.
- Old `/clases/montevideo/*` routes redirect to `/uy`.

Other countries:

- Not configured for indexable market pages.
- No mass country/city generation.

## 16. Duplicate-Content Risks

P1 risks:

- New pages may accidentally set root/global alternates or inherit wrong canonicals if conventions are not enforced.
- Query-param search URLs could compete with clean `/cours/*` or `/tuteurs/*` pages if indexed later.
- Legacy redirects must stay permanent and out of sitemap.

Current mitigations:

- Root layout no `alternates`.
- Tests for `/login`, legacy legal URLs, `/teacher/profile`, old Uruguay URLs, and private routes.

## 17. Thin-Content Risks

P1 risks:

- City/discipline pages without teacher supply would be thin. Current implementation avoids this by notFound and supply-gated sitemap.
- Future broad discipline pages must remain curated, not templated keyword pages.
- Future market pages must not claim live supply before launch.

## 18. Crawl Waste Risks

Current crawl waste controls:

- Private roots disallowed in robots.
- Sitemap excludes auth/private/query-param paths.
- Redirect stubs kept out of sitemap.

Gap:

- No central `shouldIndexRoute` or `shouldIncludeInSitemap` helper to audit future route additions.

## 19. Supabase / Database Read-Cost Risks From Googlebot Crawling

Current database-backed SEO surfaces include:

- sitemap teacher profile rows through `fetchIndexableTeacherSitemapRows`;
- sitemap local discovery entries through `fetchLocalDiscoverySitemapEntries`;
- teacher public profile page and metadata reads;
- city and subject-city discovery page reads;
- admin SEO publication evaluation paths, though these are private/admin and should not be crawler-facing.

Risks:

- A crawler hitting many public teacher/local URLs can multiply Supabase reads if page rendering and metadata are not cached.
- `generateMetadata` can double the cost of a page request when it repeats a data lookup also needed by the page body.
- Sitemap generation can become an expensive crawler-triggered path if dynamic teacher/local queries are uncached.
- Failed dynamic SEO reads currently degrade by omission or `notFound`, which is safe for index quality but still costs database reads.

Current mitigations:

- The sitemap is explicit and does not enumerate private search result query URLs.
- Teacher profile sitemap entries are gated by admin-published indexable rows.
- Local discovery pages are supply-gated.

Gap:

- There is no project-level cached SEO repository layer yet for `generateMetadata`, sitemap generation, and public SEO landing pages.

## 20. Caching Gaps In `generateMetadata`, `sitemap.ts`, And SEO Landing Pages

Caching is inconsistent across public SEO surfaces:

- Some content is static module data and naturally cheap.
- Teacher profile metadata/page reads use server-side data helpers but do not yet expose a shared cached SEO fetch contract.
- Local discovery metadata/page reads should share cached bundle reads instead of re-querying per request.
- Sitemap generation queries should have a bounded revalidation window, especially for teacher/local entries.
- `app/robots.ts` is currently static and does not need dynamic caching; if market-driven robots rules are introduced later, those reads must be cached too.

Recommended baseline for implementation:

- Use `unstable_cache` or a project-level cached SEO repository for Supabase reads in public SEO paths.
- Use a 15-60 minute revalidation window for dynamic sitemap/local/teacher SEO reads.
- Revalidate faster through explicit admin publish/update actions only if the existing app has a safe invalidation pattern.
- Keep crawler-facing failures conservative: omit from sitemap or noindex rather than rendering stale private data.

## 21. Internal Linking Gaps

Current:

- Homepage links to public discovery/teacher acquisition surfaces.
- `/trouver-un-prof` links to selected disciplines and cities.
- Subject pages link to search CTAs and related resource guides.
- Local pages link to broad subject/city pages and teacher profiles.
- Teacher profiles link to SEO-safe related surfaces through `TeacherProfileSeoLinks`.

Opportunities:

- More data-driven internal links from resources/guides to real supply pages.
- Homepage could link to more curated high-intent subject/city combinations once supply exists.
- Teacher profile pages could link to nearby same-discipline pages only when eligible.

## 22. Image / Alt Text Gaps

Current visible patterns:

- Logo and marketing components generally use accessible labels.
- Teacher profile images are normalized through public photo helpers.
- OG image fallback exists.

Risks:

- Some decorative marketing images/icons may need explicit empty alt or aria-hidden review.
- Teacher photo alt text should stay generic and avoid inventing credentials or identity claims.

## 23. Performance / Core Web Vitals Risks

Visible from code:

- `next/font/local` global Inter avoids external font fetch for the main app.
- Recent YoPratiqo Google font build issue was handled outside this PR; no change here.
- Large client-heavy search components can affect LCP/INP on landing pages.
- Google Maps dependencies must remain lazy or bounded on public pages.

No P0 performance SEO issue found in static audit.

## 24. Search Console Readiness

Ready items:

- Canonical host is stable.
- Sitemap and robots are configured.
- Edge redirect check exists.
- Tests guard no `pratiqo.com`.

Manual actions after deploy:

- Submit/refresh `https://www.pratiqo.ca/sitemap.xml`.
- Inspect homepage, `/trouver-un-prof`, `/professeurs/[slug]`, `/cours/[disciplineSlug]`, `/tuteurs/[citySlug]`, `/uy`.
- Monitor excluded URLs for intentional noindex/private pages.
- Confirm apex redirect reports as permanent.

## 25. Top 20 SEO Risks Ranked by Severity

1. P1 - SEO policy drift between robots, sitemap, page metadata, and tests.
2. P1 - Query-param search URLs becoming indexable duplicate pages.
3. P1 - Future city/discipline pages indexed without supply or unique content.
4. P1 - Teacher profile indexability accidentally bypassing admin publish or consent.
5. P1 - Future hreflang added before stable equivalent localized URLs exist.
6. P1 - Structured data expansion adding unsupported ratings/reviews/prices.
7. P1 - Uruguay/pre-launch copy drifting into active booking/payment claims.
8. P1 - Root layout alternates reintroduced and canonicalizing child pages incorrectly.
9. P2 - Metadata templates duplicated across page types.
10. P2 - Internal links not yet fully data-driven by real teacher supply.
11. P2 - Image alt text patterns not centrally documented.
12. P2 - Blog/resource unpublished fallbacks require continued noindex coverage.
13. P2 - Some public pages use direct metadata objects instead of shared helpers.
14. P2 - Legacy redirects depend on tests staying current.
15. P2 - Sitemap dynamic fetch failures silently omit sections.
16. P2 - Teacher profile structured data could expose too much if teacher type expands.
17. P2 - Performance of public search widgets could affect Core Web Vitals.
18. P3 - No Search Console monitoring report in repo.
19. P3 - No image sitemap or structured image inventory.
20. P3 - No automated rendered HTML metadata probe for production pages.

## 26. Top 20 SEO Opportunities Ranked by Impact

1. P1 - Add central SEO config/helpers and route policy tests.
2. P1 - Centralize canonical URL building.
3. P1 - Centralize private/noindex route policy.
4. P1 - Centralize sitemap eligibility helpers.
5. P1 - Add metadata builders for homepage, discipline, city-discipline, teacher profile.
6. P1 - Add tests that no preview/localhost URLs leak into canonicals.
7. P1 - Add tests for query-param search canonical policy.
8. P1 - Add tests for structured-data forbidden claims.
9. P2 - Use helpers in key public metadata where low risk.
10. P2 - Add supply-aware internal link helpers.
11. P2 - Expand high-quality discipline guide content.
12. P2 - Improve homepage links to popular disciplines/cities.
13. P2 - Add rendered metadata smoke checks after production deploy.
14. P2 - Add Search Console runbook/report doc.
15. P2 - Build `/profs/[discipline]` only after useful content and supply plan.
16. P2 - Build `/profs/[discipline]/[ville]` only with strict eligibility.
17. P3 - Build per-market SEO dashboards.
18. P3 - Add image/OG asset QA.
19. P3 - Add localized URL strategy when routes exist.
20. P3 - Add structured data expansion only after visible content supports it.

## 27. Recommended Implementation Plan

The next implementation phase should:

1. Add central SEO helpers in `lib/seo/*`.
2. Preserve current indexed URL inventory.
3. Update `lib/seo/site.ts` to re-export from the central config.
4. Update `app/robots.ts` and `app/sitemap.ts` to consume shared policy.
5. Use shared metadata helpers in a small set of safe public pages and existing SEO helpers.
6. Add focused tests in `tests/seo/seoFoundation.test.ts`.
7. Avoid any auth/payment/booking/market/Yopratiqo product logic changes.

Future PRs should expand content only when content quality, teacher supply, and legal/product truth are ready.
