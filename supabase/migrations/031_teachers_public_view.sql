-- Public reads must not download location.private (exact address / coords) over PostgREST.
-- Teacher-owned flows (onboarding, account) continue to SELECT from public.teachers.

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
  t.stripe_identity_failed_reason
FROM public.teachers t;

COMMENT ON VIEW public.teachers_public IS 'Same columns as teachers; location omits JSON key private.';

GRANT SELECT ON public.teachers_public TO anon, authenticated, service_role;
