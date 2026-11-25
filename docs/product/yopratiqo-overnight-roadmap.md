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
| Continuity | Intro final mostly returned to the same map | First release links to real continuation. Second lot adds original 12-unit/36-lesson EN, ES and Québec French courses, with real written checks, regional notes and continuation from the intro | Browser/deployment verification of the second lot; language-specific listening approval; partial typed answers in the new course player still restart on reload |
| Feedback | Mostly correct phrase/translation in shared intro | Authored concept plus chosen/expected phrase, correct assistance tracking | Broader language-specific correction banks and unseen transfer assessments |
| Review | IT/DE/PT have dated local review; intro/JA/ZH inconsistent | First release connects seven intros and interest missions. Second lot connects actual IT/DE/PT/new EN/ES/FR practice writers plus JA/ZH, and reuses their real answer checkers for dated review | Deploy and verify second lot; authenticated ownership, complete two-device restoration and offline server delivery |
| Interests | Local Parma reason only | 48 authored mini-mission variants: dialogue, venue choice, directions, typed noun recall, changed exit route, later error review | Destination-specific cultural variants throughout the full curricula; these mini-missions are not complete replacement courses |
| Cinema | Travel MP4s and three still-only mission slots | Three actual 5-second motion clips; opening/success/backpack slots use verified local MP4s | Bespoke destination/mission footage and each specific earned artifact; the generic backpack clip does not display an invented reward |
| Speech | Bounded eight-language server implementation deployed but disabled | Kept bounded, no new live requests; locale aliases aligned | Server API credential, live audio QA in all eight languages, measured quotas/payment funding, then activation |
| Recordings | 176 gaps in intro/current Italian inventory; 785 existing MP3 files verified | Interest corpus is explicitly added to the offline plan: 96 phrases, two exact existing Italian recordings reused, 94 unresolved | Generate, validate transcript/codec/delivery, listen and publish the actual missing recordings. Device voice is a disclosed preview |
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

Release status: local content, review, assessment and legacy regression tests
have passed. Chromium/WebKit, exact-head CI, merge and production checks must
still be recorded before this second lot is called deployed.

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
- Morning verification: scheduled for November 25 around 08:00 Toronto; it must
  read current GitHub/deployment state and this ledger, not repeat stale claims.
