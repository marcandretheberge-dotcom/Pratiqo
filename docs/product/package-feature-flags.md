# Package / offer feature flags

Defaults are **OFF** unless the environment explicitly sets the value to `true`.

Marketplace framing: packages are **offered by independent teachers**. Pratiqo is a technology intermediary (booking + payment facilitation + platform fee). This is not legal advice.

See also:

- [`paid-packages-launch-readiness.md`](./paid-packages-launch-readiness.md)
- [`paid-packages-legal-launch-checklist.md`](./paid-packages-legal-launch-checklist.md)
- Admin: `/admin/package-launch-readiness`

## Flags

### `ENABLE_PLANNED_PACKAGES` (+ `NEXT_PUBLIC_ENABLE_PLANNED_PACKAGES`)

| | |
|--|--|
| Default | OFF |
| Runtime | Teacher offer form + teacher offers API draft/publish gates |
| Who sees effect | Teachers may draft Phase 1 planned packages (`offer_type=package`) when ON |
| Dependencies | None for drafts |
| Safe preview | ON in staging for form UX only |
| Production note | Does **not** enable public purchase, entitlements, checkout, or payouts |

### `ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS` (+ `NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_SESSION_DRAFTS`)

| | |
|--|--|
| Default | OFF |
| Runtime | Session-draft API + gated learner UI (requires planned packages ON) |
| Who sees effect | Learners may select N sessions and create a **draft** session plan |
| Dependencies | `ENABLE_PLANNED_PACKAGES` |
| Safe preview | ON in staging with planned packages ON |
| Production note | Does **not** create bookings, Stripe checkout, entitlements, or holds |

### `ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT` (+ `NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_CHECKOUT_PREFLIGHT`)

| | |
|--|--|
| Default | OFF |
| Runtime | Preflight API + gated draft summary UI |
| Who sees effect | Learners may revalidate a draft and see readiness blockers — **no payment** |
| Dependencies | Planned packages + session drafts |
| Safe preview | ON in staging after drafts work |
| Production note | Does **not** enable Stripe Checkout / PaymentIntent. Real checkout remains OFF (`ENABLE_PLANNED_PACKAGE_CHECKOUT` unset) |

### `ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS` (+ `NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_TEMPORARY_HOLDS`)

| | |
|--|--|
| Default | OFF |
| Runtime | Pending-order API + hold conflict checks in booking/slots |
| Who sees effect | Learners may create a short-lived pending order that temporarily blocks slots |
| Dependencies | Preflight (+ drafts + planned packages) |
| Safe preview | ON in staging after preflight works |
| Production note | Default hold `PLANNED_PACKAGE_HOLD_MINUTES=15`. Does **not** charge or confirm bookings |

### `ENABLE_PLANNED_PACKAGE_FULFILLMENT_ENGINE` (server only)

| | |
|--|--|
| Default | OFF |
| Runtime | Server fulfillment helper + optional admin simulate-payment route |
| Who sees effect | Trusted admin/service can convert `payment_confirmed` orders into confirmed session bookings |
| Dependencies | Temporary holds (+ preflight + drafts + planned packages) |
| Safe preview | ON in staging after holds work; use `ENABLE_PLANNED_PACKAGE_PAYMENT_SIMULATION` for admin simulation |
| Production note | **No Stripe Checkout / PaymentIntent / transfer**. Does not publicly launch packages. Do not rely on `NEXT_PUBLIC_*` for fulfillment |

### `ENABLE_PLANNED_PACKAGE_STRIPE_CHECKOUT` (+ `NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_STRIPE_CHECKOUT`)

| | |
|--|--|
| Default | OFF |
| Runtime | Pending-order checkout API + gated UI buy button |
| Who sees effect | Authenticated student may start Stripe Checkout for their pending order |
| Dependencies | Fulfillment engine + holds + preflight + drafts + planned packages |
| Safe preview | ON in staging with `ENABLE_PLANNED_PACKAGE_CHECKOUT_TEST_MODE` + Stripe test keys |
| Production note | Requires `PACKAGE_LEGAL_REVIEW_COMPLETED=true`. Platform charge only — `transfer_group` set, **no transfer/payout** |

### `ENABLE_PLANNED_PACKAGE_ADMIN_OPS` (server only)

