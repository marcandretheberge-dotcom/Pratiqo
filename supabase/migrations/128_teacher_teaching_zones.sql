-- =============================================================================
-- 128_teacher_teaching_zones.sql
--
-- Phase 1 multi-zone marketplace discovery:
--   * one teacher profile can expose up to 3 active public physical teaching zones;
--   * online remains a teaching_mode/format, not a zone;
--   * exact/private addresses stay out of this table and out of the public view;
--   * booking, schedule, pricing, payment, and teachers_public visibility gates
--     are intentionally unchanged.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.teacher_teaching_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id text NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  label_public text NOT NULL,
  city text NOT NULL,
  region text NULL,
  country_code text NOT NULL DEFAULT 'CA',
  lat_public double precision NULL,
  lng_public double precision NULL,
  radius_km integer NOT NULL DEFAULT 10,
  zone_kind text NOT NULL DEFAULT 'service_area',
  is_primary boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  availability_note_public text NULL,
  supports_at_teacher_place boolean NOT NULL DEFAULT false,
  supports_at_student_place boolean NOT NULL DEFAULT true,
  supports_public_place boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teacher_teaching_zones_radius_check CHECK (radius_km BETWEEN 1 AND 100),
  CONSTRAINT teacher_teaching_zones_label_check CHECK (char_length(btrim(label_public)) BETWEEN 2 AND 120),
  CONSTRAINT teacher_teaching_zones_city_check CHECK (char_length(btrim(city)) BETWEEN 2 AND 120),
  CONSTRAINT teacher_teaching_zones_region_check CHECK (region IS NULL OR char_length(btrim(region)) <= 80),
  CONSTRAINT teacher_teaching_zones_country_check CHECK (country_code ~ '^[A-Z]{2}$'),
  CONSTRAINT teacher_teaching_zones_kind_check CHECK (
    zone_kind IN ('primary_base', 'work_study_city', 'weekend_city', 'service_area', 'temporary')
  ),
  CONSTRAINT teacher_teaching_zones_lat_check CHECK (lat_public IS NULL OR lat_public BETWEEN -90 AND 90),
  CONSTRAINT teacher_teaching_zones_lng_check CHECK (lng_public IS NULL OR lng_public BETWEEN -180 AND 180),
  CONSTRAINT teacher_teaching_zones_coords_pair_check CHECK (
    (lat_public IS NULL AND lng_public IS NULL)
    OR (lat_public IS NOT NULL AND lng_public IS NOT NULL)
  )
);

COMMENT ON TABLE public.teacher_teaching_zones IS
  '128: public physical teaching zones for marketplace search/display. No exact address, no online zone, no booking/schedule/pricing semantics in Phase 1.';

CREATE INDEX IF NOT EXISTS teacher_teaching_zones_teacher_idx
  ON public.teacher_teaching_zones (teacher_id);

CREATE INDEX IF NOT EXISTS teacher_teaching_zones_active_teacher_idx
  ON public.teacher_teaching_zones (teacher_id, is_active, sort_order, created_at);

CREATE INDEX IF NOT EXISTS teacher_teaching_zones_city_idx
  ON public.teacher_teaching_zones (country_code, region, city)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS teacher_teaching_zones_coords_idx
  ON public.teacher_teaching_zones (lat_public, lng_public)
  WHERE is_active = true AND lat_public IS NOT NULL AND lng_public IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS teacher_teaching_zones_one_active_primary_idx
  ON public.teacher_teaching_zones (teacher_id)
  WHERE is_primary = true AND is_active = true;

CREATE OR REPLACE FUNCTION public.touch_teacher_teaching_zone_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS teacher_teaching_zones_touch_updated_at ON public.teacher_teaching_zones;
CREATE TRIGGER teacher_teaching_zones_touch_updated_at
BEFORE UPDATE ON public.teacher_teaching_zones
FOR EACH ROW
EXECUTE FUNCTION public.touch_teacher_teaching_zone_updated_at();

CREATE OR REPLACE FUNCTION public.enforce_teacher_teaching_zones_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  active_count integer;
BEGIN
  IF NEW.is_active = false THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
  INTO active_count
  FROM public.teacher_teaching_zones z
  WHERE z.teacher_id = NEW.teacher_id
    AND z.is_active = true
    AND z.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF active_count >= 3 THEN
    RAISE EXCEPTION 'teacher_teaching_zones_max_active_exceeded'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS teacher_teaching_zones_limit_active ON public.teacher_teaching_zones;
