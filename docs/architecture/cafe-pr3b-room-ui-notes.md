# Café PR3b — first conversation room UI

Status: draft UI on `feat/cafe-pr3b-conversation-room`. Not merged. Café remains off in production.

## What shipped in this draft

- Welcome → explicit camera/mic prep → authorized join → connection/error → leave → course return.
- Live join calls existing `/api/cafe/sessions/[slug]/join` (or `/host`) and passes `{ url, token }` to `@daily-co/daily-js`.
- Tokens stay in memory only (never URL, localStorage, analytics, or diagnostics).
- Presence does **not** grant mastery, stamps, or YoPratiqo credit (copy + product rule).
- Private DEMO preview at `/cafe/preview/salle` (requires `CAFE_V1_ENABLED`, clearly labeled).
- Live route `/cafe/[slug]/salle` requires `CAFE_V1_ENABLED` **and** `CAFE_ROOM_PROVIDER_ENABLED`.

## Hardening (follow-up)

- Room routes override site-wide `Permissions-Policy` (catch-all first; `/cafe/:slug/salle` and `/cafe/preview/salle` last). Camera/mic may delegate to `self` + configured Daily origin only; `display-capture=()` stays denied.
- `yoReturn` goes through `sanitizeRelativeRedirectPath` (rejects `//example.com` and absolute URLs).
- Daily call teardown on error, before retry, and on unmount; join generation invalidates stale async work so a late `join` cannot connect after leave.
- Targeted simulated tests: `tests/cafe/cafePr3bRoomHardening.test.ts` (not Daily API live, not browser join).
- HTTP header proof after `next build` + `next start`: `npm run probe:cafe-pr3b-headers` → `artifacts/cafe-pr3b-room/header-probe.json`.

## Limits

- Real Daily development validation is still blocked until GitHub environment `cafe-daily-development` secrets are set.
- DEMO must never be described as a real session.
- No merge / no production café activation from this PR.

## Evidence

See `docs/architecture/cafe-pr3b-evidence/` for DEMO screenshots and `header-probe.json` (Permissions-Policy after `next build` + `next start`).
