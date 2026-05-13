# Pratiqo Release Quality Checklist

Use this before pushing/deploying meaningful changes.

## Code Gate

```powershell
npm run quality
```

If this fails, do not deploy.

## Database Gate

- Confirm the next migration number is unique.
- Confirm the migration is safe on a database where some objects may already exist.
- Confirm new columns used by public client queries are present in `teachers_public` or the relevant view.
- Confirm new private fields are not exposed through public views.
- Confirm RLS policies match the actual user roles.

## Payment Gate

- `npm run payment:safety` passes.
- Lesson checkout still creates a booking payment ledger row.
- Stripe webhook confirms paid bookings idempotently.
- Teacher transfer still happens only after completion.
- Pro subscription checkout/portal still use Stripe Billing, not Connect transfers.
- No UI says money was transferred unless a transfer id exists.

## Privacy Gate

- Public search/profile pages do not expose:
  - exact home/studio address before confirmed booking;
  - learner profile details;
  - Stripe ids;
  - private document URLs;
  - teacher payout/commission internals to students.

## UX Gate

- New visible strings exist in FR, EN, and ES.
- Buttons have loading/error states when they trigger network calls.
- Empty states explain the next useful action.
- Mobile layout does not require horizontal scrolling for core navigation.

## Operational Gate

- New manual work creates a queue, status, or clear support notification.
- Failure states are visible to the user or admin.
- Logs do not include secrets, exact private addresses, documents, payment tokens, or sensitive learner details.
