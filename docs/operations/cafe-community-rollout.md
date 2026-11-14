# Café community release and verification

The review branch implements the community experience. No hosted environment values, production database, production traffic or live invitation messages were changed while preparing it. The existing PR #462 remains a separate dependency.

## Entry points and first release

| Surface | Entry | Result |
| --- | --- | --- |
| Public Pratiqo header | Café des langues | Existing account sign-in, then community profile/lobby |
| Student and teacher navigation | Café | Same role-neutral community |
| YoPratiqo hub and learning headers | Café | Selected course language hint and return to the current Yo page |
| Lobby | Join / create now / choose a date | Text conversation or scheduled room |
| Text room | Invite to call | Recipient can accept or decline; each person separately joins video |

The navigation ships visibly from day one. All community languages are available together. The first production gate may open text while video remains closed until the real provider/device checks pass. No exercise completion is required to discover or use Café. Only actual presence and created rooms are displayed; an empty room list invites the person to start or schedule one.

## Configuration

| Variable | Review / release use |
| --- | --- |
| `CAFE_V1_ENABLED` | Existing overall Café gate |
| `CAFE_COMMUNITY_ENABLED` | Select the new community and enable its APIs after applying its migration |
| `CAFE_ROOM_PROVIDER_ENABLED` | Allow new call invitation acceptance and provider joins; active clients stop when their status check observes it off |
| `CAFE_COMMUNITY_PREVIEW_ENABLED` | Explicit synthetic preview only; keep off in production |
| `DAILY_API_KEY`, `DAILY_DOMAIN`, `CAFE_DAILY_ROOM_HMAC_SECRET`, `CAFE_DAILY_PARTICIPANT_HMAC_SECRET` | Existing server-only Daily credentials/configuration; never copy values into reports |
| `CRON_SECRET` | Secures the deployed close-only cleanup endpoint |

### Optional cleanup retry scheduler

The existing Vercel Hobby deployment rejected a one-minute cron before building the preview. This branch leaves the two pre-existing daily Vercel schedules unchanged and instead prepares `.github/workflows/cafe-community-cleanup.yml`. It makes an authenticated POST to `/api/cron/cafe-community-cleanup` every five minutes, offset to minutes 2, 7, 12, …, 57, only after an explicit opt-in. No hosted settings or account plan were changed.

| GitHub setting | Required value |
| --- | --- |
| Repository variable `CAFE_COMMUNITY_CLEANUP_ENABLED` | `true`, only when deliberately enabling the deployed retry worker |
| Environment | `cafe-community-cleanup`, with deployment branches restricted to the reviewed default branch |
| Environment variable `CAFE_COMMUNITY_CLEANUP_ORIGIN` | `https://www.pratiqo.ca`, the canonical production origin |
| Environment secret `CAFE_COMMUNITY_CLEANUP_CRON_SECRET` | The same value as the deployed `CRON_SECRET`; never put it in workflow source or command arguments |

The workflow performs no checkout or dependency execution. It sends the credential only to the exact cleanup path on an allowlisted HTTPS Pratiqo origin, refuses redirects, and stops the request after 45 seconds. Logs contain only status codes or generic failures. The same opt-in applies to manual dispatch. The fixed production origin allowlist intentionally cannot be repurposed to send its credential to an arbitrary development or preview deployment.

[GitHub schedules](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule) run only from the default branch and may be delayed or dropped under load. This is a best-effort retry interval, not a five-minute teardown guarantee. Before enabling it, review Actions usage allowance/cost, environment access controls and monitoring of missed or failed runs. Configuration in a PR is not proof of a deployed scheduler: verify actual authenticated executions and backlog draining before enabling video. For the development acceptance pass, use the environment's own authenticated close-only endpoint without changing this production origin allowlist.

Member mutations already attempt immediate provider teardown. The scheduled retry handles remaining durable obligations, at most three per invocation. The endpoint is deliberately independent of Café/video feature gates: missing credentials, failed cleanup or an incomplete backlog returns an opaque failure and retains pending obligations. Keep video closed if this retry capacity or the observed scheduling reliability is insufficient for the pilot.

## Deployment order

