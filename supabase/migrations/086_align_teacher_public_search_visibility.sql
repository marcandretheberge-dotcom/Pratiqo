-- Align public teacher marketplace visibility with the TypeScript/admin
-- search visibility contract.
--
-- This is a forward-only replacement of the SECURITY DEFINER helper that
-- powers public.teachers_public. The view remains:
--
--   public.teachers_public AS SELECT * FROM public.list_public_teachers()
--
-- Scope:
--   * no international expansion
--   * no auto-publishing
--   * no private address / exact-coordinate projection
--   * no Stripe/payment/booking/commission changes

CREATE OR REPLACE FUNCTION public.list_public_teachers()
RETURNS TABLE (
  id                                  text,
  user_id                             uuid,
  name                                text,
  discipline                          text,
  category                            text,
  rating                              double precision,
  reviews                             integer,
  price_per_lesson                    numeric,
  monthly_subscription                numeric,
  bio                                 text,
  image_url                           text,
  profile_photo_url                   text,
  availability                        jsonb,
  location                            jsonb,
  is_verified                         boolean,
  teaching_mode                       text,
  languages                           text[],
  levels                              text[],
  created_at                          timestamptz,
  updated_at                          timestamptz,
  home_lesson_enabled                 boolean,
  home_lesson_price                   numeric,
  home_lesson_radius_km               integer,
  home_lesson_min_duration            integer,
  home_lesson_requires_confirmation   boolean,
  home_lesson_force_2h_over_20km      boolean,
  default_lesson_duration_minutes     integer,
  verification_level                  integer,
  identity_verified                   boolean,
  diploma_verified                    boolean,
  verified_experience_active          boolean,
  video_url                           text,
  country_code                        text,
  timezone                            text,
  currency                            text,
  city                                text,
  region                              text,
  cv_summary                          text,
  intro_session_enabled               boolean,
  intro_session_duration_minutes      integer,
  intro_session_price_cents           integer,
  intro_session_discount_percent      integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    t.default_lesson_duration_minutes,
    t.verification_level,
    t.identity_verified,
    t.diploma_verified,
    t.verified_experience_active,
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
  WHERE t.is_public = true
    AND t.deactivated_at IS NULL
    AND t.deleted_at IS NULL
    AND COALESCE(t.identity_status, 'none') <> 'failed'
    AND (
      t.identity_verified = true
      OR NULLIF(BTRIM(COALESCE(t.stripe_identity_failed_reason, '')), '') IS NULL
    )
    AND COALESCE(t.is_demo, false) = false
    AND t.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND t.user_id IS NOT NULL
    AND COALESCE(p.is_active, true) = true
    AND p.role = 'teacher'
    AND p.deactivated_at IS NULL
    AND p.deleted_at IS NULL
    AND p.anonymized_at IS NULL
    AND NULLIF(BTRIM(t.name), '') IS NOT NULL
    AND NULLIF(BTRIM(t.bio), '') IS NOT NULL
    AND UPPER(BTRIM(COALESCE(t.country_code, ''))) = 'CA'
    AND t.price_per_lesson IS NOT NULL
    AND t.price_per_lesson > 0
    AND (
      NULLIF(BTRIM(COALESCE(t.discipline, '')), '') IS NOT NULL
      OR NULLIF(BTRIM(COALESCE(t.category, '')), '') IS NOT NULL
      OR EXISTS (
        SELECT 1
        FROM public.teacher_disciplines td
        WHERE td.teacher_id = t.id
      )
    )
    AND NULLIF(BTRIM(t.teaching_mode), '') IS NOT NULL
    AND (
      LOWER(BTRIM(t.teaching_mode)) IN ('online', 'both', 'all')
      OR (
        NULLIF(BTRIM(COALESCE(t.city, '')), '') IS NOT NULL
        AND NULLIF(BTRIM(COALESCE(t.region, '')), '') IS NOT NULL
      )
      OR (
        jsonb_typeof(t.location -> 'public') = 'object'
        AND (
          (
            jsonb_typeof(t.location -> 'public' -> 'lat') = 'number'
            AND jsonb_typeof(t.location -> 'public' -> 'lng') = 'number'
          )
          OR (
            jsonb_typeof(t.location -> 'public' -> 'latitude') = 'number'
            AND jsonb_typeof(t.location -> 'public' -> 'longitude') = 'number'
          )
        )
      )
    );
$$;

REVOKE ALL ON FUNCTION public.list_public_teachers() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_teachers() TO anon;
GRANT EXECUTE ON FUNCTION public.list_public_teachers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_teachers() TO service_role;

COMMENT ON FUNCTION public.list_public_teachers() IS
  '086: aligns public marketplace visibility with TypeScript diagnostics. Requires t.is_public = true, Canada teacher market, complete public basics, subject, base rate, teaching format, safe in-person location when needed, and failed-identity exclusion.';
