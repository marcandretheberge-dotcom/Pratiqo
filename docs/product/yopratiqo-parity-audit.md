# YoPratiqo: eight-language parity audit and local review release

Audit date: 2026-11-25. Original baseline: `5631295cd44fa9566776d622a6bcde412ce0fc4d`.
First overnight release: PR #480, production main `8c60fa16457e604bd570c27ad6d50d89cb17b45d`.
Second overnight release: PR #481, production main `89e8bbe780a339f7472b7811d80bc0f611957453`.
Third overnight release: PR #482, production main `c1bbb66ea8ebb7488e4de2247271e1e1febcfad8`.

## Decision

The eight languages do not yet offer the same curriculum depth, continuity or
delayed assessment as the Italian reference. This release improves shared
onboarding, authored interest practice, intro-to-course continuity, feedback,
cinema and local error review. It is a bounded implementation release, not the
completion of the entire YoPratiqo roadmap or the eight-language launch gate.

The governing briefs distinguish implementation from content authoring and
estimate 142 engineering days plus 145–215 authoring days for their full scope.
Those are planning estimates, not completed work. The brief names are *Index des
briefs Yo.md*, *YoPratiqo-Codex-brief.md*,
*YoPratiqo-overnight-first-sale.md* and
*Revue-PR-Pratiqo-YoPratiqo-Cafe-2026-11-24.md*. Their requirements include a
shared engine, Spanish market priority, Italian as the testbed, no attendance
streaks, accumulation-only earned progress, and no sale of unfinished content.

Counts below describe authored activity objects in the repository. They do not
establish equal difficulty, equivalent study time, CEFR certification or native
audio quality. A reachable route and a passing unit test are different evidence
from an exercised production purchase or a delayed independent learning result.

## Baseline curriculum matrix

This table preserves the original baseline. The second-lot changes are listed
immediately after it; a historical gap must not be confused with current work.

| Target | Authored course after the common entry | Progress and assessment | Largest remaining gap against Italian |
| --- | --- | --- | --- |
| Italian | 12 units, 36 lessons, 228 practice activities; 249 vocabulary references. Personalized first unit, placement and original three-world/twelve-city journey. | Local independent activity results, five-question unit quizzes with an 80% threshold, dated 1/3/7/14-day review, merge before writes and cross-tab repair. | The reference itself still lacks normal server restoration, established delayed transfer evidence, complete recordings and verified live voice activation. |
| German | Eight units, 24 lessons, 148 practice activities, 96 vocabulary references, culture and production tasks. | Six-question unit quizzes, cumulative final; shared Italian course progress engine with its own storage key and local dated review. | Less curriculum breadth and personalization; the new intro did not carry its learner choices into the full course. |
| Brazilian Portuguese | Eight units, 24 lessons, 148 practice activities, 96 vocabulary references, culture and production tasks. | Same shared course mechanisms as German, with independent language storage. | Same breadth/continuity gap; existing real content must be connected before more decorative maps are counted as parity. |
| Japanese | Eight modules; 64 activities plus 24 roleplay turns; eight final questions. Kana, kanji, reading, culture and notebook. | Independent results, attempts, immediate review flags, bookmarks and cross-tab progress merging. | No dated review schedule in the full-course store; no Italian-equivalent placement/world personalization. |
| Mandarin | Eight modules with 104 exercises and eight final questions; tones, pinyin, characters, listening, writing and dialogue. | Checked independent results, drafts, step bookmarks and boolean review flags. | No dated review in the full-course store; whole-state persistence lacks the Italian/Japanese cross-tab merge protection. |
| English | Common three-mission introduction and older introduction material. | Common intro practice, local drafts and six-question final. | No substantial follow-on English course equivalent to the twelve Italian units. The workplace course in the older blueprint is not an implemented course. |
| Québec French | Common introduction plus workplace Module 1 shell with seven outlined lessons. Lessons 1–2 have previews; an implemented lesson-3 route exists despite its registry entry remaining `planned`. | Preview/lesson interactions rather than one complete seven-lesson, independently assessed progression. | Author and assess lessons 4–7, reconcile registry and real routes, then provide a coherent continuation. Verify interface localization of the older lesson pages. |
| Spanish | Common Montevideo introduction plus five Dominican travel module surfaces: arrival, hotel/airport, food, directions, and a capstone. | Rich decks, listening, quizzes and printable material, but fragmented progression; a module-completed action is not independent item-level success. | One canonical assessed Spanish journey and review integration across the existing modules. Geographic context must remain explicit; no guaranteed dialect or native accent should be inferred. |

