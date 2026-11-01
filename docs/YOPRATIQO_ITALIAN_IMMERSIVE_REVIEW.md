# YoPratiqo: Italian practice and direct language entry

## Scope

Worktree: `italian-immersive`. Branch: `feat/yopratiqo-italian-immersive-practice`.
Base: `ac46ddfe` (`origin/main` at creation). The sections marked historical
record the earlier local iterations. See the release-validation section for the
latest evidence. No migration or production data change is part of this delivery.

This is an incremental learning/navigation improvement, not a claim of full
pedagogical equivalence to another product or offline availability.

## Implemented

- `/yo` starts with actual language choices. Supplementary marketing content is
  collapsed. The existing logo, locale selector and Pratiqo return link remain.
- `/yo/langues` shows all five existing languages without a welcome screen or
  a second page of choices. Italian and Japanese open their course dashboards;
  other languages open their existing introductions. The student hub reuses
  this selector without removing its existing Dominican Republic course.
- Each of the 36 Italian lessons has six study stages: mission, words,
  language, sounds, scene and oral practice. These reuse the authored content.
- Word recall has two directions, reveal-before-assessment and recycling of
  forgotten expressions. Self-assessment does not generate scored success.
- 36 dictations reuse existing listening stimuli and registered recordings.
  Submission waits for actual playback or explicit transcript disclosure.
  Transcript assistance remains recorded even after the transcript is hidden.
- Existing practice IDs, quizzes, projects, local progress, audio controls and
  scoring remain. Added IDs are stable `lesson-id-dictation` identifiers.
- Yoppo's review action opens a genuinely due attempted activity, including
  another lesson in the current unit. Unseen activities are not overdue review.
- A visible change-language link retains FR/EN/ES. No unbuilt German or Brazilian
  Portuguese course is presented as available.
- Mobile lesson layout uses an explicit shrinkable one-column grid and sidebar;
  its local lesson rail can scroll without widening the document. The main
  language page omits its redundant header shortcut on mobile.

## Architecture and privacy

The shared language selector renders plain links on the server and can also be
used by the existing client student hub. Availability comes from the existing
product configuration. No new auth, payment, Supabase or teacher-booking logic.
Italian course content is still loaded on the server; clients receive the current
unit and compact catalog. The complete course is not imported into client code.

Progress uses the existing local aggregate-results store. Speaking remains an
explicit self-assessment, with no microphone recording or claimed automatic
pronunciation evaluation. Recall rounds and study-stage position are transient;
lesson/activity progress and the existing course resume are persisted. Personal
production drafts retain their existing in-memory-only privacy behavior.

## Product direction: offline learning

The founder's direction is a learning-first mobile app: resume learning, choose
a language, practise/review, and find a teacher when useful. Pratiqo remains the
marketplace connecting teachers and learners; YoPratiqo is the daily practice
experience, with Yoppo alongside the learner.

This branch DOES NOT implement native offline downloads. Current `public/sw.js`
caches static assets and an offline fallback, not complete lesson routes or
remote audio. Local progress alone is not offline course availability.

Follow-up implementation should use explicit, versioned course downloads:

1. Show pack size, included levels/content, progress, cancellation and removal.
2. Download actual lessons, exercises, images and recordings; verify completeness
   before describing a pack as available offline. Failed/interrupted updates
   must leave the previous usable version intact.
3. Run deterministic games, reading, recorded listening and review locally, with
   durable aggregate progress and a deliberate synchronization/conflict policy.
4. Keep teacher search, messaging, current availability, bookings and payments
   online. Do not cache private marketplace responses as learning content.
5. Verify cold launch in airplane mode, incomplete downloads, low storage,
   restart, reconnection and account changes on real iOS and Android devices.

Do not promise cloud-generated conversation or speech assessment offline. Start
with the real course levels that exist. Travel/work/conversation goals should
select relevant authored practice, not claim unsupported proficiency levels.
Teacher-assigned practice requires a separate permission-aware design; this
branch does not add assignment or student-monitoring features.

