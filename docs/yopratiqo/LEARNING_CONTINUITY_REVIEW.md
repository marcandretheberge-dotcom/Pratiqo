# YoPratiqo learning continuity review

Date: 2026-11-05  
Baseline: PR #429, `0a5734587512f83fcf1be14be58d692608bd6d67`  
Review: [PR #430](https://github.com/marcandretheberge-dotcom/Pratiqo/pull/430)  
Branch: `fix/yopratiqo-learning-continuity-20261105`

## Learner behavior

### Quebec French lesson 3

The mobile and desktop renderers share one mounted-lesson draft. Changing the layout preserves the current step, choices and feedback, each quiz question's answer, good/avoid responses, and flashcard position and face. Question IDs separate quiz answers even when questions reuse option IDs such as `a` and `b`.

The draft lives in React memory within `YoLessonDraftProvider`. It survives switching or remounting a renderer inside that provider. A new lesson mount starts fresh. Controls used outside the provider keep local state. No backend or browser-storage format changes are involved.

### Italian course companion

The course uses the new inline presentation for Yoppo. The unit player reserves room at the top of its lesson rail; assessment help precedes questions; dashboard help precedes its tabs. Expanded help and the restore control occupy normal document flow. The unit rail remains sticky on desktop and stacks above learning controls on mobile.

Progressive hints, explanation/example audio, assisted-answer marking, retry, targeted review, the optional challenge, hide/restore and keyboard focus behavior remain available. Existing callers that omit the presentation prop retain floating behavior.

### Optional vocabulary breaks

`CourseBonus` uses the existing shared `BreakSession` policy: three answered questions or 180,000 milliseconds with the document visible. A return invitation appears after the learner acknowledges the answer explanation. It never cuts off an unanswered question or its feedback. Invitation time and hidden-tab time do not count as active play.

The learner may return at any time or choose one more question after an invitation. The extra question receives feedback before return is offered again. Audio stops on entry, on the explicit explanation boundary, and on close. Close and Escape run once, including rapid repeated input.

The underlying lesson remains mounted. Workshop text, selection and checklist, practice/assessment choices, and lesson position survive the break. Return restores an available opener and scroll position while respecting a caller's deliberate focus on the lesson heading. The break does not write mastery, lesson results, course progress or credits.

## Validation

Local exact-source checks passed:

- `npm run test:yo-continuity`: 63 checks (5 French draft, 21 companion, 23 course-break, 14 shared companion/audio).
- Existing Italian course-player suite: 32 checks.
- TypeScript on the hydrated source graph: passed.
- ESLint on changed TypeScript files: zero errors; ten existing warnings.
- `git diff --check`: passed.
- Independent read-only reviews of the draft synchronization and break state/focus logic found no blockers.

The full checkout passed TypeScript, the continuity suite, the Italian/German/Portuguese regression suites, and `test:launch-critical` in [the initial review run](https://github.com/marcandretheberge-dotcom/Pratiqo/actions/runs/42056693194). Its browser stage stopped on a harness-only route import error. The harness now copies the exact route source bytes; both routes compiled successfully in an HTTP smoke check. Application and regression-test files did not change for that repair.

The [corrected review run](https://github.com/marcandretheberge-dotcom/Pratiqo/actions/runs/42057940968) passed in full at commit `1628221c2b930380ac1c185f731ddd6f31d16ff2`, including the same full-checkout checks and real Chromium interaction/layout checks:

| Flow | Result |
| --- | --- |
| French desktop → 390 px mobile → desktop | Answer, feedback and current step preserved |
| French Yoppo open/return | Selected answer and feedback preserved |
| Italian 320, 390 and 1280 px | No horizontal page/coach overflow or overlap with lesson prose |
| Italian at each width: closed, open, scrolled, hidden/restore, reopened | 15 geometry states passed; controls remained reachable |
| Italian expanded help | Mobile content pushed down, panel scroll and final action reachable, lesson prose receives pointer hits |
| Italian restore | Help heading receives keyboard focus |
| Browser runtime | No uncaught page errors |

The browser harness used exact route-source copies, the real components/styles/assets and a minimal root layout, without backend services. The [review artifact](https://github.com/marcandretheberge-dotcom/Pratiqo/actions/runs/42057940968/artifacts/13429269485) contains screenshots, geometry and the server log; its configured retention is seven days. Representative French/mobile and Italian narrow/desktop captures were visually inspected.

The Vercel preview build also passed, and the deployed Italian unit was opened and visually inspected with expanded Yoppo help beside the lesson content. This separately checks the complete application layout. The temporary browser harness and branch-only workflow are removed in the final cleanup commit; the fourteen application/package/test file blobs remain identical to the tested commit. The cleanup changes only this report and the temporary review files.

## Review flows

1. In French lesson 3, select an answer, change between desktop and narrow widths, and confirm the step, selected answer and feedback remain. Change the answer and resize back. Navigate quiz questions with repeated option IDs and confirm each restores its own selection.
2. In Italian unit 1, open, scroll, hide and restore Yoppo at narrow and desktop widths. Learning text and navigation should remain reachable. Check the assessment and dashboard placements as well.
3. Start an optional vocabulary break from an unfinished practice or workshop. Complete three questions, acknowledge the last explanation, and return. Repeat with one extra question and Escape. Confirm the original work and keyboard focus are retained.

## Follow-up scope

This increment continues the learning-quality work in `COURSE_UNIFICATION.md`. Commercial passes, referral/monthly grants, credit integration, gifts, account synchronization, additional authored courses and the native-wrapper release remain separate work. This PR does not define commercial amounts or publish a production release.
