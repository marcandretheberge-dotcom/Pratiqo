-- Pre-tax subtotal for commission basis; amount_cents remains the student-paid total.

ALTER TABLE public.booking_payments
  ADD COLUMN IF NOT EXISTS subtotal_cents integer NOT NULL DEFAULT 0;

UPDATE public.booking_payments
SET subtotal_cents = GREATEST(0, amount_cents - COALESCE(tax_total_cents, 0))
WHERE subtotal_cents = 0 AND amount_cents > 0;

ALTER TABLE public.booking_payments
  DROP CONSTRAINT IF EXISTS booking_payments_amount_split_check;

ALTER TABLE public.booking_payments
  ADD CONSTRAINT booking_payments_amount_split_check
  CHECK (platform_fee_cents + teacher_net_cents <= subtotal_cents);

ALTER TABLE public.booking_payments
  ADD CONSTRAINT booking_payments_total_amount_check
  CHECK (subtotal_cents + tax_total_cents <= amount_cents);

COMMENT ON COLUMN public.booking_payments.subtotal_cents IS
  'Pre-tax lesson subtotal in minor units. Pratiqo commission is calculated on this amount.';
COMMENT ON COLUMN public.booking_payments.amount_cents IS
  'Final student-paid total (subtotal_cents + tax_total_cents) charged by Stripe, in minor units.';
COMMENT ON COLUMN public.booking_payments.tax_total_cents IS
  'Included sales tax amount in minor units (0 when tax_behavior = not_collected).';
