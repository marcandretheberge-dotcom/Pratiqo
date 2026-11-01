# Homepage clarity review

Date: 2026-11-01. Branch: `polish/homepage-clarity`.
Base: `origin/main` at `f10204d9`. Separate worktree; mobile PR #417,
learner-funnel and other projects were not changed.

## Authorized validation cleanup (2026-11-01)

The owner explicitly authorized repairing the two repository blockers, then
merging and deploying only with passing release controls. This section supersedes
the blocked verdict below; that earlier run remains historical evidence.

- Converted 18 existing Node scripts/harnesses from CJS to ESM. Built-in imports
  are native ESM; `createRequire` remains only for CJS/TypeScript test boundaries
  and externally supplied browser tooling. DOM initialization still precedes
  React testing-library loading. Package commands, the existing PostgreSQL CI
  workflow and documented paths follow the renamed files.
- Renamed test-local `module` variables; replaced explicit `any` with the real
  course-progress and assessment callback types; used const bindings and React
  child arguments. No application, financial or authorization behavior changed.
- Updated the obsolete audio source guard to verify the actual injected server
  environment/default and forbid public secret aliases. Added runtime assertions
  that public aliases cannot replace either required server secret. Existing
  missing-secret, offline, upload-retry and redacted-error checks remain enabled.
  The generator implementation and audio assets are unchanged.
- Full lint now passes: **0 errors / 259 existing warnings**. No rule disabled,
  severity lowered or file ignored. Full `npx tsc --noEmit` also passes.
- `test:learning-project`, `test:teacher-guided`, `test:teaching-zones-integration`,
  `test:homepage`, `test:yo-italian-module`, `test:yo-italian-course` and the focused
  French Quebec lesson-2 audio guard pass. Synthetic/in-memory boundaries only.
- Full `validate:launch` passed, including learning-project, auth, security,
  payments, launch-critical, currency, payment safety, i18n and the complete
  production build. Build TypeScript and all 350 static pages completed.
- Compared the old CJS bootstrap generator at Git HEAD with its new ESM export:
  `build()` and `buildSchema()` are byte-identical. The deployment preflight
  still refuses missing explicit migration-history input. No SQL was executed.
- Restarted only this worktree's production-mode preview, then reran the actual
  local-backend browser test at 1440, 390 and 320px: all pass. Public teachers,
  teaching zones, disciplines and metadata return 200; Maps renders; desktop
  adjacency/mobile stacking, title, format filters, empty state, loading,
  injected transport failure and real retry all pass. Normal console/page errors:
  zero. No production data used, no writes, no real payment or message.
- The earlier 18 FR/EN/ES responsive cases plus three no-JavaScript checks remain
  applicable: their application code and configuration are unchanged by this
  validation-only cleanup. Physical Safari is not claimed as tested.

### Final local commands

All commands below completed successfully on this worktree:

- `npm run lint` (twice): 0 errors, 259 warnings retained.
- `npx tsc --noEmit`.
- `npm run test:homepage`.
- `npm run test:learning-project`.
- `npm run test:teacher-guided`.
- `npm run test:teaching-zones-integration`.
- `npm run test:yo-italian-module` and `npm run test:yo-italian-course`.
- `node --import tsx tests/yo/yopratiqoFrQuebecLesson2Audio.test.ts`: 17/17.
- `node ../homepage-release-local.cjs verify`: actual anonymous local reads.
- `node ../homepage-release-local.cjs validate`: runs the unchanged
  `npm run validate:launch` command with isolated backend variables only.
- `node tests/marketing/homepageLocalBackendBrowser.mjs` with the documented
  local URL/runtime: 3/3; artifacts in `../homepage-qa-final-isolated`.
- `git diff --check` and `git diff --cached --check`.

No lint rule, TypeScript option, build validation or test assertion was disabled.
Next reports its existing ignored `experimental.forceSwcTransforms` warning;
the normal Turbopack build still completes successfully. CI, merge and production
verification will be recorded on the PR after the final commit is pushed.

Rollback reference recorded read-only before release:
`dpl_CALvBC8wdWzjcUpp2nbXByedRzuo`, Production Ready,
Git SHA `f10204d97bc322a117554cf683b1b83609d45390`,
`pratiqo-ad5znc9ma-marcandretheberge-dotcoms-projects.vercel.app`.
Delivery must use a new Git Production build, never the isolated local artifact.

## Release verification (historical, earlier 2026-11-01)

