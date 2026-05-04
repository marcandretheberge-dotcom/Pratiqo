-- Normalize legacy booking.status values before tightening CHECK constraint.
-- Run manually in Supabase when ready.

BEGIN;

-- 0. Map statuses not in the new CHECK into allowed values (safe no-ops if absent)
UPDATE public.bookings
SET status = 'pending_payment'
WHERE status IN ('pending', 'pending_teacher');

UPDATE public.bookings
SET status = 'cancelled'
WHERE status = 'declined';

-- 1. Convert any existing 'booked' rows to 'confirmed'
--    (they were always treated as synonyms in code)
UPDATE public.bookings
SET status = 'confirmed'
WHERE status = 'booked';

-- 2. Change the default for new bookings (was 'booked', should be
--    'pending_payment' since that's what Stripe Checkout flow inserts)
ALTER TABLE public.bookings
ALTER COLUMN status SET DEFAULT 'pending_payment';

-- 3. Add a CHECK constraint to prevent invalid statuses going forward
ALTER TABLE public.bookings
DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE public.bookings
ADD CONSTRAINT bookings_status_check
CHECK (status IN ('pending_payment', 'confirmed', 'cancelled', 'cancelled_conflict'));

COMMIT;

SELECT 'Migration 030 completed' AS status;
