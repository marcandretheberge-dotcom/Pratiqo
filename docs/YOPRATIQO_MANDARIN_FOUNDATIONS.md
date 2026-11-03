# Mandarin foundations: implementation and review

Branch: `feat/yopratiqo-mandarin-immersive-practice`.
Base: `8dfe424561c01e0a932c1d8b4b3d69f760158392` (Brazilian Portuguese release).
Review preparation: November 2-3, 2026. No merge or production deployment authorized by this task.

## Scope and architecture

The Japanese content/player/progress/audio, Italian, German and Brazilian Portuguese foundations were inspected before implementation. The new course follows their static content, local versioned progress, FR/EN/ES localization, existing Yoppo artwork and explicit audio patterns. Chinese lessons and stroke data are independent of Japanese content. Existing purchases, permissions and course progress keys are unchanged.

- `app/yo/langues/mandarin/parcours`: server route with a compact serializable catalog view model, plus a dynamic unit route. Unknown units use `notFound()`. Learning routes are `noindex,follow`, consistent with the existing course convention.
- `lib/yo/mandarin`: typed original content, activities, progress evaluator, published asset manifests and accessible scene descriptions. Hanzi, tone-marked pinyin and translations remain separate.
- `components/yo/mandarin`: scene/dialogue/vocabulary/grammar/strokes/practice/culture/review player, accessible exercise controls, explicit audio playback and recovery.
- `components/yo/companion` and `lib/yo/companion`: reusable companion accepting lesson/help/game adapters, initially integrated only into Mandarin. No rewrite of other courses.
- `YoLanguageQuickStart` adds the catalog entry. `InstallAppPrompt` excludes only the new course prefix, using the same policy as German and Portuguese, to keep mobile lesson navigation unobstructed.
- `lib/yo/types.ts` and `audio/accentProfiles.ts` register standard Mandarin. No new runtime dependency or lockfile change.

## Inventory

| Module        | Practical objective                      | Checked exercises |
| ------------- | ---------------------------------------- | ----------------: |
| 1             | Greetings, names and first conversations |                11 |
| 2             | Numbers, prices and purchases            |                12 |
| 3             | Ordering food and drinks                 |                14 |
| 4             | People, family and introductions         |                13 |
| 5             | Directions and transport                 |                14 |
| 6             | Time, dates and plans                    |                13 |
| 7             | Shopping and simple requests             |                13 |
| 8             | Integrated day out                       |                14 |
| Final mission | Eight checked practical tasks            |                 8 |

Totals: 8 modules, 112 checked exercises including the final mission, 48 dialogue turns, 64 vocabulary entries, 16 grammar explanations, 8 Chinese characters and 60 trivia questions (12 in each of 5 categories). Vocabulary entries may intentionally recur for retrieval practice. Exercises include listening, image selection, menu selection, a fictional map, matching, sentence construction, typed responses, tone identification and guided roleplay.

Yoppo offers Help, Play and Discover. Five language mini-game modes coexist with broad trivia. Games/trivia cannot complete course exercises. After three completed questions or three visible active minutes, an invitation appears only after the current answer/explanation and audio finish. "One more" permits exactly one more completed question. Timing has an injectable monotonic clock; background/closed time is excluded.

Progress records exact activity/step/draft, successful checked responses, independent-versus-assisted history, self-assessment and separate trivia participation. Hints/model exposure and retries cannot award new independent success. Previously earned independent success remains historical. Refresh requires a fresh complete playback for an unfinished listening task. Corrupt/foreign-version/blocked storage is handled without crashing; blocked storage is explicitly reported. No account sync or offline download package is claimed.

## Media and provenance