Verdict: **BLOCKED by required repository-wide lint and an existing
launch-critical source assertion; not deployed.** Earlier
passes below are historical, not proof of a green release today.

### Final-review corrections

- Failed public-teacher reads now show a localized error and retry action,
  not a misleading empty result. Late responses cannot update an unmounted
  loader. Empty successful reads and no matching filters remain distinct.
- Online searches ignore map bounds and cannot invoke area search. Map-area
  selection replaces the old city; choosing a new city clears old bounds.
- Area matching considers all real active teaching zones, returns each teacher
  once and preserves complete profile data. Online-only profiles never become
  local pins. No coordinate is invented, including for missing locations.
  Coordinate-less zones retain the existing real legacy-location fallback.
  Map-centre distance ranks area results but is not displayed as learner distance.
- Latitude zero is accepted. The prior source assertion requiring a truthy
  latitude was updated; the mocked SDK test exercises zero explicitly.
- ESLint's global React Hooks rules now have their plugin registered for CJS
  files as well. No rule severity, ignore list or security control was weakened.
- New homepage tests use ES modules. `npm run test:homepage` is the focused
  entry point. The older `.cjs` command references below describe prior runs.

### Isolated backend

The existing `supabase_*_pr405-local-sandbox` stack on Docker network
`pratiqo-pr405-loopback` is reused, without migrations or production copies.
Local Auth contains no address outside `example.invalid`; Cron is absent.
Database/API bindings remain loopback only. One dedicated synthetic in-person
map fixture was added locally. Older synthetic fixture image paths were corrected
from nonexistent `/icon.png` to the existing `/icon-192.png`, only for local
`example.invalid` owners. Existing availability, bookings and payment data were
not changed.

An external-to-Git harness (`../homepage-release-local.cjs`) injects only the
local anonymous/service keys in memory. The app has no `.env`, `.env.local`,
`.env.production` or `.env.production.local` file. Missing
build prerequisites were the Supabase URL, anonymous key and server service key,
plus a reachable local PostgREST instance. Browser and server use the same
loopback gateway, so production CSP does not need changing.

- Gateway: `http://127.0.0.1:55580`; Next production runtime: loopback 55581.
- Supabase API: loopback 55421, database: loopback 55422.
- Browser reads use actual public-view RLS. The real public metadata handler
  uses the existing local server client; no response fixtures replace the build.
- Stripe, external email/SMS and analytics credentials are absent. Outbound
  server fetch is restricted to loopback. The preview gateway rejects writes.
- Maps uses the already-public browser key in memory. No key value, environment
  file, gateway or sandbox helper is included in the application diff.
- This test build must never be promoted to production. Delivery requires a
  fresh Vercel Git build with its established Production environment.

### Required lint blocker, reproduced

`npm run lint` originally exited 2 on missing React Hooks plugin registration.
After repairing registration, it reports **108 errors / 259 warnings**.
The 108 remaining errors occur in 23 scripts/test files outside the homepage.
Their contents match `f10204d97bc322a117554cf683b1b83609d45390` after normalizing
CRLF; linting their Git-base contents with the same repaired configuration
produces the same error counts. This is demonstrated baseline debt, not a pass.

- 90 CommonJS `no-require-imports` errors.
- 3 `no-assign-module-variable` errors.
- 10 explicit `any` errors.
- 1 `no-children-prop` error.
- 4 `prefer-const` errors.

Evidence outside Git: `../homepage-lint-audit.json`,
`../homepage-lint-final.log`. A separate focused lint cleanup/review of those
existing test/tooling files is required before the authorized merge can proceed.
No payment, authentication or YoPratiqo implementation was changed to clear lint.

### Launch-critical blocker and Windows fixture repair

After the coordinate assertion update, launch-critical exposed Windows CRLF
conversion of the 40 upstream KanjiVG SVGs. Each file was checked against its
Git source blob and provenance hash before LF normalization. The integrity test
then passed **13/13**, without modifying its expectations or the Git diff.
No repository-wide Git configuration was changed. Future Windows checkouts
must preserve these upstream bytes for the provenance test.

The subsequent full `npm run test:launch-critical` run reaches a different,
deterministic failure at `tests/yo/yopratiqoFrQuebecLesson2Audio.test.ts:693`:
the source guard requires literal `process.env.OPENAI_API_KEY`, whereas
`scripts/generate-yopratiqo-audio.ts` now reads `env.OPENAI_API_KEY` through
its injected environment. The same assertion fails on the Git-base script
at `f10204d97bc322a117554cf683b1b83609d45390`; both files are unchanged.
No key was read, no generation script executed, no guard disabled. The owner
of that separate audio change must align its source guard with the actual
server-only configuration contract and retain secret-isolation coverage.

