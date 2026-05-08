-- Public-safe trust foundations.
-- These fields record status only; private address data and documents stay out of public UI.

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS location_verification_status text NOT NULL DEFAULT 'missing',
  ADD COLUMN IF NOT EXISTS location_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS location_verification_method text,
  ADD COLUMN IF NOT EXISTS cv_summary text,
  ADD COLUMN IF NOT EXISTS cv_verification_status text NOT NULL DEFAULT 'missing';

DO $$
BEGIN
  ALTER TABLE public.teachers
    ADD CONSTRAINT teachers_location_verification_status_check
    CHECK (location_verification_status IN ('missing', 'pending', 'verified', 'rejected'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.teachers
    ADD CONSTRAINT teachers_location_verification_method_check
    CHECK (
      location_verification_method IS NULL
      OR location_verification_method IN ('manual', 'booking_history', 'document', 'other')
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.teachers
    ADD CONSTRAINT teachers_cv_verification_status_check
    CHECK (cv_verification_status IN ('missing', 'provided', 'pending', 'verified', 'rejected'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.teachers.location_verification_status IS 'Public-safe status only; exact address stays private.';
COMMENT ON COLUMN public.teachers.cv_summary IS 'Teacher-provided professional background summary. Not a verified credential unless cv_verification_status = verified.';
COMMENT ON COLUMN public.teachers.cv_verification_status IS 'Professional background/CV status: missing, provided, pending, verified, rejected.';

CREATE INDEX IF NOT EXISTS idx_teachers_location_verification_status
  ON public.teachers (location_verification_status);

CREATE INDEX IF NOT EXISTS idx_teachers_cv_verification_status
  ON public.teachers (cv_verification_status);

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
  t.location_verification_status,
  t.location_verified_at,
  t.location_verification_method,
  t.cv_summary,
  t.cv_verification_status
FROM public.teachers t
WHERE COALESCE(t.is_public, true) = true
  AND t.deactivated_at IS NULL
  AND t.deleted_at IS NULL;

COMMENT ON VIEW public.teachers_public IS 'Public teacher profile rows; location omits private data and hidden/deleted profiles are excluded.';

GRANT SELECT ON public.teachers_public TO anon, authenticated, service_role;