- 155 locally bundled AI speech MP3s; `audioPaths.json` maps exact Chinese text to deterministic hashed paths. All files pass MP3 frame/duration validation. Total speech duration is approximately 2.334 minutes of short reusable phrases. UI explicitly labels synthesized speech.
- Four human-recorded tone examples from Wikimedia Commons, with speaker, original source, license and adaptation in `toneAssets.json`. They are used for tone study and identification instead of treating synthesized single syllables as phonetic ground truth.
- Eight licensed WebP photos. `imageAssets.json` records original URL, author, license URL, dimensions and conversion; all eight images were visually inspected. Locations are accurately described, without claiming that fictional lesson characters appear in the photo. The practice map and menu prices are explicitly fictional.
- Eight character stroke models from Hanzi Writer Data / Make Me a Hanzi, pinned to revision `68d10a4b21150cae5e1ebbd223eed289cf32d90c`. The Arphic license is bundled in `public/yo/mandarin-strokes/LICENSE.txt`. Manual stroke stepping and paper practice are offered, not automatic handwriting grading.
- Language reference: [MIT OpenCourseWare, Learning Chinese](https://ocw.mit.edu/courses/res-21g-003-learning-chinese-a-foundation-course-in-mandarin-spring-2011/). Trivia carries per-question authoritative source URLs and verification dates; sources include MIT, UNESCO, NASA, NOAA, Smithsonian and ISO. Random questions are self-contained, not dependent on the preceding question.

Asset acquisition scripts are manual, not runtime/build hooks. Generation reuses the established speech request/cache/MP3 validation helpers, requires an explicit `--generate`, never uploads, reserves budget before each request and makes no automatic charged retry. Existing MP3s are never overwritten. The authorized ceiling was USD 3; the cumulative conservative reservation was USD 0.06291, not a billing statement. Three obsolete menu-price variants were removed from the new unpublished batch after separating prices from hanzi. No pre-existing course assets were removed.

`node --import tsx scripts/generate-mandarin-course-local-audio.ts --verify` needs no secret and checks all published recordings. Generation cache/budget evidence stays in ignored `.cache/mandarin-local-audio/`; credentials and local preview configuration remain outside this worktree.

## Validation evidence

Executed locally, not inferred from CI:

| Command                                                                      | Result                                                                                                                      |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `npm run test:yo-mandarin`                                                   | 9 content/policy/assets tests and 11 DOM scenarios; all 112 exercise controls checked in each of FR/EN/ES (336 submissions) |
| `npm run test:yo-german`                                                     | PASS: content, player and audio                                                                                             |
| `npm run test:yo-portuguese`                                                 | PASS: content and player                                                                                                    |
| `npm run test:yo-italian-course`                                             | PASS: content, progress, player, navigation, culture and audio                                                              |
| `npm run test:launch-critical`                                               | PASS, including Japanese foundations, recorded audio and other existing launch contracts                                    |
| `npm run test:yo-audio-pronunciation`                                        | PASS: 11 assertions; exact registered new Mandarin files allowed, all prior MP3s still protected                            |
| `node --import tsx scripts/generate-mandarin-course-local-audio.ts --verify` | PASS: 155 verified, zero generated/uploaded                                                                                 |
| `npx tsc --noEmit`                                                           | PASS after correcting Testing Library options in the new test file; no compiler settings relaxed                            |
| `npm run lint -- --quiet`                                                    | PASS, no errors; this command does not report warnings                                                                      |
| `npx tsx scripts/validate_i18n.ts`                                           | PASS: 3,562 keys across FR/EN/ES; Mandarin localized structures checked separately by its suite                             |
| `node ../mandarin-preview-local/app.cjs build`                               | Production `next build` through the external local-backend harness; PASS, 355 static pages plus dynamic Mandarin routes     |
| Prettier 3.6.2 on new source files                                           | Formatted and checked, no dependency added                                                                                  |
| `git diff --check`                                                           | PASS                                                                                                                        |

The first launch-critical attempt rejected the new ignored audio cache and unregistered Mandarin MP3 paths. The fix adds one ignored cache directory and an exact manifest-backed new-asset allowlist, with negative coverage for old/unregistered MP3s. The entire suite was rerun, not bypassed. Full TypeScript also caught Playwright's `exact` option being used in Testing Library role queries; removing the unsupported option preserves Testing Library's default exact string-name matching. No tests or build gates were disabled.

Browser verification used the production build on `http://127.0.0.1:55640`, backed by the existing synthetic local environment; no production data or auth changes. Desktop 1440x1000 and mobile 390x844 / 320x740 were inspected. Verified catalog-to-course navigation, rendered images, real MP3 playback/ended gating, matching and sentence controls, typed draft through trivia/minimize/refresh, three-question/active-time return invitation and exactly one more, the illustrated map answer, FR/EN/ES switching without losing results, keyboard movement/hide/restore of Yoppo, and no mobile horizontal overflow. The course-specific install-banner obstruction and transient stroke loading recovery were corrected and regression-tested. The final production browser tab had no captured console errors or warnings.

## Review limits and handoff

- A native Mandarin teacher should review the complete linguistic sequence and listen to all synthesized phrases before broad publication. Structural audio validation and sampled real-browser playback are not a human phonetic review. No HSK certification, pronunciation grading or free-conversation assessment is claimed.
- Physical iPhone/Safari and Android devices were not tested in this task. Desktop browser responsive views and DOM keyboard/interaction tests are not physical-device tests.
- Character practice is sourced observation/reproduction, not a handwriting recognizer. Speaking is guided practice with a model, not scored microphone input.
- The companion is initially Mandarin-only. No cross-course migration, account synchronization or installable offline language package is implemented.
- The branch is for review. No database migration, payment, checkout, booking, teacher/student onboarding, production environment, external notification or unrelated worktree change is included.

Review preview: `/yo/langues/mandarin/parcours`, then `u01` through `u08`, and `bilan`; append `?lang=en` or `?lang=es`. Enter a typed answer, open Yoppo, complete three questions, choose one more, then return and refresh to inspect exact recovery. A missing audio response must not permit listening completion. Sources/credits are accessible from the course and tone panels.
