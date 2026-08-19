-- =============================================================================
-- 097_admin_manual_teacher_identity_verification.sql
--
-- Admin-only manual identity verification, separate from Stripe Identity.
--
-- A teacher is publicly identity-verified when EITHER Stripe Identity is
-- verified OR identity_verified_manually is true. Manual verification must
-- NEVER write stripe_identity_status / stripe_identity_session_id.
--
-- Public projection includes ONLY the boolean. Admin actor, timestamp, and
-- internal note stay server-side (service-role / Teacher 360).
-- =============================================================================

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS identity_verified_manually boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS identity_verified_manually_at timestamptz,
  ADD COLUMN IF NOT EXISTS identity_verified_manually_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS identity_manual_verification_note text;

COMMENT ON COLUMN public.teachers.identity_verified_manually IS
  'Admin-controlled identity verification, independent of Stripe Identity. Flipped only via the admin API (service-role).';

COMMENT ON COLUMN public.teachers.identity_verified_manually_at IS
  'When an admin last set identity_verified_manually. Never shown publicly.';

COMMENT ON COLUMN public.teachers.identity_verified_manually_by IS
  'profiles.id of the admin who last set identity_verified_manually. Never shown publicly.';

COMMENT ON COLUMN public.teachers.identity_manual_verification_note IS
  'Internal admin note for manual identity verification. Never projected publicly.';

CREATE INDEX IF NOT EXISTS idx_teachers_identity_verified_manually
  ON public.teachers (identity_verified_manually)
  WHERE identity_verified_manually = true;

