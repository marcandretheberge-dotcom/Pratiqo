# Stripe Connect, Identity, and Teacher Payment Activation Audit

Date: 2026-08-17
Branch: `audit/stripe-connect-identity-payments`
Scope: read-only code audit plus read-only production diagnostics.

This audit investigates why the founder teacher account can be payment-activated while other teachers do not appear activated in admin.

No runtime behavior was changed.

## Severity Legend

- P0: payments blocked or unsafe.
- P1: likely causing false "not activated" status.
- P2: admin UX or diagnostics gap.
- P3: cleanup.

## 1. Executive Summary

Most likely root cause: `lib/payments/connect.ts` collapses Stripe Connect `requirements.currently_due`, `requirements.eventually_due`, `requirements.past_due`, and `future_requirements.*` into one `teachers.stripe_connect_requirements_due` array. The readiness contracts then treat any item in that single array as a blocking `requirements_due` state.

That can make many otherwise usable connected accounts appear "not activated" if Stripe reports eventual or future requirements that are not blocking current charges/payouts yet.

Second likely root cause: Stripe `account.updated` sync only works if the production webhook destination is configured for connected account events. The code handles `account.updated`, but this repository cannot prove that the Stripe Dashboard endpoint is subscribed to connected-account `account.updated` events.

Third likely root cause: the teacher UI can create/reuse a Connect account through `POST /api/stripe/connect`, and `GET /api/stripe/connect` can refresh status, but the audited UI does not show a clear automatic `GET /api/stripe/connect` refresh after the Stripe onboarding `return_url` (`/onboarding?stripe=success`). If the webhook is missing or delayed, admin sees stale DB fields.

Highest-risk code paths:

- `lib/payments/connect.ts`: collapses current, eventual, past, and future requirements into one blocking field.
- `lib/teachers/readinessContracts.ts`: treats any stored requirement as blocking `paymentReady` and `payoutReady`.
- `app/api/stripe/checkout/route.ts`: blocks Checkout before session creation unless the teacher is full payout-ready.
- `app/api/stripe/webhook/route.ts`: relies on connected-account `account.updated` delivery for automatic sync.
- `app/api/stripe/connect/route.ts`: hardcodes new Express accounts to country `CA` after a Canada-only payout gate.
- `lib/admin/overview.ts` and `lib/admin/bookingPaymentOperations.ts`: use looser Stripe-incomplete logic than Teacher 360/admin users.

## 2. Current Stripe Connect Flow Map

Teacher action:

1. Teacher opens the profile/account management surface.
2. `components/teacher/TeacherAccountView.tsx` loads `profiles` and `teachers` directly from Supabase client.
3. Clicking the Stripe action calls `POST /api/stripe/connect` with the current Supabase access token.
4. `app/api/stripe/connect/route.ts` validates the authenticated user from the bearer token.
5. It loads an existing teacher row and profile country.
6. It blocks unsupported payout markets with `isPayoutMarketSupported`.
7. If no Stripe account exists, it creates a Stripe Express account.
8. It writes/syncs Stripe Connect status into `teachers`.
9. It creates an `account_onboarding` Account Link.
10. Browser is redirected to Stripe onboarding.
11. Stripe returns to `/onboarding?stripe=success` or `/onboarding?stripe=refresh`.

Code references:

- Connect endpoint: `app/api/stripe/connect/route.ts`.
- Status mapping and DB sync: `lib/payments/connect.ts`.
- Teacher UI action: `components/teacher/TeacherAccountView.tsx`.

## 3. Current Stripe Identity Flow Map

Teacher action:

1. Teacher starts identity verification through `app/api/stripe/identity/verify/route.ts`.
2. The route validates authenticated teacher role.
3. It loads `teachers` by `user_id`.
4. It creates a Stripe Identity Verification Session of type `document`.
5. It stores:
   - `stripe_identity_session_id`
   - `stripe_identity_status = "requires_input"`
   - `identity_status = "pending"`
