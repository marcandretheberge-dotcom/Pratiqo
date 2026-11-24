# YoPratiqo Phase 0: Italian SRS persistence foundation

This release does not change learner progress behavior by default. SRS API
routes return 404 unless `YO_SRS_SERVER_ENABLED=true`; the browser also needs
`NEXT_PUBLIC_YO_SRS_SERVER_ENABLED=true` at build time before it sends data.
Do not set either flag in production for this foundation.

- The Italian schedule and its intervals are unchanged. Each server attempt
  updates the item and its XP entries in one transaction, with bounded retries
  on stale reads and a stable attempt ID for replay protection.
- The import runs once for a non-empty valid payload. The server wins timestamp
  ties. Only aggregate SRS records are uploaded by the client.
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
