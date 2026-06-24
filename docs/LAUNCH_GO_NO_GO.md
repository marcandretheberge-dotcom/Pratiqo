# Pratiqo Launch Go/No-Go Report

**Generated:** 2026-06-23  
**Base commit:** `6600fd0` — Merge pull request #250 (`fix/payment): enforce final checkout and webhook launch gates`)

---

## Verdict

**YELLOW** — Ready for controlled public launch after production environment and manual QA checks pass.

All automated code gates pass on `origin/main`. No launch-blocking code defects were found post-merge. Remaining work is operational: Vercel/Supabase/Stripe production configuration, live edge redirect polish, and manual QA.

---

## Automated validation

| Command | Result | Notes |
|---------|--------|-------|
| `git fetch origin` | **Pass** | |
| `git switch main` | **Skipped locally** | `main` checked out in worktree `C:/Users/Utilisateur/Documents/Codex/payment-trust-launch-hardening`; verified at `origin/main` @ `6600fd0` |
| `git pull` | **Pass** | `launch-readiness-sweep` reset to `origin/main` |
| `npm run validate:launch` | **Pass** | exit 0 (lint, auth, security, payments, launch-critical, currency, payment:safety, i18n, build) |
| `npm run test:payments` | **Pass** | includes `paymentTrustLaunchHardening.test.ts` (9 tests) |
| `npm run payment:safety` | **Pass** | `[payment-reliability] OK` |
| `npm run check:seo-edge` | **Partial** | 4/5 live checks pass; apex `https://pratiqo.ca` returns **307** (not 301/308) to `https://www.pratiqo.ca/` — destination correct, status code mismatch vs script expectation |
| `git status -sb` | **Clean** | tracked tree clean; untracked `docs/LAUNCH_READINESS_ANALYSIS.md`, legal zip only |

### Code contract verification (static, on `6600fd0`)

| Control | Status |
|---------|--------|
| Checkout payout gate before `stripe.checkout.sessions.create` | **Pass** — `isTeacherPayoutReadyForCheckout(typed)` @ line ~245, session create @ ~474 |
| Production test-mode webhook rejection before handlers | **Pass** — `isProductionWebhookRuntime() && event.livemode === false` → HTTP 400 @ ~629–638 |
| Cookie consent gates analytics | **Pass** — `hasAnalyticsConsent()` in `lib/analytics/posthog.ts`, `tests/privacy/cookieConsent.test.ts` |
| Rate limits fail closed in production | **Pass** — `lib/rateLimit.ts`, `tests/security/rateLimitProduction.test.ts` |
| Teacher public read isolation | **Pass** — `tests/security/teacherPublicReadIsolation.test.ts`; `teachers_public` excludes sensitive columns |
| Group sessions noindex/excluded while disabled | **Pass** — `isGroupSessionsMarketplaceIndexable()` false by default; sitemap/layout tests |
| Teacher-diplomas private-first | **Pass** — `lib/teachers/diplomaStorage.ts`, `tests/security/teacherDiplomaStoragePrivacy.test.ts` |

---

## Production env items still requiring manual verification

Do not commit secrets. Confirm **present / correct** in Vercel **Production**:

| Category | Variables / settings |
|----------|---------------------|
| **Supabase** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only); Auth redirect URLs → `https://www.pratiqo.ca/**` |
| **Stripe** | `STRIPE_SECRET_KEY` (live `sk_live_*`), `STRIPE_WEBHOOK_SECRET` (live endpoint), `STRIPE_CHECKOUT_BASE_URL=https://www.pratiqo.ca`, Connect live mode enabled |
| **Stripe gates** | `GROUP_SESSIONS_CHECKOUT_ENABLED=false`; Membre Pro `STRIPE_PRO_MONTHLY_PRICE_ID` unchanged (live price) |
| **Rate limiting** | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — required; production fails closed without Redis |
| **PostHog** (if enabled) | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`; CSP `connect-src` includes PostHog host |
| **Sentry** (if enabled) | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`; errors-only minimal client, no Replay |
| **App URLs** | `APP_BASE_URL=https://www.pratiqo.ca` |
| **Domain** | Apex `pratiqo.ca` → `www.pratiqo.ca` (prefer **308** permanent at Vercel Domains; live check saw **307**) |

