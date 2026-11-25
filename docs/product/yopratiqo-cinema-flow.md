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

The three mission slots now have independent, reviewed local MP4s: `mission-ready`, `mission-success`, and `artifact-reveal`. Ready shows Yoppo holding the backpack straps, blinking and taking a small grounded step. Success closes the existing journal with both hands, then shows a satisfied smile. Artifact opens the backpack and reveals a warm interior light without inventing a coin, Pass, trophy or entitlement. The actual earned collectible remains the responsibility of the existing course UI.

All three were generated from their corresponding approved first frames using Seedance 2.5, five seconds, 720p and native audio disabled. Individual pending requests were approved through their existing review cards after independent review and explicit delegated authorization; the global Review preference remained unchanged. Each completed render settled at 213 credits (218 reserved, five refunded), 639 total. No new request or paid retry was created.

The delivery files are H.264, 1280×720, 24 fps, yuv420p, 5.041667 seconds, with no audio stream. They are compressed at CRF 20 with `faststart`; originals remain available in CreativeClaw. Full decoding completed without errors. Seven sampled frames per original and the compressed final frames were visually inspected for character identity, hand/object continuity, unwanted text and invented rewards. This frame inspection is distinct from the browser playback checks below.

| Asset in `public/companion/travel/films/` | Bytes | Reviewed delivery SHA-256 |
| --- | ---: | --- |
| `mission-ready.mp4` | 1,033,705 | `edd383efeb20eb8d692084b71dcd363d937cfb2c3fbc9958878552e5b20c64b5` |
| `mission-success.mp4` | 1,109,289 | `d22df95099e3f9a6bdee1a984efff41dc6682302873a294ad092366725a85d54` |
| `artifact-reveal.mp4` | 1,228,318 | `5be4d7cec26f74f652db90d594ee67b9406cf9ef447274b3aff91042512dac57` |

The corresponding real illustrations remain the fallback for reduced motion, offline use and media errors. Future unrendered slots must keep `src: null`; a still scene shows its actual illustration, descriptive caption and Continue action, with no Play control or fabricated video URL. A taxi clip must never substitute for an airplane or generic reward reveal.

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
- `node --import tsx tests/yo/yopratiqoInterestCinemaDismissal.test.tsx`

The state tests cover duplicate and stale events, queue order, malformed/expired storage, bounded state and real asset files. Component tests exercise reduced motion, blocked autoplay, offline and still-only scenes, media errors, stalls, tab visibility, cursor resume, skip/end idempotency and a separate untouched learning/reward fixture.

### Browser evidence

`scripts/prepare_yo_shared_review.ts` creates the existing backend-free Next shell by importing the real course routes, their required layouts and public assets. It includes the English/shared introductions, Italian course, Dominican introduction and Quebec lesson 3. The Italian route layout imports the same course and map CSS as production; the browser runner checks that its mobile content spacing is present. It does not recreate the players or provide a fake video.

With the shell running on `http://127.0.0.1:3246`, run these in the existing Chromium/WebKit journal job:

```sh
python tests/yo/yopratiqoJournal.browser.py
python tests/yo/yopratiqoTravelFilms.browser.py
python tests/yo/yopratiqoPremiumCinema.browser.py
python tests/yo/yopratiqoInterests.browser.py
```

The premium runner uses `YO_JOURNAL_URL`, `YO_JOURNAL_QA_DIR` and `YO_JOURNAL_BROWSERS`, like the existing runners. It covers English introduction, Italian unit 2 and the Dominican introduction at widths 393 and 320 pixels, with reduced motion at the narrower width. Only onboarding preferences are seeded; no assessment result or reward is injected. Checks require actual decoded airplane and mission-ready playback, a working Skip/Continue action, paused mission playback before a deliberate Play action with reduced motion, a collapsed voice panel, no automatic speech/auth API request or microphone request, and no horizontal overflow. The Dominican case also verifies that keyboard navigation cannot advance the underlying deck during either cinematic. The component suite separately retains explicit offline and `src: null` fallback coverage.

Each successful case writes travel, mission-film and collapsed-speech PNGs to `YO_JOURNAL_QA_DIR`, plus a reduced-motion still at 320 pixels and an engine-specific JSON results file. Failures write a screenshot before exiting. Microphone calls are counted and rejected by the test, and speech/provider/auth endpoints are intercepted so a regression cannot create a paid call.

The interest runner adds eight cases per engine: the real Italian, English, Mandarin (`zh-Hans`) and Quebec routes, at 393 pixels for Art and 320 pixels with reduced motion for History. It selects preferences through the UI, follows the authored dialogue, submits a genuine wrong typed answer, closes and reloads the page, resumes the exact question and finishes with the assistance marker still intact. The resulting score must remain three independent answers out of four. It also requires decoded success-film playback, preserves canonical course storage, checks focus through keyboard dismissal and confirms zero automatic audio, device voice, microphone, speech or auth requests. Screenshots capture the choice, dialogue, error, success film and completion. The Node dismissal regression covers the same modal boundary without claiming browser or visual verification.

Local execution on 2026-11-25 was blocked before the first page by Chromium's `socket() failed: Operation not permitted` startup error. Python syntax and fixture lint checks passed; this is not a passed visual review. The Chromium Ubuntu and WebKit macOS CI runs must produce the actual screenshots and browser results before claiming visual verification.

CI run `45529860972` at `a27291b7de502dc70f64d19697b9d7fa41fc6a50` passed all three runners on Chromium and WebKit on 2026-11-25. Its twelve premium cases recorded zero speech/auth requests and zero microphone requests. Inspection of the downloaded screenshots confirmed the travel, mission poster and collapsed voice states, but exposed a missing Italian layout in the review fixture: the course content had lost its production spacing. The fixture was corrected and now asserts that spacing. Run `45530427178` at `c23a99711c1c1cb7b50576fa9c735802cd223524` passed both engines; the four corrected Italian screenshots were inspected and showed the actual course padding. Those runs predate the three MP4 activations above. The updated runner must pass in the new branch CI before browser playback of these new delivery files is considered verified.