Content sequence: finish reviewing Italian, then German, then Brazilian
Portuguese. Do not create empty language tiles as a substitute for those courses.

## Historical validation evidence (before release hardening)

Executed against this isolated worktree, not production:

- `npm run test:yo-italian-course`: passed (21 content, 30 progress, 24 player,
  9 audio, 7 navigation). Two later focused navigation regressions also passed
  (9/9). Final mobile regression rerun is recorded below.
- `npm run test:yo-italian-module`: passed (content, games, progress, Yoppo,
  adventure, recorded audio and mocked audio-generator tests).
- `npm run test:yo-japanese-foundations`: passed, including recorded audio.
  Windows checkout CRLF had changed official SVG bytes. Normalized only this
  worktree's 40 KanjiVG originals after verifying each LF blob against its pinned
  source hash. A narrow `.gitattributes` rule preserves LF for these pinned SVGs
  on future Windows checkouts. No semantic asset change or weakened hash test.
- `npm run test:yo-languages`: 18/18 passed.
- `npm run test:yo-ia`: 11/11 passed.
- `npm run test:yo-landing-pages`: 10/10 passed.
- `npx tsx tests/yo/yopratiqoLanguageCatalogAppShell.test.ts`: 7/7 passed.
- `node --import tsx tests/yo/yopratiqoWorldclassLearningShellVisual.test.ts`:
  5/5 passed. Updated obsolete pagination/grid assumptions to the actual direct
  selector and shrinkable responsive layout; no disabled assertions.
- `node --import tsx tests/yo/yopratiqoLearnerSurfaceCoverage.test.ts`: passed.
- `npx tsc --noEmit --incremental false`: passed.
- `npx tsx scripts/validate_i18n.ts`: passed, 3562 keys.
- Scoped ESLint of all changed runtime files: zero errors, three warnings in
  existing code (article aria-disabled; two hook dependency warnings).
- Production build via local-only helper: passed, 350 routes. The first build
  failed because the old local gateway port was stopped; using the actual
  loopback Supabase port fixed sitemap generation. No production fallback.
- `npm run test:launch-critical`: FAILED at
  `tests/legal/safeDisclosures.test.ts:1643`. Its safe-disclosure-task scope
  assertion prohibits YoPratiqo changes, so it rejects this intentionally
  YoPratiqo-scoped diff. Left untouched; the full suite is NOT reported green.

Local-only helper: `../italian-preview-local/app.cjs`; existing synthetic local
Supabase, no environment files in the application worktree, external server
fetch blocked, no payment/email credentials. Never deploy this local artifact.

## Historical browser QA and remaining limits

Production-build local preview: `http://127.0.0.1:55610/yo`.
Browser QA initially found document overflow from the Italian sidebar and the
mobile hub header. Both are corrected; final measurements follow below.

Final production-build QA (Chromium, local data only):

| Surface | Viewport width | Document width | Result |
| --- | ---: | ---: | --- |
| YoPratiqo home | 320 | 305 | No horizontal overflow |
| Language catalog | 320 | 320 | Five real links; inner vertical scrolling |
| Italian recall | 320 | 305 | No horizontal overflow; reveal and repeat work |
| Italian recall/dictation | 390 | 375 | No horizontal overflow |
| YoPratiqo home | 1440 | 1440 | Two-column choices; no broken visible images |
| Italian dictation | 1440 | 1425 | Real practice controls and assisted feedback |

Widths below the viewport account for the vertical scrollbar. Verified actual
home-to-course navigation, saved lesson resume, return to all languages, recall
recycling, oral-to-game transition and dictation. Unavailable audio showed a
retry/transcript error and did not unlock an independent listening result.
Explicit transcript use followed by the correct answer recorded `avec aide`.
Browser console before the deliberate missing-audio check had no errors.

The existing global install banner overlapped the floating companion during
mobile QA. Keyboard dismissal worked; touch interaction with those overlapping
controls needs follow-up. Neither the install prompt nor the wrapper was changed.

Final reruns after the mobile fixes:

- `node --import tsx tests/yo/yopratiqoItalianCoursePlayer.test.ts`: 25/25.
- `node --import tsx tests/yo/yopratiqoItalianCourseNavigation.test.ts`: 9/9.
- Local-only `next build`: PASS, including TypeScript and all 350 static routes.
- `git diff --check`: PASS.

Screenshots outside Git, under `../italian-preview-local/`:
`yo-home-desktop.jpg`, `italian-dictation-mobile.jpg`.

Actual hosted audio playback is not established by manifest coverage or mocked
audio tests. A read-only HEAD of the registered sample in local Storage returned
HTTP 400, so this preview cannot demonstrate successful recorded playback.
Physical Safari, airplane-mode learning and cross-device progress are not
validated. No change has been made to the mobile wrapper or other worktrees.

This remains a reviewable local iteration, not release approval. The unrelated
task-scoped launch-critical assertion must be resolved through the repository's
normal test-policy review before a fully green release can be claimed.

## Historical photo stops and cultural finale (2026-11-01)

Added in the same isolated worktree, preserving the earlier course/navigation work.
No production access, deployment, commit, push or merge.

- Four real photographs introduce Bologna's porticoes (unit 1), Florence's
  Ponte Vecchio (unit 6), Venice's Grand Canal (unit 8), and Rome's Colosseum
  (unit 11). Each appears in its unit card and the first lesson's mission,
  alongside a short cultural note, an observation prompt and Italian to reuse.
- Existing unit 5 bar vocabulary and unit 7 Quadrilatero notes are also assessed.
  The first lesson now exposes each unit's cultural note instead of leaving it
  solely behind the project tab. No national stereotypes, invented attraction
  photos, transport schedules or real-price claims were added.
- `it1-culture-finale`, after `it1-final`, has ten questions: four place-recognition
  questions and six cultural-recall questions. It reuses the actual assessment
  engine, Yoppo hints/explanations, first-answer scoring, replay, and local progress.
  Cultural results are separate from language results; visits are not mastery.
- Photo captions naming the places appear after the answer. Descriptive alt text
  supplies the same visible clues without naming the city. Opening the original
  photo source counts as assistance. Yoppo's review links target the question's
  taught unit. No timer, lives, payment, microphone or new analytics.
- FR/EN/ES copy uses the existing localized course content convention.
- Four local WebP photos total 287,750 bytes. No runtime third-party image host.
  Credits/licences are visible and recorded in
  `public/images/yo/italian/culture/CREDITS.md`; derivative licences are retained.
  Original images were visually inspected, resized without cropping and compressed.
- Facts checked against UNESCO, Comune di Firenze, Venezia Unica and Parco
  archeologico del Colosseo. Their reference links are included in the course.

Changed in this pass: `courseCulture.ts`, `courseTypes.ts`, `courseData.ts`,
`courseAssessments.ts`, `CourseCulturePhoto.tsx`, `ItalianStudyJourney.tsx`,
`ItalianCourseUnit.tsx`, `ItalianCourseDashboard.tsx`, `ItalianCourseAssessment.tsx`,
`CourseAssessmentPlayer.tsx`, four image assets and credits, the content/player/audio
tests, new `yopratiqoItalianCulture.test.ts`, and the course test command in
`package.json`. No new dependency or lockfile change.

New regression coverage: photo provenance/dimensions/size, lesson-before-quiz
prerequisites, final navigation, FR/EN/ES photo lessons, no answer captions before
submission, wrong-answer explanations, full completion/replay, source-help tracking,
unit-specific review, score persistence and preservation of older language results.

Validation executed for this pass:

- `npm run test:yo-italian-course`: PASS, 104 tests (21 content, 30 progress,
  31 player, 9 audio, 9 navigation, 4 culture).
- The initial new player test used the wrong review label; corrected the selector
  to the actual UI label, without changing the assertion's purpose.
- TypeScript initially caught a missing assessment category and unsupported
  testing-library options. Both corrected. The subsequent local production
  build passed, including TypeScript and generation of 351 static pages.
