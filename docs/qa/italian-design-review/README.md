# Italian map and mission design review

Replaces the framed board and repeated Play controls with three illustrated landscapes, accessible city markers, a compact world selector, and one primary Continue action. Uses the existing official Yoppo assets. Desktop places the current mission beside the map. Mobile retains the portrait artwork.

Missions use a 96dvh mobile / 92dvh desktop dialog, compact progress header, simpler answer cards and one vocabulary expression at a time. Previous/next study navigation retains its cursor across leaving and resuming. The cursor is presentation state only. Canonical activities, assessment scoring, assisted attempts, stamps, access rules and course identifiers remain unchanged.

Printables are available through the tools menu and mission briefing. The complete vocabulary bank remains accessible.

## Earlier verification (before the walking/taxi follow-up)

- `npm run test:yo-italian-course` passed.
- `npm run test:yo-italian-pilot` passed.
- Map-first mission interactions passed, including close/resume, study cursor, no invented mastery and printable access.
- Adventure map, desktop/printables, immersive phase 3 and city identity suites passed, including locked links and authentic unlocks.
- `git diff --check` passed.
- Browser QA at 390×844 and desktop: map, mission opening/resuming, vocabulary navigation, audio control/playback state, transition through original lesson stages and matching feedback.
- `tsc --noEmit --incremental false` is blocked by the existing error at `tests/cafe/cafeArchitectureContract.test.ts:62` (`reason` on `never`). The same error is reproduced in an unchanged worktree at base `9a3f6764d2371995e1e8701694fe8e85c3a5d112`. No design-file TypeScript error remains.
- A physical iPhone/Safari check and the full production build remain before merge. No production deployment or Rive/reference edits.

## Review build

`node tools/italian-design-review/build.mjs /absolute/review/dist`

The static review bundles the actual course components with small Next link/image adapters. It has a city chooser for review and uses an isolated browser origin for local demonstration progress. Choosing a later city uses the existing placement/review permission; it does not award stamps. The product routes continue to use real Next components and the existing onboarding.

The generated travel illustrations are decorative, geographically condensed scenes rather than literal maps. All labels, controls, status and the progress route are live DOM/SVG. Optimized images total approximately 924 KB.

![Mobile map](map-mobile.png)
![Mobile mission](mission-mobile.png)

## Superseded interaction (4b25840c)

City buttons now inspect a destination without navigation, opening a lesson, changing saved progress or relocating Yoppo. Continue explicitly navigates. Yoppo is anchored to canonical progression or the placement start, independent of the inspected city. A keyed course instance prevents one city's UI draft leaking into another.

Yoppo's map marker follows sampled road curves when earned progression changes its destination. Motion waits until the map is visible and respects reduced motion. This is map-marker travel, not a rigged character walk cycle.

The speaker switch opts into quiet procedural breeze/water ambience. It is silent during lessons, tools, recorded playback and hidden-page states; its engine closes on unmount. Feedback settings now also work in the standalone review, including existing optional haptics. Actual vibration depends on hardware/browser support and has not been verified on an iPhone.

City-selection regression checks, route geometry and audio lifecycle checks cover this follow-up. Browser review verified selecting Firenze while Yoppo remains at Venezia, explicit Continue navigation, and the ambience/feedback controls.

### Earlier animated story sample

One eight-second 16:9 animated taxi scene was submitted to HeyGen Video 1 using the official Yoppo idle PNG as the identity reference. Generation ID: `1df6f85ed3654a5d8b7d8fc9032a59dc`. The inline player tracks its status. The result has not been visually reviewed or integrated into the app.

The intended actions are walking to the taxi, waving, boarding and driving away. Intended learning phrase: **Alla stazione, per favore.** / **À la gare, s'il vous plaît.** Phrase/audio should be accessible DOM content beside the finished clip rather than generated lettering. Playback must be skippable, non-looping and optional with reduced motion; it cannot award progress or block a lesson on media failure.

Next story contexts: train departure (*Un biglietto per Firenze, per favore*), airport transition (*Dov'è l'uscita?*), greeting a new person (*Piacere, come ti chiami?*). These are planned scenes, not generated or shipped assets.

