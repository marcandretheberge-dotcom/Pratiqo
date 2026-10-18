# Real-supply SEO visibility: review evidence

## Scope and baseline

Branch: `seo/real-local-supply-visibility`, isolated worktree `seo-real-local-supply`.
Base: `a417caefccdd7a84b8fe011f20b0646d2038f6f8` (merged PR #405).
Observations: 2026-10-17 America/Toronto / 2026-10-18 UTC.
Production reads only: public HTTP GET and PostgreSQL transactions explicitly opened READ ONLY and rolled back. No profile, payment, booking or notification was changed. No migrations.

### Cassandra: verified offer, not inferred geography

- Public profile: https://www.pratiqo.ca/professeurs/cassandra-f-francais-quebec
- Declared format: online only. City and region are empty; no registered teaching zones.
- Displayed rate: CAD 35/hour. Declared subjects include French, English and Spanish. Other stored specialties include conversation, exam preparation, homework help, professional development and interviews. These do not establish a particular exam credential or accreditation.
- The `quebec` fragment in the existing slug is NOT evidence of a local service area. The slug is preserved; metadata correctly describes online lessons.
- Publication, indexing consent and onboarding are enabled; account active. Admin SEO publication marker: `2026-10-18T01:46:10.904+00:00`. Evaluation against fresh data with the existing canonical indexability predicate returns true.
- Public booking capabilities API at audit time still returned `request`, with paid booking readiness false. This differs from the founder's observation. This SEO patch does not change payment eligibility or claim a completed paid booking test. The request-time authoritative capability remains the CTA source; once it returns `book`, the existing paid-booking CTA follows automatically.

### Public HTTP baseline before this patch

All canonicals below were self-referencing on `https://www.pratiqo.ca`. None of these GETs changed production records.

| Path | HTTP | Robots | In sitemap | Observation |
| --- | --- | --- | --- | --- |
| `/professeurs/cassandra-f-francais-quebec` | 200 | noindex,nofollow | No | Title: Cassandra — online French teacher; stale versus fresh SEO eligibility |
| `/tuteurs/saint-georges` | 200 | index,follow | Yes | Three local profiles; no Cassandra link |
| `/cours/francais/saint-georges` | 200 | index,follow | Yes | Two local profiles; no Cassandra link |
| `/cours/espagnol/saint-georges` | 200 | index,follow | Yes | Real local supply; no Cassandra link |
| `/sitemap.xml` | 200 | n/a | n/a | 71 URLs; 10 city/course URLs; Cassandra absent |
| `/robots.txt` | 200 | n/a | n/a | Public access, private route exclusions preserved |

Counts are a timestamped baseline, not application constants or an indexing guarantee. Do not compare them to a later snapshot as if inventory were fixed.

## Changes

1. Admin SEO publication/withdrawal previously changed the database without expiring nested cached profile, public-link, discovery and sitemap data. These caches now share one explicit publication tag. Successful authorized publication, withdrawal, hide and correction actions immediately expire the tag (`expire: 0`), rather than serving stale publication decisions. Failed writes do not invalidate. Cache key versions change once to avoid inheriting old untagged entries after deployment. Existing visibility/consent gates and admin authorization are unchanged.
2. Three existing Saint-Georges pages only (city hub, French and Spanish) can show exact-subject online alternatives after the local profiles. No teacher name or ID is hardcoded. Existing nine-card cap and local-first placement remain; online options do not displace local cards or change local counts, indexability or sitemap eligibility. Other cities retain the existing selection behavior.
3. These three pages have server-rendered guidance for comparing actual rates, formats, profile subjects and booking versus request actions. Online alternatives remain explicitly separate from local in-person supply. No invented city price range or specialty.
4. CollectionPage/ItemList Person descriptions now identify the same local/online/other-city group visible in HTML. No new ratings, reviews, address, availability or price schema claims. Existing profile ProfilePage/Person/Breadcrumb markup is retained.

No additional URL family, AI-specific schema, `llms.txt`, mass landing pages or crawler-specific public-access override was added. Canonical and language architecture are unchanged. Canonical local editorial pages remain French; profile locale behavior is preserved.

## Crawler documentation and verification

Official documentation checked during this task:

- [Google: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features): normal SEO fundamentals apply; crawl access, textual content and accurate structured data matter. No special AI markup is required; indexing or serving is not guaranteed.
- [OpenAI crawler documentation](https://developers.openai.com/api/docs/bots): OAI-SearchBot controls automatic search discovery; GPTBot training is a separate control. Published crawler IP ranges should be checked when investigating CDN/WAF denials. ChatGPT-User is not the search crawler.

The existing single wildcard robots rule permits these search crawlers on public pages and preserves exclusions for admin, API, student, teacher and booking internals. It was left intact. Public GETs to the French/Saint-Georges page with Googlebot and OAI-SearchBot user-agent labels returned 200, no X-Robots-Tag denial, H1 and profile links in HTML. These are HTTP probes, NOT proof that requests from actual Google/OpenAI IPs pass Vercel's WAF or that either engine indexed/cited the page.

Search Console performance data was not available through the connected tools and was not used to invent a traffic baseline. No ranking/citation claim is made.

## Validation

- `npx tsx --test tests/seo/realLocalSupplyVisibility.test.ts tests/seo/localSeoP0.test.ts tests/seo/teacherSeoPublicationWorkflow.test.ts`: PASS (initial three new cases, seven existing local cases, existing publication suite).
- `node node_modules/tsx/dist/cli.mjs --test tests/seo/realLocalSupplyVisibility.test.ts`: PASS, five cases after adding SSR and robots coverage. Tests use synthetic teachers only.
- SSR regression renders actual discovery cards to static HTML without JavaScript: public profile link, online format, CAD 35 fixture rate and request CTA present; paid-booking CTA absent for request state.
- Cache wiring regression covers all nested SEO caches and successful-write/auth ordering. This is a structural contract, not a hosted Next cache integration test.
- `node node_modules/tsx/dist/cli.mjs --test tests/seo/realLocalSupplyVisibility.test.ts tests/seo/localDiscoveryHardening.test.ts tests/seo/teacherPublicProfileIndexing.test.ts`: PASS, 19 runner cases (including the existing indexing suite). The data-unavailable log is from the deliberate database-failure fixture, not a production failure.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: PASS.
- `node node_modules/eslint/bin/eslint.js lib/seo/cache.ts lib/seo/teacherPublicProfileData.ts lib/seo/localTeacherDiscoveryPages.ts 'app/professeurs/[slug]/page.tsx' 'app/api/admin/users/[id]/teacher-seo-publish/route.ts' components/seo/LocalTeacherDiscoveryView.tsx tests/seo/realLocalSupplyVisibility.test.ts`: PASS. Browserslist reported an aged dataset; no dependency update was made in this targeted patch.
- `git diff --check`: PASS.
- No full launch suite or production build was rerun: targeted validation only, as requested. Hosted build/checks remain to review on the PR. No hosted-cache integration or authenticated booking test is claimed.

Final learner-funnel status matches the starting state: only its two pre-existing untracked sentinels. A CLI version-check temporary file generated by the read-only Supabase command was restored to its original content; no feature work was changed. Staffrelay was not accessed.

## Review limits and post-deployment checks

No production deployment or end-to-end paid booking is part of this task. Current production HTML still reflects the deployed version, not this branch. Existing expiry/revalidation timing can make repeated public GETs temporarily disagree with the database.

After a separately approved deployment, verify Cassandra's robots directive, schema, sitemap entry and exact current booking CTA; inspect all three pages for the distinct online section and unchanged local counts. On a test environment, publish then withdraw a synthetic profile and verify fresh robots/sitemap/local links on the next request. Confirm actual crawler requests in Vercel logs against documented IP ranges if access issues persist.

## External actions (not executed)

1. Once the live profile is indexable, use Search Console URL Inspection on Cassandra's canonical URL and request indexing. Then inspect `/tuteurs/saint-georges`, `/cours/francais/saint-georges` and `/cours/espagnol/saint-georges`; submit or refresh `/sitemap.xml`. Inspect Google's selected canonical and rendered HTML. Never request a false local Cassandra page.
2. Ask willing teachers to link their public Pratiqo profile from their own genuine professional site. Cassandra's anchor should describe online lessons, not an unverified city presence.
3. Seek relevant local organization/resource links to genuine Saint-Georges offerings, without paid links, fabricated endorsements or automated outreach.
4. Track Search Console impressions/clicks/queries and landing pages after release; compare qualified booking/request outcomes using existing consented analytics. No promise of first position or AI recommendation.

Rollback: revert this SEO-only change and redeploy through the normal reviewed process. There is no schema or production-data rollback.
