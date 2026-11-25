# YoPratiqo Phase 0: Italian SRS persistence foundation

This release does not change learner progress behavior by default. SRS API
routes return 404 unless `YO_SRS_SERVER_ENABLED=true`; the browser also needs
`NEXT_PUBLIC_YO_SRS_SERVER_ENABLED=true` at build time before it sends data.
Do not set either flag in production for this foundation.

- The Italian schedule and its intervals are unchanged. Each server attempt
  updates the item and its XP entries in one transaction, with bounded retries
  on stale reads and a stable attempt ID for replay protection.
- The explicit import API accepts only validated aggregate activities. The server
  wins timestamp ties. Do not automatically upload unowned shared-browser state.
- The database tables and write functions are restricted to the service role.
  All application reads and writes use the authenticated session's user ID.
- This is not cross-device restoration, a durable offline queue, a migration of
  other learning progress, or a trusted source of commercial rewards. No
  checkout or payment logic is enabled or changed.

Run `npm run test:yo-srs` for engine parity and transaction/permission tests.
Test the migration and signed-in account isolation on a disposable preview
database before any rollout. Before production activation, verify account
ownership of anonymous local imports, restore/refresh and reset behavior on two
devices, failed delivery/replay handling, and abuse limits for the XP endpoint.


## Italian daily loop preview

On a Vercel Preview or local development build, open
`/yo/langues/italien/parcours?today=preview`. An existing Italian learning
profile will go straight to Today; new learners complete placement first.
The public hub and normal production landing flow are unchanged.

Today keeps one primary Continue action and deep-links to the next due
exercise on this device. The signed-in card reads distinct course exercises
and XP from the existing transaction ledger; the learner can set or remove
an optional exercise target. It does not collect active minutes.

The Italian preview offers a practical phrase challenge from the journey and
one existing trivia question per daily rotation. A correct answer is checked
on the server before granting 30 XP (mission) or 20 XP (trivia). Each mission
can unlock one of 12 city souvenirs. Attempt replay cannot duplicate a reward;
the receipt, XP and souvenir are committed together. There is no attendance
streak or penalty for missing a day. These XP have no cash or pass value.

For a disposable Supabase preview, apply the SRS migration first and then
`20261124200500_yo_daily_loop.sql`. Allow the daily endpoints using
`YO_DAILY_SERVER_ENABLED=true` **only** in the isolated environment, alongside
the two SRS flags described above. The learner calendar uses the profile zone
(or America/Toronto) and pins the zone at the first saved goal or reward;
subsequent travel or device clock changes cannot reopen an earlier day.

Run `npm run test:yo-daily-loop` and `npm run test:yo-srs`. Before any production
activation, verify an actual Supabase login, both devices on the same account,
a second isolated account, an expired challenge, and a retried submission.
Server-side rehydration of the course resume and review queue remains separate.
