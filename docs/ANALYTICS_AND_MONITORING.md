# Pratiqo — Analytics & Monitoring

**Last reviewed**: 2026-06-15 — alongside `feat/posthog-sentry-instrumentation`.

This is the contract for what Pratiqo measures, where it sends the data,
and — most importantly — what it **must never send**. If you change any
file listed here, update or extend `tests/analytics/postHogSentryInstrumentation.test.ts`
so the contract stays loud.

---

## 1. Tools

| Tool | Purpose | How it's wired |
|---|---|---|
| **PostHog** | Product analytics, funnels, retention | `lib/analytics/posthog.ts` posts to `${NEXT_PUBLIC_POSTHOG_HOST}/capture/` via `fetch + keepalive`. Zero npm dependency. |
| **Sentry** | Production error capture | `lib/monitoring/sentry.ts` posts to the parsed-DSN `/api/<projectId>/store/` endpoint via `fetch + keepalive`. Zero npm dependency. `lib/log.ts#logError` auto-forwards every server-side error. |
| **Supabase `search_events`** | Backend-owned search demand log (already in production) | `lib/searchAnalytics.ts` — preserved, untouched. Shares the same anonymous distinct id as PostHog. |

### Why fetch-based, not the official SDKs?

Two reasons:

1. **No new dependency churn** the week before launch. `@sentry/nextjs` and `posthog-js` together add ~250 KB to the browser bundle, modify `next.config`, and require source-maps pipelines. None of that is appropriate for a closed-beta unblock PR.
2. **Privacy by construction.** Both SDKs default to autocapture / autoreplay, which would indiscriminately serialize DOM nodes that may contain message bodies, raw addresses, and partial payment UI. Manual capture is the privacy floor — and the only floor compatible with the brief's "never send message content / private addresses / payment details" requirement.

A documented upgrade path to the official SDKs is at the bottom of this file (§7).

---

## 2. Environment variables

All four placeholders already exist in `.env.example` (§ "Analytics / Observability"):

| Var | Scope | What happens if empty |
|---|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | Browser | All PostHog capture helpers no-op silently |
| `NEXT_PUBLIC_POSTHOG_HOST` | Browser | Defaults to `https://us.i.posthog.com` |
| `SENTRY_DSN` | Server only | All server-side `captureMonitoringError()` calls no-op |
| `NEXT_PUBLIC_SENTRY_DSN` | Browser | Browser-side error captures no-op |

**Critical**: the two Sentry DSNs are kept separate on purpose. A misconfigured deploy must not silently leak the server DSN to the client bundle. `lib/monitoring/sentry.ts#readDsn()` enforces this at runtime by reading `SENTRY_DSN` only on the server.

---

## 3. Event taxonomy

All event names live in `lib/analytics/events.ts#ANALYTICS_EVENTS` and each event has a typed `track<EventName>(props)` helper. Adding a new event requires:

1. A snake_case entry in `ANALYTICS_EVENTS`.
2. A typed helper in the same file.
3. A row in this table.
4. A test assertion in `tests/analytics/postHogSentryInstrumentation.test.ts`.

### Core marketplace web

| Event | Trigger | Properties |
|---|---|---|
| `landing_viewed` | Visit `/` | `{ path }` |
| `search_started` | "Rechercher" button on landing/search/quiz | `{ source }` |
| `search_subject_selected` | Pick a "Quoi" suggestion | `{ source, subject_id?, query_length? }` |
| `search_location_selected` | Pick a "Lieu" autocomplete entry (region/country only — **never** raw address) | `{ source, region?, country_code? }` |
| `search_format_selected` | Change the "Format" filter | `{ source, format }` |
| `search_availability_filter_used` | Set day/period on advanced filter | `{ source, day?, period? }` |
| `teacher_card_clicked` | Open a teacher profile modal | `{ source, teacher_id, position? }` |
| `teacher_profile_viewed` | Teacher profile modal mounted | `{ teacher_id, source? }` |

### Booking

