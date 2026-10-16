# Teaching zones: controlled installation of128 +134

## Compilation follow-up, 16 October 2026

The three generated-route TypeScript errors were reproduced, not merely inferred,
on detached base `f037ce477ab96b49aa5c95df1220cc8f8d90c5a2` in the separate
`teaching-zones-build-baseline` worktree. `origin/main` at review time is
`ee5081ad188153998f81d89112bfe746b2215574`; its tree is identical to that base.
No learner-funnel worktree changes were made.

Both worktrees used Node 24.15.0, Next 16.2.9, the same installed dependencies,
unchanged tsconfig/Next config and `node node_modules/typescript/bin/tsc --noEmit
--incremental false`. Before the fixes, both returned the same three TS2344
diagnostics: synchronous resolution params, analytics helper exports, and the
checkout consent constant export. The base `npm run build -- --webpack` also
compiled then failed the resolution-page type check. Webpack generated the route
contracts for that comparison; the final application build uses normal Turbopack.

Compilation-only fixes (separate commit from zone hardening):
- Resolution page unwraps `Promise<{ id: string }>` using React `use`; existing
  identity, queries and effect dependency remain the resolved case ID.
- Analytics helpers move verbatim to `lib/analytics/searchEventHandler.ts`;
  route retains only `runtime` and POST, which delegates to the same handler.
  Normalized source comparison confirmed extraction without logic changes.
- Both checkout consent constants become private. Values, checks, authentication,
  Stripe calls and payment behavior are unchanged. Runtime tests assert both
  existing 400 error codes before any network work.

The controlled installer now normalizes checkout line endings before hashing and
generating SQL. The SQL bundle is identical to the previously tested bundle after
removing carriage returns, including the historical schema-slice trailing CR.
History comparisons accept those line-ending differences only; edited SQL still
fails closed. No historical migration was edited. Canonical LF SHA256:
- 128: `62d7522a59fb6452b5316bf464d4d627ed60e06f29ae90d14178a81720ac03c5`
- 134: `7c3c2e1d5054768cf2dde0f211a6e9a49e2578554375d6266337b581b0c044cf`
- generated bundle: `e73e9986d3307f611169d7edf6828f60109a37b8ec70cba34a9d3d8826e0f9ff`

SQL evidence reused, not rerun: isolated Supabase PostgreSQL 17.6/PostGIS 3.3.7,
network-disabled container, `zones_fixed_1792180565533`, nine checks PASS (atomic
install/rollback; role grants/RLS; inactivity; capacity/replacement concurrency at
READ COMMITTED and REPEATABLE READ; upgrade/source/history preservation). SQL
semantics and database dependencies did not change. These are local database
tests, not production migration or real user acceptance tests.

Follow-up validation:
- `npm run test:teaching-zones-integration`: PASS, including portable history.
- `node node_modules/tsx/dist/cli.mjs tests/ops/nextRouteContracts.test.ts`: 3 PASS.
- `node node_modules/tsx/dist/cli.mjs tests/security/searchAnalyticsRateLimit.test.ts`: 8 PASS.
- `node node_modules/tsx/dist/cli.mjs tests/seo/localTeacherDiscovery.test.ts`: 16 PASS.
- `node node_modules/tsx/dist/cli.mjs tests/teacherSearch/teacherMultiZoneSearch.test.ts`: 4 PASS.
- `npm run test:payments`: PASS.
- `node node_modules/tsx/dist/cli.mjs scripts/validate_i18n.ts`: PASS, 3528 keys/locale.
- Targeted ESLint on the seven changed TypeScript files: PASS (outdated
  Browserslist database warning only); no lint configuration changed.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: PASS on
  the corrected tree (exit 0); same command failed with the three errors on base.
- `npm run build` via local `node ../build-teaching-zones-readonly.cjs`: PASS,
  normal Turbopack, all type checks enabled, 327/327 pages generated. The wrapper
  runs the unchanged npm command; it loads the existing three Supabase variables
  only in memory and adds a GET/HEAD-only fetch guard. Existing warnings:
  unsupported `experimental.forceSwcTransforms` and optional zones view missing
  with the intended legacy-city fallback. No secret values were printed.
- `git diff --check`: PASS.
- CJS ESLint is unavailable with the repository's current flat config: rule
  `react-hooks/immutability` references an absent plugin for this extension.
  Reproduced on the unchanged base using `node node_modules/eslint/bin/eslint.js
  --print-config scripts/check_teaching_zones_deployment.cjs`; no rule disabled or
  configuration modified. Syntax checks (`node --check`) and runtime tests pass.
  This is not a claim of a fully green repository-wide lint/launch suite.