6. Stripe sends Identity webhook events.
7. `app/api/stripe/webhook/route.ts` handles:
   - `identity.verification_session.verified`
   - `identity.verification_session.requires_input`
   - `identity.verification_session.canceled`
8. Handlers update `teachers` by `user_id`, using `session.metadata.user_id`.

Important: Stripe Identity is separate from Stripe Connect. Identity verification can be true while Connect payment/payout readiness remains false.

## 4. Current Admin Payment Status Flow Map

Admin users list:

- `app/api/admin/users/route.ts` selects Stripe Connect fields from `teachers`.
- It calls `deriveTeacherReadinessContract`.
- It returns `teacher_payment_ready` and `teacher_payout_ready`.
- It intentionally does not return raw `stripe_account_id` or raw `stripe_connect_*` fields.

Teacher 360:

- `lib/admin/teacher360.ts` selects Connect and Identity fields.
- It calls `deriveTeacherReadinessContract`.
- It exposes:
  - `stripeAccountExists`
  - `chargesEnabled`
  - `payoutsEnabled`
  - `requirementsDueCount`
  - `paymentReady`
  - `payoutReady`
  - `paymentBlockers`
  - `payoutBlockers`

Admin command center:

- `lib/admin/overview.ts` counts "Stripe incomplete" with a looser helper:
  - missing `stripe_account_id`
  - onboarding incomplete
  - charges disabled
- It does not check `payouts_enabled`, requirements, disabled reason, or stale sync.

Admin payment operations:

- `lib/admin/bookingPaymentOperations.ts` uses a similar loose helper.
- It checks account/onboarding/charges only.

Result: admin surfaces can disagree.

## 5. Current Booking Payment Readiness Gate

`app/api/stripe/checkout/route.ts` loads the booking teacher row and calls `isTeacherPayoutReadyForCheckout(typed)` before Stripe Checkout Session creation or ledger write.

That gate requires:

- `stripe_account_id` present
- `stripe_connect_onboarding_complete = true`
- `stripe_connect_charges_enabled = true`
- `stripe_connect_payouts_enabled = true`
- `stripe_connect_requirements_due` empty
- `stripe_connect_disabled_reason` empty

If false, it returns code `teacher_payout_not_ready` with a localized safe message.

P0/P1 risk: this is correctly conservative for launch safety, but it means stale or over-strict Connect status blocks real bookings.

## 6. Database Fields Involved

Connect fields on `public.teachers`:

- `stripe_account_id`
- `stripe_connect_onboarding_complete`
- `stripe_connect_charges_enabled`
- `stripe_connect_payouts_enabled`
- `stripe_connect_requirements_due`
- `stripe_connect_disabled_reason`
- `stripe_connect_last_synced_at`

Identity fields on `public.teachers`:

- `identity_verified`
- `identity_status`
- `verification_level`
- `stripe_identity_session_id`
- `stripe_identity_status`
- `stripe_identity_verified_at`
- `stripe_identity_failed_reason`

Key migrations:

- `supabase/migrations/002_stripe_connect.sql`
- `supabase/migrations/009_teacher_verification.sql`
- `supabase/migrations/018_identity_status_diploma_url.sql`
- `supabase/migrations/028_stripe_identity_columns.sql`
- `supabase/migrations/038_payment_ledger.sql`
- `supabase/migrations/069_teachers_preserve_sensitive_client_fields.sql`
- `supabase/migrations/070_teachers_public_read_isolation.sql`
- `supabase/migrations/086_align_teacher_public_search_visibility.sql`

## 7. Webhook Events Involved

Handled by `app/api/stripe/webhook/route.ts`:

- `account.updated`
- `identity.verification_session.verified`
- `identity.verification_session.requires_input`
- `identity.verification_session.canceled`
- payment, subscription, transfer, and dispute events unrelated to this audit.

The code logs `event.id`, `event.type`, and `event.livemode`, verifies signatures, and rejects test-mode events on production.

## 8. Where Stripe Status Is Created

