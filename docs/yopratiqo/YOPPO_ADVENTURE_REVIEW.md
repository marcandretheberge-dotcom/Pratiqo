# Yoppo adventure: reviewable learning presentation

Date: 2026-11-05. Worktree: `yo-course-quality`; branch:
`codex/yo-course-quality-foundation` (existing draft PR #429).
This work has not been published, merged or deployed. Other worktrees are unchanged.

Release follow-up: the user authorized web deployment on 2026-11-05. The
implementation/validation ledger below predates that authorization. The web
increment may ship after final GitHub/Vercel checks and the public audio audit;
this does not authorize or claim completion of the remaining monetization,
account-sync or native-store work. The previous production deployment and the
non-overwriting publication of the 28 Italian media objects are recorded in
`COURSE_UNIFICATION.md`. No local sandbox configuration enters the release.

## Scope and evidence

This is the shared adventure presentation for Phase 5, built on the existing
course progress and navigation. It is not the pass/credit/gift ledger described
in the accompanying Phase 2-4 request. No new access rights, purchase prices,
payment actions, referrals or rewards with monetary value are introduced.

| Existing course | Evidence used | Adventure presentation |
| --- | --- | --- |
| Italian | Existing independent unit assessments, independent activities, separate final | Arcades, growing gardens, checkpoint/mastery/final milestones |
| German | Same course engine, its own catalog and stored progress | Riverside-house scenery, identical states |
| Brazilian Portuguese | Same engine, separate language/progress key | Coastal scenery, identical states |
| Japanese | Checked independent practice including roleplay, separate final | Garden/pavilion scenery, identical states |
| Mandarin | Checked independent exercises, separate final | Garden/pavilion scenery, identical states |
| French Quebec | Existing introduction exploration bookmarks | Town scenery, exploration only |
| English | Existing introduction exploration bookmarks | Garden/town scenery, exploration only |
| Spanish | Existing introduction exploration bookmarks | Arcade scenery, exploration only |

French, English and Spanish introduction visits are **not** graded mastery.
Their existing exploration map explicitly retains that distinction. The existing
Dominican paid/content gates are not changed by the visual theme.

## State and reward contract

- Locked: existing pedagogical navigation says the unit is not yet reachable.
- Available: reachable, with no recorded start yet.
- In progress: existing evidence of a start or attempt.
- Completed: all checked practice activities completed, possibly with help; the
  independent unit challenge is still pending.
- Mastered challenge: the existing independent assessment threshold is met.
  This is mastery of the checked challenge, not conversational fluency, a
  certificate or proof of long-term retention. Copy states this explicitly.
- Halfway: at least `ceil(activity count / 2)` independently successful activities.
  Neither viewing pages, self-report checkboxes nor culture trivia qualify.
- Finale: all unit challenges **and** the actual language final are successful.
  The cultural finale cannot satisfy this condition. The next link offers the
  real language catalog, not an invented advanced course.

Milestones are deterministic projections of the existing saved results, not a
second mutable award ledger. Existing best results, parse/merge rules, retry
behavior, navigation gates and identifiers are retained. A failed later retry
does not revoke a previous success or charge a pass.

Only a local evaluated result saved successfully can request an automatic
celebration. Hydration and incoming stored progress update visible trophies
silently. Replays change presentation only. Explicit resets remain governed by
the existing course UI; no reset or production-data action is performed here.

If an unseen cross-tab write is merged during the same local action, automatic
celebration is conservatively withheld for that action. The earned milestones
remain visible and replayable. This prevents attributing a remote success to a
failed local attempt. A subsequent local success celebrates normally.

## Art, audio and accessibility

Original small SVG game scenes use existing Yoppo artwork. Open gates, lit
windows and blooming plants are driven by the named destination states. No
Nintendo assets, recognizable game landmarks, melodies or character designs
are used. There are no looping particles or flashes.

Original bounded Web Audio cues share one synthesis implementation with the
existing `YoAudioFeedbackProvider`. The existing `yopratiqo.audio.muted` preference
is reused. Effects are separate from learner-operated speech/recording controls.
No paid service, runtime TTS or external media generation is needed for cues.
Recorded audio and effects cancel one another through the existing stop events;
Mandarin is included. Hidden pages and navigation tear-down stop pending cues.
Unsupported/blocked audio leaves the visual feedback and a readable notice.

Animation honors `prefers-reduced-motion`. Restoring an already-open destination
does not replay its gate animation. Controls are at least 44 CSS pixels, scenes
are decorative to assistive technology, and state/goal labels remain textual.
The native dialog traps focus; each queued scene and voluntary replay restores
focus to its own controls. Escape closes the queue. Continuing or skipping stops
the sound; closing restores the prior focused control where still present.

## Corrections found during verification

- Initial CSS-module imports were incompatible with the existing direct `tsx`
  component-test runner. Namespaced styles now live in a small shared TS module;
  the build/test configurations were not weakened.
- Browser QA demonstrated focus leaving the dialog between mastery and unlock.
  Focus is now restored for each replacement scene; regression assertions cover
  both replay and the queued next destination.
- The Japanese progress tests exposed a Node/browser Event realm mismatch. The
  saved-result event now uses `window.Event`; a different-host-Event regression
  checks that dispatch does not interrupt a saved result.
- The Italian player test assumed zero checkboxes outside oral self-checks.
  It now identifies the localized sound-effects checkbox separately, asserts it
  starts muted, and retains the exact assertions for all learning checkboxes.
- Arrival audio now obeys the shared stop event. Recorded lesson audio and
  celebration effects use the same interruption contract.

## Validation ledger

Executed in this phase:

- `npm run test:yo-journey`: PASS on the final implementation, 14 shared-course +
  17 all-language + 19 adventure checks. The adventure suite is now included in
  this existing command rather than requiring an operator to remember it.
- `npm run test:yo-adventure`: PASS, 19 checks on the final implementation.
  Includes five states, halfway boundary, assisted/trivia exclusion, final gate,
  legacy/merge/retry idempotence, real save handler, failed storage, reload/sync,
  voluntary replay, eight themes, FR/EN/ES, motion rules, sound scheduling/cancel.
- `node --import tsx tests/yo/yopratiqoItalianCoursePlayer.test.ts`: PASS, 31 checks.
- `node --import tsx tests/yo/yopratiqoJapaneseCourseProgress.test.ts`: PASS, 21
  checks after the Event-realm correction.
- `npm run test:yo-arrival-listening`: PASS, data checks + 20 rendered cases.
- `node --import tsx tests/yo/yopratiqoSharedCompanionAudio.test.tsx`: PASS.
- `npx tsx scripts/validate_i18n.ts`: PASS, 3562 dictionary keys per locale.
- `npm run test:yo-italian-course`: PASS on the final implementation, including
  content, progress, all 31 player assertions, audio, navigation and culture.
- `npm run lint`: PASS at the complete integration checkpoint. Targeted ESLint
  was rerun on every subsequently changed source: exit 0, no errors, four hook
  warnings (ref updates/hydration). These warnings remain visible; no lint
  configuration or suppression was added.
- `npx tsc --noEmit`: PASS after the final production build, exit 0.
- `node app.cjs build` from the external isolated harness: PASS, exit 0.
  This invokes the project's normal production build with local-only backend
  configuration. Next 16.2.9 compiled and typechecked successfully and generated
  353 pages. The existing unsupported `experimental.forceSwcTransforms`
  Turbopack warning remains; it was not hidden or changed.
- `npm run test:launch-critical`: PASS, exit 0 on the final application sources.
- `git diff --check`: PASS.

Definitive logs are outside git in `../yo-course-quality-preview/`:
`adventure-build-verified.log`, `adventure-types-verified.log`,
`adventure-launch-reviewed.log`, `adventure-journey-verified.log`,
`adventure-italian-verified.log`, `adventure-lint-verified.log`, and
`adventure-i18n.log`. Earlier interrupted builds are not counted as passes.
The initial launch-critical failure at the scope allowlist was repaired with
exact reviewed presentation files, preserving its AST guard; a subsequent
Japanese Event failure was fixed in implementation, not by disabling its tests.

### Real-browser evidence

Local production-build preview: `http://127.0.0.1:55680`, local Supabase only.
No account creation, entitlement grant, payment, production write or storage
injection was performed. Test progression came from the actual UI.

- Italian unit 2: ten independently correct activities through matching,
  sentence construction, reading and written recall produced the halfway scene
  at exactly 10/19. Skipped listening exercises did not create successful results.
- Reload during that celebration preserved 10/19 and the two visible milestones,
  kept sound-effects preference, and did not repeat the celebration.
- The real unit assessment saved 4/5 (80%, its unchanged threshold). The skipped
  listening answer remained unsuccessful. Mastery then queued the unit 3 unlock;
  replaying mastery preserved the pending unlock and did not award another trophy.
- A real recorded-audio button entered its playing state. Effect playback returned
  `data-effect-state=played` after explicit enabling/replay and after saved success.
  This is browser playback evidence, not a human pronunciation/listening review.
- Desktop 1265px and mobile 390x844: scenes and dialogs rendered without horizontal
  overflow. The mobile dialog was readable with skippable controls. Native iOS and
  Android performance are not inferred from these desktop-browser viewport checks.
- Final-build unit 3 assessment: 4/5 independently correct through the real UI.
  The mastery scene, its replay, and the next unit 4 unlock all kept keyboard focus
  inside the dialog. Escape dismissed the queue. Reloading the map restored three
  mastered units, unit 4 available and four persistent milestones, without a dialog.
- Final-build mobile navigation: Japanese, German, Brazilian Portuguese and
  Mandarin each rendered eight destinations, no broken images, no open automatic
  dialog and no horizontal overflow. English, Quebec French and Spanish maps
  rendered their own themes and explicitly described visited steps as exploration,
  not verified skills. No browser warning/error was captured in these checks.

Screenshots outside git in `../yo-course-quality-preview/`:
`adventure-desktop-mastery.png`, `adventure-mobile-checkpoint.png`,
`adventure-mobile-mastery.png`, `adventure-mobile-unlock.png`,
`adventure-mobile-final-unlock.png`, `adventure-mobile-final-map.png`,
`adventure-desktop-final-map.png`.

### Existing companion and mobile integration

The contextual companion, trivia breaks and return invitations already live in
`components/yo/companion/YoppoLearningCompanion.tsx`, `DeckYoppoCoach.tsx` and
`lib/yo/companion/breakPolicy.ts`. This phase reuses them rather than creating a
second timer, currency or assistant. Break completion does not grant mastery.

Read-only inspection of the separate PR417 worktree confirms that `apps/mobile`
is the maintained Expo shell and the Next.js pages remain its learning UI.
Its isolated mode requires HTTPS and `/__sandbox/mobile-config`, blocks digital
checkout and uses no production fallback. That worktree was not modified. This
loopback preview has neither a new tunnel nor an attestation for that shell, so
it is not an installable iPhone/Android test and no native build was launched.

### Files in this phase

- Shared model/sound: `lib/yo/adventure.ts`, `lib/yo/adventureSound.ts`,
  `lib/yo/audio/stopLessonAudio.ts`, `lib/yo/courseJourney.ts`.
- Shared presentation: `components/yo/journey/AdventureProgress.tsx`,
  `AdventureScenery.tsx`, `adventureStyles.ts`, `CourseJourney.tsx`,
  `ExplorationJourneyMap.tsx` in the same directory.
- Shared integration: `components/yo/YoLessonDeck.tsx`,
  `components/yo/YoAudioFeedbackProvider.tsx`, `components/yo/YoArrivalListeningLesson.tsx`.
- Italian course directory: `CourseAssessmentPlayer.tsx`,
  `ItalianCourseAssessment.tsx`, `ItalianCourseUnit.tsx`, `useItalianCourseProgress.ts`.
- German/Brazil shared course directory: `GermanCourseFinal.tsx`, `GermanCourseUnit.tsx`.
- Japanese directory: `JapaneseCourseHome.tsx`, `JapaneseCoursePlayer.tsx`,
  `useJapaneseCourseProgress.ts`.
- Mandarin directory: `MandarinCourseHome.tsx`, `MandarinCoursePlayer.tsx`,
  `useMandarinProgress.ts`.
- Tests/config: `tests/yo/yopratiqoAdventure.test.tsx`,
  `tests/yo/yopratiqoItalianCoursePlayer.test.ts`,
  `tests/helpers/italianLearningScope.ts`, `package.json`, and this report.

## Known remaining delivery work

1. Existing full-course progress is local-device progress. This change does not
   pretend that account-backed cross-device synchronization already exists.
   A new device can recognise imported results without automatically replaying
   celebrations, but automatic account synchronization still needs implementation.
2. The three introductory courses do not yet provide the same full assessed
   module structure as the five complete courses. They must gain real evaluated
   missions before the same mastery treatment can be enabled there.
3. The existing Italian end-of-unit assessment remains the practical challenge;
   a new branching conversational boss engine has not been fabricated or substituted
   for its validated questions. Helpful retries and current assessment rules remain.
4. Passes, monthly/referral grants, credit integration, purchases and gifts from
   Phases 2-3 remain separate unfinished work. No new financial model is activated.
5. Native iOS/Android packaging, physical-device sound/interruption/performance,
   offline synchronization and store-compliance checks remain unverified. Responsive
   browser testing must not be represented as an installed-app test.

The Phase 2-3 gap is concrete: the current premium configuration is fail-closed;
the hosted checkout link explicitly does not grant an entitlement on its own.
There is no implemented Yoppo pass/gift ledger in this branch. Existing monetary
credits (`lib/credits.ts`) are not learning passes and were not repurposed.
The accompanying multi-phase request is therefore not complete. In particular,
no concurrency, refund, gift-redemption or store-purchase result is claimed here.

Verdict: **web adventure prototype ready for review; full multi-phase delivery
and final store-release testing remain incomplete.** Keep draft/review gating in
place. No commit, push, merge, production deployment, purchase, migration or store
submission was performed in this phase.

## Rollback

Remove the presentation/adapters in this diff or restore the previous application
version. Existing course records and their schema are unchanged; no database
migration, entitlement repair, purchase adjustment or progress deletion is needed.
The mute preference retains its existing key and meaning.