| | |
|--|--|
| Default | OFF |
| Runtime | Admin list/detail APIs + `/admin/planned-package-orders` |
| Who sees effect | Admin can diagnose orders, reconciliation warnings, and retry fulfillment when safe |
| Dependencies | Fulfillment engine (+ full planned package chain) |
| Safe preview | ON in staging for support diagnostics |
| Production note | **Read-heavy + safe retry only** — no payout, refund, mark-paid, or public launch |

### `ENABLE_PLANNED_PACKAGE_REFUND_QUOTES` (server only)

| | |
|--|--|
| Default | OFF |
| Runtime | Admin cancellation request + refund quote APIs |
| Who sees effect | Admin can generate audited refund **estimates** (no Stripe refund) |
| Dependencies | Admin ops (+ full planned package chain) |
| Safe preview | ON in staging for support/legal review workflows |
| Production note | Quote-only — requires admin + legal review; execution in future PR |

### `ENABLE_PLANNED_PACKAGE_REFUND_ADMIN_REVIEW` (server only)

| | |
|--|--|
| Default | OFF |
| Runtime | Approve quote for manual refund label |
| Production note | Marks `approved_for_manual_refund` only — **does not** call Stripe |

### `ENABLE_PLANNED_PACKAGE_MANUAL_REFUNDS` (server only)

| | |
|--|--|
| Default | OFF |
| Runtime | Admin executes Stripe refund for approved quote only |
| Dependencies | Refund quotes + admin review + admin ops |
| Production note | Requires `PACKAGE_LEGAL_REVIEW_COMPLETED=true` in production |

### `ENABLE_PLANNED_PACKAGE_PAYOUT_ELIGIBILITY_LEDGER` (server only)

| | |
|--|--|
| Default | OFF |
| Runtime | Creates/updates per-session payout eligibility entries on admin sync |
| Dependencies | Planned package admin ops chain |
| Production note | **Does not** create Stripe transfers or release payouts |

### `ENABLE_PLANNED_PACKAGE_PAYOUT_ADMIN_VIEW` (server only)

| | |
|--|--|
| Default | OFF |
| Runtime | Shows payout eligibility section on admin order detail |
| Dependencies | Payout eligibility ledger flag + admin ops |
| Production note | Read-only audit UI — no payout actions until manual transfers enabled |

### `ENABLE_PLANNED_PACKAGE_MANUAL_TRANSFERS` (server only)

| | |
|--|--|
| Default | OFF |
| Runtime | Admin executes Stripe Connect transfer for eligible ledger entry only |
| Dependencies | Payout eligibility ledger + admin view + fulfillment + admin ops |
| Production note | Requires `PACKAGE_LEGAL_REVIEW_COMPLETED=true` in production; no automatic payout cron |

### `ENABLE_PLANNED_PACKAGE_MANUAL_TRANSFER_REVERSALS` (server only)

| | |
|--|--|
| Default | OFF |
| Runtime | Admin executes Stripe transfer reversal for succeeded transfer execution |
| Dependencies | Manual transfers + payout eligibility ledger + admin view + admin ops |
| Production note | Requires `PACKAGE_LEGAL_REVIEW_COMPLETED=true`; no customer refund in this layer |

### `ENABLE_PLANNED_PACKAGE_E2E_QA_TOOLS` (server only)

| | |
|--|--|
| Default | OFF |
| Runtime | Admin E2E diagnostics API + readiness section details |
| Who sees effect | Admins in staging/dev — read-only lifecycle diagnostics |
| Dependencies | None (diagnostics only) |
| Safe preview | ON in staging after migrations 114–123 |
| Production note | **Rejected in production** even if set. No money movement. Does not enable public launch |

### `ENABLE_PLANNED_PACKAGE_CHECKOUT_TEST_MODE` (optional)

| | |
|--|--|
| Default | OFF |
| Runtime | Allows non-production checkout without legal completion when Stripe test keys are configured |
| Production note | Ignored in production — legal review always required |

### `NEXT_PUBLIC_ENABLE_BOOKING_OFFER_SELECTION`

| | |
|--|--|
| Default | OFF |
| Runtime | Client + server booking create path |
| Who sees effect | Students in BookingModal when selecting a teacher offer |
| Dependencies | None |
| Safe preview | ON with snapshot checkout OFF → selection preview only (no snapshot charge) |
| Production note | Enable with snapshot checkout for real offer pricing |

