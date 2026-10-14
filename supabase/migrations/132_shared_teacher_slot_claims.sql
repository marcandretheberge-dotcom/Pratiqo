-- Private occupancy projection shared by bookings and temporary package holds.
-- Never repairs reservations. Existing conflicts abort deployment.
BEGIN;
LOCK TABLE public.bookings, public.planned_package_session_holds,
  public.planned_package_pending_orders IN SHARE ROW EXCLUSIVE MODE;
SET LOCAL search_path = public, extensions, pg_temp;
CREATE TABLE public.teacher_slot_claims (
  source_kind text NOT NULL CHECK (source_kind IN ('booking','hold')),
  source_id text NOT NULL,
  teacher_id text NOT NULL,
  occupied tsrange NOT NULL,
  expires_at timestamptz,
  PRIMARY KEY (source_kind, source_id),
  EXCLUDE USING gist (teacher_id WITH =, occupied WITH &&)
);
ALTER TABLE public.teacher_slot_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.teacher_slot_claims FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.teacher_slot_claims TO service_role;

CREATE FUNCTION public.refresh_teacher_slot_claim(kind text, source text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE b public.bookings%ROWTYPE; h public.planned_package_session_holds%ROWTYPE;
  o public.planned_package_pending_orders%ROWTYPE; teacher text; zone text;
  span tsrange; expiry timestamptz; before_minutes integer; after_minutes integer;
BEGIN
  DELETE FROM public.teacher_slot_claims WHERE source_kind=kind AND source_id=source;
  IF kind='booking' THEN
    SELECT * INTO b FROM public.bookings WHERE id::text=source;
    IF NOT FOUND OR b.status NOT IN ('pending_payment','confirmed') THEN RETURN; END IF;
    teacher := b.teacher_id;
    span := public.booking_wall_interval(b.slot_date,b.time_slot,coalesce(b.duration_minutes,60));
  ELSIF kind='hold' THEN
    SELECT * INTO h FROM public.planned_package_session_holds WHERE id::text=source;
    IF NOT FOUND OR h.status <> 'active' THEN RETURN; END IF;
    SELECT * INTO o FROM public.planned_package_pending_orders WHERE id=h.pending_order_id FOR SHARE;
    IF NOT FOUND OR o.status IN ('expired','cancelled','fulfilled') THEN RETURN; END IF;
    IF o.status='pending_payment' THEN
      expiry := least(h.expires_at,o.hold_expires_at);
      IF expiry <= now() THEN RETURN; END IF;
    END IF;
    teacher := h.teacher_id;
  ELSE RAISE EXCEPTION 'invalid_claim_kind'; END IF;
  SELECT coalesce(nullif(timezone,''),'America/Toronto'),
    coalesce(booking_buffer_before_minutes,0),coalesce(booking_buffer_after_minutes,0)
    INTO zone,before_minutes,after_minutes FROM public.teachers WHERE id=teacher;
  IF NOT FOUND THEN RAISE EXCEPTION 'claim_teacher_missing'; END IF;
  IF kind='hold' THEN span := tsrange(h.starts_at AT TIME ZONE zone,h.ends_at AT TIME ZONE zone,'[)'); END IF;
  IF span IS NULL OR isempty(span) THEN RAISE EXCEPTION 'invalid_claim_interval'; END IF;
  -- Expiry is lazy on explicit writes only. Paid holds have no expiry here.
  DELETE FROM public.teacher_slot_claims WHERE teacher_id=teacher AND expires_at <= now();
  IF kind='booking' AND b.planned_package_order_id IS NOT NULL THEN
    -- Transfer only this exact session's occupancy, inside the booking transaction.
    DELETE FROM public.teacher_slot_claims c USING public.planned_package_session_holds own
    WHERE c.source_kind='hold' AND c.source_id=own.id::text
      AND own.pending_order_id=b.planned_package_order_id
      AND own.session_index=b.planned_package_session_index AND own.teacher_id=b.teacher_id
      AND own.starts_at AT TIME ZONE zone=lower(span)
      AND own.ends_at AT TIME ZONE zone=upper(span);
  END IF;
  span := tsrange(lower(span)-make_interval(mins=>before_minutes),upper(span)+make_interval(mins=>after_minutes),'[)');
  INSERT INTO public.teacher_slot_claims VALUES(kind,source,teacher,span,expiry);
END;
$$;
REVOKE ALL ON FUNCTION public.refresh_teacher_slot_claim(text,text) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.sync_teacher_slot_claim() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE source text;
BEGIN
  IF TG_OP='DELETE' THEN source:=OLD.id::text; ELSE source:=NEW.id::text; END IF;
  PERFORM public.refresh_teacher_slot_claim(TG_ARGV[0],source);
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_teacher_slot_claim() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER shared_booking_slot_claim AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.sync_teacher_slot_claim('booking');
CREATE TRIGGER shared_package_slot_claim AFTER INSERT OR UPDATE OR DELETE ON public.planned_package_session_holds
  FOR EACH ROW EXECUTE FUNCTION public.sync_teacher_slot_claim('hold');

CREATE FUNCTION public.sync_order_slot_claims() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE h record;
BEGIN
  FOR h IN SELECT id FROM public.planned_package_session_holds WHERE pending_order_id=NEW.id ORDER BY id LOOP
    PERFORM public.refresh_teacher_slot_claim('hold',h.id::text);
  END LOOP;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_order_slot_claims() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER shared_order_slot_claims AFTER UPDATE OF status,hold_expires_at ON public.planned_package_pending_orders
  FOR EACH ROW EXECUTE FUNCTION public.sync_order_slot_claims();

DO $$ DECLARE row record; BEGIN
  FOR row IN SELECT id FROM public.planned_package_session_holds WHERE status='active' ORDER BY id LOOP
    PERFORM public.refresh_teacher_slot_claim('hold',row.id::text);
  END LOOP;
  FOR row IN SELECT id FROM public.bookings WHERE status IN ('pending_payment','confirmed') ORDER BY id LOOP
    PERFORM public.refresh_teacher_slot_claim('booking',row.id::text);
  END LOOP;
END $$;
COMMIT;