| Event | Trigger | Properties |
|---|---|---|
| `booking_started` | `BookingModal` mounts | `{ teacher_id, lesson_type?, teaching_mode?, price_cad? }` |
| `booking_slot_selected` | User picks a date+time slot | `{ teacher_id, period?, weekday?, lesson_type?, teaching_mode? }` |
| `booking_checkout_started` | **Just before** the Stripe Checkout `fetch` redirect | `{ teacher_id, lesson_type?, teaching_mode?, price_cad? }` |
| `booking_completed` | After Stripe Checkout redirect-back success (deferred — see §5) | `{ teacher_id, … }` |
| `booking_cancel_started` | Cancel-confirmation dialog opens (deferred — see §5) | `{ teacher_id }` |
| `booking_cancel_completed` | Cancel API returns success (deferred — see §5) | `{ teacher_id }` |

### Messaging

| Event | Trigger | Properties |
|---|---|---|
| `message_thread_opened` | `activeConversationId` changes to a new value | `{ thread_id }` — conversation id only, never peer email |
| `message_sent` | `sendMessage` returns success | `{ thread_id }` — **never** the message body |
| `message_email_notification_queued` | Server-side enqueue success (deferred — see §5) | `{ thread_id }` |
| `message_email_notification_failed` | Server-side enqueue failure (deferred — see §5) | `{ thread_id, reason_code? }` |

### YoPratiqo

| Event | Trigger | Properties |
|---|---|---|
| `yopratiqo_landing_viewed` | Visit any `/yo/langues/<lang>` route | `{ language, locale, module? }` |
| `yopratiqo_intro_started` | Visit any `/yo/langues/<lang>/intro` route | `{ language, locale, module? }` |
| `yopratiqo_lesson_started` | Open a `lecon-N` route (deferred — see §5) | `{ language, locale, module, lesson_id? }` |
| `yopratiqo_lesson_completed` | Finish-state CTA tapped (deferred — see §5) | `{ language, locale, module, lesson_id? }` |
| `yopratiqo_printable_opened` | Open a printable kit (deferred — see §5) | `{ language, locale, module, lesson_id? }` |

### Admin

| Event | Trigger | Properties |
|---|---|---|
| `admin_users_viewed` | `/admin/users` page fetches users successfully | `{ rendered_count }` — count only, **never** the list |
| `admin_role_change_started` | Admin confirms a role change in the dialog | `{ previous_role, new_role }` |
| `admin_role_change_completed` | `PATCH /api/admin/users` returns 200 | `{ previous_role, new_role, target_id?, result: "ok" }` |
| `admin_role_change_failed` | `PATCH /api/admin/users` returns non-2xx | `{ previous_role, new_role, reason_code, result: "error" }` |

---

## 4. Privacy rules — what must NEVER be tracked

The capture path (`lib/analytics/posthog.ts#sanitizeAnalyticsProperties`) drops any property whose key contains any of these fragments **before** sending:

```
password   token       secret    authorization auth_header  cookie
stripe     card        cvc       cvv           iban         ssn  sin  card_number
address    street      postal    zip
lat        lng         latitude  longitude     coords       geo
body       content     message_body            raw_query
email
```

It also:

- truncates strings to 256 characters,
- caps payloads at 32 properties,
- drops anything that isn't `string | number | boolean | null`.

**On top of that**, the typed helpers in `lib/analytics/events.ts` have property types that simply do not declare `body` / `address` / `email` / `coords` fields, so a TypeScript drift would also have to dodge the type system.

**Forbidden by policy**:

- Message bodies (the `message_sent` event sends `thread_id` only).
- Raw student/teacher addresses or precise coordinates (the `search_location_selected` event sends region + country code only).
- Full email addresses anywhere. The internal `target_id` UUID is acceptable in admin events; the email is not.
- Payment details: card numbers, Stripe session IDs, Stripe customer IDs, refund metadata. The `booking_checkout_started` event sends product shape only (`teacher_id`, `price_cad`, `lesson_type`, `teaching_mode`) — no Stripe identifiers.
- Auth tokens of any kind.

---

## 5. Deferred events