Sources: [personalized Italian catalog](../../lib/yo/personalized/courseData.ts),
[Italian units and catalog](../../lib/yo/italian/course/courseData.ts),
[German course](../../lib/yo/german/courseData.ts),
[Portuguese course](../../lib/yo/portuguese/courseData.ts),
[Japanese course](../../lib/yo/japaneseCourse.ts),
[Mandarin course](../../lib/yo/mandarin/course.ts),
[Québec workplace module](../../lib/yo/frQuebecWorkplaceSurvivalModule.ts),
[shared intro catalog](../../lib/yo/shared/course.ts), and the routes under
`app/yo/langues/`, including
`app/yo/langues/espagnol/pays/republique-dominicaine/`.

## Second overnight lot: deployed and verified

| Target | New course actually implemented | Independent checks and original dialogues |
| --- | --- | --- |
| English | `/yo/langues/anglais/parcours`: 12 units, 36 lessons, 252 activities and 252 distinct vocabulary phrases | 72 written unit questions, 24 cumulative final questions, 36 three-turn dialogues; Canadian everyday contexts, explicit spelling variants and negation preservation |
| Spanish | `/yo/langues/espagnol/parcours`: 12 units, 36 lessons, 252 activities and 252 distinct vocabulary phrases | 72 written unit questions, 24 cumulative final questions, 36 two-turn dialogues; neutral Latin American foundation with explicit regional register, separate from existing Dominican material |
| Québec French | `/yo/langues/francais-quebec/parcours`: 12 units, 36 lessons, 252 activities and 216 distinct vocabulary phrases | 72 written unit questions, 24 cumulative final questions, 36 four-turn dialogues; ordinary Québec contexts, standard/written versus colloquial register, explicit OQLF/Usito references |

These are original course sequences with vocabulary, grammar, pronunciation
notes, reading, recall, dialogue, writing and cumulative written checks. They
are not outline cards or certified proficiency levels. Each language uses its
own namespace and matcher; real intro continuation now reaches these courses.
The older Québec workplace and Dominican routes remain separate products and
are not relabelled complete by this addition.

The full-course players for all eight targets now write actual practice
mistakes/help to the separate dated review journal. Optional review uses the
real course renderer/checker, including the original reading context. Italian,
German and Portuguese retain their existing progress and review fields;
Japanese and Mandarin gain dated practice review without migrating historical
scores or counting self-ratings as answers. Final and placement items do not
enter these adapters.

The shared DE/PT/EN/ES/FR assessment player preserves first checked outcomes and
help across reloads. Completed result restoration submits no new score, and
changing UI language cannot erase help. The new unit cursor also preserves
help and a checked activity result. Unfinished typed input is not yet restored
by that cursor. Mandarin's legacy progress merge and shared intro cross-tab
reset semantics still need their own implementation; this journal does not
silently solve them.

Reviewed sources and locale-specific original content live under
`lib/yo/english/`, `lib/yo/spanish/` and `lib/yo/frenchQuebec/`. The remaining
large gaps are voice recording coverage/listening approval, depth in DE/PT/JA/ZH,
delayed unseen transfer, authenticated continuity and live speech activation.
The parity gate remains open while those gaps are material.

PR #481 passed all 11 GitHub workflows and both Vercel checks on its final head.
The actual EN/ES/FR courses passed Chromium and macOS WebKit at 393px and 320px;
the production deployment passed 24 read-only page/API checks. See the
[release ledger](yopratiqo-overnight-roadmap.md#verification-and-release-record).

The deployed PR #482 audio lot contains 255 reviewed MP3 clips (6,559,441 bytes,
402.625 seconds). It covers all 19 introduction phrases in each of the seven
shared introductions, all 96 interest phrases across eight targets, and part of
the Italian gap. Fifteen Italian slash lists remain withheld. Independent ASR,
silence boundaries, codec decoding and exact hashes establish technical checks;
they do not establish a human native-accent review. A separate full EN/ES/FR
recording batch is still in progress. All six triggered workflows and both Vercel
builds passed, and all 255 public MP3s were checked against their exact hashes,
audio MIME and immutable cache headers after the production deployment.

