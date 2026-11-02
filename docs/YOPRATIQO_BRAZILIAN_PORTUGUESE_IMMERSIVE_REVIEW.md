# Brazilian Portuguese: Immersive Beginner Course

## Scope and Release State

Prepared on `feat/yopratiqo-brazilian-portuguese-immersive-practice` in the isolated
`brazilian-portuguese-immersive` worktree, based on `c03fc192d734594a1e9500dbd450084a0431692e`.
The initial local review was completed without publishing. On 2026-11-01 the user
authorized push, squash merge and the normal production deployment, conditional on
green checks and no conflicts. Release evidence will be attached to the pull request;
the local synthetic-backend build artifact must not be promoted.

The preceding German release is complete: PR #421 was squash-merged at that base
commit. Vercel deployment `EfSimBXm8RQpJdeV6VNLgd4G9BUK` was Ready / Production /
Current on `www.pratiqo.ca`; the dashboard, first unit, real audio playback, last
unit, cultural final, photo and language-hub link were checked in production.
German's previous deployment reference: `325YwgmrSS7qoFJVsd8EACjWyQW9`, commit `357258ec`.
The Portuguese release rollback target is the current German deployment
`EfSimBXm8RQpJdeV6VNLgd4G9BUK`, commit `c03fc192`. Its Ready / Production / Current
state and canonical domain were reconfirmed in Vercel before preparing this release.

Other worktrees, database schema, authentication, bookings, payments and production
configuration are unchanged by the Portuguese work.

## Learning Experience

- Eight units, 24 lessons, 96 phrase entries and 148 practices.
- Matching, phrase ordering, reading comprehension, listening, writing and dictation.
- Two situational dialogues, a fictional cafe order in Brazilian reais and a
  fictional directions exercise. No purchases or real-world price claims.
- Eight six-question checkpoints, a 16-question cumulative language final and an
  eight-question cultural final. Cultural facts appear in the course before testing.
- Written production with a three-part self-review per unit. Speaking practice is
  self-assessed, not machine-scored or presented as certified pronunciation.
- Yoppo assistance, replay, explicit transcript fallback and spaced review reuse
  the existing learning engine. Help is tracked separately from independent success.
- Interface in French, English and Spanish; target speech/text is Brazilian Portuguese.
- Local progress namespace and draft namespace are separate from Italian and German.
  A reload resumes progress and writing; personal drafts do not enter quiz scores.
- This is introductory practice, not a complete CEFR level or certification.

## Architecture and Changes

`lib/yo/portuguese/` contains course content, culture, scenarios, scoped speech
payloads and accent-sensitive answer normalization. `avó` and `avô`, `e` and `é`
are deliberately not interchangeable. NFC equivalence, case and punctuation are accepted.

`components/yo/german/CourseExperience.tsx` selects the language identity, routes,
progress key and final assessment identifier in the existing shared player. German
remains the default. The course catalog and current unit are plain serializable
server props; the full course or audio registry is not imported into client players.

The existing Italian practice/audio/Yoppo components gain explicit `pt-BR` support,
Portuguese accent keys and BRL formatting for the fictional game only. Existing
Italian/German behavior and audio assets remain intact. The Brazilian final is
linked from the dashboard and leads to the cultural final after completion.

New routes are under `/yo/langues/portugais-bresil/parcours`, including `u01` through
`u08`, `final` and `culture`. The language hub links directly to the course. Learning
routes keep the existing noindex policy. No mass SEO pages or paid unlocks were added.
The mobile install invitation is suppressed on course routes, like German/Italian,
so it cannot cover learning controls or Yoppo.

## Photos and Cultural Sources

Four actual Wikimedia photographs are bundled as resized WebP files. Credits,
source links, license links and a resizing/compression notice appear beside the
photos. No generated landmarks or altered teacher/person identities are used.

