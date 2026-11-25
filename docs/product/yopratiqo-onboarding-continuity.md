# On-device onboarding and placement continuity

Italian and the seven shared introductions use one bounded draft engine with language-specific validators. Each language keeps one document at `yo.onboarding-draft.v1.<language>` (Mandarin uses the existing `zh-CN` preference identity). Documents are limited to 24,000 characters; option identifiers, word-tile indexes, answer counts, mission choices, interests, pace and screen values are validated against the current authored course.

## Learner behavior

- Reloading or changing the interface language preserves experience, goal, interests, weekly pace, unfinished custom input, current screen, mission picker, question, partial word tiles, checked first answer, assistance and recommendation.
- Restoring a checked answer does not check it again, replay feedback, arm automatic continuation, start lesson audio, or submit a profile. An unfinished listening question requires fresh completed playback or its visible transcript after reload; transcript help remains assisted.
- “Start this check again” deliberately clears placement answers and current-question assistance. A checked first result remains immutable until that explicit restart.
- Another window's newer choices are read before every action. A stale edit, check, continuation or finish is rejected and the current draft is shown with a notice; the learner can review it before acting again. Storage, focus, page restoration and visibility events also refresh the view.
- Changed authored checks, profile, reset generation, deleted drafts or an incompatible document invalidate an already open placement. Reload safely starts from the current scope. Older pages leave future draft schemas untouched.
- Failed browser storage leaves the current session usable and shows a session-only notice. If storage returns without a competing draft, the in-memory choices are saved. This feature does not provide account or cross-device synchronization.

## Evidence boundary

The draft engine cannot write course progress, review attempts, mastery, XP, rewards, entitlements or server data. Hydration parses existing checked flags and never grades them. Only an explicit accepted check computes its correctness. Only an explicit current “Start here” consumes the setup and invokes the existing profile callback; repeated or stale finishes cannot invoke it again from that draft. Placement remains a starting-point suggestion and does not count as a lesson or final challenge.

The shared `GuidedGame` edit callback now supports returning an accepted canonical draft or rejecting with `null`. Existing `void` callbacks retain their behavior. The placement adapter uses this contract so rejected stale answers cannot produce optimistic success feedback or schedule continuation.

## Verification

`tests/yo/yopratiqoOnboardingResume.test.tsx` renders both real welcome components. It covers all eight languages, interface-language reloads, partial input, actual checked placement results, sticky help, stale tabs/finishes, deliberate restart, profile/reset/content boundaries, storage failure and recovery, malformed/future documents, and initial keyboard focus after the loading state. Every case rejects provider requests and audio startup and checks the learning-evidence boundary.

`tests/yo/yopratiqoOnboardingResume.browser.py` starts from blank profiles and drives Italian at 320 px and English at 393 px in two real tabs. It delays notifications to model a suspended tab, reloads in French/Spanish, checks first-answer preservation, rejects a stale finish, and restarts through visible controls. It also checks first-heading focus, horizontal overflow, and absence of provider calls, microphone/device speech, audio playback or outcome writes. The existing onboarding workflow runs these scenarios in Chromium and macOS WebKit and retains screenshots. Local renderer checks are independent of that browser gate.
