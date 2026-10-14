# Learner funnel P0 review

Status: partial implementation, not launch-ready. No production deployment, production
migration, outbound message, commit, push or PR was performed. Current base:
`358a37d4b0d888c99221b9cf323c558aed28b78b` (merged PR #402); branch:
`fix/learner-funnel-truthful-p0`.

The sections below through "Remaining P0 blockers" are the retained initial
review, based on `d79bcae1bd84fbe93f3eae1f6e022158ddce91fc`. The dated continuation
at the end supersedes their validation results and resolved limitations.

## Existing architecture retained

- PR 401 bookable-first ordering and cumulative ranking remain intact.
- `listingBookability.ts` provides a server-side, read-only four-week calendar
  projection using existing price and payment/payout readiness predicates,
  regular lesson duration, notice, weekly schedule, exceptions, blocks, bookings
  and active holds. This is a discovery snapshot, not a reservation guarantee.
- `learner_demand_leads` already stores private requests and has a unique
  contact/subject/city/online-consideration key. No competing waitlist was added.
- Existing demand notifications use an authenticated cron and transactional
  email helper. Neither was invoked during this work.
- Booking creation, checkout, payment and completion code remain unchanged.
- Analytics already has consent-gated PostHog helpers including `search_started`,
  `teacher_profile_viewed`, `booking_started`, and `booking_completed`.
  Existing names are not proof of durable server-side emissions.

## Implemented changes

- Demand matching no longer treats a teacher name, biography, broad parent
  category or a generic 25 km radius as evidence of eligible local supply.
- Exact canonical discipline identifiers match the primary or secondary
  discipline; unknown free text remains a private unmet need, never guessed supply.
- The local-supply predicate was extracted from the existing SEO implementation
  without changing its rules: eligible in-person mode, active Canadian zones,
  an actual city match or declared student-place travel radius; legacy teachers
  without zones require an actual city match. Online-only teachers are not local.
- Demand submission and existing alert rematching share strict supply enrichment.
  Lookup failures reject instead of becoming empty inventory. This requires the
  teaching-zones view from migration 128 to be available.
- Available slots can be filtered by broad preference: flexible, weekday day
  (lesson ends by 18:00), weekday evening (starts at/after 18:00), or weekend.
  These preferences use the existing booking calendar clock, whose timezone
  limitation is noted below.
- Online alternatives require an explicit choice; a specifically online request
  never returns a local-only teacher. The original local request remains open
  when the learner opts to view an online alternative.
- Search deep links now carry and consume city/format. Explicit in-person city
  searches use the shared declared-local-supply predicate. Student search offers
  the existing demand form when no result has positive bookability evidence.
- Explicit unchecked course-alert and adult/guardian-contact confirmations are
  enforced server-side. Marketing is not solicited and is stored as false.
- Unconsented historical requests are not eligible for future automatic alerts.
  Repeated submissions cannot reset notified/converted/closed delivery state.
- Arbitrary URL attribution is no longer persisted as if course-alert consent
  were analytics consent. Recruitment links only include recognized taxonomy
  and municipality values, not unrestricted learner text.
- FR/EN/ES consent, availability, format and empty-state strings use the existing
  dictionaries. Withdrawal currently uses the existing support mailbox, not a
  new notification system or an unauthenticated email-based deletion endpoint.

## Changed files

- `app/api/learner-demand/route.ts`: validation, strict supply, consent storage.
- `app/(app)/student/search/page.tsx`: demand links and requested location/format.
- `components/marketing/LearnerTeacherFinder.tsx`: explicit choices and consent.
- `lib/learnerDemand.ts`: exact discipline/local matching and safe share URLs.
- `lib/learnerDemandSupply.ts`: shared server enrichment for API and alert worker.
- `lib/learnerDemandNotifications.ts`: explicit consent and matching preferences.
- `lib/learnerAvailability.ts`: typed broad schedule preference matching.
- `lib/teachers/listingBookability.ts`: optional schedule-preference filter.
- `lib/teachers/localSupply.ts`: shared canonical local-supply predicate.
- `lib/seo/localTeacherDiscoveryPages.ts`: reuse the extracted predicate.
- `lib/teacherDisciplines.ts`, `lib/teacherTeachingZones.ts`: opt-in strict reads;
  existing callers retain their previous fallback behavior.
- `lib/i18n/locales/{fr,en,es}.json`: localized learner states.
- `supabase/migrations/129_learner_demand_consent.sql`: private consent fields,
  delivery-state guard, index and service-role-only aggregate view.
- `tests/marketing/learnerDemandTruthfulness.test.ts`: focused matching, preference,
  consent, URL privacy and migration/source contracts.
- `tests/teacherSearch/teacherListingBookability.test.ts`: real generated-slot
  preference tests against mocked read-only Supabase requests.
- This review file.

## Database rollout and rollback

Migration 129 is NOT applied. It extends the existing table, preserving existing
rows, unique deduplication index and RLS. The aggregate view
`learner_unmet_demand_summary` contains only normalized city, discipline, requested
format, request count and most recent date. Its grants exclude public/anon/client
access. Existing requests retain null alert consent; no consent is fabricated.

Before any release: test migrations 128/129 on an isolated database, including
anonymous/authenticated/service-role access and concurrent request updates.
Temporarily pause the existing demand cron during the deployment transition.
Apply 129 before the new API/UI and worker. Smoke-test all three together using
mocked email delivery, then review before enabling scheduled delivery. Old UI
tabs without explicit consent are rejected and need a refresh.

Rollback should retain consent data and the additive schema. Do not blindly
restore the old worker: it ignores explicit consent. Keep notifications paused
or retain the consent-filter patch. Requests already closed must not be reopened
by a public resubmission. Withdrawal through support requires an operator to
close the request; automated secure self-service withdrawal is not implemented.

## Validation performed

- `npx tsx tests/marketing/learnerDemandTruthfulness.test.ts`: PASS.
- `npx tsx tests/marketing/learnerDemandFinder.test.ts`: PASS, 9 tests.
- `npx tsx tests/teacherSearch/teacherListingBookability.test.ts`: PASS; error logs
  are expected mocked-failure cases.
- `npx tsx tests/teacherSearch/teacherWeightedRankingScore.test.ts`: PASS, 17 tests.
- `npx tsx tests/seo/localDiscoveryHardening.test.ts`: PASS, 13 tests.
- `npx tsx tests/student/studentRoleExperience.test.ts`: PASS.
- `npm run lint`: PASS with 232 warnings on the first run; final run recorded below.
- `npm run test:security`: PASS.
- `npx tsc --noEmit --incremental false`: an initial fixture typing error was fixed;
  subsequent run passed; final run recorded below.
- `npx tsx scripts/validate_i18n.ts`: PASS, 3520 keys per locale.
- `git diff --check`: PASS.
- `npm run build`: first sandbox run failed opening `.next/trace` (EPERM);
  elevated local build passed. Final build recorded below.
- `npm run test:launch-critical`: FAIL. The legacy safe-disclosure scope guard
  rejects migration 129. A temporary single-file exemption was removed; while
  that exemption was present the run progressed to another legacy audio-scope
  guard rejecting `app/api/learner-demand/route.ts`. Neither control is disabled
  in the final diff. This is not a green launch validation.
- No local PostgreSQL migration execution, concurrent transaction integration
  test, browser screenshot, real SMS/email, real booking or Stripe request.

Final additional checks: `npm run lint` passed with 232 warnings and no errors;
targeted ESLint on the changed runtime files passed with 8 warnings and no errors.
`npm run test:payments` and the repeated `npm run test:security` both passed.
`npx tsc --noEmit --incremental false` passed after the fixture correction.
The local PostgreSQL server responds on localhost:5432, but `psql -w` cannot
authenticate without a password; no database changes were attempted. Historical
free-text alias rows are retained; new known-subject requests use canonical IDs
for deduplication, without a destructive historical merge.

The final `npm run build` passed on the final runtime code (Next.js still warns
about the existing unsupported `experimental.forceSwcTransforms` option).
The production preview is running locally at
`http://127.0.0.1:3188/trouver-mon-prof` (PID 20548). A read-only HTTP request
returned 200 and the initial finder markup. This does not verify client hydration
or step 3: the consent controls are intentionally absent from the initial step.
Browser screenshot testing was attempted, but the browser tool reported no
available browsers. Do not submit this preview against the linked database;
use it to inspect the UI only until an isolated migrated staging database exists.

## Remaining P0 blockers

1. **Timezone:** `lib/bookingCancellation.ts` explicitly interprets lessons in the
   process-local clock and notes that bookings do not yet store an IANA timezone.
   Cross-timezone/UTC deployment correctness is not established by these tests.
2. **Atomic booking safety:** migration 011 has a unique teacher/date/start-time
   constraint. That alone does not prove exclusion of overlapping durations with
   different starts. Full concurrency, price revalidation and webhook idempotence
   integration tests remain required; no financial lifecycle code was changed.
3. **Canonical full match:** this change aligns the demand funnel and local supply,
   not every profile CTA, campaign, count API and booking entry point. Discovery
   readiness still uses regular duration and a 28-day snapshot, not all offered
   durations, zone-specific calendars or travel-dependent home-lesson duration.
4. **Measurement:** no new analytics emissions were added. Durable deduplicated
   `booking_confirmed`, `lesson_completed_paid`, `waitlist_submitted` and first-paid-
   lesson cohort metrics remain unimplemented. Do not infer them from page views.
5. **Waitlist completeness:** alert consent is mandatory in the existing combined
   finder, rather than a separate post-search optional waitlist step. Unrecognized
   free-text needs cannot be safely prefilled through URLs. Level/budget, automatic
   verified withdrawal and a distinct nearby-alternatives UI remain unimplemented.
6. **Database proof:** migration, role grants, dedup updates and notification
   delivery-state concurrency have source assertions only, not live PostgreSQL
   integration proof. Notification withdrawal racing with an in-flight worker
   is not resolved by this patch.
7. **Release checks:** launch-critical scope checks require a deliberate repository
   policy resolution, not a blanket exemption. Browser/mobile QA is outstanding.

Recommendation: retain as an uncommitted review diff. Do not merge, deploy or label
the overall P0 complete until these blockers have been addressed and validated.

## Continuation after PR #402 - 2026-10-14

### Preservation and integration

Work continues in `C:/Users/Utilisateur/pratiqo`, on the original learner branch.
The original tracked and task-related untracked files were copied to
`C:/Users/Utilisateur/Documents/Codex/2026-05-13/analyse-my-project-from-a-critical/learner-reconcile-20261014/original`
before reconciliation. No reset, stash, commit or destructive cleanup was used.
The index and branch base now match merged main `358a37d4`; the reconciled learner
changes remain uncommitted. The separate SEO worktree and sentinel files were not
edited. Locale conflicts were merged structurally; the shared eligibility helper
keeps #402's booking capability and timezone semantics with the learner preference
filter added, rather than restoring the older boolean-only implementation.

### Implemented in this continuation

- Searching and registering an alert are separate actions on the existing API.
  `intent=search` requires no email/consent and performs no database write.
  `intent=waitlist` requires an adult/guardian contact and explicit alert consent.
  The UI only claims a saved request after successful persistence.
- Supply enrichment now uses #402's authoritative calendar/capability projection.
  `book` and `request` qualify for matching; `contact` alone does not promise a
  selectable booking. Payment eligibility remains unchanged. Public profiles
  remain discoverable independently of these booking capabilities.
- Matching deduplicates teacher IDs and reuses canonical historical-specialty
  normalization. Broad Langues alone does not qualify a specific language.
  Local and online supply remain distinct, and online ranking ignores distance.
- Broad availability preferences use the teacher-local date produced by the
  shared timezone/calendar implementation; weekday classification itself is
  independent of the process timezone.
- Missing optional teaching-zone views use only the documented legacy-city
  fallback (42P01/PGRST205). Other lookup errors propagate as unavailable, not
  zero inventory.
- The private request's dedupe key now distinguishes local and online needs.
  Repeated submissions can update preferences without creating duplicate rows.
  Closed/withdrawn requests cannot be reopened or overwritten by resubmission.
- The aggregate unmet-demand view uses canonical municipality/discipline values
  (or unclassified), format, count and latest date. It does not expose raw contact
  or free-text location information and is service-role-only.
- Existing notification processing requires alert/adult consent at both lookup
  and claim. A skipped email is not counted as sent; failure to persist delivery
  state after an accepted send does not reopen the request for automatic resend.
  This does NOT establish exactly-once external email delivery.
- Search links contain normalized taxonomy and recognized municipality values,
  never unrestricted learner text. Marketing remains false and no campaign data
  is retained merely on the basis of course-alert consent.
- Launch scope tests now explicitly cover this exact authorized migration/API,
  retaining assertions against payment access, outbound sends, permissive RLS
  and unrelated migrations. No whole-suite control was disabled.
- The SEO failure fixture now fails only the local teacher query: failing every
  query raced the blog and local sitemap errors after #402. The exact expected
  local error assertion remains unchanged.

### Matching definition and its boundary

The input teacher set comes from the existing public/launch-eligible projection.
Exact canonical subject/specialty and requested format are mandatory. In-person
matching uses declared teaching zones/travel area or actual legacy city, with no
new radius. A generated eligible future slot in the existing four-week discovery
window must match the learner's broad availability. The existing shared capability
determines paid-booking versus deferred-request readiness; its errors fail closed.
This is a read-only discovery snapshot, not an atomic slot reservation or a
guarantee that every offered duration is available. No count of five is hardcoded.

### Additional changed files

In addition to the initial changed-file list above:

- `lib/email/templates/learnerDemand.ts`: treat skipped delivery as unsuccessful.
- `app/(marketing)/trouver-mon-prof/page.tsx`: remove the automatic-save promise
  discovered during browser QA; alerts require an explicit opt-in.
- `tests/marketing/learnerDemandApi.test.ts`: real route handler with mocked reads
  and writes, search without email/writes, consent, safe failures and response privacy.
- `tests/marketing/learnerDemandSupply.test.ts`: shared calendar/capabilities,
  deferred requests, legacy specialty normalization, preference and error behavior.
- `tests/marketing/learnerDemandPostgres.test.ts`: actual migrations 089/129 on a
  disposable local database, concurrent upserts, distinct formats, withdrawal,
  role permissions, RLS and aggregate privacy.
- `tests/marketing/learnerDemandDelivery.test.ts`: skipped transport is not success.
- `tests/legal/safeDisclosures.test.ts` and
  `tests/yo/yopratiqoAudioPronunciationOverrides.test.ts`: narrow authorized scope
  assertions only; no YoPratiqo runtime or legal copy changes.
- `tests/seo/localDiscoveryHardening.test.ts`: isolated failure fixture.

### Validation executed during continuation

PASS:

- `npx tsx tests/marketing/learnerDemandApi.test.ts`
- `npx tsx tests/marketing/learnerDemandTruthfulness.test.ts`
- `npx tsx tests/marketing/learnerDemandFinder.test.ts` (9 tests)
- `npx tsx tests/marketing/learnerDemandSupply.test.ts`
- `npx tsx tests/marketing/learnerDemandDelivery.test.ts`
- `npx tsx tests/marketing/learnerDemandPostgres.test.ts`, with local-only
  `LEARNER_LOCAL_PG_URL` and `PSQL_PATH`: creates/drops its own test database.
  Six concurrent submissions produce one row, formats remain separate, withdrawn
  rows remain closed, legacy rows receive no fabricated consent, anon/authenticated
  reads fail, and the aggregate excludes identifying columns.
- `npx tsx tests/teacherSearch/teacherListingBookability.test.ts`
- `npx tsx tests/seo/localSeoBookingSemantics.test.ts` (including DST/process TZ)
- `npx tsx tests/seo/localDiscoveryHardening.test.ts` (13 tests)
- `npx tsx tests/seo/sitemapDataFailure.test.ts`
- `npm run test:launch-critical`
- `npm run test:seo-foundation`
- `npm run test:seo-local-discovery`
- `npm run test:seo-teacher-resources`
- `npm run test:schedule-intervals`
- `npm run test:offers`
- `npm run test:payments`
- `npm run test:security`
- `npx tsx scripts/validate_i18n.ts`
- `git diff --check`

Intermediate failures were corrected, not suppressed: a new TypeScript teacher
fixture lacked distance/isVerified; the local SQL command fixture used accented
text incompatible with that Windows command encoding; the SEO error fixture
failed unrelated concurrent blog queries. Final build/typecheck/lint results
are recorded below after completion. No standalone formatting command exists in
package.json; ESLint and diff whitespace checks are used.

### Remaining blockers and rollout safety

1. **Atomic booking lifecycle:** the existing unique teacher/date/start constraint
   is not proof against overlapping durations with different starts. The current
   deferred request path also precedes several calendar/learner validations in
   createPendingPaymentBooking. A complete submission/retry/concurrency audit and
   transactional integration coverage remain required. This continuation did not
   modify bookings, checkout, Stripe, prices or payment webhooks.
2. **Durable measurement:** the existing consent-gated browser PostHog events are
   preserved. Durable deduplicated booking_confirmed, lesson_completed_paid,
   waitlist_submitted and first-paid-lesson numerator/denominator reporting are
   not implemented. Browser page views must not substitute for these events.
3. **Notification lifecycle:** withdrawal after claim but before external delivery
   and a network timeout after provider acceptance still need explicit treatment.
   Shared email transport also needs a separate test for Resend's resolved error
   response (not just thrown errors). Its general behavior is unchanged here.
4. **Request continuity:** the finder preserves the original need in form/private
   persistence, but search-to-calendar links do not yet carry every broad time
   preference/duration. Contact-only fallback, nearby alternatives, optional
   level/budget and verified self-service withdrawal are not complete.
5. **UI QA:** a local production browser pass reached steps 1/2/3 using keyboard
   navigation, with subject/city preserved, flexible/in-person selectors visible,
   and no email field or consent requirement before search. A search submission
   was safely denied by the existing production rate limiter because local
   Upstash configuration is absent. This is not evidence of successful end-to-end
   matching. No waitlist submission or booking was attempted. Full mocked-data
   mobile/results/success-state QA remains necessary. The displayed error now
   describes processing rather than falsely referring to a failed save.

Migration 129 remains unapplied outside disposable local PostgreSQL. Apply schema
before API/UI/worker only after review, with the existing notification cron paused;
do not restore the old non-consent-aware worker on rollback. Retain consent records
and close requests via the established support operation. No production action,
message, payment, commit, push or PR was performed. Green regression commands do
not mean the full P0 definition of done is satisfied.

Verdict: **P0 INCOMPLETE - NOT READY TO MERGE** until the transactional, durable
measurement and delivery/QA gaps above are completed. The search/waitlist changes
are preserved as a reviewable uncommitted diff on top of #402.

### Final command results

- `npm run build`: PASS on both builds, including the final copy corrections;
  327 static pages generated. The existing unsupported
  `experimental.forceSwcTransforms` warning remains.
- `npx tsc --noEmit --incremental false`: PASS after correcting the new fixture.
- `npm run lint`: PASS, 0 errors and 232 warnings; not a warning-free result.
- Final reruns of finder/truthfulness/supply tests, `test:launch-critical` and
  `validate_i18n.ts`: PASS. Targeted ESLint on the final changed page, component
  and fixture: PASS, one existing set-state-in-effect warning in the finder.
- Local PostgreSQL test server stopped after the successful migration tests;
  disposable test databases were dropped by the test's finally block.
- Local production preview at `http://127.0.0.1:3190/trouver-mon-prof` was stopped
  after inspection. No persistent test service or production change is required.

## Hardening continuation - 2026-10-14 (uncommitted)

This section supersedes the earlier blocker status, not the earlier command
history. The original learner work and #402 integration remain intact.

### Implemented in this continuation

- `lib/bookings/validateBookingSubmission.ts` and `app/api/bookings/route.ts`:
  read-only validation before both paid-booking creation and deferred-request
  persistence. Checks public eligibility, lesson format, learner ownership,
  published offer, authoritative price, teacher timezone, notice/calendar rules,
  exceptions, holds and overlapping bookings. Data errors fail closed with 503.
  Existing payment-readiness gate and checkout pricing are unchanged. Offer
  checkout retains its snapshot feature gate and the existing legacy modal
  payload contract; a regression test covers both flag states.
- Migration 130 adds a database exclusion constraint on active teacher-local
  booking intervals. Unlike start-time uniqueness, it rejects concurrent
  differently-starting overlapping lessons and equivalent `9h00`/`9:00` labels.
  `createPendingPaymentBooking.ts` maps SQLSTATE 23P01 to recoverable slot_booked.
  Existing invalid/overlapping active data stops the migration; nothing is repaired.
- Migration 131 adds private, deduplicated lifecycle facts and a service-only
  aggregate. Completion/payment races serialize on the booking row. Confirmation,
  held-and-paid lesson, consented waitlist, cancellation, refund and dispute
  remain distinct. No PostHog server export or fabricated historical backfill.
- Shared email transport now treats resolved provider errors and missing message
  IDs as failures, retains its non-throwing contract and supports idempotency keys.
  The existing demand worker rechecks consent after claiming, sends with a stable
  key and does not reopen ambiguous failures. Such rows require operator review.
  Withdrawal after provider handoff cannot recall an already accepted message.
- BookingModal owns booking_started across entry surfaces, with the duplicate
  landing emitter removed. Finder search uses the existing consent-gated event.
  FR/EN/ES explain changed price/duration recoverably.

### New regression coverage

- `tests/bookings/bookingSubmissionValidation.test.ts`: paid/deferred calendar
  eligibility, changed price, offer flags, foreign learner, format, overlap and
  missing/public lookup failure.
- `tests/bookings/bookingIntervalConcurrencyPostgres.test.ts`: actual migration
  130, concurrent claims, adjacent slots, status transitions, invalid labels and
  deployment refusal over existing conflicts.
- `tests/marketing/learnerFunnelFactsPostgres.test.ts`: actual migration 131,
  concurrent completion/payment, retry deduplication, separate refunds/disputes,
  waitlist upsert deduplication and private grants.
- `tests/email/transportFailure.test.ts`: mocked Resend resolved rejection,
  timeout, accepted ID and idempotency header. No real emails.
- `tests/marketing/learnerDemandNotificationRace.test.ts`: concurrent workers,
  withdrawal before handoff and ambiguous delivery without automatic retry.
- Analytics source guard now checks the shared modal emitter. Existing scope
  guards explicitly validate migrations 130/131 (constraints, private RLS,
  no booking/payment DML), rather than disabling their restricted-file checks.

### Deployment and rollback prerequisites

No migration was applied outside disposable local databases. Before any eventual
rollout, review migration-number availability and inspect existing active rows
for malformed/overlapping slots using read-only diagnostics. Schedule the GiST
constraint addition as locking DDL. Stop on conflicts; do not delete reservations.
Apply 129 before consent-aware API/worker, then reviewed 130/131 before relying
on their guarantees. Keep the notification cron paused until staging QA succeeds.
Rollback must retain consent protections and financial history; do not restore
the old worker or drop the exclusion constraint merely to make writes succeed.
There is no production rollout authorization in this task.

### Remaining evidence gaps / blockers

1. The exclusion constraint protects bookings against bookings, not atomic claims
   across `planned_package_session_holds` and bookings. Existing preflight reads
   holds but are not a cross-table serialization guarantee. Teacher buffers are
   checked by the calendar, not represented in the database exclusion range.
2. The private lifecycle aggregate is not yet the requested first-ever paid
   learner/cohort conversion report. Browser and durable counts have different
   denominators; no conversion percentage is claimed. Waitlist-to-course matching
   conversion attribution remains unimplemented.
3. Full mocked-data mobile/results/success QA and original availability-preference
   continuity into the booking calendar remain to be completed. The prior local
   Upstash failure was not bypassed. Support withdrawal is present; automated
   self-service withdrawal and optional budget/level are not claimed.
4. Snapshot-based offer duration versus legacy modal duration remains an existing
   contract to review separately; this continuation preserves it instead of
   silently changing offer/payment semantics. Cross-trigger lock ordering needs
   integration review with the full deployed schema, beyond the tested minimal
   PostgreSQL lifecycle fixtures.

Verdict: **P0 INCOMPLETE - NOT READY TO MERGE**. Passing focused concurrency tests
does not prove the entire transactional funnel or end-to-end browser flow.

### Commands executed in this hardening continuation

PASS (actually rerun, not inferred from the previous continuation):

- `npx tsx tests/bookings/bookingSubmissionValidation.test.ts`
- `npx tsx tests/bookings/bookingIntervalConcurrencyPostgres.test.ts`
- `npx tsx tests/marketing/learnerFunnelFactsPostgres.test.ts` (rerun after
  separating dispute from refund)
- `npx tsx tests/marketing/learnerDemandPostgres.test.ts`
- `npx tsx tests/marketing/learnerDemandNotificationRace.test.ts`
- `npx tsx tests/email/transportFailure.test.ts`
- `npx tsx tests/marketing/learnerDemandApi.test.ts`
- `npx tsx tests/marketing/learnerDemandSupply.test.ts`
- `npx tsx tests/marketing/learnerDemandTruthfulness.test.ts`
- `npx tsx tests/bookings/publicCalendarReadSafety.test.ts` (2 tests)
- `npx tsx tests/seo/localSeoBookingSemantics.test.ts` (including process TZ/DST)
- `npm run test:auth`
- `npm run test:payments`
- `npm run test:offers`
- `npm run test:security`
- `npm run test:launch-critical`
- `npm run test:seo-foundation`
- `npm run test:seo-local-discovery`
- `npm run test:schedule-intervals`
- `npx tsx scripts/validate_i18n.ts`
- `npx tsc --noEmit --incremental false`
- `npm run lint` (0 errors, 232 warnings)
- `npm run build` (final rerun PASS; existing unsupported
  `experimental.forceSwcTransforms` warning remains)
- `git diff --check` (PASS; Git reports existing LF/CRLF conversion warnings)

The initial launch-critical run failed on the old landing-specific analytics
assertion and the new migrations' restricted-scope guards. Assertions were updated
to the new authoritative emitter and explicit SQL safety checks, not removed.
A regex initially matched the word "grants" in a comment; its GRANT check now
matches actual statement starts. The final launch-critical rerun passed.

PostgreSQL tests enforce localhost:55439 and create/drop disposable databases;
the local server has been stopped. No real email, booking, payment or production
mutation was performed. No browser QA was rerun in this continuation. The umbrella
`validate:launch` command was not rerun as a single command; the commands above
are the exact evidence, not a substitute claim that every launch check is green.

## Finalisation des trois blocages - 14 octobre 2026

Cette section remplace les conclusions de blocage des étapes précédentes.
Les modifications sont toujours non committées sur `fix/learner-funnel-truthful-p0`.
Le travail initial, les sentinelles et les apports de #402 sont conservés.

### 1. Concurrence retenues / réservations

`132_shared_teacher_slot_claims.sql` ajoute une projection privée des intervalles
occupés, alimentée transactionnellement par les deux tables existantes. Une
contrainte GiST commune interdit leurs chevauchements, y compris avec les marges
entre cours. Ce n'est ni un deuxième moteur de réservation ni un ledger financier.
Les créneaux utilisent le fuseau du professeur, avec le fallback métier Toronto.

Les retenues payées ne deviennent pas libres simplement parce que leur horodatage
initial expire. La conversion d'une session transfère son occupation dans la même
transaction. Les écritures explicites libèrent les occupations expirées; aucun GET
ne fait expirer ou ne modifie une réservation. Les conflits existants arrêtent la
migration au lieu d'être réparés automatiquement.

Le test PostgreSQL couvre READ COMMITTED et REPEATABLE READ, retenue contre
réservation, expiration puis réactivation concurrente, marges, confidentialité et
la fonction réelle `fulfill_planned_package_order` de la migration 116. Ce dernier
test a révélé un défaut préexistant : `slot_date` date recevait une variable text.
La migration 133 ajoute uniquement le cast manquant dans la fonction installée,
avec vérification de sa forme avant remplacement. Aucun calcul, statut financier,
webhook ou fichier historique n'est modifié. Le deuxième appel reste idempotent.

### 2. Mesure des conversions

La migration 131 non déployée est complétée par :

- `learner_first_paid_lessons` : première leçon held/completed/paid non remboursée
  par élève sur tout le ledger existant, avec de vrais timestamps. Compter par
  période `first_paid_lesson_at`; ne pas confondre nouveaux convertis et inscriptions.
- `learner_waitlist_booking_links` : liens privés idempotents entre besoin et
  réservation. L'identité vient de l'adresse vérifiée du compte authentifié,
  jamais d'un identifiant de demande fourni librement par le navigateur.
- `learner_waitlist_conversion_totals` : numérateur des demandes ayant abouti à
  une leçon effectuée/payée et dénominateur des demandes qualifiées, séparés.

`reconcileLearnerWaitlistBooking` utilise la taxonomie et l'offre locale existantes,
le format exact, les préférences horaires et l'ordre chronologique. Les demandes
fermées ou non consenties ne sont pas rapprochées. L'appel après création ne peut
pas faire échouer une réservation valide si la mesure est indisponible : un log
technique signale alors la réconciliation à reprendre.

`reconcileLearnerWaitlistBatch(admin, afterId)` est la reprise bornée à 100 lignes
par curseur pour l'opérateur autorisé, notamment pour les forfaits créés en SQL.
Répéter jusqu'à null; une nouvelle passe couvre les nouvelles lignes. Les reprises
sont sans envoi de message et sans écriture dans les réservations/paiements. Elles
doivent être exécutées dans l'environnement autorisé seulement. Les associations
historiques non vérifiables ne sont pas inventées; le rapprochement utilise les
données publiques de discipline/localité disponibles au moment de sa vérification.

Les métriques sont privées, sans export publicitaire. La conversion recherche vers
entrée en réservation reste le funnel PostHog soumis au consentement. Ne jamais
diviser un total privé de leçons par un nombre de recherches navigateur en prétendant
mesurer une même cohorte. Les retraits/remboursements changent l'éligibilité nette
du rapport; les faits historiques distincts restent conservés.

### 3. Continuité du besoin et QA

Le paramètre `availability` est une enum normalisée, transmise par le finder et
les liens d'alerte à la recherche, puis aux deux GET du calendrier. Les jours et
créneaux utilisent le même prédicat de préférence dans le fuseau du professeur.
La modale affiche la préférence et permet de revenir à « Flexibles ». Un choix
explicite en ligne initialise bien le mode en ligne pour un professeur mixte;
il ne redevient pas silencieusement présentiel.

`learnerFunnelBrowser.mjs` exécute la QA sur un build local, en 375x667 et 1280x900.
Les réponses de demandes sont simulées, les requêtes externes et les autres écritures
sont bloquées. Il couvre local, alternative en ligne, inscription consentie à la
liste d'attente et erreur récupérable. Ce test ne remplace pas une transaction de
paiement en staging et n'envoie rien à un professeur ou à un élève réel.

### Fichiers de cette finalisation

- Migrations 131 (complétée), 132 et 133 (nouvelles).
- `lib/learnerWaitlistConversion.ts`, `app/api/bookings/route.ts` : rapprochement privé.
- `lib/learnerAvailability.ts`, `lib/learnerDemand.ts`, `lib/learnerDemandNotifications.ts` : besoin normalisé.
- `lib/teacherSlotQueries.ts`, GET available-days/slots : filtrage du calendrier sans mutations.
- `components/BookingModal.tsx`, recherche étudiant : préférence visible et format initial.
- Tests sharedSlotClaimsPostgres, learnerFunnelFactsPostgres,
  learnerWaitlistConversion, learnerPreferenceContinuity et learnerFunnelBrowser.
- Garde-fous safeDisclosures/audio : autorisations limitées aux nouvelles migrations
  avec assertions de sécurité; aucun contrôle désactivé.
- Ce rapport et `docs/ANALYTICS_AND_MONITORING.md`.

### Déploiement ultérieur, distinct de cette tâche

Faire relire les migrations 129 à 133 puis les tester sur une copie de staging du
schéma complet. Vérifier en lecture seule les conflits de créneaux existants avant
le DDL de verrouillage; ne jamais supprimer une réservation pour passer la migration.
Déployer le schéma avant le code, garder le cron de notifications en pause pendant
le smoke test. Autoriser séparément les reprises de mesure et l'activation du cron.
Un rollback applicatif doit conserver les consentements, les historiques et les
contraintes de concurrence; éviter un down destructif des nouvelles tables.

Aucune production, aucun secret, aucun prix ni aucune donnée réelle n'a été modifié.
Aucun commit, push, PR, merge ou déploiement n'est effectué ici.

### Résultats finaux de cette continuation

La QA a également révélé un mélange de langues entre le texte serveur de
`trouver-mon-prof` et le finder après hydratation. Le petit composant
`LearnerFinderLocalizedText` conserve le texte initial SSR puis suit le contexte
de langue existant; seules des chaînes sérialisables franchissent la frontière.
Le serveur, l'auth et le fournisseur global de locale restent inchangés. La QA
a été rejouée sur le build final avec une assertion sur le H1 français.

Commandes réellement exécutées pendant cette continuation, toutes PASS :

| Commande | Résultat |
| --- | --- |
| `npm run build` | PASS, y compris après correction de langue |
| `npx tsc --noEmit` | PASS sur l'état final |
| `npm run lint` | PASS : 0 erreur, 232 avertissements, pas zéro avertissement |
| `npm run test:launch-critical` | PASS, rejoué après les migrations et la correction de langue |
| `npm run test:auth` | PASS |
| `npm run test:security` | PASS, rejoué après la migration 133 |
| `npm run test:payments` | PASS |
| `npm run test:offers` | PASS |
| `npm run test:currency` | PASS |
| `npm run payment:safety` | PASS |
| `npm run test:seo-foundation` | PASS |
| `npm run test:seo-local-discovery` | PASS |
| `npm run test:schedule-intervals` | PASS |
| `npx tsx scripts/validate_i18n.ts` | PASS |
| `git diff --check` | PASS, avec avertissements Git de conversion LF/CRLF |

Tests ciblés exécutés avec `npx tsx <fichier>` :

- `tests/bookings/bookingSubmissionValidation.test.ts`
- `tests/bookings/publicCalendarReadSafety.test.ts`
- `tests/seo/localSeoBookingSemantics.test.ts`
- `tests/marketing/learnerDemandTruthfulness.test.ts`
- `tests/marketing/learnerDemandApi.test.ts`
- `tests/marketing/learnerDemandSupply.test.ts`
- `tests/marketing/learnerDemandDelivery.test.ts`
- `tests/marketing/learnerDemandNotificationRace.test.ts`
- `tests/marketing/learnerPreferenceContinuity.test.ts`
- `tests/marketing/learnerWaitlistConversion.test.ts`
- `tests/email/transportFailure.test.ts`

Tests PostgreSQL réels, PASS, avec `LEARNER_LOCAL_PG_URL` limité à localhost:55439
et `PSQL_PATH` vers PostgreSQL 18, dans des bases jetables créées et supprimées :

- `npx tsx tests/bookings/bookingIntervalConcurrencyPostgres.test.ts`
- `npx tsx tests/bookings/sharedSlotClaimsPostgres.test.ts`
- `npx tsx tests/marketing/learnerDemandPostgres.test.ts`
- `npx tsx tests/marketing/learnerFunnelFactsPostgres.test.ts`

QA : `node tests/marketing/learnerFunnelBrowser.mjs`, avec `PLAYWRIGHT_MODULE`
pointant vers le runtime local et `LEARNER_QA_BROWSER=msedge` : PASS aux deux
dimensions. Captures locales dans
`C:/Users/Utilisateur/Documents/Codex/2026-05-13/analyse-my-project-from-a-critical/learner-p0-qa-20261014`.
Les captures finales desktop/local et mobile/liste d'attente ont été inspectées.

Un premier lint a échoué sur l'extension `.cjs` du nouveau test navigateur :
le test est devenu `.mjs`, conforme au lint, sans suppression de règle. Le premier
test navigateur était bloqué par la bannière de consentement; il utilise désormais
le vrai bouton « Nécessaires seulement ». Ces échecs initiaux ne sont pas masqués.
Le build conserve l'avertissement existant `experimental.forceSwcTransforms`
ignoré par Turbopack. Pas de commande de formatage dédiée dans package.json.
`validate:launch` n'a pas été lancé comme commande unique; ses commandes
constitutives sont détaillées ci-dessus, sans prétendre à un autre journal.

### Verdict final et limites

**READY TO MERGE pour le code P0, après revue habituelle du diff et des migrations.**
Les trois blocages applicatifs de cette continuation sont résolus et les contrôles
exécutés passent. Cela ne constitue pas une validation du déploiement en production.

- Les tests SQL utilisent les migrations réelles sur un schéma local de fixture,
  pas une copie complète des données de production. Le préflight de conflits et
  l'application 129 à 133 sur staging restent requis avant déploiement.
- La QA navigateur couvre le finder avec API simulée. La continuité calendrier
  est couverte par les tests ciblés; aucun paiement réel ni parcours authentifié
  complet avec Stripe n'a été exécuté dans le navigateur.
- La réconciliation des réservations créées hors API reste une reprise opérateur
  explicite et idempotente, pas une nouvelle tâche planifiée activée silencieusement.
- Les avertissements lint et build mentionnés ci-dessus restent présents.

Le travail existant demeure non committé. Aucun système de production ni aucune
donnée réelle n'a été modifié; aucun email ou paiement réel n'a été envoyé.

### Contrôle pré-fusion PR #403

Après création du commit, `test:launch-critical` a détecté une exception manquante
dans `founderDecisionsAlignment.test.ts`, puis dans les garde-fous
`teacherLaunchCenter.test.ts`, `teacherProfileManagement.test.ts` et
`commissionModelCopy.test.ts`. Ces contrôles ne voyaient pas les migrations
non suivies lors des exécutions antérieures. Les cinq fichiers 129 à 133 sont
désormais autorisés explicitement avec les mêmes assertions de confidentialité,
d'exclusion transactionnelle et d'absence de modification financière que le
garde-fou safeDisclosures. Aucun wildcard ni contrôle désactivé. La suite critique
relancée après correction est PASS, ainsi que le lint ciblé et diff --check.
Aucune migration distante
n'est exécutée par cette préparation de PR.
