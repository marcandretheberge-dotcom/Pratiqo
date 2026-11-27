# YoPratiqo — roadmap reconciliation and overnight release

Updated November 24–25, 2026 (America/Toronto). This is the current release ledger;
older documents describe their own historical increment. A merged foundation,
a hidden preview and a completed learner journey are different states.

## Direction and release authority

The founder asked for autonomous review, implementation and sequential releases,
with all eight languages as polished as Italian. Independent reviewers can decide
routine implementation and creative choices. This does not supply credentials,
approve a provider identity challenge, certify pronunciation or turn test purchases
into live sales. Blocked operations stay visibly unfinished.

Preserve these decisions: no attendance streaks; accumulation-only achievements;
shared engines from the beginning; Spanish as a market priority; Italian as the
reference journey; optional interests that change authored practice; no sale of
unbuilt content; and no new entitlement inferred from local practice or placement.
English remains in the eight-language scope; it is not silently parked to make a
parity metric pass.

Sources reconciled: the founder's November 23 Codex/cinematic and first-sale briefs,
the November 24 phase-brief index, the actual main tree at `5631295`, PRs #472,
#476 and #479, and the route/catalog/recording audits. The phase index identifies
about 142 engineering days and 145–215 content-authoring days in its original
estimate, plus an unsized B1 program. These are planning estimates, not evidence
of delivery or a promise that an overnight change can complete the entire program.

## What a premium experience requires

The comparison below uses official product documentation checked November 24,
2026 in Toronto. It is not an authenticated walkthrough of competitors' apps.

