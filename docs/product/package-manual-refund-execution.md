# Planned package manual refund execution

**Status:** Admin-only Stripe refund for approved refund quotes. Not legal advice.

## Scope

This layer executes a **real Stripe refund** on the platform charge when:

- An admin is authenticated;
- `ENABLE_PLANNED_PACKAGE_MANUAL_REFUNDS=true` (default OFF);
- The full refund quote chain is enabled (refund quotes + admin review + admin ops);
- A refund quote exists with status `approved_for_manual_refund`;
- `estimated_refund_cents > 0`;
- The planned package order was paid and has a Stripe payment intent;
- No teacher transfer/payout exists for package bookings;
- In production, `PACKAGE_LEGAL_REVIEW_COMPLETED=true`.

This is **not** automatic public cancellation. Learners cannot trigger Stripe refunds.

## What this PR does

- Creates `planned_package_refund_executions` audit rows;
- Calls `stripe.refunds.create` with approved quote amount only;
- Uses stable idempotency key `planned-package-refund-<quoteId>`;
- Updates order `refund_status`, `refunded_cents`, `refunded_at`;
- Admin UI with explicit confirmation (type `REFUND` + checkbox).

## What this PR does NOT do

- Automatic refunds on cancellation;
- Transfer reversals (`stripe.transfers.createReversal`);
- Teacher payout release;
- Protected credit / entitlement mutation;
- Public package launch;
- Legal review bypass.

## Blockers

If any teacher transfer exists for package session bookings:

- Execution returns `transfer_reversal_required`;
- Admin UI shows transfer reversal required message;
- Future PR must handle reversal safely when progressive payouts exist.

## Quote freshness

At execution time the engine recalculates the quote. If the recalculated amount, currency, or policy version differs from the approved quote, execution is blocked with `quote_stale` — a new quote and approval are required.

## Policy version

Uses the policy version stored on the approved quote (`planned-package-refund-v1-draft-2026`). Metadata is attached to the Stripe refund for audit.

## Québec reference (draft)

Refund execution follows an admin-approved estimate derived from draft Québec course/service cancellation logic. This document is not final legal terms.

## Related docs

- [package-refund-quote-engine.md](./package-refund-quote-engine.md)
- [package-refund-cancellation-policy-draft.md](./package-refund-cancellation-policy-draft.md)
- [package-feature-flags.md](./package-feature-flags.md)

## Future work

- Transfer reversal when teacher progressive payouts are implemented;
- Optional read-only webhook reconciliation for `charge.refunded`.
