# YoPratiqo cinematic moments

## Presentation contract

Cinematics accompany travel and existing learning outcomes. They never write exercise results, mastery, credits, Pass access or collectible grants.

`useMissionCinema(namespace, { active })` provides a separate, bounded queue of `mission-start`, `mission-success` and `artifact` moments. Call `present({ id, kind, title, detail? })` **after** committing the actual lesson transition or successful outcome. Mount `MissionFilm` with the returned scene and `onContinue={finish}`. Finishing means only dismissing presentation.

Use a stable namespace for the language and course and a stable event ID for the mission plus the existing reset/attempt generation. The hook scopes playback cursors to its namespace. A direct `MissionFilm` caller must supply an equally scoped `id` or `scope`. Existing outcome queues, such as AdventureProgress, may use the player directly and retain their canonical dismissal logic; never display their prior modal and the cinematic modal simultaneously.

`active: false` hides the current scene while keeping it queued, for example while an arrival film is already open. Duplicate events are ignored. A stale finish callback cannot consume the next queued scene.

## Travel and assets

The existing authored travel choices remain intact: crossing a country boundary uses the actual airplane clip; different cities in the same country use rail except the authored Italian car/taxi pairs. The Canadian rail film is distinct from the Italian rail film. Same-city movement does not pretend to be an international journey.

Existing reviewed files are preserved:

- `departure.mp4` and its poster: airplane departure.
- `rail.mp4` and its poster: rail travel.
- `rail-canada.mp4` and its poster: Canadian rail travel.
- `road.mp4` and its poster: car travel.
- `animations/yoppo-taxi-approved.mp4` and its poster: the approved taxi scene.

The three new mission slots have independent assets: `mission-ready`, `mission-success`, and `artifact-reveal`. Their video source stays `null` until an actual reviewed MP4 exists. A still scene shows its actual illustration, descriptive caption and Continue action, with no Play control or fabricated video URL. A taxi clip must never substitute for an airplane or generic reward reveal.

## Recovery and accessibility

- Skip and Continue are available immediately, including before metadata loads, while buffering, offline and after an error.
- Playback starts muted. Film sound follows the existing effects preference and additionally requires an explicit in-player choice.
- Reduced motion and data-saving preferences prevent autoplay. A deliberate Play action remains available.
- Visibility loss and page hiding pause playback. Returning to a tab does not restart sound automatically.
- FR/EN/ES descriptive captions remain available independently of sound. These clips are nonverbal; the captions describe the travel or learning moment rather than inventing spoken dialogue.
- An eight-second loading/stall watchdog replaces an indefinite spinner with an explanatory fallback. No successful video playback is required to continue.
- Dialog focus, Escape dismissal, large touch controls and mobile-safe wrapping remain available on the same player used by every language.

## Persistence boundaries

The seen ledger uses its own `yo.cinema.v1.*.seen` localStorage keys. Pending scenes use tab sessionStorage, expire after 24 hours, and never reconstruct a learning or payment callback. Playback cursors use `yo.cinema.playback.v1.*`, are tied to the exact asset source and expire after six hours. Reopening the same interrupted scene resumes its cursor; ending or skipping clears it.

Storage failure falls back to memory. Learning stays usable when all browser storage is blocked. Cosmetic deduplication across a full browser restart cannot be guaranteed if the browser refuses storage; this does not grant or revoke anything.

Travel callbacks stay in the existing travel controller. An interrupted route film can resume when that same leg is reopened, but persistence never replays a lost navigation callback from another page.

## Verification

- `node --import tsx tests/yo/yopratiqoTravelFilmRoutes.test.ts`
- `node --import tsx tests/yo/yopratiqoMissionCinemaState.test.ts`
- `node --import tsx tests/yo/yopratiqoMissionCinemaPlayer.test.tsx`

The state tests cover duplicate and stale events, queue order, malformed/expired storage, bounded state and real asset files. Component tests exercise reduced motion, blocked autoplay, offline and still-only scenes, media errors, stalls, tab visibility, cursor resume, skip/end idempotency and a separate untouched learning/reward fixture.

### Browser evidence

`scripts/prepare_yo_shared_review.ts` creates the existing backend-free Next shell by importing the real course routes and public assets. It includes the English/shared introductions, Italian course, Dominican introduction and Quebec lesson 3. It does not recreate the players or provide a fake video.

With the shell running on `http://127.0.0.1:3246`, run these in the existing Chromium/WebKit journal job:

```sh
python tests/yo/yopratiqoJournal.browser.py
python tests/yo/yopratiqoTravelFilms.browser.py
python tests/yo/yopratiqoPremiumCinema.browser.py
```

The premium runner uses `YO_JOURNAL_URL`, `YO_JOURNAL_QA_DIR` and `YO_JOURNAL_BROWSERS`, like the existing runners. It covers English introduction, Italian unit 2 and the Dominican introduction at widths 393 and 320 pixels, with reduced motion at the narrower width. Only onboarding preferences are seeded; no assessment result or reward is injected. Checks require actual decoded airplane playback, a working Skip action, the genuine mission poster with no pending MP4 source or Play button, a collapsed voice panel, no automatic speech/auth API request or microphone request, and no horizontal overflow. The Dominican case also verifies that keyboard navigation cannot advance the underlying deck during either cinematic.

Each successful case writes travel, mission-poster and collapsed-speech PNGs to `YO_JOURNAL_QA_DIR`, plus an engine-specific JSON results file. Failures write a screenshot before exiting. Microphone calls are counted and rejected by the test, and speech/provider/auth endpoints are intercepted so a regression cannot create a paid call.

Local execution on 2026-11-25 was blocked before the first page by Chromium's `socket() failed: Operation not permitted` startup error. Python syntax and fixture lint checks passed; this is not a passed visual review. The Chromium Ubuntu and WebKit macOS CI runs must produce the actual screenshots and browser results before claiming visual verification.
