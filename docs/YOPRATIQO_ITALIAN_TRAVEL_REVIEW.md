# Italian geographic journey: visual review

Date: 2026-11-12. Base: `c36cd2a3` (current main at worktree creation).
Branch: `feat/yo-italian-geographic-journey`, isolated `yo-italian-travel` worktree.

## Scope and review gate

An opt-in navigator inside the existing `GuidedItalianCourse`, demonstrated in a
standalone static Preview. No application route activates it. No merge, production
deployment, schema change, paid generation or external message is authorized.
The Cafe des langues, Daily, PR3b, Rive pilot and other worktrees were not edited.

The reference Site could not be opened anonymously (401); this implementation
uses the approved repository artwork and the requested interaction sequence.
It does not claim that the private Site was visually inspected.

## What is real and what is demonstration

- Real: course catalog, twelve units, activities, lesson player, assessment rules,
  recorded Italian MP3s, word bank, approved Yoppo vector and shared travel engine.
- Demonstration: three selectable progress fixtures (beginner, arrival in Florence,
  Florence checkpoint earned). They use the existing pure progress functions but
  are not anyone's learning history.
- Separate keys: `yo.review.travel.course.v1` and `yo.review.travel.cosmetics.v1`.
  The isolated origin also contains the player's ordinary UI drafts/preferences.
- The static deployment has no server functions, authentication, database client
  credentials or payment configuration. API/auth/admin paths are rejected and
  mutating HTTP methods return 405. Public audio files are read-only media.
- The packaged CSP permits only same-origin connections. It permits the existing
  public audio host for media, not Supabase API calls. No production data writes.
- No new Pass, credit, reward balance, purchase rule or entitlement is introduced.

## Geography and pedagogy

City centres, coastline and paths use the same regional projection of WGS84
coordinates. Natural Earth 1:50m coastline is public-domain data. Paths indicate
the pedagogical sequence, not a real road itinerary.

The sequence remains Bologna, Parma, Modena, Verona, Napoli, Firenze, Siena,
Venezia, Genova, Torino, Roma, Palermo. Florence is u06, not the beginner module.
The review shortcut to Florence is visibly synthetic. It does not make Rome
accessible; the existing final assessment opens Siena.

Florence opens its real three-lesson unit, "Chez soi et dans le quartier".
The short optional cultural introduction teaches the Arno crossing and the 1982
UNESCO listing before its question. It includes three exact phrases from lesson 3,
their FR/EN/ES translations, and voluntary listening. Culture never grants mastery.