### Commands in this release pass

- `node ../homepage-release-local.cjs verify`: PASS, real anonymous reads of
  `teachers_public`, `teacher_teaching_zones_public`, `teacher_disciplines`.
- `npm run test:homepage`: PASS, rendered FR/EN/ES, map lifecycle/failure,
  zone/bounds matching, online exclusion, coordinate boundary checks.
- `npx tsc --noEmit`: PASS.
- Targeted `npx eslint` on homepage/search components and changed tests:
  0 errors, 10 warnings (includes existing components matched by the glob).
- Final `npx eslint lib/landingTeacherMap.ts tests/marketing/homepage*.mjs
  tests/marketing/homepageMapArea.test.ts`: PASS, zero warnings/errors.
- `npm run lint`: FAIL as documented above, no suppression added.
- `node ../homepage-release-local.cjs validate` (`npm run validate:launch`):
  FAIL at launch-critical, not an entirely green validation. Its learning-project,
  auth, security and payments suites completed successfully. Initial attempts exposed a local harness
  `NODE_ENV=production` issue with React test `act()` (fixed outside Git), then
  the obsolete truthy-coordinate source assertion (updated with runtime coverage).
- `npm run test:launch-critical`: FAIL on the unchanged audio source guard above,
  after the Windows SVG repair. Evidence: `../homepage-launch-final.log`.
- `node --import tsx tests/yo/yopratiqoJapaneseKanjiStudio.test.ts`: PASS, 13/13
  after byte-preserving local LF normalization.
- `node ../homepage-release-local.cjs build` (`npm run build`): **PASS**, compile,
  complete TypeScript, 350/350 static pages and route output. Uses actual local
  database reads, not mocked build responses. Existing warning: Turbopack ignores
  `experimental.forceSwcTransforms`; no build or type-check bypass was enabled.
- `npm run test:currency`: PASS. `npm run payment:safety`: PASS.
- `npx tsx scripts/validate_i18n.ts`: PASS, 3562 keys per locale.
- `git diff --check`: PASS.

### Production-runtime browser QA

Both scripts ran against `next start` at `http://127.0.0.1:55580`, with the
existing external Playwright runtime supplied by `NODE_PATH` and installed
headless Chromium via `HOMEPAGE_QA_CHROMIUM` (no dependency install).

- `node tests/marketing/homepageLocalBackendBrowser.mjs`: **PASS**, widths
  1440/390/320. Real Supabase public rows, zones, disciplines and the real
  `/api/teachers/plans` handler each return HTTP 200. Actual Google tiles/pin
  render. Current local inventory: 5 synthetic public fixtures, 1 with a public
  local pin; these are test observations, not claims about production supply.
  Checks desktop columns/mobile stacking, title, login link, format filtering,
  zero-match search, no overflow, and no normal-path console/runtime errors.
  The controlled failure phase delays then returns 503 for the teacher read,
  lets the SDK's three normal retries finish, checks the error (not zero results),
  then restores the actual backend and verifies the retry button succeeds.
  No request to a production Pratiqo/Supabase backend is allowed by this test.
- `node tests/marketing/homepageClarityBrowser.mjs`: **PASS**, all 18 combinations
  of FR/EN/ES and 320/390/640/768/1024/1440px, plus 3 no-JavaScript checks.
  This separate deterministic UI matrix uses synthetic intercepted responses;
  it does not substitute for the real-backend pass or production build.
- Desktop/mobile screenshots were visually inspected. Evidence outside Git:
  `../homepage-qa-isolated/{real-1440.png,real-390.png,real-320.png,results.json}`
  and `../homepage-qa-isolated-responsive/metrics.json`.

Physical Safari, GitHub CI and post-deployment smoke checks have not run in this
release pass. No PR or deployment is created while required controls are red.
After the two unrelated validation blockers are resolved: rerun the failed
controls, push the reviewed branch, require green PR/Vercel checks, record the
then-current Production deployment for rollback, and squash merge. Vercel must
build the merged Git SHA anew with Production variables, never promote this
local artifact. Confirm deployed SHA and public desktop/mobile data/map/search;
rollback to the recorded previous Production deployment if a blocking regression
appears. No migration is needed.

