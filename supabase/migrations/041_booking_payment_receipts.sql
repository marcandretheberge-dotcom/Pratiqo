-- Adds receipt URL fields to booking_payments.
-- This migration is already applied on the remote DB; keep it locally so migration history matches.
-- Idempotent on purpose.

alter table public.booking_payments
  add column if not exists stripe_receipt_url text,
  add column if not exists stripe_invoice_url text,
  add column if not exists receipt_available_at timestamptz;
