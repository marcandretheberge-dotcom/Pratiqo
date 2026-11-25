# Shared Yoppo world maps: preview review

Date: 2026-11-11. Branch: `feat/yopratiqo-shared-world-map`.
Isolated worktree: `yo-shared-world-map`. Base: `bdd970261a1d13a3e8eb09eb8801463529dc6517` (main after #457 and #459).

No production deployment, migration, payment, content generation or account write. Other worktrees and the Rive pilot freeze are untouched.

## Inventory and scope

| Language | Existing canonical learning surface | Real destinations and gate source | Scenery |
| --- | --- | --- | --- |
| Italian | `/yo/langues/italien/parcours` | Existing 12 cities, three worlds; personalized course placement and earned progress unchanged | Approved Italian bitmap maps, vector Yoppo and taxi retained |
| German | `/yo/langues/allemand/parcours` | Eight existing assessed units; `buildCourseJourney` | Timber houses, river bridge, castle and alpine horizon |
| Brazilian Portuguese | `/yo/langues/portugais-bresil/parcours` | Eight existing assessed units; `buildCourseJourney` | Brazilian coastal landscape, colorful houses, palms and patterned pavement |
| Japanese | `/yo/langues/japonais/parcours` | Eight existing modules; foundation journey eligibility, independent practice and final gate unchanged | Neighborhood station, tiled roofs, cherry trees and bridge |
| Mandarin | `/yo/langues/mandarin/parcours` | Eight existing units; foundation journey eligibility and final gate unchanged | Courtyard, tiled roofs, lanterns, bamboo and river |
| Quebec French | `/yo/langues/francais-quebec/demarrer` | Three real introductory meetings and existing final challenge, not a newly invented full francization course | Montreal stairs, neighborhood buildings and Saint Lawrence river cues |
| English | `/yo/langues/anglais/demarrer` | Three real introductory meetings and existing final challenge | Toronto skyline, streetcar and waterfront |
| Spanish | `/yo/langues/espagnol/demarrer` | Three real Montevideo meetings, existing final challenge, then six existing optional written regional practices | Rambla and plaza, then regional mountain/coastal scenes and Andes/Rio de la Plata cues |

German, Brazilian Portuguese, Japanese and Mandarin also have the shared three-meeting `/demarrer` introduction. All seven existing introductions use the shared map. The introductory final remains directly accessible because the existing product already allows a diagnostic challenge. Completing practice does not invent mastery; the existing independent final determines the introductory stamp.

Spanish regional practices remain optional practice, not newly unlocked assessed modules. Their existing content/order is reused, with a clearly labelled link from the Caribbean example to the existing Dominican course. No new country curriculum or entitlement is invented.

The older `/intro` exploration maps and authenticated Dominican course home are preserved, not replaced or migrated in this iteration. The French premium module's coming-soon/publication policy is unchanged. These legacy surfaces are not claimed to have the new walk interaction. Japanese syllabus, review, resources, kana/kanji and roleplay contents remain intact.

Scenery is original stylized vector game artwork, not a geographic map or a promise that a unit takes place in a particular real city. Destination labels are actual module/mission titles. FR/EN/ES interface copy is provided; target-language utterances are not translated away.

## Interaction architecture

- `components/yo/journey/map/MapYoppo.tsx` is the approved SVG, identical to the former Italian component except its exported function name. Feet, arms, quills, face, backpack, proportions and colors are unchanged.
- The original walk styles and `MapTraveler` are shared. Italian imports remain compatibility exports, not a second animation engine.
- `roadGeometry` supplies the visible cubic path and traveler position. Each new world chooses its own curve layout in `worldRoads`.
- `WorldJourneyMap` handles selection, chapter browsing and a single Continue action. Tapping never invokes a mission handler. Only Continue opens/resumes the selected existing mission.
- Retargeting stops the previous animation at its current fractional position and starts from that point. Current-city taps stay idle. Reduced motion places Yoppo directly at the destination.
- `worldMap.ts` projects existing eligibility; it does not recompute learning, access or scores. Cosmetic `sessionStorage` bookmarks are separate from all course ledgers.
- Saved bookmarks contain selected destination, chapter, fractional position and an earned-progress revision. Resume changes alone cannot discard them. Actual newly earned completion can advance the guide. Restoration waits for real progress hydration.
- Full-course Continue preserves an existing matching lesson/activity resume. The introduction distinguishes selected mission from an unfinished final, preserving both saved answers and the intended destination.
- No new sound or video is introduced. Existing audio/effects settings, lesson audio arbitration and approved Italian travel clips remain in place. The taxi remains Italian only.

## Shareable Preview

Review link: <https://pratiqo-k5nydkwu1-marcandretheberge-dotcoms-projects.vercel.app/>

Eight complete mobile panels and video: <https://pratiqo-k5nydkwu1-marcandretheberge-dotcoms-projects.vercel.app/evidence/index.html>

Mobile recording: <https://pratiqo-k5nydkwu1-marcandretheberge-dotcoms-projects.vercel.app/evidence/walk-mobile.webm>

Vercel static deployment `dpl_FVDEaed96dbRhV9LBoqh4FGEfAvT`: Preview target, no production aliases. This is the review link, not the automatic full-application Git preview. Open it directly in iPhone Safari; no certificate, tunnel or Expo is needed.

The banner offers all eight languages, FR/EN/ES and three explicit scenarios: beginner, in progress, locked destination. The locked scenario retains existing gates, never granting access. Italian in-progress data contains two synthetic passed assessments rendered by real progression rules. Scenario switching resets only this isolated origin's synthetic course state and Italian UI drafts.

This deployment contains static files only, no functions, Auth, database, payment, messaging or admin API. Non-read methods return 405; API/Auth/admin routes return 404. CSP blocks forms, frames and non-origin fetches. Only public pronunciation media reads use the existing published storage origin; no database key is included. All pages are noindex/nofollow.

Fixtures require loopback or an HTTPS Vercel origin with the standalone review marker. They are never imported by application routes. This unique origin's browser storage cannot overwrite production-origin learning progress. No sign-in is provided or needed. Shared Vercel variables, Production variables and domain aliases were not modified. Shared Preview variables overlap with Production, so the full-application Git preview must not be used for synthetic exercises.

Physical Safari and authenticated cross-device synchronization remain unverified. This standalone bundle does not demonstrate either.

## Local Alternative

Start: <http://127.0.0.1:55730/>. The banner selects all eight languages, available full course/introduction, FR/EN/ES and beginner/in-progress fixtures. Switching the scenario explicitly resets only this preview's synthetic progress.

Useful entries:

- <http://127.0.0.1:55730/yo/langues/italien/parcours?lang=fr>
- <http://127.0.0.1:55730/yo/langues/allemand/parcours?lang=fr>
- <http://127.0.0.1:55730/yo/langues/portugais-bresil/parcours?lang=fr>
- <http://127.0.0.1:55730/yo/langues/japonais/parcours?lang=fr>
- <http://127.0.0.1:55730/yo/langues/mandarin/parcours?lang=fr>
- <http://127.0.0.1:55730/yo/langues/francais-quebec/demarrer?lang=fr>
- <http://127.0.0.1:55730/yo/langues/anglais/demarrer?lang=fr>
- <http://127.0.0.1:55730/yo/langues/espagnol/demarrer?lang=fr>

This is a production-mode standalone bundle of actual course components and actual content, with local review-only Next navigation adapters and synthetic browser progress. It is not a deployed Next application, authenticated backend or proof of cloud synchronization.

The local server binds only to loopback, permits GET/HEAD only and has no credentials. Its narrowly restricted read proxy serves existing public pronunciation MP3s only. It exposes no Auth, database, payment, message or admin API. No tunnel was created. Use the shareable HTTPS link above on an iPhone, not this computer's `127.0.0.1` link.

Build/run:

```powershell
node tools/world-map-review/build.mjs
node tools/world-map-review/serve.mjs
```

Scenario: choose in-progress, tap an earlier accessible stop, retarget during walking, then Continue. Leave/save or return via Carte. Check the selected destination and position. Switch to beginner to inspect locked stops. Use browser reduced-motion emulation. Italian comparison uses the same selector; its dedicated regression preview runs on port 55739.

## Validation evidence

Logs and captures are ignored local artifacts under `build/world-map-review/` and `.qa-guided/map/`, not production assets.

- `npm ci --ignore-scripts --no-audit --no-fund`: passed; dependency/lock files unchanged.
- `node tools/world-map-review/build.mjs`: passed, production-mode review bundle.
- `node tools/italian-design-review/build.mjs build/italian-map-regression`: passed, actual Italian components using the shared traveler.
- `node --import tsx tests/yo/yopratiqoMapTraveler.browser.mjs`, with `MAP_REVIEW_URL=http://127.0.0.1:55739`, bundled Playwright and Edge: passed; 275 recorded frames. Covers Firenze/Venezia walk, retarget, stable guide/ledger, map/URL/scroll, locked city, mission resume, reduced motion and existing taxi controls.
- Shared browser QA uses Edge 157.0.4341.46, mobile emulation 390 x 844 and desktop 1280 x 900. It checks DOM/art/traveler identity every frame, visible articulated legs, distance from the actual SVG road, smooth retarget, idle, no flash/scroll/URL changes, one Continue, mission return, ledger equality and overflow. Additional cases cover beginner locks/reduced motion/Spanish UI and each real introductory notebook/audio/tools/printable flow.
- `node --import tsx tests/yo/yopratiqoSharedWorldMap.test.tsx`: eight regression groups passed: real IDs/gates, completion versus mastery, course adapters, reversible geometry, cosmetic-only selection, fractional bookmarks, real earned advancement and hydration race.
- `node --import tsx tests/yo/yopratiqoSharedIntroPlayer.test.tsx`: seven complete language journeys plus selected-mission versus unfinished-final resume regression. Exact full-course/stamp/answer persistence is exercised, not just source-text checks.
- Existing focused tests run individually with `node --import tsx tests/yo/<file>`: `yopratiqoMapMotion.test.ts`, `yopratiqoMapFirstMissionWindow.test.tsx`, `yopratiqoAdventureMapRedesign.test.tsx`, `yopratiqoDesktopMapPrintables.test.tsx`, `yopratiqoAllLanguageJourneys.test.ts`, `yopratiqoCourseJourney.test.ts`, `yopratiqoAdventure.test.tsx`, `yopratiqoCourseBreak.test.tsx`, `yopratiqoSharedCompanionAudio.test.tsx`, `yopratiqoFrenchResponsiveDraft.test.tsx`, `yopratiqoGuidedItalian.test.ts`, `yopratiqoPersonalizedItalian.test.ts`, `yopratiqoWorldsWarmup.test.ts`, `yopratiqoItalianCourseProgress.test.ts`, `yopratiqoGermanCoursePlayer.test.ts`, `yopratiqoPortuguesePlayer.test.ts`, `yopratiqoJapaneseCourseProgress.test.ts`, `yopratiqoJapanesePracticeInteractions.test.ts`, `yopratiqoMandarinPlayer.test.ts`, `yopratiqoSharedIntro.test.ts`, `yopratiqoTapFlow.test.tsx`: passed.
- Existing structural dashboard assertions were adapted to the intentional one-Continue/four-stop-page UI, retaining coverage of every locked unit and adding no-open-link assertions on locked chapters. No access/progress thresholds were changed.
- `npx tsx scripts/validate_i18n.ts`: passed, 3562 keys per locale.
- Targeted ESLint covering all changed TS/TSX/tests/tools: passed; only the existing Browserslist database age advisory. No lint suppression added.
- Initial TypeScript validation found an invalid `exact` option in four new Testing Library role queries; removed it (string role names are exact by default). This was a test typing error, not ignored.

### Final browser and compiler results

- `node --import tsx tools/world-map-review/qa.mjs <bundled-node-package.json>`: **PASS, 28 cases**, Edge 157.0.4341.46. Fourteen motion runs captured 1,852 frames, zero page errors, maximum distance from the actual SVG road 0.195 native pixels. Seven reduced-motion/locked runs and seven actual audio/notebook/tools/printable runs also passed. `--audio-only` separately passed seven cases. The script observes native Audio playback; it does not mock successful playback.
- Final shared-intro player rerun: **PASS, eight complete journeys/regression groups** after the test typing correction.
- `npx tsc --noEmit`: **PASS** on the final source, including generated Next route types. Log: `build/world-map-review/typescript-final.log` (empty, exit 0).
- Final `node --import tsx tests/yo/yopratiqoSharedWorldMap.test.tsx` rerun: **PASS, eight groups**.
- Historical build attempt, subsequently resolved: without local backend configuration, compilation passed, then static rendering correctly failed at `/cours/espagnol/levis` for missing Supabase variables. The page and its error propagation were not changed. See the complete successful local-stack build below. The nonfatal `experimental.forceSwcTransforms` Turbopack advisory remains.
- Scoped lint rerun after the final application/test changes: **PASS**, no errors or code warnings, only the Browserslist age advisory. No rule disabled.
- `git diff --check`: **PASS** (Git also reports normal LF/CRLF checkout notices).
- HTTP HEAD: preview root, evidence gallery and `walk-mobile.webm` all **200**, video served as `video/webm`.

Evidence: <http://127.0.0.1:55730/evidence/index.html> and <http://127.0.0.1:55730/evidence/walk-mobile.webm>. The video is an actual German mobile-emulation walk/retarget/Continue/return session. It is not a physical iPhone capture. MP4 conversion was unavailable in the installed Playwright-only FFmpeg; the original WebM and PNGs are retained, not re-created.

Exact local browser commands (Windows):

```powershell
$env:PLAYWRIGHT_MODULE='C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1110-778-0_26.1110.778.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules/playwright'
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
$env:MAP_REVIEW_URL='http://127.0.0.1:55739'
node --import tsx tests/yo/yopratiqoMapTraveler.browser.mjs
node --import tsx tools/world-map-review/qa.mjs 'C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1110-778-0_26.1110.778.0_x64__3k8sg7r9htsxt/dependencies/node/package.json'
```

## Audio limits, not hidden by mocks

The browser test plays a real manifest-backed MP3 in each introduction and verifies native playback and stop-on-close. It does not simulate media success or replace missing recordings. Existing manifest matches among the 19 introductory phrases: German 4, Brazilian Portuguese 5, Japanese 3, Mandarin 3, Quebec French 1, English 1, Spanish 6. These counts are not full-course recording coverage. Unmatched phrases retain the existing correctly matched device-voice fallback and truthful unavailable state. Physical iOS voice availability and pronunciation quality were not certified here; no audio was generated or purchased.

## Files and boundaries

- New shared map engine/art/scenery/styles: `components/yo/journey/map/*`; presentation projection/bookmark validation: `lib/yo/worldMap.ts`.
- Italian compatibility exports and geometry/style extraction: `ItalianMapCompanion.tsx`, `ItalianMapYoppo.tsx`, `ItalianAdventurePathGeometry.ts`, `ItalianCourseExperience.css`.
- Integration: `CourseJourney.tsx`, German/Portuguese dashboard, Japanese/Mandarin course homes, `SharedIntro.tsx`, controlled regional selection in `SpanishRegionalPractice.tsx`.
- Tests: new `yopratiqoSharedWorldMap.test.tsx`; existing course journey, German, Portuguese and shared intro player tests updated for the intentional interaction.
- Reproducible local review: `tools/world-map-review/{build.mjs,serve.mjs,main.tsx,fixtures.ts,qa.mjs}`.

No payment, entitlement, authentication, progression engine, authored lesson, audio asset, database, production configuration or frozen Rive file is changed. Local review fixtures are never imported by application routes.

## Review gate and rollback

This is a visual/interaction preview for review, not a release authorization. Physical iPhone/Safari, native packaged app and authenticated cross-device sync are unverified. Legacy exploration maps remain unchanged as listed above. No new videos. No production deployment, merge or migration.

Verdict: **READY FOR INTERACTIVE PREVIEW REVIEW, NOT READY FOR RELEASE**. The isolated full-site build configuration is resolved as detailed below. This branch is prepared for a draft PR only. Visual approval remains required before any merge or production deployment.

Rollback is application-only: revert this presentation change and its shared extraction together. Existing learning progress keys/schema and recorded evidence are unchanged; never delete learner progress to roll back the map.

## Share Preparation: Current Validation

- Missing configuration identified: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. The new operator `tools/world-map-review/build-full-local.mjs` reuses the documented PR405 local adapter, checks the local Docker identity/network, rejects application env files/external-service credentials, keeps local keys in memory and inherits the loopback-only fetch guard. A real read against the local teachers endpoint precedes the normal `next build`. No production backend, mock response, schema change or SEO bypass.
- Complete build against the existing synthetic local stack: **PASS**, compilation 52s, Next TypeScript 100s, 368/368 static pages, full route manifest and BUILD_ID. The initial operator was CJS; conversion to ESM addresses its lint findings without changing the build command or validations. Final `node tools/world-map-review/build-full-local.mjs` rerun: **PASS, exit 0**, completed 2026-11-12 02:59:39 UTC (November 11 in Toronto), compilation 3.5min / full TypeScript 9.5min on the loaded workstation. Receipt: ignored `build/world-map-review/full-build-result.json`.
- `node --import tsx tests/yo/yopratiqoWorldMapReviewIsolation.test.ts`: PASS. Production/unrelated origins reject fixture writes without changing stored data; hosted preview requires its marker; fixtures use real assessment gates.
- `node tools/world-map-review/gallery.mjs <playwright-package.json>`: PASS, 24 states (eight languages x three scenarios). Eight 390px-wide complete panels include scenery, legible destinations, Yoppo and Continue. Long panels are captured at mobile width with sufficient screenshot height, not claimed to fit within a single phone viewport.
- `npx tsc --noEmit`: PASS after initial share-tool changes; Next build also performs full TypeScript.
- Scoped ESLint on changed/new TS/TSX/MJS: PASS after conversion of the local-build operator to ESM.
- `npm run lint`: **FAIL**, 6 errors / 278 warnings on the global run. Four errors belonged to the new CJS build operator and were corrected via ESM, verified by scoped lint. Two remaining `react-hooks/globals` errors occur in `tests/yo/yopratiqoTapFlow.test.tsx:40,44`. `npx eslint tests/yo/yopratiqoTapFlow.test.tsx --quiet` reproduces both. That test, ESLint config, package.json and lockfile are byte-identical to `origin/main` at the recorded base (`git diff --exit-code` returns 0). Global lint is not reported as green; unrelated tests/rules were not changed.
- Static review build: `node tools/world-map-review/build.mjs --share`; package: `node tools/world-map-review/prepare-static.mjs`. Both PASS. Only the static output is uploaded, never the locally built `.next`, credentials or server configuration.
- Anonymous HTTP: root, gallery and WebM 200; API progress and Auth callback 404; noindex headers present. No real account, reservation, payment or message created.
- Final hosted artifact verification: SHA256 matches local `app.js` (`d7a3cb09343760ecc96d1a9c01ed465e608db6933ec4fb46306ff41a5233a64f`) and `app.css` (`68fc0f688e7e8f34894b89e5d7d2cd78be417d5076869a827af1b9ead1f9a262`). A body-free POST to this static preview's nonexistent progress API returns 405.
- `REVIEW_URL=<shareable-preview> node tools/world-map-review/gallery.mjs <playwright-package.json>`: **PASS, 24 hosted states** across eight languages, no page errors or non-read requests.
- Hosted `REVIEW_URL=<shareable-preview> node --import tsx tools/world-map-review/qa.mjs <playwright-package.json>`: **PASS, 28 cases**, 1,833 motion frames, maximum actual-road deviation 0.1944 native px, no page errors. Includes fourteen mobile/desktop motion/retarget/mission-return runs, seven locked/reduced-motion cases and seven actual public-MP3 notebook/tools/printable flows. Canonical guide and saved learning ledgers remain equal while the traveler moves.
- Earlier hosted QA attempts are not counted as passes: one timing assertion failed under load, then a return selector became ambiguous after adding the gallery link. Raw retarget/frame evidence was added, the return now names the Carte link explicitly, and the test asserts that retargeting occurs while still walking (not after a slow screenshot). A reproduced Portuguese 2px scroll / 1px map shift was caused by the standalone font arriving after React mounted; the preview now preloads that font and measurement waits for font readiness. No movement, flash, scroll, geometry or progress threshold was relaxed. The final 28-case run above passes those original strict comparisons.

Remaining release limits: physical Safari, native packaged iOS/Android, authenticated cross-device synchronization, unchanged legacy map coverage, existing global lint findings and visual approval. No production readiness claim.

## Unchanged Secondary Routes

| Routes | Reachable through normal application navigation? | Evidence / scope |
| --- | --- | --- |
| `/yo/langues/anglais/intro`, `/yo/langues/francais-quebec/intro`, `/yo/langues/espagnol/intro` | Yes | SharedIntro's “Retrouver mon parcours existant” uses each content file's `legacyPath`. They retain `YoLessonDeck` / `ExplorationJourneyMap`, not the new traveler map. |
| `/yo/langues/japonais/intro` | Yes | Japanese course home retains its introduction link. Eight-module player, kana, kanji, roleplay and notebook are preserved. |
| `/yo/langues/italien/intro` | Yes | The Italian presentation retains the introduction card via `moduleConfig.introRoute`; the main catalog opens the twelve-city course. |
| `/yo/langues/italien/module-1` | Direct link/bookmark, not current main-course navigation | Bologna mini-adventure unchanged. Its optional link survives in `ItalianCourseDashboard`, but that component is no longer mounted by app routes. |
| `/yo/langues/francais-quebec/module-1`, `/module-1/lecon-3`, `/module-1/lecon-3/kit-de-survie` | Yes, through presentation's upcoming-module card, under existing publication/access policy | No newly available premium-course claim or access change. |
| `/yo/langues/espagnol/pays/republique-dominicaine`, its `/intro`, `/module-2` through `/module-5` and resource children | Yes | Spanish presentation links to the country course; the existing Caribbean bus practice also links explicitly to it. Authenticated `YoCoursePath`, entitlements and server progress remain unchanged. |
| `/yo/langues/japonais/parcours/carnet`, existing unit resources, Italian unit vocabulary/reports/assessments | Yes, through existing tools | Map extension does not replace these learning tools. |

The standalone preview implements the eight main maps, existing missions, seven introductions and introductory printable notebooks. It is not an authenticated copy of all secondary routes. Unsupported legacy paths show an explicit unchanged-secondary-route notice, not a silently substituted new map. Restricted secondary courses are not published as a new free-access flow.