No commit, push, PR, merge, deployment or production modification in this pass.

## First pass (historical)

- The mobile hero repeated the local-discovery promise in three introductory
  lines before its H1. It now has one H1 and one supporting sentence.
- Two promotional blocks separated search from teacher results. Removed both
  from the homepage; the detailed trust section remains below the results.
- Guided search remains available as a secondary text action, hidden during
  active searches. No promise of a perfect match or a 30-second outcome.
- Removed the extra discipline explanation; all discipline filters remain.
  The default format label is now "Tous les formats" (localized), avoiding
  truncation of the old sentence in the desktop select; its value is unchanged.
- Three concise how-it-works steps preserve the distinction between a request
  and booking. Resource cards retain their original article links and titles,
  without summaries or repeated "Read article" actions.
- Final CTA no longer promises a lesson this week. Learner and teacher links,
  legal information, testimonials, photos, SEO metadata and canonical unchanged.
- Copy updated in FR/EN/ES. No fetching, ranking, auth or booking logic changes.

## First-pass browser comparison (historical)

`tests/marketing/homepageClarityBrowser.cjs` uses three synthetic teacher rows
and intercepts all API requests. Nonlocal requests and outgoing writes are
blocked/mocked; no production records or credentials are used for QA.
Baseline: live homepage read on this date, with the same synthetic responses.
After: local Next.js dev server, not a deployed production build.

| French, 390px | Before | After |
| --- | ---: | ---: |
| Words in rendered main content (including the same teacher fixtures) | 575 | 358 |
| Results section top, px | 1333 | 933 |

That is 38% fewer words and about 400px less scrolling before results.
Desktop 1440px: results section moves from 944px to 606px.
Counts exclude header, footer and overlays; they are not production inventory counts.
Screenshots live outside Git in `../homepage-qa-before` and `../homepage-qa-after`.
The install prompt is dismissed in final captures; cookie consent uses necessary-only.

## First-pass validation (historical)

- `node tests/marketing/homepageClarity.cjs`: PASS, rendered components FR/EN/ES.
- `npx tsx tests/search/segmentedSearchFields.test.ts`: PASS, 45 tests.
- `npx tsx tests/seo/discoveryNavPolish.test.ts`: PASS.
- `npx tsx tests/seo/homepageSchemaHygiene.test.ts`: PASS.
- `npx tsx tests/seo/prelaunchSeoIndexation.test.ts`: PASS, 48 tests.
- `npx tsx tests/auth/onboardingRoleChoice.test.ts`: PASS, 91 tests.
- `npx tsx scripts/validate_i18n.ts`: PASS, 3547 keys in each locale.
- `npx tsc --noEmit`: PASS.
- `npx eslint` on the five changed TSX files and the search test: PASS.
- `node tests/marketing/homepageClarityBrowser.cjs`: PASS at 320/390/1440px
  in FR/EN/ES: no overflow, one H1, visible login, search interaction and quiz.
  Also verifies server-rendered hero and canonical with JavaScript disabled.
- `git diff --check`: PASS.

Limitations and failed attempts:

- Full `npm run build`: compilation and TypeScript pass; prerendering local
  SEO pages fails because this worktree intentionally has no Supabase service
  credentials. The first sandboxed attempt also hit a PostCSS subprocess error;
  rerunning outside that sandbox cleared the compilation error. No build bypass.
- ESLint on `.cjs` tests fails at config loading (missing `react-hooks` plugin
  for its global rules). Reproduced with the unchanged existing
  `tests/students/studentLearningDirectoryDom.cjs`; config left untouched.
- An initial command referenced nonexistent `tests/auth/mobileLandingLoginLink.test.ts`;
  the actual `onboardingRoleChoice.test.ts` suite was run instead.
- Physical Safari not tested. Dev mode emits a React eval debugging warning
  under the existing CSP; security headers were not loosened.

Local preview: `http://127.0.0.1:55570`. It has no live backend. Fixtures are
injected only by the browser test, not shipped in the application.
No commit, push, merge, deployment, migration or production write performed.

## Search-first refinement

The second pass makes the homepage an immediately usable search surface:

- One subject input is visually dominant, followed by place, format and search.
  At widths below 380px, secondary fields stack to keep labels readable.
- Three canonical localized examples replace the category button wall. All
  categories remain reachable through the existing autosuggest vocabulary.
