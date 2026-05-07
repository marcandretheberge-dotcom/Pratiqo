-- Account privacy controls:
-- - public profile visibility can be toggled without deleting history
-- - account deletion requests are tracked for manual/anonymization review
-- - payment/booking/Stripe records are intentionally retained for reconciliation

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS anonymized_at timestamptz;

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

COMMENT ON COLUMN public.profiles.deletion_requested_at IS 'User requested personal data deletion/anonymization review.';
COMMENT ON COLUMN public.profiles.anonymized_at IS 'When personal fields were anonymized after retention/legal review.';
COMMENT ON COLUMN public.teachers.is_public IS 'Whether the teacher can appear in public discovery/search.';

CREATE INDEX IF NOT EXISTS idx_profiles_deletion_requested
  ON public.profiles (deletion_requested_at)
  WHERE deletion_requested_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_teachers_public_visibility
  ON public.teachers (is_public, deactivated_at, deleted_at);

CREATE OR REPLACE FUNCTION public.user_has_teacher_history(p_teacher_id text, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.teacher_id = p_teacher_id
        AND b.student_id = p_user_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.group_sessions gs
      JOIN public.group_registrations gr ON gr.session_id = gs.id
      WHERE gs.teacher_id = p_teacher_id
        AND gr.student_id = p_user_id
    );
$$;

REVOKE ALL ON FUNCTION public.user_has_teacher_history(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_teacher_history(text, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "teachers_select_public" ON public.teachers;
CREATE POLICY "teachers_select_public"
  ON public.teachers FOR SELECT
  USING (
    (
      COALESCE(is_public, true) = true
      AND deactivated_at IS NULL
      AND deleted_at IS NULL
    )
    OR auth.uid() = user_id
    OR public.user_has_teacher_history(teachers.id, auth.uid())
  );

-- Public reads must not download location.private and must not include hidden/deactivated/deleted teachers.
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
  t.deleted_at
FROM public.teachers t
WHERE COALESCE(t.is_public, true) = true
  AND t.deactivated_at IS NULL
  AND t.deleted_at IS NULL;

COMMENT ON VIEW public.teachers_public IS 'Public teacher profile rows; location omits private data and hidden/deleted profiles are excluded.';

GRANT SELECT ON public.teachers_public TO anon, authenticated, service_role;
