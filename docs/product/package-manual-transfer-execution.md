# Planned package manual transfer execution

**Status:** Admin-only Stripe Connect transfer for eligible payout ledger entries. Not legal advice.

## Scope

This layer executes a **real Stripe Connect transfer** to the teacher’s connected account when:

- An admin is authenticated;
- `ENABLE_PLANNED_PACKAGE_MANUAL_TRANSFERS=true` (default OFF);
- The full payout eligibility chain is enabled (ledger + admin view + fulfillment + admin ops);
- A payout eligibility entry exists with status `eligible`;
- `teacher_net_cents > 0` is stored on the entry;
- The planned package order is paid and `fulfilled`;
- The package session booking is `completed`;
- No refund/cancellation blocker applies;
- No successful transfer already exists for this eligibility entry;
- Teacher Stripe Connect is ready;
- In production, `PACKAGE_LEGAL_REVIEW_COMPLETED=true`.

This is **not** automatic payout. There is no payout cron.

## What this PR does

- Creates `planned_package_transfer_executions` audit rows;
- Calls `stripe.transfers.create` with `teacher_net_cents` only (not gross);
- Uses stable idempotency key `planned-package-transfer-<entryId>`;
- Updates eligibility entry `transfer_status`, `transferred_cents`, `stripe_transfer_id`;
- Admin UI with explicit confirmation (type `TRANSFER` + checkbox).

## What this PR does NOT do

- Automatic payout release or cron;
- Transfer reversals (`stripe.transfers.createReversal`);
- Stripe refunds;
- Stripe payouts (`stripe.payouts.create`);
- Protected credit / entitlement mutation;
- Public package launch;
- Legal review bypass.

## Transfer amount

Uses **`teacher_net_cents`** from the payout eligibility entry only.

If `teacher_net_cents` is null, execution is blocked with `payout_pricing_policy_not_finalized`.

Currency must match the eligibility entry and order snapshot.

## Blockers

Refund/cancellation blockers from the eligibility ledger still apply at execution time. If eligibility has changed since sync, execution is blocked — resync and review.

## Idempotency

- Repeated admin click for the same eligibility entry returns the existing succeeded execution;
- Pending rows can be retried with the same idempotency key;
- Failed executions record failure details without marking the entry transferred.

## Admin UI

Order detail payout eligibility section:

- Execute button only when entry is eligible and manual transfers flag is ON;
- Warning that real money moves; no refund or reversal in this PR;
- Confirmation input `TRANSFER` required.

## Reconciliation

When manual transfers flag is ON, attention reasons include:

- `eligible_transfer_not_executed`
- `transfer_execution_failed`
- `transfer_succeeded_but_entry_not_marked`
- `refund_exists_after_transfer`
- `cancellation_request_after_transfer`
- `transfer_amount_mismatch`
- `teacher_payment_not_ready_for_transfer`

## Related docs

- [package-payout-eligibility-ledger.md](./package-payout-eligibility-ledger.md)
- [package-manual-refund-execution.md](./package-manual-refund-execution.md)
- [package-feature-flags.md](./package-feature-flags.md)

## Future work

- Transfer reversal and dispute handling when progressive payouts and refunds overlap;
- Optional read-only webhook reconciliation for `transfer.created` / `transfer.updated`.