- Removed the central learner/teacher toggle and its separate promotional hero.
  Existing teacher entry routes remain in the header/menu and final CTA.
- Advanced filters now sit with results; explicit reset clears subject,
  category, location, format, advanced filters and map bounds. Selecting a city
  still preserves its echoed label and the subject. Typing a new subject
  clears a previously selected category instead of trapping the new search.
- Search is a semantic form: Enter submits, except when choosing an active
  autocomplete suggestion. Optional input IDs correctly associate labels.
- Existing logo asset is now readable on mobile; tablet navigation uses the
  same menu as mobile, with login always visible.
- Removed illustrative testimonials from this homepage. Detailed trust
  information remains in a native, expandable details section. Legal footer,
  teacher photographs, profile/booking entry logic and ranking are unchanged.
- Default result heading does not claim all unfiltered teachers are nearby.
  Teacher counts still come from actual results, not static marketing copy.
- No new dependency or service. Existing local font, taxonomy, filters,
  teacher cards, quiz and map component are reused.

### Second-pass measurement

Same three synthetic teacher responses as the first pass; French at 390px:

| Measure | Initial baseline | First pass | Search-first pass |
| --- | ---: | ---: | ---: |
| Visible main-content words | 575 | 358 | 200 |
| Results section top, px | 1333 | 933 | 519 |
| Results section top at 1440px, px | 944 | 606 | 509 |

65% fewer words in the default visible main content versus the initial
baseline. This includes moving detailed trust copy behind disclosure, not
deleting all that content. These are layout measurements with fixtures, not
evidence of production inventory or conversion improvements.
Final artifacts: `../homepage-qa-final` (outside Git).

### Commands rerun for the search-first pass

- `node tests/marketing/homepageClarity.cjs`: PASS. FR/EN/ES rendered copy,
  semantic search form, associated labels, format values, no autofocus,
  resource links, teacher and learner entry points.
- `npx tsx tests/search/segmentedSearchFields.test.ts`: PASS, 45 tests.
  Scoped two source assertions to the actual city/query handlers; explicit
  reset must be allowed while city selection must never erase the label.
- `npx tsx tests/search/quoiAutosuggestSubjectBank.test.ts`: PASS, 50 tests.
- `npx tsx tests/marketing/trouverUnProfPage.test.ts`: PASS, 18 tests.
- `npx tsx tests/seo/discoveryNavPolish.test.ts`: PASS.
- `npx tsx tests/seo/homepageSchemaHygiene.test.ts`: PASS.
- `npx tsx tests/seo/prelaunchSeoIndexation.test.ts`: PASS, 48 tests.
- `npx tsx tests/auth/onboardingRoleChoice.test.ts`: PASS, 91 tests.
- `npx tsx scripts/validate_i18n.ts`: PASS, 3554 keys per locale.
- `npx tsc --noEmit`: PASS, including the final responsive classes and labels.
- `npx eslint` on the nine changed TSX files and the segmented-search test:
  no errors, four warnings in unchanged code (three existing state-reset
  effects and unused `CITIES`). Those lines were verified against `HEAD`.
- `npm run build`: compilation PASS (21.3 seconds), Next.js TypeScript PASS
  (43 seconds), full build FAIL during `/cours/musique/saint-georges`
  prerendering: missing `NEXT_PUBLIC_SUPABASE_URL` or
  `SUPABASE_SERVICE_ROLE_KEY`. No credential copied and no control bypassed.
  Subsequent final changes only adjust responsive classes and localized labels.
- `git diff --check`: PASS.
- `node tests/marketing/homepageClarityBrowser.cjs`: PASS in FR/EN/ES at
  320, 390, 640, 768, 1024 and 1440px (18 browser runs), plus three
  no-JavaScript server-rendering checks.

Browser regression covers examples, broad categories, replacing a category
with a new subject, preserving subject while selecting a city and format,
advanced price filtering, reset, Enter with/without a highlighted suggestion,
trust disclosure, mobile teacher navigation, quiz, overflow and no runtime
errors. A no-JavaScript pass verifies the H1, supporting copy and canonical.
All backend responses are synthetic and all external requests are blocked.

Physical Safari remains untested. Full build is not green without a suitably
configured isolated backend. No commit, push, merge or deployment performed.

## Map-first pass and local preview repair

The next design feedback is implemented:

- Shared server/client `LandingHeadline` retains the exact localized H1 and
  accents only the final teacher word with a green italic Georgia serif.
  No new font download or dependency.
