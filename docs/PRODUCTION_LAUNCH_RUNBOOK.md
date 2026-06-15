# Pratiqo Production Launch Runbook

Last reviewed: 2026-06-14

This runbook is the operator checklist for activating Stripe production and launching Pratiqo publicly. It contains no secrets and no live keys.

**Prerequisite phase**: before running this runbook, complete (in order)

1. the single-tester [`PRODUCTION_SMOKE_TEST.md`](./PRODUCTION_SMOKE_TEST.md) on real devices against the live deployment (~20–30 min), then
2. the **closed beta** per [`CLOSED_BETA_READINESS.md`](./CLOSED_BETA_READINESS.md) with 2–3 real teachers and 2–3 real students.

The smoke test is the founder's last pre-flight check; the closed beta is the cohort gate. Only proceed to the public launch sequence below if both passed on a clean release commit.

## 1. Current Launch-Relevant Operations State

Current repo wiring:

- Vercel cron in `vercel.json`: `/api/cron/bookings/complete` daily at `15 3 * * *`.
- GitHub Actions reminder scheduler: `.github/workflows/booking-reminders.yml`, calling `/api/cron/bookings/reminders` every 10 minutes.
- Both cron API routes require `CRON_SECRET`.
- Database backup/restore scripts exist as manual PowerShell scripts.
- Group-session checkout is gated and should remain disabled for launch.
- YoPratiqo paid checkout is not enabled.

Not currently wired:

- Automated offsite database backup job.
- Automated Supabase Storage backup job.
- Automatic production restore.

## 2. Pre-Launch Code Gate

Before deploying or enabling live payment traffic:

```powershell
git switch main
git pull --ff-only origin main
git status -sb
npm run validate:launch
npm run build
npm run test:launch-critical
npx tsx scripts/validate_i18n.ts
git diff --check
```

Gate requirements:

- `main` is up to date.
- Working tree is clean except approved local-only untracked files.
- `npm run validate:launch` passes.
- `npm run build` passes.
- `npm run test:launch-critical` passes.
- i18n validation passes.
- No conflict markers.
- No production data, backup dumps, or secrets are staged.

## 3. Vercel Environment Checklist

Set these in Vercel Project Settings. Never commit values.

Core app and Supabase:

- `APP_BASE_URL`
- `APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Stripe:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRO_MONTHLY_PRICE_ID`
- `STRIPE_CHECKOUT_BASE_URL`

Launch gates:

- `GROUP_SESSIONS_CHECKOUT_ENABLED=false`

Cron:

- `CRON_SECRET`

Email and admin operations:

- `RESEND_API_KEY`
- `ADMIN_VERIFICATION_EMAIL`
- `RESEND_ADMIN_EMAIL`
- `SUPPORT_EMAIL`
- `ADMIN_LOGIN_EMAILS`

Maps and optional services:

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`
- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`

If Stripe Tax launches:

- `PRATIQO_COLLECT_SALES_TAX`
- `PRATIQO_TAX_MODE`
- `STRIPE_TAX_CODE_PRIVATE_LESSONS`
- `PRATIQO_TAX_BILLING_ADDRESS_COLLECTION`

Verification:

- Confirm production envs are set for Production, not only Preview.
- Redeploy after changing build-time envs.
- Confirm no secret value appears in build logs.
- Keep the password manager entry updated with owner and rotation notes.

## 4. Database Backup Gate

Before Stripe live activation and before public launch:

```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\Backup-Database.ps1" -TestConnection
powershell -ExecutionPolicy Bypass -File ".\scripts\Backup-Database.ps1"
```

Checklist:

- Latest database backup exists.
- Backup file is private and not committed.
- Backup is copied to approved private storage.
- Storage bucket export/sync procedure has been verified.
- Restore rehearsal to staging has been completed or explicitly accepted as a launch risk.

## 5. Stripe Live Checklist

Stripe account:

- Business verification complete.
- Branding configured with Pratiqo name, support email, and production domain.
- Payout/bank account configured and verified.
- Live Membre Pro product exists.
- Live Membre Pro price is CAD 29.99/month.
- `STRIPE_PRO_MONTHLY_PRICE_ID` points to the live CAD monthly price.
- Test-mode keys are not present in production Vercel env.

Webhook endpoint:

- `https://www.pratiqo.ca/api/stripe/webhook`

Webhook events:

- `checkout.session.completed`
- `payment_intent.succeeded`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `account.updated`
- `transfer.failed`
- `charge.dispute.created`
- `identity.verification_session.verified`
- `identity.verification_session.requires_input`
- `identity.verification_session.canceled`

After creating the webhook:

- Copy the signing secret into Vercel as `STRIPE_WEBHOOK_SECRET`.
- Redeploy production.
- Send a test event from Stripe dashboard only after confirming the app logs show livemode visibility.
- Confirm webhook deliveries show 2xx responses.

## 6. Production Smoke Test

Public pages:

- `/`
- `/trouver-un-prof`
- `/tarifs`
- `/devenir-prof`
- `/devenir-professeur`
- `/yo`
- `/yo/langues`
- `/legal/cgu`
- `/legal/conditions-professeurs`

