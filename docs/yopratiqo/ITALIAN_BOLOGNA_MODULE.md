# Italian A1 — Une matinée à Bologne

## Delivery and scope

This is one complete beginner practice module at `/yo/langues/italien/module-1`, with French, English and Spanish interface copy. It extends the existing Italian orientation rather than replacing it. The Italian landing and the introduction's final screen link to it.

The implementation is based on `main` at `9953eb8826454228d100e00efff4acce4659ba8c`. It does not depend on the unmerged Japanese course PR. The recorded-audio generator hardening is shared with that work; no Japanese content is introduced by this change.

The suggested 45–60 minutes is an editorial estimate, not a timed study or prerequisite. Learners may use several short sessions. The module does not claim academic credit, certification or full CEFR A1 mastery.

## Learning design

- 24 useful expressions across greetings, café and directions.
- Three study stops before the practice in each category, with translations learners can hide.
- Three short explanations: `Vorrei + request`, the taught `un/una` word groups, and asking for repetition.
- 16 assessed activities, using eight interaction modes: actual pair matching, contextual choices, word tiles, listening, assembling a café order, a grid route, guided dialogue and typed recall. Cultural choices use the contextual-choice mode.
- Two guided conversations of three and five turns. The five-turn final mission combines finding a place, asking for repetition, ordering, thanking and leaving.
- Two cultural activities supported by Rai Scuola and Bologna Welcome. Characters, prices and the map are explicitly fictional.
- A small explorable city illustration, replayable Yoppo vocabulary challenges and a final notebook of actual results.

Game controls are learner-driven: a page visit does not complete an activity, a dialogue requires its final successful turn, the café checks quantities and budget, and the map checks the requested route rather than arrival alone. No countdown, lives or punitive loss of progress.

## Yoppo

Yoppo lives in a body portal above the learning surface. The learner can drag the companion, move it with arrow keys, minimize its panel, hide it, restore it and reset its position. The visible viewport is used to keep controls accessible when a software keyboard opens.

Yoppo reacts to attempts and success, offers two levels of hints, then an explanation or example, and can launch a bonus, replay the activity or return to unfinished/assisted work. Animations respect reduced-motion settings. Position and hidden-state preferences are stored separately from learning progress.

Opening a hint, example, notebook, transcript or potentially helpful bonus during an unfinished activity marks that attempt as assisted. A wrong answer can reveal corrective information and also marks the remainder of that attempt as assisted. A fresh replay can earn an independent result. Consulting help after a completed evaluation does not retroactively alter that evaluation.

## Progress and accessibility

The versioned key `yopratiqo:italian-bologna-a1:v1` stores only the current step, reset/version timestamps and per-activity aggregate attempts/completion/independence. It stores no typed answers, microphone audio or personal profile. Invalid/unknown identifiers are rejected. Writes occur in the learner event; open tabs reconcile results, and confirmed resets carry a generation timestamp. Storage failures fall back to in-memory practice with a visible explanation.

Essential feedback stays in the activity, independent of Yoppo. Controls use buttons with names, explicit checked/selected state and feedback announcements; none require dragging. Word tiles are selected/removed by click or keyboard. The map has named directional buttons. Replay/navigation restore heading focus. Target Italian text carries `lang="it"`. Accent keys insert at the caret and can replace a selection. Explicitly authored accentless A1 variants are accepted where listed; the canonical spelling remains in the correction.

## Audio status

The module uses real prerecorded MP3s from Supabase and has no browser speech fallback. It starts sound only on click, supports stop and pitch-preserving 0.78× playback, stops on navigation/hidden content, and counts listening only at the `playing` event.

Coverage is **90 pedagogical references / 56 distinct texts**: eight matching recordings from the existing Italian introduction and 48 new recording plans. Public GET verification confirms **8/8 reused recordings available** and **0/48 new recordings available**; all new URLs returned HTTP 400 at verification. The local environment did not provide generation credentials. No OpenAI generation or Storage upload was performed for this change.

A missing recording produces a retry/transcript message. Reading a listening transcript is recorded as assistance; a written success does not establish oral comprehension. Spoken practice is learner self-practice, with no microphone capture or automatic pronunciation assessment.

See [audio instructions](ITALIAN_BOLOGNA_AUDIO.md) and [actual object verification](audio/italian-bologna-v1/VERIFICATION_REPORT.json).

## Validation

`npm run test:yo-italian-module` runs meaningful content, DOM interaction, persistence, companion, complete-player and audio/generator tests. The first complete run passes **120 tests**. Targeted strict TypeScript and relevant existing Italian/shared regressions are checked separately.

The browser/deployment evidence is recorded in the PR after the preview build. The module remains for review until its pending new recordings have been published, all expected files verified, and their playback/pronunciation reviewed.

## Deliberately unchanged

The introductory course, other languages, pricing, checkout, auth, RLS, schema and production branch are retained. This module uses local progress; it does not claim account synchronization or persistent SM-2 scheduling. New module metadata requests no indexing while release review is pending.
