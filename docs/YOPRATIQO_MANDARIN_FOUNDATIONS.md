# Mandarin foundations: implementation and review

Branch: `feat/yopratiqo-mandarin-immersive-practice`.
Base: `8dfe424561c01e0a932c1d8b4b3d69f760158392` (Brazilian Portuguese release).
Review preparation: November 2-3, 2026. The initial task did not authorize release; the user subsequently authorized deployment on November 3 after the complete audio upgrade. The validation history below remains separate from that release authorization.

## Scope and architecture

The Japanese content/player/progress/audio, Italian, German and Brazilian Portuguese foundations were inspected before implementation. The new course follows their static content, local versioned progress, FR/EN/ES localization, existing Yoppo artwork and explicit audio patterns. Chinese lessons and stroke data are independent of Japanese content. Existing purchases, permissions and course progress keys are unchanged.

- `app/yo/langues/mandarin/parcours`: server route with a compact serializable catalog view model, plus a dynamic unit route. Unknown units use `notFound()`. Learning routes are `noindex,follow`, consistent with the existing course convention.
- `lib/yo/mandarin`: typed original content, activities, progress evaluator, published asset manifests and accessible scene descriptions. Hanzi, tone-marked pinyin and translations remain separate.
- `components/yo/mandarin`: scene/dialogue/vocabulary/grammar/strokes/practice/culture/review player, accessible exercise controls, explicit audio playback and recovery.
- `components/yo/companion` and `lib/yo/companion`: reusable companion accepting lesson/help/game adapters, initially integrated only into Mandarin. No rewrite of other courses.
- `YoLanguageQuickStart` adds the catalog entry. `InstallAppPrompt` excludes only the new course prefix, using the same policy as German and Portuguese, to keep mobile lesson navigation unobstructed.
- `lib/yo/types.ts` and `audio/accentProfiles.ts` register standard Mandarin. No new application runtime dependency. The later offline audio upgrade adds explicit development dependencies as documented below.

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

