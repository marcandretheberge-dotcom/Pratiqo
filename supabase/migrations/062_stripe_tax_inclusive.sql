-- Stripe Tax inclusive mode for individual lesson checkout (feature-flagged in app).

ALTER TABLE public.booking_payments
  ADD COLUMN IF NOT EXISTS tax_status text NOT NULL DEFAULT 'not_collected';

ALTER TABLE public.booking_payments
  DROP CONSTRAINT IF EXISTS booking_payments_tax_behavior_check;

ALTER TABLE public.booking_payments
  ADD CONSTRAINT booking_payments_tax_behavior_check
  CHECK (tax_behavior IN ('not_collected', 'stripe_tax_inclusive'));

ALTER TABLE public.booking_payments
  DROP CONSTRAINT IF EXISTS booking_payments_tax_status_check;

ALTER TABLE public.booking_payments
  ADD CONSTRAINT booking_payments_tax_status_check
  CHECK (tax_status IN ('not_collected', 'pending', 'calculated', 'failed'));

COMMENT ON COLUMN public.booking_payments.tax_status IS
  'Tax calculation lifecycle: not_collected (flag off), pending (checkout created), calculated (webhook), failed (incomplete Stripe Tax data).';
