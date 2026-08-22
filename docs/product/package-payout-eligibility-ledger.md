# Planned package payout eligibility ledger

**Status:** Internal engineering layer — not final teacher payout policy.  
**Legal review:** Still required before any public package payout behavior.

## Principle

A planned package payout is **not** paid upfront.

Teacher payout should become **eligible progressively** after each **completed** package session booking. This PR answers only:

> Is this session eligible to be paid later?

It does **not** answer:

> Send money now.

## Scope (this PR)

- One ledger entry per fulfilled package session booking (`planned_package_payout_eligibility_entries`)
- Status transitions when a session booking is completed (`bookings.status = completed`)
- Blockers for refund, cancellation, payment, and teacher Stripe readiness
- Admin visibility and manual sync
- Reconciliation attention reasons

## Out of scope (future PRs)

- Automatic payout release / cron
- Package commission policy finalization (when finalized, sync populates `teacher_net_cents`)
- Public package launch

Manual Stripe Connect transfer execution is documented in `package-manual-transfer-execution.md` (separate PR, admin-only, gated).

Previously out of scope for the ledger PR alone:

- ~~`stripe.transfers.create`~~ — now in manual transfer execution PR (admin-only)
- `stripe.transfers.createReversal`

## Feature flags

| Flag | Default | Meaning |
|------|---------|---------|
| `ENABLE_PLANNED_PACKAGE_PAYOUT_ELIGIBILITY_LEDGER` | OFF | Server: create/update eligibility entries on admin sync |
| `ENABLE_PLANNED_PACKAGE_PAYOUT_ADMIN_VIEW` | OFF | Admin UI section on order detail |

Both require the planned package admin ops chain (`ENABLE_PLANNED_PACKAGE_ADMIN_OPS` + upstream flags).

When OFF:

- No eligibility entries are created
- Admin payout section hidden or disabled
- Package fulfillment and booking completion unchanged

## Session completion source of truth

Uses existing booking completion state:

- `bookings.status === "completed"` via `classifyPlannedPackageSessionStatus()` in `plannedPackageSessionDelivery.ts`
- No hook into `completeBooking.ts` (normal booking payout release path)

Integration is **admin sync only** in this PR:

```
POST /api/admin/planned-package-orders/[orderId]/sync-payout-eligibility
```

## Allocation

Per-session gross amount comes from `allocatePlannedPackageSessionCents()` — same helper as fulfillment.  
`platform_fee_cents` and `teacher_net_cents` remain `null` until package commission policy is finalized (`payout_pricing_policy_not_finalized` blocker).

## Blockers

Examples tracked in `blocker_details`:

- Order not paid / not fulfilled
- Booking not completed
- Open cancellation request
- Pending or approved refund quote
- Refund executed
- Teacher Stripe Connect not ready
- Allocation missing/mismatch
- Pricing policy not finalized

## Admin UI

Order detail section **Admissibilité aux versements**:

- One row per package session booking
- Sync button — **no** automatic transfer
- When `ENABLE_PLANNED_PACKAGE_MANUAL_TRANSFERS` is OFF: clear note **Aucun transfer Stripe n’est créé par cette étape.**
- When manual transfers ON: admin may execute transfer for eligible entries only (see `package-manual-transfer-execution.md`)

## Reconciliation

New attention reasons (when ledger flag ON):

- `completed_session_missing_payout_eligibility`
- `eligible_session_blocked_by_refund`
- `payout_eligibility_admin_review_required`
- `payout_allocation_mismatch`
- `payout_pricing_policy_not_finalized`

When `ENABLE_PLANNED_PACKAGE_MANUAL_TRANSFERS` is ON:

- `eligible_transfer_not_executed`
- `transfer_execution_failed`
- `transfer_succeeded_but_entry_not_marked`
- `refund_exists_after_transfer`
- `cancellation_request_after_transfer`
- `transfer_amount_mismatch`
- `teacher_payment_not_ready_for_transfer`

When manual transfers OFF, “eligible but no transfer” is **not** an error — transfers are intentionally deferred.

## Related docs

- `docs/product/package-technical-architecture.md`
- `docs/product/package-refund-quote-engine.md`
- `docs/product/package-manual-refund-execution.md`
- `docs/product/package-manual-transfer-execution.md`
- `docs/product/package-feature-flags.md`

## Migration

`121_planned_package_payout_eligibility_ledger.sql` — RLS service_role only; mutations via server helpers.
