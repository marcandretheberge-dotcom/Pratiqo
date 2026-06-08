# Pratiqo Mobile Launch QA Results

Date: 2026-06-08  
Branch: `qa/mobile-and-launch-smoke-gate`  
Recommendation: **PASS WITH FOLLOW-UP**

This was a local pre-launch smoke gate for mobile, PWA, and app-readiness. It was **not** a real-device iPhone/Android QA pass. Simulated viewport QA was limited by the local browser automation surface being unavailable in this sandbox session, so the report separates completed local HTTP/static checks from manual rendered-device checks still required.

## Environment Used

- Machine: local Windows development environment.
- App: Pratiqo Next.js app from the current branch.
- Server: existing local Next dev server on `http://localhost:3000`.
- Browser automation: attempted in-app browser connection twice; it failed in the sandbox before page control was available.
- Playwright: not installed in the repo (`playwright`, `@playwright/test`, and `playwright-core` are absent), so no new browser framework was added.
- QA method completed: local HTTP route smoke tests, PWA manifest/service-worker/static checks, and source-level mobile/consent checks.

## Commands Run

```powershell
git switch main
git pull --ff-only origin main
git switch -c qa/mobile-and-launch-smoke-gate
Invoke-WebRequest -Uri http://localhost:3000/ -UseBasicParsing -TimeoutSec 15
node <local route-smoke script>
Select-String -Path app\(app)\upgrade\page.tsx,app\api\stripe\pro\checkout\route.ts,components\BookingModal.tsx,app\(app)\student\search\page.tsx,components\TeacherProfile.tsx,components\Dashboard.tsx,components\StudentDashboard.tsx -Pattern "renewalAccepted|legalAccepted|checkbox|checked|disabled|29.99|29,99|100dvh|safe-area|max-h|overflow-x|domicile|safety|minor|remboursement|refund|no_payment|manual_review" -CaseSensitive:$false
Select-String -Path public\sw.js,public\manifest.json,app\layout.tsx -Pattern "manifest|icons|standalone|theme-color|apple-mobile-web-app|/api|/dashboard|/booking|/checkout|/student|/teacher|/upgrade|/legal|/yo/checkout" -CaseSensitive:$false
```

Validation commands for this branch:

```powershell
npx tsx tests/ops/mobileLaunchQaGate.test.ts
npx tsx tests/ops/pwaAppReadiness.test.ts
npx tsx tests/ops/mobileQaAppStoreAssets.test.ts
npx tsx tests/ui/customErrorPages.test.ts
npm run test:launch-critical
npm run validate:launch
npm run build
npx tsx scripts/validate_i18n.ts
git diff --check
```

## Existing QA Docs Reviewed

| File | Already covered | Still needs actual testing |
|---|---|---|
| `docs/MOBILE_QA_CHECKLIST.md` | Device matrix, public/auth/student/teacher/YoPratiqo/PWA flows, store asset gaps. | Real devices, authenticated accounts, checkout sandbox journey, screenshots. |
| `docs/APP_READINESS_RUNBOOK.md` | Manifest, icons, standalone PWA posture, service worker, offline page, native billing warning. | Lighthouse/installability, iOS Add to Home Screen, Android install prompt. |
| `docs/PRODUCTION_LAUNCH_RUNBOOK.md` | Production launch checklist, Stripe live envs, webhook events, backups, smoke test, rollback. | Real production/staging smoke with approved test accounts and Stripe test-mode verification. |
| `docs/app-store/SCREENSHOT_AND_ASSET_PLAN.md` | Screenshot storylines, asset gaps, fake screenshot prohibition. | Real screenshot capture from staging/production. |

## Routes Tested

Local HTTP smoke tests were run against:

- `/`
- `/trouver-un-prof`
- `/tarifs`
- `/student/search`
- `/upgrade`
- `/legal/annulation`
- `/legal/membre-pro`
- `/legal/yo-remboursement`
- `/legal/code-de-conduite`
- `/yo/langues/espagnol/pays/republique-dominicaine`
- `/yo/langues/espagnol/pays/republique-dominicaine/module-5`
- `/offline`
- `/manifest.json`
- `/sw.js`
- `/qa-fake-route-for-custom-404`
- `/teacher/profile`
- `/dashboard`
- `/teacher/schedule`
- `/teacher/verification`
- `/student/payments`

## Viewports Tested

Rendered viewport automation was **not completed** because the browser automation surface failed to connect and Playwright is not installed. No fake real-device result is claimed.

Viewport profiles that remain required for rendered QA:

- iPhone SE / small mobile.
- iPhone 12/13/14 style viewport.
- Large Android style viewport.
- iPad/tablet viewport.
- Desktop responsive viewport.

Source/static mobile-readiness checks were reviewed for these viewport concerns:

- `100dvh` usage on high-risk full-height routes.
- Modal max-height and internal scroll handling.
- Safe-area padding in booking and teacher profile modals.
- Disabled states and 44px-ish primary actions on key CTAs.
- Service-worker cache bypass for private/payment/authenticated routes.

## Automated Checks Performed

- Public route HTTP smoke: status, redirect target, body size, page title, Pratiqo-branded output, and absence of obvious default Next.js/runtime error text.
- Auth-gated route smoke: unauthenticated redirects to `/login?next=...` were verified for `/student/search`, `/upgrade`, dashboards, teacher schedule, teacher profile management, and student payments.
- PWA static checks: manifest fields, icon references, service worker cache/bypass lists, offline route, and root PWA metadata.
- Source-level mobile checks: `100dvh`, `safe-area`, modal max-height, disabled states, at-home safety disclosure, refund-copy comments, and Membre Pro consent gates.
- Custom 404 smoke: fake route returned `404` with Pratiqo-branded body and no obvious default Next.js error text.

## Pass/Fail Table

| Area | Result | Evidence |
|---|---|---|
| Homepage `/` | PASS | HTTP 200, branded title/body, no obvious runtime error text. |
| Public search `/trouver-un-prof` | PASS | HTTP 200, branded title/body. |
| Student search `/student/search` | PASS WITH FOLLOW-UP | Correct unauthenticated 307 to login; authenticated mobile rendering still requires manual QA. |
| Upgrade `/upgrade` | PASS WITH FOLLOW-UP | Correct unauthenticated 307 to login; source confirms renewal/legal checkboxes and disabled CTA until both accepted. |
| Legal pages | PASS | `/legal/annulation`, `/legal/membre-pro`, `/legal/yo-remboursement`, `/legal/code-de-conduite` returned HTTP 200 with branded bodies. |
| YoPratiqo RD intro | PASS | HTTP 200, large page body, branded title, no obvious runtime error text. |
| YoPratiqo module 5 | PASS | HTTP 200, large page body, branded title, no obvious runtime error text. |
| Offline page | PASS | HTTP 200, branded body. |
| Manifest | PASS | HTTP 200, valid app/PWA fields already documented in `public/manifest.json`. |
| Service worker | PASS | HTTP 200; source bypasses API, dashboard, booking, checkout, student, teacher, upgrade, legal, and Yo checkout routes. |
| Custom 404 | PASS | Fake route returned HTTP 404 with Pratiqo-branded body and no obvious default Next.js error text. |
| Student dashboard | MANUAL QA REQUIRED | Auth-gated route redirects correctly; no authenticated fixture was used. |
| Teacher dashboard/profile management | MANUAL QA REQUIRED | Auth-gated routes redirect correctly; no authenticated fixture was used. |
| Booking modal rendered interaction | MANUAL QA REQUIRED | Source shows mobile modal constraints and safety copy; actual open/click flow needs authenticated/student fixture or browser automation. |
| Real-device PWA install | MANUAL QA REQUIRED | Manifest/icons exist; iOS/Android home-screen behavior was not tested on physical devices. |

## Bugs Found

No launch-blocking bug was found in the completed local HTTP/static QA pass.

Limitations found:

- In-app browser automation could not be initialized in this sandbox session.
- No Playwright package is installed, and no new framework was added by design.
- Authenticated dashboards, real booking modal interaction, and real device PWA install remain manual QA.

## Fixes Made In This Branch

- Added this QA result report.
- Added a lightweight QA gate test for the report and PWA/app-readiness invariants.

No runtime UI fixes were made because no small safe UI bug was confirmed in the completed local checks.

## Manual Real-Device QA Still Required

- iPhone Safari public flow and Add to Home Screen.
- iPhone installed PWA standalone mode and safe-area behavior.
- Android Chrome install prompt and standalone mode.
- Small-screen teacher profile modal and booking modal interaction.
- At-home lesson booking flow with safety disclosure visible.
- Student dashboard booking cards, cancellation copy, and refund/manual-review copy.
- Teacher dashboard, schedule, profile management, Stripe Connect entry point, identity entry point, and Membre Pro upgrade flow.
- Membre Pro authenticated upgrade screen with both consent checkboxes and disabled/enabled CTA behavior.
- YoPratiqo flashcards, quiz, printables, and browser audio on physical devices.

## Launch Blockers

None found in this local smoke gate.

## Non-Blocking Issues

- Rendered viewport automation was unavailable, so this report cannot replace real mobile QA.
- Store screenshots and app-store privacy/data-safety forms still need real production/staging data review.
- Existing Next.js build warnings about `middleware` convention and Turbopack ignoring `experimental.forceSwcTransforms` remain outside this branch.

## Final Recommendation

**PASS WITH FOLLOW-UP**

The current app passes local public-route/PWA/static smoke checks and no blocker was found. Before production launch or app-wrapper work, complete the manual real-device and authenticated-flow QA listed above.