## Fourth overnight lot: German and Brazilian Portuguese deployed

| Target | Complete authored sequence in this branch | Preserved evidence and remaining audio work |
| --- | --- | --- |
| German | 12 units, 36 lessons, 232 practice activities, 180 vocabulary references (179 distinct), 72 unit questions, new 24-question cumulative written final | Original eight units, 16-question final and eight-question culture final remain byte-identical. Old final uses `/bilan-initial`; new `/final` has a distinct ID. All original published MP3 checks remain intact; new-unit coverage is incomplete. |
| Brazilian Portuguese | 12 units, 36 lessons, 232 practice activities, 180 distinct vocabulary phrases, 72 unit questions, new 24-question cumulative written final | Same separation of old/new assessment IDs and original eight-unit evidence. Earlier recordings stay fully checked; new exercises do not require unavailable audio to complete their written assessments. |

Both additions have twelve new three-turn dialogues, explicit language notes,
contextual readings, typed recall and source-backed cultural content. Counts do
not establish equal study time or certified proficiency. Independent content and
integration reviews and local regressions passed. PR #483 then passed all five
triggered GitHub workflows and both Vercel checks. Chromium and macOS WebKit each
completed all twelve checkpoints and the new final per language through real
controls, including 24 actual MP3 completions. Its production deployment passed
27 public checks. Japanese and Mandarin's separate fifth lot below is not yet
counted as deployed.

## Fifth overnight lot: Japanese and Mandarin prepared

| Target | Authored expansion in this branch | Preserved evidence and limits |
| --- | --- | --- |
| Japanese | Twelve modules; four new modules add 32 vocabulary entries, 26 dialogue lines, twelve grammar explanations, 32 written activities, twelve roleplay turns and four ungraded productions. The practice catalog contains 132 items. | The original eight modules and eight-question final are byte-identical. A distinct 24-question final combines twelve reading and twelve recall questions. Original final bookmarks resolve to `/bilan-initial`; `/bilan` requires all twelve modules. New recording coverage remains separate work. |
| Mandarin | Twelve modules; four new modules add forty vocabulary entries, 24 dialogue lines, twelve grammar explanations, four readings and 56 exercises. The practice catalog contains 160 items. | The original eight modules and eight-question final are byte-identical. The distinct new final has twelve reading and twelve written recall questions. Reset-aware tab merging preserves independent changes and attempts; new helped attempts remain assisted after reload. Previously independent grades are not reinterpreted. |

Each new final checks content from all twelve modules, using a separate assessment
identity. Neither historical completion nor cosmetic rewards supply new grades.
The public review route now returns one actual Japanese or Mandarin practice item
only when requested, preserves the original reading/roleplay context, and excludes
both finals. The dated journal remains separate from course grades and bookmarks.

The real mobile gate is prepared for both targets at 393px and 320px in Chromium
and macOS WebKit. It explicitly seeds only historical eight-module learner records
and the original final bookmark, then checks two new recall answers through the
rendered controls, including one helped answer. It checks locked routes, resume,
reload, old-result preservation and zero automatic speech/audio requests. This is
not a full twelve-module UI-completion or listening-quality test. The new lot is
not counted as deployed until its exact-head CI and production checks succeed.

## Shared surfaces: what exists and what does not

The seven non-Italian introductions each contain three missions, 19 phrases,
17 preparation questions, 15 practice questions and six final questions. Their
content and controls are shared with authored language-specific phrases,
contexts and explanations. A local stamp requires five independent correct
answers out of six. The final reuses selected practice question content with
new IDs; it is not an unseen delayed transfer assessment.

