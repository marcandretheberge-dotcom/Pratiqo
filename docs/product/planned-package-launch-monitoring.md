# Planned package launch monitoring

**Status:** Read-only admin observability after public launch activation.  
**Not legal advice.** Does **not** move money or mutate environment flags.

Related:

- [`planned-package-public-launch-activation.md`](./planned-package-public-launch-activation.md)
- [`planned-package-public-launch-gate.md`](./planned-package-public-launch-gate.md)
- [`paid-packages-launch-checklist.md`](./paid-packages-launch-checklist.md)
- Admin UI: `/admin/planned-package-launch-monitor`
- API: `GET /api/admin/planned-package-launch-monitor` (admin + admin ops)

---

## Purpose

Answer quickly in the first 72h after launch:

- Is public package purchase actually enabled?
- Are legal / terms / Stripe gates blocking?
- Are checkouts completing and webhooks arriving?
- Are bookings fulfilled and visible on student/teacher dashboards?
- Are payout eligibility / refund / transfer / reversal actions coherent?
- Is rollback available without destroying data?

---

## What the monitor shows

1. Launch gate status (mode, flags, legal review, terms required)
2. Recent package orders (last 25)
3. Checkout / webhook health
4. Fulfillment health
5. Dashboard visibility health
6. Refund health
7. Transfer / reversal health
8. Stuck states with recommended admin actions
9. Rollback checklist (copy-only; no env mutation buttons)

**Never displayed:** Stripe secret keys, webhook secrets, service-role keys, raw Stripe payloads, stack traces, bank data.

**Never executed:** automatic refunds, transfers, reversals, or env edits.

---

## First 72h monitoring checklist

1. Open `/admin/planned-package-launch-monitor` after each staging/production deploy.
2. Confirm launch mode `public_ready` and legal review state expected for the environment.
3. Complete one test purchase (staging) or watch first live purchase.
4. Confirm recent order appears; checkout → webhook → fulfillment path healthy.
5. Confirm student + teacher dashboards enabled and order visible to owners.
6. Complete one session; confirm payout eligibility health updates.
7. If refund/reversal needed, use **existing** order detail actions only.
8. Keep rollback env values ready (see below).

---

## Stuck-state meanings (selected)

| Code | Severity | Recommended action |
|------|----------|--------------------|
| `public_purchase_enabled_but_legal_review_missing` | critical | Do not falsify legal review; disable public purchase or complete counsel sign-off |
| `checkout_completed_order_not_payment_confirmed` | critical | Verify webhook + confirmation path |
| `payment_confirmed_not_fulfilled` | critical | Admin retry fulfillment on order detail |
| `fulfilled_order_missing_bookings` | critical | Inspect bookings; reconcile manually |
| `completed_booking_missing_payout_eligibility` | warning | Sync payout eligibility ledger |
| `refund_quote_approved_but_not_executed` | critical | Manual refund from order detail |
| `transfer_reversal_required_before_refund` | critical | Manual reversal then refund |
| `teacher_terms_missing_for_public_offer` | warning | Teacher must acknowledge package terms |
| `teacher_stripe_readiness_missing` | warning | Finish Connect readiness |
| `student_dashboard_disabled_while_public_purchase_enabled` | warning | Enable student dashboard flag |

---

## Support triage

1. Confirm blocker on launch monitor (legal vs webhook vs fulfillment vs financial).
2. Open linked order detail for money actions already implemented.
3. Contact learner/teacher only with safe public wording.
4. Escalate Stripe Connect readiness via `/admin/stripe-diagnostics`.

### What not to do manually

- Do not edit Stripe amounts by hand outside existing admin tools.
- Do not invent automatic crons.
- Do not set `PACKAGE_LEGAL_REVIEW_COMPLETED=true` without counsel.
- Do not disable admin ops while investigating open refunds/transfers.

---

## Rollback plan (copy-only)

```
ENABLE_PLANNED_PACKAGE_PUBLIC_PURCHASE=false
NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_PUBLIC_PURCHASE=false
```

Optional full UI hide:

```
ENABLE_PLANNED_PACKAGES=false
NEXT_PUBLIC_ENABLE_PLANNED_PACKAGES=false
```

Keep admin ops + dashboards ON when supporting existing customers.

---

## Stripe / webhook verification

- `STRIPE_SECRET_KEY` present (test or live as intended)
- `STRIPE_WEBHOOK_SECRET` present
- Monitor counts for checkout-complete without payment_confirmed and webhook_missing attention

## Dashboard visibility verification

- Student + teacher planned package dashboard flags ON while public purchase is ON
- Fulfilled orders link to existing owner-gated dashboards