Auth:

- Login works.
- Signup works.
- Redirects are not open redirects.
- Teacher and student roles land on the expected dashboards.

Teacher onboarding:

- New teacher can reach onboarding.
- Profile management page loads.
- Avatar upload still works.
- Teacher profile visibility remains draft/private until launch rules are met.
- Country/market gate blocks unsupported teacher markets.
- At-home lesson safety/privacy copy is visible where expected.

Search and booking:

- `/student/search` loads real launch-eligible teachers only.
- Teacher photos show.
- Public names are masked.
- Currency display remains approximate/display-only.
- Booking modal opens.
- Home lesson address remains private and required for home lessons.

Stripe lesson checkout:

- Lesson checkout creates a Stripe Checkout Session with the expected amount.
- Webhook delivery records booking payment.
- Student dashboard shows payment/booking state.
- Teacher dashboard shows booking without releasing payout early.

Cancellation/refund path:

- Cancellation more than 24h before lesson shows eligible/refund or manual-review outcome.
- Cancellation less than 24h before lesson does not promise automatic refund.
- Exceptional review request creates a support/refund case.
- No UI says refund completed unless Stripe refund was created and recorded.

Membre Pro checkout:

- Upgrade page shows CAD 29.99/month plus taxes.
- Checkout requires renewal/legal consent.
- Stripe subscription creates successfully.
- Webhook updates subscription state.
- Stripe portal opens.
- Portal cancellation marks cancel-at-period-end behavior.
- No copy guarantees bookings, ranking, visibility, students, or income.

Out-of-scope launch surfaces:

- `GROUP_SESSIONS_CHECKOUT_ENABLED=false` is set.
- Group-session checkout cannot create sessions.
- YoPratiqo paid checkout remains unavailable.
- YoPratiqo free intros remain accessible.

## 7. Rollback Plan

Immediate rollback:

- Revert latest deployment in Vercel.
- Confirm the previous deployment is serving.
- Keep Stripe webhook endpoint active unless the deployed code cannot process events safely.
- If needed, temporarily disable checkout buttons or hide entry points.
- Keep group-session checkout disabled.
- Keep YoPratiqo paid checkout disabled.
- Pause ads, posters, email campaigns, and social launch pushes.
- Manually review Stripe payments and webhook deliveries during the incident window.
- Contact affected users when payment or booking state may be inconsistent.

Data rollback:

- Do not restore production database as a first response.
- Restore to staging first.
- Reconcile with Stripe before changing booking payment records.
- Production restore requires explicit approval.

## 8. Incident Checklist

Payment webhook failing:

- Check Stripe webhook delivery logs.
- Check Vercel logs for `/api/stripe/webhook`.
- Confirm `STRIPE_WEBHOOK_SECRET`.
- Replay failed webhooks only after code/config is fixed.

Checkout failing:

- Check Vercel logs for checkout route.
- Confirm `STRIPE_SECRET_KEY`.
- Confirm `STRIPE_CHECKOUT_BASE_URL`.
- Confirm teacher/booking data is complete.
- Disable checkout entry point if failures affect real users.

Booking created but payment missing:

- Check booking status.
- Check Stripe Checkout Session.
- Check webhook delivery for `checkout.session.completed`.
- Do not manually mark paid without matching Stripe evidence.

Payment created but booking missing:

- Check Stripe metadata.
- Search Vercel logs by Stripe session/payment intent id.
- Create support case for the user.
- Reconcile manually before issuing refunds or credits.

Refund failure:

- Confirm whether Stripe refund was created.
- If not created, do not tell user it completed.
- Open support/refund case.
- Check payment ledger status and transfer status.
- If transfer already happened, handle reversal/refund manually.

Email failure:

- Check Resend logs.
- Check route logs for email helper errors.
- Confirm user dashboard still shows the authoritative status.
- Resend manually only if content is still accurate.

Supabase outage:

- Check Supabase status.
- Pause marketing and checkout if writes are affected.
- Avoid retry loops that duplicate bookings or payments.

Vercel outage:

- Check Vercel status.
- Confirm DNS/domain status.
- Pause launch campaigns.

Stripe outage:

- Check Stripe status.
- Disable checkout entry points if payment creation is unreliable.
- Do not retry charges manually without user action.

## 9. Post-Launch Monitoring

Monitor at least daily during launch week:

- Stripe dashboard payments, refunds, disputes, subscriptions.
- Stripe webhook deliveries and failures.
- Vercel function logs and deployment health.
- Supabase logs and database resource usage.
- Support cases, especially refund/payout hold cases.
- Resend/email logs if email is enabled.
- Sentry if configured.
- PostHog if configured.
- Failed cron jobs:
  - Vercel `/api/cron/bookings/complete`.
  - GitHub Actions booking reminders workflow.

## 10. Launch Sign-Off Checklist

- Production database backup verified.
- Storage backup/export approach verified.
- `npm run validate:launch` passed on the release commit.
- Vercel production env checklist complete.
- Stripe live checklist complete.
- Webhook endpoint receives events.
- Smoke test complete.
- Rollback owner identified.
- Support response path ready.
- Marketing launch can proceed.
