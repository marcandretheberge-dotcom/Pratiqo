# Café des langues — P1/P2 acceptance addendum & Claude handoff (2026-11-09)

**Purpose:** close safety and operations gaps before Cursor implements calendar and free reservations. This is a proposed contract, not evidence that any endpoint/schema exists. Keep PR #449 draft; build on a separate feature branch; do not merge/deploy or apply migrations to production.

## Confirmed frontend stack from branch inspection

- Next.js **16.2.9**, React **19.2.4**, TypeScript **5.x**, App Router (`app/layout.tsx`, `app/cafe-des-langues/page.tsx`).
- Tailwind CSS **4.x** with `@tailwindcss/postcss`; project global styles at `app/globals.css`.
- Lucide React `^0.546.0`; Radix dialog `^1.1.15`.
- Supabase JS `2.105.4`, `@supabase/auth-helpers-nextjs` `0.15.0` (confirm actual route usage).
- Existing Café page uses `getYoLocale(searchParams.lang)`, locale `fr | en | es` and inline copy. `lib/yo/localize.ts` explicitly says **no external Yo i18n library**: `?lang=` parsed server-side, passed via props, FR default/fallback. Root app layout also uses cookie-driven locale patterns elsewhere. Claude must inspect actual patterns and must not introduce next-intl or a new global i18n store.
- Use existing components and tokens instead of inventing a new design system. The current Café page is a preview and the mailto signup is not a booking service.

## P1 admin publication lifecycle (required)

- Host/admin role design must be explicit, cannot rely on client-side hiding. Protected minimal session create/update/cancel/publish functions, or a reviewed **admin-only seed script** for initial sessions. No public create endpoint.
- Server validates start time in future, timezone, duration 30, capacity 5–8, language pair, title, approved host. Reject invalid DST transitions and inconsistent states.
- Transitions: `draft -> published -> completed`; `draft/published -> cancelled`. Define reschedule as explicit update with participant notification; never silently change a confirmed session.
- Public listing returns only future `published` sessions and non-identifying availability (remaining capacity). It never returns participant identities, meeting secrets, attendee lists, private incident data, or small demographic segments.
- No fabricated session dates or mock 'live' capacity on production pages.

## P2 authorization and adult safety

- A checkbox alone is not sufficient if a Pratiqo account is a child/dependent learner profile. Cursor MUST inspect account holder vs learner/dependent model, guardian relationships and role checks; block child/dependent accounts from booking.
- An adult account holder must be the authenticated booking principal; check eligibility server-side plus explicit 18+ attestation timestamp, community-rules version and accepted timestamp. Store least necessary proof, not a birthdate.
- For ambiguous legacy records, default deny or require approved adult eligibility verification; never guess an account is adult merely because it has an email.
- No exposure of other participants' name, email, user ID, or host-private management data; a public client only gets aggregated remaining places and non-identifying session status.

## Reservations, cancellation and minimum quorum

- Enforce capacity atomically in the database (concurrency test >=20 simultaneous requests for 8 places), unique active reservation, idempotency key and safe retries.
- Reserve states: `confirmed`, `waitlisted`, `cancelled`, `attended`, `no_show`; separate booking state from attendance status if existing patterns make this safer. Store a host-verified attendance timestamp and verifier ID, plus a minimal audit event.
- Waitlist is FIFO by server-created timestamp, no user-visible ordering or identities. When a confirmed person cancels within the allowed window, promote atomically and send an individual confirmation; do not send the room link to a waitlisted person.
- **Proposed policy (needs founder approval):** cancellation by member until **2 hours before start**, after which member requests assistance; a person may still inform the host of absence. Waitlist auto-promotion stops **2 hours before start** to avoid late surprise notifications.
- **Proposed quorum:** 4 confirmed adults at T−24h; if under 4, host decides to cancel/reschedule and notifies individuals. Do not automatically cancel live sessions until this rule is approved. If fewer than 4 attend at actual start, host may conduct a shorter session or cancel and mark accordingly.
- Cancellation of session by host invalidates access, prevents reward events, and notifies all confirmed/waitlisted participants individually.

## Moderation must be part of MVP

- A participant can report a session or disruptive behaviour privately during/after the meeting, even when video provider iframe does not expose participant IDs.
- Restrict incident review to authorized staff/hosts; define who can mute, deny entry, remove and prevent re-entry. A 'block' button must be technically meaningful: when provider cannot block a participant reliably, use a report/host-intervention UX, not a decorative fake block.
- Record minimal incident metadata with severity, status, assigned reviewer, timestamps and restricted access. Do not store audio/video/transcripts. Document escalation/removal and data deletion/retention.

## Join, reminders and calendar export

- Before embedded video (P3), allow an optional **secure external join fallback**: only a confirmed, eligible attendee gets an expiring, no-store server response with provider URL within a verified window; never expose it in public JSON, HTML, telemetry or static props. Re-check cancellation, session status and moderation bans server-side.
- **Proposed join window:** opens 10 min before start, closes after session ends; configure server-side and confirm with founder.
- Confirmation email on successful booking, cancellation email, waitlist-promotion email and optional reminder (proposed T−24h and T−1h). Send individually and idempotently, never CC participant addresses.
- Generate an `.ics` calendar attachment/download with local-time display guidance and UTC DTSTART/DTEND; don't include private meeting URL in shareable .ics.
- All email messaging must respect consent and purpose; transactional service notices are distinct from optional marketing.

## Law 25 review and retention

- Before real collection: complete the applicable privacy impact assessment (EFVP), document data flows, subprocessors/locations, access restrictions, vendor settings, breach response, privacy notice and international transfers. Have the privacy owner and Me Guay review as appropriate.
- Define and enforce a documented retention schedule for reservations, contact records and moderation incidents; user deletion/export requests must have a defined path, subject to legitimate retention requirements.
- **Proposed pilot default for review:** delete/minimize ordinary reservation personally identifying data within **90 days of pilot closure**, with separate documented retention for security incidents and legal holds. This is a proposal, not a legal retention mandate.

## Mock state matrix for Claude

Provide fixtures with explicit `isMock: true`, stable fake IDs and deterministic timestamps:
- `open`: upcoming published session with remaining places.
- `full`: upcoming published session with zero remaining places.
- `waitlist`: current user waitlisted, cannot join.
- `confirmed`: current user booked, not yet within join window.
- `joinable`: confirmed, join window open, server join action available.
- `cancelled`: session cancelled, no join/reserve.
- `past`: completed/past, no booking.
- `unauthenticated`: reserve CTA launches existing login/return flow.
- `ineligible`: minor/dependent or no adult verification, cannot reserve.
- `error`: fetch/booking failure, retry and accessible error text.
- `empty`: no published sessions; show dates to be announced.

Claude owns UI only. Cursor owns schema, auth, API, RLS and booking logic. Shared contracts are reviewed before connecting UI. Neither agent modifies the other's owned code without coordinated review.

## P1/P2 release gate

- Unit/integration tests for every state above, including concurrency, RLS, role boundaries, timezone/DST, adult eligibility, admin transitions, attendance verification, quorum policy, cancellation cutoff, notification idempotency and .ics privacy.
- Feature flag OFF by default, zero production migrations, zero production dispatch or invitations, no claims of live bookability. Preview QA only.
- Cursor provides the exact TypeScript response types and example JSON fixtures to Claude; this addendum does not substitute for real repository architecture audit.
