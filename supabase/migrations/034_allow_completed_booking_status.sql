-- Allow the post-class lifecycle to mark paid lessons as completed.

ALTER TABLE public.bookings
DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE public.bookings
ADD CONSTRAINT bookings_status_check
CHECK (
  status IN (
    'pending_payment',
    'confirmed',
    'completed',
    'cancelled',
    'cancelled_conflict'
  )
);
