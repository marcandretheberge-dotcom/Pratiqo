# Cafe release readiness - 2026-11-16

## Local validation scope and verdict (before release authorization)

**Local text experience: READY FOR REVIEW. Full public/video activation: NOT VERIFIED.**

- Base: `8f52ade60a23b588ec7d892a3d6ef190df1d8f41` (`origin/main` when this worktree was created).
- Branch: `fix/cafe-release-readiness-20261116`, isolated worktree `cafe-release-readiness`.
- Cursor's Cafe worktree was not edited; its final status remains main plus its pre-existing untracked artifacts and Supabase configuration. Learner-funnel, Staffrelay, Denise and the other worktrees were not used or changed.
- No commit, push, hosted environment change, production migration, deployment, external message or paid-provider operation in this pass.
- Earlier readiness documents under Cursor's ignored artifacts are historical. Their statements that #462/#464 are unmerged are no longer current.

## Corrections

1. `CafeCommunityApp.tsx`: show the existing code of conduct and privacy links beside the required confirmations in FR/EN/ES. New tabs preserve unfinished input. No new legal policy, acceptance version or preselected consent was introduced. The existing Cafe-specific policy and retention still need owner review before public activation.
2. `communityUi.test.tsx`: assert both document destinations, safe new-tab behavior and an unchecked initial rules confirmation.
3. `communityCleanupCron.test.ts`: normalize Windows CRLF before extracting the workflow's JavaScript. Three tests failed at extraction, before any scheduler assertion; all eight now execute. No scheduler, credential allowlist, timeout or security assertion was weakened.
4. `scripts/cafe-community-two-account-browser.ts` now delegates to `tools/cafe-local/acceptance.ts`: replace stale selectors and the incorrect assumption that returning members skip language selection. Do not read old token artifacts, update shared accounts, or clear other users' rooms/blocks.
5. `tools/cafe-local/env.mjs` / `app.mjs`: reuse the existing PR405 adapter for a full local production build/runtime. No application env file is accepted. Fixed loopback origins, isolated Docker identity check, server network guard, local-only CSP exception; no Daily/Stripe/email/SMS/cron credentials. No production config changed.
6. `cafe-community-rollout.md`: update merged-code status and reproducible local commands.

## Actual browser evidence

Application: `http://localhost:55820/cafe`, full optimized Next build, not fixture transport.
Backend: existing PR405 local Auth/PostgREST/PostgreSQL at `http://127.0.0.1:55421`.
Two newly created synthetic members plus a separate synthetic administrator. Real password sign-in establishes session cookies; the production Google sign-in interface was not tested or changed. Credentials remain in memory. Accounts created by each run are deleted afterward; existing Cursor fixtures remain intact.

Final run completed at **2026-11-16T16:15:09.326Z**. Eleven assertions passed:

- New desktop member chooses mother tongue/practice language and confirms adult/rules choices.
- Failed mobile profile save preserves entered name and languages; retry persists them.
- New mobile member completes onboarding using the real handler.
- Returning member explicitly chooses languages again, with existing selections preserved.
- Both accounts join a real creator-inclusive two-person room.
- Lost response after a committed message is retried with the same nonce; exactly one row/message remains.
- Reload, language selection and rejoining restore entitled history; no invented automatic resume.
- Video invitation controls remain absent; zero microphone/camera requests.
- A selected message reaches the moderation view; member access returns 403; admin access returns 200 and only one selected evidence message is attached.
- A persisted block prevents a subsequent server message; it never reaches history.
- No uncaught page errors, no horizontal overflow at 1280x900 / 390x844. No external origins requested.

Evidence (ignored, synthetic only):

- `artifacts/cafe-community-live/two-account-browser-report.json`
- `A-language.png`, `B-language.png`, `A-messages.png`, `B-messages.png`, `admin-report.png` in that directory.

Earlier runs were NOT passes: startup preceded the server, a mobile install invitation needed normal dismissal, several old test selectors/query assumptions were wrong, and a test-injected function captured a tsx `__name` helper. Those harness defects were corrected, not ignored; the final zero-page-error assertion stayed enabled. This is Chromium desktop/mobile emulation, **not physical Safari/iPad/iPhone or live Daily proof**.

## Executed validation

| Command | Actual result |
| --- | --- |
| `npm ci --ignore-scripts --no-audit --no-fund` | PASS, existing lockfile; no dependency changes |
| `node tools/cafe-local/app.mjs build` | PASS, normal full `next build`, Next 16.2.9, 372 static pages, isolated backend; existing forceSwcTransforms/Turbopack warning |
| `npx tsc --noEmit` | PASS, including the updated acceptance runner |
| `npm run lint` | PASS exit 0, **0 errors / 282 warnings**; not warning-free |
| `npx eslint components/cafe/community/CafeCommunityApp.tsx tests/cafe/communityUi.test.tsx tests/cafe/communityCleanupCron.test.ts scripts/cafe-community-two-account-browser.ts tools/cafe-local --quiet` | PASS, final changed files |
| `npm run test:cafe-community` | PASS: 23 database checks, 18 API tests, real SQL-to-handler integration, client language/time-zone tests, 15 React scenarios, mocked provider/video and 8 cleanup tests |
| `npm run test:cafe-pr2b` | PASS, front door, loading/errors, 19 media lifecycle scenarios, approved video hash, public entrance and Praktikos |
| `npm run test:cafe-pr3b-room` | PASS, state/contracts/hardening and 4 actual-component tests with mocked network |
| `npm run test:cafe-architecture` | PASS |
| `npm run test:cafe-invitation` | PASS, including local CSP isolation guard |
| `npx tsx scripts/validate_i18n.ts` | PASS, 3562 keys per locale |
| `npx tsx scripts/cafe-community-two-account-browser.ts` | PASS, eleven real local browser assertions above |
| `bash tests/cafe/run-community-postgres-tests.sh` | PASS inside disposable native PostgreSQL 17, see below |
| `git diff --check` | PASS |

