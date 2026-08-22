# Teacher planned package dashboard

**Status:** Read-only teacher visibility for sold planned packages.  
**Not legal advice.** Does **not** enable public package launch.

Related:

- [`package-product-decision.md`](./package-product-decision.md)
- [`student-planned-package-dashboard.md`](./student-planned-package-dashboard.md)
- [`package-feature-flags.md`](./package-feature-flags.md)
- Route: `/teacher/packages`
- API: `GET /api/teacher/planned-packages`

---

## Teacher-facing scope

Authenticated teachers can view **planned package orders sold with them**:

- learner display name;
- package title snapshot;
- teacher-safe package status;
- scheduled / upcoming / completed / remaining sessions;
- payout eligibility status per completed session (high-level);
- high-level transfer status (sent / reversed / processing);
- high-level cancellation / refund / reversal review status;
- Stripe Connect payment-setup warning when readiness is incomplete.

## Read-only

This surface answers visibility questions only. It does **not**:

- execute teacher self-serve payouts / transfers;
- execute teacher self-serve refunds;
- execute teacher self-serve transfer reversals;
- expose student/admin financial internals;
- launch packages publicly;
- bypass legal review.

UI copy states explicitly that the page does not let teachers execute a transfer and does not show internal admin details.

## Safe statuses

```
package_pending_confirmation
sessions_confirmed
in_progress
completed
cancellation_under_review
refund_under_review
payout_not_yet_eligible
payout_eligible
payout_under_review
transfer_processing
transfer_sent
transfer_reversed
issue_under_review
payment_setup_required
```

Admin blocker codes are never shown to teachers. Uncertain states map to `issue_under_review`.

## Payout eligibility visibility

Allowed:

- not yet eligible / eligible / under review;
- estimated teacher amount already computed on eligibility (teacher-safe);
- currency.

Not allowed:

- admin execute transfer button;
- platform fee breakdown unless already approved elsewhere;
- raw Stripe transfer / payment intent / checkout / refund ids;
- admin notes / reconciliation blocker details.

## Transfer visibility

Allowed high-level labels: transfer processing, transfer sent, transfer reversed, processed date when available in safe DTO fields.

Not allowed: raw Stripe transfer ids, transfer reversal ids, connected-account balances, admin reversal execution.

## Cancellation / refund visibility

High-level only:

- Cancellation under review
- Refund under review
- Situation under review

No quote approval UI, no refund execution, no dispute workflow in this PR.

## Hidden internals

DTO must exclude:

- `stripe_payment_intent_id`
- `stripe_checkout_session_id`
- `stripe_refund_id`
- raw `stripe_transfer_id`
- `stripe_transfer_reversal_id`
- admin notes
- internal reconciliation blockers
- service-role-only data

## Feature flags

```
ENABLE_TEACHER_PLANNED_PACKAGE_DASHBOARD=true
NEXT_PUBLIC_ENABLE_TEACHER_PLANNED_PACKAGE_DASHBOARD=true
```

Defaults **OFF**. Server authorization uses the server flag only.

Nav “Mes forfaits vendus” appears when this UI flag **or** the entitlement teacher packages UI flag is ON.

## Future PR

- Teacher package session management / messaging
- Teacher cancellation response workflow (product + legal approval required)

Public launch still requires `PACKAGE_LEGAL_REVIEW_COMPLETED` after counsel review.
Legal review is still required before public launch.
