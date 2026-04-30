-- Denormalized location + market fields on teachers for search filters and soft matching.

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS country_code text DEFAULT 'CA',
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/Toronto',
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'CAD',
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS region text;

UPDATE public.teachers SET country_code = 'CA' WHERE country_code IS NULL;
UPDATE public.teachers SET timezone = 'America/Toronto' WHERE timezone IS NULL;
UPDATE public.teachers SET currency = 'CAD' WHERE currency IS NULL;

-- Safe backfill only when structured keys exist on location JSON (no guessing).
UPDATE public.teachers SET city = NULLIF(TRIM(location->>'city'), '') WHERE city IS NULL AND COALESCE(TRIM(location->>'city'), '') <> '';
UPDATE public.teachers SET city = NULLIF(TRIM(location->>'neighborhood'), '') WHERE city IS NULL AND COALESCE(TRIM(location->>'neighborhood'), '') <> '';

UPDATE public.teachers SET region = NULLIF(TRIM(location->>'region'), '') WHERE region IS NULL AND COALESCE(TRIM(location->>'region'), '') <> '';
UPDATE public.teachers SET region = NULLIF(TRIM(location->>'province'), '') WHERE region IS NULL AND COALESCE(TRIM(location->>'province'), '') <> '';
UPDATE public.teachers SET region = NULLIF(TRIM(location->>'state'), '') WHERE region IS NULL AND COALESCE(TRIM(location->>'state'), '') <> '';

COMMENT ON COLUMN public.teachers.country_code IS 'ISO 3166-1 alpha-2 (primary teaching market)';
COMMENT ON COLUMN public.teachers.city IS 'Primary city label for filters / soft matching';