Review readiness: compilation and requested targeted validations PASS. Open for
human review, not authorization to merge or apply SQL. Broader launch validation,
CJS lint configuration and real teacher end-to-end acceptance remain distinct.
Installation still requires the controlled **128 schema-only + 134** bootstrap;
raw fresh `db push/reset` remains unsupported. No production SQL/history change,
booking, notification or payment was performed. Original learner-funnel worktree
retains its two untracked sentinel files, untouched.

Environment failures are not hidden: initial Turbopack run could not traverse an
external node_modules junction. Copying the identical dependencies locally fixed
that without a config/dependency update. The first corrected normal build passed
compilation/TypeScript but failed SEO prerender because this worktree had no
Supabase environment. The configured rerun loads only the three existing Supabase
variables in memory, with a GET/HEAD-only fetch guard; no credentials are stored
in this branch and no production mutation is allowed. Initial test starts during
the dependency copy failed module resolution and were rerun after copy completion.

## Historical integration review, 16 October 2026

The build blockers and no-commit status below describe the earlier review only;
the compilation follow-up above supersedes them.

No application handler or discovery algorithm needed replacement. The real PUT
handler is executed by teacherTeachingZonesRouteRuntime.cjs with only external
auth/DB boundaries mocked. Missing/invalid bearer gives401, missing owned profile
404, body-supplied teacherId400. Query-supplied teacherId cannot override the
profile obtained via auth.getUser(token) then teachers.user_id=user.id. The successful
privileged RPC uses that server-derived ID and preserves is_active=false. Existing
SQL effective-role tests already prove the RPC is available to service_role only;
they were not rerun in this review without a change to the SQL.

An existing empty zones view returns the unchanged teacher objects. The new test
checks person/both formats in the declared city remain local, while online-only,
another city and missing city remain nonlocal. Missing coordinates stay missing.
The canonical hasDeclaredLocalSupply implementation is reused, not duplicated.

Reproducible deployment preflight (read-only history export, not fabricated input):

```sql
SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY version),'[]'::jsonb)
FROM supabase_migrations.schema_migrations m;
```

Save that query's JSON array securely, then:

```powershell
npm run check:teaching-zones-deployment -- <history-array.json>
```

-128 absent: exits2, refuses standard push; use the reviewed bootstrap generator.
-128 schema-only +134 present: verifies exact executed statements, allows the
  standard version-based migration planner to skip both versions. This was checked
  against the real isolated history in zones_fixed_1792180565533, not just a mock.
-Partial, original historical128, or altered statements: stops for review.

This is a REQUIRED operational gate, not a modification of Supabase CLI itself.
Running raw db reset/db push on a completely new database would still execute the
original unsafe128; it is NOT a supported deployment path. A full new application
database must stop its initial migration sequence before128, use the controlled
bootstrap, then continue remaining migrations by version. A full0-to-latest reset
was not tested here. Do not describe it as safe or automatically guarded.
Future standard deployments after the recorded bootstrap skip128, so its original
backfill is not silently rerun. No historical record is forged or repaired.

Review-stage commands:
- npm run test:teaching-zones-integration : PASS (real handler, deployment plan,
  six fallback cases).
- tsx tests/seo/localTeacherDiscovery.test.ts :16PASS.
- tsx tests/teacherSearch/teacherMultiZoneSearch.test.ts :4PASS.
- Read-only local history -> plan : standard-after-bootstrap,128/134 skipped.
- npm run build : blocked by Turbopack external node_modules junction.
- npm run build -- --webpack : first attempt sandbox EPERM writing.next/types;
  elevated retry compiled successfully, then failed Next's type validation on
  app/(app)/resolution/[id]/page.tsx: synchronous params instead of Promise.
- tsc --noEmit --incremental false : initial run additionally caught an invalid
  Teacher test fixture, now corrected. Remaining generated-route diagnostics:
  resolution params, parseSearchEventPayload exported by analytics/search-event,
  RENEWAL_CONSENT_REQUIRED_ERROR_CODE exported by stripe/pro/checkout.
  These three application files have zero diff against HEAD f037ce47. No baseline
  build was rerun; unchanged source is established, not a claim of a green base.
- git diff --check : PASS. Integration tests rerun after fixture correction: PASS.

Final readiness: targeted integration evidence complete, but NOT globally green
or declared merge-ready. Resolve/review the existing route type issues separately,
then rerun build/TypeScript. Stripe and unrelated application code left untouched.

Diff inventory (all in isolated fix/teaching-zones-migration-hardening):
134 SQL hardening; controlled installer generator; deployment preflight gate;
PostgreSQL integration runner; actual GET/PUT runtime tests; deployment history
tests; additional empty-view fallback test; package scripts; this runbook.
Original128 and production application routes unchanged. No commit, push or deploy.

New tests use esbuild already installed through the repository's toolchain; no
dependency version or lockfile changed. No production query or write in this review.

Status: isolated integration tests PASS; production application NOT authorized
or performed in this change. Original128 is preserved byte-for-byte.

## Deployment paths

