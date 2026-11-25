# YoPratiqo learning journey

## Scope and analysis

Base: `fe30b12cab49bcdfe9862647b8056d66942e1bbf` (SEO PR #426).
Branch: `feat/yopratiqo-learning-journey`, isolated worktree `yo-journey`.

The supplied pedagogical document is a set of recommendations, not an audit of
this application. Inspection found observable lesson goals, worked examples,
recall cards, checked games, progressive Yoppo help, separate assisted and
independent scores, local persistence, and scheduled review already implemented.
These are retained. No new scoring, storage, analytics or reward system is added.

The missing connection was between evidence and navigation: dashboards exposed
every unit at once and completing a checkpoint led back to a catalogue rather
than explicitly opening the next step.

This is one complete pilot on the existing shared Italian/German/Brazilian
Portuguese engine. Japanese and Mandarin have different progress models; their
players and saved data are deliberately unchanged. Other introductions and the
Dominican Republic course are unchanged. This is not a claim that every language
now uses the new path.

## Delivered behavior

- An ordered visual path shows each unit's actual objectives and existing photos.
- Yoppo marks the current step. Passing its checkpoint opens the next step and
  presents an explicit onward action. Returning to the map positions Yoppo at
  the next incomplete step; unfinished lesson/activity resume is preserved.
- The existing catalog threshold (80%) and best **independent** checkpoint score
  determine completion. Assisted success, viewing pages, self-reported writing,
  and accumulated practice do not themselves pass a checkpoint.
- Experienced learners can attempt the currently open checkpoint without having
  to click through every practice item. No timer, lives, lost streak, currency or
  artificial waiting period is introduced.
- Locked steps show their goals but no dead enter button. Direct unit and final
  URLs use the same policy, after local progress hydration. A blocked URL cannot
  write a resume entry that unlocks itself.
- Already started units and previously attempted final assessments remain
  accessible. Passing a later legacy unit opens its successor without inventing
  passes for earlier units. Replaying unsuccessfully does not revoke past passes.
- An explicit reset retains its existing meaning. Local storage denial is
  reported, not represented as durable saving.
- Existing reviews, lessons, audio, self-assessed speaking/writing, sources,
  cultural finals and FR/EN/ES navigation are preserved. Cumulative assessments
  open after the relevant unit checkpoints; existing attempts remain replayable.

## What the evidence does and does not mean

The UI says "checkpoint passed without help", not "mastered". Activity success,
independent answers, and checkpoint completion remain different quantities.
Free conversation and writing are not automatically certified. Existing review
intervals are retained; they are not proof of later retention. No new delayed
transfer assessment, memory model, AI evaluation or scientific efficacy claim is
introduced. Some checkpoint items reuse practiced material: fresh-context item
variants and measured delayed retention are a separate pedagogical follow-up.

This is a personal, locally stored learning path, not a security/paywall or an
accredited assessment. Editing local storage is not prevented or misrepresented
as tamper-proof scoring. Progress does not become cross-device sync or an offline
download merely because it is saved locally.

## Files

- `lib/yo/courseJourney.ts`: pure shared access/current-step/evidence policy.
- `components/yo/journey/CourseJourney.tsx`: path, access state and onward action.
- `components/yo/journey/journeyCopy.ts`: FR/EN/ES journey language.
- Italian dashboard/unit/assessment/player: path, guarded resume, result action;
  shorter existing dashboard header brings the journey closer to the first view.
- German dashboard/unit/final/assessment: same policy and UI; Portuguese inherits
  it through the existing CourseExperience provider, without new language forks.
- `tests/yo/yopratiqoCourseJourney.test.ts`: policy, migration-free compatibility,
  boundary, storage denial, localized DOM, direct-link and real-handler tests.
- Existing Italian/German/Portuguese player tests: update the explicitly changed
  initial access expectation; prepare actual passed-unit fixtures when testing
  later content. Audio, feedback, persistence and reset assertions remain.
- `package.json`: focused `test:yo-journey` command. No dependency/lockfile change.

## Validation

Evidence is recorded in `../yo-journey-preview/`, outside Git.

| Command | Final result |
| --- | --- |
| `npm ci --ignore-scripts --no-audit --no-fund` | PASS, 605 locked packages; first sandbox invocation failed in npm, retried successfully with registry access |
| `npm run test:yo-journey` | PASS, 14/14 policy and DOM checks |
| `npm run test:yo-italian-course` | PASS, full course/content/progress/player/audio/navigation/culture suite |
| `node --import tsx tests/yo/yopratiqoItalianCoursePlayer.test.ts` | PASS again after compact header change, 31/31 |
| `npm run test:yo-german` | PASS, content/player/audio suites; 14 interaction cases |
| `npm run test:yo-portuguese` | PASS, content and player suites; 10 interaction cases |
| `npm run test:launch-critical` | PASS, exit 0 |
| `npx tsc --noEmit` | PASS, exit 0 |
| `npm run lint -- --quiet` | PASS, exit 0; repeated after final edits |
| `npx tsx scripts/validate_i18n.ts` | PASS, 3562 existing dictionary keys per locale; new journey FR/EN/ES copy additionally exercised by DOM tests |
| `node ../yo-journey-preview/app.cjs build` | PASS, normal Next production build with isolated local env, TypeScript and 353 generated pages |
| `git diff --check` | PASS |

The build still reports the repository's existing ignored experimental
`forceSwcTransforms` option; no compiler or lint check was disabled.

### Browser evidence (compiled application)

Local preview: `http://127.0.0.1:55660/yo/langues/allemand/parcours?lang=fr`.
Italian and Brazilian Portuguese use the same origin and their existing slugs.

- Nine layout checks: all three dashboards at 320, 390 and 1280 px, zero horizontal
  overflow and zero broken loaded images. Existing photos and companion assets
  inspected visually on desktop and mobile. `browser-qa.json` records results.
- Full six-question German unit-1 checkpoint completed through the real UI,
  including three actual bundled audio playback starts (no transcript/help).
  Result: 6/6, next-unit link visible, unit 2 accessible after reload, map shows
  1/8 checkpoints and Yoppo at unit 2 with only two unlocked units.
- A direct fresh Portuguese unit-2 URL shows the locked-step explanation. Back
  to the map still shows only unit 1 unlocked: navigation did not fabricate work.
- Screenshots: `journey-mobile.png`, `journey-desktop.png`, `unlock-mobile.png`.
- Browser warning/error log empty on the inspected compiled pages.
- HTTP smoke: the three course dashboards return 200, contain the journey in
  server HTML, and retain their existing `noindex, nofollow` directives. The
  public SEO presentation pages, sitemap and access/privacy rules are untouched.
- No physical iPhone/Safari test, acoustic assessment of every recording, delayed
  learner study or production validation is claimed. Browser answers were QA
  fixture knowledge, not evidence that a human learned German.

Initial verdict: READY FOR LOCAL PRODUCT REVIEW. The subsequent user request
authorizes delivery through the normal pull request, checks and squash merge.

The first build compiled but failed prerendering the sitemap because the new
local gateway had not been started. This was a local harness dependency, not
converted into an empty sitemap or bypassed. The corrected run uses the existing
synthetic Supabase stack via loopback only. No production backend, migration,
account creation, payment, notification or credential change is involved.

## Rollback and review

Release preparation (2026-11-04): origin/main remains at the exact tested base
`fe30b12cab49bcdfe9862647b8056d66942e1bbf`; no application source changed after
the validation above. Vercel's current Production deployment is
`7qFMAGaKa5EyFNckUzTTkECMjyUn`, READY, serving that commit. Retain it as the
rollback reference. Delivery must build from Git with Vercel's Production
configuration, not promote the locally built synthetic-backend artifact.
Remote checks and production verification are recorded in the release report;
this preparation does not itself claim that the new commit is deployed.

An application-only rollback restores the old dashboards;
the progress format and keys are unchanged, so recorded answers and checkpoint
results remain usable. No data migration or data rollback is required.