1. Review the stacked PR and its dependency. Resolve any merge conflicts and rerun checks on the exact resulting commit.
2. Apply the existing four Café migrations, then `20261113111051_cafe_community_text_first.sql`, to the linked development environment. Confirm intended migration history before applying; this change has not applied any hosted migration automatically.
3. Verify exposed schemas, RLS and explicit function privileges in that actual environment. `anon` and `authenticated` must not invoke trusted-actor RPCs; service-role must not directly query community tables. Run the Supabase security/performance advisors there. Local fixtures are not a hosted advisor result.
4. Configure the development cleanup secret and exercise its close-only endpoint with that environment's own credentials. Test a failed provider teardown followed by a successful retry; confirm a newer outbox generation cannot be acknowledged by an older worker. Before production video activation, configure and opt into the scheduler above after it reaches the default branch, then verify actual runs and backlog draining.
5. Enable the community in development and perform the real member acceptance pass below. Keep the synthetic preview distinct from these checks.
6. Review adult onboarding/rules, text/report retention and moderation coverage for the intended pilot. The current implementation has an attestation, not identity or age verification. It retains messages/reports until their documented deletion cascades; automatic time-based text/report purging is not yet implemented.
7. Review the release candidate and production environment changes before activating it. Ship the visible navigation with the community. Enable video after real Daily validation succeeds. No automatic production activation is part of this branch.

## Real acceptance pass

Use separate permanent development accounts and isolated browser contexts. Do not reuse an administrator token for ordinary participants.

- Create mother-tongue/learning-language profiles outside French and Spanish, such as Japanese, Swahili and Italian. Confirm the language catalogue does not depend on Yo courses.
- Create an immediate room, wait, and join from another account. Confirm creator-inclusive capacity, names, languages and presence. Close a tab and verify eventual lease expiry. Repeat last-seat joins concurrently.
- Create a future room in one time zone and inspect it in another. Verify the same instant, RSVP behaviour, creator presence at opening, cancellation and empty states.
- Send text from both sides. Retry a send after losing its first response and confirm no duplicate. Confirm a nonmember cannot retrieve chat; leaving/rejoining does not reveal the missed interval.
- Accept a call invitation. Verify neither device starts before explicit per-person Join/media consent, then test actual camera/microphone on both sides. Try direct call URLs and token requests from a third account.
- Block during a live call and during an in-flight join. Confirm local capture stops, server reads/joins reject contact, both provider identities are ejected/banned, the room is removed, and retries cannot reconnect. Repeat after account deactivation and account deletion. Check the outbox if any provider operation fails.
- Select one message as report evidence, block, and submit the report. Confirm the admin queue contains only selected evidence; an ordinary member cannot read it. Cancel a report and verify the block remains. Make a report request hang and verify Block remains available.
- Return from video to the text room and from Café to the exact Yo lesson. Confirm text/course documents deny media delegation again. Check desktop and a real mobile device in addition to emulation.

Record the commit, environment, browsers, accounts represented by non-sensitive aliases, outcomes and provider operation status codes. Never include tokens, secrets, raw request headers or private conversation bodies in evidence artifacts.

## Automated checks

```bash
npm run test:cafe-community
npm run test:cafe-pr3b-room
npx tsc --noEmit
bash tests/cafe/run-community-postgres-tests.sh
```

The native PostgreSQL script requires a fresh disposable database and the usual `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD` and `PGDATABASE` connection settings. It creates synthetic users only. The workflow runs PostgreSQL 17, contract/integration/React tests, and a normal-CSP production build for browser interaction tests.

The explicitly labelled preview route is `/cafe/preview/communaute`; its three gates are shown above. `scripts/cafe-community-browser.ts` writes synthetic desktop/mobile evidence under `artifacts/cafe-community/`. Its assertions include denied chat media headers, no Café API/Daily network calls, and no horizontal overflow. It provides no evidence of real account presence or live Daily video.

## Stopping a rollout

Disable the video gate to stop new invitation acceptance and token minting. Open call pages stop media when their next status check observes the change. Keep Daily credentials and the close-only cron available while draining obligations; disabling those would remove the mechanism needed to finish teardown. Disable the community gate if necessary after active calls are drained. Do not drop private tables or the detached outbox as a rollback step.

Watch unsuccessful joins, command latency, stale presence, cleanup backlog/age, unresolved moderation reports and the share of new visitors reaching a genuine conversation. This version introduces no external analytics or outbound notifications. Use actual service evidence when evaluating the pilot; synthetic preview counts are never product metrics.
