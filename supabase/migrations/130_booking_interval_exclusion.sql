-- No data repair: deployment must stop if existing active reservations overlap.
-- Wall-clock ranges use the same teacher-local slot_date/time_slot as the calendar.
BEGIN;
CREATE EXTENSION IF NOT EXISTS btree_gist;
SET LOCAL search_path = public, extensions, pg_temp;

CREATE FUNCTION public.booking_wall_interval(day date, label text, minutes integer)
RETURNS tsrange LANGUAGE plpgsql IMMUTABLE STRICT
SET search_path = pg_catalog AS $$
DECLARE parts text[]; start_at timestamp;
BEGIN
  parts := regexp_match(label, '^([0-9]{1,2})[h:]([0-9]{2})$');
  IF parts IS NULL OR parts[1]::integer > 23 OR parts[2]::integer > 59
     OR minutes < 1 OR minutes > 480 THEN RETURN NULL; END IF;
  start_at := day + make_time(parts[1]::integer, parts[2]::integer, 0);
  RETURN tsrange(start_at, start_at + make_interval(mins => minutes), '[)');
END;
$$;

-- Validate existing active rows rather than silently excluding malformed slots.
ALTER TABLE public.bookings ADD CONSTRAINT active_booking_valid_interval
  CHECK (status NOT IN ('pending_payment', 'confirmed') OR
    public.booking_wall_interval(slot_date, time_slot, coalesce(duration_minutes, 60)) IS NOT NULL);

-- Unlike a SELECT followed by INSERT, GiST exclusion also protects concurrent
-- writers and updates under stronger isolation levels. No RLS grants change.
ALTER TABLE public.bookings ADD CONSTRAINT booking_no_overlapping_active_interval
  EXCLUDE USING gist (
    teacher_id WITH =,
    (public.booking_wall_interval(slot_date, time_slot, coalesce(duration_minutes, 60))) WITH &&
  ) WHERE (status IN ('pending_payment', 'confirmed'));
COMMIT;