| Reference | Documented experience | YoPratiqo acceptance criterion |
| --- | --- | --- |
| [Duolingo path and practice](https://blog.duolingo.com/duolingo-101-how-to-learn-a-language-on-duolingo/) | A next lesson, placement and personalized practice | One clear next action; preserve an unfinished lesson or assessment; expose the actual longer course after the intro |
| [Duolingo explanations](https://blog.duolingo.com/explain-my-answer-now-free/) | Error explanations are now free for most learners in seven named courses | Explain the selected and expected phrase using the existing authored concept; never call a correction independent success |
| [Babbel method](https://www.babbel.com/the-babbel-method) | Practical dialogues, explicit language rules, recaps and error review | Interest changes the place, phrase and recall target while the communication objective stays stable |
| [Babbel review](https://support.babbel.com/hc/en-us/articles/205600228-Vocab-workout-Review) | Performance-based intervals with writing, speaking, listening and recall modes | Real mistakes enter a dated queue; immediate repeated successes cannot race through spaced intervals |
| [Lingvist recall](https://lingvist.com/help/where-do-i-start/) and [review](https://lingvist.com/help/why-do-i-see-the-same-words/) | Active recall in context and review driven by learning history | Include recall without visible options, explain corrections and reuse difficult material later |
| [Duolingo depth](https://blog.duolingo.com/courses-teach-advanced-content/) and [Babbel language coverage](https://support.babbel.com/hc/en-us/articles/205600508-Available-languages) | Duolingo documents B2 content for nine major languages; Babbel's levels vary by target/base language | Publish a curriculum/skill matrix. Animation, activity count and a foundation quiz do not establish A2/B1/B2 proficiency |

The immediate quality gaps are continuity, explanatory feedback, delayed recall,
meaningful personalization, reliable recorded audio and consistent course depth.
Native app convenience and account continuity are further gaps. Competitor feature
availability varies by course, base language, platform and subscription.

## Delivery ledger

| Workstream | State before this increment | Change prepared in this increment | Completion still required |
| --- | --- | --- | --- |
| Shared entry | Experience, purpose and pace; interests absent | Six interests, up to three choices, editable, preserved separately from progress, all eight languages | Account preference sync and deeper interest variants within each authored course |
| Continuity | Intro final mostly returned to the same map | PR #481 deployed original 12-unit/36-lesson EN, ES and Québec French courses. PR #485 preserves unfinished typed unit/assessment answers in the five shared courses. PR #488 preserves shared-intro attempts, help and separate tab changes. PR #490 now preserves Japanese unfinished activity answers and checked attempts, with reset/revision boundaries and stale-check protection | Onboarding/placement recovery, full-course goal/pace guidance and authenticated device restoration |
| Feedback | Mostly correct phrase/translation in shared intro | Authored concept plus chosen/expected phrase, correct assistance tracking | Broader language-specific correction banks and unseen transfer assessments |
| Review | IT/DE/PT have dated local review; intro/JA/ZH inconsistent | First release connects seven intros and interest missions. Deployed PR #481 connects actual IT/DE/PT/new EN/ES/FR practice writers plus JA/ZH, and reuses their real answer checkers for dated review | Authenticated ownership, complete two-device restoration and offline server delivery |
| Interests | Local Parma reason only | 48 authored mini-mission variants: dialogue, venue choice, directions, typed noun recall, changed exit route, later error review | Destination-specific cultural variants throughout the full curricula; these mini-missions are not complete replacement courses |
| Cinema | Travel MP4s and three still-only mission slots | Three actual 5-second motion clips; opening/success/backpack slots use verified local MP4s | Bespoke destination/mission footage and each specific earned artifact; the generic backpack clip does not display an invented reward |
| Speech | Bounded eight-language server implementation deployed but disabled | Gateway preview authenticated project OIDC and read credits; credit below one $0.20 reservation stopped the diagnostic before any socket or inference. Its one-time flag is now disabled | Existing Gateway funding or native server credential, observed Realtime configuration acknowledgement, live audio QA in all eight languages and measured quotas, then activation |
| Recordings | 176 gaps in intro/current Italian inventory; 785 existing MP3 files verified | PR #482 deployed 255 exact-text clips. PR #489 deployed another 1,205 files for EN/ES/FR foundations and 13 Italian corrections; all 1,460 public MP3s now match their reviewed hashes | Thirteen excerpts are still withheld in this frozen bundle; DE/PT/JA/ZH full-course coverage is a separate release. Native listening approval remains outstanding. Device voice is a disclosed preview for unresolved phrases |
| Pass pilot | Local/test-only transaction rehearsal; production purchases off | Preserved; no live sale or price activation in this increment | Hosted account/Checkout/webhook/refund lifecycle, complete stage-depth audit, tax/access-channel verification and real authorized test evidence |
| Daily loop | Italian preview foundation merged, gated | Public local review improves; gated server daily loop remains gated | Required ownership/import/reset, abuse controls, two-device and offline-delivery evidence before broad activation |
| Verified XP and rankings | Local Italian demonstration ranking only | Dedicated all-eight-language verified practice ledger, optional real learner rankings, weekly/all-time/language filters and accepted-friend rankings; fictional profiles removed and independent migration applied | Owner authorized push and deployment without additional tests or disposable accounts; final deployment evidence is recorded in PR #497. See [the XP/rankings contract](yopratiqo-xp-rankings.md) |
| Teacher/Café | Existing links/invitation contracts | Existing destinations preserved, no transcript sharing | Consent-approved exact teacher brief, retention/expiry and real booking handoff validation |
| Later phases | B1 content, subscription, certificates, B2B briefs | No claim of implementation | Author/review B1 content, separate subscription economics/entitlements, aggregate-only B2B reports and tested certificate rules |

See [the parity audit](yopratiqo-parity-audit.md) for language-by-language evidence.
Course depth remains unequal. The public parity gate is **not met** by this release.

## Second lot: substantial foundations and course continuity

Prepared on the first production release's tree (`8c60fa1`), not a replacement
of the older workplace, Dominican or Italian progress contracts. Each new course
has 12 original units, 36 lessons, 252 authored practice activities, 72 written
unit questions and a separate 24-question cumulative final. English has 252
distinct vocabulary phrases and 108 dialogue turns; Spanish has 252 and 72;
Québec French has 216 and 144. Counts describe content, not proficiency levels.
The courses do not claim a CEFR or CLB certification.

The shared course engine now uses each language's own answer normalization,
keyboard, speech locale and progress namespace. Six explicit learning panels
cover the mission, vocabulary, grammar, sounds, reading and spoken self-practice.
Regional notes are rendered in the actual player. Device speech is identified
as a preview and requires a click; missing premium recordings remain visible.
The new written assessment sequences do not depend on unavailable recordings.

Unit/session restoration preserves the actual cursor, help and checked result.
Assessment restoration preserves the first checked answer, accumulated help,
question cursor and completed score, without submitting another result. A new
attempt requires a deliberate restart. Reset/content revision invalidates stale
assessment drafts. PR #485 subsequently added unfinished typed text as described below.

The eight full-course review adapters now receive actual wrong/helped attempts.
Optional review uses the original exercise checkers, preserves the reading
passage and cannot write course grades, bookmarks, XP or access. Final and
placement questions are excluded. The separate append-only journal leaves old
progress untouched. PR #484 subsequently fixed Mandarin's local whole-state
concurrency. Authenticated two-device restoration remains separate unfinished work.

Release status: PR #481 is deployed. All 11 GitHub workflows and both Vercel
checks passed for head `226d974539906873865f3ded15d1eb3e03bec651`. Real Chromium
and macOS WebKit exercised all three courses at 393px and 320px, including actual
checkpoint answers, assistance, reload without duplicate scoring and final locks.
The browser gates also caught and fixed a Mandarin recall focus race; input focus
survives delayed heading focus, and an unfinished IME composition cannot be graded
by Enter. Course navigation now requests pages on demand without speculative
prefetches. The production record is listed below.

## Fourth lot: deeper German and Brazilian Portuguese foundations

Prepared after verified production PR #482. Each course now contains 12 units,
36 lessons, 232 practice activities, 180 vocabulary references and 72 unit
questions. German has 179 distinct vocabulary strings; Brazilian Portuguese has
180. The four new units add 84 activities and twelve three-turn dialogues per
language, with explicit grammar, contextual reading, recall, production and
primary-source cultural notes rendered in the actual unit player.

German adds shopping and quantities, home and location, past events, and reasons
or changed plans. Brazilian Portuguese adds people and routines, shopping and
comparisons, completed events versus background, and shared projects. Each has a
new 24-question written final covering all twelve units. The original eight
units, 16-question final and eight-question cultural final remain byte-identical.
The old final stays at `/bilan-initial`; `/final` uses a separate new assessment ID.
Old scores do not become new-final evidence, and earlier independent checkpoints
remain valid. New written checks do not depend on missing recordings.

PR #483 is deployed. Independent content and integration reviews, typecheck,
lint, and all original content/player/audio regressions passed. Chromium and
macOS WebKit each entered all 72 unit answers and 24 new-final answers per
language through the actual controls, completed all 24 required recordings per
language through native `ended` events, checked the eight-/twelve-unit boundary,
and restored the final without a second submission. The gate caught and fixed
natural audio completion being interrupted by its preceding browser pause event.
All five triggered workflows and both Vercel builds passed on head `18b34ee`.
New-unit audio coverage remains incomplete; original published recordings retain
their full checks. The production record is listed below.

## Fifth lot: Japanese and Mandarin foundations deployed

Both courses now have twelve authored modules in production, with their original
eight modules and original eight-question finals preserved byte for byte. Each
adds a separate 24-question written final, covering all twelve modules with twelve
reading and twelve recall questions. The old final remains at `/bilan-initial`;
the canonical `/bilan` uses a new internal assessment identity. Historical final
grades and bookmarks never become evidence for the new final.

Japanese adds shopping and quantities, requests and permission, outings and
wishes, and reasons or sequenced plans. Its four new modules contain 32 vocabulary
entries, 26 dialogue lines, twelve grammar explanations, 32 written activities,
twelve roleplay turns and four ungraded productions. The full review catalog now
has 132 practice items. Cultural notes link to the reviewed primary sources.

Mandarin adds frequency and routines, comparisons and budgets, past events, and
reasons or conditions. The extension contains forty vocabulary entries, 24
dialogue lines, twelve grammar explanations, four readings and 56 new exercises;
the full practice catalog has 160 exercises. Reading context is preserved when
an exercise returns through the dated review queue. New written checks do not
depend on recordings that have not been published.

Mandarin progress now merges independent tab changes before applying a local
action. Reset epochs dominate older snapshots; replayed snapshots do not inflate
attempt counts; assistance stays attached to the current attempt. Newly checked
answers with pinyin, translation or hints are marked assisted. Historical
independent results retain their meaning. A deliberate fresh attempt clears the
answer and help, and listening evidence is never imported from another tab.

Japanese and Mandarin review now fetch one authored exercise on demand from the
same bounded public review endpoint. Course maps do not fetch full course banks,
and the endpoint excludes both old and new finals. The actual course checkers
remain responsible for answers; review cannot grant course outcomes or access.

Independent content, progress and integration reviews and focused local tests
have passed. The Chromium/WebKit gate passed with explicitly labelled historical
eight-module learner fixtures, then enters two new recall answers per language at
393px and 320px, one with help. It checks old-final resume, new-final locks,
reload without resubmission, and no microphone, provider or automatic audio use.
It does not claim to earn twelve modules through the UI or certify listening.
All six triggered GitHub workflows and both Vercel builds passed on head
`07df508cc2f0bddba4591710392f67a754da8eae`. PR #484 is deployed; all 33
public page/API checks passed. The production record is listed below.

## Sixth lot: typed resume and mobile lesson space deployed

The shared DE/PT/EN/ES/Québec French course player now preserves the unfinished
160-character typed answer for each matching activity on this device. Assessment
drafts preserve the current question's text. Reload restores text and feedback
without calling a grade or review writer; only an explicit Check can submit it.
The older Italian player remains compatible with its existing transient contract.

Drafts are bounded, namespaced by course, unit and activity, and invalidated by
reset or content revision. Concurrent tabs merge distinct activities; explicit
text edits have their own timestamp, so passive cursor/help saves cannot replace
newer text. A Check rendered before another view changed the answer is rejected
and displays the current draft for a deliberate new check. Help stays assisted,
first checked results are retained, and a new independent attempt requires an
explicit restart. Typed text stays local and is absent from review/grade payloads.

Yoppo uses the same reserved inline coach placement as Italian for these five
courses, keeping lesson controls clear on narrow screens. A compact lesson
selector replaces horizontally scrolling lesson cards on mobile. Independent
review passed; 29 typed-draft cases, nine assessment-draft cases and both course
isolation cases pass locally. The real Chromium/WebKit gate now types partial
unit and assessment answers, reloads, checks restored text and absence of a grade,
then completes the authored checks. All six EN/ES/FR cases passed in both Chromium
and macOS WebKit, along with the DE/PT full checkpoint/final and recorded-audio
gates. All four triggered workflows and both Vercel builds passed on head
`b565ab81be10b760f5c42b434ea4513cffb3b6c6`. PR #485 is deployed; all 17
public delivery checks passed. The production record is listed below.

## Seventh lot: bounded speech Gateway diagnostic

PR #486 adds an exact-commit, exact-preview, exact-project diagnostic with a
ten-second deadline and one credit read before any configuration socket. The
observed preview authenticated OIDC and parsed credits, but could not cover one
$0.20 reservation. It stopped before opening a socket or requesting inference.
The preview flag was cleared immediately afterward. No production activation,
credit purchase, budget change or retry occurred. Realtime parameter compatibility
and eight-language live voice quality remain unverified. See the
[diagnostic record](yopratiqo-speech-gateway-preflight.md).

## Eighth lot: Mandarin mobile reading space deployed

The Mandarin map and player use the warm paper, green controls and serif headings
of the Italian reference. The mobile player keeps its existing learning controls
while replacing the fixed 112-pixel companion reservation and spacer with a
56-pixel inline companion rail. Reading content scrolls above that rail; the
previous/next controls remain below it in normal layout flow with safe-area space.
The compact header leaves more room for the actual exercise. Keyboard focus
remains visible, and the companion's horizontal position stays inside the screen.

This is presentation work: authored answers, help, grading, progress, assessment
locks and navigation handlers are unchanged. Independent review found no blocker.
The Eastern Chromium/macOS WebKit gate adds actual layout measurements at 393px
and 320px: at least 55% of viewport height for the reading area, a 44–60px companion
rail, correctly ordered controls and no overflow. The existing historical fixtures,
two real new recall answers, help and reload checks remain intact. All eight
Eastern cases passed across Chromium and macOS WebKit, and their screenshots
were reviewed. The shared foundation browser gates also passed. All five triggered
workflows and both Vercel builds passed on head `b980b2dbd792d5bf1606bcc7598fb7113fb4b118`.
PR #487 is deployed; all nine public route/bundle/status checks passed.

## Ninth lot: introduction continuity across tabs deployed

The seven shared introductions retain their original local storage keys and
historical results while adding bounded, content-scoped attempt metadata. Separate
activities changed in different tabs are preserved. Consulted help, a wrong answer
and an already checked result remain attached to their actual attempt; restoring
them emits no grade, reward or dated-review event. An explicit fresh attempt is
required to clear assistance. A stale Check reads current storage and cannot grade
words changed in another view or resubmit an already checked answer.

Reset markers dominate older views. Content changes clear unfinished drafts/final
runs while retaining historical best results. An invalidated old tab displays a
specific refresh action. Storage failure remains a separate visible condition and
allows the current session to continue in memory. This is browser-local continuity,
not authenticated cross-device restoration; the independent review journal is not
deleted by a course reset.

Independent review, eighteen store cases, eight real-component cases, typecheck,
lint and the preserved historical journeys passed locally. A new real two-tab
English scenario at 320px joins the existing Chromium/macOS WebKit onboarding gate.
It seeds only a profile and an unfinished cursor, then checks actual edits, remote
help, stale/duplicate checks, reload and key removal. Both real browser engines
passed, along with all historical onboarding, travel-film, mission-film and
interest scenarios. The new harness respects the existing 300 ms trailing-tap
guard; no product guard was weakened to make the scenario pass. All four triggered
workflows and both Vercel builds passed on `a47b152514b6958a666833997b2525656524971e`.
PR #488 is deployed, and all nine public route/bundle/status checks passed.
See [the continuity contract](yopratiqo-intro-continuity.md).

## Tenth lot: foundation recordings deployed

The reviewed repository bundle adds 1,205 MP3 files, retaining all 255 previous
records and bytes. It contains 1,192 accepted English, Spanish and Québec French
excerpts, plus 13 Italian list corrections. Exact playable-text coverage becomes
420/423 in English, 347/354 in Spanish, 429/430 in Québec French and 834/836 in the
current Italian inventory. The thirteen withheld excerpts are not registered as
playable. Further recordings and the remaining four full-course inventories are
separate work. Details and source evidence are in the
[recording contract](yopratiqo-premium-recordings.md).

The full 1,460-file bundle totals 60,366,970 bytes and 3,730.913 seconds. Independent
ASR, exact-script/explicit-equivalence checks, safe phrase boundaries, complete MP3
decoding and SHA-256 checks passed. These checks do not certify pronunciation or
regional accent. The course homes show measured coverage from their real playback
resolver. The compact player index avoids shipping the provider metadata ledger.

Twelve audio/index/coverage cases, TypeScript and targeted lint passed locally.
The existing foundation browser gate retains all actual written-assessment and
draft-restoration cases, and adds four explicit playback controls per language:
vocabulary, grammar example, reading and dialogue. Each requires the expected MP3
and native completion, with no automatic playback or provider/microphone call.
PR #489 passed all six triggered workflows and both Vercel builds on exact head
`c9e6f9cf68421b91217659e26321152c91b4af87`. Chromium and macOS WebKit each
completed the four real playback controls per foundation language, including native
`playing` and `ended` events. The onboarding WebKit job initially hit the existing
eight-second cinema loading fallback; one failed-job rerun on the unchanged head
passed all eight interest and six cinema cases. The original failure was retained;
no product guard or assertion was weakened. Production delivery verified all
1,460 exact MP3 hashes, audio MIME and immutable caching (60,366,970 bytes), the
three foundation homes and disabled live speech.

## Eleventh lot: Japanese activity continuity deployed

The existing twelve Japanese modules and both finals now preserve unfinished
answers and checked attempts locally. Assistance remains attached to an attempt,
even after hiding the hint or reloading. Two tabs merge distinct activities; Check
rereads storage and rejects a stale rendered answer before grading or writing SRS.
Explicit retry, content revision and reset each delimit an attempt. Historical
results and access rules remain compatible. This is not authenticated backup.

Recorded audio availability is shown before a click, and natural media completion
is distinguished from interruption. No new Japanese recording is claimed by this
lot. Focused store, renderer and audio regressions passed. The existing Eastern
Chromium/macOS WebKit gate exercises two actual pages, unfinished drafts,
sticky assistance and checked restoration. All five triggered workflows and both
Vercel builds passed on final head `21eb0916d9adafe3d7ce3922839766e32072a0aa`.
Two Kanji assertions were narrowed to their exact status messages after the new
audio-availability status made the old unqualified selector ambiguous; no product
notice or assertion was removed. PR #490 merged at
`c61a45d7808106da65392a567bb2b48fe63640dc` and reached production. See
[the continuity contract](yopratiqo-japanese-continuity.md).

## Twelfth lot: onboarding recovery and course guidance prepared

One bounded draft store now serves Italian onboarding and the seven shared
introductions. It preserves the learner's experience, goal, interests, selected
pace, unfinished custom pace, placement cursor, partial answer, first checked
answer, help and recommended starting mission. Reload and interface-language
changes do not grade, advance, start audio or call profile completion. Explicit
restart begins a new placement attempt. A stale answer or finish is rejected;
changed profiles, content and reset generations invalidate the old setup. A
storage failure remains usable for the current session with a visible notice.
This is local continuity, not account backup or a new placement certification.

All eight full-course maps retain the chosen goal and weekly pace as supporting
guidance beside their existing next action. The existing lesson/activity URL,
course outcome and entitlement logic are unchanged. This guidance does not claim
to generate a new curriculum. Public German/Portuguese/Japanese/Mandarin course
summaries now describe their actual twelve units/modules; the three-mission
introductions and original eight-module assessments keep their distinct scope.

The expanded opening-browser gate starts from a genuinely blank profile for all
eight languages: 17 viewport/motion cases per engine, through the actual
recommendation. A separate Italian/shared two-tab scenario exercises custom pace,
locale-changing reload, first checked answer, stale finish and deliberate restart.
Renderer tests cover all eight targets and all three interface languages. Local
browser interaction verified German custom-pace and checked-answer recovery and
heading focus. Exact-commit Chromium/macOS WebKit execution and production
verification remain required before this candidate is called deployed. See the
[onboarding contract](yopratiqo-onboarding-continuity.md) and
[course-guidance contract](yopratiqo-course-study-plan.md).

## Speech funding observed in the account dashboard

On November 25 at approximately 07:39 UTC, the signed-in
[Gateway dashboard](https://vercel.com/marcandretheberge-dotcoms-projects/~/ai-gateway)
showed a $0.00 balance. The minimum supported one-time purchase was US$10 credit,
plus a US$0.30 processing fee and applicable tax/fees. Auto-reload was disabled.
The final form required payment verification/billing information and acceptance
of Vercel's AI Product Terms. The quote was cancelled before submission; no credit,
key, budget, production flag or inference request was created by this inspection.
Those payment/identity/terms steps cannot be supplied by an independent code review.
Token Pass is not a substitute for this model: its current featured-model list
excludes OpenAI Realtime. See [the current Token Pass scope](https://vercel.com/docs/ai-gateway/token-pass).

## Commercial decisions retained

The retired CAD 24.99 travel-module hypothesis is not the current YoPratiqo offer.
The tested Yoppo Pass direction is one eligible stage at CAD 3.49, three passes at
CAD 8.99, and the named Italian Foundations itinerary at CAD 19.99 for 12 months,
without automatic renewal. The entire first module is free; five welcome passes
are one-time and shared across languages. Proposed referral/monthly grants must
be backed by verified eligibility. Monetary Pratiqo credits and Pass units remain
separate. The CAD 59.99 bundle stays unavailable until its named included courses
are complete and tested. These are product decisions, not proof of live Checkout.

The eleven pilot situations must be audited individually for complete instruction,
listening, meaningful choice, feedback, a fresh attempt and replay. Do not sell a
map marker, an untranslated stub or a generic movie as a completed paid stage.
Existing purchasers keep their original contracts and progress.

## Independent review decisions

- Use shared, versioned preference and review contracts; do not replace old course
  keys or reinterpret completion counts as learning evidence.
- Keep the current course assessment/entitlement logic separate from new free
  practice. A revealed answer stays assisted after retry and reload.
- Preserve a paused mini-mission before offering another due interest; do not
  silently discard its cursor.
- Reuse two verified exact Italian recordings. Record every new missing phrase
  in the offline plan instead of inventing playable paths.
- Approve the two existing CreativeClaw requests through their documented scoped
  review cards after inspecting source, prompt, duration, resolution, sound-off
  setting and price. Keep global Review mode unchanged. The third clip had
  already completed and was not resubmitted. Net final cost: 213 credits each,
  639 total; this turn submitted two, costing 426 credits, with no paid retries.
- Leave live speech and server daily/SRS gated until their actual prerequisites
  are available and verified. No automated reviewer can fabricate a missing key.

## Verification and release record

Before pushing: complete independent reviews; typecheck/lint; focused tests for
onboarding, old-progress preservation, 48-content integrity, all eight rendered
practice paths, retry/help/reload, due review and concurrency; verify the actual
films and both reused recordings. Then run the repository CI, including Chromium
and WebKit mobile layouts, against the exact pushed commit. Merge only after all
relevant checks succeed, verify the resulting production commit/deployment and
public assets, and record the real links below. This section is updated as the
release progresses; a prepared change is not yet a production release.

- First release: [PR #480](https://github.com/marcandretheberge-dotcom/Pratiqo/pull/480), merged at `8c60fa16457e604bd570c27ad6d50d89cb17b45d`. All 15 GitHub workflows and both Vercel builds passed, including Chromium and macOS WebKit. The 320px Québec overflow was fixed before merging.
- First production deployment: `dpl_GiL9SWg7bD59WSBbCGdGpETDZPoo`, READY and assigned to pratiqo.ca/www.pratiqo.ca. The 24 public smoke checks passed, including exact hashes for all three new MP4s. No runtime errors were returned in the first five-minute log window; this is a short observation window, not an uptime guarantee. Live speech remains disabled.
- Second release: [PR #481](https://github.com/marcandretheberge-dotcom/Pratiqo/pull/481), merged at `89e8bbe780a339f7472b7811d80bc0f611957453`. All 11 GitHub workflows and both Vercel builds passed on the exact final head, including the foundation and onboarding Chromium/macOS WebKit gates.
- Second production deployment: `dpl_6k8oqubLzeE7PMWD6cfm1mfjxsqg`, READY and assigned to pratiqo.ca/www.pratiqo.ca. All 24 public checks passed: twelve course pages, six actual contextual review responses, five malformed/missing/final-item boundaries, and disabled live speech. No error/fatal runtime logs were returned in the first five-minute observation window. Review returns one public authored practice item, not learner records or a complete course bundle.
- Third release: [PR #482](https://github.com/marcandretheberge-dotcom/Pratiqo/pull/482), merged at `c1bbb66ea8ebb7488e4de2247271e1e1febcfad8` after all six triggered GitHub workflows and both Vercel builds passed. Independent review verified all 255 clip hashes and the compact-index boundary.
- Third production deployment: `dpl_Ckd6mMQQSGmhXcBwAgy4h8AUXK81`, READY and assigned to pratiqo.ca/www.pratiqo.ca. All 255 public MP3s returned the reviewed bytes (6,559,441 total) with audio MIME and one-year immutable caching; disabled live speech remained unchanged. No error/fatal logs were returned in the first five-minute observation window.
- Fourth release: [PR #483](https://github.com/marcandretheberge-dotcom/Pratiqo/pull/483), merged at `8a263150d87c15898c3ac9b0dffa8b0849c07e61` after all five triggered GitHub workflows and both Vercel builds passed on head `18b34ee0d61ebca6ec89a3c58c33e5d09de11f3c`. Both browser engines completed the actual DE/PT assessments and required MP3 playback.
- Fourth production deployment: `dpl_GVZQFHakW8GsdjxqfVDHPSMPVC7N`, READY and assigned to pratiqo.ca/www.pratiqo.ca. All 27 public checks passed: fourteen course/old-final/new-final/culture routes, eight actual new-unit review responses, four final exclusions and disabled speech. No error/fatal logs were returned in the initial five-minute observation window.
- Fifth release: [PR #484](https://github.com/marcandretheberge-dotcom/Pratiqo/pull/484), merged at `b78d10f3aa3cc88315c95276eb5aedae2ef74ee9` after all six triggered GitHub workflows and both Vercel builds passed. All eight Japanese/Mandarin mobile cases passed in Chromium/macOS WebKit; their historical fixtures and limited new-recall scope are recorded above.
- Fifth production deployment: `dpl_HPxjuKSTfBnvDsMGETowqnT3m1AY`, READY and assigned to pratiqo.ca/www.pratiqo.ca. All 33 public checks passed: twelve course/final routes, sixteen exact new-unit review responses with their authored contexts, four final exclusions and disabled speech. No error/fatal runtime logs were returned in the initial observation window.
- Sixth release: [PR #485](https://github.com/marcandretheberge-dotcom/Pratiqo/pull/485), merged at `bc54a7f56940ba0817f479f32bc044d85da633d6` after all four triggered GitHub workflows and both Vercel builds passed. Chromium/macOS WebKit preserved actual partial unit/assessment text without grading on reload and completed the existing course gates.
- Sixth production deployment: `dpl_3TK6HusWF54hbgpbGyfTAf7Yw98z`, READY and assigned to pratiqo.ca/www.pratiqo.ca. All 17 public checks passed: fifteen course/unit/final pages, the served typed-resume/mobile-selector bundle and disabled speech. No error/fatal runtime logs were returned in the initial five-minute observation window.
- Seventh release: [PR #486](https://github.com/marcandretheberge-dotcom/Pratiqo/pull/486), merged at `2e6c44a69e6339f92e764167434978c8cc00b3bd` after all ten triggered GitHub workflows and both Vercel builds passed on final head `133e51babc19500b52084a5f50e93ae589608712`. The single diagnostic preview stopped on insufficient reservation credit; its flag was cleared before the healthy final build.
- Seventh production deployment: `dpl_6Pnbew4yDCbfXDLc9nsYFQCfbUJr`, READY and assigned to pratiqo.ca/www.pratiqo.ca. All nine public checks passed: eight course homes and disabled speech. The production build emitted no diagnostic report, and the initial five-minute runtime query returned no error/fatal logs. No inference or purchase was requested.
- Ninth release: [PR #488](https://github.com/marcandretheberge-dotcom/Pratiqo/pull/488), merged at `8cc6accc8d41070ee5d59e0ba4aaef30ef08b065` after all four triggered workflows and both Vercel builds passed. Both real two-tab browser scenarios preserved help, drafts and checked results, rejected stale submissions and kept deletion final without replaying SRS.
- Ninth production deployment: `dpl_HHBKLS7Z1ori8V1fTewNsUpA3Czc`, READY and assigned to pratiqo.ca/www.pratiqo.ca. All nine public checks passed: seven introduction pages, the served synchronization/refresh bundle and disabled speech. The initial five-minute runtime query returned no error/fatal logs.
- Eighth release: [PR #487](https://github.com/marcandretheberge-dotcom/Pratiqo/pull/487), merged at `a00016602f789d09b060f30119c86b610e2462d8` after all five triggered workflows and both Vercel builds passed. The actual Eastern browser screenshots and geometry checks confirm the mobile layout; shared foundation regressions also passed.
- Eighth production deployment: `dpl_AtG9CUuxPAUrt7phzxyFjksqPPaF`, READY and assigned to pratiqo.ca/www.pratiqo.ca. All nine public checks passed: five Mandarin pages, two Japanese pages, the served Mandarin layout bundle and disabled speech. No error/fatal logs were returned in the initial five-minute observation window.
- Tenth release: [PR #489](https://github.com/marcandretheberge-dotcom/Pratiqo/pull/489), merged at `9e9a30a9fab124bcd39a6d4ab96eda747b7ac0e9` after all six triggered workflows and both Vercel builds passed. Both foundation browser engines completed actual recorded playback; the unchanged onboarding WebKit failed-job rerun passed after one documented cinema loading timeout.
- Tenth production deployment: `dpl_9C2jd2dbyjEAkZb3qX9m5DfvDc5Z`, READY and assigned to pratiqo.ca/www.pratiqo.ca. All 1,460 public MP3 hashes, MIME types and immutable cache headers passed (60,366,970 bytes), along with three course homes and disabled speech. The initial five-minute runtime query returned no error/fatal logs.
- Eleventh release: [PR #490](https://github.com/marcandretheberge-dotcom/Pratiqo/pull/490), merged at `c61a45d7808106da65392a567bb2b48fe63640dc` after all five triggered workflows and both Vercel builds passed. Eastern and shared-foundation Chromium/macOS WebKit checks passed on the exact final head; Japanese draft restoration does not replay a grade or review receipt.
- Eleventh production deployment: `dpl_AQUZLghqcq4DqKjAWyGD49nUMzn1`, READY and assigned to pratiqo.ca/www.pratiqo.ca. Nine public checks passed: seven Japanese/Mandarin/Italian course pages, the new Japanese draft-store marker in the actual served module bundle, and disabled live speech. These HTTP/bundle checks supplement the browser gates; they are not a new physical-device or live-speaking test.
- Morning verification: scheduled for November 25 around 08:00 Toronto; it must
  read current GitHub/deployment state and this ledger, not repeat stale claims.
