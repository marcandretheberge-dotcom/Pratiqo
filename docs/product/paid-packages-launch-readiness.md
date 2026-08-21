# Paid packages — launch readiness

Internal ops / admin gate for controlled preview of teacher-offered packages (forfaits).

This document does **not** enable packages in production and is **not legal advice**.

Related:

- [`marketplace-independent-teacher-guardrails.md`](./marketplace-independent-teacher-guardrails.md)
- [`paid-packages-legal-launch-checklist.md`](./paid-packages-legal-launch-checklist.md)
- [`package-feature-flags.md`](./package-feature-flags.md)
- [`package-product-decision.md`](./package-product-decision.md) — Phase 1 planned packages first
- [`paid-packages-launch-checklist.md`](./paid-packages-launch-checklist.md)
- Admin page: `/admin/package-launch-readiness`

```
Legal review required before public paid package launch.
Québec legal counsel should review Terms of Use, teacher terms, payment flow wording, and package policy wording before enabling paid packages broadly.
```

## Required flags (defaults OFF)

| Flag | Role |
|------|------|
| `NEXT_PUBLIC_ENABLE_BOOKING_OFFER_SELECTION` | Choose offer at booking |
| `ENABLE_OFFER_SNAPSHOT_CHECKOUT` | Charge booking offer snapshot |
| `ENABLE_PACKAGE_ENTITLEMENTS` | Create entitlement after paid package checkout |
| `ENABLE_PACKAGE_REDEMPTION_BOOKING` | Redeem a package session as a booking |
| `ENABLE_STUDENT_PACKAGE_DASHBOARD` | Student “Mes forfaits” API |
| `NEXT_PUBLIC_ENABLE_STUDENT_PACKAGE_DASHBOARD` | Student nav/UI |
| `ENABLE_TEACHER_PACKAGE_VISIBILITY` | Teacher packages API |
| `NEXT_PUBLIC_ENABLE_TEACHER_PACKAGE_VISIBILITY` | Teacher nav/UI |

Optional ops signal (never auto-set by app):

| Flag | Role |
|------|------|
| `PACKAGE_LEGAL_REVIEW_COMPLETED=true` | Explicit counsel sign-off recorded in env (admin readiness only) |

Without this signal, readiness status never claims production readiness.

## Recommended preview environment

1. Staging / preview only (not production).
2. Enable in order:
   - booking offer selection
   - offer snapshot checkout
   - package entitlements
   - (optional) redemption booking
   - (optional) student/teacher dashboards
3. Keep Stripe in test mode.
4. Keep commission/payout/refund logic unchanged.
5. Confirm admin readiness page shows no **critical** blockers.

## Manual QA script

### Stripe test checklist

- [ ] Stripe test keys only
- [ ] Teacher Connect account ready for test charges
- [ ] Checkout uses booking offer snapshot (not live `teacher_offers`)
- [ ] Successful package payment creates entitlement once

### Package purchase QA

- [ ] Teacher publishes a package offer
- [ ] Student selects package offer at booking (flag ON)
- [ ] Checkout amount matches snapshot
- [ ] Entitlement shows correct total/remaining sessions

### Package redemption QA

- [ ] Student redeems a session with the **same** teacher
- [ ] Balance decrements atomically
- [ ] No Stripe charge for package-credit booking

### Package cancellation / reversal QA

- [ ] Cancel/decline before completion restores credit
- [ ] Completed redemption is not restored
- [ ] Copy: séance remise dans le forfait

### Student dashboard QA

- [ ] Mes forfaits shows teacher-proposed package wording
- [ ] No balance mutation controls

### Teacher visibility QA

- [ ] Forfaits achetés avec vous lists only that teacher’s entitlements
- [ ] No credit adjustment buttons

### Admin support QA

- [ ] Booking/payment admin shows offer snapshot / package_credit source
- [ ] `/admin/package-launch-readiness` lists all flags, no toggles

### Marketplace / legal copy QA

- [ ] No “Forfaits Pratiqo” / “Nos forfaits Pratiqo”
- [ ] No salary/employer wording
- [ ] Packages framed as teacher-proposed
- [ ] Payment facilitated by Pratiqo / platform fee language

## Final legal review gate

Do **not** enable package flags in production until:

1. [`paid-packages-legal-launch-checklist.md`](./paid-packages-legal-launch-checklist.md) items are completed with counsel.
2. Marketplace copy guard tests pass (`npm run test:offers`).
3. Admin readiness status is not `blocked`.
4. Ops explicitly sets `PACKAGE_LEGAL_REVIEW_COMPLETED=true` only after counsel sign-off (optional env signal).