`app/api/stripe/connect/route.ts` creates a Stripe Express account only when:

- authenticated user exists
- teacher/profile country passes `isPayoutMarketSupported`
- no existing `teachers.stripe_account_id` is present

The route currently creates:

```ts
stripe.accounts.create({
  type: "express",
  country: "CA",
  ...
})
```

Answering the requested creation questions:

- When does Pratiqo create a Stripe Express account? When a teacher clicks the Connect action and `POST /api/stripe/connect` finds no existing account.
- What required teacher/profile fields can block account creation? Unsupported or missing effective country can block because `isPayoutMarketSupported(teacherCountryCode)` must be true. Authentication and teacher role/session must also pass.
- Is country hardcoded to CA? Yes. New Stripe accounts are created with `country: "CA"`.
- What happens if `teacher.country_code` is null? `POST` falls back to `profiles.country_code`; if both are empty, the payout market gate returns 403. `GET` uses only teacher country and returns a market-not-supported payload when empty/unsupported.
- Is the teacher row always guaranteed to exist before Stripe Connect starts? Not always. The Connect route can create a placeholder teacher row if missing.
- Does the flow create placeholder teacher data if missing? Yes, with default name, category, price, bio, image, availability, location, and Connect fields.
- Is that safe with the current onboarding design? Mostly safe because the draft row is not public by default, but it duplicates logic in `ensureTeacherProfileRow` and can make country/default data harder to reason about. It should be consolidated in a later PR, not changed in this audit.

## 9. Where Stripe Status Is Synced

Sync points:

1. `POST /api/stripe/connect` syncs immediately after creating or retrieving the account.
2. `GET /api/stripe/connect` retrieves the Stripe account and syncs the teacher row.
3. Webhook `account.updated` calls `syncTeacherConnectStatus`.

Answering the requested sync questions:

- Does Pratiqo sync status immediately after creating the account? Yes, from the Stripe account returned by account creation.
- Does Pratiqo sync status after the teacher returns from Stripe onboarding? Not clearly from the audited UI. The return URL points to `/onboarding?stripe=success`, but the audited profile/account UI only calls `POST /api/stripe/connect`, and `GET /api/stripe/connect` is not visibly called after return.
- Does `/api/stripe/connect` GET sync status? Yes.
- Does the UI call `/api/stripe/connect` GET after return_url success? No clear call was found in `components/teacher/TeacherAccountView.tsx`, `app/(app)/onboarding/teacher/page.tsx`, or `app/(app)/teacher/verification/page.tsx`.
- Does webhook `account.updated` sync status? Yes.
- Is the Stripe webhook endpoint configured for connected account events or only platform events? This cannot be proven from repository code. It must be checked manually in Stripe Dashboard.
- Is `account.updated` enough for the current integration? Yes for current v1 Account object status sync, if the webhook destination receives connected-account events and the event object is the connected account.

## 10. Where Stripe Status Is Displayed in Admin

- `app/(app)/admin/users/page.tsx`: displays "Paiements actives" and "Versements actives" from API booleans.
- `app/(app)/admin/users/[id]/page.tsx`: displays account existence, charges, payouts, requirements count, paymentReady, and payoutReady from Teacher 360 data.
- `app/(app)/admin/page.tsx`: displays aggregate `stripeIncompleteTeachers`, but with a looser definition.
- `app/(app)/admin/payments/page.tsx` and `app/(app)/admin/bookings/page.tsx`: show payment ledger/booking diagnostics, not full Connect readiness.

Admin does not currently show:

- raw `stripe_account_id`
- `stripe_connect_last_synced_at`
- exact requirement names
- distinction between current/past requirements and eventual/future requirements
- connected-account webhook freshness

## 11. Where Stripe Status Blocks Booking/Payment

The booking Checkout route blocks payment creation in `app/api/stripe/checkout/route.ts` before:

- Stripe Checkout Session creation
- unpaid booking payment ledger upsert

The gate uses `isTeacherPayoutReadyForCheckout`, not merely `charges_enabled`.

