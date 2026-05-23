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

## Findings fixed in a follow-up PR

### D1. Direct anon/authenticated reads of `public.teachers` can leak `stripe_account_id`, `diploma_url`, and workflow internals  → **FIXED**

Follow-up branch: `fix/teacher-public-read-isolation`.
Follow-up migration: `supabase/migrations/070_teachers_public_read_isolation.sql`.
Follow-up tests: `tests/security/teacherPublicReadIsolation.test.ts` (15 deterministic cases).

What was exposed before:

- The base `public.teachers` table granted SELECT to `anon`/`authenticated` and the `teachers_select_public` policy let any active public teacher row be read in full. That meant a browser could `supabase.from("teachers").select("stripe_account_id, stripe_connect_charges_enabled, stripe_identity_status, phone_verified, identity_status, diploma_url, location_verification_*, cv_verification_status, location").eq("id", anyTeacherId)` and pull Stripe Connect/Identity workflow internals, the storage path to the teacher's diploma PDF, the address-verification audit trail, and the `location.private` block (exact street + private coordinates) for any teacher offering at-home lessons.
- The previous `teachers_public` view ran with `security_invoker = true`, so it inherited the same broad base-table SELECT — it just trimmed the columns at the view layer. The base table was still queryable directly.

What was fixed:

1. **Migration 070 tightens base RLS.** `teachers_select_public` is dropped and replaced with `teachers_select_owner_or_history`:

    ```sql
    USING (
      auth.uid() = user_id
      OR public.user_has_teacher_history(teachers.id, auth.uid())
    )
    ```

    Anon and unrelated authenticated readers can no longer SELECT any column on `public.teachers` directly. The owner-self path (teacher dashboard, account settings, verification page, onboarding) still works, and the existing history-based path (students who actually booked or registered for a group session with this teacher) still works for in-app reads of teacher data tied to real relationships. Service-role bypasses RLS automatically, so webhooks/admin/cron are unaffected.

2. **Migration 070 rebuilds `teachers_public` as `SECURITY DEFINER`** (`WITH (security_invoker = false)`). Public marketplace surfaces keep working because the view runs as its owner role and the view's WHERE clause is now the only public-read gate. The new column list intentionally **omits**:

    - `stripe_account_id`, `stripe_connect_*`, `stripe_identity_*` (4 fields), `stripe_identity_status`
    - `phone_verified`, `identity_status` (raw enum)
    - `diploma_url` (storage path to the private `teacher-diplomas` PDF)
    - `location_verification_status`, `location_verified_at`, `location_verification_method`
    - `cv_verification_status`

    Public trust signals now rely on the `identity_verified` / `diploma_verified` booleans that the Stripe Identity webhook and admin review flow set server-side. The view's `WHERE` also adds `COALESCE(t.identity_status, 'none') <> 'failed'` so failed verifications stay out of marketplace surfaces without needing to expose the raw enum.

3. **Migration 057 is downgraded from `RAISE EXCEPTION` to `RAISE NOTICE`.** 057 was a production-drift guard for a column we are now intentionally removing; the relaxed check still passes on production (which already passed it strictly) and unblocks fresh dev DBs from applying the 055 → 057 → 070 chain.

4. **Code hardening.** `lib/supabase/queries.ts::TEACHERS_LIST_SELECT` no longer requests the dropped columns. The three SEO server pages (`app/clases/montevideo/[barrioSlug]`, `app/cours/[disciplineSlug]/[citySlug]`, `app/tuteurs-prive/[citySlug]`) now read through `TEACHERS_PUBLIC_TABLE` and dropped `phone_verified` from their inline column lists, so they cannot serialize private workflow data into the static HTML payload shipped to anonymous crawlers. `components/marketing/TeacherQuiz.tsx` dropped its `.neq("identity_status", "failed")` filter (the view does this now).

5. **Regression tests.** `tests/security/teacherPublicReadIsolation.test.ts` enforces the migration shape (RLS, view definer mode, column allow-list, WHERE filter, grants), the queries.ts shape, the SEO/pre-booking surface usage of `TEACHERS_PUBLIC_TABLE`, and a broad source scan that flags any non-allowlisted file that reintroduces a public select of `phone_verified`, `identity_status`, `stripe_identity_status`, `diploma_url`, `location_verification_*`, or `cv_verification_status`. The scan allowlists the teacher-own and admin/Stripe-webhook surfaces that legitimately need full reads.

Intentional exception kept:

- The legacy `is_verified` boolean and `verification_level` integer remain in `teachers_public` because they have been part of public trust UI for the entire pre-launch period and existing search / SEO snapshots depend on them. They are coarse, intentionally public signals (not workflow internals).

Manual checks still required:

- After deploying migration 070, run a one-off check in the Supabase SQL editor as `anon` (via the dashboard's "SQL Editor → Run as anon"):

    ```sql
    select count(*) from public.teachers;            -- expect 0
    select count(*) from public.teachers_public;     -- expect > 0
    select stripe_account_id from public.teachers_public limit 1;  -- expect error: column does not exist
    ```

- Confirm the teacher dashboard, onboarding, account settings, and verification page still load while signed in as a teacher account (those surfaces depend on the owner-self read path of the new RLS policy).

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

This now also runs `npm run test:security` which includes:

- `rlsPolicyShape.test.ts` (5 cases) — base RLS lockdowns from migration 065 still hold.
- `productionAccessAudit.test.ts` (30 cases) — main production access audit (69 trigger, API guards, secrets, headers, redirects, storage, server/client boundary).
- `teacherPublicReadIsolation.test.ts` (15 cases) — D1 follow-up: base `public.teachers` is owner/history only, `teachers_public` is a SECURITY DEFINER projection with a narrow safe column list, no public-facing select re-introduces sensitive teacher columns.

The dedicated security suite can also be run on its own:

```bash
npm run test:security
```