CREATE TRIGGER teacher_teaching_zones_limit_active
BEFORE INSERT OR UPDATE OF teacher_id, is_active ON public.teacher_teaching_zones
FOR EACH ROW
EXECUTE FUNCTION public.enforce_teacher_teaching_zones_limit();

ALTER TABLE public.teacher_teaching_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher_teaching_zones_select_own" ON public.teacher_teaching_zones;
CREATE POLICY "teacher_teaching_zones_select_own"
  ON public.teacher_teaching_zones FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = teacher_teaching_zones.teacher_id
        AND t.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "teacher_teaching_zones_insert_own" ON public.teacher_teaching_zones;
CREATE POLICY "teacher_teaching_zones_insert_own"
  ON public.teacher_teaching_zones FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = teacher_teaching_zones.teacher_id
        AND t.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "teacher_teaching_zones_update_own" ON public.teacher_teaching_zones;
CREATE POLICY "teacher_teaching_zones_update_own"
  ON public.teacher_teaching_zones FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = teacher_teaching_zones.teacher_id
        AND t.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = teacher_teaching_zones.teacher_id
        AND t.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "teacher_teaching_zones_delete_own" ON public.teacher_teaching_zones;
CREATE POLICY "teacher_teaching_zones_delete_own"
  ON public.teacher_teaching_zones FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = teacher_teaching_zones.teacher_id
        AND t.user_id = (SELECT auth.uid())
    )
  );

REVOKE ALL ON public.teacher_teaching_zones FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_teaching_zones TO authenticated;
GRANT ALL ON public.teacher_teaching_zones TO service_role;

