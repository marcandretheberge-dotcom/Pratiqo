# Planned package refund quote engine

## Scope (this PR)

- **Quote-only** refund estimates for planned package orders
- Cancellation request audit records
- Admin review workflow (`approved_for_manual_refund` is a label only)
- Policy-versioned calculation snapshots stored in Postgres

This is **not** legal advice and **not** a final refund decision.

## Out of scope (future PR)

- `stripe.refunds.create` or any live refund execution
- Stripe transfers / teacher payout release
- Automatic booking cancellation
- Public learner cancellation UI (optional flag exists but default OFF)
- Public package launch

## Policy version

Current draft policy: `planned-package-refund-v1-draft-2026`

### Draft formula

**No sessions completed**

- `completed_value_cents = 0`
- `penalty_cents = 0`
- `estimated_refund_cents = package_total_cents`

**One or more sessions completed**

- `completed_value_cents` = sum of per-session allocated cents for completed bookings
- `undelivered_value_cents` = package total minus completed value (via session classification)
- `penalty_cents = min(5000, floor(undelivered_value_cents × 10%))`
- `estimated_refund_cents = max(0, undelivered_value_cents - penalty_cents)`

Per-session cents use `allocatePlannedPackageSessionCents` (deterministic remainder to earlier sessions).

## Session classification

| Booking status | Class |
|----------------|-------|
| `completed` | delivered |
| `confirmed`, `pending_payment` | future / undelivered |
| `cancelled*` | manual review |
| `no_show`, `disputed`, unknown | manual review |

No-show policy is **not** invented in this PR.

## Admin review

All quotes default to:

- `manual_review_required = true` when warnings/blockers exist
- `legal_review_required = true` unless `PACKAGE_LEGAL_REVIEW_COMPLETED=true`

Approving a quote sets `approved_for_manual_refund` **only** — no money movement.

## Québec reference notes (product draft)

Course/service cancellation references used while drafting policy:

- Before courses begin: no fees/damages (full refund quote when zero sessions completed)
- After courses begin: cost of sessions already delivered + statutory penalty on undelivered portion
- Penalty cap: lesser of 50 CAD or 10% of undelivered value
- Refund timeframe (10 days when owed) is documented for future execution PR — not enforced here

## Feature flags

| Flag | Default | Meaning |
|------|---------|---------|
| `ENABLE_PLANNED_PACKAGE_REFUND_QUOTES` | OFF | Quote generation APIs + admin UI section |
| `ENABLE_PLANNED_PACKAGE_REFUND_ADMIN_REVIEW` | OFF | Approve-for-manual-refund action |
| `NEXT_PUBLIC_ENABLE_PLANNED_PACKAGE_CANCELLATION_REQUESTS` | OFF | Reserved for future learner UI |

Requires `ENABLE_PLANNED_PACKAGE_ADMIN_OPS` + fulfillment chain.

## Legal review

Public activation still requires explicit `PACKAGE_LEGAL_REVIEW_COMPLETED=true`.

Do not present quotes to learners as guaranteed refunds.
