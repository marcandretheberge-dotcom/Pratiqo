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

-- Ensure public discovery view exposes intro settings safely.
CREATE OR REPLACE VIEW public.teachers_public
WITH (security_invoker = true)
AS
SELECT
  t.id,
  t.user_id,
  t.name,
  t.discipline,
  t.category,
  t.rating,
  t.reviews,
  t.price_per_lesson,
  t.monthly_subscription,
  t.bio,
  t.image_url,
  t.availability,
  t.location - 'private' AS location,
  t.is_verified,
  t.teaching_mode,
  t.languages,
  t.levels,
  t.created_at,
  t.updated_at,
  t.stripe_account_id,
  t.home_lesson_enabled,
  t.home_lesson_price,
  t.home_lesson_radius_km,
  t.home_lesson_min_duration,
  t.home_lesson_requires_confirmation,
  t.home_lesson_force_2h_over_20km,
  t.verification_level,
  t.identity_verified,
  t.diploma_verified,
  t.phone_verified,
  t.verification_notes,
  t.video_url,
  t.identity_status,
  t.diploma_url,
  t.country_code,
  t.timezone,
  t.currency,
  t.city,
  t.region,
  t.stripe_identity_session_id,
  t.stripe_identity_status,
  t.stripe_identity_verified_at,
  t.stripe_identity_failed_reason,
  t.is_public,
  t.deactivated_at,
  t.deleted_at,
  t.intro_session_enabled,
  t.intro_session_duration_minutes,
  t.intro_session_price_cents,
  t.intro_session_discount_percent
FROM public.teachers t
WHERE COALESCE(t.is_public, true) = true
  AND t.deactivated_at IS NULL
  AND t.deleted_at IS NULL;

GRANT SELECT ON public.teachers_public TO anon, authenticated, service_role;

