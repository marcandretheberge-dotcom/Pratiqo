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

`MapYoppo.tsx` is unchanged. The scooter is a separate accessory; existing arm and
leg groups articulate into a riding pose. The face, colors and proportions are not
redrawn. The original avatar fallback and approved taxi clip remain unchanged.

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

## Validation performed

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