-- Pin the new columns on non-service-role writes (extends 082).
CREATE OR REPLACE FUNCTION public.teachers_preserve_sensitive_client_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  jwt_role text;
BEGIN
  jwt_role := coalesce(
    auth.jwt() ->> 'role',
    current_setting('request.jwt.claim.role', true),
    ''
  );

  IF jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.identity_verified := false;
    NEW.diploma_verified := false;
    NEW.phone_verified := false;
    NEW.is_verified := false;
    NEW.verification_level := 0;
    NEW.stripe_account_id := NULL;
    NEW.stripe_connect_onboarding_complete := false;
    NEW.stripe_connect_charges_enabled := false;
    NEW.stripe_connect_payouts_enabled := false;
    NEW.stripe_connect_requirements_due := '[]'::jsonb;
    NEW.stripe_connect_disabled_reason := NULL;
    NEW.stripe_connect_last_synced_at := NULL;
    NEW.stripe_identity_status := NULL;
    NEW.stripe_identity_failed_reason := NULL;
    NEW.stripe_identity_session_id := NULL;
    NEW.stripe_identity_verified_at := NULL;
    NEW.location_verification_status := 'missing';
    NEW.location_verified_at := NULL;
    NEW.location_verification_method := NULL;
    NEW.cv_verification_status := 'missing';
    NEW.identity_status := 'none';
    NEW.deactivated_at := NULL;
    NEW.deleted_at := NULL;
    NEW.verified_experience_active := false;
    NEW.verified_experience_set_at := NULL;
    NEW.verified_experience_set_by := NULL;
    NEW.public_profile_enabled := false;
    NEW.search_indexing_consent := false;
    NEW.search_indexing_consented_at := NULL;
    NEW.search_indexing_consent_version := NULL;
    NEW.public_profile_slug := NULL;
    NEW.public_profile_last_indexable_at := NULL;
    -- 097: teachers cannot self-grant manual identity verification.
    NEW.identity_verified_manually := false;
    NEW.identity_verified_manually_at := NULL;
    NEW.identity_verified_manually_by := NULL;
    NEW.identity_manual_verification_note := NULL;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.identity_verified := OLD.identity_verified;
    NEW.diploma_verified := OLD.diploma_verified;
    NEW.phone_verified := OLD.phone_verified;
    NEW.is_verified := OLD.is_verified;
    NEW.verification_level := OLD.verification_level;
    NEW.stripe_account_id := OLD.stripe_account_id;
    NEW.stripe_connect_onboarding_complete := OLD.stripe_connect_onboarding_complete;
    NEW.stripe_connect_charges_enabled := OLD.stripe_connect_charges_enabled;
    NEW.stripe_connect_payouts_enabled := OLD.stripe_connect_payouts_enabled;
    NEW.stripe_connect_requirements_due := OLD.stripe_connect_requirements_due;
    NEW.stripe_connect_disabled_reason := OLD.stripe_connect_disabled_reason;
    NEW.stripe_connect_last_synced_at := OLD.stripe_connect_last_synced_at;
    NEW.stripe_identity_status := OLD.stripe_identity_status;
    NEW.stripe_identity_failed_reason := OLD.stripe_identity_failed_reason;
    NEW.stripe_identity_session_id := OLD.stripe_identity_session_id;
    NEW.stripe_identity_verified_at := OLD.stripe_identity_verified_at;
    NEW.location_verification_status := OLD.location_verification_status;
    NEW.location_verified_at := OLD.location_verified_at;
    NEW.location_verification_method := OLD.location_verification_method;
    NEW.cv_verification_status := OLD.cv_verification_status;
    NEW.identity_status := OLD.identity_status;
    NEW.deactivated_at := OLD.deactivated_at;
    NEW.deleted_at := OLD.deleted_at;
    NEW.verified_experience_active := OLD.verified_experience_active;
    NEW.verified_experience_set_at := OLD.verified_experience_set_at;
    NEW.verified_experience_set_by := OLD.verified_experience_set_by;
    NEW.public_profile_enabled := OLD.public_profile_enabled;
    NEW.search_indexing_consent := OLD.search_indexing_consent;
    NEW.search_indexing_consented_at := OLD.search_indexing_consented_at;
    NEW.search_indexing_consent_version := OLD.search_indexing_consent_version;
    NEW.public_profile_slug := OLD.public_profile_slug;
    NEW.public_profile_last_indexable_at := OLD.public_profile_last_indexable_at;
    NEW.identity_verified_manually := OLD.identity_verified_manually;
    NEW.identity_verified_manually_at := OLD.identity_verified_manually_at;
    NEW.identity_verified_manually_by := OLD.identity_verified_manually_by;
    NEW.identity_manual_verification_note := OLD.identity_manual_verification_note;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.teachers_preserve_sensitive_client_fields() IS
  '097: extends 082 to pin identity_verified_manually / _at / _by / note on non-service-role writes. Manual identity verification is mutable only via the admin API (service-role).';

-- Public projection: add the boolean only. DROP is required because Postgres
-- cannot add a RETURNS TABLE column via CREATE OR REPLACE.
DROP VIEW IF EXISTS public.teachers_public;
DROP FUNCTION IF EXISTS public.list_public_teachers();

CREATE FUNCTION public.list_public_teachers()
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
  identity_verified_manually          boolean,
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
    t.identity_verified_manually,
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
    AND (
      COALESCE(t.identity_status, 'none') <> 'failed'
      OR t.identity_verified_manually = true
    )
    AND (
      t.identity_verified = true
      OR t.identity_verified_manually = true
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
  '097: extends 086 with identity_verified_manually (boolean only). Admin actor/timestamp/note are NOT projected.';

CREATE VIEW public.teachers_public
WITH (security_invoker = true)
AS
SELECT * FROM public.list_public_teachers();

GRANT SELECT ON public.teachers_public TO anon;
GRANT SELECT ON public.teachers_public TO authenticated;
GRANT SELECT ON public.teachers_public TO service_role;

COMMENT ON VIEW public.teachers_public IS
  '097: security_invoker = true; projection comes from list_public_teachers(). Adds identity_verified_manually boolean. Manual note and admin actor stay off-projection.';
