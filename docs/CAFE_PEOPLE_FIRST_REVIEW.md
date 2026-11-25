# Cafe: people-first review

Date: 2026-11-16

Branch: `feat/cafe-people-first-20261116`
Base: `500aa0530fbf2300ba88c584146ea8f36f5b4704` (`origin/main`).
Independent worktree: `cafe-people-first`.

## Initial delivery boundary (historical)

Local preview only. No production migration, flag change, deployment, message,
notification, purchase, commit or push. Other worktrees are preserved.
Video stays disabled. Existing public rooms, rules, blocking, reporting and
authenticated server access are reused.

Preview: <http://localhost:55830/cafe/preview/personnes>

The preview uses the actual React components with an explicitly synthetic,
in-memory transport. Reload clears its people, invitations, messages and photo.
It is not evidence of a hosted two-account end-to-end test. The production
community transport never imports this demo.

## Interaction

- People first: optional photo, native/learning language filter, online filter,
  truthful online/offline labels and a short introduction with each request.
- Recipient must accept before either person can privately message. Crossed
  invitations do not auto-accept. Accept, decline, cancel and remove are provided.
- Private conversations reuse the existing composer, plain-text message
  rendering, report flow and nonce-based send protection.
- The Rooms tab retains immediate, scheduled and two-seat public rooms.
  A two-seat public room is not an accepted private connection.
- Offline directory visibility requires an explicit optional unchecked choice.
  Existing active-presence discovery still works. No public email, real name,
  contact information or account details are added to directory responses.
- The profile photo is optional and distinct from a teacher's marketplace photo.
  Current interfaces are French, English and Spanish.

## Implementation

### Database

`supabase/migrations/20261116201115_cafe_people_first.sql` adds:

- Opt-in visibility and avatar version on existing Cafe members.
- Private connections with participant foreign keys, state checks, nonce
  uniqueness and a unique unordered active pair.
- A connection destination on the existing message ledger, with an XOR
  constraint: exactly one public room or private connection per message.
- Connection attribution on existing moderation reports.
- A private `cafe-avatars` Storage bucket for processed WebP images.
- Three service-role-only entry points for people snapshots, commands and photos.

Existing room RPC signatures/lifecycle remain unchanged. The new entry points
delegate existing room commands, and separately authorize private connections.
All direct table access remains revoked; RLS is enabled. Definer functions have
empty search paths and explicit grants/revokes. No browser chooses its actor ID.
Active account, adult agreement and Cafe rules remain required.

The original global transaction advisory lock serializes request/accept/block/send
decisions. Repeated requests/sends reuse nonces. Private conversations never
appear in the public room collection. Blocking closes the connection; unblocking
does not reopen its history. Reconnecting after a seven-day cooldown creates a
new connection, not access to an old conversation.

Limits: 10 new requests/day; 500 active connections per member; existing message
and report limits; authenticated + IP rate limits. GET snapshots do not mutate
the message or connection records.

### Photos

`communityPhotos.ts` authenticates and authorizes before Storage access.
PUT/DELETE use same-origin validation; anonymous access is denied.
Uploads are streamed with a 4 MiB ceiling and decoded with Sharp, not trusted
from their filename or declared content type. JPEG/PNG/WebP only; SVG and
animation rejected. Output is a 384-square WebP with no source EXIF/GPS metadata
and a 256 KiB ceiling. Paths contain only server-derived IDs and random versions.
The shared client/server ceiling is below the documented 4.5 MB hosting request
limit: <https://vercel.com/docs/functions/limitations>. Over-limit real bytes are
rejected even with a forged Content-Length.

Photos are fetched through an authorized no-store endpoint, never a public bucket
URL. Replacement/removal retires the old immutable object. An ambiguous database
timeout retains the new object rather than deleting a possibly committed photo.

### Release gates

`CAFE_PEOPLE_ENABLED=true` additionally requires the existing community gate.
It is off by default. This mode forces video off at the page and API boundaries,
even if the independent provider flag is accidentally enabled.

The local runner has `CAFE_PEOPLE_ENABLED=false`: the shared PR405 local stack is
not migrated or written by the visual demo. Its existing environment adapter
checks the isolated Docker identity, rejects application env files and returns
only the local Auth/DB credentials. No external messaging/payment/provider keys
are available. The preview route additionally requires
`CAFE_COMMUNITY_PREVIEW_ENABLED=true` and refuses Production.

## Verification

Executed during implementation:

