# Dominican hotel check-in review

Optional offline practice linked from the hotel dialogue in Spanish Module 2.
The build publishes it at /practice/es/hotel/index.html. It is not
a booking or an assessment. Both stays and
guests are fictional. The review does not ask for a name or a document, use an
API key, or send progress to Pratiqo.

Day one teaches six actions at the front desk, including repairing a missed
room number. Day two changes the guest and order of the exchange; an apparent
room/key mismatch requires a clarification before choosing the corrected key.
A first miss persists across reloads. The challenge unlocks on the next local
calendar date, not after a fixed 24 hours. All progress stays in the same browser.

The recording text and source paths come from the existing Dominican arrival
scene. The two additional written desk prompts are not passed off as recorded
speech. Nine existing clips, the desk image, and Yoppo are packaged once. Read
instead of listening where useful. No generation or live AI access is required.

From the worktree root with the locked dependencies installed:

    node --import tsx --test tests/yo/hotelScenario.test.ts
    npm run test:yo-arrival-listening
    node --import tsx tools/hotel-check-in/build.mjs
    node tools/hotel-check-in/serve.mjs

The loopback server writes its temporary URL in .qa-guided/hotel/access.json
(ignored). In another terminal, run:

    node --import tsx tools/hotel-check-in/verify.mjs

The browser test downloads the actual pack then disconnects. It checks three
widths, interruption, playback, decoding all clips, single-range requests,
midnight boundaries, correction history, and all three interface languages.
An explicitly shared HTTPS review may be verified with --public. Do not put the
temporary access link, logs or generated assets into Git. A physical phone and a
human listening review are separate release checks.
