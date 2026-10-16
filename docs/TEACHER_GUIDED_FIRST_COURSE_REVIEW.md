# Guided first course review

Branch: `feat/teacher-guided-first-course`. Base:
`5ff7f81225deff5eda354b45c334cc2408c1c38a` (main / #404).
Isolated worktree: `teacher-guided-first-course`.
No production mutation, payment, message, migration or deployment performed.
The original learner-funnel worktree and its two untracked sentinels are untouched.

## Implementation

1. **Mon cours**: existing profile-management page in `?setup=1` mode. Prefilled
   name, biography, canonical disciplines, formats, existing pricing API, compact
   city/region/country and editable timezone. Existing publication checklist remains
   authoritative. Photo/video, AI, SEO, optional diplomas, multizone and introductory
   pricing controls remain in ordinary profile management, outside setup.
   Home-travel radius/rate controls appear only for the selected home format.
2. **Mes disponibilites**: existing precise weekly editor when enabled; otherwise
   existing legacy periods in mobile day rows. Duration stays editable. Existing
   activation, notice, exceptions, collisions and occupied-slot rules are preserved.
   The owner-authenticated, read-only preview is available in guided setup without
   changing global feature flags. No synthetic availability is used by the app.
3. **Mes paiements**: existing authenticated Connect refresh, then canonical listing
   capability from an owner-only endpoint. Paid booking, deferred request, contact,
   unavailable, unpublished and unknown remain distinct. `stripe=success` never
   establishes readiness. Focus/manual refresh rechecks the real server state.
   Explicit **Publier mon profil** now calls the existing owner-checked publication
   PATCH. Its GET supplies the checklist and eligibility; nothing auto-publishes.
   Missing availability links to step 2, other prerequisites to their course panels.

The only Connect route change is a fixed internal return for `flow=teacher-setup`;
ordinary callers retain `/onboarding`. No account creation, payment, commission,
refund, eligibility or authentication rule changed. Six legal acknowledgements remain.

## Resume and failures

- Versioned local drafts with seven-day validity, scoped by user/teacher/step.
  Expired records are ignored; this is not a background deletion service.
- Restore only when the recorded server baseline still matches; newer server edits
  win. No credentials, consents or private address lines in draft storage.
- Recoverable fields: name, bio, formats, price, coarse location, timezone, selected
  home settings, discipline edits, duration, legacy periods and precise intervals.
- Course navigation saves before leaving. Failed saves remain on the page. Precise
  intervals require explicit successful save before Next. Guided pricing does not
  silently autosave a restored draft; ordinary management keeps its autosave.
- Saved fields persist on the server; unsaved drafts and last step are browser-local.
  Accepted-consent users resume their step even with complete course fields. Explicit
  dashboard completion clears the stage marker only for a published, discoverable,
  complete profile with an actual paid-booking capability. Request/contact/unknown
  retain it. Storage failures show a warning.
- Payment refresh is abortable and duplicate-click guarded. Failed reads show
  error/unknown, never false readiness. No hosted Stripe interaction was performed.

## Before / after counts and blocking fields

Count logical groups in expanded panels, not each discipline checkbox. These are
exposed controls, NOT all mandatory. Exclude legal, AI, extra specialities and
Stripe-hosted requirements. Existing data prefill both versions.

| Core controls | Ordinary management before | Guided course |
| --- | --- | --- |
| Name, bio, photo, video | 4 | 2 |
| Discipline, format | 2 | 2 |
| Base rate, intro toggle, intro price | 3 | 1 |
| Manual location: two address lines, city, region, postal, country, radius | 7 | 3 |
| Correctable timezone | 0 | 1 |
| Total | 16 | 9 |

The alternative single-line address search is not another mandatory field.
Eight management sections plus SEO become four core sections in Mon cours, then
two named stages. Selected home format adds three existing controls; failed identity
retains remediation. First precise interval has day/start/end plus duration.

For one new discipline and one interval, excluding typing, consents and hosted
Stripe: old route has four panel saves, discipline save, interval save, two route
transitions, Connect launch and publication: **10 actions**, 11 if duration changes.
If starting private and completing availability after the course panel, returning
to that panel to publish adds a navigation: **11 / 12** for that reviewed scenario.
Guided: discipline save, course Next, interval save, payments Next (also saves
duration), Connect launch and explicit publication: **6 actions**. Add one explicit
precise-schedule activation when that existing feature requires it; no activation
is fabricated or bypassed. The earlier 5-action figure omitted publication.

Field groups across the whole path: **20 before / 13 guided** (16/9 course groups
above plus day/start/end/duration). Prefilled/defaulted values reduce actual typing;
these are not claims that every field must be manually entered. Conditional home
controls add three groups. Legal consent is separate: six acknowledgements plus
their existing confirmation action. Hosted Stripe requirements/actions are variable
and excluded from the six app actions, not counted as zero. A paid-bookable outcome
requires Stripe's actual completion, successful resync, publication and a real slot.
The fixture tests that final state, but does not measure a real hosted Stripe session.

Name/discipline identify the offer; rate retains minimum-price validation;
duration/timezone determine slots. Bio >=20 and coarse city/region remain required
by current publication rules, including online profiles. Home radius/rate retain
their existing checks. No consent, identity or payout condition was relaxed.
Stored timezone wins; otherwise use documented booking fallback and conservative
canonical launch-city suggestions, with explicit correction available.

## Changed files

- `lib/teachers/guidedSetup.ts`, `setupDraft.ts`: navigation, timezone, status and drafts.
- `components/teacher/TeacherSetupNavigation.tsx`: stage navigation/resume/warning.
- `app/(app)/onboarding/teacher/page.tsx`: resume after existing consent.
- `app/(app)/teacher/verification/page.tsx`, `components/ZoneStep.tsx`: compact course.
- `app/(app)/teacher/schedule/page.tsx`: guided availability and persistence.
- `components/teacher/TeacherDisciplinesEditor.tsx`, `TeacherWeeklyIntervalsEditor.tsx`:
  optional drafts, existing saves reused.
- `components/teacher/TeacherAvailabilityPreview.tsx` and preview API: authenticated
  guided preview; ownership and read-only computation unchanged.
- `app/api/teacher/location/verify/route.ts`: validate optional owner timezone update.
- `app/(app)/teacher/setup-payments/page.tsx`, `app/api/teacher/setup-status/route.ts`:
  refresh and owner-scoped canonical state, no public Stripe details.
- `app/api/stripe/connect/route.ts`: fixed internal guided return only.
- FR/EN/ES dictionaries; package.json focused test command; tests and this report.

## Original validation evidence (before publication follow-up)

- `npm run test:teacher-guided`: PASS; real bundled handlers, mocked auth/DB.
- `npm run test:auth`: PASS.
- `npm run test:schedule-intervals`: PASS including preview and precise scheduling.
- `npm run test:payments`: PASS; no external payments.
- `npm run test:security`: PASS.
- `npm run test:launch-critical`: PASS, full final rerun including staged new files.
- `npx tsc --noEmit --incremental false`: PASS.
- `node ../build-teaching-zones-readonly.cjs teacher-guided-first-course`: PASS.
  Runs unchanged `npm run build`, GET/HEAD-only guard, credentials only in memory;
  329/329 pages, TypeScript enabled. Existing forceSwcTransforms warning.
- `npx tsx scripts/validate_i18n.ts`: PASS, 3544 keys/locale.
- ESLint on all changed/new TS/TSX: exit 0, 0 errors, 19 warnings.
- `npm run lint -- --quiet`: FAIL, existing flat-config react-hooks plugin scope for
  `.cjs`. Reproduced with `node node_modules/eslint/bin/eslint.js
  tests/teacherZones/teacherTeachingZonesRouteRuntime.cjs`. That file, eslint config
  and lockfile are unchanged from HEAD. No rule suppressed.
- `git diff --check`: PASS.

Earlier launch-critical source assertions required adaptation: exact fixed Connect
return exception in three historical scope guards (negative tampering tests added),
pricing blur assertion now verifies the guided skip and retained normal save, and
home hydration assertion verifies the server baseline through draft restoration.
No financial assertion removed. The complete launch-critical rerun passed.
The historical audio task scope also names the two guided teacher API paths
explicitly; their actual handler tests enforce ownership and invalid-session rejection.

## Mobile QA / local preview

`node tests/teachers/guidedSetupMobile.cjs`, with PLAYWRIGHT_MODULE pointing to the
installed runtime and QA_OUTPUT_DIR=../teacher-guided-qa: PASS at 320, 375, 768 and
1280 px. Real components + production CSS, synthetic auth/DB/API boundaries.
Bio/duration/interval reload, failed-save/retry, save-before-next, Stripe-return
refresh order, readiness failure, no horizontal overflow or page errors verified.
Screenshots: course-mobile.png, availability-mobile.png, payments-mobile.png.
`QA_PREVIEW=1` runs the same local fixture and prints its URL for interactive review.

This is NOT a live authenticated end-to-end test or physical iPhone test. Automated
browser requests outside localhost are blocked. Before a future release, use a
staging teacher on mobile Safari to check consent, reload, interval failure/retry,
real sandbox Connect return, expired session and ordinary management. No payment.

## Limits / rollout

No migration, schema, dependency or lockfile changes. Existing discipline editor
multi-request persistence is unchanged; this does not add a DB transaction to it.
Unsaved drafts cannot survive browser storage deletion or move between devices.
Full lint is not green; resolve its existing configuration separately before
claiming completely green global validation. Review the 19 targeted warnings.
Mock Stripe QA does not establish successful hosted verification.

## PR 405 publication follow-up

Review found two defects: payments had no publication control; schedule Next could
overwrite the interval endpoint's newly saved coarse availability with stale empty
state when saving duration. The guided precise-editor path now leaves that projection
to its existing endpoint; ordinary schedule management is unchanged.

This follow-up changes the payments page, schedule page, identity-panel deep-link
handling, guided setup helpers, existing FR/EN/ES unpublished-state copy, focused
tests, browser QA, package test command and this report. No publication eligibility,
identity, consent, payment or ownership rule changed. No migration is needed.

QA no longer invents a `request` result independently of a private fixture.
`guidedPublicationHarness.cjs` executes the actual visibility GET/PATCH and status
GET with real eligibility and slot calculations, mocking only auth/database and
the locale lookup. Synthetic IDs/data are isolated per request. The browser uses
that harness; the interval fixture reproduces the endpoint's coarse projection.
Tests cover missing availability, refused publication, write failure, network failure,
private-to-public transition, request-to-paid state, contact, duplicate publication,
ownership, interrupted drafts, retained incomplete progress and completed exit.

Physical Safari still requires testing keyboard, storage eviction/private mode,
background/resume and navigation on a staging account. Stripe sandbox still requires
hosted onboarding cancellation, pending verification, successful return and resync.
Neither was performed; no real payment, message or production mutation is permitted.

### Follow-up validation (2026-10-16)

- PASS: `npm run test:teacher-guided` (including real publication/status handlers).
- PASS: `npm run test:schedule-intervals`, `npm run test:auth`,
  `npm run test:security`, `npm run test:payments`.
- PASS: `npx tsc --noEmit --incremental false`.
- PASS: `node ../build-teaching-zones-readonly.cjs teacher-guided-first-course`
  (unchanged `npm run build`, read-only guard, 329 pages, TypeScript enabled).
- PASS: `npx tsx scripts/validate_i18n.ts`, 3544 keys per locale.
- PASS: `node tests/teachers/guidedSetupMobile.cjs` using the installed Playwright
  runtime, actual page components and final production CSS; 320/375/768/1280 px.
  Publication is visible at 320 px. No horizontal overflow or browser exceptions.
  Screenshots outside the repo: `../teacher-guided-publication-qa/`.
- PASS: targeted ESLint on changed application/helper TypeScript and test sources,
  zero errors / 11 warnings. Global `npm run lint -- --quiet` still exits 2 with the
  previously documented missing react-hooks plugin configuration for CJS.
- PASS: `git diff --check`.

- PASS: final complete `npm run test:launch-critical` after the three exact-diff
  scope-guard adaptations below. The earlier failed runs are not counted as passes.

Full launch-critical reruns exposed three historical branch-scope guards that
inspect committed changes (the original uncommitted run did not catch them).
`teacherLaunchCenter`, `teacherProfileManagement` and `commissionModelCopy` now
reuse `hasOnlyGuidedStripeReturnChange`: it compares the entire Connect source and
accepts only the already-approved fixed internal return URLs. All other edits still
fail; negative tampering tests remain in the focused suite. No financial assertion
or rule was removed. Each affected suite passes individually.

The local synthetic preview deliberately rejects Connect POST; it cannot start a
hosted Stripe session. Simulated return/resync is covered, real sandbox return is not.
PR #405 is suitable for code review, not a claim of fully green global lint or
completed physical-device/Stripe acceptance. No merge or production deployment.

Only after review/authorization: normal code deployment, no database action.
Code rollback restores ordinary setup without deleting saved profiles/schedules;
older UI ignores isolated draft keys. No deployment or merge authorized here.
