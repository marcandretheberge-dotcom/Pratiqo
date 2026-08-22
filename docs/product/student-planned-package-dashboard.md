# Student planned package dashboard

**Status:** Read-only learner visibility for planned packages.  
**Not legal advice.** Does **not** enable public package launch.

Related:

- [`package-product-decision.md`](./package-product-decision.md)
- [`planned-package-e2e-staging-qa.md`](./planned-package-e2e-staging-qa.md)
- [`package-feature-flags.md`](./package-feature-flags.md)
- Route: `/student/packages`
- API: `GET /api/student/planned-packages`

---

## Scope

Authenticated students can view **their own** planned package orders:

- package title (snapshot);
- teacher display name / public profile link;
- student-safe status;
- session counts (confirmed / completed / remaining);
- next upcoming session;
- session list with dates;
- high-level cancellation/refund review status;
- support CTA (`/resolution`).

## Explicit non-goals

- Learner self-serve refund execution
- Learner self-serve cancellation with automatic refund
- Teacher payout / transfer / reversal visibility
- Stripe payment intent / checkout / refund / transfer ids
- Platform fee or teacher net amounts
- Admin reconciliation blockers
- Public package launch
- Legal review bypass

## Feature flags

```
ENABLE_STUDENT_PLANNED_PACKAGE_DASHBOARD=true
NEXT_PUBLIC_ENABLE_STUDENT_PLANNED_PACKAGE_DASHBOARD=true
```

Defaults **OFF**. Server authorization uses the server flag only.

Nav “Mes forfaits” appears when this UI flag **or** the entitlement dashboard UI flag is ON.

## Safe statuses

```
payment_pending
payment_received
sessions_confirmed
in_progress
completed
cancellation_under_review
refund_under_review
refunded
issue_under_review
```

Admin blocker codes are never shown to students.

## Future

- Teacher planned package visibility (separate PR)
- Learner-initiated cancellation request (product + legal approval required)

Public launch still requires `PACKAGE_LEGAL_REVIEW_COMPLETED` after counsel review.