The original intro store records profile, step/draft, visited/completed IDs and
best final score. It does not contain item-level error history or review dates.
It is local to the browser and is not an authenticated cross-device record.
Merely restoring an already-checked draft must never create another attempt.
See [intro state](../../lib/yo/shared/state.ts) and
[intro player](../../components/yo/shared/SharedIntro.tsx).

The map engine can split courses into three visual chapters and preserve
previously started units. Three map screens do not establish three fully
authored worlds or a common curriculum depth. Italian's twelve city scenes and
derived stamps are richer than a generic map partition. See
[world maps](../../lib/yo/worldMap.ts),
[foundation journeys](../../lib/yo/foundationJourney.ts), and
[Italian world rules](yoppo-worlds-v1.md).

At the original baseline, Italian, German and Portuguese already had local
spaced review; Japanese and Mandarin had immediate error review without dates.
PR #480 added the intro/interest queue. The second lot connects actual course
practice to that separate queue, without rewriting or migrating old scores.

The baseline live-speech implementation has a bounded provider protocol,
consent, server budget reservations and eight target languages. A missing key,
disabled flag or unavailable database keeps it unavailable. A merged component
is not evidence that eight-language speech quality has been tested online.
Activation and remaining QA are in
[the speech runbook](yopratiqo-speech-practice.md).

At the baseline, `mission-ready`, `mission-success` and `artifact-reveal` had
posters but no MP4 source. The cinema work in this release must be validated as
actual exported films, including interruption, subtitles, audio and reduced
motion. Poster slots alone were not counted as completed films in this audit.
See [cinema flow](yopratiqo-cinema-flow.md) and
[scene catalog](../../lib/yo/travelCinema.ts).

## This release: common, honest local review

The registry in [languages.ts](../../lib/yo/config/languages.ts) defines eight
canonical targets (`it`, `en`, `fr`, `es`, `de`, `pt`, `ja`, `zh`) and aliases
such as `fr-CA`, `pt-BR` and `zh-Hans`. Target aliases share their own language's
queue; different languages never share an item merely because their authored
exercise IDs look alike. Locale metadata enables no external service.

The separate [review store](../../lib/yo/review/store.ts) records only:
language, item ID, attempt ID, timestamp, correct/incorrect and assisted/unassisted.
It stores no chosen answer, free text, audio, name, account ID, reward balance
or entitlement. Only a mistake or use of help enrolls an item. Completion,
opening a page, watching a film and restoring a draft are not evidence.

The existing pure [SRS engine](../../lib/yo/srs/engine.ts) supplies the
1/3/7/14-day intervals. Incorrect answers are due immediately. Assisted correct
answers are due the next day. An independent correct answer at its due time
advances the interval; immediate repeated successes leave the already-set date
unchanged. No attendance streak, lost reward, punitive reminder or daily
presence requirement is added.

Each accepted attempt has its own immutable localStorage key. Two tabs append
different keys instead of replacing one shared aggregate. Replayed attempt IDs
are ignored, and key/value language and item identities are validated when
reading. The hook refreshes on local writes, another tab's storage event, focus,
visibility and a minute timer so due dates can change without navigation.

Storage remains explicitly **on this device and browser**. The journal is
limited to 5,000 stored events across languages. A refused/full store falls back
to at most 500 events for the open session, with a visible failure notice.
Beyond that limit, a new attempt returns `recorded:false, saved:false`; old
receipts and course progress are not silently deleted. This bound needs a
durable compacted journal or authenticated replacement before sustained usage
approaches it. Local storage is neither secure account separation nor server
restoration; the application does not upload it automatically.

The [intro adapter](../../lib/yo/review/intro.ts) includes only actual
preparation and practice exercises. Placement/final questions are absent.
The due panel appears outside assessments and reuses the real `IntroQuestion`
checker for an optional session of up to three questions. A self-rating or
“I know this” checkbox never marks an answer correct. Each review has its own
draft and cannot move the learner's course bookmark, award a stamp or change XP.

The generic hook also supports the eight-language interest missions through
stable `interest:<interest>:<stage>` IDs. The interest renderer owns checking
those authored answers; the queue supplies due IDs rather than inventing a
second checker. The course adapters map 228 Italian, 148 German, 148 Portuguese,
88 Japanese and 104 Mandarin practice objects to a universal authored item
shape. PR #480 introduced the adapters; the second lot wires actual players and
adds the three new 252-activity course catalogs. Repository adapters and actual
production deployment remain separate verification steps.

