# Local SEO P0 review

Updated: 2026-10-13. The historical audits below describe successive snapshots, not the current implementation. The final correction/validation section supersedes their CTA, timezone, specialty and readiness conclusions. Outstanding teacher payment setup is an operational action, not a blocker to indexing legitimate public profiles.

**Final verdict: READY TO MERGE for this scoped correction, subject to normal human review.** Automated checks and production-build HTTP QA pass. Mobile/desktop interactive visual QA remains manual because the browser tool timed out twice. This is not a deployment, a full booking/payment certification or a claim that all five teachers are payable.

## Isolation

- Branch: `feat/local-seo-p0`.
- Worktree: `C:/Users/Utilisateur/Documents/Codex/2026-05-13/analyse-my-project-from-a-critical/local-seo-p0`.
- Base: `origin/main`, `d79bcae1bd84fbe93f3eae1f6e022158ddce91fc` (PR #401).
- Original `C:/Users/Utilisateur/pratiqo`, branch `fix/learner-funnel-truthful-p0`, remains unchanged: 13 tracked modified files, 205 additions / 115 deletions, plus its existing untracked files.
- No commit, stash, reset, push, PR, merge, deployment, migration or production-data write. Existing local environment was loaded in memory for read-only queries; no secrets copied into this worktree or output.

## Inventory: expected five, observed two reservable

At 17:30-17:32 UTC, the authoritative database and production `/api/teachers/plans` agreed: **51 discoverable teachers, 2 reservable, 0 unknown readiness values**. There are **5 public/indexable profiles**, a different population from currently reservable teachers. Five was never hardcoded into application logic. A fixture exercises five eligible calendars plus one unavailable public profile.

Evaluation uses unmodified `getTeacherListingBookability`: existing publication/payment eligibility, valid rate, duration, future slots within its 28-day horizon, timezone, minimum notice, exceptions, blocks, bookings and holds. Public SEO eligibility independently uses `isTeacherPublicProfileIndexable` including publication/consent/admin marker and active-owner state. This is not a guarantee that a slot remains available when booked; final booking validation remains authoritative.

| Public profile path | Subject / locality | Format | Reservable | Indexable / sitemap |
| --- | --- | --- | --- | --- |
| `/professeurs/francis-a-guitare-saint-georges` | Guitare / Saint-Georges | both | yes | yes / yes |
| `/professeurs/camila-h-chant-populaire-saint-henri` | chant populaire / Saint-Henri | both | yes | yes / yes |
| `/professeurs/eloise-d-cours-saint-georges` | French / Saint-Georges | existing public formats | no | yes / yes |
| `/professeurs/el-p-espagnol-saint-georges` | Spanish / Saint-Georges | existing public formats | no | yes / yes |
| `/professeurs/maeva-d-francais-varennes` | Academic tutoring / Varennes | existing public formats | no | yes / yes |

The final read-only recheck at 17:53:55 UTC confirmed the same cohort. Francis's public rate is 45 CAD and Camila's is 70 CAD, directly from `teachers_public.price_per_lesson`; existing rate/duration display conventions are unchanged.

No private addresses, contact details or payment-account diagnostics are included. Public rates and formats continue to use existing teacher data and display helpers. No prices, photos, identity states, specialties or biographies were edited. Founder/admin must reconcile the expected five with the two calendars actually eligible at this snapshot. Do not mark the other three reservable to satisfy the expected count.

## Baseline and production-build evidence

Baseline: public `https://www.pratiqo.ca` observed before edits on 2026-10-12, compared with isolated `next build` / `next start` on `http://127.0.0.1:3190`. Public deployment SHA is not independently established. Inventory is live, not a frozen historical database export; counts are dated observations, not guaranteed future inventory.

`scripts/audit_local_seo_p0.ts` records status, robots, canonical, title, description, H1, hreflang, JSON-LD types, profile links, sitemap inclusion and optional read-only supply evaluation. `evaluated*` counts refer to the checked-out code, not necessarily the version serving a remote URL. See accompanying JSONL evidence for full strings rather than truncating metadata into this table.

| Route | Baseline | Isolated build | Local / online alternatives after | Sitemap before -> after |
| --- | --- | --- | --- | --- |
| `/` | 200, French metadata / English default H1 | 200, locale-aligned metadata/H1 | n/a | yes -> yes |
| all five `/professeurs/...` above | 200 index/follow; duplicate brand suffix in title | 200 index/follow, one H1, brand once | profile, not listing | yes -> yes |
| `/tuteurs/saint-georges` | 200 index/follow, two listed profiles | 200 index/follow | 3 / 0 | yes -> yes |
| `/tuteurs/levis` | 200 index/follow despite no local supply | 200 noindex/follow | 0 / 5 | yes -> no |
| `/tuteurs/quebec` | 200 index/follow despite no local supply | 200 noindex/follow | 0 / 5 | yes -> no |
| `/cours/francais/saint-georges` | 200 index/follow; unsupported generic FAQ | 200 index/follow, truthful local FAQ | 1 / 0 | yes -> yes |
| `/cours/francais/beloeil` | 200 noindex/follow | 200 noindex/follow | 0 / 1 | no -> no |
| `/cours/unknown/unknown` | 404 noindex | 404 noindex | n/a | no -> no |
| `/sitemap.xml` | 200, 112 URLs | 200, 65 URLs | n/a | n/a |
| `/robots.txt` | 200 | 200 | n/a | n/a |

All valid sampled pages retain self-canonical `https://www.pratiqo.ca` URLs without arbitrary query parameters. Invalid routes have no normal page H1/canonical. Homepage has default indexability, not an explicit robots meta. Profiles/city routes have explicit robots metadata. Sitemap and robots are not HTML pages, so title/H1/HTML schema are not applicable.

SSR tests fetch without executing JavaScript. All five public profiles in FR/EN/ES expose name, single H1, biography outside RSC scripts, ProfilePage/Person data and request-language profile labels. Teacher-authored biographies and free-form specialties are intentionally not auto-translated. Public profile headings, format labels and metadata use existing locale helpers; initial SSR locale now reaches the existing client profile without altering post-hydration locale selection.

Existing local city pages are French editorial routes with `lang="fr"`; guide labels now agree. No fake EN/ES route variants were created. The application uses cookie locales on the same profile/home URL, not three independently addressable equivalents, so no hreflang alternates are invented. A separate localized-URL strategy would be a future product/SEO decision.

## Root causes and corrections

1. Local discovery implicitly joined `profiles!inner` through the wrong relationship. Read-only evidence returned three joined rows, all with profile ID different from `teachers.user_id`. Fetching owners explicitly by `user_id` restores correct consent/publication evaluation and includes Francis and Camila. Owner-query errors propagate, rather than becoming empty supply.
2. City hubs indexed fallback cards even with zero local supply. Both city hubs and discipline-city pages now require real local public supply. Counts use the entire eligible pool, not the nine-card rendering limit. Online-only/other-city results are explicitly separate.
3. Generic discipline FAQs contained Montreal-specific questions, unsupported price ranges and DALF claims. Local pages now use neutral local questions and remove those FAQ strings from serialized props too. A legacy blank discipline marker uses the teacher's real additional discipline instead of publishing `Professeur de —`.
4. Profile title inheritance duplicated the brand. Absolute per-page titles fix it. Online-only metadata no longer implies an in-person offer in the teacher's city; missing formats do not invent flexible hours or online/in-person options. Legacy academic group labels receive grammatical French metadata wording.
5. Homepage metadata did not use the same language as SSR content. Request-localized metadata now shares the existing heading translations. The old test requiring only a static metadata export was updated to require localized metadata, absolute title and the canonical contract; runtime assertions verify rendered output.
6. Local cards retain price precision and public display-name conventions. No full raw-name or fictional ratings added to schema. The sitemap profile projection now includes discovery opt-out; profile query errors no longer silently become missing pages.
7. Broken broad-subject links now target a real subject landing page or existing subject search. A short, supply-gated city navigation replaces the huge city footer on local pages and appears on the discovery page. No new city routes or page mass-generation.

## Matching, index policy and sitemap accounting

Existing exact canonical discipline matching and `teacherHasLocalDiscoverySupply` are preserved. A broad language category is not French/Spanish/English. Online-only does not qualify as local. Existing normalized city and declared teaching-zone rules remain authoritative; no radius or readiness rule was invented. Existing proximity alternatives are not counted as local supply.

Public-profile indexability is not tied to a currently open appointment. Legitimate public profiles remain indexable when temporarily full. Private, unpublished, opted-out or invalid profiles remain excluded. Valid empty local pages are 200/noindex/follow and absent from sitemap. Invalid city/subject routes are 404. Existing simulated data-failure tests assert errors propagate rather than masquerade as empty results.

| Sitemap group | Baseline | After | Delta |
| --- | ---: | ---: | ---: |
| City hubs | 51 | 2 | -49 |
| Discipline/city | 3 | 5 | +2 |
| Public teacher profiles | 5 | 5 | 0 |
| Other canonical URLs | 53 | 53 | 0 |
| Total | 112 | 65 | -47 |

Retained hubs: Saint-Georges and Varennes. Course URLs: French, Spanish, guitar and music in Saint-Georges; mathematics in Varennes. The two additions restore actual guitar/music supply after the owner-join fix. Removed city hubs had only alternatives, not eligible local supply. No attempt was made to restore a historical URL target. Saint-Henri is not in the existing city registry; Camila's public profile remains indexable and may be an online alternative, without inventing local supply in Levis.

Existing lastmod remains real publication/content-derived data; no request-time freshness added. Existing private-route robots exclusions, sitemap limits, canonical host and legacy redirects are preserved. Runtime checks confirm direct 308 legacy redirects with retained query parameters and 404 for invalid legacy cities.

## Structured data and links

- Profiles: existing ProfilePage, Person and BreadcrumbList; broad public locality only where applicable, no exact address, new ratings, Review or employment claims.
- Listings: existing CollectionPage/ItemList/Person, BreadcrumbList and FAQPage consistent with visible cards/questions. List size describes displayed items, not open appointments.
- Home: existing Organization/WebSite retained; no AI-specific schema or llms.txt.
- Discovery -> supply-backed city hubs -> represented discipline/city pages -> public profiles. Existing profile/resource links retained; broken generic subject breadcrumb targets corrected. Links are in SSR HTML.

## Changed files

| File | Purpose |
| --- | --- |
| `app/page.tsx` | Locale-aligned homepage metadata and language wrapper |
| `app/(marketing)/trouver-un-prof/page.tsx` | Truthful discovery copy, real search destinations, supply-backed city links |
| `app/professeurs/[slug]/page.tsx` | Absolute metadata title, propagate query errors, SSR locale |
| `app/teacher/profile/[id]/TeacherProfileClient.tsx` | Pass optional SSR locale only; booking callbacks unchanged |
| `components/TeacherProfile.tsx` | Request-language labels during SSR/hydration, then existing locale context |
| `components/seo/LocalTeacherDiscoveryCards.tsx` | Format/currency precision and honest alternative label |
| `components/seo/LocalTeacherDiscoveryView.tsx` | Real counts, separate alternatives, safe local FAQ, language and navigation |
| `components/seo/LocalSupplyCityLinks.tsx` | Small server-rendered inventory-backed city navigation |
| `lib/seo/localTeacherDiscoveryPages.ts` | Owner lookup, truthful local counts/indexability, safe serialized data and links |
| `lib/seo/teacherPublicProfile.ts` | Online-only locality wording |
| `lib/seo/teacherPublicProfileData.ts` | Opt-out projection and propagate data failures |
| `lib/seo/teacherPublicProfileLabels.ts` | Truthful formats/descriptions and localized subject fallback |
| `tests/seo/prelaunchSeoIndexation.test.ts` | Dynamic homepage metadata/canonical contract |
| `tests/seo/teacherSeoPublicationWorkflow.test.ts` | No invented generic formats/flexible-hours copy |
| `tests/seo/localSeoP0.test.ts` | Seven focused data/policy/schema/serialization regressions |
| `tests/seo/localSeoP0Runtime.test.ts` | Production HTML, profile locales, schema/canonical/city checks |
| `scripts/audit_local_seo_p0.ts` | Read-only reproducible public SEO/inventory evidence |
| `docs/LOCAL_SEO_P0_REVIEW.md` | Review evidence, limitations and rollout checklist |
| `docs/LOCAL_SEO_P0_PRODUCTION.jsonl` | Public production baseline, full metadata strings and links |
| `docs/LOCAL_SEO_P0_LOCAL.jsonl` | Final local HTML and read-only authoritative inventory |
| `docs/LOCAL_SEO_P0_RUNTIME.jsonl` | Fifteen profile-locale HTML test results and completion marker |

## Validation

Run in the isolated worktree with Node 24.15.0 / Next 16.2.9 and lockfile-installed dependencies. No package or lockfile change.

| Command | Result |
| --- | --- |
| `npx tsx tests/seo/localSeoP0.test.ts` | PASS, 7 tests |
| `npx tsx tests/seo/localDiscoveryHardening.test.ts` | PASS, 13 tests |
| `npm run test:seo-foundation` | PASS, 15 tests |
| `npm run test:seo-local-discovery` | PASS, 16 tests |
| `npm run test:seo-teacher-resources` | PASS, all three suites |
| `npm run test:seo-lifestyle` | PASS, 10 tests |
| `npx tsx tests/teacherSearch/teacherListingBookability.test.ts` | PASS |
| `npx tsx tests/marketing/trouverUnProfPage.test.ts` | PASS, 18 tests |
| `npm run test:launch-critical` | PASS after homepage contract update |
| `npm run lint` | PASS exit 0, 0 errors / 232 repository warnings; not warning-free |
| `npx tsc --noEmit --incremental false` | PASS |
| `npx tsx scripts/validate_i18n.ts` | PASS, 3505 baseline keys |
| `next build` via environment-loading wrapper below | PASS; existing unsupported forceSwcTransforms warning remains |
| `SEO_TEST_BASE_URL=http://127.0.0.1:3190 npx tsx tests/seo/localSeoP0Runtime.test.ts` | PASS, 15 profile-locale renders plus homepage/city/schema checks |
| `SEO_TEST_BASE_URL=http://127.0.0.1:3190 npx tsx tests/seo/localDiscoveryRuntime.test.ts` | PASS, valid/empty/404/308, sitemap and robots |
| `git diff --check` | PASS |

No formatting script is configured. ESLint and whitespace checks ran; no repository-wide reformat. Full non-launch test inventory was not run. No browser surface/Playwright setup was available in this environment, so interactive JS-enabled visual QA, image loading and CLS are **not** certified. HTML-only checks do not prove Google indexing.

Build command (loads existing environment in memory; does not print values):

```powershell
node -e "require('dotenv').config({path:'C:/Users/Utilisateur/pratiqo/.env.local',quiet:true});const p=require('child_process').spawn(process.execPath,['node_modules/next/dist/bin/next','build'],{stdio:'inherit',env:process.env});p.on('exit',c=>process.exit(c??1));"
```

Read-only inventory command:

```powershell
$env:SEO_TEST_BASE_URL='http://127.0.0.1:3190'
node -r dotenv/config --import tsx scripts/audit_local_seo_p0.ts --inventory dotenv_config_path=C:/Users/Utilisateur/pratiqo/.env.local dotenv_config_quiet=true
```

During development, runtime tests caught generic FAQ claims still serialized to clients; these were removed, not hidden from assertions. A French title wording experiment broke an existing case-sensitive expectation and was narrowed to the actual legacy academic label; affected suites were rerun successfully. Earlier failures are not described as green results.

## Remaining checks and safe rollout

1. Reconcile founder's expected five reservable teachers with authoritative observed two. No private readiness details should be published.
2. Linked environment lacks optional `teacher_teaching_zones_public`; existing safe legacy city fallback is retained. Confirm intended deployed teaching-zone schema before claiming expanded local service coverage. No database migration is part of this diff.
3. Run mobile/desktop browser QA with JS enabled/disabled, test public profile CTA and locale switching, inspect photos/CLS. Existing shared booking/auth logic is untouched.
4. Canonical local editorial routes remain French; arbitrary teacher-authored text remains original. Do not manufacture hreflang to cookie-only variants.
5. Production source caching/live schedules can change counts. Rerun inventory and HTTP evidence against staging after review.

Deployment order after explicit approval: review diff and data discrepancy, staging build/runtime/browser checks, then application deploy. No schema ordering or billing migration. Rollback is reverting only this SEO change on the deployment branch and redeploying the prior application version; no data rollback required. No production operation is authorized/performed here.

Search Console post-deploy checklist: inspect the five public profile URLs and retained local pages; compare rendered HTML, Google-selected canonical, sitemap discovery and indexing state; verify empty pages remain crawlable/noindex; monitor impressions, clicks, queries and city/discipline landing pages with raw counts. Link permitted booking/waitlist conversions only through existing consented analytics. No indexing, ranking or AI-search inclusion is guaranteed.

## Follow-up: what the five booking states actually mean

Read-only SELECT snapshot: `docs/LOCAL_SEO_P0_BOOKING_STATES_READONLY.jsonl`, 2026-10-12 18:17:33 UTC. Cohort comes from the existing public/indexability loader, never a list of hardcoded teacher IDs. The internal IDs below are diagnostic references, not new public content or application constants.

| State | Actual product meaning / reference |
| --- | --- |
| public | Accessible public profile after publication/consent/owner checks; not a calendar assertion. All five. |
| discoverable | Marketplace visibility and relevant discipline/service area; payment readiness is not required for discovery. All five, but not in every city/discipline. |
| requestable | A learner can reach a valid submission through the UI. The existing BookingModal requires date AND slot, valid rate, notice and other learner fields. Incomplete payment routes to `teacher_booking_requests` (202 deferred), not checkout. There is no slot-free lesson request form; messaging is a separate contact action. Four have a calendar path; successful persistence is not production-tested. |
| instantly_bookable | In this report: current paid booking prerequisites plus an eligible concrete slot, subject to final submission. This does NOT mean automatic lesson confirmation. Two. |
| payable | Existing payment and payout readiness checks pass plus valid rate; actual checkout still needs a valid booking. Two. No live charge attempted. |

### Individual evidence

All have active public discovery, publication/indexability and a valid base rate. All store `America/Toronto`, `schedule_mode=legacy_blocks`, no future `available_from_date`. The local audit process also uses America/Toronto. The hosted server's timezone was not directly observable. The optional public teaching-zone view is absent; zero loaded zones means **unknown detailed zones**, not proof of no declared travel area.

| ID / public name | Disciplines / specialty | City; public format; rate CAD | Published offer / regular path | Calendar within 28 days | Discovery readiness / booking entry | First exact blocker |
| --- | --- | --- | --- | --- | --- | --- |
| `b320a8c2-3c99-45e3-9536-75e16ce56c2c` / Eloise D. | `francais`, `aide_aux_devoirs`, `photographie`, `theatre`, `mise_en_forme`; legacy primary is a placeholder | Saint-Georges; all; 70 | 0 published offer rows; regular lesson path exists | yes; 16 legacy entries | false / deferred request with selected slot | `stripe_connect_onboarding_complete` false, producing `onboarding_incomplete` |
| `c84a6d10-e987-4f08-a6e1-fcb260cab632` / El P. | Espagnol; legacy `langues`, `tuteurs` rows | Saint-Georges; all; 45 | 0 published offer rows; regular lesson path exists | yes; 13 legacy entries | false / deferred request with selected slot | `onboarding_incomplete` |
| `70e4047e-b6e4-4b58-a049-ce10af676150` / Francis A. | Guitare; music discipline rows | Saint-Georges; both; 45 | 0 published offer rows; regular lesson path exists | yes; 16 legacy entries | true / normal pending-payment booking validation | none at listing prerequisite stage |
| `cc7f3a81-78ac-4110-8b27-1c22641f77b6` / Camila H. | chant populaire; music; published offer `chant`, no extra specialty | Saint-Henri; both; 70 | 1 published offer; regular path also exists | yes; 16 legacy entries | true / normal pending-payment booking validation | none at listing prerequisite stage |
| `dc6c844d-2955-4cb0-9750-613a39748311` / Maeva D. | Academic tutoring; `mathematiques`, `francais_scolaire`, `sciences`, `aide_aux_devoirs`, `difficultes_apprentissage`, `tuteurs` | Varennes; all; 60 | 0 published offer rows; regular path exists | **no**; 0 legacy entries | false / UI cannot select a slot; API deferred branch alone is not proof of requestability | `onboarding_incomplete` first; independently no eligible calendar |

The final SELECT at 18:20:36 UTC also retrieved the public `teacher_disciplines.specialite` values: Francis has Guitare, Piano, Basse, Ukulele; El has Espagnol, Francais and Autre; Camila has chant populaire. Eloise and Maeva have no additional free-text specialties on their discipline rows. No specialty was inferred from a broad group. Repeated discipline IDs on Francis/El are source rows, not duplicate teacher results: the five teacher IDs are distinct. `all` means existing online/teacher/learner formats; `both` means online/in-person. No exact address is disclosed.

This exposes an additional SEO limitation: the current local loader selects discipline IDs but not these legacy `specialite` values. The route list below is the **actual output**, not an assertion that it exhaustively represents all specialties (for example Francis's piano or El's French). This does not explain payment readiness but needs a separate exact-taxonomy regression/fix before claiming complete SEO coverage.

Profile routes are the five routes in the earlier table. Per-profile local routes from the same snapshot:

- Eloise: `/tuteurs/saint-georges`, `/cours/francais/saint-georges`.
- El: `/tuteurs/saint-georges`, `/cours/espagnol/saint-georges`.
- Francis: `/tuteurs/saint-georges`, `/cours/guitare/saint-georges`, `/cours/musique/saint-georges`.
- Camila: no supported city route for Saint-Henri; public profile remains linked as an online alternative where relevant. Do not substitute Levis as local.
- Maeva: `/tuteurs/varennes`, `/cours/mathematiques/varennes`.

### Decision trace and differences

1. `/api/teachers/plans` uses `getTeacherListingBookability`, merged into `teacher.bookingReady`. The predicate first checks the rate and payment/payout contracts. Eloise, El and Maeva fail BEFORE calendar evaluation. Payment blocker arrays for all three are `onboarding_incomplete`, `charges_disabled`, `requirements_due`, `disabled_reason`; payout arrays additionally use `payouts_disabled` instead of `charges_disabled`. No account identifier or requirements content is logged.
2. A SELECT-only counterfactual in the audit script neutralizes payment fields **in memory only**, then calls the same calendar projection. It identifies calendars for four, not five. This counterfactual is diagnostic, never application readiness and never a database update.
3. `components/BookingModal.tsx` requires `selectedDate` and `selectedSlot` before POST. `app/api/bookings/route.ts` parses those required fields and, for incomplete payment, inserts a deferred request BEFORE `createPendingPaymentBooking`. Hence payment readiness is correctly necessary for payment but too restrictive to mean 'cannot receive any request'. The existing availability caption must not be interpreted as an absolute ban on contact/request.
4. A direct POST with an invented slot could reach the deferred branch, but bypassing the UI is not a valid demonstration of requestability. No POST was made. The route's 202 can also occur when request insertion fails; this existing success-reporting risk requires separate transactional hardening. No successful persistence, authorization or email delivery is claimed from this audit.
5. The public profile's `bookNow` CTA does not consume `bookingReady`; it opens the modal. For Maeva that leads to no selectable calendar. This is a confirmed UI/server-state distinction, not proof that five can complete booking. A truthful availability CTA/state integration remains a code follow-up; no new slot-free workflow was invented here.
6. The previous SEO owner-join correction is preserved. Current cohort uses `teachers.user_id`; no new owner mismatch explains these three payment blockers. `teacher_offers` and `teacher_booking_requests` can be SELECTed successfully. A published offer is not mandatory for regular booking: `resolveOfferSnapshotForBookingCreate` accepts no offer ID.
7. `bookingLessonStartDate` and listing day generation use host-local Date operations. Reproduction: Toronto 2026-10-14 00:00 is 04:00Z; with TZ=UTC the same helper returns 00:00Z. At 2026-10-13 04:00Z the 24-hour gate differs. This is a deterministic existing timezone risk, not the cause of the three prerequisite exclusions; no booking-timezone rewrite was made in an SEO branch.

### Required administrative actions (not executed)

- Eloise and El: complete the connected-account onboarding and outstanding verification/requirements through the existing account workflow. Resolve the disabled state and refresh existing provider synchronization. Expect onboarding complete, charges enabled, payouts enabled, no current requirements and no disabled reason. **Do not manually set flags to true.** No missing calendar was observed for these two.
- Maeva: the same payment-account actions, plus enter/publish genuine future availability in the existing scheduling UI (`availability` for current legacy mode, or an intentionally activated precise schedule). No start-date postponement was present. Do not invent slots or simply create an offer row to bypass this.
- Francis and Camila: no corrective account action identified; final chosen slot, learner authorization, price and checkout still need normal validation.
- If the founder believes these onboarding actions were already completed, use authorized admin/provider diagnostics to distinguish stale database synchronization from genuinely outstanding provider requirements. This audit did not call Stripe or alter synchronization. It cannot establish the external provider's live state.

Therefore the earlier phrase 'only two reservable' is replaced by **five public/indexable, four with an eligible calendar, two payment-ready, two additional deferred-request paths**. Five fully payable bookings are not established. The current task's instruction to stop implementation when missing data explains the three blockers was followed: **no additional application/business logic change in this follow-up**. Recommendation remains **PRODUCTION DATA ACTION REQUIRED**, not READY TO MERGE. The CTA and timezone concerns above also require tracked code work; passing characterization tests does not certify them as fixed.

### Read-only incident / limitation

The first diagnostic script called public GET `/api/teachers/{id}/slots` before inspecting its entire call chain. Those responses showed four calendars and no Maeva calendar. Inspection then found `listActiveHoldsForTeacherDay` calls `expireStalePlannedPackageHolds`, which can update expired package holds/orders if its production feature flag is enabled. All such calls were stopped and removed from the diagnostic script. The initial evidence is retained in `LOCAL_SEO_P0_BOOKING_STATES.jsonl`; the replacement `..._READONLY.jsonl` uses explicit SELECT-only access. No booking/checkout POST, email or direct database mutation was made. **Absence of indirect production writes from those earlier GET requests cannot be guaranteed.** Human review of the hosted flag and relevant expiry/audit logs is required; do not infer no writes merely from HTTP GET. This qualifies the original report's no-production-write statement for this follow-up.

### Follow-up files and tests

Added `scripts/audit_public_teacher_booking_states.ts`, `tests/seo/publicTeacherBookingStates.test.ts`, `docs/LOCAL_SEO_P0_BOOKING_STATES.jsonl`, `docs/LOCAL_SEO_P0_BOOKING_STATES_READONLY.jsonl`; updated this report and the unique-teacher assertion in `tests/seo/localSeoP0.test.ts`. Earlier SEO application changes remain intact.

New tests cover incomplete-payment versus deferred request, rejection of slot-free requests, UI date/slot gating, Toronto midnight/24-hour boundary and the host-zone discrepancy, and a guard against HTTP or write calls in the diagnostic script. Existing `localSeoP0` covers public/unpublished/temporarily unavailable profiles, local/online supply, unique fixture cohort and empty/nonempty SEO. `teacherListingBookability`, `teacherDiscoveryFirstDeferredStripe` and `scheduleLockout` were rerun successfully. These include source-contract assertions, not live authenticated request end-to-end tests. Full CTA consistency and slot-free request behavior are **not** claimed to pass as product acceptance criteria.

Follow-up commands actually executed (all exit 0):

- `npx tsx tests/seo/publicTeacherBookingStates.test.ts`: 4 characterization/contract tests.
- `npx tsx tests/seo/localSeoP0.test.ts`: 7 tests, including distinct teacher IDs.
- `npx tsx tests/teacherSearch/teacherListingBookability.test.ts`.
- `npx tsx tests/teacherSearch/teacherDiscoveryFirstDeferredStripe.test.ts`: 18 assertions.
- `npx tsx tests/bookings/scheduleLockout.test.ts`: 5 tests.
- `npm run test:seo-foundation`, `npm run test:seo-local-discovery`, `npm run test:seo-teacher-resources`.
- `npm run test:launch-critical`.
- `npx tsx scripts/validate_i18n.ts`: 3505 keys per locale.
- `npm run lint`: 0 errors, 232 warnings.
- `npx tsc --noEmit --incremental false`.
- Production `next build` through the environment-loading wrapper documented above: success, existing forceSwcTransforms warning.
- `git diff --check`.

No commit, push, PR, merge or deployment was performed. Original learner-funnel worktree still has the same 13 modified tracked files (205 additions / 115 deletions) and original untracked files. Production side-effect uncertainty from the initial GET audit is disclosed above and requires human review rather than an unsupported assurance.

## Final correction phase: 2026-10-12/13

### Business semantics and final cohort

This phase implements the founder's confirmed distinction: five public/indexable profiles, four selectable calendars, two payable booking paths. Publication/indexability is independent of payment readiness. A selected slot is still revalidated on submission; this is not a promise of instant confirmation. No production account flags, schedules, prices or records were changed in this correction phase.

| Public profile | Public/indexable | Selectable calendar | Paid path ready | Server-rendered primary CTA | Operational action, not SEO prerequisite |
| --- | --- | --- | --- | --- | --- |
| Eloise D. | yes | yes | no | Demander un cours | Complete or resynchronize existing Stripe setup |
| El P. | yes | yes | no | Demander un cours | Complete or resynchronize existing Stripe setup |
| Francis A. | yes | yes | yes | Reserver un cours | None identified; final slot validation still applies |
| Camila H. | yes | yes | yes | Reserver un cours | None identified; final slot validation still applies |
| Maeva D. | yes | no | no | Contacter ce professeur | Complete/resynchronize Stripe and enter genuine availability |

Display strings in the application retain proper accents and natural FR/EN/ES equivalents. Internal IDs, rates, subject rows and profile paths are in the individual evidence table above. No ID/name/count is hardcoded in application logic. The final SELECT-only audit at 2026-10-12 19:24:33 UTC found the same cohort. Counts are dated inventory observations, not permanent constants.

`public` = publicly accessible under publication/consent rules. `discoverable` = eligible for relevant search. `requestable` = existing selected-slot deferred request path is reachable (four calendars; two use deferred payment setup). `instantly_bookable` in this audit means a concrete slot and existing payment prerequisites, NOT automatic confirmation (two). `payable` means existing payment/payout prerequisites pass, subject to final booking validation. Contact via existing messaging is distinct from a slot-free booking request; no such new request flow was invented for Maeva.

### Corrections

- `lib/teachers/bookingCapability.ts` owns the public action vocabulary. `getTeacherListingCapabilities` evaluates the calendar before choosing book/request/contact/waitlist; its old boolean wrapper remains compatible for bookable-first ordering. No internal payment diagnostics enter the public capability DTO.
- Plans metadata, public SSR profile, shared card captions, local results and mobile/desktop profile buttons consume that capability. Fresh capability is outside the cached editorial profile. The deferred modal says send a request, not pay. A failed deferred insert now returns 500 before notification/202 rather than claiming a saved request.
- Teacher-zone calendar dates, the 24-hour notice check and hold bounds use explicit IANA timezone with the existing Quebec fallback `America/Toronto`. DST spring gaps are rejected, fall repetition is deterministic; calendar days can be 23 or 25 hours. Shared slot generation replaces duplicate available-days logic. The authenticated availability preview now selects and passes the teacher timezone too.
- `lib/taxonomy/teacherSubjectNormalization.ts` preserves discipline IDs and explicitly maps observed French, Spanish, guitar, piano and popular-singing specialties to canonical IDs. `Langues` does not expand into languages. `Autre` is not a specialty; Basse/Ukulele remain unmapped because no exact supported canonical target was established. Public profile links, local inventory and sitemap share this normalization.
- Public hold reads no longer call expiry. Expired holds are excluded by timestamp without mutation. Explicit existing order/checkout commands retain expiry. Expiry updates retain pending/deadline guards and now also protect holds whose own deadline was renewed. Data lookup errors throw instead of masquerading as an empty calendar.

### GET audit and concurrency evidence

Audited availability GETs (`/api/teachers/[id]/slots`, `available-days`, plans metadata, teacher availability-preview), public profile loaders, local discovery and sitemap. The shared hold-list and conflict-read helpers contain no expiry call. Repeated reads run against a write-rejecting mock and leave its tables unchanged. No real booking, payment or authenticated request was submitted.

`holdExpiryConcurrencyPostgres.test.ts` additionally executed against an isolated PostgreSQL 18 cluster on loopback port 55439. It ran the actual expiry helper through a local SQL adapter concurrently with duplicate expiry and guarded claims, checking valid/paid records, expired records and retry idempotence. The temporary server was stopped afterward. This is actual PostgreSQL locking evidence for the scoped expiry operation, not a claim to have exercised the entire Stripe webhook or deployed Supabase lifecycle. No migration or production SQL was applied.

Earlier diagnostic GETs around 2026-10-12 18:15-18:16 UTC remain subject to the incident note above. Human review should inspect expiry logs for that interval if the temporary-hold feature was enabled. No affected booking IDs can be established from HTTP responses alone; do not fabricate a list or repair records manually.

### SEO/runtime evidence after corrections

Against the local production build: all five profiles returned 200, indexable, with biography in initial HTML, a single H1, canonical free of tracking parameters, and matching mobile/desktop action. FR/EN/ES SSR checks cover 15 profile responses. Cookie language variants are not separate canonical URLs, so no fictitious hreflang alternates are emitted. Structured data is ProfilePage/Person and breadcrumbs without invented ratings or contact/address details.

- Saint-Georges city, French/Saint-Georges and Piano/Saint-Georges: 200, indexable, in sitemap.
- Levis/Quebec city and English/Quebec: 200, noindex/follow, absent from sitemap.
- Invalid subject/city: genuine 404.
- Historical French course prefix and private-tutor alias: 308 directly to canonical equivalent, query preserved.
- Sitemap: 66 URLs = 53 other + 5 public profiles + 2 city pages + 6 course/city pages. Before historical-specialty normalization: 65; the additional exact page is piano/Saint-Georges. Original production baseline was 112, not a same-instant historical database replay.
- Six course/city URLs: French, Spanish, piano, guitar and music in Saint-Georges; mathematics in Varennes. French Saint-Georges now has two exact public subject matches. These are **public local profiles**, not a claim of two paid slots. Saint-Henri is not silently reassigned to Levis; online alternatives stay separate.

No browser surface was available for interactive/visual QA in this environment. HTTP initial-HTML testing is not a substitute for mobile clicks, CLS or payment testing. No indexing/ranking success is claimed.

### Validation record

The previous continuation completed: `test:schedule-intervals`, `test:offers`, `test:launch-critical`, `test:seo-foundation`, `test:seo-local-discovery`, `test:seo-teacher-resources`, `localSeoBookingSemantics`, `localSeoP0`, `localDiscoveryHardening`, `publicCalendarReadSafety`, `teacherListingBookability`, `teacherDiscoveryFirstDeferredStripe`, `scheduleLockout`, the isolated PostgreSQL expiry-concurrency test and production-runtime `localSeoP0Runtime`, all successfully. Production build, TypeScript and i18n also passed; lint had zero errors and 232 warnings. These are prior executed results, not assumed results for the latest preview-timezone edit.

Reruns actually executed on 2026-10-13:

| Command | Final observed result |
| --- | --- |
| `npx tsx tests/seo/localSeoBookingSemantics.test.ts` | PASS, including preview date and UTC/Toronto/Tokyo child processes |
| `npx tsx tests/bookings/publicCalendarReadSafety.test.ts` | PASS, 2 tests; repeated authenticated preview reads added |
| `npx tsx tests/teacherSearch/teacherListingBookability.test.ts` | PASS, including last included/first excluded day of 28-day horizon |
| `npx tsx tests/schedule/availabilityPreview.test.ts` | PASS |
| `npm run test:schedule-intervals` | PASS |
| `npm run test:offers` | PASS |
| `npm run test:seo-foundation` | PASS |
| `npm run test:seo-local-discovery` | PASS |
| `npm run test:seo-teacher-resources` | PASS |
| `npx tsx tests/seo/localSeoP0.test.ts` | PASS |
| `npm run test:launch-critical` | PASS on final rerun |
| `npx tsx scripts/validate_i18n.ts` | PASS, 3510 keys per locale |
| `npm run lint` | PASS, 0 errors / 232 warnings; not a warning-free result |
| `npx tsc --noEmit --incremental false` | PASS |
| `git diff --check` | PASS |

Intervening failures are not hidden: the first launch-critical rerun rejected the newly touched availability-preview API under the historical audio task's API scope guard. The existing exact-file allowlist was extended only for that read-only route, with assertions for the shared preview helper, timezone plumbing and absence of write/RPC/expiry calls. No assertion was disabled. Several subsequent tsx starts failed before assertions with Windows `uv_os_get_passwd ENOMEM`; targeted tests and launch-critical then passed outside the restricted execution context. Lint/TypeScript were allowed to finish before another heavy build. One redundant build was deliberately terminated to relieve memory pressure; it is not a successful build.

The first build of this continuation returned exit 0 but emitted Supabase read failures under restricted network access. That exit code alone is NOT accepted as clean runtime validation. A final network-enabled build/runtime verification is recorded separately below.

### Additional confirmed sitemap failure found during final QA

The first network-enabled build passed, and its runtime profile/local/redirect tests passed, but the sitemap had **56**, not 66 URLs: 43 other + 5 profiles + 2 cities + 6 course/city. A direct read-only `blog_posts` query proved ten currently published articles existed while zero article URLs were emitted. The unchanged blog sitemap loader caught read errors as `[]` and cached the empty result; the earlier restricted-network build could therefore poison the successful section cache for an hour. This was not a loss of local teacher supply or a justification for removing articles.

Targeted correction in `app/sitemap.ts`: propagate blog and teacher read failures instead of returning a successful empty section; invalidate the old blog cache namespace once with `blog-sitemap-entries-v2-errors-propagate`. Actual successful zero-row queries still legitimately return an empty section. No source article or production record was edited. `tests/seo/sitemapDataFailure.test.ts` uses the existing mocked-fetch sitemap harness: both the failed-read/recovery and teacher-read failure cases passed (2 tests). Runtime `/robots.txt` returned 200.

The ten affected public slugs were: `comment-choisir-tuteur-enfant-quebec`, `combien-coute-tuteur-prive-quebec`, `tuteur-en-ligne-ou-a-domicile`, `preparer-premier-cours-prive-enfant`, `maths-secondaire-4-aide`, `cours-piano-enfants-choisir-professeur`, `cours-espagnol-pres-chez-vous`, `francisation-professeur-francais-pres`, `donner-cours-prives-quebec`, `prof-retraite-enseigner-pratiqo`. Their presence must be checked again on the final rebuilt sitemap; the earlier runtime PASS did not assert article completeness.

### Final rebuilt artifact verification

- Final production build (`node ... next build`, with the existing local environment loaded in memory): **exit 0**. TypeScript compilation passed. Existing `forceSwcTransforms` warning and optional teaching-zone fallback warnings remain; no Supabase inventory-read failure was accepted as success.
- After the sitemap edit: `npx eslint app/sitemap.ts tests/seo/sitemapDataFailure.test.ts`, `npm run test:seo-foundation`, `npm run test:seo-local-discovery`, `npm run test:seo-teacher-resources`, `npm run test:launch-critical`: **all exit 0**. The full lint and standalone TypeScript checks above preceded this small final sitemap edit; the final build typechecked that edit as well.
- `npx tsx tests/seo/localSeoP0Runtime.test.ts` against final `next start` on 127.0.0.1:3190: **exit 0**. All 15 FR/EN/ES profile responses preserve their biography, metadata, canonical and correct server action. The priority city/course, empty, invalid and 308/query cases above passed again.
- Independent read-only comparison: **10 published blog rows, 10 emitted article URLs, 0 missing**. Final sitemap HTTP 200, **66 total = 5 profiles + 2 city + 6 course/city + 53 other**. `/robots.txt`: HTTP 200. This supersedes the intermediate 56-URL result and confirms recovery without fabricated inventory.
- Final `git diff --check`: passed after documentation update. The original learner-funnel diff still measures 13 tracked files, 205 additions / 115 deletions; no original-worktree edit was performed.

No known GET mutation remains in the audited availability/profile/discovery/SEO paths. Historical production GET uncertainty remains an incident-review action, not evidence of a remaining write in the corrected read path. The local QA server is stopped after validation. No commit, push, PR, merge, production deployment, migration or production-data correction was performed.

### Changed-file inventory (whole isolated branch, including preserved earlier SEO work)

| Files | Purpose |
| --- | --- |
| `app/sitemap.ts`, `tests/seo/sitemapDataFailure.test.ts` | Propagate data errors and prevent caching dropped blog/profile sections; mocked failure/recovery regression |
| `app/page.tsx`, `app/(marketing)/trouver-un-prof/page.tsx`, `components/seo/LocalSupplyCityLinks.tsx` | Locale-correct discovery copy and small supply-backed internal link graph |
| `app/professeurs/[slug]/page.tsx`, `app/teacher/profile/[id]/TeacherProfileClient.tsx`, `components/TeacherProfile.tsx` | Public SSR metadata/content/locale and shared truthful CTA |
| `components/BookingModal.tsx`, `components/teachers/TeacherBookingReadiness.tsx`, `lib/teacherListingMetadata.ts`, `types.ts` | Shared public capability in card/modal UI, business-zone calendar |
| `components/seo/LocalTeacherDiscoveryCards.tsx`, `LocalTeacherDiscoveryView.tsx`, `TeacherProfileSeoLinks.tsx` | Exact public local supply, separate online alternatives, capability caption and profile links |
| `lib/seo/localTeacherDiscoveryPages.ts`, `resolveTeacherDisciplineLink.ts`, `teacherPublicProfile.ts`, `teacherPublicProfileData.ts`, `teacherPublicProfileLabels.ts` | Owner join, supported local FAQ/metadata, canonical exact discipline linkage and public inventory |
| `lib/taxonomy/teacherSubjectNormalization.ts`, `lib/teachers/bookingCapability.ts`, `lib/teachers/listingBookability.ts` | Exact historical aliases, authoritative CTA semantics and calendar-backed paid ordering |
| `lib/timezones.ts`, `lib/teacherSlotQueries.ts`, `lib/bookings/bookableSlotsForDay.ts`, `availabilityPreview.ts`, `createPendingPaymentBooking.ts` | Shared zone, notice and overlap calculations; diagnostic preview parity |
| `lib/offers/plannedPackageHoldQueries.ts` | Read-only hold lookup, explicit guarded expiry, timezone bounds |
| `app/api/bookings/route.ts` | Five-line failed-persistence guard before deferred success/email |
| `app/api/teachers/plans/route.ts`, `app/api/teachers/[id]/available-days/route.ts`, `slots/route.ts`, `app/api/teacher/schedule/availability-preview/route.ts` | Public capability, read-only calendar/error semantics and explicit timezone |
| `lib/i18n/locales/{fr,en,es}.json` | Five localized CTA strings per locale |
| `scripts/audit_local_seo_p0.ts`, `scripts/audit_public_teacher_booking_states.ts` | Read-only reproducible SEO/booking-state evidence |
| `tests/seo/{localSeoP0,localSeoP0Runtime,localSeoBookingSemantics,publicTeacherBookingStates}.test.ts` | New cohort, HTML, timezone, normalization and semantics coverage |
| `tests/bookings/{publicCalendarReadSafety,holdExpiryConcurrencyPostgres}.test.ts` | New repeat-read/no-write and isolated PostgreSQL concurrency tests |
| `tests/teacherSearch/teacherListingBookability.test.ts` | Capability matrix and 28-day horizon boundaries |
| `tests/offers/{bookingOfferSelection,publicTeacherProfileOffers}.test.ts`, `tests/teachers/teacherProfileTeachingModeChips.test.ts` | Preserve offer/modal contracts with shared rather than obsolete generic CTA |
| `tests/schedule/preciseScheduleBookingSource.test.ts` | Assert shared canonical generator instead of removed duplicate implementation |
| `tests/seo/{prelaunchSeoIndexation,teacherSeoPublicationWorkflow}.test.ts` | Updated truthful metadata/internal-link contracts |
| `tests/yo/yopratiqoAudioPronunciationOverrides.test.ts` | Narrow existing API scope allowlist, with no-write assertions for the two calendar routes; no audio/product behavior change |
| `docs/LOCAL_SEO_P0_REVIEW.md`, `docs/LOCAL_SEO_P0_{BOOKING_STATES,BOOKING_STATES_READONLY,LOCAL,PRODUCTION,RUNTIME}.jsonl` | Dated audit report and retained evidence; earlier GET limitation explicitly disclosed |

### Remaining limitations and delivery

No schema changes, deployment, Stripe calls or payment-amount changes. The original learner-funnel worktree is preserved. Existing optional teaching-zone view is missing in the queried environment: canonical legacy-city fallback remains; finer travel-zone coverage is not invented. The available-days path reads holds per day when enabled, so latency deserves staging observation. This task does not certify unrelated planned-package fulfillment races, refunds or the entire deferred-request lifecycle. Separate transactional learner-funnel work remains isolated.

After explicit approval: review this diff, run staging mobile/desktop interaction QA, deploy application only, then run the Search Console checklist above. Roll back the application revision if necessary; there is no database migration/data rollback. The three teachers' Stripe/schedule administrative actions remain separate and must not be replaced by manually forcing flags.
