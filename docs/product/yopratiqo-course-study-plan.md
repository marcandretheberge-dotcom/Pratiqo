# Course goal and pace continuity

The full-course map now retains the learner's chosen goal and weekly pace from
the introduction. The seven shared course homes display two short lines beside
the selected unit's existing authored objective and Continue action. Italian's
personalized map uses the same guidance with its already loaded profile. The
legacy Italian dashboard uses its saved Italian preferences.

This is a suggested way to practise the current lesson, not a changed curriculum,
new exercise bank, proficiency assessment or scheduled obligation. A zero-minute
choice stays at the learner's own pace. Positive choices retain the existing
weekly-rhythm calculation and are labelled as suggestions.

The new reader retrieves only the matching language's bounded preference fields.
It neither writes nor migrates history, and respects newer introduction reset
markers. Regional language aliases resolve to the existing exact storage keys.
Missing, malformed or unavailable preferences simply omit the two lines. Changes
in another tab, returning to the page and deletion refresh the guidance.

Navigation remains owned by the course. No button, resume writer, assessment
writer or access decision is added. Existing lesson/activity queries, Italian
placement behavior and Japanese/Mandarin unfinished-final links are unchanged.
The introductory continuation descriptions now state twelve units/modules for
German, Brazilian Portuguese, Japanese and Mandarin, matching the deployed
catalogs instead of their previous eight-unit scope.

Focused verification: `tests/yo/yopratiqoCourseStudyPlan.test.tsx` uses all eight
actual preference sources and the real shared map, and covers aliases, invalid
data, reset ordering, three interface locales, own pace, in-memory Italian
preferences, language changes, external updates/deletion, no storage mutation,
and the preserved unique Continue target. The existing continuation test checks
the twelve-unit copy. The existing EN/ES/Québec mobile browser gate now restores
only a goal/pace profile, checks its two visible lines and unchanged course store,
captures its layout at 393px/320px, and retains the single exact Continue target
before performing all existing real checkpoint and draft-restoration cases.
Real-browser execution and release checks remain separate gates.
