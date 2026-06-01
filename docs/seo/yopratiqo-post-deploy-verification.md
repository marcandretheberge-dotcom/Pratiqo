# YoPratiqo controlled-indexation — post-deploy SEO verification

| Field | Value |
| --- | --- |
| Verification date | 2026-06-01 (UTC-4) |
| Production domain | `https://www.pratiqo.ca` |
| Release commit (in `main`) | `feat(yo): enable controlled indexation for language landing pages` (PR #98 → `395280a`) |
| QA branch | `qa/yo-post-deploy-seo-verification` |
| Verifier | `scripts/verify_yopratiqo_seo_deploy.ts` (`npm run verify:yopratiqo-seo-deploy`) |
| Status | **Failed verification — partial deploy. 66/71 checks passed; 5 failed (Course JSON-LD presence on the 5 landing pages).** Robots, canonical, title, description, OG, sitemap, and `robots.txt` are all correct. |

## Routes checked

### Indexable layer

| URL | HTTP | canonical | robots | title | OG | Course JSON-LD |
| --- | --- | --- | --- | --- | --- | --- |
| `https://www.pratiqo.ca/yo/langues` | 200 | ✅ exact | `index, follow` | "YoPratiqo — Apprendre…" | ✅ | ✅ correctly absent (hub never advertises a Course) |
| `https://www.pratiqo.ca/yo/langues/anglais` | 200 | ✅ exact | `index, follow` | "Anglais avec YoPratiqo…" | ✅ | ❌ **missing in SSR HTML** (see Course schema result) |
| `https://www.pratiqo.ca/yo/langues/francais-quebec` | 200 | ✅ exact | `index, follow` | "Français québécois avec YoPratiqo…" | ✅ | ❌ **missing in SSR HTML** |
| `https://www.pratiqo.ca/yo/langues/espagnol` | 200 | ✅ exact | `index, follow` | "Espagnol avec YoPratiqo…" | ✅ | ❌ **missing in SSR HTML** |
| `https://www.pratiqo.ca/yo/langues/japonais` | 200 | ✅ exact | `index, follow` | "Japonais avec YoPratiqo…" | ✅ | ❌ **missing in SSR HTML** |
| `https://www.pratiqo.ca/yo/langues/italien` | 200 | ✅ exact | `index, follow` | "Italien avec YoPratiqo…" | ✅ | ❌ **missing in SSR HTML** |

### Noindex layer (intro lessons)

| URL | HTTP | canonical | robots | Course JSON-LD |
| --- | --- | --- | --- | --- |
| `https://www.pratiqo.ca/yo/langues/anglais/intro` | 200 | ✅ exact | `noindex, nofollow` | ✅ correctly absent |
| `https://www.pratiqo.ca/yo/langues/francais-quebec/intro` | 200 | ✅ exact | `noindex, nofollow` | ✅ correctly absent |
| `https://www.pratiqo.ca/yo/langues/espagnol/intro` | 200 | ✅ exact | `noindex, nofollow` | ✅ correctly absent |
| `https://www.pratiqo.ca/yo/langues/japonais/intro` | 200 | ✅ exact | `noindex, nofollow` | ✅ correctly absent |
| `https://www.pratiqo.ca/yo/langues/italien/intro` | 200 | ✅ exact | `noindex, nofollow` | ✅ correctly absent |

### Discovery surfaces

| URL | HTTP | Result |
| --- | --- | --- |
| `https://www.pratiqo.ca/sitemap.xml` | 200 | ✅ includes `/yo/langues` + the 5 landing pages, never lists an `/intro` URL, all entries on `https://www.pratiqo.ca`, no `pratiqo.com` |
| `https://www.pratiqo.ca/robots.txt` | 200 | ✅ advertises `https://www.pratiqo.ca/sitemap.xml`, no `Disallow` rule that blocks `/yo/langues`, no `pratiqo.com` reference |

## Expected vs observed indexation

| Layer | Expected | Observed | Status |
| --- | --- | --- | --- |
| Hub `/yo/langues` | `index: true / follow: true` | `index, follow` in head | ✅ |
| Landing pages `/yo/langues/{language}` | `index: true / follow: true` | `index, follow` in head | ✅ |
| Intro pages `/yo/langues/{language}/intro` | `index: false / follow: false` | `noindex, nofollow` in head | ✅ |

## Sitemap result

```
✅ /sitemap.xml responds 200
✅ /sitemap.xml includes https://www.pratiqo.ca/yo/langues
✅ /sitemap.xml includes the five /yo/langues/{language} landing pages
✅ /sitemap.xml does NOT include any /yo/langues/{language}/intro page
✅ /sitemap.xml uses https://www.pratiqo.ca and never pratiqo.com
```

## Robots result

```
✅ /robots.txt responds 200
✅ /robots.txt advertises https://www.pratiqo.ca/sitemap.xml
✅ /robots.txt does NOT disallow /yo/langues
✅ /robots.txt does not reference pratiqo.com
```

## Canonical result

Every YoPratiqo route ships its canonical link as
`<link rel="canonical" href="https://www.pratiqo.ca${route}">` (verified
on all 11 URLs). No `pratiqo.com` URL appears anywhere on the production
site (sitemap, robots, head metadata, or rendered HTML).

## Course schema result — **Failed verification**

Course JSON-LD is **MISSING** as a server-rendered `<script
type="application/ld+json">` tag on the five language landing pages:

```
❌ /yo/langues/anglais         — no <script type="application/ld+json"> in SSR HTML
❌ /yo/langues/francais-quebec — no <script type="application/ld+json"> in SSR HTML
❌ /yo/langues/espagnol        — no <script type="application/ld+json"> in SSR HTML
❌ /yo/langues/japonais        — no <script type="application/ld+json"> in SSR HTML
❌ /yo/langues/italien         — no <script type="application/ld+json"> in SSR HTML
```

The Course schema **is** present in the production HTML, but only inside
the React Server Components streaming payload (`self.__next_f.push(...)`),
not as a real `<script type="application/ld+json">` tag in the document
head/body. Concretely, fetching `/yo/langues/anglais` returns:

- 13 inline `<script>` tags — every one is an RSC chunk pusher; **zero
  are typed `application/ld+json`**.
- The Course payload (`@type":"Course"`, `provider`, `Cours Pratiqo
  Inc.`, `https://www.pratiqo.ca/yo/langues/anglais`, `isAccessibleForFree:
  true`, `teaches`, `about`) is embedded as an escaped string inside one
  of those RSC chunks.

`x-vercel-cache: MISS` and `cache-control: private, no-cache, no-store,
max-age=0, must-revalidate` confirm this is a fresh origin response — it
is **not** a propagation/CDN issue. The deploy itself is up to date with
the merged release commit.

### Why this matters

- **Googlebot** does execute JavaScript and will eventually pick up the
  Course schema after rendering, but JSON-LD discovered post-render is
  picked up later (separate render queue) than JSON-LD discovered in the
  initial HTML.
- **Bing**, **Yandex**, **DuckDuckGo crawlers**, and **social/OpenGraph
  scrapers** generally do not execute JavaScript and will see no Course
  schema at all.
- The release tests (`tests/yo/yopratiqoIndexation.test.ts`,
  `tests/yo/yopratiqoCourseSchemaIntegration.test.ts`,
  `tests/yo/yopratiqoLandingPages.test.ts`) verify the *helper-level*
  contract (`canInjectYoPratiqoCourseSchema(...) === true`,
  `shouldPublishYoCourseSchema(slug, "landing") === true`, the JSX
  branch is present in `YoLanguageLandingPage`) — they do not assert
  the SSR HTML output, so this regression slipped through.

## Warnings / manual follow-ups

1. **CRITICAL — follow-up PR required:** server-render the Course
   JSON-LD as a literal `<script type="application/ld+json">` tag in
   the document head, not via a Server Component using
   `dangerouslySetInnerHTML`. Per `AGENTS.md` ("This is NOT the Next.js
   you know — read the relevant guide in
   `node_modules/next/dist/docs/`"), the recommended App Router pattern
   is to attach JSON-LD to the page's `generateMetadata` output (e.g.
   via `metadata.other` or a route-level `<Script>` component from
   `next/script` with `strategy="beforeInteractive"`), or to render it
   from the route-level `layout.tsx` (which currently flushes its own
   head and reliably emits inline `<script>` tags).

   This PR intentionally does **not** modify `app/`, `components/`, or
   `lib/yo/` — the brief restricts changes to the verifier and this
   document. Schedule the fix as a separate PR
   (`fix(yo): server-render Course JSON-LD on landing pages`) and
   add a regression test that fetches the rendered HTML (or asserts on
   the metadata helper output) so future deploys cannot regress the
   same way.

2. **Hardening idea (low priority):** add a CI step (manual or
   scheduled) that runs `npm run verify:yopratiqo-seo-deploy` against
   production after every release tag. Keep it out of
   `validate:launch` / `test:launch-critical` so offline / Preview
   environments do not break the build.

3. **Encoding sanity (cosmetic, not a deploy issue):** Windows
   PowerShell rendered the production page's accented characters as
   `?` in the local terminal. The actual UTF-8 bytes on the wire are
   correct (`Anglais avec YoPratiqo — confiance à l'oral…` etc.), and
   the live site renders accents correctly in browsers. No production
   action required.

4. **No restricted systems were touched** by this PR. Stripe,
   payments, Supabase, RLS, migrations, booking, Membre Pro,
   commission math, generated MP3 files, audio storage paths, and
   live legal pages were not modified. Course schema *behavior* was
   not modified — only the verifier and this report.

## Google Search Console — manual checklist

Run these steps from the GSC property for `https://www.pratiqo.ca`
(URL-prefix or Domain property):

1. **Inspect the hub:** URL Inspection → `https://www.pratiqo.ca/yo/langues`
   → confirm "URL is available to Google" → confirm "Indexing
   allowed? Yes" → confirm canonical = `https://www.pratiqo.ca/yo/langues`.
2. **Inspect the five language landing pages** (one by one):
   - `https://www.pratiqo.ca/yo/langues/anglais`
   - `https://www.pratiqo.ca/yo/langues/francais-quebec`
   - `https://www.pratiqo.ca/yo/langues/espagnol`
   - `https://www.pratiqo.ca/yo/langues/japonais`
   - `https://www.pratiqo.ca/yo/langues/italien`

   For each: confirm "URL is available to Google", confirm canonical
   matches, confirm "Indexing allowed? Yes", and confirm the rendered
   HTML preview shows the head metadata. **Do not be surprised if the
   Enhancements → Courses report stays empty for now** — that depends
   on the manual follow-up above (server-rendered JSON-LD).
3. **Confirm "URL is available to Google"** for all six indexable URLs.
4. **Request indexing** for each of the six indexable URLs (hub + the
   five landing pages). Stagger requests (a few minutes apart) to
   stay under the daily quota.
5. **Do NOT request indexing for any /intro page yet.** They are
   intentionally `noindex, nofollow`. Requesting indexing on a
   noindex URL would just confirm the noindex signal — wasted quota
   and not helpful for ranking.
6. **Submit the sitemap** if it is not already known to GSC:
   Sitemaps → Add a new sitemap → `sitemap.xml` (the production
   `https://www.pratiqo.ca/sitemap.xml` already contains the new YoPratiqo
   layer — see Sitemap result above). Confirm the sitemap report
   shows "Success" with a recent fetch time.
7. **Recheck after Google has crawled** (typically 1–7 days):
   - URL Inspection should show "URL is on Google" for all six.
   - Coverage / Pages report should list the six URLs as "Submitted
     and indexed".
   - Enhancements → Courses report should show 5 valid items **once
     the JSON-LD follow-up PR ships**. Until then, expect that report
     to be empty.

## Validation results (local pre-commit)

| Command | Result |
| --- | --- |
| `npm run verify:yopratiqo-seo-deploy` | **66/71 checks passed (5 failed Course JSON-LD presence)** — see the Course schema result above |
| `npm run test:yo-indexation` | 13/13 passed |
| `npm run test:launch-critical` | All suites pass (auth/security/payments excluded; SEO + Yo + marketing all green) |
| `npm run build` | success |
| `npm run validate:launch` | success (full gate including auth + security + payments + launch-critical + currency + payment safety + i18n validator + build) |
| `Get-ChildItem -Recurse -Force -Filter "~$*"` | nothing to clean |

## Confirmation: no restricted systems touched

This PR contains only:

- `scripts/verify_yopratiqo_seo_deploy.ts` (new, opt-in live-network
  verifier — no app behavior change)
- `docs/seo/yopratiqo-post-deploy-verification.md` (this report)
- `package.json` (new `verify:yopratiqo-seo-deploy` script entry)

No changes to `app/`, `components/`, `lib/yo/` product behavior,
Course schema behavior, Stripe, payments, Supabase, RLS, migrations,
booking, Membre Pro, commission math, generated MP3 files, audio
storage paths, or live legal pages.