| Command | Result |
| --- | --- |
| `npm ci --ignore-scripts --no-audit --no-fund` | PASS; no dependency or lockfile changes |
| `npm run test:cafe-community` | PASS: existing SQL, API, integration, client, React, call and cleanup suites |
| `npm run test:cafe-people` | Final PASS: 56 SQL/API/photo checks plus React filters, invitations, retry retention, acceptance, private send/reopen, rooms, optional visibility and photo control |
| `node --import tsx tests/cafe/communityApi.test.ts` | PASS: 19 tests including forced video-off when both feature flags are set |
| `docker exec --workdir / cafe-people-validation-20261116 bash tests/cafe/run-community-postgres-tests.sh` | PASS: actual PostgreSQL concurrent last-seat claims, public block/send, crossed private requests and private block/send |
| `npx --no-install tsc --noEmit --incremental false` | PASS during initial implementation; final build also checks TypeScript |
| `node --import tsx scripts/validate_i18n.ts` | PASS: 3562 keys per locale |
| Focused ESLint on Cafe components, libraries, routes and new tests | PASS with two pre-existing warnings; no rules suppressed |
| `git diff --check` | PASS during implementation |
| `npm run test:cafe-pr2b` | PASS on rerun: entrance route, request lifecycle, approved media hash and 19 hero lifecycle checks |
| `npm run test:cafe-pr3b-room` | PASS: existing room contracts/hardening and 4 actual-component checks with mocked provider |

The first additional `test:cafe-pr2b` run caught a static assertion expecting
direct forwarding of the video flag. It was updated to require the stricter
people-mode video guard, with a real handler test proving the denial.
The assertion was not removed or relaxed. Calls remain unavailable in the new
mode independently of the old provider setting.

Browser checks executed on the local production-mode build at a 390 x 844
viewport:

- Italian plus online-only filters produce an honest empty result; reset restores
  all five synthetic people.
- Sending Lina an introduction fails via the explicit test control without
  clearing the draft; retry creates one pending invitation.
- Maya's received introduction is visible before accepting. Acceptance exposes
  the private composer. Sending, returning to Messages and reopening preserves
  the single demo message. There is no call or room-owner control in that view.
- Selecting the existing repository cafe photograph through the actual file
  chooser loads both profile avatars. Removing it restores initials. No person
  is portrayed as a real Cafe member; the synthetic account is visibly labelled.
- Public and scheduled rooms remain available through Salons.
- No console warning/error was captured during this browser sequence.

These browser interactions exercise the explicit in-memory demonstration. SQL
durability and access denial are tested separately, not inferred from the demo.

Database testing uses the six Cafe migrations on PGlite and on a disposable
PostgreSQL 17 container with no network and no published ports. The setup provides
minimal Auth/profile/Storage catalog fixtures; it is not a clone of production.
API tests use real handlers and real SQL, but inject verified-auth and Storage
boundaries. Sharp encoding/decoding is real. This does not substitute for a real
Supabase Storage/Auth deployment test.

## Remaining release checks

Before activating this feature, separately authorize and perform:

1. Review the migration against the target schema and existing Storage policies,
   including checking that no unrelated broad policy grants access to this bucket.
2. Apply the one migration to an isolated full Supabase environment, then test two
   synthetic permanent accounts through real Auth, Storage and server routes.
3. Verify photo replacement/removal, invitation receipt, offline reopen and
   blocked-photo/message denial across two real browser sessions.
4. Test physical Safari/iPhone and Android file selection; current mobile QA is
   browser viewport emulation, not a physical-device claim.
5. Review retention, account deletion and orphan-photo cleanup before public
   activation. No automated image moderation or new retention job is included.

Current bounds: at most 500 directory entries/active connections and the latest
100 messages per conversation; no history pagination, read receipts, typing
indicators, media messages, email/push notifications or global social feed.
Private means authorized participants only, not end-to-end encrypted messaging.
Moderators receive only the evidence explicitly submitted in a report.

## Initial local review result (historical)

READY FOR VISUAL REVIEW. Not approved for public activation.

- Final `node tools/cafe-local/app.mjs build`: PASS, exit 0; Next 16.2.9,
  complete TypeScript validation and 372 generated pages. The compiled browser
  bundle includes the final shared 4 MiB photo ceiling and compact header.
- Final focused lint: exit 0, zero errors and two unchanged warnings
  (`expectedVersion` in CafeSessionDetails; languageHint effect in
  CafeCommunityApp). No suppression added.
- Final `npm run test:cafe-people`: PASS, 56 database/API/photo checks and
  React interaction coverage.
- Final `node --import tsx scripts/validate_i18n.ts`: PASS.
- Final browser views: 390 x 844 mobile emulation and 1440 x 1000 desktop.
  No horizontal overflow or overflowing button labels in the inspected views;
  Spanish navigation also inspected. Optional offline visibility remains
  unchecked. Language pills use readable light-theme colors.
- No browser console errors/warnings captured in the exercised flow.
- Existing build warning: `experimental.forceSwcTransforms` is ignored by
  Turbopack. Configuration was not weakened to hide it.
- No remote CI run: the branch has not been pushed.

Evidence (ignored local artifacts):
`artifacts/cafe-people/mobile-people.jpg`,
`artifacts/cafe-people/desktop-people.jpg`.
The preview remains running on loopback port 55830. The disposable PostgreSQL
validation container was stopped; shared local stacks were not changed.

Migration SHA-256:
`0ff2e69126c7d99f5ca1d2b0632ec4349acada8e9e9a05bc2f0c4cdf4fbd8e6f`.
Its SQL was unchanged after the successful native PostgreSQL concurrency tests.