## Current follow-up: walking and approved taxi (2026-11-11)

The sections above retain the earlier review history. The stationary inspection behavior is replaced by the following tested interaction, not a change to earned progression.

- Accessible city tap selects immediately, updates the single Continue action, and walks a map-specific vector Yoppo along the existing visible road. The map, artwork, URL and scroll do not change on tap.
- The traveler owns a fractional visual position. Retargeting cancels the old animation at its actual position. Current-city taps leave it idle; reduced motion places it directly at the target.
- The SVG path and traveler use the same explicit Bezier control points. The old duplicated companion curve had a different start and reflected controls. Canonical guide, earned road, stamps, assessments, history and unlocks remain progress-derived.
- Existing approved Yoppo PNG is the likeness reference and rendering fallback. New SVG arms/feet articulate at phone size and stop on arrival. No Rive pilot, approved PNG, original travel clip or frozen reference was edited.
- Continue uses an explicit `mission=continue` intent and the existing mission cursor. Closing the mission does not reopen it from the URL. A real earned completion supersedes a cosmetic visit and advances the guide/traveler.
- City labels sit below their stops so Yoppo's feet do not cover their names. Optional ambience and existing sound preferences remain intact.

### Exact approved transport clip

Marc-Andre approved the existing clip, not a new generation. It plays once on an explicit fresh start of the u08 transport mission, before the existing briefing. Resume does not replay it. It never grants progress or access.

- Source: https://resource2.heygen.ai/videos/d71b4efabdea4387b25ab6db2ce6b67b/d71b4efabdea4387b25ab6db2ce6b67b/01a1cbeb-965c-72b3-9dd3-0fe9f9090fa3.mp4
- Asset: `public/companion/travel/animations/yoppo-taxi-approved.mp4`
- Original bytes: 1,690,129; SHA-256 `606b27e68dab0019c628c97d79e3fa1b66d7389285bad6c55d1b1b2e6f1c2777`.
- Full decoded duration: **8.051344 s**. The fragmented MP4 initially reports 2.625 s while only early metadata is available; that is not its full duration. No trimming or re-encoding was performed.
- Poster is the original first frame. Phrase: **Alla stazione, per favore.** FR: **À la gare, s'il vous plaît.** EN: **To the station, please.** ES: **A la estación, por favor.** These are visible DOM text, not generated lettering.
- Skip is available immediately. Sound uses the existing mute/volume preference. Reduced motion shows a still image with optional Play. End, Skip, network failure and autoplay denial never trap the learner. Playback pauses on hiding/leaving and coordinates with lesson audio.

### Reproduction and browser evidence

Before: exact PR head `4b25840c625bc6e5c8755973a02152afc9bb86a5`, same pinned dependencies. A mobile tap on accessible Venezia selected it but left Yoppo's bounding box unchanged at Firenze. The flash was not consistently reproducible in Chromium; no claim of a confirmed image reload is made. The tap highlight is now transparent; the regression records DOM identity, image readiness, opacity, geometry, URL and scroll on every frame.

After: Chromium **148.0.7778.96**, Playwright **1.62.1**, Node **22.23.4**, 390 x 844 mobile and 1365 x 900 desktop. Local-only synthetic earned progress places the canonical guide at Firenze; existing placement/review permission makes Venezia accessible. No account, backend write or production data is used. Tests refuse non-local origins.

The recording covers Firenze -> Venezia, arrival, walking back, retargeting during a walk, current-city idle, Continue, taxi Skip, mission opening/closing and exact vocabulary resume. Separate contexts cover reduced motion and a locked city. Frame measurements also compare the traveler's feet against the rendered SVG road within one native pixel. Retarget continuity is measured inside the click/frame loop to avoid mistaking slow automation round trips for a jump.

Evidence: [mobile sequence](mobile-walk-taxi.webm), [walking](walking-current.png), [taxi](taxi-current.png), [browser report](map-traveler-report.json), [media report](taxi-playback-report.json).

### Commands and results for this follow-up

Commands run with the Node version above and unchanged dependency lockfile:

