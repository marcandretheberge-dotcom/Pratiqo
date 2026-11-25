# Tap-to-check practice and meaningful vocabulary preparation

Base: production 9b9c0fff7701b3daa7ef080f406820ba1bb64d7e. Changes are on the isolated `feat/yo-tap-flow-20261108` branch until review; no production or Expo publication is implied.

## Learner interaction
A tap on a single answer is the submission. Correct answers receive green styling, a checkmark, a status announcement and the existing soft-wood confirmation. A new correct answer arms automatic progression after a 1.2-second pause. Active pronunciation and open notebooks/tools pause the transition; the single queued wood cue can wait up to 15 seconds for speech (navigation and cancellation still discard it); unmount, changing question and a hidden tab cancel the scheduled callback. A restored checked draft never replays sound or starts a timer. A short input guard rejects double-clicks and trailing taps across transitions.

Incorrect practice answers stay on the question with red styling and an error icon. Another answer can be tapped directly. Retried answers retain their helped status. Incorrect assessment answers remain the original scored outcome and require an explicit Continue after reviewing feedback; they cannot be retried into a correct first attempt. Sentence construction retains one deliberate submission. Reading/explanations, mission entry and completion screens remain manual. Italian matching advances only after the entire set; dialogue advances between correctly answered turns.

`Automatic next question` can be turned off independently of audio. The preference is local (`yo.practice.auto-next.v1`); existing mute and vibration settings are untouched. `Stay here` or opening a correct-answer explanation cancels the current automatic transition. A brief explanation of tap-to-check appears before initial vocabulary practice.

## Vocabulary design
The first-meeting introductions do not have suitable concrete-object content for image recognition. They now teach expressions, then use audio-to-meaning choices and audio-to-number choices for age. Names, origins, nationalities and feelings are not tested through portraits, flags, facial expressions or written labels on pictures. No unrelated objects were added merely to fill a four-image screen.

Shared preparation revisits some targets between other questions, with changing sets of three distractor/answer choices. Italian preparation uses a spaced recall queue and varied meaning/number alternatives. The old two rounds of the same labelled picture sets are no longer rendered. The complete translated banks remain available before practice.

The image-question boundary now accepts only four distinct registered object artworks, with no visible labels, captions or details. Existing artwork is retained, not silently replaced or deleted. Only the current coffee asset is classified as an object; there is deliberately no new four-object bank until suitable approved object illustrations and relevant teaching content exist. This change does not claim to add that bank or redesign every older legacy course.

## Saved progress
Shared step IDs and positions stay stable. The parser upgrades v1 state to v2, preserving profiles, pace, completed exercises, final answers and best scores. Only an unfinished obsolete picture answer is reset. Italian uses a separate v2 preparation-draft key and reads a valid legacy completed preparation as completed. Existing legacy storage is not deleted; canonical Italian progress, points, assessments and stamps are unchanged. Reading a new introduction or changing the question format does not award additional learning points.

No server schema, authentication, teacher sharing, payments, credits, Pass consumption, audio generation or Expo binary changes. Existing device-voice limitations remain. No new paid API use.

## Verification
Run `tests/yo/yopratiqoTapFlow.test.tsx` for timer, retry, scoring, interruption, restore and migration cases. The updated shared/Italian rendered-player tests preserve whole-course scoring and legacy-storage assertions while exercising immediate checking. `yopratiqoTapFlow.browser.py` exercises actual route components on Chromium/WebKit. Audio/speech fixtures are opt-in only for isolated CI, never evidence of real pronunciation quality. The route review shell now loads the real global stylesheet, including dark-mode tokens and the published notebook contrast fix.

Implementation references: React effect setup/cleanup (https://react.dev/reference/react/useEffect); predictable input changes (https://www.w3.org/WAI/WCAG22/Understanding/on-input.html); programmatic status feedback (https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html). This is not a claim of a complete accessibility audit or physical-device approval.