Read-only final checks confirmed the same existing untracked files and branch
status in learner-funnel and Cursor's Cafe worktree. No payment, booking, Auth,
course, staffrelay, Denise or other-worktree files were edited.

## Initial deployment proposal (superseded by authorized release below)

After visual approval and the release checks above: backup and target preflight,
apply only this additive migration, deploy the application with the people gate
off, then enable it for an approved test environment. Keep
`CAFE_ROOM_PROVIDER_ENABLED=false` and the synthetic demo disabled in Production.
No existing bookings, payment settings, progress or course access are involved.

Rollback first disables `CAFE_PEOPLE_ENABLED`. The original room entry points
continue working. Keep the additive schema, connection rows and private messages;
do not drop or relabel them as public room messages. Restore application code
only if necessary. A separate approved retention operation is required to delete
recorded conversations or photos.

## Authorized release validation - 2026-11-16

The owner authorized release after green checks, keeping video off, and separately
authorized only `20261116201115_cafe_people_first.sql` in Production after validation.
No global db push, payment/booking change, notification or other-worktree edit.

The full existing local Supabase stack (Auth, PostgREST, PostgreSQL17 and Storage)
was used, not the demo transport. `node tools/cafe-local/prepare-people.mjs`
applied only this migration in a transaction with 5s lock / 60s statement limits.
Pre-existing Cafe member/message counts were unchanged. The local runner opts in
with `CAFE_LOCAL_PEOPLE=true`; no production credentials or outgoing providers.

`$env:CAFE_LOCAL_PEOPLE='true'; node tools/cafe-local/people-acceptance.mjs`:
PASS against the complete production-built Next server at localhost:55830.
Two freshly provisioned synthetic permanent Auth accounts use real sign-in,
then the actual HTTP handlers and real private Storage API. All data created by
this run is deleted afterward, without altering pre-existing accounts.

Coverage: profile/language persistence; recipient-only acceptance; concurrent
invitation and message retry uniqueness; two-way DM; token refresh/reopen;
actual image upload, resize, EXIF removal, replacement and deletion; anonymous,
public URL, direct authenticated Storage and forged RPC denial; block/unblock
authorization; existing four-seat rooms; video denial; account-deletion flags.
The first run caught an incorrect *new harness* assumption that legacy public
rooms carry `kind=group`. The real contract has an optional `kind=direct`; the
test now asserts capacity, two participants and non-direct state. No product
rule or handler was altered. The corrected complete run is recorded separately.

Read-only hosted preflight: target Pratiqo `jwlbwmxoradmbuvqfkhe`; the five prior
Cafe migrations are installed and the new one is absent. Existing Storage
policies all constrain their own named buckets; none grants direct access to
`cafe-avatars`. No existing photo/account/message content was fetched.

Retention/account deletion review: the existing product deactivates accounts
and queues deletion for human review; it deliberately does not automatically
anonymize historical records. Cafe ready checks deny inactive/deletion-requested
accounts, including photos and private messages. This release preserves that
policy. A human deletion review must also remove that member's private
`cafe-avatars/<profile UUID>/` objects via the Storage API. Ambiguous failed
uploads can leave inaccessible orphan objects; no automated purge, image
moderation or new retention promise is claimed. Normal replacement/deletion
cleans the retired object. Do not delete physical Storage files through SQL.

Existing full build, TypeScript, Cafe/SQL concurrency, i18n and mobile/desktop
component evidence above remains applicable: production app/SQL code is unchanged
in this release pass. The new acceptance script tests HTTP/Auth/Storage, not two
physical browsers. Prior UI evidence is Chromium emulation. Physical Safari
and Android picker/background behavior remains unverified.

Final review correction: the photo rejection copy still said 5 MB instead of the
actual 4 MiB ceiling. All three translations now agree; a regression assertion
derives the expected number from the shared policy. Full standalone TypeScript
also found missing `email:null` in two new Auth test fixtures and unsupported
Testing Library `exact` options. The fixtures now implement the full Auth type;
anchored name regexes retain exact matching. No production Auth logic, check or
compiler setting changed. Consequently the final full build/TypeScript are
rerun, not inferred from the earlier build. Final `test:cafe-people` passes.
Full `npm run lint`: PASS, zero errors / 281 warnings; not warning-free.

Release sequence: verify final CI/head and no conflicts; recheck migration
absence and bucket permissions; apply only the approved migration transaction;
verify constraints/RLS/grants and preserved rows; enable `CAFE_PEOPLE_ENABLED`
for Pratiqo Production only, preserving video=false and demo=false; squash
merge the exact tested head; let Vercel rebuild from Git with production config.
Do not promote the locally built artifact or expose the synthetic preview.
Then read-only production smoke tests and deployment SHA verification.

Rollback reference before release: `dpl_CnsW1ETUjfT4iQkkmnoJtVbaXSXc`, Git
`500aa0530fbf2300ba88c584146ea8f36f5b4704`. Roll back application/people gate;
retain additive schema and private history. Never drop private data to restore
the old rooms. Hosted checks, actual application and deployment are recorded
in the release PR after they occur; this preparation is not proof of deployment.
