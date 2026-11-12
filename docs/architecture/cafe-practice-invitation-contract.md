# Café practice invitation — Codex interface

Status: Café-owned contract for a contextual **Pratiquer au Café** invitation.
YoPratiqo opening / first lesson / map remain Codex-owned (PR #457). Production
stays behind `CAFE_V1_ENABLED` and the existing review gate.

## When Café shows an invitation

Call `resolveCafePracticeInvitation(mission, candidates, options?)` only after a
relevant French or Spanish mission is complete.

Café returns:

- `kind: "invite"` only when **all** of the following hold:
  1. the Café **reservation path** is available (`CAFE_V1_ENABLED=true`, which
     exposes `POST/GET /api/cafe/reservations` and the session-page reserve UI);
  2. a candidate session has an **explicit** `themeId` equal to the mission theme
     (currently `"introductions"` — title/slug fuzzy matching is rejected);
  3. language matches (`fr` / `es`);
  4. level matches exactly, **or** the session level is an explicit all-levels
     token (`tous niveaux`, `all`, …). A missing/blank level is **unknown** and
     does **not** match;
  5. the session is future-dated with `remaining_spots > 0`;
- otherwise `kind: "continue"` with
  `reason: "no_match" | "full" | "ineligible" | "reservation_unavailable"`.

A future session with open seats is **not** enough to invite — without the
reservation path, Café returns `reservation_unavailable` and the learner simply
continues the course.

## Module

```ts
import {
  resolveCafePracticeInvitation,
  buildCafeReserveHref,
  type CafeMissionContext,
  type CafeInvitationCandidate,
  type CafePracticeInvitation,
} from "@/lib/cafe/practiceInvitation";
import {
  isCafeReservationPathAvailable,
  postCafeReservation,
} from "@/lib/cafe/reservationClient";
```

### `CafeMissionContext` (Codex → Café)

| Field | Meaning |
|---|---|
| `language` | `"fr"` or `"es"` |
| `themeId` | currently `"introductions"` |
| `level` | e.g. `"A1"` |
| `courseReturnPath` | same-origin path to the learner’s saved course position |
| `reviewExpression` | one short expression to review before speaking |

### `CafeInvitationCandidate` (Café tagging)

Public session fields plus optional explicit `themeId`. Untagged sessions never
invite.

#### Source of `themeId` for real sessions

`GET /api/cafe/sessions` does **not** return `themeId`. Matching must use an
**explicit, verified association** maintained by Café — today
`CAFE_VERIFIED_THEME_BY_SLUG` / `attachVerifiedCafeTheme()` in
`lib/cafe/themeAssociation.ts` (slug allowlist reviewed at publish time).

Do **not** infer theme from title or slug wording. Preview DEMO fixtures may
carry `themeId` inline; production/public candidates must go through the
verified map (or a future admin-reviewed field that feeds the same helper).

```ts
import { attachVerifiedCafeThemes } from "@/lib/cafe/themeAssociation";

const candidates = attachVerifiedCafeThemes(publicSessions);
const invitation = resolveCafePracticeInvitation(mission, candidates);
```

### Result

- Invite includes language, topic/title, time, duration, spots, participation
  summary, and `reserveHref`:
  `/login?intent=student&next=/cafe/{slug}?from=yo&yoReturn&yoExpression&yoMission`
- Continue simply links back to `courseReturnPath` (no technical copy in UI).
- After sign-in, Yo query params stay on the session URL. `Revenir à mon cours`
  is shown during loading, missing/cancelled sessions, and after confirmation.

## Reservation path (seat hold)

Session page calls the existing authenticated API:

- `GET /api/cafe/reservations` — rows from `cafe_my_reservations_server` with
  `reservation_status`, `session_status`, `effective_status`, `version`, `slug`
- `POST /api/cafe/reservations` `{ slug, action: "reserve", expectedVersion, requestId }`
  — confirms immediately via `cafe_set_reservation_server` (idempotent on
  `requestId` + action + expectedVersion)

Client contract (`lib/cafe/reservationClient.ts`):

- Parse **RPC field names** (`effective_status`, …) — never a bare `status` on GET rows
- Show confirmation only when `effective_status === "confirmed"` (so
  `session_cancelled` never looks reserved)
- Keep `version` from cancelled / non-effective rows as `expectedVersion` for
  the next reserve
- On lost POST response / network uncertainty: re-GET, reconcile UI, and
  **reuse the same `requestId`** for retry
- On `version_conflict`: re-GET, adopt server `expectedVersion`, use a **new**
  `requestId` for the next attempt

Helpers: `fetchMyCafeReservations`, `attemptCafeReserve`, `reconcileCafeSeatState`.

### Remaining Café dependency for a live confirmed seat

Preview DEMO slugs are **not** inserted into Postgres. A confirmed reservation
still requires:

1. `CAFE_V1_ENABLED=true`
2. Migration `cafe_secure_foundation` applied
3. A **published** session row whose slug matches the invite
4. A permanent (non-anonymous) signed-in profile under the per-user upcoming quota

Until those hold, invitation matching may show a DEMO invite in the private
preview, but `POST /api/cafe/reservations` returns `session_unavailable` /
`not_found` for DEMO-only slugs. Wire Codex to real/public sessions from
`GET /api/cafe/sessions`, tagged with `themeId`.

## Non-goals (developer contract — not learner UI)

- Café attendance must **not** write Yo mastery or stamps (lesson criteria only).
- No fake live participants in product surfaces; preview uses labeled `DEMO` fixtures.
- No Daily / video wiring in this invitation pass.

## Preview

Private preview (requires `CAFE_V1_ENABLED=true`):

`/cafe/preview/pratiquer`

Optional local live slug: `/cafe/preview/pratiquer?liveSlug=<published-slug>&yoReturn=…`
(uses `cafe_public_sessions` + verified `themeId` association; not for production).

## Local verification environment

Isolated stack used for end-to-end reservation checks (not production):

1. Local Supabase Auth/API (`http://127.0.0.1:55421`) + DB (`55422`)
2. Apply `supabase/migrations/20261110233000_cafe_secure_foundation.sql`
3. Point the app at that stack via `.env.cafe-local`
4. `npx tsx scripts/cafe-live-reservation-check.ts` (fails closed if RPCs/migrations missing; learner mutations use `POST /api/cafe/reservations`)
5. `npx tsx scripts/cafe-live-browser-journey.ts` then `npx tsx scripts/cafe-live-cleanup.ts`

Admin/service role is limited to draft/publish/cleanup. Seat hold mutations use the learner JWT.