This means booking payment requires both payment readiness and payout readiness under the current model.

## 12. Where Identity Status Is Created

`app/api/stripe/identity/verify/route.ts` creates a Verification Session and updates `teachers` by `user_id`.

It sets:

- `stripe_identity_session_id`
- `stripe_identity_status = "requires_input"`
- `identity_status = "pending"`

It refuses to create a new session when `identity_verified` or `stripe_identity_status === "verified"`.

## 13. Where Identity Status Is Synced

`app/api/stripe/webhook/route.ts` updates Identity state from Stripe webhooks:

- verified: sets `stripe_identity_status = "verified"`, `stripe_identity_verified_at`, `identity_verified = true`, `identity_status = "verified"`, and `verification_level = 2`.
- requires_input: sets `stripe_identity_status = "failed"`, `stripe_identity_failed_reason`, and `identity_status = "failed"`.
- canceled: sets `stripe_identity_status = "canceled"` and `identity_status = "none"`.

Handlers match by `session.metadata.user_id`. They can match zero rows if the teacher row is missing, if metadata is missing, or if metadata contains an unexpected user id.

## 14. Where Identity Status Is Displayed

- Teacher verification/profile page reads `identity_verified`, `identity_status`, `stripe_identity_status`, and failure reason.
- Admin credential review surfaces read identity fields.
- Public views intentionally expose only safe trust booleans and exclude raw Identity workflow fields.

Current code does not show that Stripe Identity is required before accepting bookings. The booking payment gate is Stripe Connect readiness.

Identity does affect visibility and trust surfaces:

- `lib/teachers/searchVisibilityDiagnostics.ts` blocks failed Identity states and warns when Identity is not verified.
- `supabase/migrations/086_align_teacher_public_search_visibility.sql` filters failed Identity states from `teachers_public`.
- At-home lessons with minors are not backed by a persisted approval flag yet. Current launch behavior is disclosure/manual validation, not an automatic Identity-based unlock.

Answering the requested Identity questions:

- Is Stripe Identity required before accepting bookings? Not in the checkout/payment gate found in this audit.
- Is Stripe Identity required before appearing in search? A failed Identity state blocks; unverified Identity appears as a warning in TypeScript diagnostics. The current `teachers_public` SQL filter excludes failed Identity states and rows with a Stripe Identity failure reason.
- Is Identity required before map/home lessons? Teacher copy says Identity is required to appear on map/offer at-home lessons, but the audited durable gates currently rely on visibility diagnostics, failed-Identity exclusion, and home/minor disclosure/manual validation. There is no separate persisted minor-at-home approval field.
- Does Identity webhook update teacher row by `user_id` or `teacher_id`? By `user_id`.
- Could Identity webhooks match zero rows? Yes, if metadata is missing/wrong or the teacher row does not exist.
- Does Identity status appear correctly in admin? Admin credential/Teacher 360 surfaces read Identity fields, but this audit did not execute production data queries. The diagnostics SQL includes drift checks between `identity_verified`, `identity_status`, and `stripe_identity_status`.

## 15. Exact Difference Between Identity and Payment/Payout Readiness

`identity_verified` answers:

> Has the teacher passed Pratiqo's Stripe Identity verification workflow?

Payment readiness answers:

> Can this connected Stripe account currently accept charges under Pratiqo's readiness predicate?

Payout readiness answers:

> Can this connected Stripe account receive payouts under Pratiqo's readiness predicate?

They are independent:

- A teacher can be identity-verified with no Stripe Connect account.
- A teacher can have `charges_enabled = true` while Identity is not verified.
- A teacher can have `payouts_enabled = true` but still be marked not ready if stored requirements are non-empty.
- A teacher can be visible/public while payment readiness is incomplete; the UI warns rather than necessarily hiding the profile.

## 16. Top Likely Root Causes Ranked by Probability

### 1. P1: Eventual/future Connect requirements are treated as active blockers

Evidence:

