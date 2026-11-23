# Offline scenarios

Bologna is optional practice alongside the main Bologna mission in the Italian
course map. It neither consumes a Pass nor awards course stamps or public XP.
Completing it unlocks a different ticket at the next device-local midnight.
Rehearsal uses a third ticket and does not record a next-day attempt. Progress
is local to this browser, not an account credential or evidence of course mastery.

The learner can reopen the downloaded scenario even without the course map:
bookmark the mission URL or add it to the Home Screen, open it there once online,
and wait for offline readiness. The map itself is not part of this download.
The two recordings are existing Italian course tracks, not generated on demand.
The scoped worker downloads only the pack's allowlist and supports audio byte ranges.

## A pipeline for all eight languages

Use existing course language, images and verified audio. Give each scenario a
decision with a consequence and change a meaningful detail the next day. Do
not turn translation of the Bologna screen into seven imitations of Italy.

| Language | Proposed practice and transfer | Existing source to start with |
| --- | --- | --- |
| Italian | Find the train and change platforms; return with a different ticket. | Bologna pack and Italian A1 course audio |
| Spanish | Check in at a Dominican hotel; handle a different receptionist's follow-up. | dominicanRepublicHotelAirport, dominicanArrivalListening |
| Québec French | Meet a colleague on day one; respond to a different team lead the next day. | frQuebecWorkplaceSurvivalModule |
| English | Order before work; adapt the order when the barista asks a follow-up. | englishIntro |
| Japanese | Meet Aya at a workshop; introduce yourself to a new partner without the guide. | japaneseCourse, module 1 |
| German | Introduce yourself and ask the speaker to slow down; recognise a different reply. | german/courseScenarios |
| Brazilian Portuguese | Order a coffee; change the order at a different counter. | portuguese/courseScenarios |
| Mandarin | Choose an item on a menu; ask for water with a different order. | mandarin/course, menuExercise |

Only reviewed, playable entries go in lib/yo/scenarios/catalog.ts. For each new
entry, review the actual recordings and the language, test hints vs independent
recall, and test offline resume on a phone. A second setting at the same level
should change the task (for example, directions vs ordering), not merely the names.

## Release and rollback

The normal npm dev/build hooks bundle the HTML, artwork and narrowly scoped
worker from tools/italy-by-train into public/practice/it/bologna. No API key,
live database or audio generation is needed to build. At first download, the
audio handler reads only two allowlisted public recordings from the configured
course storage. Missing recordings prevent the offline-ready indicator.

Run npm run test:yo-scenarios. With the built app running against the isolated
course audio store, set SCENARIO_TEST_ORIGIN and run
node tools/italy-by-train/verify.mjs. For rollback, revert the release through
the ordinary app deployment; there is no database migration. Do not delete
device-local progress or downloaded packs.
