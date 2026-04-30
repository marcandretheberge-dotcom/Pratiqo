-- Student-facing location / currency / timezone prefs for matching and discovery.
-- Values for preferred_learning_format: no_preference | at_home | in_person | online | hybrid

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country_code text DEFAULT 'CA',
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/Toronto',
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'CAD',
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS preferred_learning_format text DEFAULT 'no_preference';

UPDATE public.profiles SET country_code = 'CA' WHERE country_code IS NULL;
UPDATE public.profiles SET timezone = 'America/Toronto' WHERE timezone IS NULL;
UPDATE public.profiles SET currency = 'CAD' WHERE currency IS NULL;

COMMENT ON COLUMN public.profiles.country_code IS 'ISO 3166-1 alpha-2 (student home country)';
COMMENT ON COLUMN public.profiles.preferred_learning_format IS 'Student lesson format pref: no_preference | at_home | in_person | online | hybrid';