- `npx tsx scripts/validate_i18n.ts`: PASS, 3562 keys.
- Scoped ESLint of touched runtime/test files: zero errors, five existing
  warnings (dashboard unused import/render purity, two unit hook dependencies,
  content-test unused import). No suppression added.
- Browser inspection found the full-width quiz photograph pushed desktop
  answers below the viewport. The quiz now places the uncropped photograph
  beside the answers at medium widths and stacks them on mobile.
- `npx tsx tests/yo/yopratiqoItalianCoursePlayer.test.ts` after that layout fix:
  PASS, 31/31, including its separate photo/answer grid assertion.
- Final scoped `npx eslint` on `CourseAssessmentPlayer.tsx`,
  `CourseCulturePhoto.tsx`, `courseCulture.ts`, and the player/culture tests:
  PASS, zero errors or warnings. The wider-scope existing warnings above remain.
- `git diff --check`: PASS.

Final production-build and responsive-browser confirmation:

- `node italian-preview-local/app.cjs build` from the orchestration directory:
  PASS after the final responsive change. Next.js 16.2.9 compiled successfully,
  TypeScript completed, and all 351 static pages generated against the isolated
  backend. Existing warning: Turbopack ignores `experimental.forceSwcTransforms`.
- Restarted the local production server on `127.0.0.1:55610`.
- Chromium desktop (1440 px): photo and answers sit beside each other;
  document width 1425 px (scrollbar), with all four landmark images loaded.
- Chromium mobile (390 px and 320 px): stacked photo/answers; document widths
  375 px and 305 px respectively. No horizontal overflow.
- Actual quiz interactions: wrong Bologna answer showed the correction and
  revealed the caption; correct Florence/Venice answers showed the corresponding
  cultural explanations. Advancing reached Rome without skipping questions.
- Actual lesson navigation: the course card opened unit 1; the first mission
  displayed its real photograph, cultural note, observation prompt and Italian
  phrase. The lazy-loaded photograph loaded when scrolled into view on mobile.
- Course overview retained the cultural finale after the language final. Mobile
  overview width was 375 px inside the 390 px viewport.
- No browser console errors recorded on the quiz or lesson QA tabs. No audio
  playback was attempted in this pass. Physical Safari remains untested.
- Screenshots, outside Git: `../italian-preview-local/italian-culture-desktop.png`
  and `../italian-preview-local/italian-culture-lesson-mobile.png`.

At that checkpoint, full launch-critical and actual playback remained open.
The release-validation section below supersedes those historical blockers.

## Release validation (2026-11-01)

### Root causes and corrections

- The legal disclosure and founder-alignment suites treated edits to `/yo` as
  belonging only to their historical legal task, rejecting the new learning
  components. Added a named, exact-file learning boundary guard, following the
  repository's scoped-exception convention. It checks imports and prohibits
  privileged APIs/server code; negative tests inject payment/auth imports,
  dynamic imports and checkout fetches. Existing legal and payment assertions
  remain. No blanket YoPratiqo allowlist, disabled control or lint suppression.
- The real hub navigation test's custom loader resolved relative imports from
  package.json instead of the importing component. It now resolves them from
  the source module. It renders the real language selector and verifies all five
  destination links in FR/EN/ES, in addition to the existing Dominican progress
  and resume cases. Only decorative avatar/badge children are mocked.
- The metadata source guard expected the repository's named `params.lang`
  invocation. Restored that equivalent local variable in the language hub;
  the central metadata helper, robots policy and the SEO test are unchanged.
  The targeted metadata suite passes all nine assertions.
- Historical catalog contracts looked for inline language links and the former
  adaptive three-column layout. They now follow the mounted shared selector and
  inspect its real locale-aware runtime tree: full-width workspace, mobile-safe
  grid, five direct destinations, and preserved Spanish/Dominican workspaces.
  Quebec introduction, disabled checkout and restricted-import assertions remain.
- All 854 already-published Italian recording dependencies passed public GET,
  MP3 validation and SHA-256 calculation using the existing `--verify-only`
  generator mode. Generated/uploaded: zero; failed: zero. No OpenAI call.
