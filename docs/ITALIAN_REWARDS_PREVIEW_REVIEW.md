# Italian Rewards Preview

Review date: 2026-11-22. **For visual review only; not approved for production.**

## Isolation

- Worktree: `yo-italian-rewards`.
- Branch: `feat/yo-italian-rewards-preview-20261122`.
- Base: `origin/main` at `81aada747a0468f7dc7adaedf70153c963c97aff`.
- Local preview: http://127.0.0.1:55851/?lang=fr (also `lang=en`, `lang=es`).
- No commit, push, migration, production write, deployment, paid generation or notification.
- The unfinished audio-release worktree and other worktrees were not edited.
- Review progress, drafts, word-study cursor, map cosmetics, selected unit and rewards use the separate `yo.preview.italian-rewards.v1` namespace.
- Sound preferences inherit existing mute/volume preferences initially, then save separately.
- The standalone preview exposes only local course assets and read-only recordings from the existing local storage service. No Auth, database, payment, messaging or server-side progress API is available. Non-GET/HEAD requests return 405.
- The optional Next review route is noindex and fails closed without the explicit local flag and loopback backend. It is disabled on Vercel, including Preview.

## Experience

The existing Italian course, canonical grading, geographical map, approved Yoppo, travel animation, notebook, hint handling, lesson audio and mission resumption are reused. No new question bank or alternative unlocking engine was introduced. The preview uses the full guided course's vocabulary and exercises; the personalized entry flow and its optional preparatory recall screen remain outside this reward pilot.

- Journey, daily goals, the weekly ranking and Speak share one phone-oriented shell.
- Continue remains above the bottom navigation on tested phone sizes.
- XP and daily-goal status are visible inside the actual mission.
- Confirmed practice creates a short Yoppo celebration. Loading a page, listening to a clip or opening a destination earns nothing.
- The revised preview uses an original, locally synthesized plucked-string palette; the normal course keeps its soft-wood sounds. Travel is a single muted pick, a correct answer is a short ascending interval, and mission, stamp and unlock are distinct cadences. No error buzzer, random pitch or additional sound on top of the XP toast.
- No surprise delayed effects after speech: preview cues expire after 800 ms. They never interrupt or overlap active lesson audio.
- Pronunciation is voluntary. Effects and pronunciation remain separate.
- Reduced motion removes the new celebration animations; existing map reduced-motion handling is preserved.

## Reward Rules

| Evidence | XP | Limit |
| --- | ---: | --- |
| A real activity completed | 5 | Once per activity |
| The same activity completed independently | 5 additional | Once per activity |
| All activities of a lesson completed | 20 | Once per lesson |
| Canonical module challenge passed independently | 50 | Once per module challenge |

An initially independent activity therefore earns 10 XP. A correction treated as assisted by the existing grader earns 5 XP. A later independent success can earn the remaining 5. Mistakes never subtract points.

The ledger uses stable event identifiers and preserves original award dates. Reloads and repeats do not increase points. Parsing uses known course identifiers and fixed reward amounts. These client checks are for a local prototype, **not a secure public leaderboard**.

XP does not alter canonical assessments, stamps, lessons, entitlements, purchases, scooter eligibility or city unlocks.

Daily goals: five newly completed activities, two completed listening activities, one completed lesson. The preview uses America/Toronto calendar days and Monday weeks, including DST. Weekly reset does not erase total XP or learning evidence.

## Visual and Sound Review

Map revision: the Italian rewards preview now restores the three original illustrated landscapes and their winding road. The artwork, city targets and traveler share the same map area; the traveler and road use the approved path geometry. This is an illustrated itinerary, not a geographic map. The separate geographic course route is unchanged. The duplicate artwork banner above the map was removed. The local-only `tests/yo/italianRewardsAtlas.browser.mjs` test exercises tap, mid-walk redirection, a locked city, unchanged course progress and the original artwork.

The illustrated passport uses the existing Italian world artwork. Matched tiles turn mint; daily activity punches reflect actual completions. Yoppo's small response, lesson reaction and mastery pose use the existing character assets. The Speak postcard uses actual lesson vocabulary, translations and voluntary pronunciation. Learners can change phrases without gaining points. Free peer exchange and paid teacher search are separate, deliberate links to the public site in a new tab, without learner data or prefetch. Neither sends a message or books anything by itself.