- `connectStatusFromStripeAccount` stores `requirements.currently_due`, `requirements.eventually_due`, `requirements.past_due`, and `future_requirements.*` into one `stripe_connect_requirements_due` array.
- `teacherPaymentReadinessFailureReasons`, `teacherPayoutReadinessContractFailureReasons`, and `teacherPayoutReadinessFailureReasons` treat any non-empty array as `requirements_due`.

Why this matters:

- Stripe distinguishes requirements that are due now from requirements that may become due later.
- Collapsing eventual/future requirements into a blocking field can make most non-founder teachers look inactive even when Stripe allows current charges/payouts.

Stripe source:

- [Stripe Connect: Handle verification with the API](https://docs.stripe.com/connect/handling-api-verification)
- [Stripe Connect: Handle verification updates](https://docs.stripe.com/connect/handle-verification-updates)

### 2. P1: Connected account webhook may not be configured in production

Evidence:

- Code handles `account.updated`.
- Repository cannot prove Stripe Dashboard destination is set to receive Connected accounts events.

Why this matters:

- If production webhook only receives platform events, teacher Connect status will remain stale unless manually refreshed by route calls.

Stripe source:

- [Stripe Connect Accounts v2 migration docs: webhook events from connected accounts](https://docs.stripe.com/connect/accounts-v2/migrate-integration)

### 3. P1: Return flow may not refresh Connect status

Evidence:

- `GET /api/stripe/connect` syncs, but no clear post-return UI call was found.
- Return URL is `/onboarding?stripe=success`, which may not be the same place as the account/payment settings UI.

Why this matters:

- If webhook delivery is delayed or misconfigured, completion will not be visible until a later explicit refresh.

### 4. P2: Admin surfaces use inconsistent readiness definitions

Evidence:

- Admin users and Teacher 360 use strict readiness contracts.
- Admin overview and booking payment operations use account/onboarding/charges only.

Why this matters:

- Admin can see conflicting payment activation counts and statuses.

### 5. P1/P2: Checkout requires payout readiness, not only charge readiness

Evidence:

- `app/api/stripe/checkout/route.ts` uses `isTeacherPayoutReadyForCheckout`.

Why this matters:

- Conservative launch behavior is understandable, but over-strict or stale payout fields will block student payment even when charges could technically be accepted.

### 6. P2: Country support and hardcoded CA need tighter diagnostics

Evidence:

- Market config launches Canada and marks Uruguay as next market with payouts disabled.
- Connect account creation hardcodes `country: "CA"`.
- `GET /api/stripe/connect` uses only teacher country; `POST` falls back to profile country.

Why this matters:

- Empty teacher country or profile country blocks Connect. Future non-CA markets would need explicit changes before payout activation.

### 7. P2: Identity webhook can match zero rows

Evidence:

- Identity webhooks update by `metadata.user_id`.
- Logs warn when zero rows are updated.

Why this matters:

- If teacher row creation fails/races or metadata is missing, Identity can appear completed in Stripe but not in Pratiqo.

## 17. Top Data Inconsistencies to Check in Production

Run `docs/payments/stripe-connect-production-diagnostics.sql` in Supabase SQL editor.

High-signal checks:

1. Teachers with `stripe_account_id` but `stripe_connect_last_synced_at is null`.
2. Teachers with `charges_enabled = true` and/or `payouts_enabled = true` but `stripe_connect_requirements_due` non-empty.
3. Teachers with `stripe_connect_requirements_due` containing names that correspond to Stripe eventual/future requirements when checked in the Stripe Dashboard.
4. Teachers with `stripe_connect_disabled_reason` populated.
5. Teachers with profile country or teacher country empty/non-CA.
6. Teachers with `stripe_identity_status = verified` but `identity_verified != true`, or vice versa.
7. Teachers with Identity complete but no Stripe Connect account.
8. Teachers with Connect account but no recent sync.

## 18. Top Stripe Dashboard Settings to Check Manually

1. Production webhook endpoint URL points to Pratiqo production `/api/stripe/webhook`.
2. Endpoint uses the production signing secret configured in Vercel.
3. Endpoint receives live-mode events.
4. Endpoint subscribes to connected account events, not only platform account events.
5. Connected account event `account.updated` is enabled.
6. Identity events are enabled:
   - `identity.verification_session.verified`
   - `identity.verification_session.requires_input`
   - `identity.verification_session.canceled`
7. Failed webhook delivery/retry logs for recent teacher onboarding completions.
8. For affected teachers, inspect Stripe account:
   - `details_submitted`
   - `charges_enabled`
   - `payouts_enabled`
   - `requirements.currently_due`
   - `requirements.past_due`
   - `requirements.eventually_due`
   - `future_requirements.*`
   - `requirements.disabled_reason`

## 19. Risks of Current Logic

### P0/P1: Legitimate bookings can be blocked by stale or over-strict Connect readiness

Because checkout requires full payout readiness, stale DB state or eventual/future requirements can prevent payment even when the account may currently charge.

### P1: False admin "not activated" status

Teacher 360/admin users can report payment/payout false from collapsed requirements even when Stripe booleans are true.

### P2: Admin cannot see enough blockers

Admin sees counts and booleans but not exact requirement buckets, last sync time, or requirement names.

### P2: Stale status depends on webhook/dashboard setup

The code has a refresh route, but no obvious return-flow refresh and no admin refresh action.

### P2: Identity and Connect can be confused operationally

Identity is a trust/compliance workflow; Connect is a payment/payout workflow. Some admin/user copy should keep them visually separated.

### P3: Placeholder teacher creation is duplicated

`POST /api/stripe/connect` can create a teacher row with its own defaults instead of using the canonical helper.

## 20. Recommended Safe Next PR Plan

Recommended next implementation PR:

### Option A first: Admin read-only Stripe Connect diagnostics

Add admin-only diagnostics without changing checkout behavior:

- expose `stripe_connect_last_synced_at`
- expose safe account existence only, not full account id by default
- expose exact blockers:
  - no account
  - onboarding incomplete
  - charges disabled
  - payouts disabled
  - disabled reason
  - stale sync
- if schema is unchanged, show the collapsed requirements names with a warning that bucket origin is unknown
- add a manual "Refresh Stripe status" action only for admins or teachers if product-approved

### Option B second: Fix readiness storage/model

Create a migration and code change that separates:

- `stripe_connect_currently_due`
- `stripe_connect_past_due`
- `stripe_connect_eventually_due`
- `stripe_connect_future_requirements_due`
- `stripe_connect_pending_verification`
- `stripe_connect_disabled_reason`
- `stripe_connect_last_synced_at`

Then define:

- `paymentReady`: should primarily follow `charges_enabled`, active due/past-due blockers, pending verification if needed, and disabled reason.
- `payoutReady`: should follow `payouts_enabled`, active due/past-due blockers, pending verification if needed, and disabled reason.
- eventual/future requirements should be displayed as warnings, not active blockers, unless Stripe reports them as currently/past due.

### Option C third: Return-flow and webhook reliability

- Add explicit status refresh after `/onboarding?stripe=success`.
- Confirm Stripe Dashboard connected-account webhook configuration.
- Add tests around `account.updated` sync and return-flow refresh.

### Option D fourth: Reconsider checkout gate semantics

Only after diagnostics:

- decide whether booking checkout should require payment readiness only (`charges_enabled`) or full payout readiness.
- if payout readiness remains required, keep current conservative behavior but improve copy and admin tooling.

## Stripe Documentation References

- [Stripe Connect: Handle verification with the API](https://docs.stripe.com/connect/handling-api-verification)
- [Stripe Connect: Handle verification updates](https://docs.stripe.com/connect/handle-verification-updates)
- [Stripe Connect: Accounts webhook events from connected accounts](https://docs.stripe.com/connect/accounts-v2/migrate-integration)
- [Stripe Identity Verification Sessions](https://docs.stripe.com/identity/verification-sessions)