Wired into the taxonomy but **not yet emitted at a call-site** in this PR — they ship in follow-up PRs that touch the relevant flows:

| Event | Why deferred |
|---|---|
| `booking_completed`, `booking_cancel_started`, `booking_cancel_completed` | Need to instrument the Stripe redirect-back handler + cancel API. Out of scope here to honor "do not touch Stripe/payment code". |
| `message_email_notification_queued/failed` | Lives in the server-side email sender. Requires a server-side fetch path to PostHog — straightforward but worth its own PR. |
| `yopratiqo_lesson_started`, `yopratiqo_lesson_completed`, `yopratiqo_printable_opened` | Need a client wrapper inside the YoPratiqo lesson surfaces. Out of scope for the initial instrumentation foundation. |
| Per-card `teacher_card_clicked` `position` index | The taxonomy supports it; we currently emit `position: null`. Needs threading into the card-render code. |

---

## 6. How to test locally

```bash
# 1. Set the keys in .env.local (use a PostHog dev project + Sentry dev project).
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
SENTRY_DSN=https://abc@oXXX.ingest.sentry.io/123
NEXT_PUBLIC_SENTRY_DSN=https://abc@oXXX.ingest.sentry.io/123

# 2. Run the app.
npm run dev

# 3. In the browser, open DevTools → Network → filter "capture".
#    Every typed event helper produces one POST to /capture/.
#    Property previews should NOT contain message bodies, addresses, or emails.

# 4. Trigger a server-side logError() (e.g. malformed request to an API
#    route). The Sentry project's Issues tab should receive a "pratiqo"
#    event within seconds.

# 5. Run the regression test:
npx tsx tests/analytics/postHogSentryInstrumentation.test.ts
```

## 6.1 How to verify in production

- PostHog Live Events: filter by `event = "landing_viewed"` → events should arrive within seconds of any visit to `/`.
- PostHog Funnels: build `search_started → teacher_profile_viewed → booking_started → booking_checkout_started`. This is the canonical marketplace funnel; it works without any backfill because every step is in this PR.
- Sentry Issues: trigger a known server error (e.g. POST malformed body to `/api/admin/users`) and verify it appears.
- Spot-check the `_lib` / `$lib` property: every event from Pratiqo carries `$lib: "pratiqo-fetch"`. If you see events without that, something is bypassing the helpers — investigate.

---

## 7. Deferred — admin metrics dashboard

The brief explicitly excludes a custom admin metrics dashboard from this PR (and from the admin/users PR before it). Visitor counts, funnel widgets, retention, search-quality, conversion-to-booking — **all of these belong in PostHog**, not in a homegrown `/admin/metrics`. Pratiqo's admin surface should stay narrowly focused on operational tasks (user roles, credential review). Building a metrics tab here would:

- Compete with PostHog's tooling without ever matching it.
- Pull every founder into SQL whenever a chart breaks.
- Mix operational role management with marketing analytics — making it a high-value target and a noisier UI.

If a future need is "give the founder a 10-second pulse-check on PratiqoLand", PostHog Dashboards has shareable read-only links that solve that without touching app code.

---

## 8. Upgrade path to the official SDKs (when justified)

When tracing / replays / source-maps / breadcrumbs become necessary:

1. `npm install @sentry/nextjs posthog-js`.
2. Add `instrumentation.ts` + `sentry.client.config.ts` + `sentry.server.config.ts` per the official guides.
3. Replace the fetch shim in `lib/monitoring/sentry.ts` with a re-export of `Sentry.captureException` / `Sentry.captureMessage`. The signature of `captureMonitoringError()` is intentionally compatible so call-sites do NOT change.
4. Replace the fetch capture in `lib/analytics/posthog.ts` with `posthog.capture()`. Keep the property sanitizer in place — it's the privacy floor regardless of transport.
5. Add the source-maps upload step to the Vercel build environment.
6. **Critical**: explicitly disable PostHog autocapture (`autocapture: false`) and Sentry session replay until a privacy review of those features is complete.

The contract tested by `tests/analytics/postHogSentryInstrumentation.test.ts` survives that upgrade unchanged.