Reference principles: [Babbel](https://www.babbel.com/the-babbel-method) for real conversational goals, [Duolingo](https://blog.duolingo.com/building-character/) for immediate character feedback, [Trivia Crack](https://triviacrack.help.etermax.com/hc/en-us/articles/360024626314-How-to-win-characters) for a visible sequence of small achievements. No competitor art, audio or penalty mechanics are used.

### Revenue experiments, not live offers

1. **Start with teacher lessons.** Offer personal feedback on a concrete task such as introducing yourself. Search actual Italian supply; never promise an available teacher. Evaluate eligible learners shown the offer, teacher-search visits, first completed paid lessons and actual retained platform fees after refunds, not just checkout clicks. Compare against the existing teacher referral entry. Guardrail: course completion and free Café use must not decline materially.
2. **Only then test a paid practice pack.** Test interest in a one-time Italian trip rehearsal (café, directions, train station) with new dialogues and review, not a paywall on existing activities. Validate demand and contribution after audio, editing and support costs before setting a price. Do not sell hints, XP, leaderboard position or retries.
3. **Later, test a teacher-led small group.** A teacher could host a structured paid conversation workshop with a clear lesson outcome, separately from free peer chat. Validate teacher capacity and attendance first. Measure completed seats and net contribution per session; do not convert the free Café into a paid room.

No commerce integration, tracking, new fee, paid gate or actual offer was enabled. Any future attribution must use consented first-party measurements without chat content or learner phrases.

## Ranking Policy

The four comparison profiles are explicitly labelled fictional throughout the board. Only the reviewer's row reflects actual practice inside this local preview. The fixture is static and does not pretend that other learners are online.

Before a real social ranking is released: server-validated completion events, idempotent XP awards, privacy/opt-in choices, safe public display names, abuse controls, cross-device reconciliation and due-review XP policy need implementation/review. No public competition is claimed here. The pilot does not award unlimited points for repeating easy questions.

## Files

- `components/yo/rewards/ItalianRewardsPreview.tsx`: integrated shell, real course/map, goals, fictional weekly board, persisted rewards, reactions, settings.
- `components/yo/rewards/italianRewards.css`: scoped responsive layout, mission status, accessible animation.
- `lib/yo/rewards/italianPreviewRewards.ts`: pure reward reconciliation, parsing, calendar buckets and demo ranking.
- `lib/yo/rewards/previewGate.ts`: local-only opt-in gate.
- `app/yo/review/italian-rewards/page.tsx`: gated Next entry using the actual curriculum and recordings.
- `components/yo/italian/guided/GuidedItalianCourse.tsx`: optional isolated draft namespace and mission-status slot; defaults and grading unchanged.
- `components/yo/feedback/LearningFeedback.tsx`: optional isolated preferences and stable preview feedback.
- `lib/yo/feedback/feedbackPlayer.ts`: optional fixed-pitch, short-lived preview cue mode; existing defaults unchanged.
- `tools/italian-rewards-review/{main.tsx,build.mjs,serve.mjs}`: existing repository standalone-review pattern, same course components, loopback-only static server, local recording adapter.
- `tests/yo/italianRewardsPreview.test.ts`: reward, timezone, independence, isolation and gating regressions.
- `tests/yo/italianRewardsPreview.browser.mjs`: real local browser interactions, audio, persistence, responsive screenshots.
- `tests/yo/yopratiqoFeedback.test.tsx`: two extra tests for fixed pitch/expiry and inherited-but-isolated preferences.

No dependency, lockfile, business rules, authentication, payments, access controls or migration changes.

## Commands and Evidence

Runtime: Node v24.15.0, Next 16.2.9, React 19.2.4. Dependencies were reused read-only through a local junction; no package installation changed another worktree.

| Command | Result |
| --- | --- |
| `node node_modules/typescript/bin/tsc --noEmit --incremental false` | PASS |
| `node node_modules/tsx/dist/cli.mjs tests/yo/italianRewardsPreview.test.ts` | PASS, 11 tests including original motif bounds, duration and reproducibility |
| `node node_modules/tsx/dist/cli.mjs tests/yo/yopratiqoGuidedItalian.test.ts` | PASS, 16 checks |
| `node node_modules/tsx/dist/cli.mjs tests/yo/yopratiqoGuidedItalianPlayer.test.tsx` | PASS, 9 checks, including all 19 real exercises and challenge |
| `node node_modules/tsx/dist/cli.mjs tests/yo/yopratiqoItalianCourseProgress.test.ts` | PASS, 30 checks |
| `node node_modules/tsx/dist/cli.mjs tests/yo/yopratiqoItalianTravel.test.ts` | PASS |
| `node node_modules/tsx/dist/cli.mjs tests/yo/yopratiqoFeedback.test.tsx` | PASS, 19 checks |
| `node node_modules/tsx/dist/cli.mjs scripts/validate_i18n.ts` | PASS, 3562 keys per locale |
| Targeted ESLint on all changed TS/TSX application and test files | PASS, no errors or warnings; stale Browserslist database notice only |
| `node tools/italian-rewards-review/build.mjs` | PASS, optimized isolated review bundle |
| `node tests/yo/italianRewardsPreview.browser.mjs` | PASS, 11 browser groups including Speak and the original audible cue path |
| `node ../yo-italian-rewards-local.mjs build` | Previous iteration: PASS, 372 static pages. Not rerun for the visual/sound iteration; the updated standalone preview bundle was built. |
| `git diff --check` | PASS |

The local development attempt with Turbopack rejected the dependency junction outside its filesystem root. Webpack development then hit the existing no-eval CSP. Neither security controls nor production configuration were relaxed. The review uses the repository's optimized standalone-preview pattern instead. The full Next production build was also run with the supported Webpack flag, without eval, skipped checks or mocked backend results. The default Turbopack build with junction dependencies is not claimed as validated.

Browser evidence under ignored `.qa-guided/italian-rewards/`:

- `mobile-journey.png`
- `mobile-earned-xp.png`
- `mobile-goals.png`
- `mobile-ranking.png`
- `mobile-conversation.png`, `postcard-sounds.wav` (travel, correct answer, mission, stamp, unlock; generated directly from the preview PCM with `tools/italian-rewards-review/export-sound-demo.ts`)
- `desktop-journey.png`, `desktop-ranking.png`
- `video/*.webm`
- `browser-results.json`: outcomes, observed audio responses and real media playback events.

Tested 320, 390, 768 and 1366 px widths. Verified actual first-activity corrections, reward reaction, reload without duplicate rewards, daily 1/5 progress, weekly row update, mute persistence, exact mission resumption, locked destination, no horizontal overflow, visible map, Continue above the phone navigation, reduced-motion navigation, zero page errors and HTTP 405 on write endpoints.

The browser test observes the recording's media clock reaching its decoded duration. It does not fabricate a successful play event. Chromium emits pause before ended; the existing player cleans up on pause, so measuring ended alone was insufficient.

On this Windows host the browser runner uses `PLAYWRIGHT_BROWSERS_PATH=C:/Users/Utilisateur/AppData/Local/ms-playwright` and permission to reach loopback services. Restricted-runner attempts could not find the browser cache or reach the preview; those attempts are not counted as passing validations. The playback trace is captured before reload so the report retains the actual audio evidence.

## Reproduce

For this visual/sound iteration, the preview bundle, TypeScript, targeted lint, reward and feedback tests, and emulated browser flow were run. Earlier course progression and localization results above are historical. The live Café and teacher booking flow were deliberately not exercised.

From this worktree:

1. `node tools/italian-rewards-review/build.mjs`
2. `node tools/italian-rewards-review/serve.mjs`
3. Open http://127.0.0.1:55851/?lang=fr.
4. Skip or play the arrival, Continue to Bologna, complete vocabulary and the first matching activity. Check XP, Goals and Ranking. Close the mission and reload to test resumption.

Recordings require the existing isolated PR405 storage service on loopback port 55421. No production storage fallback is configured in this review server. An unavailable recording remains an error, not a fabricated successful listen.

## Limits and Release Gate

- Physical iPhone Safari, native haptics and packaged iOS/Android builds were not tested. Phone sizes here are Chromium emulation.
- No new HTTPS tunnel was opened. The provided URL works on this computer, not directly on an iPhone.
- Weekly rankings are fictional visual-review fixtures; cross-device synchronization and real competition are not implemented.
- Historical production learning evidence is not imported into this preview.
- Repeating an already rewarded activity does not produce daily XP farming. A future due-review reward policy must use the existing review schedule.
- The full repository test suite and remote CI were not rerun; this is not a release authorization.
- Rollback: stop the standalone server and leave the local-only flag unset. No database rollback or production cleanup is needed.

Verdict: **READY FOR VISUAL REVIEW**, not ready to expose a public leaderboard.

## Journey length and maps

The illustrated Italian preview shows the current map number, total maps and total cities together. Tap the itinerary above the artwork to see every chapter and its cities. Locked chapters can be inspected but not entered. Opening the overview does not start a lesson or grant progress.

| Primary journey | Maps | What a stop represents |
| --- | ---: | --- |
| Italian | 3 | 12 city modules, four per illustrated world |
| German, Brazilian Portuguese, Japanese, Mandarin | 3 each | Eight assessed units per course, grouped 3 + 3 + 2 |
| English, Quebec French | 3 each | Three actual meetings; entries for the mission, dialogue and practice. The last map includes the existing final challenge |
| Spanish | 5 | Three meeting maps as above, plus two maps for the six existing optional regional practices |

These are chapters, not CEFR certifications. Only real course destinations and lesson steps are shown. Seeing a destination in the itinerary does not unlock it. An existing shared-map bookmark is resolved by destination ID when the grouping changes. Historical progress, assessments, XP and paid access rules are unchanged.

Verified with the shared map model tests, the introduction player tests, TypeScript and the mobile Chromium atlas test (including all three Italian chapters, locked worlds and changing destination during a walk). Local visual review only; physical Safari and cross-device sync were not tested.
