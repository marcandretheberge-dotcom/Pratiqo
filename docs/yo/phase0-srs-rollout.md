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

Today shows one Continue action and links to the first actually due local
exercise. The fixed target is five distinct exercises. A signed-out or
unconfigured preview shows device-only progress and no fabricated streak.
The authenticated read uses the same committed practice ledger without
counting XP rows or creating day/streak tables. One missed day per account
calendar week can be bridged without adding to the displayed streak.
The account timezone sets the calendar; before release test changes to that
preference, plus authenticated persistence and isolation against Supabase
on a disposable app environment. No timer, historical import, or payments.
