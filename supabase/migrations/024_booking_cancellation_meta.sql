-- Optional metadata when a participant cancels (status → cancelled)

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

COMMENT ON COLUMN public.bookings.cancelled_at IS 'When status was set to cancelled by a participant.';
COMMENT ON COLUMN public.bookings.cancelled_by IS 'auth.users id of the user who initiated cancellation.';
COMMENT ON COLUMN public.bookings.cancellation_reason IS 'Optional free-text reason; not required for v1.';
