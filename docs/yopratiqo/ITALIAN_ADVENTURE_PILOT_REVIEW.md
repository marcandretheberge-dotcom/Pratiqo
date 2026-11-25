# Italian adventure pilot — review notes

Date: 2026-11-05

## Scope and review path

This change builds on PR #430 and completes a reference loop in Italian unit `u01`: practice, an optional assessed midpoint, a five-scene final mission, and a replayable victory that reveals the actual second unit. The other eleven Italian units and the other language curricula retain their existing teaching content and mastery rules.

Open `/yo/langues/italien/parcours/u01?lang=fr`. The navigation contains **Halte de mi-parcours** and **Bilan de l’unité**. The latter starts **Première soirée à Bologne**, a fictional five-scene walk with Yoppo. Interface copy is authored in French, English, and Spanish.

## Midpoint

- The optional recap becomes available after 10 of the existing 19 activities have been completed independently. Learners with an existing passed unit can also revisit it.
- Five authored questions revisit greetings, a polite request, listening and spelling/sound patterns from lessons one and two. The new assessment is `it1-u01-midpoint`.
- At least four correct answers out of five without displayed help earn **Halte réussie**. The existing halfway encouragement remains a distinct recognition of practice.
- The recap does not replace the final mission, increase the practice denominator, or unlock unit two. It can be retried without losing a prior independent result.

## Final mission and feedback

The original `it1-u01-quiz`, its five question IDs, answers, accepted written variants, question count, and 80% threshold are preserved. Scene metadata supplies context and outcomes around those existing questions: leaving the café, interpreting Yoppo’s recorded instruction, a word puzzle, asking a host to repeat, and saying goodnight.

Each checked answer reveals the selected option’s authored feedback and the scene’s success or recovery outcome. Nothing in the scene gives away the listening target or the spelling answer. The first answer remains the scored answer. Hints, transcripts and other help keep their existing assisted semantics. The result distinguishes an independent pass, an assisted completion and an attempt to revisit, with review links and replay controls.

No learner-entered answer is added to persistent storage. Only the existing aggregate assessment fields are saved. The selected choice ID is kept in memory for feedback.

## Victory and sound

An independent pass triggers one original SVG scene: a small paper-stone tower settles into pieces, the path lights up and the next destination appears. It is a fictional game prop, not a depiction of damage to a real landmark.

The destination’s number, title, learning objective and link come from the actual next step in the course. The separate unlock ceremony is consumed only for this pilot presentation; its underlying milestone remains earned. There is no invented second level or A2 curriculum.

Sound effects remain opt-in. An original short WebAudio cue follows the tower, path lights and destination. Enable **Effets sonores**, then use **Rejouer la célébration** to hear it. Continue, Escape, lesson audio, page hiding and navigation interrupt the cue. Reduced-motion users receive the finished scene without animated movement. Replay changes presentation only, not scores, attempts or rewards.

All Italian speech reuses the existing exact recordings. The complete speech registry is unchanged; no new synthesis or external service is required.

## Compatibility

- Existing saved unit results remain valid, including a past unit-one pass with no recorded practice history. Existing success is recognised silently on reload.
- A later failed or assisted attempt cannot remove a previous independent pass.
- The existing version-one progress record and storage key are retained. The catalog validates the new recap’s exact five-question result.
- Incoming or restored progress does not trigger old ceremonies. Explicit reset clears the recap with the rest of course progress.
- This pilot does not introduce account XP, a wallet, passes, gifts, paid access rules, store publishing or new course levels.

## Verification

The complete checkout passed [review run 42112153509](https://github.com/marcandretheberge-dotcom/Pratiqo/actions/runs/42112153509) at `debd6c537aeae8958ccb155c34da673209d3a15e`:

- Full repository TypeScript.
- **46 new pilot checks**: 8 content, 6 midpoint rules, 5 rendered midpoint integration, 11 mission-player, and 16 victory/audio/accessibility checks.
- Existing continuity suite (63 checks), Italian course suite, shared journey suite, German and Portuguese regressions, and launch-critical regressions.
- The browser walkthrough performs ten real practice submissions, a five-question recap, an assisted 80% mission, an independent retry, victory replay/skip, reload and real navigation to unit two. It does not inject progress.
- Native keyboard Tab containment, sound opt-in, reduced-motion static state, and layouts at 320, 390 and 1280 pixels all pass, with no uncaught page errors.

The first browser run exposed a Tab boundary that could leave the native dialog. The application now explicitly wraps Tab and Shift+Tab between visible, enabled controls; the unchanged browser assertion passed on the corrected revision. The sound result is also keyed to the current scene/replay so an old cue cannot describe a new pending replay. Targeted ESLint has no errors and introduces no new warnings; existing hook warnings remain outside this change's corrective scope.

[Browser evidence artifact](https://github.com/marcandretheberge-dotcom/Pratiqo/actions/runs/42112153509/artifacts/13453593183) contains the walkthrough report and screenshots (seven-day retention). The isolated browser harness runs the real route/component sources and CSS with an Arial font fallback. Native HTMLAudio uses a deterministic WAV response for repeatable playback checks; the original WebAudio victory cue is exercised directly. Separate audio-registry tests confirm that every spoken Italian string has its existing exact recording path.

The deployed Vercel preview was also exercised through all five mission scenes using the real recorded listening clip. It displayed the independent result and victory, entered unit two, restored progress silently on reload, and kept eight successive Tab presses inside the corrected dialog. The Vercel preview build succeeded.

Temporary browser/workflow scaffolding is removed in the final review commit. All 23 application, configuration and test files are retained byte-for-byte from the successful tested revision; only these notes and removal of the temporary scaffolding follow that run.

Run the focused regressions locally with `npm run test:yo-italian-pilot`.

The review branch is stacked on `fix/yopratiqo-learning-continuity-20261105`. Production is not part of this review step.