- Default map and cards coexist: side-by-side at 1024px+, map above cards on
  mobile. Responsive map height is reserved during loading/failure.
- Four ranked cards are shown, with the existing all-teachers link. Filtering,
  ranking, profile opening and booking entry logic are unchanged.
- Map pins use existing public coordinate and teaching-format helpers;
  online-only teachers remain in results but are not local map pins. Explicit
  online searches have no local pins. Location count is not booking inventory.
- The first available result set is framed once. Later filtering/hover does
  not reset the user's framing. Hover and keyboard focus highlight a marker.
  The homepage does not automatically request device location. Other map
  callers retain their existing defaults.
- Loader and delayed Google authentication failures show a translated message
  while teacher cards stay accessible. No raw key/error is shown in the UI.
  Google's documented `gm_authFailure` callback is used:
  https://developers.google.com/maps/documentation/javascript/events

### Why the preview initially showed no teachers

The earlier preview deliberately lacked a live backend; its test fixtures
were injected only by the automated browser tests. That was unsuitable for
the user's interactive visual review. The application data-fetching logic
was not changed to invent inventory or bypass eligibility.

A local-only harness outside Git (`../homepage-preview-readonly.cjs`) now
serves the app at `http://127.0.0.1:55570`, forwarding anonymous public teacher
reads through a strict allowlist. It blocks non-GET/HEAD methods, Auth and
other APIs. The underlying development server also binds to loopback.
No service-role key, Stripe credential or production write is enabled.
Existing worktrees and their environment files were not modified.

The existing local browser Maps key also produced `ExpiredKeyMapError`.
The harness now uses the current browser Maps configuration already served
in public production JavaScript, in memory only. No key printed/committed;
no Google project, billing, restrictions or production variables changed.
The public asset URL is deployment-specific, so the temporary harness may
need that URL refreshed after a later deployment. This is not shipped code.

Read-only visual check on this pass: 59 public search profiles returned,
19 profiles with eligible public map coordinates; four first-ranked cards
displayed. These numbers are observations, not hardcoded inventory claims.
Real Google map tiles and clusters render. Desktop and mobile screenshots:
`../homepage-qa-map/live-desktop.jpg`, `../homepage-qa-map/live-mobile.jpg`.

### Commands executed for this pass

- `node tests/marketing/homepageClarity.cjs`: PASS, FR/EN/ES SSR headline
  accent, exact H1, search semantics and preserved entry points.
- `node tests/marketing/homepageMap.cjs`: PASS, mocked Maps SDK: delayed
  teacher data, one-time framing, no implicit geolocation, marker selection,
  highlight, filtering, bounds search, zero latitude, authentication/loader
  errors, missing key and cleanup. No real Google request in this test.
- `node tests/marketing/homepageClarityBrowser.cjs`: PASS, 18 runs across
  FR/EN/ES and 320/390/640/768/1024/1440px, plus three no-JavaScript checks.
  Verifies desktop adjacency, mobile stacking, online-only exclusion from
  pins, original filter/reset/Enter behavior and no horizontal overflow.
  Synthetic backend responses only; external requests blocked. Initial new
  fixture used `in_person` instead of canonical DB mode `person`; corrected
  the fixture, without weakening the expected two local map profiles.
- `npx tsx tests/teacherSearch/teacherMapPopupProfileSummary.test.ts`: PASS,
  14 assertions.
- `npx tsx tests/search/segmentedSearchFields.test.ts`: PASS, 45 tests.
- `npx tsx scripts/validate_i18n.ts`: PASS, 3559 keys per locale.
- `npx tsc --noEmit`: PASS after map error handling was added.
- `git diff --check`: PASS.
- Local preview safety probes: status confirms read-only loopback mode;
  POST to the local public-table proxy and GET to local Auth both return 403.
- `npx eslint app/LandingPageClient.tsx components/SearchMapView.tsx
  components/marketing/LandingHeadline.tsx
  components/marketing/LandingHeroStatic.tsx
  components/marketing/LandingTeacherListingCard.tsx`: no errors; five
  warnings on existing SearchMapView ref writes/cleanup. No suppression added.

Full production build has NOT been re-certified: the prior full build still
requires an isolated backend for dynamic SEO prerendering, as documented
above. This pass uses TypeScript, focused tests and a working local dev
preview. Physical Safari and production deployment remain untested.
No commit, push, merge, deployment, migration, booking or message performed.