### `ENABLE_OFFER_SNAPSHOT_CHECKOUT` (+ optional `NEXT_PUBLIC_ENABLE_OFFER_SNAPSHOT_CHECKOUT`)

| | |
|--|--|
| Default | OFF |
| Runtime | Server checkout pricing resolver |
| Who sees effect | Checkout amount for bookings with offer snapshots |
| Dependencies | Booking offer selection for creating snapshots |
| Safe preview | ON in staging with Stripe test mode |
| Production note | Required before package entitlements |

### `ENABLE_PACKAGE_ENTITLEMENTS`

| | |
|--|--|
| Default | OFF |
| Runtime | Server (webhook / paid booking success) |
| Who sees effect | Creates `package_entitlements` after paid package snapshot checkout |
| Dependencies | `ENABLE_OFFER_SNAPSHOT_CHECKOUT` |
| Safe preview | ON only with snapshot checkout ON |
| Production note | Launch-critical — keep OFF until legal checklist complete |

### `ENABLE_PACKAGE_REDEMPTION_BOOKING` (+ `NEXT_PUBLIC_ENABLE_PACKAGE_REDEMPTION_BOOKING`)

| | |
|--|--|
| Default | OFF |
| Runtime | Server redeem API + BookingModal UI |
| Who sees effect | Learners redeeming a session with the same teacher |
| Dependencies | `ENABLE_PACKAGE_ENTITLEMENTS` |
| Safe preview | ON after entitlements work in staging |
| Production note | Do not enable without entitlements |

### `ENABLE_STUDENT_PACKAGE_DASHBOARD` (+ `NEXT_PUBLIC_ENABLE_STUDENT_PACKAGE_DASHBOARD`)

| | |
|--|--|
| Default | OFF |
| Runtime | Server API + student nav/UI |
| Who sees effect | Students on `/student/packages` (read-only) |
| Dependencies | `package_entitlements` data existing (flag usually ON) |
| Safe preview | ON for UX review without mutating balances |
| Production note | Visibility only |

### `ENABLE_TEACHER_PACKAGE_VISIBILITY` (+ `NEXT_PUBLIC_ENABLE_TEACHER_PACKAGE_VISIBILITY`)

| | |
|--|--|
| Default | OFF |
| Runtime | Server API + teacher nav/UI |
| Who sees effect | Teachers on `/teacher/packages` (read-only) |
| Dependencies | `package_entitlements` data existing |
| Safe preview | ON for UX review without mutating balances |
| Production note | Visibility only |

### `ENABLE_OFFER_POLICY_ENFORCEMENT` (+ `NEXT_PUBLIC_ENABLE_OFFER_POLICY_ENFORCEMENT`)

| | |
|--|--|
| Default | OFF |
| Runtime | Server cancel API (+ optional UI hints) |
| Who sees effect | Package-credit student cancellations use booking policy snapshots to decide automatic credit return |
| Dependencies | PR 16A preference snapshots on bookings; package redemption booking |
| Safe preview | ON in staging after package cancel/restore is validated |
| Production note | Keep OFF until teacher preferences + legal copy are ready. Does **not** create Stripe refunds |

### `PACKAGE_LEGAL_REVIEW_COMPLETED` (ops signal only)

| | |
|--|--|
| Default | unset / OFF |
| Runtime | Admin readiness helper only |
| Who sees effect | Admins on readiness page |
| Dependencies | Counsel sign-off outside the app |
| Safe preview | Leave unset |
| Production note | Set `true` only after Québec counsel review — does not auto-enable other flags |

## Safe preview combination (staging)

```
NEXT_PUBLIC_ENABLE_BOOKING_OFFER_SELECTION=true
ENABLE_OFFER_SNAPSHOT_CHECKOUT=true
ENABLE_PACKAGE_ENTITLEMENTS=true
ENABLE_PACKAGE_REDEMPTION_BOOKING=true
ENABLE_STUDENT_PACKAGE_DASHBOARD=true
NEXT_PUBLIC_ENABLE_STUDENT_PACKAGE_DASHBOARD=true
ENABLE_TEACHER_PACKAGE_VISIBILITY=true
NEXT_PUBLIC_ENABLE_TEACHER_PACKAGE_VISIBILITY=true
```

Keep production flags OFF until legal launch checklist is complete.