Sources:
- [Visit Tuscany: Ponte Vecchio](https://www.visittuscany.com/en/attractions/ponte-vecchio/)
- [UNESCO: Historic Centre of Florence](https://whc.unesco.org/en/list/174/)
- [Natural Earth public-domain terms](https://www.naturalearthdata.com/about/terms-of-use/)
- Data provenance and reward details: `lib/yo/italian/travel/README.md`.

## Interaction and reward

Selection, fractional visual position, learning evidence and unlocks remain
separate. A city tap moves Yoppo on the visible path without a route change or
mission opening. Retargeting starts at the displayed point. One Continue button
opens/resumes the real mission; closing it retains the exact cosmetic position.

`MapYoppo.tsx` preserves every original vector shape, color and proportion. Its far
arm now paints above the backpack/body, and its existing quill shapes are grouped
for wind animation. The scooter is a separate accessory; arm and leg groups
articulate into a riding pose. The original avatar fallback and approved taxi clip
remain unchanged.

Scooter eligibility reuses `canPlayItalianTrivia(u06, progress)`: all activities
in the first two Florence lessons, or its existing independent final assessment.
Equipping it is optional and persisted. Resetting evidence cannot retain an
unearned scooter. Neither culture nor equipment unlocks any city.

Arrival is explicit, 2.8 seconds, immediately skippable and remembered. Reduced
motion skips movement. An explicit replay control is available. No approved flight
or riding film exists in the repository: this preview uses procedural animation
with the approved vector and an existing icon, not an allegedly approved new film.

Sound/haptic controls reuse `LearningFeedback`. Voices are on-demand through an
opt-in context; existing course defaults outside the preview are unchanged.
Live reduced-motion changes now stop the shared traveler immediately. Radix
dialogs retain keyboard focus management and Escape; mobile Continue has a safe
bottom inset and large touch target.

## Files

- `components/yo/italian/travel/*`: geographic navigator, culture, arrival,
  separate scooter and responsive styles.
- `lib/yo/italian/travel/*`: projection, city centres, cosmetic parser, checkpoint
  eligibility and public-domain Italy outline/provenance.
- `GuidedItalianCourse.tsx`: optional client-side Navigator slot; default unchanged.
- `MapTraveler.tsx`, `useMapReducedMotion.ts`: accessory/pose extension and live
  preference subscription, preserving the shared fractional travel engine.
- `LearningAudio.tsx`: opt-in voluntary listening policy, default unchanged.
- `tools/italian-travel-review/*`: isolated standalone build, fixtures, static
  packaging, browser checks and evidence gallery. Build artifacts stay ignored.
- `tests/yo/yopratiqoItalianTravel.test.ts`: coordinates/road agreement, real IDs,
  midpoint boundary, cosmetic persistence, no extra unlock and isolation.
- `tests/yo/yopratiqoTravelAudioPolicy.test.tsx`: inherited autoplay suppression,
  explicit listening and preservation of existing course defaults.

## Initial validation at c4cd16e7

Commands run in this isolated worktree, with Node 24.15.0 and locked dependencies:

| Command | Result |
| --- | --- |
| `npm run test:yo-italian-course` | PASS: content, progression, player, audio, navigation, culture, guided, personalized, worlds |
| `node --import tsx tests/yo/yopratiqoTapFlow.test.tsx` | PASS, 23 checks |
| `node --import tsx tests/yo/yopratiqoSharedWorldMap.test.tsx` | PASS, 8 groups |
| `node --import tsx tests/yo/yopratiqoItalianTravel.test.ts` | PASS |
| `node --import tsx tests/yo/yopratiqoTravelAudioPolicy.test.tsx` | PASS |
| TypeScript `--noEmit --pretty false --incremental false` | PASS; complete final integration also checked by the successful Next build |
| ESLint over changed TS/TSX and preview entry | PASS; existing Browserslist age notice only |
| `node --import tsx scripts/validate_i18n.ts` | PASS, 3562 keys |
| `node tools/italian-travel-review/build.mjs --share` | PASS |
| `node tools/world-map-review/build-full-local.mjs` | PASS, repeated after the audio policy change, 369 static pages, isolated local backend, complete TypeScript check |
| `node tools/italian-travel-review/qa.mjs <bundled-runtime-package.json>` | PASS, 390x844 and 1280x900 Chromium emulation |

Browser evidence includes frame-by-frame DOM continuity, opacity, path distance,
scroll/URL stability, retargeting without position reset, locked Siena, real MP3
playback after click, actual mission opening/closing, exact position after return,
arrival persistence, scooter equip/remove/reload and live reduced motion. No
uncaught page errors or mutating network requests were observed. Culture and
navigation left the course ledger unchanged. The checkpoint fixture demonstrates
equipment UI; the new unit test separately earns its exact boundary through the
real progress functions. This is not a claim of completing all lessons manually.

The full-duration flight and reduced-motion arrival were both exercised. Screenshot
inspection found the scooter covering part of the Florence label; labels were moved
away from the traveler, with an edge placement adjustment for Siena. A targeted
browser assertion now checks label containment and the scooter/label intersection.
These final presentation-only edits were rebuilt in the standalone preview.

Evidence is generated in `build/italian-travel-review/evidence`: mobile video,
mobile/desktop captures, frame samples and machine-readable results. The static
preview publishes the curated gallery, not environment files or build logs.

Intermediate failures were not hidden: the test runner required an async main
instead of top-level await; the first live reduced-motion check found Motion's
mount-time snapshot and prompted a real subscription fix; changing demo fixtures
previously raced the outgoing UI save and now seeds only at the destination load.
An early duplicate build worker stopped without a code diagnostic; the completed
build was rerun sequentially. Docker access requires the authorized local process
permission; the restricted attempt was not counted as a passing build.

## Remaining limits and rollback

- Physical Safari/iPhone, tactile haptics and Android have not been tested.
- Cross-device synchronization is deliberately absent; these are local review keys.
- The preview is not a packaged app, offline course download or production signup.
- Existing structured lessons/assessment remain intact; their full mobile course
  completion is covered by existing automated tests, not a new human certification.
- No new approved cinematic assets. Visual likeness/pose remains subject to review.
- No global activation. To withdraw, remove the Preview; no data rollback is needed.
  Reverting this isolated feature leaves canonical course progress and access intact.

Final preview URL, tested commit and draft PR are recorded in the PR description.
Visual approval is required before any merge or production activation.

## App-feel and visible-arm follow-up

The user's open Site was the earlier Italian design preview, not this isolated
geographic prototype. Its screenshot confirmed the shared vector's far arm was
mostly covered by the backpack. This follow-up stays in draft PR #463.

- Correct paint order, with no new facial features or changed primitive geometry.
  A regression hash checks the same 37 approved shapes/color attributes.
- Subtle idle breathing, moving quills, stronger travel wind and backpack sway.
  Effects stop during lessons/equipment dialogs and under reduced motion.
- A shared rider/accessory facing transform keeps both hands on the handlebar
  when reversing direction. The scooter remains removable and cosmetic.
- Single-screen, unframed map instead of a long page and side panel. Continue is
  in a compact bottom dock; equipment and preferences are in a keyboard-accessible
  sheet. Existing notebook and course tools stay available.
- Review fixtures remain clearly identified but their controls are collapsible.
  Small-height/landscape screens may scroll so controls remain reachable.
- No progression, entitlement, sound preference, purchase or production changes.

The follow-up adds browser assertions for viewport fit, moving idle quills,
backpack sway, motion pause, and both hand-to-handlebar distances in both directions.
Final executed results and the updated Preview URL are recorded in the draft PR.
Initial full-build results above are historical, not a claim that a changed
revision has automatically passed the same checks.

### Follow-up validation, 2026-11-14 (America/Toronto)

- `node tools/world-map-review/build-full-local.mjs`: PASS, exit 0 at
  `2026-11-15T04:17:49Z`, including the complete application TypeScript check.
  Only the established local backend was used. The existing Turbopack warning
  about `experimental.forceSwcTransforms` remains; no check was disabled.
- The final preview-only proportional scooter sizing was rebuilt with
  `node tools/italian-travel-review/build.mjs`, then `--share` for publication.
  This navigator is still not activated by an application route.
- `node --import tsx tests/yo/yopratiqoMapCharacter.test.ts`: PASS. The 37 original
  vector primitives retain SHA-256
  `3207d17679aac4aec486e592d7c7024260fb92815531a4eb8c005898171a0b2d`.
- `node --import tsx tests/yo/yopratiqoSharedWorldMap.test.tsx`: PASS, 8 groups.
- `node --import tsx tests/yo/yopratiqoTapFlow.test.tsx`: PASS, 23 checks.
- `node --import tsx tests/yo/yopratiqoItalianTravel.test.ts`: PASS.
- `npm run test:yo-italian-course`: PASS, all nine constituent suites. Includes
  30 progress checks, 32 player checks, 9 audio checks, 9 navigation checks,
  16 guided checks, 14 personalization checks, content, culture and worlds.
- Targeted ESLint over the seven changed component/style files, the character
  regression test and preview entry: PASS. Browserslist age warning only.
- `node --import tsx scripts/validate_i18n.ts`: PASS, 3562 keys per locale.
- `git diff --check`: PASS.
- `node tools/italian-travel-review/qa.mjs <bundled-runtime-package.json>`: PASS
  in Chromium at 375x667, 390x844 and 1280x900. The runtime used Node 24.15.0.
  The recorded walks contain 217, 225 and 159 frames respectively. Maximum road
  deviations are below 0.18 map units. Maximum hand-to-grip distances are
  4.22px, 4.22px and 4.75px, below the unchanged 8px assertion.
- `node tools/italian-travel-review/character.mjs <bundled-runtime-package.json>`:
  PASS; enlarged riding capture and transformed hand/grip coordinates saved.

The browser checks cover the single-screen map, visible idle quill movement,
backpack sway, actual mid-walk retargeting, continuous road travel, stable DOM,
URL/scroll and course ledger, locked destinations, voluntary real MP3 playback,
mission return position, paused background motion, Skip, remembered arrival,
full flight, scooter equip/remove/reload, live reduced motion, and no network
writes or uncaught page errors. Mobile and desktop captures were visually read.

Two actual pose defects were fixed: walking limb animation could override the
riding pose, and the desktop character grew while the scooter stayed fixed-size.
Both now share a proportional rig and facing transform. A separate browser
assertion initially read the backpack after arrival under heavy build load; it
now records motion and animation in the same animation frame. It also explicitly
requires the retarget click to occur while walking. No threshold was loosened.

The shared origin is rebuilt from the reviewed commit and records its SHA and
bundle hash in `review-build.json`. The PR description carries the current URL.
This remains a visual-review draft, not approval for production or an iPhone
physical-device validation.

## Release integration, 2026-11-15

The sections above describe the historical review-only implementation. The user
has now authorized push, merge and production deployment. Release verification
found that the standalone preview was the only consumer of the new navigator.
The real Italian entry and unit routes now provide the existing Florence unit
and its three discovery audio paths to the guided player. They use real course
progress and the existing placement review policy, never review fixtures.

- Cosmetic position/equipment: `yo.it.travel.cosmetics.v1`, separate from the
  established first-meeting progress key and all `yo.review.*` keys.
- Continue uses the existing `italianMissionHref` route; a city tap does not
  navigate. Existing notebook, trivia for every eligible unit, and the earned
  magic-flute transition remain available. No access or assessment rule changes.
- The real map occupies one viewport; the standalone preview retains its own
  review-toolbar sizing. No changes to Café, its worktrees, billing or migrations.
- Current main was integrated without conflicts at `f622274`.
- The two Yo whitespace jobs previously compared against old feature branches,
  including a trailing blank line already on main in Café. They now check the
  exact PR base/push-before SHA against the tested tree, across all changed files.
  No test, lint rule or check is disabled, and the Café file is untouched.
- Previous production rollback candidate: `dpl_FTJGcXu5azMBDYsxa8P6oWvC6Sn3`,
  commit `e7ba5a0fde2505f4197108c0633fbec4b19131b3` (Pratiqo project, READY).
  The synthetic static preview must never be promoted to production.

Release validation and deployment results are recorded in the PR after execution.
Physical Safari and cross-device synchronization remain unverified. Reverting
the application release preserves canonical progress; the cosmetic key can remain
in storage unused. No database rollback or production data edit is required.

### Release checks actually executed

- `npm ci --ignore-scripts --no-audit --no-fund`: PASS against current main's lockfile.
- `node tools/world-map-review/build-full-local.mjs`: PASS with the isolated
  backend, exit 0, finished `2026-11-15T13:09:57.474Z`. Includes complete TypeScript
  and all 372 static pages. No production credentials or data used.
- `node --import tsx tests/yo/yopratiqoPersonalizedItalianPlayer.test.tsx`: 7/7.
  The added cases run the real entry/player, beginner locks, mission return,
  notebook, cosmetic persistence and placement access without earned rewards.
- `npm run test:yo-italian-course`: all nine suites PASS.
- Individual `tests/yo/yopratiqoItalianTravel.test.ts`,
  `yopratiqoMapCharacter.test.ts`, `yopratiqoSharedWorldMap.test.tsx` (8 groups),
  and `yopratiqoTravelAudioPolicy.test.tsx`: PASS using `node --import tsx`.
- Targeted ESLint over changed application routes, travel components, guided
  player, journey model and regression tests: PASS.
- `node --import tsx scripts/validate_i18n.ts`: 3562 keys/locale PASS.
- `git diff --check origin/main`: PASS; no Café or migration changes in PR diff.
- `node --import tsx tools/italian-travel-review/qa-application.mjs <runtime-package.json>`:
  PASS against the complete local Next production runtime, 390x844 and 1280x900.
  Screenshots visually inspected. Exactly one screen at both sizes; no JavaScript
  errors and no network write attempts. Actual u06 -> u08 Continue/resume route,
  mission closing, equipment reload, mid-walk retarget, unchanged ledger and
  reduced motion checked. Fixtures are refused on every non-loopback origin.
- Six GitHub workflows on `20e42708e85740ec127f95865c434f2612699f26`: SUCCESS;
  the Pratiqo Vercel Preview build also succeeded. Final-head status is in the PR.

Intermediate failures were corrected, not hidden: three unsupported `exact`
options in Testing Library role queries failed CI TypeScript; the runtime
assertions were unchanged when correcting those types. The new browser runner
needed CommonJS loading for existing TypeScript fixtures and normal, ordered
dismissal of the consent banner and optional PWA invitation. No UI was removed,
force-clicked or disabled to make the checks pass.

Read-only GitHub branch/ruleset inspection found no required check contexts.
The independent `pratiqo-cafe-pr3b` Vercel project remains outside this release:
its previous build failed on missing Supabase variables, not Italian code. No
configuration from that project was changed or copied. Its status is reported
separately, never represented as a green check for the main Pratiqo deployment.
