# Production access / security audit — pre-June launch

Branch: `fix/production-access-security-audit`
Scope: Supabase RLS, API authorization, secrets/env exposure, storage, CORS / redirects / security headers, server/client boundary, regression tests.
Out of scope (per instruction): Stripe checkout behavior, commission logic, payout math, refund logic, guarantee business logic, teacher badge logic, public teacher name masking logic, companion economy, landing page design.

This audit produced two narrow code fixes and one new regression-test suite. Nothing in this PR changes payment math, refund behavior, or any business rule.

---

## Critical findings fixed in this PR

### 1. Teachers could self-grant trust signals and Stripe Connect flags

Severity: **HIGH** (would let a malicious teacher fake verification / mark themselves payout-ready from the browser).

- The `public.teachers` table had RLS that gates rows (`auth.uid() = user_id` for writes), but Postgres RLS cannot police individual column values.
- Without a column guard, a teacher could call `supabase.from("teachers").update({ identity_verified: true, diploma_verified: true, verification_level: 5, stripe_connect_charges_enabled: true, … }).eq("id", myId)` from the browser and immediately fake every trust badge + bypass payout gating in admin/email logic.
- The same risk applied to the initial `INSERT` on onboarding (a brand-new user could insert with these flags pre-set).

Fix: new migration `supabase/migrations/069_teachers_preserve_sensitive_client_fields.sql` adds a `BEFORE INSERT OR UPDATE` trigger on `public.teachers`:

- For non-`service_role` JWTs (browser / API caller):
  - **INSERT** forces these columns to safe defaults (`false`, `0`, `NULL`, `'none'`, `'missing'`).
  - **UPDATE** copies these columns from `OLD`, silently undoing any client-supplied value.
- For `service_role` JWTs (webhooks, admin review API, cron jobs), the trigger short-circuits and writes pass through unchanged.

Protected columns: `identity_verified`, `diploma_verified`, `phone_verified`, `is_verified`, `verification_level`, `stripe_account_id`, `stripe_connect_*` (6 columns), `stripe_identity_*` (4 columns), `location_verification_*` (3 columns), `cv_verification_status`, `identity_status`, `deactivated_at`, `deleted_at`.

Test coverage: `tests/security/productionAccessAudit.test.ts` (`069 …` cases).

---

## Medium findings fixed in this PR

### 2. Missing defense-in-depth response headers

The site already shipped CSP, HSTS, and X-Frame-Options. Three common defenses were missing.

Fix: `next.config.ts` now adds, on every route:

- `X-Content-Type-Options: nosniff` — defense against MIME sniffing of avatar uploads (the `avatars` bucket is public-read).
- `Referrer-Policy: strict-origin-when-cross-origin` — prevents the full URL (which can include a sanitized `next` query string or a teacher slug) from leaking to third-party origins on outbound clicks.
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=()` — Pratiqo does not call any of these surfaces (Stripe handles payment inside its own iframe; Maps uses lat/lng we compute server-side). Disabling them reduces blast radius from XSS or a compromised third-party script.

Test coverage: `tests/security/productionAccessAudit.test.ts` (`next.config sets defense-in-depth response headers`).

---

## Regression tests added in this PR

New suite: `tests/security/productionAccessAudit.test.ts` (30 deterministic source-scan + unit checks). Wired into `npm run test:security` and `npm run validate:launch`.

Coverage summary:

- **RLS migrations**: `064` enables RLS on every sensitive public table; `065` keeps credit-transactions/chats/booking-update lockdowns; `038` keeps `booking_payments` writes closed; `045` keeps `support_cases` updates/deletes closed; `005` + `050` keep messages scoped to participants and gated on a booking relationship; `050` denies anon SELECT on `waitlist` (email harvest protection).
- **New `069` trigger**: UPDATE preserves all 13 protected `teachers` columns; INSERT forces safe defaults for 8 trust/Stripe columns; trigger is `BEFORE INSERT OR UPDATE`.
- **API guards**: `/api/admin/review` enforces `requireAdmin`; admin app layout calls `requireAdminPage` server-side; both cron routes use `verifyCronSecret`; `verifyCronSecret` reads only from `Authorization`/`x-cron-secret`; Stripe webhook calls `stripe.webhooks.constructEvent`; `/api/webhooks/review-published` requires `SUPABASE_WEBHOOK_SECRET`; `/api/messages/send` resolves `sender_id` from the server-validated user (never from the request body); `/api/support/cases` calls `canUserOpenCaseForBooking` + `inferSupportCaseRole`; `/api/bookings/[id]/cancel` verifies the actor is the booking's student or the teacher's `user_id`; `/api/teacher/pricing` resolves the teacher row via `auth.uid()`, never a client-supplied `teacherId`.
- **Secrets**: no `"use client"` file references `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CRON_SECRET`, `SUPABASE_WEBHOOK_SECRET`, or `RESEND_API_KEY`. No `console.log` prints the raw value of any of these envs (the existing `Boolean(process.env.STRIPE_SECRET_KEY)` presence-check is permitted).
- **Headers**: `next.config.ts` ships CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy. No `Access-Control-Allow-Origin: *` anywhere under `app/` or `lib/`.
- **Redirects**: `app/auth/callback/route.ts` always uses `resolvePostAuthRedirect` and anchors the final redirect to `requestUrl.origin`. `app/login/page.tsx` runs `sanitizeRelativeRedirectPath` on the `next` query param before forwarding to Google OAuth.
- **Server/client boundary**: no client component writes to `booking_payments`, `support_cases`, `teacher_credentials`, `credit_transactions`, or `review_reports`. No client component imports `getSupabaseAdmin` or references `service_role`.
- **Storage**: `avatars` bucket is public-read but all INSERT/UPDATE/DELETE policies require `storage.foldername(name)[1] = auth.uid()::text`. `teacher-diplomas` access is only granted via service-role signed URLs from the admin route, which gates on `requireAdmin`. Diploma uploads (`/api/teacher/diploma`) go through the service-role client, never directly from the browser.

A standalone scan script also exists for quick local checks: `npx tsx scripts/security-scan.ts`.

---

## Findings intentionally deferred (not fixed in this PR)

### D1. Direct anon/authenticated reads of `public.teachers` can leak `stripe_account_id` and `location.private`

- The `teachers_public` view (with `security_invoker = true`) correctly strips `stripe_account_id`, `stripe_connect_*` flags, and `location.private`, and is the consumer for all public marketing/search pages.
- However, the underlying `public.teachers` table still grants `SELECT` to `anon` and `authenticated` (the Supabase default), so a curious user could query the base table directly from the browser and read those columns for any row that passes `teachers_select_public` (i.e. any active public teacher).
- Concretely leaked fields: `stripe_account_id` (opaque `acct_…` id, not a credential), `location.private` (exact street address for teachers offering at-home lessons), Stripe Connect status booleans + Stripe Identity status enum.
- Why deferred: the proper fix is either (a) split `location` into `location_public` + `location_private` columns and revoke column SELECT on the private one, or (b) move public reads to a `SECURITY DEFINER` view and revoke base-table SELECT from `anon`/`authenticated`. Both are structural changes that touch the onboarding wizard, the teacher account settings page, and the Stripe Connect sync flow. None of the leaked fields are credentials. The trigger added in this PR closes the *write* side; the *read* side stays as-is for now.
- Recommended follow-up ticket: "Restructure teachers public/private surface so anon cannot read `location.private` or Stripe metadata from the base table."

### D2. Timing-safe compare for `CRON_SECRET` and `SUPABASE_WEBHOOK_SECRET`

- `lib/cron/auth.ts` and `app/api/webhooks/review-published/route.ts` both compare secrets with `===`.
- Vercel cron and Supabase webhooks call our endpoints from a small set of well-known IPs, the secrets are 32+ char random tokens, and Vercel terminates TLS, so practical timing-attack risk is very low.
- Easy upgrade in a future PR: swap to `crypto.timingSafeEqual`.

### D3. The `chats` table SELECT policy survives for read-only history

- `065` removed client INSERT/UPDATE on `chats`, but the legacy SELECT policy stays so old conversations still render in the inbox.
- New messaging always goes through `/api/messages/send` and writes only to `messages`. No action needed for the launch.

### D4. `learner_profiles` policies were not re-verified line-by-line

- RLS is enabled on `learner_profiles` (migration `064`), and the `bookings_insert_participants` policy in `065` checks `learner_profile_id` ownership before allowing the booking insert.
- Per-policy ownership of `learner_profiles` itself should be re-confirmed via the manual Supabase dashboard check (D7 below) since this audit prioritized the higher-blast-radius `teachers`/`bookings`/`booking_payments`/`messages` surfaces.

---

## Manual checks still required (cannot be enforced in code)

### M1. Supabase dashboard checks

1. **Storage → `teacher-diplomas` bucket** must be marked **Private** (`public = false`). The original migration `018_identity_status_diploma_url.sql` left this as a manual step (commented SQL). Re-confirm in the production project before launch.
2. **Database → Authentication → Email/SMS templates** should not echo the access token in any URL beyond the OAuth callback. Confirm the magic-link template uses `{{ .ConfirmationURL }}` only.
3. **API → Database → RLS** dashboard: spot-check that RLS is **enabled** (green check) on every table listed in `064_enable_rls_public_tables.sql`. The drift-guard `DO $$` block in `064` should keep this true going forward, but a one-time visual confirmation is worth 30 seconds.
4. **Auth → Providers → Google**: confirm authorized redirect URIs only include the production domain + Vercel preview pattern; remove any leftover `localhost` entries.
5. **Storage → policies → `storage.objects`**: confirm only the `avatars` + `teacher-diplomas` policies from `067_avatars_storage_bucket.sql` and `018_identity_status_diploma_url.sql` exist; no leftover demo policies allowing anon writes to other buckets.

### M2. Vercel project secrets

Confirm the following are present in **Production** and **Preview** environments (and only present there — never inlined in client code):

- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `CRON_SECRET`
- `SUPABASE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `ADMIN_LOGIN_EMAILS`

And these public-by-design envs (safe to ship to the browser):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — restrict by HTTP referrer in Google Cloud Console to the production domain.
- `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_SENTRY_DSN`

### M3. GitHub Actions secrets

The booking-reminders workflow (`.github/workflows/booking-reminders.yml`) uses `CRON_SECRET`. Confirm it exists in **Settings → Secrets and variables → Actions** for the repository and is not echoed in any workflow log step.

### M4. Stripe dashboard

- **Webhooks**: confirm the production endpoint (`/api/stripe/webhook`) is configured with the correct `STRIPE_WEBHOOK_SECRET` and subscribes only to the events the route handles (`checkout.session.completed`, `payment_intent.*`, `charge.dispute.created`, `transfer.failed`, `identity.verification_session.*`, `account.updated`).
- **Connect**: confirm "platform" branding/return URLs match production.

---

## Validation

Run from the repo root:

```bash
npm run validate:launch
```

This now also runs `npm run test:security` which includes the new 30-case `productionAccessAudit.test.ts` suite alongside the existing 5-case `rlsPolicyShape.test.ts`.

The dedicated security suite can also be run on its own:

```bash
npm run test:security
```
