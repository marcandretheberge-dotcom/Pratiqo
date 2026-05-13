-- Hotfix for migration 056.
--
-- 056 declared public.nearby_teachers as RETURNS TABLE (id uuid, ...) but
-- public.teachers.id is `text` (legacy demo rows used short numeric ids;
-- production rows are UUID-shaped strings). On apply, Postgres raised
--   42P13: return type mismatch in function declared to return record
--   DETAIL:  Final statement returns text instead of uuid at column 1.
-- and the rest of 056's CREATE statements were skipped because they were
-- wrapped in BEGIN/COMMIT.
--
-- This migration is idempotent on top of 056 in any state:
-- 1. Ensure the extension, column, helper, trigger, backfill, and index
--    exist (no-ops when 056 succeeded for those statements before failing).
-- 2. Drop the broken function signature if it ever got created.
-- 3. Recreate nearby_teachers with id text and grant EXECUTE.

BEGIN;

CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS location_point geography(Point, 4326);

CREATE OR REPLACE FUNCTION public._teacher_location_point(loc jsonb)
RETURNS geography(Point, 4326)
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  lat double precision;
  lng double precision;
BEGIN
  IF loc IS NULL THEN
    RETURN NULL;
  END IF;
  lat := NULLIF(loc #>> '{public,lat}', '')::double precision;
  lng := NULLIF(loc #>> '{public,lng}', '')::double precision;
  IF lat IS NULL OR lng IS NULL THEN
    lat := NULLIF(loc ->> 'lat', '')::double precision;
    lng := NULLIF(loc ->> 'lng', '')::double precision;
  END IF;
  IF lat IS NULL OR lng IS NULL THEN
    RETURN NULL;
  END IF;
  IF lat < -90 OR lat > 90 OR lng < -180 OR lng > 180 THEN
    RETURN NULL;
  END IF;
  RETURN ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography;
EXCEPTION
  WHEN others THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public._teachers_sync_location_point()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.location_point := public._teacher_location_point(NEW.location);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS teachers_sync_location_point ON public.teachers;
CREATE TRIGGER teachers_sync_location_point
  BEFORE INSERT OR UPDATE OF location ON public.teachers
  FOR EACH ROW
  EXECUTE FUNCTION public._teachers_sync_location_point();

UPDATE public.teachers
  SET location_point = public._teacher_location_point(location)
  WHERE location_point IS NULL
    AND location IS NOT NULL;

CREATE INDEX IF NOT EXISTS teachers_location_point_gix
  ON public.teachers
  USING GIST (location_point);

-- Drop any prior signature (including the bad uuid one from 056) before
-- recreating with the corrected return type.
DROP FUNCTION IF EXISTS public.nearby_teachers(double precision, double precision, double precision, integer);

CREATE OR REPLACE FUNCTION public.nearby_teachers(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision,
  p_limit integer DEFAULT 200
)
RETURNS TABLE (
  id text,
  distance_km double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id,
         ST_Distance(
           t.location_point,
           ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
         ) / 1000.0 AS distance_km
  FROM public.teachers t
  WHERE t.location_point IS NOT NULL
    AND COALESCE(t.is_public, true) = true
    AND t.deactivated_at IS NULL
    AND t.deleted_at IS NULL
    AND ST_DWithin(
      t.location_point,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      GREATEST(p_radius_km, 0) * 1000.0
    )
  ORDER BY t.location_point <-> ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
  LIMIT GREATEST(LEAST(p_limit, 500), 1);
$$;

COMMENT ON FUNCTION public.nearby_teachers IS
  'Returns ids of public teachers within p_radius_km of (p_lat, p_lng), ordered by distance. id is text because teachers.id is text (legacy demo rows used short ids; production rows are UUID-shaped strings). SECURITY DEFINER so anon can call it without reading teachers.location_point directly.';

GRANT EXECUTE ON FUNCTION public.nearby_teachers(double precision, double precision, double precision, integer)
  TO anon, authenticated, service_role;

COMMIT;
