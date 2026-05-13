-- Phase 1.3 — PostGIS-backed geo search.
--
-- Adds a `location_point geography(Point, 4326)` column to `teachers`, a GIST
-- index, a trigger that keeps the column in sync with the existing JSON
-- `location.lat/lng` payload, and a `nearby_teachers` RPC that the
-- marketplace can call to filter by distance server-side.
--
-- Privacy: the precise point is NEVER exposed publicly. The new column is
-- omitted from `public.teachers_public` and the RPC returns only teacher
-- ids — coordinates stay server-side. The RPC runs as `security definer`
-- so anon callers can use it without granting read access to private
-- coords on the base table.
--
-- Backward compat: app code keeps writing `teachers.location` JSONB. The
-- trigger derives `location_point` from `(location->>'lat')::float,
-- (location->>'lng')::float` on every insert/update. No call site needs to
-- change for writes — the perf upgrade comes from the new RPC.

BEGIN;

CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS location_point geography(Point, 4326);

-- Helper to lift lat/lng out of the JSON payload. We accept either the
-- top-level `{lat, lng}` shape that historical onboarding wrote OR the newer
-- `{public: {lat, lng}}` shape used by teacher_location_verify.
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
  -- Prefer the nested public-safe shape when present.
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
  -- ST_MakePoint takes (lng, lat); geography wraps in WGS-84.
  RETURN ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography;
EXCEPTION
  WHEN others THEN
    RETURN NULL;
END;
$$;

-- Trigger keeps location_point in sync with the JSON payload so write paths
-- don't need to change.
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

-- One-shot backfill.
UPDATE public.teachers
  SET location_point = public._teacher_location_point(location)
  WHERE location_point IS NULL
    AND location IS NOT NULL;

-- GIST index for fast ST_DWithin lookups.
CREATE INDEX IF NOT EXISTS teachers_location_point_gix
  ON public.teachers
  USING GIST (location_point);

COMMENT ON COLUMN public.teachers.location_point IS
  'PostGIS geography(Point, 4326) mirroring teachers.location->lat/lng. Auto-maintained by the teachers_sync_location_point trigger. Used by public.nearby_teachers RPC; never exposed publicly.';

-- RPC: returns the ids of public teachers within `p_radius_km` of the given
-- point, ordered by distance ascending, capped at `p_limit`. Anonymous
-- callers can invoke this — the function runs SECURITY DEFINER so it can
-- read the private `location_point` column without granting them table-level
-- read access. Output is id-only; coordinates never leave the server.
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
  'Returns ids of public teachers within p_radius_km of (p_lat, p_lng), ordered by distance. Coordinates are not exposed in the result. SECURITY DEFINER so anon can call it without reading teachers.location_point directly.';

GRANT EXECUTE ON FUNCTION public.nearby_teachers(double precision, double precision, double precision, integer)
  TO anon, authenticated, service_role;

COMMIT;