---

## Supabase SQL checks required

Run in production SQL editor:

1. **Migration 085 applied** — `student_onboarding_consents` RLS hardened (`085_harden_student_onboarding_consents_rls.sql`).
2. **RLS enabled** on core tables: `profiles`, `teachers`, `bookings`, `booking_payments`, `messages`, `student_onboarding_consents`, etc.
3. **`spatial_ref_sys`** — documented PostGIS exception only (not a general RLS gap).
4. **Storage** — `teacher-diplomas` bucket `public = false`.
5. **`teachers_public` view** — no `identity_status`, `diploma_url`, `stripe_account_id`, `stripe_connect_*` columns.
6. **No public diploma URLs** — `teachers.diploma_url` must not contain `/object/public/teacher-diplomas/`.
7. **Anon** — no SELECT on `student_onboarding_consents`.

---

## Stripe live checks required

Manual only — **no live charges without explicit approval**.

| Check | Expected |
|-------|----------|
| Teacher Connect onboarding (CA) | Account syncs; `stripe_connect_*` flags update |
| Teacher not payout-ready | Checkout **409** `teacher_payout_not_ready` — no Stripe session |
| Teacher payout-ready | Checkout session created; webhook confirms booking |
| Live webhook | Signature verifies; booking → `confirmed` |
| Test-mode webhook to prod endpoint | **400** rejection; no booking mutation |
| Duplicate webhook delivery | Idempotent confirm |
| User-facing errors | Localized messages, no raw Stripe internals |

**Optional (explicit approval):** small live checkout with payout-ready test teacher → confirm webhook → cancel/refund path.

---

## Manual QA matrix

| Persona | Priority flows |
|---------|----------------|
| **Public visitor** | Homepage, `/trouver-un-prof`, search (coach/cuisine/arts martiaux/danse), subject landings, `/yo` Spanish RD paths, cookie banner (accept / necessary-only / manage) |
| **Student** | Google login, companion + consent gate, under-14 block, search → profile → booking modal, checkout blocked if teacher not payout-ready, checkout OK if payout-ready, first-lesson guarantee visible pre-payment |
| **Teacher** | Onboarding draft, visibility card, publish/unpublish, unpublished hidden from search, owner preview, Connect payout setup |
| **Admin** | Dashboard access, non-admin blocked, role management, founder promo / badge controls if used |
| **SEO** | `/robots.txt`, `/sitemap.xml`, no `/group-sessions` when disabled, apex→www, canonical `https://www.pratiqo.ca` |

---

## Remaining blockers

**None in code** on `6600fd0`.

**Non-blocking operational items:**

- Production env vars not verified from this run (Vercel dashboard required).
- Supabase production SQL checklist not executed here.
- Manual QA matrix not executed here.
- Live apex redirect uses **307** instead of preferred **301/308** (destination is correct).

---

## Final recommendation

**Ready for controlled public launch after production environment and manual QA checks pass.**

Merge order complete: PR #249 (rate limits, diploma privacy, group SEO), PR #248 (teacher public read isolation), PR #250 (checkout payout gate + production test-mode webhook rejection). Run post-deploy smoke: `npm run check:seo-edge`, cookie consent in Chrome/Safari, one payout-ready checkout in Stripe test or approved live test, and confirm Upstash env vars on Production.

---

## Post-deploy smoke checklist

- [ ] `https://www.pratiqo.ca/` loads; apex redirects to www
- [ ] `/robots.txt` and `/sitemap.xml` return 200
- [ ] Cookie banner; no PostHog before consent
- [ ] Teacher publish/unpublish works
- [ ] Student checkout blocked for non-payout-ready teacher (409)
- [ ] Student checkout succeeds for payout-ready teacher (test or approved live)
- [ ] Admin gate works

## Rollback checklist

- [ ] Vercel: promote previous production deployment
- [ ] Stripe: disable live webhook if webhook regression suspected
- [ ] Do not auto-rollback Supabase migrations without data review
- [ ] Pause new teacher publish; support handles in-flight bookings manually
