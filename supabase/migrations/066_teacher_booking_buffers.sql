-- Teacher booking buffer time.
--
-- Adds per-teacher buffer minutes inserted before and after every booking when
-- computing availability and validating new bookings.
--
-- Defaults are 0 so existing teachers preserve current behavior. The check
-- constraint caps each side at 240 minutes (4h) to avoid pathological values.

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS booking_buffer_before_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS booking_buffer_after_minutes  integer NOT NULL DEFAULT 0;

ALTER TABLE public.teachers
  DROP CONSTRAINT IF EXISTS teachers_booking_buffer_minutes_check;

ALTER TABLE public.teachers
  ADD CONSTRAINT teachers_booking_buffer_minutes_check
  CHECK (
    booking_buffer_before_minutes BETWEEN 0 AND 240
    AND booking_buffer_after_minutes BETWEEN 0 AND 240
  );

COMMENT ON COLUMN public.teachers.booking_buffer_before_minutes IS
  'Minutes blocked BEFORE each existing booking when computing availability. Default 0.';
COMMENT ON COLUMN public.teachers.booking_buffer_after_minutes IS
  'Minutes blocked AFTER each existing booking when computing availability. Default 0.';
