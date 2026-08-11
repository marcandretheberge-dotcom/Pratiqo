# Market Architecture — Québec, Canada, Uruguay

## 1. Executive Summary

Pratiqo now uses explicit market states instead of implicit country assumptions or IP-based behavior. The public launch market is Québec/Canada. Uruguay is the next planned market with a stable public waitlist/SEO presence, but without paid bookings, payouts, Membre Pro, or full teacher publishing.

## 2. Official Market Strategy

Québec and Canada are launched. Uruguay is the next planned market. Uruguay may have SEO/waitlist presence before paid bookings, payouts, Membre Pro, or full teacher publishing are enabled.

Current product states:

| Market | State | Public SEO | Teacher monetization |
|---|---|---:|---:|
| Canada | LAUNCHED | Yes | Yes, through existing Canada gates |
| Québec | Covered inside Canada | Yes | Yes, through existing Canada gates |
| Uruguay | NEXT_MARKET | Yes, only for intentional next-market pages | No |
| Other countries | PLANNED or DISABLED by default | No, unless a real page is approved | No |

## 3. Current Config Audit

The market config now exposes `PratiqoMarketStatus` with these states:

- `LAUNCHED`
- `NEXT_MARKET`
- `PLANNED`
- `DISABLED`

It also exposes market capabilities:

- `seoEnabled`
- `teacherSignupEnabled`
- `teacherPublishingEnabled`
- `studentSearchEnabled`
- `bookingEnabled`
- `paymentsEnabled`
- `payoutsEnabled`
- `membreProEnabled`

Canada is `LAUNCHED` with all existing launch capabilities enabled. Uruguay is `NEXT_MARKET` with SEO enabled for the intentional `/uy` page only; teacher signup, publishing, search, bookings, payments, payouts, and Membre Pro remain disabled.

## 4. Current Route Audit

Current route decisions:

- `/` is the canonical Canada/Québec public marketplace landing.
- `/uy` is the canonical Uruguay next-market page.
- `/fr`, `/en`, and `/es` remain locale stubs that permanently redirect to `/`.
- `/ca` permanently redirects to `/`.
- `/clases`, `/clases/montevideo`, and `/clases/montevideo/[barrioSlug]` permanently redirect to `/uy`.
- `/professeurs/[slug]` remains the canonical public teacher SEO profile route.
- `/teacher/profile` and `/teacher/profile/[id]` remain legacy profile surfaces and are not sitemap URLs.

## 5. Current Sitemap / Noindex / 404 Audit

The sitemap includes:

- canonical public Canada/Québec routes,
- public visible `/professeurs/[slug]` profiles from the existing indexability rules,
- real subject/resource/discovery pages that are supply-gated,
- `/uy` because it is a real, useful next-market page.

The sitemap excludes:

- private app/auth/admin/student/teacher pages,
- noindex YoPratiqo lesson/app surfaces,
- legacy redirect URLs,
- 404 URLs,
- old Uruguay barrio experiment URLs under `/clases/montevideo/*`,
- `/teacher/profile` legacy profile surfaces.

## 6. Market State Model

Market state is a product decision, not a request-time geolocation guess.

- `LAUNCHED`: public marketplace and monetization capabilities can be enabled if existing compliance gates pass.
- `NEXT_MARKET`: intentional public/waitlist presence is allowed; monetized activity stays disabled.
- `PLANNED`: internal planning state; no public SEO by default.
- `DISABLED`: unsupported or blocked; no public SEO or monetization by default.

## 7. Canada / Québec Launched Rules

Canada is the launched market. Québec is the primary launch region inside Canada. Existing teacher signup, teacher publishing, student search, bookings, payments, payouts, and Membre Pro gates continue to apply through the Canada configuration.

Do not create a separate Québec market that conflicts with Canada unless the product intentionally introduces province-level market states later.

## 8. Uruguay Next-Market Rules

Uruguay is not fully launched. The canonical public route is `/uy`.

Allowed now:

- next-market information,
- waitlist/contact CTA,
- explicit explanation that Uruguay is in preparation.

Not allowed now:

- active paid booking claims,
- teacher payout claims,
- Membre Pro availability,
- fake Uruguay teacher supply,
- fake Uruguay search results,
- international monetization.

## 9. Other Country Planned-Market Rules

Other countries are disabled by default unless a real product page, supply plan, and market state are approved. Do not add country URLs only for keyword coverage.

## 10. SEO URL Policy

Indexable URLs must be stable, canonical, and useful. They must return 200 and should not be thin placeholders.

Redirect rules:

- use a permanent redirect when a clear equivalent exists,
- leave experimental URLs as 404/410 when no equivalent exists,
- do not redirect unrelated country pages to the homepage.

Current examples:

- `/ca` redirects to `/`.
- `/fr`, `/en`, and `/es` redirect to `/`.
- `/clases/montevideo/*` redirects to `/uy`.

## 11. No IP-Based SEO Policy

Pratiqo does not use IP-based SEO cloaking or locale-adaptive content for indexable pages. Country and language variants must use stable URLs, canonical tags, hreflang only when valid, and explicit user-facing navigation.

The existing `/api/geo` endpoint may read country headers for client UX preferences. It must not be used to serve different indexable SEO content, redirect Googlebot, or create locale/country variants.

## 12. Payment / Payout / Booking Separation

SEO presence is separate from monetized activity.

Uruguay may have a public next-market page while these remain disabled:

- paid bookings,
- teacher payouts,
- Membre Pro,
- teacher marketplace publishing,
- active student search for Uruguay teachers.

Canada/Québec monetization remains controlled by the existing Stripe, booking, payout, and market gates.

## 13. Search Console Cleanup Plan

Recommended cleanup:

1. Keep `/uy` as the canonical Uruguay next-market URL.
2. Remove old `/clases/montevideo/*` URLs from sitemap and let them permanently redirect to `/uy`.
3. Keep `/fr`, `/en`, `/es`, and `/ca` out of the sitemap because they are redirect stubs.
4. Keep `/teacher/profile` out of the sitemap; public teacher SEO belongs to `/professeurs/[slug]`.
5. Inspect Search Console excluded URLs after deployment and validate that only intentional noindex/private pages remain.

## 14. Recommended Next Implementation PRs

Suggested future PRs:

- Uruguay waitlist capture with an owned non-sensitive contact mechanism.
- Uruguay teacher supply readiness checklist.
- Uruguay legal/accounting/Stripe Connect review before monetization.
- Uruguay discovery pages only after real supply and market launch gates exist.
- Locale routing and hreflang only when the project has real equivalent FR/EN/ES page sets.