- 155 active locally bundled AI speech MP3s, generated with `gpt-realtime-2.1` and the `marin` voice. `audioPaths.json` maps exact Chinese text to versioned `v2` paths; `audioProvenance.json` records model, voice, exact returned transcript, request hash, audio hash, generation date and duration. Total active speech duration is approximately 4.284 minutes. The original 155 `v1` recordings remain byte-for-byte intact for rollback. UI explicitly labels synthesized speech.
- Four human-recorded tone examples from Wikimedia Commons, with speaker, original source, license and adaptation in `toneAssets.json`. They are used for tone study and identification instead of treating synthesized single syllables as phonetic ground truth.
- Eight licensed WebP photos. `imageAssets.json` records original URL, author, license URL, dimensions and conversion; all eight images were visually inspected. Locations are accurately described, without claiming that fictional lesson characters appear in the photo. The practice map and menu prices are explicitly fictional.
- Eight character stroke models from Hanzi Writer Data / Make Me a Hanzi, pinned to revision `68d10a4b21150cae5e1ebbd223eed289cf32d90c`. The Arphic license is bundled in `public/yo/mandarin-strokes/LICENSE.txt`. Manual stroke stepping and paper practice are offered, not automatic handwriting grading.
- Language reference: [MIT OpenCourseWare, Learning Chinese](https://ocw.mit.edu/courses/res-21g-003-learning-chinese-a-foundation-course-in-mandarin-spring-2011/). Trivia carries per-question authoritative source URLs and verification dates; sources include MIT, UNESCO, NASA, NOAA, Smithsonian and ISO. Random questions are self-contained, not dependent on the preceding question.

Asset acquisition scripts are manual, not runtime/build hooks. The original generation reused the established speech request/cache/MP3 validation helpers, required an explicit `--generate`, never uploaded, reserved budget before each request and made no automatic charged retry. Existing MP3s were not overwritten. The authorized ceiling was USD 3; the original batch's conservative reservation was USD 0.06291, not a billing statement. This historical figure excludes the subsequent comparisons and complete upgrade documented below. Three obsolete menu-price variants were removed from the new unpublished batch after separating prices from hanzi. No pre-existing course assets were removed.

`node --import tsx scripts/generate-mandarin-course-local-audio.ts --verify` needs no secret and checks all published recordings. Generation cache/budget evidence stays in ignored `.cache/mandarin-local-audio/`; credentials and local preview configuration remain outside this worktree.

### Audio model comparison, 2026-11-03

The initial 155 bundled recordings used `tts-1-hd` with `alloy`. Its request does not accept the pronunciation instructions supported by newer models. The human tone references remain separate. No course recordings were replaced during the comparison itself; the subsequent authorized upgrade is documented below.

After checking current official model documentation and the authorized account's model availability, two newer candidates were tested on six existing course scripts: a greeting, a negative request, family vocabulary, an introduction, a price question and a number sequence. Only punctuation and whitespace were ignored in the transcript comparison; words were not normalized away.

| Candidate | Samples | Exact returned transcript | Decision |
| --- | ---: | ---: | --- |
| `gpt-audio-1.5`, `marin` and `alloy`, Chat Completions | 12 | 4 | Reject this tested configuration: several clips added conversational responses despite exact-reading instructions. This is not a universal model benchmark. |
| `gpt-realtime-2.1`, `marin`, no conversation context, explicit reading instructions | 6 | 6 | Preferred upgrade candidate. All responses completed and returned valid 24 kHz mono PCM recordings, saved as WAV files. |

The newer Realtime configuration uses an explicit output-token cap, a fresh context per script and no tools. Both comparisons reserve spending in the existing shared Mandarin ledger before each request and share its exclusive generation lock. There are no automatic charged retries, uploads, course registry changes or production changes. Samples and per-request provenance remain under ignored `.cache/mandarin-local-audio/quality-*`; the two manual experiment runners remain outside this worktree in `../mandarin-preview-local/`.

Commands actually run: `node --import tsx ../mandarin-preview-local/audio-quality.cjs --estimate`, the same command with `--generate`, `node ../mandarin-preview-local/audio-realtime-quality.cjs --estimate`, and the same command with `--generate`. The reported-usage cost estimate for these experiments is USD 0.114017; it is not an invoice. The shared cumulative conservative reservation, including the original batch, is USD 0.75021 against the authorized USD 3 ceiling.

Selection is based on current supported tooling and the observed exact-reading results, not a claim of proven superior Mandarin pronunciation. Returned transcripts are not independent phonetic validation. A Mandarin speaker still needs to assess lexical tones, neutral tones, tone sandhi and natural pacing before approving a full replacement batch. No entire-course pronunciation review, full migration or deployment was performed in this comparison.

Official sources checked: [GPT-Audio-1.5](https://developers.openai.com/api/docs/models/gpt-audio-1.5), [GPT-Realtime-2.1](https://developers.openai.com/api/docs/models/gpt-realtime-2.1), [Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations), and [speech API deprecation/migration guidance](https://developers.openai.com/api/docs/guides/text-to-speech). The documented Speech API retirement does not stop existing bundled MP3 files from playing.

### Authorized complete audio upgrade

After the user's request to redo all audio with the selected model, all 155 course scripts were regenerated using GPT-Realtime-2.1/Marin. All 155 completed with matching returned transcripts on their first attempt. The four human-recorded tone reference files were deliberately preserved, not replaced with synthetic ground truth. No other language recordings changed.

The offline generator now uses the Realtime WebSocket API, an empty conversation context, explicit Mandarin reading instructions and a 512-token output ceiling per request. It rejects incomplete responses, silence, invalid PCM, incorrect transcripts and invalid MP3 durations. FFmpeg converts 24 kHz mono PCM to 96 kbps MP3 without time stretching, so all existing player components remain unchanged. FFmpeg is a local prerequisite supplied through `FFMPEG_PATH`, not an application runtime or build dependency. `ws` (already present transitively) and its typings are explicitly pinned as development dependencies.

Budget accounting shares the original locked ledger. Each request reserves a conservative maximum before sending. After known valid usage is returned, only unused reservation is released; all output tokens, including reasoning/text, are conservatively charged at the higher audio rate. Interrupted/unknown usage keeps its full reservation. There are no automatic charged retries; `--generate --retake` is an explicit opt-in for a previously rejected/unfinished script only. The new batch adds USD 0.624376 to the conservative bound. The cumulative bound including the original batch and comparisons is USD 1.374586, below the authorized USD 3 ceiling; neither figure is an invoice.

Accepted PCM and provenance are cached before encoding. Existing MP3s cannot be overwritten. The active path/provenance registries switch only after every required script passes. Offline verification needs no API key, network or encoder:

```text
node --import tsx scripts/generate-mandarin-course-local-audio.ts --verify
```

Generation is manual with `--generate`, `OPENAI_API_KEY` and `FFMPEG_PATH`, using the existing ledger. No generation runs in the app or build, and no upload is performed. New regressions cover transcript fidelity, capped accounting, failure/no-retry behavior, silence rejection, exclusive locking and the exact model/voice/hash of every active recording. The scope guard permits only exact manifest-listed new `v2` paths, and tests verify the old recordings and human references remain unchanged.

Returned transcript checks are not an independent speech recognition or native-speaker phonetic review. The remaining native Mandarin review requirement still applies. This change is local, without merge or deployment.

## Validation evidence

Initial course validation below predates the complete audio upgrade; it is not presented as a rerun of every suite for `v2`. Audio-upgrade validation is recorded separately at the end. Executed locally, not inferred from CI:

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

### Complete audio upgrade validation, 2026-11-03

These checks were actually rerun after the v2 recording batch, separately from the initial course evidence above:

| Command / check | Result |
| --- | --- |
| `node ../mandarin-preview-local/audio.cjs` | Manual generation: 155 accepted, 155 exact returned transcripts, zero rejected, zero uploaded; cumulative conservative budget bound USD 1.374586 |
| `node --import tsx scripts/generate-mandarin-course-local-audio.ts --verify` | PASS: all 155 v2 files, paths, hashes and provenance; no network or generation |
| `npm run test:yo-mandarin` | PASS: 10 content/assets tests, 11 player scenarios (336 localized checked submissions) and 8 initial generation tests |
| `node --import tsx tests/yo/yopratiqoMandarinRealtimeAudio.test.ts` | PASS after adding scope-negative coverage: 9 tests, including no replacement of any pre-existing recording |
| `node --import tsx tests/teacherLaunch/teacherLaunchCenter.test.ts` | PASS |
| `node --import tsx tests/teacherProfile/teacherProfileManagement.test.ts` | PASS |
| `node --import tsx tests/yo/yopratiqoAudioPronunciationOverrides.test.ts` | PASS: 11 assertions |
| `npm run test:launch-critical` | PASS after the narrowly scoped audio exception below; entire suite rerun to exit 0 |
| `npx tsc --noEmit` | PASS, including the new generation and scope tests |
| `node ../mandarin-preview-local/app.cjs build` | PASS: full production build using the synthetic local backend; 355 generated static pages and dynamic course routes |
| Focused `npx eslint ... --max-warnings 0` | PASS: changed generator, manifest and tests, including both scope guards |
| `npm run lint -- --quiet` | PASS again after the scope-guard changes, exit 0; warnings are not included by this quiet command |
| `node --import tsx scripts/validate_i18n.ts` | PASS: 3,562 keys per locale |
| Prettier 3.6.2 | Applied to the new/changed generator, manifest and new tests; no formatter dependency added |
| Local HTTP asset verification | PASS: all 155 v2 MP3 URLs returned HTTP 200; served bytes match local generated file hashes |
| Production-build browser playback | PASS: u01 dialogue playback; fresh u02 listening activity kept Verify disabled after answer selection, enabled it only after the actual audio completed; no captured console errors/warnings |
| `git diff --check` | PASS |

The first full launch rerun exposed two older teacher-feature guards that rejected every committed Mandarin MP3 in the branch's diff from main, even though the course addition is authorized. Both now reuse `tests/helpers/mandarinAudioScope.ts`: only exact manifest-registered v1/v2 Mandarin files and the four registered tone sources are allowed, only when absent from the comparison base, and only with valid MP3 bytes. Negative tests reject unregistered paths, other-language files, unknown tones and replacement of an existing file. No blanket audio waiver, compiler relaxation or disabled test was added. Independently, the course test compared all 159 original v1/tone files to HEAD and confirmed byte-for-byte preservation.

Changed delivery files: the offline generator; Mandarin audio manifest, active paths and new provenance; 155 new v2 MP3s (3,091,743 bytes); package manifest/lockfile for the two development dependencies; Mandarin course and generation tests; shared audio-scope helper and its two callers; pronunciation-scope test; this report. No application/player behavior or other language content changed.

The successful build was restarted only on the Mandarin local preview (`127.0.0.1:55640`). Browser adapter recovery and restricted-shell localhost/npm access required tool retries, not application changes. The npm formatter's initial restricted-network attempt failed; the pinned formatter subsequently succeeded. Existing non-blocking build/tool warnings concern `forceSwcTransforms` under Turbopack and the Browserslist database age, not failed checks. Human phonetic approval and physical-device listening are still separate review requirements. No new commit, push, merge, deployment or production data operation was performed in this upgrade.

## Review limits and handoff

- A native Mandarin teacher should review the complete linguistic sequence and listen to all synthesized phrases before broad publication. Structural audio validation and sampled real-browser playback are not a human phonetic review. No HSK certification, pronunciation grading or free-conversation assessment is claimed.
- Physical iPhone/Safari and Android devices were not tested in this task. Desktop browser responsive views and DOM keyboard/interaction tests are not physical-device tests.
- Character practice is sourced observation/reproduction, not a handwriting recognizer. Speaking is guided practice with a model, not scored microphone input.
- The companion is initially Mandarin-only. No cross-course migration, account synchronization or installable offline language package is implemented.
- The branch is for review. No database migration, payment, checkout, booking, teacher/student onboarding, production environment, external notification or unrelated worktree change is included.

Review preview: `/yo/langues/mandarin/parcours`, then `u01` through `u08`, and `bilan`; append `?lang=en` or `?lang=es`. Enter a typed answer, open Yoppo, complete three questions, choose one more, then return and refresh to inspect exact recovery. A missing audio response must not permit listening completion. Sources/credits are accessible from the course and tone panels.

## Authorized release procedure

Use existing PR #424, squash only after the final-head checks are successful and GitHub confirms mergeability. Let the main-branch Git integration build with Vercel Production settings; do not promote or upload the isolated localhost build. No migration or environment-variable change is required. Preserve the previous main/deployment reference for rollback. Verify the production catalog, all eight modules, final mission, FR/EN/ES entry points, images, strokes and every active v2 recording, including byte hashes. Sample actual browser playback and confirm the listening prerequisite. Production smoke tests are anonymous and must not create accounts, bookings, payments or notifications. If the release introduces a blocking regression, restore the previous production deployment; the additive static assets require no data rollback.

The latest local checks above are reused because the reviewed application/audio code and base commit are unchanged. Release authorization does not imply a completed native-speaker phonetic review or physical-device QA.
