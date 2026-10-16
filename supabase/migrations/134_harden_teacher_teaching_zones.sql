-- Apply with 128 schema-only in one transaction when 128 is not installed.
-- Existing zones are preserved; review historical coordinate provenance separately.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';
LOCK TABLE public.teacher_teaching_zones IN ACCESS EXCLUSIVE MODE;

ALTER TABLE public.teacher_teaching_zones ADD COLUMN active_slot smallint;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.teacher_teaching_zones WHERE is_active
    GROUP BY teacher_id HAVING count(*) > 3) THEN
    RAISE EXCEPTION 'Existing teacher exceeds three active zones; operator review required';
  END IF;
END $$;

-- Do not fire the old touch trigger or alter user timestamps during allocation.
ALTER TABLE public.teacher_teaching_zones DISABLE TRIGGER teacher_teaching_zones_touch_updated_at;
WITH slots AS (
  SELECT id, row_number() OVER (PARTITION BY teacher_id ORDER BY is_primary DESC, sort_order, id) AS slot
  FROM public.teacher_teaching_zones WHERE is_active
)
UPDATE public.teacher_teaching_zones z SET active_slot = s.slot FROM slots s WHERE z.id = s.id;
ALTER TABLE public.teacher_teaching_zones ENABLE TRIGGER teacher_teaching_zones_touch_updated_at;

ALTER TABLE public.teacher_teaching_zones ADD CONSTRAINT teacher_zones_active_slot_check
  CHECK ((is_active AND active_slot IS NOT NULL AND active_slot BETWEEN 1 AND 3)
    OR (NOT is_active AND active_slot IS NULL));
CREATE UNIQUE INDEX teacher_zones_active_slot_unique
  ON public.teacher_teaching_zones(teacher_id, active_slot) WHERE is_active;

CREATE OR REPLACE FUNCTION public.enforce_teacher_teaching_zones_limit()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF NOT NEW.is_active THEN NEW.active_slot := NULL; RETURN NEW; END IF;
  SELECT n::smallint INTO NEW.active_slot FROM generate_series(1,3) n
  WHERE NOT EXISTS (SELECT 1 FROM public.teacher_teaching_zones z
    WHERE z.teacher_id=NEW.teacher_id AND z.is_active AND z.active_slot=n AND z.id<>NEW.id)
  ORDER BY n LIMIT 1;
  IF NEW.active_slot IS NULL THEN
    RAISE EXCEPTION 'teacher_teaching_zones_max_active_exceeded' USING ERRCODE='23514';
  END IF;
  -- The unique index arbitrates concurrent snapshots, including REPEATABLE READ.
  -- A collision aborts the statement; callers may reload/retry, never exceed 3.
  RETURN NEW;
END $$;
DROP TRIGGER teacher_teaching_zones_limit_active ON public.teacher_teaching_zones;
CREATE TRIGGER teacher_teaching_zones_limit_active
  BEFORE INSERT OR UPDATE ON public.teacher_teaching_zones
  FOR EACH ROW EXECUTE FUNCTION public.enforce_teacher_teaching_zones_limit();

CREATE OR REPLACE FUNCTION public.replace_teacher_teaching_zones(p_teacher_id text, p_zones jsonb)
RETURNS SETOF public.teacher_teaching_zones LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public AS $$
BEGIN
  IF jsonb_typeof(coalesce(p_zones,'[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'invalid_zones_payload' USING ERRCODE='22023';
  END IF;
  IF jsonb_array_length(coalesce(p_zones,'[]'::jsonb)) > 3 THEN
    RAISE EXCEPTION 'teacher_teaching_zones_max_active_exceeded' USING ERRCODE='23514';
  END IF;
  -- Serialize full replacements even if the teacher currently has no zones.
  PERFORM 1 FROM public.teachers WHERE id=p_teacher_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'teacher_not_found' USING ERRCODE='23503'; END IF;
  DELETE FROM public.teacher_teaching_zones WHERE teacher_id=p_teacher_id;
  INSERT INTO public.teacher_teaching_zones(
    teacher_id,label_public,city,region,country_code,lat_public,lng_public,radius_km,
    zone_kind,is_primary,is_active,sort_order,availability_note_public,
    supports_at_teacher_place,supports_at_student_place,supports_public_place)
  SELECT p_teacher_id,btrim(e->>'label_public'),btrim(e->>'city'),
    nullif(btrim(coalesce(e->>'region','')),''),upper(btrim(coalesce(e->>'country_code','CA'))),
    nullif(e->>'lat_public','')::double precision,nullif(e->>'lng_public','')::double precision,
    coalesce(nullif(e->>'radius_km','')::integer,10),
    coalesce(nullif(btrim(e->>'zone_kind'),''),'service_area'),
    coalesce((e->>'is_primary')::boolean,false) AND coalesce((e->>'is_active')::boolean,true),
    coalesce((e->>'is_active')::boolean,true),coalesce(nullif(e->>'sort_order','')::integer,0),
    nullif(btrim(coalesce(e->>'availability_note_public','')),''),
    coalesce((e->>'supports_at_teacher_place')::boolean,false),
    coalesce((e->>'supports_at_student_place')::boolean,false),
    coalesce((e->>'supports_public_place')::boolean,false)
  FROM jsonb_array_elements(coalesce(p_zones,'[]'::jsonb)) e;
  RETURN QUERY SELECT * FROM public.teacher_teaching_zones WHERE teacher_id=p_teacher_id
    ORDER BY is_primary DESC,sort_order,created_at;
END $$;

-- Supabase default ACLs grant these roles explicitly, not only through PUBLIC.
REVOKE ALL ON FUNCTION public.replace_teacher_teaching_zones(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.replace_teacher_teaching_zones(text,jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.enforce_teacher_teaching_zones_limit() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.touch_teacher_teaching_zone_updated_at() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.teacher_teaching_zones FROM PUBLIC,anon;
COMMIT;