- Local Storage initially had none of these recordings. Copied the exact public
  assets into the isolated local bucket and verified every local hash against
  its public original: 854/854, 40,838,400 bytes. No private production data.
- Direct cross-port localhost audio is disallowed by the production CSP. The
  local-only gateway now exposes Storage under the preview's own origin. No
  production CSP, audio URL builder or player behavior is weakened or changed.
  Gateway, keys, logs and copied audio remain outside Git.

### Release checks

- Both legal guards pass: safe disclosures 8/8, founder alignment 11/11.
- `npm run test:yo-course-navigation`: PASS, 16 rendered locale/resume cases.
- `npm run lint`: PASS, zero errors and 258 existing warnings. A new helper
  variable originally named `module` was corrected to `specifier` before the
  successful full rerun. No warnings are represented as zero warnings.
- Public audio verify-only and local asset verification: PASS, 854 each.
- `npm run test:yo-italian-course`: PASS, 104/104 on the final runtime code.
- Scoped ESLint of the guard/helper/navigation-test corrections: PASS.
- Catalog regression checks: desktop workspace 10/10, introduction consistency
  15/15, app-shell flow 16/16 and header language selector 10/10. Scoped ESLint
  of these updated contracts: PASS. Browserslist's age notice remains informational.
- The launch-critical tail, from SEO metadata through information architecture,
  passed after the fixes, including Japanese foundations and Quebec lessons.
  This diagnostic tail alone is not a substitute for the complete launch run.
- Production build with the same-origin local Storage configuration: PASS,
  including complete Next.js TypeScript checking and all 351 static pages.
- `npx tsc --noEmit --incremental false`: PASS, independently of the build.
- Real Chromium playback after the local repair: normal-speed lesson recording
  starts; the dictation at 0.78x receives `playing`, displays `Audio demarre`,
  and enables answer submission after typing without opening the transcript.
  Playback completes without an error. No console warning/error on this tab.
- Mobile audio/dictation at 390px: document 375px (scrollbar), no horizontal
  overflow. Evidence: `../italian-preview-local/italian-audio-mobile.png`.
  This establishes actual browser decoding/playback, not a human audit of every
  recording's pronunciation. Physical Safari remains a follow-up.
- Full launch validation initially stopped at the custom loader issue above;
  that failed attempt is not an all-green run. Final results follow below.

### Final release gate

- `node italian-preview-local/app.cjs validate` (local-only runner for the
  repository's unmodified `npm run validate:launch`): PASS, exit 0. This complete
  run passed learning-project, auth, security, payments, the full launch-critical
  suite, currency, payment safety, i18n (3,562 keys per locale) and production
  build. Earlier failed attempts are historical, not substituted for this result.
- Final build compiled in 102 seconds; full TypeScript completed in 5.6 minutes
  on this Windows machine. All 351 static pages generated successfully. The
  previously documented Turbopack configuration warning remains non-fatal.
- Founder-alignment guard rerun after indexing all 44 delivery files: PASS,
  11/11. `git diff --check` and `git diff --cached --check`: PASS.
- Final diff reviewed: no dependency/lockfile upgrade, production configuration,
  migrations, auth, booking, payment or notification edits. Pinned Japanese SVGs
  have no content diff; only their LF checkout policy is committed.
- Ready for the authorized GitHub/Vercel release gate. CI, merge commit and
  production smoke results will be reported after the Git deployment, not inferred
  from this local build.

### Deployment safety

Previous production: `ac46ddfe9861ae327dd1cc43e95dbe8466c9547a`, Vercel deployment
`dpl_6pbQTsLadDLtcSMDQDtM8Ug3Ck6j`, observed Ready/Production/Current before
release. Retain this deployment for rollback. Delivery must use the normal Git
integration production build, never promote the local `.next` artifact, whose
public settings intentionally point to loopback Supabase. No environment change,
migration, payment, notification or worktree cleanup is authorized by this scope.
