# Planned package public launch activation

**Status:** Operational activation guide. Not legal advice. Not public marketing copy.  
**Depends on:** [`planned-package-public-launch-gate.md`](./planned-package-public-launch-gate.md)

This document activates the planned package system through **environment configuration**. Code still requires explicit `=== "true"` env values and keeps safety gates (legal review, learner/teacher terms, Stripe readiness).

---

## Exact flags to set ON

```
ENABLE_PLANNED_PACKAGES=true
NEXT_PUBLIC_ENABLE_PLANNED_PACKAGES=true
ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS=true
NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS=true
ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT=true
NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT=true
ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS=true
NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS=true
ENABLE_PLANNED_PACKAGE_FULFILLMENT_ENGINE=true
ENABLE_PLANNED_PACKAGE_STRIPE_CHECKOUT=true
NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_STRIPE_CHECKOUT=true
ENABLE_PLANNED_PACKAGE_ADMIN_OPS=true
ENABLE_PLANNED_PACKAGE_REFUND_QUOTES=true
ENABLE_PLANNED_PACKAGE_REFUND_ADMIN_REVIEW=true
ENABLE_PLANNED_PACKAGE_MANUAL_REFUNDS=true
ENABLE_PLANNED_PACKAGE_PAYOUT_ELIGIBILITY_LEDGER=true
ENABLE_PLANNED_PACKAGE_PAYOUT_ADMIN_VIEW=true
ENABLE_PLANNED_PACKAGE_MANUAL_TRANSFERS=true
ENABLE_PLANNED_PACKAGE_MANUAL_TRANSFER_REVERSALS=true
ENABLE_PLANNED_PACKAGE_E2E_QA_TOOLS=true
ENABLE_STUDENT_PLANNED_PACKAGE_DASHBOARD=true
NEXT_PUBLIC_ENABLE_STUDENT_PLANNED_PACKAGE_DASHBOARD=true
ENABLE_TEACHER_PLANNED_PACKAGE_DASHBOARD=true
NEXT_PUBLIC_ENABLE_TEACHER_PLANNED_PACKAGE_DASHBOARD=true
ENABLE_PLANNED_PACKAGE_PUBLIC_PURCHASE=true
NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_PUBLIC_PURCHASE=true
PLANNED_PACKAGE_LAUNCH_MODE=public_ready
```

Helper: `lib/offers/plannedPackageLaunchProfile.ts` → `getPlannedPackageLaunchFlagProfile()`.

---

## Legal review confirmation step

Do **not** set until counsel has signed off:

```
PACKAGE_LEGAL_REVIEW_COMPLETED=true
```

Without it, production public purchase remains blocked even when all other flags are ON. Admin readiness must show: **Public launch blocked: legal review required**.

Never hardcode a false legal attestation in application code.

---

## Stripe test-to-live checklist

1. Confirm Stripe **live** keys on production only after legal review.
2. Confirm webhook endpoint receives `checkout.session.completed` for planned packages.
3. Confirm Connect accounts for teachers selling packages are charges/payout ready.
4. Staging: keep test keys + optional `ENABLE_PLANNED_PACKAGE_CHECKOUT_TEST_MODE` when legal review is not yet set.
5. Never commit live secret keys or webhook secrets to git.

---

## Webhook verification

- Endpoint configured and signed with `STRIPE_WEBHOOK_SECRET`
- Planned package fulfillment still creates bookings only after payment confirmation
- No automatic transfer/refund/reversal on webhook

---

## Teacher canary fallback

If a soft launch is needed instead of full public:

```
PLANNED_PACKAGE_LAUNCH_MODE=limited_teacher_canary
PLANNED_PACKAGE_CANARY_TEACHER_IDS=<uuid,...>
PLANNED_PACKAGE_CANARY_OFFER_IDS=<uuid,...>
```

Empty allowlist ⇒ canary purchase disabled.

---

## Support monitoring plan

- Watch `/admin/planned-package-launch-monitor` (first 72h checklist)
- Watch `/admin/planned-package-orders` for payment_confirmed / fulfillment_failed
- Watch refund quote queue and payout eligibility admin review
- Support contact remains `info@pratiqo.ca` (public copy)
- Manual refund / transfer / reversal only via admin after confirmation

See [`planned-package-launch-monitoring.md`](./planned-package-launch-monitoring.md).

---

## Rollback plan

### Emergency rollback (stop new public purchases)

```
ENABLE_PLANNED_PACKAGE_PUBLIC_PURCHASE=false
NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_PUBLIC_PURCHASE=false
```

### Full package visibility rollback

```
ENABLE_PLANNED_PACKAGES=false
NEXT_PUBLIC_ENABLE_PLANNED_PACKAGES=false
```

### Dashboard-only rollback

```
ENABLE_STUDENT_PLANNED_PACKAGE_DASHBOARD=false
NEXT_PUBLIC_ENABLE_STUDENT_PLANNED_PACKAGE_DASHBOARD=false
ENABLE_TEACHER_PLANNED_PACKAGE_DASHBOARD=false
NEXT_PUBLIC_ENABLE_TEACHER_PLANNED_PACKAGE_DASHBOARD=false
```

Expected after rollback:

- existing confirmed bookings remain in the database;
- new package purchases stop;
- admin ops remain available if admin flags stay ON;
- holds expire normally;
- no destructive rollback / no financial record deletion.

---

## Manual QA steps

### Flags ON, legal review missing

1. Admin readiness shows public launch flags enabled.
2. Admin readiness shows legal review blocker.
3. Public CTA remains blocked for purchase.
4. Checkout remains blocked.

### Flags ON, legal review true (staging)

1. Public package CTA appears for eligible published package offers.
2. Learner must accept package terms.
3. Teacher must have accepted package terms before publishing.
4. Draft → preflight → pending order → Stripe Checkout works.
5. Webhook fulfillment creates package bookings.
6. Student / teacher dashboards show the package.
7. Admin ops shows the order.
8. No automatic payout/refund/reversal; manual admin actions still required.

---

## Safety gates that remain active

- Legal review
- Learner package terms consent
- Teacher package terms acknowledgment
- Teacher Stripe payment readiness
- Offer publication + ownership/auth
- Admin-only money movement
