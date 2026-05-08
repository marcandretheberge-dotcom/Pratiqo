-- Phase 1: Paid 45-minute introductory/diagnostic session ("Séance d’introduction").
-- Optional for teachers; does not affect regular lesson pricing.

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS intro_session_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS intro_session_duration_minutes integer NOT NULL DEFAULT 45,
  ADD COLUMN IF NOT EXISTS intro_session_price_cents integer,
  ADD COLUMN IF NOT EXISTS intro_session_discount_percent integer NOT NULL DEFAULT 50;

COMMENT ON COLUMN public.teachers.intro_session_enabled IS
  'Whether the teacher offers an optional paid introductory session.';
COMMENT ON COLUMN public.teachers.intro_session_price_cents IS
  'Optional override for intro session price (minor units). If NULL, computed from hourly rate and discount percent.';

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS lesson_type text NOT NULL DEFAULT 'regular';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_lesson_type_check'
      AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_lesson_type_check CHECK (lesson_type IN ('regular', 'intro'));
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.bookings.lesson_type IS
  'regular or intro (paid introductory/diagnostic session).';

-- teachers_public is defined in later migrations (031 / 050); do not redefine here.
