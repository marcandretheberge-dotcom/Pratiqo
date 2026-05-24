-- Student search: expose safe profile avatars in teachers_public and exclude
-- demo/orphan rows from marketplace discovery.

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.teachers.is_demo IS
  'When true, the teacher is excluded from public discovery/search (seed/demo/test rows). Real teachers stay visible when false.';

-- Legacy seed rows shipped in 000_pratiqo_schema.sql (non-UUID ids, no auth user).
UPDATE public.teachers
SET is_demo = true
WHERE user_id IS NULL
   OR id::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

DROP VIEW IF EXISTS public.teachers_public;

CREATE VIEW public.teachers_public
WITH (security_invoker = false)
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
  CASE
    WHEN p.id IS NOT NULL
      AND COALESCE(p.is_active, true) = true
      AND p.deactivated_at IS NULL
      AND p.deleted_at IS NULL
      AND p.anonymized_at IS NULL
      AND NULLIF(BTRIM(p.photo_url), '') IS NOT NULL
    THEN BTRIM(p.photo_url)
    ELSE NULL
  END AS profile_photo_url,
  t.availability,
  (t.location - 'private'::text) AS location,
  t.is_verified,
  t.teaching_mode,
  t.languages,
  t.levels,
  t.created_at,
  t.updated_at,
  t.home_lesson_enabled,
  t.home_lesson_price,
  t.home_lesson_radius_km,
  t.home_lesson_min_duration,
  t.home_lesson_requires_confirmation,
  t.home_lesson_force_2h_over_20km,
  t.verification_level,
  t.identity_verified,
  t.diploma_verified,
  t.video_url,
  t.country_code,
  t.timezone,
  t.currency,
  t.city,
  t.region,
  t.cv_summary,
  t.intro_session_enabled,
  t.intro_session_duration_minutes,
  t.intro_session_price_cents,
  t.intro_session_discount_percent
FROM public.teachers t
INNER JOIN public.profiles p ON p.id = t.user_id
WHERE COALESCE(t.is_public, true) = true
  AND t.deactivated_at IS NULL
  AND t.deleted_at IS NULL
  AND COALESCE(t.identity_status, 'none') <> 'failed'
  AND COALESCE(t.is_demo, false) = false
  AND t.id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND t.user_id IS NOT NULL
  AND COALESCE(p.is_active, true) = true
  AND p.deactivated_at IS NULL
  AND p.deleted_at IS NULL
  AND p.anonymized_at IS NULL;

COMMENT ON VIEW public.teachers_public IS
  'Safe-public marketplace read surface. Joins active profiles for profile_photo_url. Excludes demo rows, deactivated/deleted teachers, failed identity verifications, and teachers without an active linked profile.';

GRANT SELECT ON public.teachers_public TO anon;
GRANT SELECT ON public.teachers_public TO authenticated;
GRANT SELECT ON public.teachers_public TO service_role;
