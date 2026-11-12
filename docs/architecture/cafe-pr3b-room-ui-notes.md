# Café PR3b — first conversation room UI

Status: draft UI on `feat/cafe-pr3b-conversation-room`. Not merged. Café remains off in production.

## What shipped in this draft

- Welcome → explicit camera/mic prep → authorized join → connection/error → leave → course return.
- Live join calls existing `/api/cafe/sessions/[slug]/join` (or `/host`) and passes `{ url, token }` to `@daily-co/daily-js`.
- Tokens stay in memory only (never URL, localStorage, analytics, or diagnostics).
- Presence does **not** grant mastery, stamps, or YoPratiqo credit (copy + product rule).
- Private DEMO preview at `/cafe/preview/salle` (requires `CAFE_V1_ENABLED`, clearly labeled).
- Live route `/cafe/[slug]/salle` requires `CAFE_V1_ENABLED` **and** `CAFE_ROOM_PROVIDER_ENABLED`.

## Limits

- Real Daily development validation is still blocked until GitHub environment `cafe-daily-development` secrets are set.
- DEMO must never be described as a real session.
- No merge / no production café activation from this PR.

## Evidence

See `artifacts/cafe-pr3b-room/` for desktop/mobile DEMO screenshots when generated locally.
