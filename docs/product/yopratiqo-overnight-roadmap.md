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
| Continuity | Intro final mostly returned to the same map | First release links to real continuation. PR #481 deployed original 12-unit/36-lesson EN, ES and Québec French courses, with real written checks, regional notes and continuation from the intro | Language-specific listening approval; partial typed answers in the new course player still restart on reload |
| Feedback | Mostly correct phrase/translation in shared intro | Authored concept plus chosen/expected phrase, correct assistance tracking | Broader language-specific correction banks and unseen transfer assessments |
| Review | IT/DE/PT have dated local review; intro/JA/ZH inconsistent | First release connects seven intros and interest missions. Deployed PR #481 connects actual IT/DE/PT/new EN/ES/FR practice writers plus JA/ZH, and reuses their real answer checkers for dated review | Authenticated ownership, complete two-device restoration and offline server delivery |
| Interests | Local Parma reason only | 48 authored mini-mission variants: dialogue, venue choice, directions, typed noun recall, changed exit route, later error review | Destination-specific cultural variants throughout the full curricula; these mini-missions are not complete replacement courses |
| Cinema | Travel MP4s and three still-only mission slots | Three actual 5-second motion clips; opening/success/backpack slots use verified local MP4s | Bespoke destination/mission footage and each specific earned artifact; the generic backpack clip does not display an invented reward |
| Speech | Bounded eight-language server implementation deployed but disabled | Kept bounded, no new live requests; locale aliases aligned | Server API credential, live audio QA in all eight languages, measured quotas/payment funding, then activation |
| Recordings | 176 gaps in intro/current Italian inventory; 785 existing MP3 files verified | PR #482 deployed 255 exact-text clips: all seven introductions and all eight interest corpora resolve actual recordings; Italian inventory reaches 821/836 phrases. Every new public MP3 matches its reviewed SHA-256 and has immutable cache headers | Fifteen Italian slash phrases remain missing in this deployed lot; the full EN/ES/FR and Italian correction recordings are a separate generation/QC batch. Native listening approval remains outstanding. Device voice is a disclosed preview for unresolved phrases |
| Pass pilot | Local/test-only transaction rehearsal; production purchases off | Preserved; no live sale or price activation in this increment | Hosted account/Checkout/webhook/refund lifecycle, complete stage-depth audit, tax/access-channel verification and real authorized test evidence |
| Daily loop | Italian preview foundation merged, gated | Public local review improves; gated server daily loop remains gated | Required ownership/import/reset, abuse controls, two-device and offline-delivery evidence before broad activation |
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
assessment drafts. Unsubmitted exercise text is not included in these drafts.

The eight full-course review adapters now receive actual wrong/helped attempts.
Optional review uses the original exercise checkers, preserves the reading
passage and cannot write course grades, bookmarks, XP or access. Final and
placement questions are excluded. The separate append-only journal leaves old
progress untouched. Mandarin's legacy whole-state progress concurrency and
authenticated two-device restoration are still separate unfinished work.

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

## Fifth lot: Japanese and Mandarin foundations prepared

Both courses now have twelve authored modules in this branch, with their original
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
have passed. The prepared Chromium/WebKit gate uses explicitly labelled historical
eight-module learner fixtures, then enters two new recall answers per language at
393px and 320px, one with help. It checks old-final resume, new-final locks,
reload without resubmission, and no microphone, provider or automatic audio use.
It does not claim to earn twelve modules through the UI or certify listening.
Exact-head CI and production delivery remain pending for this fifth lot.

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
- Morning verification: scheduled for November 25 around 08:00 Toronto; it must
  read current GitHub/deployment state and this ledger, not repeat stale claims.
