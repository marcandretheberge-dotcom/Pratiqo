# Pratiqo SEO Foundation Implementation Plan

Date: 2026-08-17

This plan follows the audit in `docs/seo/pratiqo-seo-architecture-audit.md`. This branch is documentation-only. The goal is to define a safe foundation for the next implementation phase, not to ship a mass SEO expansion.

## 1. What Will Be Implemented In The Next PR Phase

- Central SEO config and helpers:
  - `lib/seo/config.ts`
  - `lib/seo/urls.ts`
  - `lib/seo/robots.ts`
  - `lib/seo/sitemap.ts`
  - `lib/seo/metadata.ts`
  - `lib/seo/structuredData.ts`
- Re-export `SITE_URL` through the existing `lib/seo/site.ts` compatibility file.
- Update robots and sitemap generation to consume shared policy where safe.
- Use shared metadata builders for key public SEO helper paths where low-risk.
- Add regression tests for canonical URLs, private route noindex, sitemap exclusion, query-param canonical policy, structured-data hygiene, market policy, and discipline/city eligibility defaults.
- Keep indexed URL inventory unchanged while adding policy tests.

## 2. What Will Not Be Implemented Yet

- No new `/profs/*` URL tree.
- No mass city/discipline page generation.
- No generated SEO copy at scale.
- No fake teacher/review/rating/availability content.
- No changes to Stripe, booking, auth, RLS, Membre Pro, commission logic, YoPratiqo product logic, or market capability rules.
- No hreflang expansion until stable localized URLs exist.
- No structured-data expansion beyond conservative helpers and tests.

## 3. SEO Architecture Principles

- Index only useful public pages.
- Omit or noindex private, auth, payment, checkout, admin, dashboard, and thin pages.
- Prefer clean canonical URLs over query-param URL indexing.
- Structured data must reflect visible, factual page content.
- Teacher SEO requires consent and admin publish.
- Local SEO requires real supply or enough unique helpful content; unknown supply defaults to noindex.
- Market SEO must respect product availability flags.

## 4. URL And Canonical Policy

- Canonical origin is always `https://www.pratiqo.ca`.
- `getCanonicalPath()` normalizes route paths and removes query/hash.
- `getCanonicalUrl()` always returns the production canonical origin, never localhost or Vercel preview hosts.
- Trailing slash behavior follows the current app convention: root is `/`, other paths omit a trailing slash.
- Query-param search URLs should canonicalize to a clean equivalent when one exists, otherwise to the broad public search entry route.

## 5. Sitemap Inclusion / Exclusion Policy

Include:

- homepage,
- public marketing pages,
- public legal pages intended for indexation,
- published guides/articles,
- curated broad subject pages,
- supply-gated city/discipline pages,
- admin-published public teacher profiles,
- market pages where `seoEnabled` is true and copy is honest.

Exclude:

- private app routes,
- APIs,
- auth/login routes,
- checkout/session/payment routes,
- draft/unpublished/private teacher profiles,
- empty city/discipline pages,
- duplicate query-param URLs,
- preview/local URLs,
- legacy redirect stubs.

## 6. Robots / Noindex Policy

Robots should:

- allow important public pages,
- disallow private app/API roots,
- include the sitemap URL,
- not block render-critical assets such as CSS, JS, images, fonts, `_next/static`, or `_next/image`.

Page metadata should:

- return noindex/follow false for private app surfaces and auth pages,
- default unknown private-like routes to noindex helpers,
- keep public route indexation explicit.

## 7. Metadata Template Policy

Use unique human-first titles and descriptions.

Template examples:

- Homepage: `Pratiqo | Trouvez un professeur prive au Quebec et en ligne`
- Discipline: `Cours de {discipline} | Professeurs prives au Quebec et en ligne | Pratiqo`
- City + discipline: `Cours de {discipline} a {ville} | Professeurs locaux et en ligne | Pratiqo`
- Teacher profile: `{teacherName} | Cours de {mainDiscipline} | Pratiqo`

Descriptions should explain the page, the task, and the next step without stuffing keywords.

## 8. Structured Data Policy

Allowed when supported by visible content:

- `Organization`
- `WebSite`
- `BreadcrumbList`
- `Person`
- `ProfilePage`
- `CollectionPage`
- `ItemList`
- `FAQPage`
- `Article`

Forbidden unless real visible content and product truth support it:

- fake `AggregateRating`,
- fake `Review`,
- fake `Offer`,
- fake price ranges,
- fake availability,
- fake `LocalBusiness` exact address,
- fake course completion or guarantee claims.

Teacher JSON-LD must not expose exact street address, private coordinates, email, telephone, payout, Stripe, identity internals, or diploma storage paths.

## 9. Local SEO Page Eligibility Policy

Discipline page index rule:

- discipline must be active/searchable,
- page must have useful unique content,
- page should link to real search or eligible teacher supply.

City-discipline page index rule:

- launched market with SEO enabled,
- supported city,
- active/searchable discipline,
- at least one eligible public teacher, unless a future hand-written page provides substantial local content.

Unknown teacher count defaults to noindex and sitemap omission.

## 10. Market SEO Policy

