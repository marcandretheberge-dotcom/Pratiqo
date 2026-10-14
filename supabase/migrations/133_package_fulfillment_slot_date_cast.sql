-- Migration 116 passes text to bookings.slot_date (date). Preserve the entire
-- installed function except this cast; stop if its expected shape has changed.
BEGIN;
DO $$
DECLARE definition text; needle text := E'      v_time_slot,\n      v_slot_date,\n';
BEGIN
  SELECT pg_get_functiondef('public.fulfill_planned_package_order(uuid,text,text,jsonb)'::regprocedure) INTO definition;
  definition := replace(definition,E'\r\n',E'\n');
  IF (length(definition)-length(replace(definition,needle,'')))/length(needle) <> 1 THEN
    RAISE EXCEPTION 'Unexpected fulfillment function: inspect before applying slot date cast';
  END IF;
  EXECUTE replace(definition,needle,E'      v_time_slot,\n      v_slot_date::date,\n');
END $$;
COMMIT;
