-- Refund + role metadata for the cancellation flow.
-- Builds on 024_booking_cancellation_meta.sql (cancelled_at, cancelled_by, cancellation_reason).
-- All columns are optional and use defaults so existing rows stay valid.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancelled_by_role text,
  ADD COLUMN IF NOT EXISTS cancellation_message text,
  ADD COLUMN IF NOT EXISTS refund_status text DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS refund_amount numeric,
  ADD COLUMN IF NOT EXISTS refund_method text;

-- Backfill default for any pre-existing rows where the column was just added.
UPDATE public.bookings SET refund_status = 'not_required' WHERE refund_status IS NULL;

COMMENT ON COLUMN public.bookings.cancelled_by_role IS 'Role of the user who cancelled: ''student'' or ''teacher''.';
COMMENT ON COLUMN public.bookings.cancellation_message IS 'Optional free-text message from the canceller (shown to support).';
COMMENT ON COLUMN public.bookings.refund_status IS 'not_required | pending | pending_review | refunded | rejected.';
COMMENT ON COLUMN public.bookings.refund_amount IS 'Amount eligible for refund/credit at the time of cancellation.';
COMMENT ON COLUMN public.bookings.refund_method IS 'original_payment | pratiqo_credit (resolved by support if pending_review).';