Canada/Quebec:

- launched,
- SEO enabled,
- public discovery and teacher publication allowed by existing rules.

Uruguay:

- next market,
- `/uy` may be indexable as an honest pre-launch page,
- no claims that booking, payments, payouts, or Membre Pro are active.

Other countries:

- no indexed pages unless market config and useful content are created later.

No IP-based SEO cloaking, Accept-Language cloaking, or geo-forced SEO redirects.

## 11. Duplicate-Content Prevention Policy

- Root layout must not set global alternates/canonical.
- Legacy redirects stay permanent and excluded from sitemap.
- Query-param search URLs should not be sitemap entries.
- Clean city/discipline pages are the canonical SEO targets when they exist and are eligible.
- Locale alternates only when actual equivalent URLs exist.

## 12. Supabase / Googlebot Database-Cost Protection Policy

All crawler-facing Supabase reads must have a caching strategy before the page family is expanded.

Required cached areas:

- `generateMetadata` for teacher profile pages;
- `generateMetadata` for city and discipline-city pages;
- `app/sitemap.ts` dynamic teacher and local discovery sections;
- public SEO landing pages that read teacher supply;
- future discipline/city metadata;
- future market metadata if it reads dynamic launch/supply data;
- `app/robots.ts` only if it later becomes data-driven.

Recommended implementation shape:

- Create project-level SEO repository helpers such as `getCachedTeacherSeoProfile`, `getCachedLocalDiscoveryBundle`, and `getCachedSitemapSeoRows`.
- Wrap Supabase SEO reads with Next.js `unstable_cache` or the safest current Next 16-compatible project pattern.
- Use explicit cache keys that include slug, locale, market, and page type.
- Use a default revalidation window of 15-60 minutes for public SEO reads.
- Use shorter revalidation only for admin-published teacher profile updates if a safe invalidation path already exists.
- Never cache private profile payloads into public SEO helpers.

Failure policy:

- If a cached SEO read fails, omit the page from the sitemap or render `notFound`/noindex, depending on the existing route behavior.
- Do not retry aggressively on crawler requests.
- Do not expose Supabase errors to users or crawlers.

## 13. Required Caching Policy For `generateMetadata`, `sitemap.ts`, And Public SEO Routes

`generateMetadata`:

- Must share the same cached data bundle as the page body when possible.
- Must not perform duplicate uncached Supabase reads for the same slug.
- Must return conservative noindex metadata when eligibility is unknown.

`app/sitemap.ts`:

- Must use native Next.js App Router sitemap conventions.
- Must cache dynamic teacher, local discovery, and future market supply reads.
- Must exclude pages when eligibility cannot be confirmed cheaply and safely.

Public SEO routes:

- Must cache supply/content lookups.
- Must avoid rendering empty local pages.
- Must not expose private teacher fields or raw admin/publication internals.

Revalidation baseline:

- Static content: build-time or module data.
- Teacher profile SEO rows: 15-60 minutes.
- Local discovery supply pages: 30-60 minutes.
- Sitemap dynamic sections: 30-60 minutes.
- Market status pages: static config unless product availability becomes database-driven.

## 14. Internal Linking Policy

Safe internal links should:

- use descriptive anchor text,
- point only to public, useful, canonical pages,
- prefer supply-gated local pages when supply exists,
- connect guides/resources to relevant subject and search pages,
- avoid links to private, noindex, empty, or unavailable pages.

## 15. Test Plan

Add `tests/seo/seoFoundation.test.ts` to assert:

- canonical URLs always use `https://www.pratiqo.ca`,
- preview/localhost origins do not leak into canonical metadata,
- private/auth/API routes are noindex,
- private/auth/API routes are excluded from sitemap,
- robots includes sitemap and does not block render assets,
- metadata builders produce page-specific titles/descriptions,
- query-param search URL policy avoids duplicate canonical conflicts,
- structured-data helpers forbid fake reviews/ratings/offers/private addresses,
- Uruguay remains an honest next-market SEO page,
- local SEO helpers default to noindex when supply/content is unknown.

Run existing relevant SEO tests plus launch/auth/build validation.

## 16. Manual QA Plan

1. View source / metadata for homepage.
2. View source / metadata for a public teacher profile.
3. Confirm canonical uses `https://www.pratiqo.ca`.
4. Confirm private teacher/student/admin pages are noindex.
5. Confirm sitemap does not include private pages.
6. Confirm robots.txt includes sitemap.
7. Confirm search/filter URLs do not create duplicate canonical conflicts.
8. Confirm public profile structured data does not expose private address.
9. Confirm Uruguay page remains honest pre-launch.
10. Inspect URLs in Google Search Console after deploy.

## 17. Future PR Roadmap

- PR 2 - `/profs/[discipline]` public SEO landing pages after content and URL strategy approval.
- PR 3 - `/profs/[discipline]/[ville]` local SEO pages with strict eligibility.
- PR 4 - guide content engine for high-quality discipline guides.
- PR 5 - structured data expansion after visible content exists.
- PR 6 - internal linking intelligence based on real teacher supply.
- PR 7 - Search Console monitoring dashboard or report.
