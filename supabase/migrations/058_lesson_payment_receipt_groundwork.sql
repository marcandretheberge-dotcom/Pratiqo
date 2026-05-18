-- Phase 1 payment receipt groundwork for individual lesson bookings.
-- Tax collection is intentionally not enabled in this migration.

ALTER TABLE public.booking_payments
  ADD COLUMN IF NOT EXISTS receipt_number text,
  ADD COLUMN IF NOT EXISTS receipt_issued_at timestamptz,
  ADD COLUMN IF NOT EXISTS receipt_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS tax_behavior text NOT NULL DEFAULT 'not_collected',
  ADD COLUMN IF NOT EXISTS tax_total_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qst_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS buyer_country_code text,
  ADD COLUMN IF NOT EXISTS buyer_region text,
  ADD COLUMN IF NOT EXISTS tax_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_payments_receipt_number
  ON public.booking_payments (receipt_number)
  WHERE receipt_number IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'booking_payments_tax_behavior_check'
  ) THEN
    ALTER TABLE public.booking_payments
      ADD CONSTRAINT booking_payments_tax_behavior_check
      CHECK (tax_behavior IN ('not_collected'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'booking_payments_tax_amounts_non_negative'
  ) THEN
    ALTER TABLE public.booking_payments
      ADD CONSTRAINT booking_payments_tax_amounts_non_negative
      CHECK (
        tax_total_cents >= 0
        AND gst_cents >= 0
        AND qst_cents >= 0
      );
  END IF;
END $$;

COMMENT ON COLUMN public.booking_payments.receipt_number IS
  'Stable Pratiqo receipt number for an individual lesson payment.';
COMMENT ON COLUMN public.booking_payments.receipt_issued_at IS
  'Timestamp when the Pratiqo receipt snapshot was first issued.';
COMMENT ON COLUMN public.booking_payments.receipt_email_sent_at IS
  'Timestamp when the payment receipt email was successfully sent.';
COMMENT ON COLUMN public.booking_payments.tax_behavior IS
  'Current launch tax mode. not_collected means Pratiqo did not calculate or collect sales tax.';
COMMENT ON COLUMN public.booking_payments.tax_snapshot IS
  'Receipt-time tax decision snapshot. Phase 1 records tax_behavior=not_collected with zero tax amounts.';
