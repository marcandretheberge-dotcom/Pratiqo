# Local discovery indexation hardening

Audit date: 2026-09-22 (America/Toronto).
Branch: `fix/seo-local-indexation-hardening`.
Baseline: `872c7d82` (main after PR #398).
Status: implementation complete; publication blocked by repository-wide validation failures.
No commit, push, PR or merge until the requested validation gate is satisfied.

## Evidence and root cause

The supplied GSC report lists 23 server errors under `/cours/{subject}/{city}`,
approximately 230 discovered/unindexed local course URLs, and legacy 404s.
These figures come from the task; the original GSC CSVs were not provided.

Before editing, requesting `/cours/francais/saint-georges` locally returned
HTTP 500. Next.js logged `Functions cannot be passed directly to Client Components`.
The `discipline` field in the discovery bundle contained `metaTitle`,
`metaDescription`, `heroTitle`, and `heroDesc` functions from the registry.
`LocalTeacherDiscoveryView` passed this bundle into client cards and a client map.
City hubs did not carry these functions because their discipline is null.

The bundle now explicitly projects only `slug`, `name`, and plain FAQ entries.
Map conversion runs on the server; the map receives only prepared card data,
city name and coordinates. It no longer imports server query/cache code at runtime.
No server component was converted to a client component.

## Route and data architecture

- App Router routes: `app/cours/[disciplineSlug]/[citySlug]/page.tsx` and
  `app/tuteurs/[citySlug]/page.tsx`. There is no extra local layout.
- Both use async params, page metadata, `getLocale()` and a shared server view.
- `getLocale()` reads cookies. Production build classifies these pages as dynamic SSR,
  despite their existing `generateStaticParams()` candidate lists.
- Candidate generation is not sitemap inclusion. The course candidates are the
  existing discipline registry crossed with ten cities, not new published pages.
- Teacher discovery data uses `unstable_cache` through the existing cache helper
  with one-hour revalidation. The cache key is bumped for the new data shape.
- Data sources: `teachers` with profile status, `teacher_disciplines`, and the optional
  public teaching-zones view. No writes or migrations were performed.
- Registry resolution: `lib/constants/cities.ts`, `lib/seo/disciplines.ts`;
  subject aliases use `lib/taxonomy/disciplines.ts`.
- JSON-LD remains CollectionPage/ItemList, breadcrumbs and existing visible FAQs.
- App Router sitemap and robots conventions remain intact.

## SEO eligibility defect

The old specific-subject predicate accepted an exact discipline OR its parent
category. Thus a teacher in `Langues` could qualify French, Spanish and English.
The old sitemap reused display ranking, which also accepts online alternatives
and even the closest distant teacher. Combining these admitted many theoretical
city/subject pages despite no matching local offer.

Specific subjects now match canonical primary/secondary discipline IDs or the
existing exact discipline label. Parent-category fallback is retained only for
an actual broad-category page, such as music.

Local course eligibility requires an in-person-capable teaching mode and:

1. An active Canadian teaching zone in the city; or a declared student-home service
   area whose actual radius covers the city coordinates.
2. When no active zones exist, an exact normalized legacy city match.

Online-only teachers, a shared region, and a generic distance fallback cannot
qualify a course/city URL. No new radius was invented. Existing display-only
nearby/online alternatives remain available and are labelled as other options.
Current admin publication, SEO consent and teacher/profile visibility checks
remain authoritative; marketplace opt-out is included in the SEO read.
Existing city-hub discovery eligibility remains unchanged to preserve intentional
`/tuteurs/{city}` hubs. Their subject links use the stricter local predicate.

## Before and after

| Case | Before | After |
| --- | --- | --- |
| Valid course/city with supply | RSC serialization could return 500 | 200, self canonical, index/follow |
| Valid course/city without local offer | Alternatives could qualify indexing; no results meant 404 | 200 discovery/empty state, noindex/follow, excluded from sitemap |
| Invalid subject/city | notFound | notFound; actual 404 tested |
| Teacher/subject database failure | Swallowed into empty data and potentially cached | Propagates to Next error handling; never a successful empty page |
| Local sitemap data failure | Successful sitemap silently omitted local URLs | Generation rejects; cannot publish an outage as empty supply |
| Missing optional zones view | Not queried by local SEO | Known missing-view errors retain legacy-city fallback; other errors propagate |
| Legacy locale course URLs | No equivalent redirect | Registry-constrained permanent redirect |
| Title | Duplicate Pratiqo suffix inherited from root | Absolute title with one suffix |

The known missing-view fallback is deliberately limited to `42P01`/`PGRST205`.
The connected environment reported the view missing during this audit. This does
not convert a failed teacher query into an empty result. Migration rollout is a
separate production step; this task does not apply migration 128.

## Redirect mappings

Only recognized registry slugs match:

- `/{fr|en|es}/cours/{discipline}/{city}` -> `https://www.pratiqo.ca/cours/{discipline}/{city}`
- `/tuteurs-prive/{city}` -> `https://www.pratiqo.ca/tuteurs/{city}`
- `/{fr|en|es}/tuteurs-prive/{city}` -> `https://www.pratiqo.ca/tuteurs/{city}`

All use 308 and preserve query values. They precede the app's generic apex rule.
No locale prefix is retained: current marketplace localization is cookie-based.
Unknown slugs stay 404; none map to the homepage. Existing FR/EN acquisition pages,
auth rules, proxy, security headers and current routes remain untouched.
Vercel's separate apex-domain redirect can still add a host hop before the app
receives an apex request; deployment settings were not changed.

Other legacy families observed: `/fr`, `/en`, `/es`, `/ca`, legal aliases,
old teacher profile URLs and Uruguay barrio URLs. Their existing behavior was
not changed. No unverified single-subject or translated-slug mapping was added.

## Sitemap measurement

Command: `npx tsx --env-file=.env.local scripts/audit_local_discovery_indexation.ts origin/main`.
Measured at `2026-09-23T00:52:43Z`, using three currently SEO-eligible teachers.
Both old and new local policies were evaluated on the SAME current snapshot.
Unchanged non-local entries were measured once. These are reproducible policy
counts, not a claim about historical GSC inventory at an earlier date.

| Metric | Before | After |
| --- | ---: | ---: |
| Course/city URLs | 255 | 3 |
| All `/cours/...` URLs, including subject hubs | 260 | 8 |
| Local URLs, including city hubs | 306 | 54 |
| Total sitemap URLs | 364 | 112 |

252 course/city URLs are excluded; their routes are not deleted.
The three qualifying paths in this snapshot are:
`/cours/francais/saint-georges`, `/cours/espagnol/saint-georges`,
and `/cours/mathematiques/varennes`.

Ten formerly admitted examples now excluded:

- `/cours/anglais/alma`
- `/cours/anglais/amos`
- `/cours/anglais/baie-comeau`
- `/cours/anglais/beauceville`
- `/cours/anglais/beloeil`
- `/cours/anglais/blainville`
- `/cours/anglais/brossard`
- `/cours/anglais/chambly`
- `/cours/anglais/chateauguay`
- `/cours/anglais/coaticook`

## Production-runtime verification

Using `npm run build`, `npm run start -- --port 3117`, then
`npx tsx tests/seo/localDiscoveryRuntime.test.ts`.
Every valid row has exactly one self canonical at `https://www.pratiqo.ca`.

| Path | HTTP | Robots/result |
| --- | ---: | --- |
| `/cours/francais/saint-georges` | 200 | index, follow |
| `/cours/espagnol/la-pocatiere` | 200 | noindex, follow |
| `/cours/francisation/riviere-du-loup` | 200 | noindex, follow |
| `/cours/francais/beauceville` | 200 | noindex, follow |
| `/cours/anglais/trois-rivieres` | 200 | noindex, follow |
| `/cours/francais/beloeil` | 200 | noindex, follow |
| `/tuteurs/saint-georges` | 200 | index, follow |
| `/cours/mathematiques/varennes` | 200 | index, follow |
| `/cours/espagnol/saint-georges` | 200 | index, follow |
| Invalid city/subject and invalid legacy tutor city | 404 | Googlebot and browser user agents |
| Legacy course and tutor examples | 308 | Direct canonical target, query retained |
| `/sitemap.xml` | 200 | 112 URLs, 3 course/city URLs |
| `/robots.txt` | 200 | Canonical sitemap declaration |

## Changed files and purpose

- `app/cours/[disciplineSlug]/[citySlug]/page.tsx`: empty/indexable distinction, robots, absolute title.
- `app/tuteurs/[citySlug]/page.tsx`: same metadata and empty-state contract for shared city view.
- `app/tuteurs-prive/[citySlug]/page.tsx`: invalid cities 404; valid legacy fallback is permanent.
- `app/sitemap.ts`: propagate local-data generation failures.
- `components/seo/LocalTeacherDiscoveryMap.tsx`: narrow serializable inputs; remove server runtime import.
- `components/seo/LocalTeacherDiscoveryView.tsx`: prepare map data on server; honest alternative label.
- `lib/seo/localTeacherDiscoveryPages.ts`: plain DTO, exact subjects, teaching zones, eligibility and error semantics.
- `lib/seo/localDiscoveryRedirects.ts`: registry-constrained legacy mappings.
- `lib/seo/sitemap.ts`: reject legacy, parameterized and noncanonical URLs.
- `next.config.ts`: register local legacy redirects ahead of generic host redirects.
- `scripts/audit_local_discovery_indexation.ts`: read-only same-snapshot policy comparison.
- `tests/seo/localDiscoveryHardening.test.ts`: matching, locality, serialization, failure, sitemap and redirect regressions.
- `tests/seo/localDiscoveryRuntime.test.ts`: production HTTP/metadata/sitemap checks.
- `tests/seo/emptySupplySitemap.ts`: controlled empty database fixture and Next server test bootstrap.
- `tests/seo/localTeacherDiscovery.test.ts`: updated route/redirect assertions and fixture import.
- `tests/seo/seoFoundation.test.ts`: controlled sitemap fixture.
- `tests/seo/groupSessionsLaunchSeo.test.ts`: controlled sitemap fixture only.
- `tests/seo/lifestyleSubjectSeo.test.ts`: controlled sitemap fixture only.
- `tests/seo/marketArchitecture.test.ts`: controlled sitemap fixture only.
- `tests/seo/prelaunchSeoIndexation.test.ts`: supply-dependent robots contract and controlled sitemap fixture.
- `docs/SEO_LOCAL_INDEXATION_HARDENING.md`: evidence, results and follow-up.

## Validation and publication gate

- `npm run build`: PASS, including Next's application TypeScript check.
- `npx tsx tests/seo/localDiscoveryHardening.test.ts`: PASS, 12 focused tests.
- `npx tsx tests/seo/localDiscoveryRuntime.test.ts`: PASS against built production server.
- `npm run test:seo-local-discovery`: PASS, 16 tests.
- `npm run test:seo-foundation`: PASS, 15 tests.
- `npm run test:seo-teacher-resources`: PASS.
- All 14 SEO test files excluding the separately run runtime test: PASS.
- `npx tsx scripts/validate_i18n.ts`: PASS, 3502 keys per locale.
- `git diff --check`: PASS.
- ESLint on all changed/new TypeScript and TSX files: PASS, no diagnostics.
- `npm run lint`: FAIL, four errors in unchanged Stripe diagnostics UI/test files.
- `npx tsc --noEmit --incremental false`: FAIL on existing tests across several unrelated modules; compiler-host comparison found 198 diagnostics on both the baseline and current tree. Next's application TypeScript check passes.
- `npm run test:launch-critical`: FAIL at unchanged `teacherProfileTeachingModeChips.test.ts:49`.

The launch-critical assertion scans beyond the teaching-mode chips into additional
profile content and rejects teal classes. It was not weakened or edited here.
Lint failures: three unescaped apostrophes at admin Stripe diagnostics lines
288-289; a variable named `module` at `tests/admin/stripeConnectDiagnostics.test.ts:532`.
These are outside the authorized SEO scope.

## Follow-up and limitations

- Resolve the unrelated validation blockers before commit/push/PR, per the latest instruction.
- Verify Vercel preview/deployment and the upstream apex redirect after publication.
- Apply/verify the teaching-zones migration through its separate approved rollout.
- Recheck counts when more teachers receive admin SEO publication or update service areas.
- After deployment, resubmit sitemap.xml in GSC and use Validate Fix for the known 5xx/legacy groups.
- Request indexing for the genuinely supported local pages; indexing is Google's decision.
- Broad-city hub copy, older discipline copy, generic city-footer links and brand/entity work
  remain separate content tasks. No mass SEO pages or artificial copy were generated.
- No Stripe, payments, billing, booking, auth, RLS, schema, migration, or YoPratiqo product code changed.
- Existing untracked launch analysis and legal ZIP sentinel files were not touched.

## Follow-up verification (2026-09-22 Toronto / 2026-09-23 UTC)

This section records commands actually rerun during the follow-up. Earlier results
above remain historical evidence, not a claim that all global checks pass now.
No commit, push, PR or merge was performed.

### Reproducible sitemap comparison

The exact reference for "before" is
`872c7d82aed276eff6fcf4e4ac2b9d4b5835d828` (HEAD and locally recorded origin/main).
The script loads that commit's `rankTeachersForCity` via `git show` and evaluates
it alongside the current policy on ONE fetched teacher array. The old historical
database snapshot was not retained and is unavailable. This is a new same-input
policy comparison, NOT reconstruction of the deployed sitemap at a past date.
The shared pool uses current SEO publication/consent/visibility gates. It does not
count all marketplace teachers or attempt to bypass those gates.

Command executed twice, before and after the category-alias correction:

```powershell
npx tsx --env-file=.env.local scripts/audit_local_discovery_indexation.ts 872c7d82aed276eff6fcf4e4ac2b9d4b5835d828
```

Final measurement: `2026-09-23T02:02:31.589Z`. Three eligible teachers.
Both follow-up executions produced the same in-memory snapshot SHA-256:
`c87f91f27793cfaaaff5fea07ed845534904360834c1d1dde63a08d2864874b2`.
The script prints aggregate counts and public subject/locality evidence, never
names, user IDs, teacher IDs, addresses, coordinates or credentials. No database
snapshot containing personal records is checked into this report.

| Retained URL | Exact subject proof | Local proof |
| --- | --- | --- |
| `/cours/francais/saint-georges` | Canonical secondary ID `francais`; not inferred from `Langues` | One matching SEO-eligible teacher, mode `all`, normalized legacy city equals Saint-Georges |
| `/cours/espagnol/saint-georges` | Primary discipline `Espagnol`; general secondary category is insufficient by itself | One matching SEO-eligible teacher, mode `all`, normalized legacy city equals Saint-Georges |
| `/cours/mathematiques/varennes` | Canonical secondary ID `mathematiques`; not inferred from general tutoring | One matching SEO-eligible teacher, mode `all`, normalized legacy city equals Varennes |

The optional zones view is still missing in the connected environment. The
existing documented legacy-city fallback supplies these locality proofs. This
does not prove coverage of zones that may exist elsewhere but are not exposed by
that view; rollout of the zones view remains a separate operational dependency.

Counting unit: one distinct course/city URL, not teacher or match. The 8 registered
disciplines crossed with 51 registered cities yield 408 candidates. Assign exactly
one reason in this priority order: eligible local offer; otherwise no exact
discipline; otherwise no physical-capable mode; otherwise no declared local offer.
This makes the exclusion buckets disjoint rather than double-counting URLs.

| Classification | All 408 candidates | Of the 252 removed URLs |
| --- | ---: | ---: |
| Eligible exact local offer | 3 | 0 |
| No exact discipline | 255 | 102 |
| Online-only / no physical-capable mode | 0 | 0 |
| Exact discipline but no declared local offer | 150 | 150 |

The 102 subject exclusions are 51 English and 51 francisation URLs formerly
admitted by `Langues`. The 150 locality exclusions are 50 cities each for French,
Spanish and mathematics. The other 153 candidates (piano/guitar/music) were
already absent before and are not counted as removals.

Representative excluded pages (each was admitted by the old policy):

| URL | Precise reason |
| --- | --- |
| `/cours/anglais/montreal` | Zero exact English matches; parent `Langues` alone is not English |
| `/cours/anglais/laval` | Zero exact English matches |
| `/cours/anglais/longueuil` | Zero exact English matches |
| `/cours/francisation/montreal` | Zero exact francisation matches; French is not automatically francisation |
| `/cours/francisation/laval` | Zero exact francisation matches |
| `/cours/francisation/longueuil` | Zero exact francisation matches |
| `/cours/espagnol/montreal` | One exact physical-capable match, legacy city Saint-Georges, no declared Montreal zone |
| `/cours/espagnol/laval` | Same matching supply, no declared Laval zone |
| `/cours/francais/montreal` | One exact physical-capable match, legacy city Saint-Georges, no declared Montreal zone |
| `/cours/francais/longueuil` | Same matching supply, no declared Longueuil zone |
| `/cours/mathematiques/montreal` | One exact physical-capable match, legacy city Varennes, no declared Montreal zone |
| `/cours/mathematiques/laval` | Same matching supply, no declared Laval zone |

Reconciliation: before `255 + 51 city hubs + 58 non-local = 364`; after
`3 + 51 city hubs + 58 non-local = 112`. The 58 non-local URLs comprise 8 singleton
routes (root, become-teacher, devenir-enseignant, uy, tarifs, trouver-un-prof,
trouver-mon-prof, francisation), 9 legal, 6 yo, 3 fr, 3 en, 11 blog, 8 ressources,
5 subject hubs and 5 public teacher profiles. These non-local entries are measured
once for both totals, not fetched from a historical database. Thus all `/cours/`
URLs, including the five subject hubs, are `260 -> 8`.

### False-negative review and correction

- Exact discipline aliases use the canonical taxonomy resolver, including English
  labels; secondary canonical IDs qualify even when the primary label is absent.
- Broad category aliases had a confirmed defect: `music` did not qualify the
  general `musique` page. The baseline contains the same literal-only comparison,
  so this was not introduced by this branch. The SEO predicate now resolves the
  category alias canonically. A targeted regression test covers `music` + violin
  qualifying music but NOT piano. Actual snapshot counts remain unchanged.
- General `Langues` still cannot prove any specific language. No child-discipline
  inference or category-to-every-child expansion was added.
- City matching folds accents/case and trims whitespace, consistent with existing
  locality normalization. Shared region, substring similarity or coordinates alone
  are not proof. No new city alias, nearest-city rule or distance was invented.
- `person`, `in_person`, `in-person`, `home`, `both`, `all` permit physical supply;
  online-only does not. Mixed modes still qualify their actual declared locality.
- Active CA zones qualify their declared city only with a physical format. A
  teacher-place/public-place-only zone does not imply travel to another city.
  Student-place travel qualifies another city only within the existing zone radius.
  Inactive zones cannot qualify; no active zones use the exact legacy-city fallback.
- Existing tests exercise primary/secondary aliases, mixed and online modes,
  region-only and distant exclusions, active/inactive zones and radius coverage.
  Source inspection confirms the teacher-place versus student-travel distinction.

### Launch-critical: isolated baseline comparison

Created a detached worktree (no changes to the working tree being audited):

```powershell
git worktree add --detach C:/Users/Utilisateur/Documents/Codex/2026-05-13/analyse-my-project-from-a-critical/seo-baseline-verification 872c7d82aed276eff6fcf4e4ac2b9d4b5835d828
```

Its `node_modules` is a junction to the existing installation. Both runs use
Node `24.15.0`, Next `16.2.9`, tsx `4.21.0`, TypeScript `5.9.3` and PowerShell.
Bytewise hashes are equal for package.json, package-lock.json, tsconfig.json,
the chip test, TeacherProfile.tsx and lib/teachers/display.ts. The focused test
reads source files and does not read environment secrets or a database. No env
files were copied into the isolated worktree.

| Command, run from each tree | Current uncommitted branch | Isolated baseline |
| --- | --- | --- |
| `npx tsx tests/teachers/teacherProfileTeachingModeChips.test.ts` | Exit 1, line 49 | Exit 1, line 49 |
| `npm run test:launch-critical` | Exit 1 at the same assertion | Exit 1 at the same assertion |

Cause: `OPTIONS` slices TeacherProfile.tsx from `teacher-profile-course-options`
to `Enterprise studio map`. That slice includes the separate
`teacher-profile-teaching-zones` section. Its map icon at line 814 and primary
zone badge at line 817 intentionally use teal, so the blanket assertion fails.
The slate teaching-mode chip constant itself satisfies its preceding assertions.
Verdict: PRE-EXISTING DEMONSTRATED, not an SEO regression.

Recommended separate fix: bind this contract to the actual course-options/chip
container (prefer a rendered semantic assertion), retaining the no-teal assertion
for teaching-mode chips and separate coverage for teaching zones. Do not delete
the assertion, suppress it, or recolor unrelated product UI to satisfy this scan.
Neither this test nor teacher UI was modified here. The isolated worktree remains
available for inspection; no destructive cleanup was performed.

### Follow-up commands and results

- Two read-only snapshot audit runs: PASS, identical counts and snapshot hash.
- Focused chip test on both trees: FAIL identically, as detailed above.
- `npm run test:launch-critical` on both trees: FAIL identically, as detailed above.
- `npx tsx tests/seo/localDiscoveryHardening.test.ts`: PASS, 13 tests including the new alias case.
- All 14 `tests/seo/*.test.ts` files except the separately executed runtime test,
  run sequentially using `node node_modules/tsx/dist/cli.mjs <file>`: PASS.
- `npx tsx scripts/validate_i18n.ts`: PASS, 3502 keys per locale.
- `npm run build`: PASS, including Next application TypeScript check. Existing
  `experimental.forceSwcTransforms` warning remains; no config change for it.
- `npx eslint scripts/audit_local_discovery_indexation.ts lib/seo/localTeacherDiscoveryPages.ts tests/seo/localDiscoveryHardening.test.ts`: PASS, no diagnostics.
- `npm run start -- --port 3117` followed by
  `npx tsx tests/seo/localDiscoveryRuntime.test.ts`: PASS on the new production
  build. All nine valid paths in the runtime table above return 200 with the
  expected robots and self canonical; invalid examples return 404; legacy
  examples return 308 with exact destinations and preserved query parameters.
  Sitemap returns 112 URLs including all three eligible local course pages.
- `git diff --check`: PASS (only Git LF/CRLF conversion notices).

The 13 focused tests reconfirm structured-cloneable client-bound bundles and the
explicit plain discipline DTO, plus rejection of simulated teacher-data failures
and sitemap generation failures. These are controlled failure tests, not an
intentional production database outage. Valid empty supply remains 200/noindex;
data failure does not take that branch. The temporary production server was
stopped after verification.

Global lint and standalone full-repository TypeScript were NOT rerun in this
follow-up. Their previous failures remain unresolved, not green. Their origin is
not established by an isolated baseline run in this follow-up (the earlier
TypeScript compiler-host comparison and unchanged lint files are narrower
evidence). No restricted files were changed to work around those failures.

Blocker classification:

| Item | Classification | Status |
| --- | --- | --- |
| SEO-caused launch-critical regression | None confirmed by the isolated comparison | No teacher UI/test changes made |
| Chip test / launch-critical assertion | Pre-existing demonstrated on exact baseline | Unresolved, requires separately scoped semantic test fix |
| Broad `music` category alias | Pre-existing SEO defect confirmed in baseline source | Fixed with canonical alias resolution and targeted regression test |
| Prior global lint / standalone TypeScript failures | Origin not established by an isolated run in this follow-up | Still unresolved; not rerun or declared green |
| Missing optional teaching-zones view | Observed environment dependency, not attributed to this branch | Legacy-city fallback verified; separate rollout required |

During validation, one whitespace-check invocation briefly reported external
edits to `components/marketing/LandingHeroTrustStrip.tsx` and
`lib/landingTeacherFilter.ts`. Neither was readjusted or reverted by this task;
the subsequent status no longer listed them. This is a shared working tree, so
the build evidence refers to the tree at execution time, not an immutable commit.

Files modified in this follow-up only: `lib/seo/localTeacherDiscoveryPages.ts`,
`scripts/audit_local_discovery_indexation.ts`,
`tests/seo/localDiscoveryHardening.test.ts`, and this report.

## Validation-blocker repair stage (2026-09-22)

This later section supersedes the earlier unresolved chip-test status. This stage
does not repeat the supply audit or change production SEO predicates. No product
source, dependency, compiler/lint configuration or remote schema/data was changed.

### Authorized corrections

The chip contract now selects the actual JSX element by
`data-testid="teacher-profile-course-options"` using the TypeScript parser. It
requires exactly one match. Nested chips remain in scope; sibling teaching zones
are excluded. All existing positive and negative assertions remain. An additional
selector regression test injects forbidden teal styling and a button inside the
selected element, verifies they are still detected, and rejects a missing element.
No teacher UI was changed.

Type corrections are confined to test fixtures and assertions:

- Robots route lookup uses `Set<string>` so testing arbitrary paths does not
  incorrectly require membership in the literal union before the test can run.
- The JSON-LD XSS test still injects the same hostile runtime category via
  `Reflect.set`; the valid fixture constructor respects the category type. The
  hostile value and escape assertions are preserved, not replaced with safe data.
- Display/zone fixtures use valid empty image/coordinate data, undefined optional
  numbers and a required `distance` value. No runtime pricing or booking code changed.
- An async fixture result is retained in a typed object so TypeScript does not
  narrow an assignment made inside an awaited callback to unreachable `never`.
- The online-location diagnostic asserts an empty blocker array and no location
  warning, instead of checking a removed blocker enum member. This preserves and
  strengthens the expected warning-only/discovery-first contract.

Files edited during this stage only (distinct from earlier SEO work):

1. `tests/teachers/teacherProfileTeachingModeChips.test.ts`
2. `tests/teachers/premiumTeacherCardHierarchy.test.ts`
3. `tests/teacherSearch/teacherMultiZoneSearch.test.ts`
4. `tests/teacherSearch/teacherSearchVisibilityDiagnostics.test.ts`
5. `tests/teacherZones/teacherTeachingZonesFallback.test.ts`
6. `tests/seo/seoFoundation.test.ts`
7. `tests/seo/jsonLdSerialization.test.ts`
8. `docs/SEO_LOCAL_INDEXATION_HARDENING.md`

### Commands and test infrastructure

The repository defines `lint` as `eslint`; `test:launch-critical` is a sequential
tsx test chain. There is no package typecheck script: the global check used is
`npx tsc --noEmit --incremental false`, preserving the existing strict tsconfig.
The only checked-in GitHub workflow is a booking-reminder scheduler, not a
lint/typecheck CI gate. `validate:launch` chains auth, security, payments,
launch-critical, currency, payment safety, i18n and build checks.

Baseline measurements in this stage: lint FAIL with 4 errors and 232 warnings;
TypeScript FAIL with 198 diagnostics in 52 test files. These are fresh runs,
not copied results from the previous stage.

### Protected blockers and minimal recommendations

Global lint errors, not modified:

- `app/(app)/admin/stripe-diagnostics/page.tsx:288:73`, `288:89`, `289:20`:
  `react/no-unescaped-entities`, literal apostrophes in JSX prose. Recommended
  separate fix: JSX entities or a string expression preserving displayed copy.
- `tests/admin/stripeConnectDiagnostics.test.ts:532:3`:
  `@next/next/no-assign-module-variable`, local binding named `module`.
  Recommended separate fix: rename that binding and its references, preserving
  the dynamic import/test behavior.

After the chip fix, launch-critical reaches a previously masked failure in
`tests/yo/yopratiqoIndexation.test.ts:131`: it calls the real sitemap without
`NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`. The hardened sitemap now
correctly propagates missing data access instead of silently pretending supply is
empty. This is a test-environment integration incompatibility exposed by the SEO
change, NOT demonstrated as pre-existing on the baseline. The test lives in the
protected YoPratiqo scope and was not edited. Recommended separate minimal fix:
use a controlled data fixture in that test, as the SEO tests do; keep every
YoPratiqo sitemap assertion and all production data-error propagation intact.
Do not inject production credentials into the test runner or weaken the sitemap.

Remaining TypeScript causes in protected scopes include:

- Payment/package/refund/guarantee and schedule tests: incomplete ledger fixtures,
  outdated enum values and hand-built Supabase doubles no longer matching the SDK.
  Review fixtures against current contracts and use properly typed test adapters;
  never cast them to suppress errors or change financial rules for test convenience.
- Security tests: mutation of readonly `NODE_ENV` declarations and RLS test typing.
  Use a scoped environment test utility with restoration, without changing security.
- Privacy tests: Storage mocks and deleting required global fields; use complete
  Storage implementations and property-descriptor restoration.
- YoPratiqo tests: missing callback types, obsolete props/fixtures and regex flags
  unsupported by the ES2017 target. Update tests locally (e.g. equivalent regex
  constructs), not the global compiler target or product behavior.
- Membre Pro/ambassador tests: ES2018 dotAll regex flags under ES2017. Use equivalent
  explicit any-character patterns in the tests once separately authorized.
- Marketplace integration test: obsolete `@ts-expect-error`; remove only after
  verifying that the intentional negative-path input is still actually tested.

These test files cover protected systems and were not modified. No shared helper
was changed to neutralize their diagnostics.

### Teaching-zones diagnosis and review instructions

Expected objects, defined by `supabase/migrations/128_teacher_teaching_zones.sql`:
`public.teacher_teaching_zones`, `public.list_public_teacher_teaching_zones()` and
`public.teacher_teaching_zones_public`. The migration also defines own-row RLS,
public projection grants and an initial legacy-location backfill. It is not just
a cosmetic view creation and should be reviewed/applied as the existing migration.

Read-only checks executed with existing server credentials through the repository
Supabase client: `.from(table).select("id").limit(0)` for both tables/views and
`.rpc("list_public_teacher_teaching_zones").limit(0)` for the read-only function.
Only status/code were printed; no rows, credentials or personal information.

| Object | HTTP | PostgREST code |
| --- | ---: | --- |
| teacher_teaching_zones | 404 | PGRST205 |
| teacher_teaching_zones_public | 404 | PGRST205 |
| list_public_teacher_teaching_zones | 404 | PGRST202 |

This supports migration 128 not being applied/exposed in the connected environment.
It is not evidence of an ordinary permission-denied error, nor an obsolete view
name. A stale REST schema cache cannot be ruled out without catalog/history access.
The exact database cause therefore remains unconfirmed; do not claim the migration
history was inspected. The feature is optional for backward-compatible runtime
discovery, but necessary to prove travel-zone coverage beyond the legacy city.

Impact: in the absence of the view, only the normalized declared legacy city can
qualify local SEO. Secondary cities/student-home travel areas may be false negatives
until their active public zones are available. Online availability cannot make up
that missing physical coverage. No new radius or invented zone is used.

For a database operator's review, run these READ-ONLY SQL checks in the correct
linked environment (not executed by this task):

```sql
SELECT to_regclass('public.teacher_teaching_zones') AS zones_table,
       to_regclass('public.teacher_teaching_zones_public') AS zones_view,
       to_regprocedure('public.list_public_teacher_teaching_zones()') AS zones_function;
SELECT version FROM supabase_migrations.schema_migrations WHERE version = '128';
```

Compare with `npx supabase migration list --linked`. If catalog objects are absent
and 128 is pending, review prerequisites and apply ONLY the existing
`128_teacher_teaching_zones.sql` through the approved migration workflow. Do not
blindly push all pending migrations, renumber history, or create a replacement.
If catalog objects exist, inspect the view/function grants and PostgREST cache
first; any cache reload is a separate operator action, not performed here.
After approved rollout, repeat the zero-row probes, zone tests and same-snapshot
sitemap audit. Ordinary database/auth/permission errors must still propagate in
the SEO loader; only known missing-view codes take the compatibility fallback.

### Final measured results for this stage

| Command | Result | Evidence / blocker |
| --- | --- | --- |
| `npx tsx tests/teachers/teacherProfileTeachingModeChips.test.ts` | PASS | 6 tests, including selector mutation coverage |
| Sequential tsx execution of the 5 affected teacher/search/zone test files and all 14 SEO test files except HTTP runtime | PASS | 19 files; the 3 fixtures completed with `distance` were rerun and passed |
| `npm run test:launch-critical` | FAIL | Chip test passes; stops in protected `tests/yo/yopratiqoIndexation.test.ts:131` due to unconfigured real sitemap data access |
| `npm run lint` before / after | FAIL / FAIL | 4 errors, 232 warnings in each run; errors all in protected Stripe diagnostics files |
| `npx tsc --noEmit --incremental false` before / final | FAIL / FAIL | 198 -> 185 diagnostics; 13 errors corrected, remaining errors in 46 protected-scope test files |
| Scoped ESLint on all 7 edited test files | PASS | No diagnostics |
| `npx tsx scripts/validate_i18n.ts` | PASS | 3502 keys per locale |
| `npm run build` | PASS | Local production-mode build including application TypeScript check; global test typing is a separate failed check |
| `npm run start -- --port 3117` + `npx tsx tests/seo/localDiscoveryRuntime.test.ts` | PASS | Local HTTP checks only; 112 sitemap URLs, 3 course/city entries, 200/index or noindex as appropriate, 404 invalid routes, 308 redirects with query preservation |
| `npm run validate:launch` | FAIL | Auth suite completes; security stage stops at `tests/security/rlsCoverage.test.ts:236` |
| `git diff --check` | PASS | LF/CRLF notices only |
| Live production HTTP / deployment validation | NON EXÉCUTÉ | No deployment authorized; local build is not production-site verification |
| Remote migration application | NON EXÉCUTÉ | Read-only probes only |

The 19-file test command uses `node node_modules/tsx/dist/cli.mjs <file>` for each
file, exits on any nonzero result, and excludes only the runtime test from that
loop because it runs separately against the final local production-mode server.
The five targeted files are the five `tests/teachers`, `tests/teacherSearch` and
`tests/teacherZones` files listed above. The global compiler, lint, launch-critical
and validate:launch commands retain their full original scope and configuration.

The RLS validation failure is a second protected blocker, distinct from absent
remote objects. Migration 128 line 120 explicitly contains
`ALTER TABLE public.teacher_teaching_zones ENABLE ROW LEVEL SECURITY;`.
The test's `EXPLICIT_RLS_HARDENING_FILES` does not include migration 128, and its
line-227 expression only accepts `ALTER TABLE IF EXISTS ...`. Thus this source
assertion does not prove that the migration omits RLS. Minimal separately reviewed
correction: include the actual migration in the explicit coverage registry and
recognize both valid ENABLE syntaxes while continuing to require explicit RLS
for every table; alternatively follow the team's forward-hardening convention.
Do not exempt the table, delete the assertion or change remote policy here.
No security test or migration was edited in this stage.

Remaining TypeScript counts by protected domain: YoPratiqo 97; offers/packages 40;
security 15; schedule/booking 13; guarantee/refund 10; privacy consent 3;
Membre Pro 3; teacher availability 2; ambassador rewards 1; mixed marketplace
messaging/booking QA 1. The detailed file/line/code inventory follows.

Final verdict: **VALIDATION ENCORE BLOQUÉE**. The authorized corrections pass their
tests, but lint, global TypeScript, launch-critical and validate:launch do not.
No commit, push, PR, merge, deployment or remote database/schema write occurred.
Sentinels and concurrent changes were preserved. The temporary local server was
stopped after HTTP verification; no production service was changed.

### Remaining TypeScript diagnostics by protected file

Fresh final run: 185 diagnostics. Locations are `line:code`; repeated diagnostics
on the same line are retained in the count. Root-cause recommendations above apply.
No error was excluded from the compiler run.

| File | Count | Locations / diagnostics |
| --- | ---: | --- |
| `tests/ambassadors/ambassadorReferralTracking.test.ts` | 1 | 188:TS1501 |
| `tests/guarantee/firstLessonClaim.test.ts` | 2 | 283:TS2345, 315:TS2554 |
| `tests/guarantee/firstLessonEligibility.test.ts` | 8 | 167:TS2345, 186:TS2345, 206:TS2345, 233:TS2345, 257:TS2345, 284:TS2345, 304:TS2345, 324:TS2345 |
| `tests/marketing/membreProCommissionModel.test.ts` | 3 | 225:TS1501, 226:TS1501, 227:TS1501 |
| `tests/marketplace/integratedMarketplaceQa.test.ts` | 1 | 377:TS2578 |
| `tests/offers/bookingOfferSelection.test.ts` | 2 | 125:TS2367, 127:TS2367 |
| `tests/offers/bookingOfferSnapshots.test.ts` | 1 | 229:TS2367 |
| `tests/offers/plannedPackageAdminOps.test.ts` | 9 | 115:TS2345, 140:TS2345, 164:TS2345, 189:TS2345, 218:TS2345, 240:TS2345, 262:TS2345, 284:TS2345, 308:TS2345 |
| `tests/offers/plannedPackageE2eLifecycle.test.ts` | 4 | 35:TS2704, 66:TS2540, 94:TS2704, 121:TS2704 |
| `tests/offers/plannedPackageFulfillment.test.ts` | 3 | 152:TS2540, 156:TS2704, 157:TS2540 |
| `tests/offers/plannedPackageLaunchActivation.test.ts` | 2 | 89:TS2540, 225:TS2540 |
| `tests/offers/plannedPackageLaunchMonitoring.test.ts` | 1 | 258:TS2540 |
| `tests/offers/plannedPackageManualRefund.test.ts` | 2 | 37:TS2704, 70:TS2540 |
| `tests/offers/plannedPackageManualTransfer.test.ts` | 5 | 37:TS2704, 70:TS2540, 165:TS2353, 221:TS2353, 283:TS2704 |
| `tests/offers/plannedPackagePayoutEligibility.test.ts` | 1 | 438:TS2739 |
| `tests/offers/plannedPackagePublicLaunchGate.test.ts` | 2 | 95:TS2540, 326:TS2540 |
| `tests/offers/plannedPackageStripeCheckout.test.ts` | 3 | 40:TS2704, 71:TS2540, 82:TS2540 |
| `tests/offers/plannedPackageTransferReversal.test.ts` | 2 | 41:TS2704, 199:TS2704 |
| `tests/offers/teacherOfferCancellationPreferences.test.ts` | 1 | 53:TS1501 |
| `tests/offers/teacherOffersApi.test.ts` | 1 | 558:TS2345 |
| `tests/offers/teacherOffersMobilePublishPolish.test.ts` | 1 | 165:TS2353 |
| `tests/privacy/cookieConsent.test.ts` | 3 | 61:TS2322, 75:TS2790, 76:TS2790 |
| `tests/schedule/dateExceptions.test.ts` | 5 | 174:TS2322, 207:TS2322, 217:TS2322, 353:TS2322, 481:TS2322 |
| `tests/schedule/preciseScheduleBookingEnforcement.test.ts` | 1 | 59:TS2322 |
| `tests/schedule/preciseScheduleBookingSource.test.ts` | 4 | 76:TS2339, 83:TS2339, 93:TS2339, 100:TS2339 |
| `tests/schedule/weeklyIntervals.test.ts` | 3 | 154:TS2322, 163:TS2322, 184:TS2322 |
| `tests/security/rateLimitProduction.test.ts` | 9 | 64:TS2540, 87:TS2704, 88:TS2540, 105:TS2540, 122:TS2704, 123:TS2540, 139:TS2540, 151:TS2704, 152:TS2540 |
| `tests/security/rlsCoverage.test.ts` | 1 | 289:TS2345 |
| `tests/security/searchAnalyticsRateLimit.test.ts` | 5 | 73:TS2339, 74:TS2339, 75:TS2339, 76:TS2339, 77:TS2339 |
| `tests/teachers/availabilityStartDate.test.ts` | 2 | 110:TS2322, 161:TS2322 |
| `tests/yo/yopratiqoBookingModalProgressDetection.test.ts` | 2 | 41:TS2345, 57:TS2345 |
| `tests/yo/yopratiqoDominicanFlashcardsPrintables.test.ts` | 1 | 335:TS2339 |
| `tests/yo/yopratiqoDominicanModule4.test.ts` | 2 | 229:TS2345, 425:TS18048 |
| `tests/yo/yopratiqoDominicanModule5.test.ts` | 4 | 33:TS2345, 351:TS2345, 357:TS2345, 378:TS18048 |
| `tests/yo/yopratiqoDominicanPedagogicalQuality.test.ts` | 1 | 274:TS2345 |
| `tests/yo/yopratiqoEnglishIntro.test.ts` | 1 | 104:TS2352 |
| `tests/yo/yopratiqoFrQuebecLesson2.test.ts` | 1 | 417:TS2352 |
| `tests/yo/yopratiqoFrQuebecPremiumAudio.test.ts` | 5 | 109:TS2339, 110:TS7006, 114:TS2339, 114:TS7006, 115:TS7006 |
| `tests/yo/yopratiqoFrQuebecPremiumShell.test.ts` | 67 | 673:TS2339, 674:TS2339, 676:TS2339, 677:TS2339, 681:TS2339, 690:TS2339, 694:TS2339, 702:TS2339, 703:TS2339, 705:TS2339, 710:TS2339, 715:TS2339, 716:TS2339, 718:TS2339, 722:TS2339, 730:TS2339, 730:TS2339, 731:TS2339, 734:TS2339, 751:TS2339, 751:TS7006, 778:TS2339, 779:TS2339, 779:TS7006, 781:TS2339, 798:TS2339, 798:TS7006, 806:TS2339, 807:TS2339, 807:TS7006, 809:TS2339, 820:TS2339, 820:TS7006, 876:TS2339, 877:TS2339, 879:TS2339, 883:TS2339, 890:TS2339, 891:TS2339, 1168:TS2339, 1169:TS2339, 1170:TS2339, 1171:TS2339, 1172:TS2339, 1181:TS2339, 1181:TS2339, 1182:TS2339, 1182:TS2339, 1183:TS2339, 1183:TS2339, 1184:TS2339, 1184:TS2339, 1185:TS2339, 1185:TS2339, 1190:TS2339, 1227:TS2339, 1248:TS2339, 1248:TS7006, 1262:TS2339, 1262:TS7006, 1276:TS2339, 1304:TS2339, 1369:TS2339, 1370:TS2339, 1371:TS2339, 1376:TS2339, 1814:TS2352 |
| `tests/yo/yopratiqoIntroLessonDeck.test.ts` | 2 | 298:TS1501, 303:TS1501 |
| `tests/yo/yopratiqoItalianIntro.test.ts` | 1 | 101:TS2352 |
| `tests/yo/yopratiqoJapaneseAudio.test.ts` | 1 | 281:TS2345 |
| `tests/yo/yopratiqoJapaneseIntro.test.ts` | 1 | 107:TS2352 |
| `tests/yo/yopratiqoLanguageSelection.test.ts` | 1 | 85:TS1501 |
| `tests/yo/yopratiqoProductFoundation.test.ts` | 5 | 69:TS1354, 147:TS2345, 149:TS2345, 152:TS2345, 153:TS2345 |
| `tests/yo/yopratiqoSeoMetadata.test.ts` | 2 | 156:TS2339, 158:TS2339 |


## Final authorized test repair and SQL diagnosis (2026-09-23)

This section supersedes the previous statement that all 185 TypeScript errors were
protected. That classification was too broad. Merely importing Stripe or testing
security does not make a test protected. No production application, migration,
payment, auth, lesson, or configuration file was edited during this stage.

Branch remains `fix/seo-local-indexation-hardening`; HEAD remains
`872c7d82aed276eff6fcf4e4ac2b9d4b5835d828`. Earlier uncommitted SEO work is preserved.
No commit, push, PR, merge, deployment, remote cache reload or remote mutation.

### Corrections and scope

- `tests/yo/yopratiqoIndexation.test.ts` explicitly describes a no-network contract,
  not a database integration test. It now invokes the real sitemap through the existing
  `tests/seo/emptySupplySitemap.ts` fixture. The same fix covers
  `yopratiqoFrQuebecPremiumShell.test.ts`, `yopratiqoFrQuebecLesson2.test.ts` and
  `yopratiqoFrQuebecModuleEntrypoints.test.ts` in that directory. URL assertions stay intact.
  Dummy environment values and mocked fetch responses exist only within the test helper;
  its finally block restores the prior fetch and environment, including missing values.
- `tests/seo/localDiscoveryHardening.test.ts` now explicitly verifies restoration
  after both failed and successful sitemap calls. The database-error rejection
  assertion remains, with no production catch/empty-sitemap fallback.
- `tests/security/rlsCoverage.test.ts` now discovers every migration in lexical order
  and checks the final explicit ENABLE/DISABLE state. Previously its hard-coded
  hardening file list omitted 128; its earlier check also assumed a narrower SQL form.
  Migration 128 already contains explicit ENABLE at line 120. No migration was changed.
  Historical mandatory migration-presence assertions and PostGIS exceptions remain.
  Cases cover ordinary/IF EXISTS/quoted identifiers, missing activation, line/block/nested
  comments, string literals, later DISABLE and subsequent re-enable.
  This is a source guard, not proof of deployed PostgreSQL state or a full SQL interpreter.
- Other changes are test-only: discriminate lesson variants before accessing fields;
  check localized optional strings; use complete progress fixtures; narrow SEO metadata
  unions; use equivalent regex syntax supported by the configured target; restore
  browser globals using descriptors; type async captures without unsafe casts;
  make schedule query doubles chainable; use the canonical regular lesson type;
  remove constant comparisons in draft/paused/archived test loops.
- Local test environment writes use reflection/descriptor APIs compatible with Next's
  readonly NODE_ENV declaration. Values, assertions and existing restoration paths are
  unchanged. No real environment configuration was edited.
- Financial fixtures needing a decision about refund/transfer evidence and the direct
  Stripe checkout test remain untouched. No production type was widened to appease mocks.

### File inventory for this stage

Paths below are test files, except this report; earlier SEO implementation changes
listed above remain from previous stages.

- `tests/ambassadors/ambassadorReferralTracking.test.ts`
- `tests/marketing/membreProCommissionModel.test.ts`
- `tests/marketplace/integratedMarketplaceQa.test.ts`
- `tests/privacy/cookieConsent.test.ts`
- `tests/security/rateLimitProduction.test.ts`, `rlsCoverage.test.ts`, `searchAnalyticsRateLimit.test.ts`
- `tests/seo/localDiscoveryHardening.test.ts`
- `tests/schedule/dateExceptions.test.ts`, `weeklyIntervals.test.ts`,
  `preciseScheduleBookingSource.test.ts`, `preciseScheduleBookingEnforcement.test.ts`
- `tests/teachers/availabilityStartDate.test.ts`
- `tests/offers/bookingOfferSelection.test.ts`, `bookingOfferSnapshots.test.ts`,
  `teacherOfferCancellationPreferences.test.ts`, `teacherOffersApi.test.ts`,
  `teacherOffersMobilePublishPolish.test.ts`
- `tests/offers/plannedPackageE2eLifecycle.test.ts`, `plannedPackageFulfillment.test.ts`,
  `plannedPackageLaunchActivation.test.ts`, `plannedPackageLaunchMonitoring.test.ts`,
  `plannedPackageManualRefund.test.ts`, `plannedPackageManualTransfer.test.ts`,
  `plannedPackagePublicLaunchGate.test.ts`, `plannedPackageTransferReversal.test.ts`
- `tests/yo/yopratiqoBookingModalProgressDetection.test.ts`,
  `yopratiqoDominicanFlashcardsPrintables.test.ts`, `yopratiqoDominicanModule4.test.ts`,
  `yopratiqoDominicanModule5.test.ts`, `yopratiqoDominicanPedagogicalQuality.test.ts`,
  `yopratiqoEnglishIntro.test.ts`, `yopratiqoFrQuebecLesson2.test.ts`,
  `yopratiqoFrQuebecModuleEntrypoints.test.ts`, `yopratiqoFrQuebecPremiumAudio.test.ts`,
  `yopratiqoFrQuebecPremiumShell.test.ts`, `yopratiqoIndexation.test.ts`,
  `yopratiqoIntroLessonDeck.test.ts`, `yopratiqoItalianIntro.test.ts`,
  `yopratiqoJapaneseAudio.test.ts`, `yopratiqoJapaneseIntro.test.ts`,
  `yopratiqoLanguageSelection.test.ts`, `yopratiqoProductFoundation.test.ts`,
  `yopratiqoSeoMetadata.test.ts`
- `docs/SEO_LOCAL_INDEXATION_HARDENING.md`

### TypeScript reconciliation and limited follow-up scope

The previous per-file 185-error table remains above as the starting inventory.
Grouping those exact diagnostics by underlying test-fixture family:

| Family / cause | Starting errors | Remaining |
|---|---:|---:|
| YoPratiqo variant/localized/metadata narrowing, fixture shape, regex target | 97 | 0 |
| Security NODE_ENV, captured async row, Set membership typing | 15 | 0 |
| Browser Storage/global mock typing | 3 | 0 |
| Redundant cast suppressing the intended negative type test | 1 | 0 |
| Ambassador/marketing source regex target | 4 | 0 |
| Schedule chainable mocks, regular lesson enum, result union | 15 | 0 |
| Offers environment harness, fixture drift, constant status comparisons | 40 | 15 |
| Guarantee query-double contract drift | 10 | 10 |
| **Total** | **185** | **25** |

Final command: `npx tsc --noEmit --incremental false`, exit 2.
Intermediate runs reported 65 and 47 errors; these are not the final totals.
Final diagnostics, exact files and lines:

| File | Errors | Lines / codes |
|---|---:|---|
| `tests/guarantee/firstLessonClaim.test.ts` | 2 | 283:TS2345, 315:TS2554 |
| `tests/guarantee/firstLessonEligibility.test.ts` | 8 | 167,186,206,233,257,284,304,324:TS2345 |
| `tests/offers/plannedPackageAdminOps.test.ts` | 9 | 115,140,164,189,218,240,262,284,308:TS2345 |
| `tests/offers/plannedPackageManualTransfer.test.ts` | 2 | 165,221:TS2353 |
| `tests/offers/plannedPackagePayoutEligibility.test.ts` | 1 | 438:TS2739 |
| `tests/offers/plannedPackageStripeCheckout.test.ts` | 3 | 40:TS2704, 71,82:TS2540 |

Instruction sources (not inferred from imports):
- Current attached task: `C:/Users/Utilisateur/.codex/attachments/43779967-609f-4114-85c8-b3829f10065a/Pasted text.txt`,
  constraints prohibit Stripe/protected systems, existing migrations and remote writes,
  but section 4 authorizes manifestly safe test corrections.
- Original SEO task: `C:/Users/Utilisateur/.codex/attachments/cc9843d9-43c1-4da0-afd7-7eee979546f0/Pasted text.txt`;
  continuation `C:/Users/Utilisateur/.codex/attachments/c711c1fa-46d0-4291-8b48-99ab10010a92/Pasted text.txt`:
  financial/payment/checkout/payout/subscription behavior is outside scope.
- `CLAUDE.md` and `AGENTS.md` contain no blanket protection of these test paths.

Concrete follow-ups, not a blanket request to change protected systems:
1. **Guarantee doubles (10):** FakeAdmin.from returns a partial FakeQuery while
   `lib/guarantee/firstLesson.ts:47` requires the complete SDK query builder.
   Proposed type-only production change, only with limited authorization: describe
   the actual query operations consumed by eligibility, then adapt both test doubles,
   including their select(columns) signature. Alternative: a real SDK client with
   mocked transport, without changing production. No double-cast or ts-ignore.
   Risk: accidentally skipping a filter in a refund-eligibility mock. Validate both
   guarantee suites and payment/auth regressions. The test files themselves are not
   explicitly forbidden; the contemplated production guarantee/refund contract is
   the scope boundary. This is a contract-repair proposal, not an assertion that
   importing Supabase protects the test.
2. **Financial evidence fixtures (12):** authorize only the three offer test files
   above, not their production modules. AdminOps lacks refundStatus/refundedCents/
   latestQuoteStatus/latestExecutionStatus/packageTransferDetected (9);
   ManualTransfer supplies obsolete latestTransferExecutionStatus (2);
   PayoutEligibility lacks id/teacherNetCents/transferStatus/stripeTransferId/
   transferredCents (1). Build typed fixtures representing each named scenario,
   assert those evidence fields, and retain all expected financial decisions.
   Do not invent a blanket zero-refund/default-safe state or just remove evidence.
   Risk: making an unsafe transfer scenario look eligible. Run the three targeted
   suites, offers/payment suites and full tsc. The concern is financial fixture
   semantics, not mere file membership/imports.
3. **Direct Stripe test harness (3):** authorize only NODE_ENV writes/restoration
   in `tests/offers/plannedPackageStripeCheckout.test.ts`, using the same local
   reflection approach, without changing checkout assertions or Stripe calls.
   Explicit no-Stripe instruction is the restriction. Low risk; run that mocked
   suite and global tsc.
4. **Lint (4 errors, 232 warnings):** `app/(app)/admin/stripe-diagnostics/page.tsx:288`
   has three unescaped apostrophes; `tests/admin/stripeConnectDiagnostics.test.ts:532`
   binds the reserved variable name module. Proposed limited authorization:
   escape those three JSX apostrophes and rename only that local test binding.
   No diagnostics/readiness algorithm change. These are direct Stripe diagnostic
   files under the explicit restriction. Low risk; targeted diagnostics test,
   lint and build. Warnings are still present and are not claimed resolved.

### Teaching zones: read-only SQL NOT EXECUTED

Expected from `supabase/migrations/128_teacher_teaching_zones.sql`:
`public.teacher_teaching_zones`, `public.teacher_teaching_zones_public`,
and `public.list_public_teacher_teaching_zones()` (zero arguments, SQL, STABLE,
SECURITY DEFINER, explicit search_path public). The public view uses security_invoker.
The migration grants function EXECUTE and view SELECT to anon/authenticated/service_role;
the underlying table has own-row authenticated policies and service-role access.

This stage checked only configuration identity: URL hostname and linked project reference
both identify `jwlbwmxoradmbuvqfkhe`. No secrets were printed. PostgreSQL client exists,
but no usable SQL connection/password or pgpass was configured, and no SQL connector
was available. Therefore no catalog/history/privilege query below was executed.
Prior REST PGRST205/PGRST202 results prove only a REST lookup/cache failure.

Execute the following in the authorized project's SQL editor, read-only. No user
records, private locations or credentials are selected:

```sql
BEGIN READ ONLY;
SELECT current_database(), current_user, inet_server_addr(),
       current_setting('pgrst.db_schemas', true) AS rest_schema_setting;

SELECT n.nspname, c.relname, c.relkind, c.relrowsecurity,
       c.relforcerowsecurity, c.reloptions
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('teacher_teaching_zones', 'teacher_teaching_zones_public');

SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS arguments,
       p.provolatile, p.prosecdef, p.proconfig,
       pg_get_function_result(p.oid) AS result_type
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'list_public_teacher_teaching_zones';

SELECT r.rolname, has_schema_privilege(r.oid, 'public', 'USAGE') AS schema_usage,
       c.relname, has_table_privilege(r.oid, c.oid, 'SELECT') AS can_select
FROM pg_roles r CROSS JOIN pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE r.rolname IN ('anon', 'authenticated', 'service_role')
  AND n.nspname = 'public'
  AND c.relname IN ('teacher_teaching_zones', 'teacher_teaching_zones_public');

SELECT r.rolname, p.proname,
       pg_get_function_identity_arguments(p.oid) AS arguments,
       has_function_privilege(r.oid, p.oid, 'EXECUTE') AS can_execute
FROM pg_roles r CROSS JOIN pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE r.rolname IN ('anon', 'authenticated', 'service_role')
  AND n.nspname = 'public' AND p.proname = 'list_public_teacher_teaching_zones';

SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'teacher_teaching_zones';

SELECT to_regclass('supabase_migrations.schema_migrations') AS history_table;
ROLLBACK;
```

Only if history_table exists and the current role can read it, execute separately:
```sql
BEGIN READ ONLY;
SELECT version FROM supabase_migrations.schema_migrations WHERE version = '128';
ROLLBACK;
```

Interpretation: missing catalog rows establishes missing objects; objects plus denied
grants suggest exposure issues; migration 128 recorded plus missing objects establishes
history/state divergence. Objects and grants present with REST misses leaves cache,
exposed-schema or environment mismatch to investigate. A NULL REST setting is not proof
of non-exposure (hosted configuration may be external). No history row does not disprove
manual SQL application. Do not apply migration or reload cache from this report alone.

### Commands and validation evidence for this stage

- `npx tsx tests/yo/yopratiqoIndexation.test.ts`: PASS, 13 assertions.
- `npx tsx tests/security/rlsCoverage.test.ts`: PASS, 7 tests after final parser update.
- `npx tsx tests/seo/localDiscoveryHardening.test.ts`: PASS, 13 tests including
  error propagation, mock restoration, serializability, supply gates and redirects.
- Each tracked changed `*.test.ts` present at the first sweep was run with
  `npx tsx <file>`: 35 files, 33 PASS, 2 FAIL, detailed below.
- Subsequent targeted runs: the five schedule/availability files, five offer
  selection/publication/source-contract files, ambassador and marketing tests,
  then eight planned-package environment-harness files: all PASS (20 files).
- `npm run test:launch-critical`: PASS twice during this stage, including the final
  rerun after all test-fixture edits (exit 0; `seo-stage4-launch-final.log`).
- `npm run validate:launch`: PASS, exit 0. Auth/security/payments/launch-critical,
  currency/payment-safety, i18n and production build ran through the real script.
  This run preceded the last mechanical fixture-only edits; affected tests were
  rerun individually. No application change since that build.
- Build within validate:launch: PASS, compiled in 84s; Next emitted the existing
  experimental.forceSwcTransforms/Turbopack warning.
- i18n within validate:launch: PASS, 3502 keys per locale.
- `npm run lint`: FAIL, 4 errors / 232 warnings, no suppression added.
- `npx tsc --noEmit --incremental false`: FAIL, 25 diagnostics listed above.
- `git diff --check`: PASS (CRLF normalization warnings are not diff errors).
- One sandbox tsx attempt failed with Windows uv_os_get_passwd ENOMEM; rerun
  outside the sandbox passed. One slow sandbox lint attempt was interrupted and
  replaced by the completed unrestricted lint run. Neither is counted as PASS.
- Logs under the local TEMP directory: `seo-stage4-targeted.log`,
  `seo-stage4-launch.log`, `seo-stage4-launch-final.log`,
  `seo-stage4-validate.log`, `seo-stage4-ts-complete.log`,
  `seo-stage4-lint-final.log`.
- Prior 19-file SEO validation, same-snapshot 255->3 / 364->112 measurement,
  base/current teaching-mode comparison and HTTP production-server checks belong
  to the previous stage. No new live inventory snapshot or HTTP run was needed
  for these test-only edits. The three local URLs and evidence above are unchanged.

Two additional test blockers were deliberately not suppressed:
- `tests/yo/yopratiqoDominicanFlashcardsPrintables.test.ts:384`: 17 assertions pass,
  its branch-wide guard rejects `lib/seo/localTeacherDiscoveryPages.ts`.
- `tests/yo/yopratiqoIntroLessonDeck.test.ts:458`: its branch-wide guard rejects
  `app/sitemap.ts`.
Both guards still enforce their original intro-only scope against this SEO worktree.
This is an observed scope conflict, not a demonstrated new product regression.
No base reproduction was performed for these two guards in this stage, so historical
origin remains unestablished. A future explicit guard-scope design is needed; no
whitelist, bypass, skipped test or assertion weakening was introduced.

**Verdict: VALIDATION ENCORE BLOQUEE.** Launch-critical and validate:launch pass,
but global TypeScript, global lint, two extra branch-scope tests and the unexecuted
SQL diagnosis prevent an entirely green verdict. No new runtime SEO regression
was confirmed in this stage. This is not a public-launch approval.


## Limited authorization closure (2026-09-23)

This stage follows the explicit authorization in
`C:/Users/Utilisateur/.codex/attachments/1e239e7a-813f-4858-8913-09f6cc13455d/Pasted text.txt`.
It supersedes the preceding 25-TypeScript / 4-lint-error findings once the final
results below are recorded. Earlier measurements and validation logs remain historical.

### Repairs

**Guarantee tests:** real Supabase SDK clients now build the queries; a private
in-memory fetch transport resolves them without calling global fetch or opening
a network connection. It checks the fixture origin, table, method, projections,
OR expression, order and limit, and applies equality/ilike filters to the row store.
The eligible scenario checks all four complete SDK request query strings and has
decoy records belonging to another student plus an unrelated support request.
The claim scenario checks select(id) and the profile-update id filter.
All prior eligibility, rejection, manual-review and no-payment-mutation assertions
remain. No any, double cast, suppression or production type change was added.
The intermediate typecheck found one missing nullsFirst option on the claim row
store; that test signature was corrected and the false value is asserted.

**Financial fixtures:** all nine AdminOps inputs explicitly describe refund and
transfer evidence. The failed-fulfillment scenario includes a pending refund,
an approved manual-refund quote and a failed execution; it must still require
attention and expose both refund warnings. Thus failures are not converted into
uniformly favorable financial fixtures. ManualTransfer entries use stripeTransferId
instead of the nonexistent latestTransferExecutionStatus; execution failure remains
in the actual transferExecutions contract. Three adverse variants (partial refund,
approved refund, executed full refund) must report eligible_session_blocked_by_refund
and must not report eligible_transfer_not_executed. The pricing-policy-review fixture
keeps teacherNetCents null and adminReviewRequired true, with no transfer evidence.

**Stripe-limited edits:** the checkout test restores its initial NODE_ENV in an
afterEach hook, including assertion-failure paths. Only its environment harness
changed. The admin page replaces exactly three apostrophes with equivalent JSX
entities; rendered copy is unchanged. The diagnostics test renames module to
diagnosticsModule and changes only its references.

### Explicit task-scope control

The two YoPratiqo files were standalone contracts, not referenced by the original
launch-critical script. The only checked-in GitHub workflow is a reminder scheduler;
it did not execute these tests. Their permanent assertions remain intact.

Their old changed-file guards mixed task-specific restrictions with unrelated
functional tests: one compared main...HEAD plus staged/unstaged changes; the other
read the entire dirty tree. They now exercise their unchanged restricted-path
policies against controlled allowed and denied inputs. Real task-diff checking
is separately available as:

```powershell
npm run check:yo-task-scope -- --task intro-deck --base <base-commit> --head <head-commit>
npm run check:yo-task-scope -- --task flashcards-printables --base <base-commit> --head WORKTREE
```

Both references and the named task are mandatory; unknown tasks/invalid references
fail. The command prints the resolved full base/head hashes and checked paths.
It uses a direct comparison between those trees, not an implicit moving main or
branch-name exception. WORKTREE compares the base to staged/unstaged state and
includes untracked nonignored files. NUL-separated Git output handles spaces;
rename detection is disabled so both removed and added paths are checked.
There is no environment skip, force-pass switch, branch whitelist or sentinel
exception. No real application of either intro-only policy is claimed to pass
on this deliberately broader SEO branch.

The new test covers nonempty allowed lesson changes and forbidden payment,
migration, legal, SEO, audio and script changes; Windows separators and invalid
references are covered too. The actual CLI was run with intro-deck, base HEAD
(resolved to 872c7d82aed276eff6fcf4e4ac2b9d4b5835d828) and head WORKTREE. It failed
as expected on app/sitemap.ts and the changed lib/seo files. This negative check
proves the extracted guard still rejects this out-of-task diff, rather than
silently allowing it. It is not a failure of the SEO functional contract.

`test:yo-task-scope` runs the policy tests and both complete YoPratiqo contracts.
`test:launch-critical` now invokes it first; all pre-existing commands remain.
No dependencies, lockfile, compiler exclusions, lint suppression or CI workflow
were changed. A future intro-only task should additionally invoke the explicit
changed-file command with its reviewed base/head.

### Exact files edited or added in this stage

1. `tests/guarantee/firstLessonClaim.test.ts`
2. `tests/guarantee/firstLessonEligibility.test.ts`
3. `tests/offers/plannedPackageAdminOps.test.ts`
4. `tests/offers/plannedPackageManualTransfer.test.ts`
5. `tests/offers/plannedPackagePayoutEligibility.test.ts`
6. `tests/offers/plannedPackageStripeCheckout.test.ts`
7. `tests/admin/stripeConnectDiagnostics.test.ts`
8. `app/(app)/admin/stripe-diagnostics/page.tsx`
9. `tests/yo/yopratiqoDominicanFlashcardsPrintables.test.ts`
10. `tests/yo/yopratiqoIntroLessonDeck.test.ts`
11. `tests/yo/yoTaskScope.ts` (new)
12. `tests/yo/yoTaskScope.test.ts` (new)
13. `scripts/check_yo_task_scope.ts` (new)
14. `package.json` (test/guard script wiring only)
15. `docs/SEO_LOCAL_INDEXATION_HARDENING.md`

### Final validation results

Commands executed on the final code:

| Command | Result |
|---|---|
| `npx tsx tests/guarantee/firstLessonEligibility.test.ts` | PASS, 9 |
| `npx tsx tests/guarantee/firstLessonClaim.test.ts` | PASS, 16 |
| `npx tsx tests/offers/plannedPackageAdminOps.test.ts` | PASS, 20 |
| `npx tsx tests/offers/plannedPackageManualTransfer.test.ts` | PASS, 16 |
| `npx tsx tests/offers/plannedPackagePayoutEligibility.test.ts` | PASS, 23 |
| `npx tsx tests/offers/plannedPackageStripeCheckout.test.ts` | PASS, 14 |
| `npx tsx tests/admin/stripeConnectDiagnostics.test.ts` | PASS, 24 |
| `npx tsx tests/yo/yoTaskScope.test.ts` | PASS, 3 |
| `npx tsx tests/yo/yopratiqoDominicanFlashcardsPrintables.test.ts` | PASS, 18 |
| `npx tsx tests/yo/yopratiqoIntroLessonDeck.test.ts` | PASS, 14 |
| `npm run test:offers` | PASS, exit 0 |
| `npx tsc --noEmit --incremental false` | PASS, zero errors, exit 0 |
| `npm run lint` | PASS, zero errors / 232 warnings, exit 0 |
| `npm run test:launch-critical` | PASS, exit 0 |
| `npm run validate:launch` | PASS, exit 0; auth/security/payments/launch-critical/currency/payment-safety/i18n/build completed |
| `git diff --check` | PASS |

The lint command is plain eslint, without max-warnings=0; existing warnings
are nonblocking under the actual repository configuration and remain unresolved.
Production build and i18n were executed by the real validate:launch command,
not inferred from an earlier run. Both passed (3502 i18n keys per locale).
The existing Turbopack warning about experimental.forceSwcTransforms remains.
**VALIDATION DU CODE: PASS.** The 25 TypeScript errors and four lint errors are
resolved; both formerly blocked YoPratiqo contracts pass. This local code result
does not close the SQL investigation or constitute production verification.
Intermediate lint/validate processes were interrupted and restarted after the
last test-code correction, not counted as completed validations. The initial
typecheck's single nullsFirst diagnostic is superseded by the passing final run.
Logs: local TEMP `seo-stage5-targeted-final.log`, `seo-stage5-types-final.log`,
`seo-stage5-lint-final.log`, `seo-stage5-launch.log`, `seo-stage5-offers.log`,
`seo-stage5-validate-final.log`. The expected negative CLI check is in
`seo-stage5-scope-rejection.log`.

### SQL and production status

**DIAGNOSTIC SQL: NON EXECUTE.** This stage reconfirmed that the configured URL
and linked reference match `jwlbwmxoradmbuvqfkhe`. No SQL connector is available,
and the configured environment has neither a SQL URL nor a database password.
Only booleans and the public project identity were printed. No secret was sought
from an external store. No PostgreSQL query, migration, permissions change or
cache reload was performed.

The ready-to-copy read-only SQL block in the previous section remains the next
diagnostic action in the authorized Supabase SQL editor. It checks catalogs,
signature, grants, RLS policies and optional migration history without selecting
user records. Its BEGIN READ ONLY / ROLLBACK wrappers are intentional.
REST cache absence still does not establish that migration 128 was not applied.

**VERIFICATION EN PRODUCTION: NON EFFECTUEE.** Local checks are not deployment
evidence, and the open SQL diagnosis prevents claiming the entire environment
validated. No commit, push, PR, merge, deployment or remote mutation occurred.
Existing SEO work, financial production modules, migrations and sentinel files
were preserved.

## Final cumulative review and publication package (2026-09-23)

### Scope and findings

Reviewed against `872c7d82aed276eff6fcf4e4ac2b9d4b5835d828`, including the
task-related untracked files. HEAD remains at that baseline. The publication
inventory below contains 81 files (72 tracked modifications and nine new files).
No dependency/lockfile, migration, production payment, refund, transfer,
subscription, guarantee, checkout or auth implementation is changed.

- SEO production: remove function-bearing discipline registry objects from RSC
  props, perform map projection on the server, match actual canonical disciplines
  and aliases, and distinguish declared local supply from online/distant alternatives.
  Course/city robots and sitemap share the same local-offer predicate. City hubs
  intentionally retain their broader discovery behavior; their counts are not
  equivalent to supported course/city pairs.
- Valid empty course/city pages remain 200/noindex/follow; unknown registry values
  remain 404. Registry-bounded historical redirects are 308 and preserve queries.
  Data failures propagate except the explicit missing optional zones-view fallback.
  No profile indexability gate or marketplace ranking algorithm was changed.
- Financial tests retain rejection cases. Fixture additions do not alter payment
  calculations: failed fulfillment, refund evidence, failed transfer and admin review
  remain adverse. Guarantee transports use SDK-generated requests, check projections
  and filters, and never open a network connection. They are targeted transport
  doubles, not a general PostgreSQL emulator or a live endpoint/RLS integration test.
- Test repairs use discriminator checks, correct fixture fields, equivalent
  multiline regexes and the exact JSX subtree instead of unrelated sibling text.
  No broad formatting rewrite or compiler/lint suppression was introduced.
  Git reports LF/CRLF normalization warnings, not whole-file content replacement.
- Scope policies retain their restrictions and now have explicit base/head CLI
  execution plus permanent positive/negative policy tests. Launch-critical adds
  these tests without removing its prior commands. This is not a claim that an
  intro-only scope check should pass this broader SEO diff.
- RLS source checks now inspect ordered explicit activation/deactivation statements,
  retaining hardening-file checks and adding negative scanner cases. This lexical
  regression test is not evidence of deployed PostgreSQL policies.
- Mechanical diagnostics changes are three JSX apostrophe entities and a local
  variable rename. No Stripe API, readiness predicate or displayed copy changed.
- Concrete final-review repair: the privacy test harness restored browser properties
  but leaked its fetch mock and monitoring environment. It now restores fetch and
  both original environment values in cleanup, including a simulated failure test.
  The final missing-key test also restores its original value in finally.
  Production analytics code is untouched.
- Other historical offer tests reset flags inside their own CLI process rather than
  uniformly snapshotting all environment variables per case. Their existing commands
  execute separate tsx processes; this review does not claim they are safe to combine
  into a concurrent shared-process runner. Existing mocks remain injected; no live
  financial operations were introduced. That test-runner migration is outside scope.

### Evidence and validation chronology

The prior closure logs remain applicable to unchanged SEO/financial code. File
timestamps inspected during this step show the newest prior code edit at
2026-09-23 12:37:12 UTC, before the completed final validation logs (through
12:48:33 UTC). This is timestamp evidence, not a historical content-hash attestation.
This review changes only this report and the privacy test. Earlier offer and
targeted financial results remain explicitly prior results, not fresh executions.

Current-step executions and final results are recorded below after completion.
Local production-build checks are not live production verification. The earlier
112-total / three-course-city snapshot remains historical, not a fixed expected count.
The retained snapshot URLs are /cours/francais/saint-georges,
/cours/espagnol/saint-georges and /cours/mathematiques/varennes, with their earlier
documented primary/secondary discipline and normalized city evidence.

### SQL diagnosis and operational limitation

NOT EXECUTED. Rechecked public configured host and linked project:
jwlbwmxoradmbuvqfkhe.supabase.co / jwlbwmxoradmbuvqfkhe. No SQL connector,
configured SQL URL or database password is available. No credentials requested,
catalog query executed, migration applied, schema cache reload or remote mutation.

The prior read-only catalog/privilege SQL remains ready for the project SQL editor.
A REST cache error or missing migration-history row cannot prove migration 128
unapplied. If the public zones view is missing (42P01/PGRST205), the tested legacy
city fallback permits exact-discipline physical supply in the normalized teacher
city. It cannot prove additional service-zone/travel-radius coverage; zone-only
supply can remain underrepresented. Permission and other database errors must
propagate, not silently trigger that fallback. This is an outstanding environment
diagnosis and release-verification dependency, not a confirmed new code regression.

### Exact publication inventory

Only these task-related paths are proposed; stage explicitly, never git add .:

```text
app/(app)/admin/stripe-diagnostics/page.tsx
app/cours/[disciplineSlug]/[citySlug]/page.tsx
app/sitemap.ts
app/tuteurs-prive/[citySlug]/page.tsx
app/tuteurs/[citySlug]/page.tsx
components/seo/LocalTeacherDiscoveryMap.tsx
components/seo/LocalTeacherDiscoveryView.tsx
lib/seo/localTeacherDiscoveryPages.ts
lib/seo/sitemap.ts
next.config.ts
package.json
tests/admin/stripeConnectDiagnostics.test.ts
tests/ambassadors/ambassadorReferralTracking.test.ts
tests/guarantee/firstLessonClaim.test.ts
tests/guarantee/firstLessonEligibility.test.ts
tests/marketing/membreProCommissionModel.test.ts
tests/marketplace/integratedMarketplaceQa.test.ts
tests/offers/bookingOfferSelection.test.ts
tests/offers/bookingOfferSnapshots.test.ts
tests/offers/plannedPackageAdminOps.test.ts
tests/offers/plannedPackageE2eLifecycle.test.ts
tests/offers/plannedPackageFulfillment.test.ts
tests/offers/plannedPackageLaunchActivation.test.ts
tests/offers/plannedPackageLaunchMonitoring.test.ts
tests/offers/plannedPackageManualRefund.test.ts
tests/offers/plannedPackageManualTransfer.test.ts
tests/offers/plannedPackagePayoutEligibility.test.ts
tests/offers/plannedPackagePublicLaunchGate.test.ts
tests/offers/plannedPackageStripeCheckout.test.ts
tests/offers/plannedPackageTransferReversal.test.ts
tests/offers/teacherOfferCancellationPreferences.test.ts
tests/offers/teacherOffersApi.test.ts
tests/offers/teacherOffersMobilePublishPolish.test.ts
tests/privacy/cookieConsent.test.ts
tests/schedule/dateExceptions.test.ts
tests/schedule/preciseScheduleBookingEnforcement.test.ts
tests/schedule/preciseScheduleBookingSource.test.ts
tests/schedule/weeklyIntervals.test.ts
tests/security/rateLimitProduction.test.ts
tests/security/rlsCoverage.test.ts
tests/security/searchAnalyticsRateLimit.test.ts
tests/seo/groupSessionsLaunchSeo.test.ts
tests/seo/jsonLdSerialization.test.ts
tests/seo/lifestyleSubjectSeo.test.ts
tests/seo/localTeacherDiscovery.test.ts
tests/seo/marketArchitecture.test.ts
tests/seo/prelaunchSeoIndexation.test.ts
tests/seo/seoFoundation.test.ts
tests/teacherSearch/teacherMultiZoneSearch.test.ts
tests/teacherSearch/teacherSearchVisibilityDiagnostics.test.ts
tests/teacherZones/teacherTeachingZonesFallback.test.ts
tests/teachers/availabilityStartDate.test.ts
tests/teachers/premiumTeacherCardHierarchy.test.ts
tests/teachers/teacherProfileTeachingModeChips.test.ts
tests/yo/yopratiqoBookingModalProgressDetection.test.ts
tests/yo/yopratiqoDominicanFlashcardsPrintables.test.ts
tests/yo/yopratiqoDominicanModule4.test.ts
tests/yo/yopratiqoDominicanModule5.test.ts
tests/yo/yopratiqoDominicanPedagogicalQuality.test.ts
tests/yo/yopratiqoEnglishIntro.test.ts
tests/yo/yopratiqoFrQuebecLesson2.test.ts
tests/yo/yopratiqoFrQuebecModuleEntrypoints.test.ts
tests/yo/yopratiqoFrQuebecPremiumAudio.test.ts
tests/yo/yopratiqoFrQuebecPremiumShell.test.ts
tests/yo/yopratiqoIndexation.test.ts
tests/yo/yopratiqoIntroLessonDeck.test.ts
tests/yo/yopratiqoItalianIntro.test.ts
tests/yo/yopratiqoJapaneseAudio.test.ts
tests/yo/yopratiqoJapaneseIntro.test.ts
tests/yo/yopratiqoLanguageSelection.test.ts
tests/yo/yopratiqoProductFoundation.test.ts
tests/yo/yopratiqoSeoMetadata.test.ts
docs/SEO_LOCAL_INDEXATION_HARDENING.md
lib/seo/localDiscoveryRedirects.ts
scripts/audit_local_discovery_indexation.ts
scripts/check_yo_task_scope.ts
tests/seo/emptySupplySitemap.ts
tests/seo/localDiscoveryHardening.test.ts
tests/seo/localDiscoveryRuntime.test.ts
tests/yo/yoTaskScope.test.ts
tests/yo/yoTaskScope.ts
```

Excluded and preserved: `docs/LAUNCH_READINESS_ANALYSIS.md`,
`pratiqo-legal-export-20260528-2221.zip`, and `Untitled` if present.
No other unrelated tracked changes were identified in this cumulative diff.
Recheck status immediately before any future authorized staging.

### Proposed commits (not executed)

1. `fix(seo): harden local discovery rendering and indexation`
   SEO app/components/lib/config files, audit script, local SEO tests and
   emptySupplySitemap helper with its dependent test imports.
2. `test: repair typed fixtures and isolate validation harnesses`
   Remaining authorized test/fixture repairs, privacy restoration, RLS scanner
   tests and mechanical admin diagnostics page/test fixes. No business changes.
3. `test(yo): separate explicit task scope from functional contracts`
   Scope helper, CLI, policy tests, the two affected Yo contracts and package scripts.
4. `docs(seo): record final validation and publication checklist`
   This report. Ensure each selected hunk lands with its required helper/import;
   validate the cumulative branch before publishing.

### English PR draft

**Title:** fix(seo): harden local discovery rendering and indexation

**Summary**
Fix local discovery server-render failures caused by passing a function-bearing
discipline configuration across the server/client boundary. Require actual subject
matching and local supply for course/city indexation, while keeping valid empty
pages accessible with noindex/follow. Preserve invalid-route 404s, permanent
historical redirects and their query parameters. Propagate data failures instead
of publishing a successful but misleading empty sitemap.

**Validation and test repairs**
Include deterministic sitemap fixtures, eligibility/serialization/redirect/error
contracts, documented TypeScript fixture repairs and explicit task-scope checks.
Financial production code is unchanged. Record the final command results below;
lint warnings are disclosed, not suppressed.

**Environment limitation**
Teaching-zone catalog/privilege diagnosis is still outstanding. Missing optional
zones views use the tested legacy-city fallback; extended travel coverage cannot
be claimed until the deployed objects are verified. Snapshot counts are evidence
for that dataset only. No migration or remote change is included.

**Review / rollout**
Review SEO production changes separately from broader authorized test repairs.
Run the preview checklist below before merge/deployment approval.
No public-launch or production verification claim is made.

### Preview checklist and rollback

- On the preview's current data, verify every supported course/city page is 200,
  has one canonical, index/follow and a matching sitemap entry; inspect map loading.
- Verify a known valid empty course/city page is 200/noindex/follow and absent from
  sitemap; do not assume a historical empty city still has no teachers.
- Unknown city/discipline and legacy unknown slugs must be HTTP 404, including
  browser and Googlebot requests.
- Supported /fr|en|es/cours and /tuteurs-prive variants must return 308 directly
  to the documented canonical destination, preserving query values.
- Check sitemap and robots on preview without assuming preview host is canonical:
  emitted production canonical URLs remain https://www.pratiqo.ca.
- Confirm no private URLs, redirect aliases or false modification dates in sitemap.
- Verify SQL catalogs/privileges read-only in the confirmed project, then repeat
  live production smoke tests after a separately authorized deployment.
- Rollback is code-only: prefer a reviewed forward fix; otherwise revert the
  specific SEO production commit and its dependent contracts in a new PR.
  Reverting SEO restores the known prior rendering/indexation defects, so it is
  not a launch-safe substitute. Keep independent test repairs where compatible.
  No database rollback or migration-history repair is needed for this branch.

No commit, push, PR, merge, deployment or remote mutation was performed.

### Final-review execution results

- `npx tsx tests/privacy/cookieConsent.test.ts`: PASS, 19 tests; rerun after
  the final missing-key restoration edit, including failure-path cleanup.
- `npx tsx tests/seo/localDiscoveryHardening.test.ts`: PASS, 13 tests.
- `npx tsc --noEmit --incremental false`: PASS, exit 0.
- `npm run lint`: PASS, exit 0, zero errors and 232 warnings.
- `npx eslint tests/privacy/cookieConsent.test.ts`: PASS on the final test file.
- `npm run validate:launch`: PASS, exit 0; auth, security, payments,
  launch-critical, currency, payment safety, i18n (3502 keys/locale) and build.
  Its run began before the final tiny missing-key cleanup edit; the complete
  privacy suite and focused lint were rerun afterward, and build typechecking
  completed afterward. No production source changed during the run.
- `git diff --check`: PASS. Read-only restricted-path diff inspection is empty
  for supabase, lib/payments, lib/offers, lib/guarantee, app/api and package-lock.

Logs: TEMP `seo-final-review-validate.log`, `seo-final-review-types.log`,
`seo-final-review-lint.log`, `seo-final-review-local.log`. Previous targeted
financial and test:offers results remain prior passing results, not rerun claims.
No live HTTP/SQL diagnosis was executed in this review. The earlier local HTTP
contracts are documented historical checks; the current focused tests reconfirm
eligibility, serialization, redirect and failure-propagation contracts.

Final 80-file code/test inventory fingerprint (excluding this report and sentinels):
`97790840cdd884b14a84e193205fa554ff67a549b60696406eb856d17222cc21`.
Method: sort the task-related tracked/untracked paths; SHA-256 update with each
UTF-8 path plus NUL, followed by its exact file bytes. This records this final
tree only, not a retroactive fingerprint of prior validation runs.

Verdict: READY FOR COMMIT/PUSH/PR AUTHORIZATION, not merge/public-launch approval.
No confirmed code regression remains. The SQL environment diagnosis is unresolved;
preview and live-production verification remain unperformed. Existing lint and
Turbopack warnings are disclosed nonblocking limitations. Only the privacy test
and this report were edited in this final-review step.

## Publication authorization and migration 128 review (2026-09-23)

This section supersedes the earlier no-publication instruction only for commits,
branch push and PR creation. Merge, auto-merge, production promotion, migrations,
history repair and remote database/permission changes remain unauthorized.

### New SQL evidence supplied by the user

The user reports SQL-editor catalog results: teacher_teaching_zones table=false,
teacher_teaching_zones_public view=false, list_public_teacher_teaching_zones()
function=false. These establish absence of those exact objects in the queried
database. They are user-supplied results, not queries executed by this agent.
Expected project remains jwlbwmxoradmbuvqfkhe; confirm that project in the SQL-editor
project selector before the next checks. Local linked/configured project matched it.
schema_migrations exists, but the version=128 query was reported only as success,
without result rows. Migration-history status therefore remains unconfirmed.
Reloading the REST schema cache cannot create absent database objects.

SEO does not require migration 128 to operate: missing-view errors use normalized
declared legacy city and actual discipline matching for physical supply. Teachers
serving extra cities cannot receive zone-based coverage until valid zones exist.
Other errors (including permission denial) are propagated, not reported as no supply.

### Migration review: do not apply yet

Reviewed existing, unchanged supabase/migrations/128_teacher_teaching_zones.sql.
Prerequisites: public.teachers with text PK id, user_id usable with auth.uid(),
city/region/country_code text, location JSON supporting -> / ->>, integer
home_lesson_radius_km; public.teachers_public.id text; auth.uid(); gen_random_uuid();
anon/authenticated/service_role roles. security_invoker views require PostgreSQL
15+. UUID generation must resolve; this migration does not install extensions and
does not use PostGIS. Migration 127 supplies the latest discovery/opt-out view;
128 consumes it without rebuilding it. Inspect deployed definitions, not filenames
alone, to establish prerequisites. No migration in this PR is added or changed.

Effects: creates the table, indexes, four functions, triggers, four own-row policies
and public view. CREATE OR REPLACE/DROP statements replace objects of those names
if already present. The trailing INSERT backfills ONE primary active zone for each
teacher with a nonempty legacy city and no existing zones. It does not update
teachers, but it DOES create zone records; it does not populate additional cities.
Replacement RPC later deletes/reinserts a teacher's zones, changing their UUIDs.

RLS: own SELECT/INSERT/UPDATE/DELETE is granted to authenticated and checked through
teachers.user_id=auth.uid(); service_role has ALL and normally bypasses RLS. RLS is
enabled, not forced. No anon row policy exists. REVOKE FROM PUBLIC does not revoke
any role-specific default grants: inspect actual ACL/default privileges. Public view
has security_invoker=true but calls a SECURITY DEFINER function, so its safety rests
on that function's active-zone and teachers_public membership filter, not own-row RLS.
The public function is STABLE with search_path=public, PUBLIC execution revoked and
anon/authenticated/service_role execution granted. Replacement RPC also has explicit
search_path=public and only service_role execution after PUBLIC revoke. Neither
function explicitly sets its owner: they inherit the applying role. Verify a trusted
owner and that untrusted roles cannot CREATE in public. Trigger helpers are invoker
functions; they are not explicitly execution-revoked but return trigger, not a usable
general-purpose data RPC.

Public projection exposes zone IDs, teacher ID, public label/city/region/country,
lat/lng, radius, kind, primary/order, public availability note, physical formats
and timestamps. It never selects location.private or an address column. However,
public naming alone does NOT enforce approximate coordinates or non-address text.

Confirmed rollout defects / risks requiring a separate authorized correction:

1. Backfill lines 347-348 prefer location.public then legacy root lat/lng over
   fuzzed_lat/fuzzed_lng. Current location verification fuzzes root/public values,
   but legacy provenance is not proven by SQL. API PUT accepts arbitrary valid
   coordinates and label/note text. Do not claim exact-location privacy guaranteed.
   Proposed separate correction: use verified coarse/public coordinates only,
   leave uncertain coordinates null, and enforce the chosen public-coordinate
   precision/write contract without retrieving private addresses for this audit.
2. Backfill sets supports_at_student_place=true for every city-bearing teacher,
   without consulting teaching_mode/home_lesson_enabled. This can invent travel
   eligibility for physical studio-only profiles once zones are consumed by SEO.
   Proposed correction: preserve actual declared physical modalities; never infer
   travel solely from city or default radius. Online-only mode remains excluded
   by this branch's SEO predicate, but mixed/studio-only profiles need protection.
3. Count-based active-zone trigger has no per-teacher lock. Concurrent own-row
   inserts or replacement calls can exceed three active zones or race. Proposed
   correction: serialize writes by teacher in both paths and test concurrency.
4. Replacement RPC inserts literal true for is_active, ignoring the normalized
   API is_active field. Inactive submitted zones can become publicly active.
   Proposed correction: preserve/reject inactive entries consistently and test.
5. Backfill casts arbitrary legacy coordinates and inherits length/country/pair
   constraints. Malformed legacy values can abort application. Empty non-null
   city suppresses the alternate JSON city because COALESCE precedes NULLIF.
   Preflight aggregates and explicit normalization are needed; no silent coercion
   of unknown data into public claims. No remote records were read in this review.

Database rollout readiness: HOLD pending the separate correction/review and
read-only preflight. Code PR readiness is separate and uses the tested fallback.

### Read-only preflight (project jwlbwmxoradmbuvqfkhe)

```sql
BEGIN READ ONLY;
SELECT current_database(), current_user, current_setting('server_version_num');
SELECT to_regclass('public.teachers'), to_regclass('public.teachers_public'),
       to_regprocedure('auth.uid()'), to_regprocedure('gen_random_uuid()');
SELECT table_name,column_name,data_type,udt_name
FROM information_schema.columns
WHERE table_schema='public' AND table_name IN ('teachers','teachers_public')
AND column_name IN ('id','user_id','city','region','country_code','location',
                    'home_lesson_radius_km','home_lesson_enabled','teaching_mode');
SELECT conname,pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid=to_regclass('public.teachers') AND contype='p';
SELECT rolname,rolbypassrls,
       has_schema_privilege(oid,'public','CREATE') AS public_create
FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role',current_user);
SELECT extname,extversion FROM pg_extension;
SELECT defaclrole::regrole,defaclnamespace::regnamespace,defaclobjtype,defaclacl
FROM pg_default_acl;
SELECT version FROM supabase_migrations.schema_migrations WHERE version='128';
ROLLBACK;
```

After these prerequisites are established, a separately approved aggregate-only
legacy-data preflight should count invalid/coarse-coordinate provenance, constraint
violations and modality distributions; never dump teacher rows or private locations.

### Proposed application and verification (not executed)

Do not run blanket supabase db push. Pin and review the exact
supabase/migrations/128_teacher_teaching_zones.sql plus the separately authorized
corrective rollout script before any write. Current 128 alone is NOT recommended.
Use an explicitly scoped SQL-editor transaction on the confirmed project, executing
only the reviewed statements. A transaction must include the validated correction
before COMMIT, so unsafe backfilled modalities/coordinates are never exposed in
between. Keep a backup and record the exact SQL/hash and execution outcome.
Do not silently fabricate a CLI migration-history entry after manual execution;
history reconciliation needs its own reviewed authorization.

After authorized application, run the read-only catalog/privilege queries already
included above in this report, plus:

```sql
BEGIN READ ONLY;
SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity,c.reloptions,c.relacl,
       pg_get_userbyid(c.relowner) AS owner
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN
 ('teacher_teaching_zones','teacher_teaching_zones_public');
SELECT p.proname,pg_get_function_identity_arguments(p.oid),p.prosecdef,
       p.proconfig,p.proacl,pg_get_userbyid(p.proowner) AS owner
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN
 ('list_public_teacher_teaching_zones','replace_teacher_teaching_zones',
  'enforce_teacher_teaching_zones_limit','touch_teacher_teaching_zone_updated_at');
SELECT column_name FROM information_schema.columns WHERE table_schema='public'
AND table_name='teacher_teaching_zones_public' ORDER BY ordinal_position;
SELECT count(*) AS public_zone_count FROM public.teacher_teaching_zones_public;
SELECT count(*) AS over_limit_teachers FROM
 (SELECT teacher_id FROM public.teacher_teaching_zones WHERE is_active
  GROUP BY teacher_id HAVING count(*)>3) q;
ROLLBACK;
```

Check own-row RLS/grants and anon-safe projection under representative roles in
an authorized staging environment; no test writes to production. Verify public
view rows are active and refer only to teachers_public. Check anonymized aggregate
modality/coordinate quality before enabling zone-dependent claims. Additional-city
coverage appears only when actual valid additional zone records are present.

Recovery: rollback the transaction if checks fail before COMMIT. After rollout,
preserve/export newly entered zone data securely; do not DROP the table or rerun
destructive replacement blindly. Prefer a reviewed forward migration. A code
rollback to the legacy-city fallback can contain exposure while records are
retained. Any permissions/view change or data repair requires separate approval.

### Publication status

Remote verified: marcandretheberge-dotcom/Pratiqo, default base main. Fetch confirms
origin/main remains 872c7d82aed276eff6fcf4e4ac2b9d4b5835d828, identical to reviewed
baseline. No rebase or history rewrite is needed. Publication and exact-HEAD CI /
preview evidence will be recorded after pushing; no remote result is assumed.

### Published PR and preview evidence

PR: https://github.com/marcandretheberge-dotcom/Pratiqo/pull/399 (base main).
Publication commits: 6935cf0b (SEO), 28af0925 (fixtures), 8b862c1f (scope),
b98f274c68ddee5907d19967a2906a97a60a2ac8 (review/rollout documentation).
No force-push. Index inspected before each commit; only the reviewed 81 paths
were committed. Two existing sentinel files remain untracked and unchanged.

GitHub checks on b98f274c68ddee5907d19967a2906a97a60a2ac8: Vercel SUCCESS,
Vercel Preview Comments SUCCESS, Cursor Approval Agent SUCCESS. GitHub reported
mergeable=true. Required branch-check configuration could not be inspected:
branch protection/ruleset API returned HTTP 403. Therefore these are observed
checks, not a claim to have enumerated required protection rules. No PR test
workflow exists in the checked-in workflows; local suites are not GitHub CI runs.

Preview host (all requests below, redirect=manual):
pratiqo-git-fix-seo-l-ee7e2c-marcandretheberge-dotcoms-projects.vercel.app
Vercel deployment associated by the exact commit status:
https://vercel.com/marcandretheberge-dotcoms-projects/pratiqo/3hDZX2tGrt8vzx6qgcuzv6reYMNb

`SEO_TEST_BASE_URL=<preview> npx tsx tests/seo/localDiscoveryRuntime.test.ts`
PASS, exit 0. Runtime results:

| Paths | HTTP / HTML robots |
|---|---|
| /cours/francais/saint-georges; /cours/espagnol/saint-georges; /cours/mathematiques/varennes | 200, index/follow, present in sitemap |
| /cours/espagnol/la-pocatiere; /cours/francisation/riviere-du-loup; /cours/francais/beauceville; /cours/anglais/trois-rivieres; /cours/francais/beloeil | 200, noindex/follow, absent from sitemap |
| /tuteurs/saint-georges | 200, index/follow |
| /cours/unknown/saint-georges; /cours/francais/unknown; /tuteurs/unknown; /tuteurs-prive/unknown | 404 with Googlebot and browser user agents |
| /fr/cours/francais/saint-georges?utm_source=regression | 308 to https://www.pratiqo.ca/cours/francais/saint-georges?utm_source=regression |
| /tuteurs-prive/saint-georges?utm_source=regression | 308 to https://www.pratiqo.ca/tuteurs/saint-georges?utm_source=regression |
| /sitemap.xml; /robots.txt | 200, application/xml and text/plain respectively |

Every tested page had one correct production canonical, title, description and H1;
the runtime test found no RSC error template. Sitemap observed 112 total / three
course-city URLs on this preview snapshot, not a permanent expected total. Private
and legacy URLs were excluded. robots.txt referenced the canonical sitemap.
Independent manual-redirect GET checks confirmed X-Robots-Tag: noindex on both
supported/empty sample pages and sitemap/robots: preview-wide protection remains
intact despite route-level HTML index/follow where applicable. Redirect destinations
were inspected only, never followed into production. An initial 200 Vercel
'Deployment is building' HTML placeholder was NOT counted as a passing sitemap;
checks ran again after Vercel success and verified actual XML.

Post-commit `npm run test:launch-critical` PASS, exit 0. Logs are local TEMP
seo-publication-launch.log and seo-publication-preview.log. `git diff origin/main
--check` PASS. Production code fingerprint still matches the reviewed tree;
publication only added documentation. This evidence-recording commit is a subsequent
docs-only HEAD; its exact CI/preview status must be checked separately and recorded
in the PR description/final response rather than falsely reusing a prior status.

Remaining: separate database correction/preflight/rollout authorization, inability
to inspect required-check configuration, and live production verification after an
authorized merge/deployment. No merge/auto-merge, production deployment/promotion,
migration, history repair, or remote database/data/permission change was performed.
