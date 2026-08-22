# Planned package manual transfer reversal

**Status:** Admin-only Stripe Connect transfer reversal for succeeded planned package transfers. Not legal advice.

## Scope

This layer executes a **real Stripe transfer reversal** when:

- An admin is authenticated;
- `ENABLE_PLANNED_PACKAGE_MANUAL_TRANSFER_REVERSALS=true` (default OFF);
- Manual transfer execution chain is enabled;
- A succeeded transfer execution exists with `stripe_transfer_id`;
- Reversal amount is positive and does not exceed remaining reversible amount;
- A valid `reversal_reason` is provided;
- In production, `PACKAGE_LEGAL_REVIEW_COMPLETED=true`.

This is **not** automatic reversal. There is no reversal cron.

## What this PR does

- Creates `planned_package_transfer_reversal_executions` audit rows;
- Calls `stripe.transfers.createReversal` for full or partial reversal;
- Uses stable idempotency key `planned-package-transfer-reversal-<executionId>-<amount>-<reason>`;
- Updates transfer execution `reversed_cents`, `reversal_status`;
- Updates payout eligibility entry `transfer_reversal_status`, `reversed_cents`;
- Admin UI with explicit confirmation (type `REVERSE` + checkbox + reason).

## What this PR does NOT do

- Automatic transfer reversal or cron;
- Stripe customer refunds (`stripe.refunds.create`);
- New Stripe transfers (`stripe.transfers.create`);
- Stripe payouts (`stripe.payouts.create`);
- Public package launch;
- Legal review bypass.

## Reversal amount

```
remaining_reversible_cents = transfer_execution.amount_cents - sum(succeeded reversals)
```

Default admin action reverses the full remaining amount. Partial reversal is allowed when explicitly entered.

## Manual refund integration

Manual refund execution still blocks with `transfer_reversal_required` when unreversed planned package transfers exist for the order. After full reversal, refund execution may proceed (admin still executes refund separately).

Transfer reversal does **not** execute a customer refund.

## Idempotency

Repeated admin click with the same idempotency key returns the existing succeeded reversal execution.

## Related docs

- [package-manual-transfer-execution.md](./package-manual-transfer-execution.md)
- [package-manual-refund-execution.md](./package-manual-refund-execution.md)
- [package-feature-flags.md](./package-feature-flags.md)

## Future work

- Dispute/chargeback automated reconciliation;
- Optional read-only webhook handling for `transfer.reversed`.