## Server foundation and commercial boundaries

The existing Italian server SRS and daily preview require explicit flags.
Their runbook still requires account ownership for anonymous imports,
two-device restore/reset testing, failed delivery/replay handling and abuse
limits before public activation. Course resume and review rehydration remain
separate. This release does not enable those flags, apply their migrations or
generalize their Italian server adapter. See
[Phase 0 rollout requirements](../yo/phase0-srs-rollout.md).

The transactional Pass pilot is constrained to local Supabase and test
credentials; the Italian rewards preview is also locally gated. A visual Pass,
postcard, successful local exercise or movie cannot confer paid access or
money. These controls remain independent of the review store. See
[Pass server gate](../../lib/yo/passPilot/account.server.ts) and
[reward preview gate](../../lib/yo/rewards/previewGate.ts).

## Remaining work and evidence required

| Work still needed | Concrete acceptance evidence |
| --- | --- |
| EN/ES/Québec foundation delivery | The second lot implements the coherent 12-unit sequences. Complete real mobile-browser and production verification, recordings and language-specific listening review; do not infer a certified level. |
| Older regional course integration | The canonical Spanish foundation now exists. Older Dominican and Québec workplace routes still need their own progress/content reconciliation; they are not silently migrated. |
| Delayed independent transfer | A new, equivalent task on a later day, without answer hints, measured separately from replaying a previously seen question. |
| Full-course review delivery | Second-lot wiring passes real-renderer local tests in all eight targets. Verify the deployed routes and maintain separation from old outcomes/bookmarks. |
| Cross-tab progress reliability | Add deterministic merge/reset handling to the existing Mandarin and shared intro progress stores independently of the new review journal. |
| Cross-device continuity | Authenticated restoration, explicit ownership/consent for anonymous history, account isolation, reset semantics and durable offline retries. |
| Recorded audio | Finish real recording gaps and perform language-specific listening QA. Successful HTTP/MP3 validation is availability evidence, not pronunciation approval. |
| Speech experience | Configure authorized credentials/budget, apply reviewed dependencies if approved, then exercise consent, all eight targets, failure/timeout/cancellation and feedback quality online. |
| Premium media | Actual film assets, coherent language/context mapping, subtitles, interruption/reduced-motion and mobile browser QA. |
| Offer and Pass | Sell only an identified complete product through a separately reviewed offer/payment flow; local cosmetic awards and test wallets do not constitute an offer. |
| Learning and retention evidence | Track independent and delayed task success, return for useful practice and purchases separately; do not substitute clicks, views or attendance for learning. |

The baseline audio plan contains 969 distinct source phrases: 836 Italian and
133 intro. It maps 793 phrases to 785 unique paths and leaves 176 unrecorded
phrases: 66 Italian plus 110 intro. A read-only audit of those 785 paths at the
baseline tree obtained HTTP 200 MPEG Layer III content for every path. The
audit did not perform listening approval or a full decoder pass. These source,
mapping and verified-object counts must remain distinct. The source of scope is
[premiumAudioPlan.ts](../../scripts/lib/premiumAudioPlan.ts), not every historical
entry in the broader audio registry.

## Verification for the local review lot

Run:

```sh
node --import tsx tests/yo/yopratiqoLocalReview.test.ts
node --import tsx tests/yo/yopratiqoLocalReviewUi.test.tsx
node --import tsx tests/yo/yopratiqoPersonalizedCourseContinuity.test.tsx
```

The first suite checks registry aliases, dated recall, early-repeat protection,
receipt replay, stale simultaneous tab writes, malformed storage, catalog
scoping, storage bounds and real course adapter counts. The UI suite checks the
actual question renderer for seven targets in all three interface languages,
assisted correction, reload, focus, cross-tab updates, stale-language callbacks
and media interruption. The continuity suite verifies the wiring from actual
intro practice and the absence of final/placement side effects. Release CI,
browser validation and deployment verification remain separate release gates.
