# Café social practice — implementation plan

Branch: `feat/cafe-social-practice` (from #462 / Daily room foundation). Draft only. No production activation.

## What already exists

- Front door + format choice (`CafeFrontDoor`): cinematic still uses `cafe.webp` poster; scheduled group tables list.
- **À deux** disabled with « Bientôt » / Coming soon.
- **En groupe** only lists scheduled `cafe_sessions`; empty/API-404 → « Le café n’est pas encore ouvert » (tables closed).
- Secure reservation + Daily room join (PR2–PR3b), feature flags `CAFE_V1_ENABLED`, `CAFE_ROOM_PROVIDER_ENABLED`.
- No practice-language picker, presence, public text lounge, or private text invites.

## Root causes of broken UX

1. Pair mode is intentionally UI-disabled (`choiceButtonDisabled` + `soon`).
2. Group mode is scheduled-tables-only; lounge text was never built, so zero sessions feel “closed”.
3. No language-scoped social room model beyond session `primary_language`.

## Build order (flagged modules)

| Flag | Module |
|------|--------|
| `CAFE_SOCIAL_V1_ENABLED` | Entry journey + language pick + live café shell |
| `CAFE_PRESENCE_ENABLED` | Language-scoped presence |
| `CAFE_LOUNGE_CHAT_ENABLED` | Public text lounge |
| `CAFE_PRIVATE_CHAT_ENABLED` | Mutual private invites + DM text |
| `CAFE_LIVE_TABLES_ENABLED` | Self-created live tables (off until secure) |
| Existing | Scheduled tables + Daily video |

## Brand story

Subtle root-words animation on the entrance (Pratiquer · Practicar · …). Tagline and empty-state copy: start speaking without perfection. Video/poster remains the visual focus.

## Success bar

Two real users: same language → see each other → lounge messages → accepted private chat. Stop for human review before merge/prod.
