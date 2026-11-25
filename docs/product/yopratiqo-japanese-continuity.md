# Japanese activity continuity

## Scope

The existing twelve Japanese modules and both finals use a separate local activity draft store. Each module keeps its authored activity IDs, current answer, displayed help, checked result, and explicit attempt generation. Typed answers retain the input's existing 100-character limit. Token arrangements and matching choices are restricted to the current authored activity.

The original `yopratiqo:japanese-foundations:v1` result ledger, grade aggregation, course cursor and access rules remain compatible. Historical success is not reinterpreted. Draft restoration does not grade an answer, append SRS evidence, award progress, play sound or count listening.

## Interruption and concurrency

- Hint, transcript and revealing rōmaji assistance remain attached to the current attempt when the learner changes steps, hides the aid, changes interface language or reloads.
- A checked answer reopens as checked. Only the explicit **Try again** action starts a fresh attempt with an empty answer and clears that attempt's assistance. The player's visible rōmaji aid is also turned off for that deliberate retry.
- The store merges separate activities from different tabs. Same-activity edits use an ordered local clock; help remains sticky within a run and a completed check cannot be overwritten by an unfinished edit.
- Before accepting Check, the player rereads current storage and compares the rendered answer and attempt identity with the current draft. If another tab has edited or restarted it, the latest draft is displayed and the learner must check it again. No old Boolean grade is applied to a newer answer.
- A content revision clears current drafts for that module while preserving historical outcomes. An already-open page for the older revision is invalidated and offers a native reload button.
- Removing course progress invalidates open attempts via a separate local session marker. A delayed removal event reads the current storage value; it cannot erase a newer write. Removing a module's draft key also prevents an old tab from restoring that deleted draft. Events from sessionStorage are ignored.

This is browser-local continuity, not an account backup or a server-authoritative grade. Storage failures display the existing session-only warning. There is no provider request or audio/transcript recording in this store. Free-writing notes, handwriting strokes and ungraded study-lab state remain outside this change.

## Recorded audio

The Japanese audio button now derives availability from its existing phrase registry and public URL configuration before a click. An unknown phrase or missing configuration has a disabled Listen control and an explicit transcript alternative. A mapped URL can still fail at playback; the existing retryable error handles that case. No new recording is claimed or generated.

The media pause handler distinguishes an interruption from the native pause event immediately before ended. Listening still counts only on the existing first `playing` event for a user-started session; neither hydration nor natural completion creates another listening event.

## Verification

The focused store suite covers bounds, authored IDs, multiple modules, two writers, sticky help, checked restoration, explicit restart, deletion, revision and unavailable storage. Real React renderer cases cover interrupted typing, locale change, checked/wrong state, two tabs without a delivered storage event, both stale-answer directions, deletion, revised content and Japanese IME confirmation.

The existing Eastern workflow retains its historical course/data/audio checks and its Chromium plus macOS WebKit matrix. The mobile scenario still seeds only the explicitly documented eight-module historical learner. For Japanese it now creates two real pages in the same browser context, enters two unfinished module-nine drafts through the controls, reveals then hides help, reloads both pages, and verifies that no result or review receipt appears before Check. The existing two real checks then prove aided/unaided distinction and checked restoration without a duplicate result or SRS event. It does not claim completion of twelve modules, an academic level, or listening verification.

Browser execution is a CI release gate. Static validation or local renderer tests are not substitutes for those browser results.