| Photo                       | Author           | License      | Source file                             |
| --------------------------- | ---------------- | ------------ | --------------------------------------- |
| Rio: Pão de Açúcar          | Tlrmedia         | CC BY-SA 4.0 | Sugarloaf Mountain - Rio de Janeiro.jpg |
| Salvador: Pelourinho        | Geotrieb         | CC BY-SA 4.0 | Pelourinho-Salvador.jpg                 |
| Brasília: National Congress | Hikaru Barata    | CC BY-SA 4.0 | Congresso Nacional, Brasilia.jpg        |
| Iguaçu Falls                | Enaldo Valadares | CC BY-SA 3.0 | Iguazu Cataratas2.jpg                   |

Exact source URLs are retained in `courseCulture.ts`; `prepare-portuguese-course-photos.mjs`
uses explicit source files, not search results, and refuses overwrites. The Salvador
photo is the source's sepia image; no color has been invented.

Cultural facts reference UNESCO World Heritage entries
[Rio](https://whc.unesco.org/en/list/1100/),
[Salvador](https://whc.unesco.org/en/list/309/),
[Brasília](https://whc.unesco.org/en/list/445/) and
[Iguaçu](https://whc.unesco.org/en/list/355/).
The quiz uses taught locations and distinctions, not travel rules or fabricated facts.

## Recorded Audio

The user authorized a maximum of USD 3 for this Portuguese batch separately from
the German authorization. Existing MP3s were not overwritten.

- 220 deduplicated published recordings, 5.3692 minutes total, `tts-1-hd` / `alloy`.
- Conservative reserved-cost estimate: USD 0.16119, not a billing receipt (221 requests including one retake).
- The [official model price](https://developers.openai.com/api/docs/models/tts-1-hd)
  is USD 30 per million characters; the local budget conservatively counts UTF-8 bytes.
- All 220 files validated as complete MP3s, with hash comparison against the local cache.
- A durable budget ledger reserves cost before each request; a timeout consumes the
  reservation. Exclusive lock, no automatic retries, no file overwrite, no Storage upload.
- API credentials stayed server-side and were neither printed nor copied into the worktree.
- Runtime playback is same-origin bundled MP3, click-only, with slow/stop controls,
  an AI-voice disclosure and explicit assisted transcription on failure.
- `--verify` is offline and generated zero additional recordings.

The initial launch-critical run correctly rejected one technically decodable but
nearly empty 48 ms response for the lunch invitation scene. That new response and
its cache were quarantined outside Git, with the budget reservation retained. One
explicit retake uses a distinct `-r2` path; no earlier delivered audio was overwritten.
The generator now rejects responses/caches/assets of 200 ms or less before publishing,
and the Portuguese asset test checks every individual duration, not just the total.
The retake is 4.44 seconds. A subsequent generation scan reused all 219 other files.

The `brazilian_portuguese` profile has BCP-47 `pt-BR`. `tts-1-hd` does not accept
accent instructions; the recorded Brazilian vocabulary is not a substitute for a
native-speaker listening review. The provider has announced retirement of this
generation model in January 2027. Existing bundled MP3 playback does not depend on
that API; a future generation batch should review its replacement and budget first.

## Validation Evidence

Logs and screenshots live outside Git in `../portuguese-preview-local/`.
The local build wrapper uses the existing synthetic Supabase stack and rejects
worktree environment files. Production backend credentials are not used by the preview.

Final executed validations (2026-11-01):

- `npm run test:yo-portuguese`: PASS, eight content/audio tests and ten player
  cases, including accent distinctions, scoped audio, separate progress/drafts,
  BRL, assisted listening and the final-to-culture link (`portuguese-final.log`).
- `node --import tsx scripts/generate-portuguese-course-local-audio.ts --verify`:
  PASS, 220 verified, zero generated, zero uploaded (`audio-verify-final.log`).
- `npx tsx tests/yo/yopratiqoAudioPronunciationOverrides.test.ts`: PASS,
  11 assertions; the immutable-existing-audio guard remains enabled
  (`audio-scope-final.log`).
- `node --import tsx --test tests/yo/yopratiqoGermanCourseContent.test.ts tests/yo/yopratiqoGermanCoursePlayer.test.ts tests/yo/yopratiqoGermanAudio.test.ts`:
  PASS (`german-final.log`).
- `npm run test:yo-italian-course`: PASS (`italian-regression.log`).
- `npm run test:yo-japanese-foundations`: PASS (`japanese-regression.log`).
- A duplicated workshop heading found in browser QA was removed from the shared
  player. `node --import tsx --test tests/yo/yopratiqoPortuguesePlayer.test.ts tests/yo/yopratiqoGermanCoursePlayer.test.ts`:
  PASS, ten Portuguese and 14 German player cases (`players-final.log`).
- `npx tsc --noEmit`: PASS (`typescript-final.log`); the final production build
  additionally completed its full TypeScript check after the audio correction.
- `npx tsx scripts/validate_i18n.ts`: PASS, 3562 keys per locale.
- `npm run lint`: PASS, zero errors and 259 warnings (`lint-final.log`). The last
  heading/test edit and audio correction were also linted: zero errors
  (`lint-last-change.log`, `lint-audio-correction.log`). Warnings were not disabled.
- Prettier 3.6.2 `--check` on the new course, route, generator and test sources: PASS.
- `node ../portuguese-preview-local/app.cjs build`: PASS, final production build,
  full TypeScript and 355 generated pages (`build-release-candidate.log`). This
  external wrapper invokes the repository build with the existing synthetic local
  backend, not production. The existing Turbopack `forceSwcTransforms` warning remains.
- `npm run test:launch-critical`: PASS, complete final rerun, exit 0
  (`launch-critical-final.log`). The initial run failed on the 48 ms audio response
  described above; the response was corrected, not the duration threshold.
- `git diff --check`: PASS.
- First lint run found two new test-only `react/no-children-prop` errors. These
  were fixed with the repository's createElement pattern, without disabling rules.

### Production-Mode Local Runtime and Browser QA

- `node ../portuguese-preview-local/http-qa.cjs`: 14 routes returned HTTP 200
  (hub, dashboard, eight units, two finals and first-unit EN/ES), the invalid unit
  returned 404, and all four photographs returned 200 (`http-qa.json`). H1s are
  present in server-rendered HTML; no Server/Client serialization error occurred.
- Eighteen responsive combinations passed with no horizontal overflow or broken
  loaded images: first unit in FR/EN/ES at 320/390/1440 px, plus dashboard/language
  final/cultural final at the same three widths. The course's `lang` matched its
  selected interface locale.
- Actual browser actions verified matching feedback, Yoppo help, an original MP3,
  the corrected invitation MP3 (play/stop state), writing retained after reload,
  dashboard resume, and the cultural quiz's photo, answer feedback and lesson link.
- The corrected invitation played from the final production-mode build. No console
  errors were recorded during the final browser checks. This verifies playback,
  not a human pronunciation assessment of every recording.
- Screenshots: `preview-final.png`, `mobile-dashboard-final.png`,
  `mobile-practice.png`, `mobile-culture.png` and `desktop-dashboard.png` in the
  external evidence directory. Temporary browser viewport overrides were reset.

Local review URL: <http://127.0.0.1:55630/yo/langues/portugais-bresil/parcours?lang=fr>.
The gateway and final production-mode app remain running for review; no tunnel was opened.

Release preflight repeated `git fetch origin` (base still exactly `c03fc192`),
`npm run test:yo-portuguese` (18 cases), offline audio `--verify` (220 assets,
zero generated/uploaded), and `git diff --check`: all passed. The production build,
TypeScript, lint, i18n, launch-critical and cross-language regression results above
are reused from this same code and isolated-backend configuration. No application
code or media changed after those successful runs; only this release record changed.

## Remaining Review and Deployment Boundary

Native Brazilian Portuguese review and full human listening remain recommended.
Physical iPhone/Safari is not represented by desktop responsive viewport tests.
No complete offline-download guarantee is made: bundling audio does not implement
service-worker precaching or a native offline package. No new paid service, outbound
message, migration or automatic publication was introduced.

The Portuguese preview is local-only at port 55630. Its environment/configuration
must never be promoted as a production artifact. A future release should use the
normal Git/Vercel production rebuild with production environment variables and green
required checks. Rolling back the application needs no schema rollback; local course
progress can remain stored for a later re-release.