The unchanged native SQL runner was executed in a newly created `cafe-readiness-pg-20261116` container with **no network and no published ports**. Only tests and the five Cafe migrations were copied into it. Windows bind mounting failed, so file copying was used; CRLF was normalized on the temporary shell-script copy, not the SQL. Image: `sha256:ff87138949ad9a46f32ff23bd6852b52ce024a13dffe9b4087be98292cdd3b4f`. Execution:

```sh
docker exec --workdir /repo cafe-readiness-pg-20261116 bash -c "sed 's/\r$//' tests/cafe/run-community-postgres-tests.sh > /tmp/cafe-tests.sh && bash /tmp/cafe-tests.sh"
```

Permissions/capacity/private text/mutual video/block/report/cleanup passed. Two genuinely concurrent connections competing for the last seat produced exactly one success and one capacity-full result. A message waiting behind an uncommitted block was denied after commit, with zero message rows and no deadlock. This disposable test does not establish the production migration history. The named test container and its anonymous volume were removed afterward; the PR405 stack was preserved.

## Remaining release gates

- Verify target hosted schema/history and configuration before any activation. No production reads or writes were needed for this pass; production status is not asserted.
- Video remains disabled locally. Real Daily camera/microphone, provider teardown/retry, account-deletion teardown and return-to-course require an authorized isolated provider setup and real devices. Automated provider tests are not that evidence.
- Verify the close-only cleanup worker and actual backlog draining before video. The existing GitHub scheduler remains opt-in; no schedule was enabled.
- Owner review of adult community rules, moderation coverage and retention. There is no automated time-based message/report purge; do not claim otherwise. Existing document links improve access, not legal approval.
- Physical Safari/iPad/iPhone, permission prompts, keyboard and background/resume behavior remain untested. No tunnel was opened.
- The local rate limiter has no Upstash credentials; this run is not proof of hosted rate limiting. Automated fail-closed limiter tests passed; verify configured hosted behavior separately.
- No new GitHub CI run was triggered because the branch was not pushed. Local pass is not a hosted CI status.

## Review and rollback

### Follow-up: unreadable Entrer action

The signed-out entrance uses an anchor, while the signed-in entrance uses a button. The generic `.page a { color: inherit }` selector overrode `.primary` and rendered pale text on the cream action background. Reproduced on the actual local `/cafe` response: `rgb(245, 236, 223)` on `rgb(239, 227, 210)`, contrast **1.08:1**.

The default link selector is now `.page :where(a)` so explicit action variants win without `!important`, new colors or changes to authentication/navigation. The same approved dark text/cream background remains: **13.67:1**, **14.94:1** on hover.

`npx tsx tests/cafe/cafeActionContrast.test.ts` first failed against the old CSS, then passed all 12 checks using the actual stylesheet in Chromium: links and buttons, desktop/mobile, default/hover/focus. Added this test to the existing Cafe browser CI job after Chromium installation. `npm run test:cafe-pr2b`, targeted ESLint and `git diff --check` passed again. No hosted CI run or deployment was triggered.

The full isolated `node tools/cafe-local/app.mjs build` passed again (including TypeScript and 372 static pages). Restarted the same local preview at `http://localhost:55820/cafe`. Actual signed-out page verification at 390px and 1280px confirmed dark `rgb(33, 25, 20)` text on cream, HTTP 200, a working link to the unchanged `/connexion?next=%2Fcafe`, and zero page errors. Screenshots: `artifacts/cafe-community-live/entrance-contrast-390.png` and `entrance-contrast-1280.png`. No account was created or signed in during this follow-up.

Review this small application change and the reproducible test tooling first. Keep synthetic preview flags, local origins and local credentials out of hosted production. The existing rollout document defines the separately authorized migration/gate sequence.

This diff has no migration. Reverting its application changes removes the two document links and restores the previous link-color specificity (including the unreadable entrance action). Existing community data, accepted confirmations and call-cleanup obligations must not be dropped. If rolling back an activated Cafe later, close video first and retain the provider credentials/cleanup worker until obligations drain; then close the community gate if necessary.

## Authorized code-only release preparation

The owner subsequently authorized push, merge and production deployment after green required checks, with video remaining off. The preceding sections describe completed local validation, not a hosted release.

- Fresh `origin/main` is still `8f52ade60a23b588ec7d892a3d6ef190df1d8f41`; no integration changes were needed.
- The current Pratiqo production deployment is `dpl_55LJpKCSUZP8JdSfng6N1bVqAtFg`, serving that same SHA. Retain this deployment as the rollback reference.
- Read-only project configuration inspection found no configured `CAFE_*` or `DAILY_*` variables. The existing fail-closed defaults therefore keep V1, text community and video-provider gates off. Preserve these values; this release does not open the rooms or change the approved decorative entrance film.
- No migration, environment update, provider operation or local-build promotion is authorized by this code-only release. Production must rebuild from the reviewed Git commit using its existing production configuration.
- Record the actual CI outcome, merge SHA, deployment and read-only post-deployment checks in the release PR. Do not infer those results from this preparation report.
