-- Restore teachers_public columns removed by 050 because lib/supabase/queries.ts TEACHERS_LIST_SELECT references user_id and stripe_identity_status.

DROP VIEW IF EXISTS public.teachers_public;

CREATE VIEW public.teachers_public
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
  t.location - 'private'::text AS location,
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
  t.phone_verified,
  t.video_url,
  t.identity_status,
  t.stripe_identity_status,
  t.diploma_url,
  t.country_code,
  t.timezone,
  t.currency,
  t.city,
  t.region,
  t.location_verification_status,
  t.location_verified_at,
  t.location_verification_method,
  t.cv_summary,
  t.cv_verification_status,
  t.intro_session_enabled,
  t.intro_session_duration_minutes,
  t.intro_session_price_cents,
  t.intro_session_discount_percent
FROM public.teachers t
WHERE COALESCE(t.is_public, true) = true
  AND t.deactivated_at IS NULL
  AND t.deleted_at IS NULL;

GRANT SELECT ON public.teachers_public TO anon;
GRANT SELECT ON public.teachers_public TO authenticated;
GRANT SELECT ON public.teachers_public TO service_role;