| Command | Result |
| --- | --- |
| `npm ci --ignore-scripts --no-audit --no-fund` | PASS after preserving an interrupted install outside the worktree; lockfile unchanged |
| `node --import tsx tests/yo/yopratiqoMapMotion.test.ts` | PASS |
| `node --import tsx tests/yo/yopratiqoMapFirstMissionWindow.test.tsx` | PASS, 9/9 |
| `node --import tsx tests/yo/yopratiqoGuidedItalianPlayer.test.tsx` | PASS, 9/9; follows all vocabulary cards and all 19 exercises; updates obsolete city-link assertion to selected city + Continue |
| `node --import tsx tests/yo/yopratiqoItalianCourseProgress.test.ts` | PASS, 30/30 |
| `node --import tsx tests/yo/yopratiqoItalianCourseNavigation.test.ts` | PASS, 9/9 |
| `node --import tsx tests/yo/yopratiqoGuidedItalian.test.ts` | PASS, 16 checks |
| `node --import tsx tests/yo/yopratiqoWorldsWarmup.test.ts` | PASS |
| `node --import tsx tests/yo/yopratiqoAdventureMapRedesign.test.tsx` | PASS |
| `node --import tsx tests/yo/yopratiqoDesktopMapPrintables.test.tsx` | PASS |
| `node --import tsx tests/yo/yopratiqoItalianCityIdentities.test.tsx` | PASS |
| `node --import tsx tests/yo/yopratiqoItalianImmersivePhase3.test.tsx` | PASS |
| `node tools/italian-design-review/build.mjs .qa-guided/map/after` | PASS; actual components, production-mode static review bundle, not a full Next build |
| `node --import tsx tests/yo/yopratiqoMapTraveler.browser.mjs` | PASS, 299 recorded frames, continuous retarget, stable map/progress, reduced motion, locked city, mission resume |
| `node --import tsx tests/yo/yopratiqoTaxiTransition.browser.mjs` | PASS, real 8.051344 s playback to end, mute/40% volume, immediate Skip, network/autoplay recovery, desktop |
| `node node_modules/eslint/bin/eslint.js` with all changed TSX/TS/MJS source and test paths | PASS; initial browser CJS import errors corrected to repository-compatible ESM harness; final browser-only rerun also PASS |
| `node --max-old-space-size=4096 node_modules/typescript/bin/tsc --noEmit --incremental false` | FAIL (exit 2), only `tests/cafe/cafeArchitectureContract.test.ts:62:40`, TS2339 `reason` on `never` |
| `node --import tsx scripts/validate_i18n.ts` | PASS, 3562 keys per locale |
| `git diff --check` | PASS |

Browser reproduction commands (after serving the review bundle locally):

```powershell
# Set PLAYWRIGHT_MODULE / PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH only when using an
# existing bundled Playwright/browser instead of the standard installation.
$env:MAP_REVIEW_URL = 'http://127.0.0.1:55742'
node --import tsx tests/yo/yopratiqoMapTraveler.browser.mjs
node --import tsx tests/yo/yopratiqoTaxiTransition.browser.mjs
```

Full compiler failure is independently present in the pre-change GitHub run [43081926126](https://github.com/marcandretheberge-dotcom/Pratiqo/actions/runs/43081926126) at the same starting PR head. That failure is not waived or changed here. An earlier local compiler attempt ended with exit -1 and no diagnostic; the complete rerun above is the usable result. Browser harness iterations corrected obsolete assertions, CommonJS/ESM loader setup and automation timing; only final successful reports are review evidence.

### Review boundary

Private review: https://yopratiqo-italian-design-review.markitos2222.chatgpt.site . Its audience stays owner-only. The build uses real course components with small Next navigation/image adapters and local progress, not the full deployed Next routing/auth stack. Pick Firenze, then Venezia to inspect walking; Continue at Venezia opens the approved taxi and transport mission.

No merge, Pratiqo production deployment, payment, migration, paid generation or change to other worktrees. The unrelated Cafe compiler failure, full Next production build and physical iPhone/Safari playback remain before merge. Browser tests validate decoded audio/video and settings, not a human listening review or physical-device audio output. Production remains behind the existing review gate.