### Pratiqo production:128 absent,129-133 present

Do NOT run a global db push or apply original128 by itself. Its historical
backfill and default function grants are unsafe. Generate the reviewed bundle:

```powershell
node scripts/prepare_teaching_zones_install.cjs <new-output-file.sql>
```

This tool has no database connection. It checks the exact original128 SHA256,
uses only its schema section, immediately installs134, asserts the effective
client permissions, and records the SQL actually executed in migration history.
The128 history name explicitly states schema-only/no-unverified-backfill. This
is a first application, not a repair of an existing history entry. Obtain approval
of this explicit variant and of134 before execution; do not silently present it
as execution of the full original128 file.

The omitted32 historical candidates are not deleted from teachers. No automatic
physical zone, travel capability, radius or legacy coordinate is invented. Existing
location fallback continues; teachers can subsequently enter verified zones via
the existing authenticated management flow. This conservative bootstrap does not
purport to validate the five online-only candidates as local supply.

The lot executes in one transaction with5s lock timeout/120s statement timeout.
No window exposes the vulnerable RPC. It locks teachers and migration history,
not booking/payment tables;134 locks the zone table. Any error rolls back both
new history entries and the entire schema addition. No129-133 history is changed.

### Other environments with128 already installed

134 is a forward hardening migration. It preserves all existing zone fields and
timestamps while assigning the new capacity slots. It stops if a teacher already
has more than three active zones. Do not silently delete/reclassify those rows.
Review existing historical coordinates and online-only zones separately:134
intentionally cannot distinguish teacher-entered zones from imported ones and
does not delete user work. These environments are NOT cleared for public rollout
solely by the fresh-install test. Do not use the fresh-install bundle there.

## Fixes

- Explicit REVOKE for PUBLIC,anon,authenticated removes Supabase's direct default
  EXECUTE grants on the replacement RPC; only service_role can call it. Existing
  API ownership/auth checks remain intact. Internal trigger functions are revoked.
- Active zones occupy slots1..3, enforced by CHECK + unique index per teacher.
  The trigger assigns slots; clients cannot forge a fourth. Concurrent snapshots
  may receive a uniqueness/serialization error and must reload/retry. Safety is
  enforced without relying on a racing COUNT or advisory lock alone.
- Full replacement locks the teacher row; replacement never merges two submissions.
- is_active=false is respected and clears primary status/active capacity.
- Unspecified student-home capability defaults false in the RPC.
- Fresh bootstrap imports no ambiguous historical locations; no public-coordinate
  provenance is inferred from a raw location.lat field.

## Validation

Real integration runner (requires Docker CLI and an explicitly isolated restored
Supabase17.6/PostGIS3.3.7 container with backup_atomic_success as baseline):

```powershell
$env:ZONES_TEST_CONTAINER='pratiqo-migrations-129-133-20261016'
node tests/teacherZones/teacherTeachingZonesPostgres.cjs
```

The runner refuses network-enabled containers or published ports, supports no
production connection, uses new database names and synthetic owners, and tests:
atomic rollback/install; anon/auth RPC denial; owner/foreign RLS; service access;
inactive roundtrip; concurrent INSERT/replacement at READ COMMITTED and REPEATABLE
READ; sequential capacity and forged slot safety; upgrade preservation of existing
zone fields; teachers/bookings/payments/claims preservation; history129-133 intact.

Five existing suites also pass (23 assertions): Schema,Rls,Api,Fallback and
teacherMultiZoneSearch. Their static-source assertions about original128 are NOT
evidence that original128 is safe; real effective-role SQL tests are authoritative.
No application runtime/TypeScript files changed, so no production build or full
launch suite is claimed. JavaScript syntax checks and git diff --check also run.

## Final application checklist (requires separate authorization)

1. Verify deployed code, linked project and version inventory again. Stop on
   partial128/134 installation or changed SQL checksum. Verify a current restorable
   backup, including new data since the earlier16October backup if necessary.
2. Confirm expected empty zone table before installation and no pending teacher
   zone-edit window. Review the generated lot and exact new history statements.
3. Apply ONLY the approved generated lot using psql -X -v ON_ERROR_STOP=1. No
   global db push, migration repair, bookings, payments or notification calls.
4. Check128(schema-only) and134 once each;129-133 unchanged. Verify grants under
   anon/authenticated/service roles, RLS policies, capacity CHECK/index, triggers,
   safe search_path and PostgREST reload. The zone table must initially be empty.
5. Read-only smoke: public search/profiles/local pages/calendar, owner GET with
   authorized session. No real zone edit or booking test without authorization.
6. Before COMMIT failure => automatic rollback. After COMMIT, prefer forward fix;
   never DROP user-entered zones as a casual rollback. Export/reconcile new edits
   before any explicitly approved restoration.

No automatic deployment, migration or outbound message is performed by these tools.