CREATE OR REPLACE FUNCTION public.list_public_teacher_teaching_zones()
RETURNS TABLE (
  id uuid,
  teacher_id text,
  label_public text,
  city text,
  region text,
  country_code text,
  lat_public double precision,
  lng_public double precision,
  radius_km integer,
  zone_kind text,
  is_primary boolean,
  sort_order integer,
  availability_note_public text,
  supports_at_teacher_place boolean,
  supports_at_student_place boolean,
  supports_public_place boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    z.id,
    z.teacher_id,
    z.label_public,
    z.city,
    z.region,
    z.country_code,
    z.lat_public,
    z.lng_public,
    z.radius_km,
    z.zone_kind,
    z.is_primary,
    z.sort_order,
    z.availability_note_public,
    z.supports_at_teacher_place,
    z.supports_at_student_place,
    z.supports_public_place,
    z.created_at,
    z.updated_at
  FROM public.teacher_teaching_zones z
  WHERE z.is_active = true
    AND EXISTS (
      SELECT 1
      FROM public.teachers_public tp
      WHERE tp.id = z.teacher_id
    )
  ORDER BY z.teacher_id, z.is_primary DESC, z.sort_order ASC, z.created_at ASC;
$$;

REVOKE ALL ON FUNCTION public.list_public_teacher_teaching_zones() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_teacher_teaching_zones() TO anon;
GRANT EXECUTE ON FUNCTION public.list_public_teacher_teaching_zones() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_teacher_teaching_zones() TO service_role;

DROP VIEW IF EXISTS public.teacher_teaching_zones_public;
CREATE VIEW public.teacher_teaching_zones_public
WITH (security_invoker = true)
AS
SELECT * FROM public.list_public_teacher_teaching_zones();

GRANT SELECT ON public.teacher_teaching_zones_public TO anon;
GRANT SELECT ON public.teacher_teaching_zones_public TO authenticated;
GRANT SELECT ON public.teacher_teaching_zones_public TO service_role;

COMMENT ON VIEW public.teacher_teaching_zones_public IS
  '128: safe public active physical teaching zones for teachers already visible through teachers_public. No exact addresses or private teacher location JSON.';

CREATE OR REPLACE FUNCTION public.replace_teacher_teaching_zones(
  p_teacher_id text,
  p_zones jsonb
)
RETURNS SETOF public.teacher_teaching_zones
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF jsonb_typeof(COALESCE(p_zones, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'invalid_zones_payload' USING ERRCODE = '22023';
  END IF;

  IF jsonb_array_length(COALESCE(p_zones, '[]'::jsonb)) > 3 THEN
    RAISE EXCEPTION 'teacher_teaching_zones_max_active_exceeded'
      USING ERRCODE = 'check_violation';
  END IF;

  DELETE FROM public.teacher_teaching_zones
  WHERE teacher_id = p_teacher_id;

  INSERT INTO public.teacher_teaching_zones (
    teacher_id,
    label_public,
    city,
    region,
    country_code,
    lat_public,
    lng_public,
    radius_km,
    zone_kind,
    is_primary,
    is_active,
    sort_order,
    availability_note_public,
    supports_at_teacher_place,
    supports_at_student_place,
    supports_public_place
  )
  SELECT
    p_teacher_id,
    btrim(elem->>'label_public'),
    btrim(elem->>'city'),
    NULLIF(btrim(COALESCE(elem->>'region', '')), ''),
    upper(btrim(COALESCE(elem->>'country_code', 'CA'))),
    NULLIF(elem->>'lat_public', '')::double precision,
    NULLIF(elem->>'lng_public', '')::double precision,
    COALESCE(NULLIF(elem->>'radius_km', '')::integer, 10),
    COALESCE(NULLIF(btrim(elem->>'zone_kind'), ''), 'service_area'),
    COALESCE((elem->>'is_primary')::boolean, false),
    true,
    COALESCE(NULLIF(elem->>'sort_order', '')::integer, 0),
    NULLIF(btrim(COALESCE(elem->>'availability_note_public', '')), ''),
    COALESCE((elem->>'supports_at_teacher_place')::boolean, false),
    COALESCE((elem->>'supports_at_student_place')::boolean, true),
    COALESCE((elem->>'supports_public_place')::boolean, false)
  FROM jsonb_array_elements(COALESCE(p_zones, '[]'::jsonb)) AS elem;

  RETURN QUERY
  SELECT *
  FROM public.teacher_teaching_zones
  WHERE teacher_id = p_teacher_id
  ORDER BY is_primary DESC, sort_order ASC, created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_teacher_teaching_zones(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_teacher_teaching_zones(text, jsonb) TO service_role;

INSERT INTO public.teacher_teaching_zones (
  teacher_id,
  label_public,
  city,
  region,
  country_code,
  lat_public,
  lng_public,
  radius_km,
  zone_kind,
  is_primary,
  is_active,
  sort_order,
  supports_at_student_place
)
SELECT
  t.id,
  CASE
    WHEN NULLIF(BTRIM(COALESCE(t.city, t.location->'public'->>'city', t.location->>'city', '')), '') IS NOT NULL
      AND NULLIF(BTRIM(COALESCE(t.region, t.location->'public'->>'region', t.location->>'region', '')), '') IS NOT NULL
    THEN BTRIM(COALESCE(t.city, t.location->'public'->>'city', t.location->>'city')) || ', ' ||
         BTRIM(COALESCE(t.region, t.location->'public'->>'region', t.location->>'region'))
    ELSE BTRIM(COALESCE(t.city, t.location->'public'->>'city', t.location->>'city'))
  END AS label_public,
  BTRIM(COALESCE(t.city, t.location->'public'->>'city', t.location->>'city')) AS city,
  NULLIF(BTRIM(COALESCE(t.region, t.location->'public'->>'region', t.location->>'region', '')), '') AS region,
  UPPER(BTRIM(COALESCE(t.country_code, t.location->'public'->>'country_code', t.location->>'country', 'CA'))) AS country_code,
  NULLIF(COALESCE(t.location->'public'->>'lat', t.location->>'lat', t.location->>'fuzzed_lat'), '')::double precision AS lat_public,
  NULLIF(COALESCE(t.location->'public'->>'lng', t.location->>'lng', t.location->>'fuzzed_lng'), '')::double precision AS lng_public,
  CASE
    WHEN t.home_lesson_radius_km BETWEEN 1 AND 100 THEN t.home_lesson_radius_km
    ELSE 10
  END AS radius_km,
  'primary_base',
  true,
  true,
  0,
  true
FROM public.teachers t
WHERE NULLIF(BTRIM(COALESCE(t.city, t.location->'public'->>'city', t.location->>'city', '')), '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.teacher_teaching_zones z
    WHERE z.teacher_id = t.id
  );
