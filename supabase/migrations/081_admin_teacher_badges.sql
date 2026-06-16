-- =============================================================================
-- 081_admin_teacher_badges.sql
--
-- Admin-controlled teacher trust badges. First and only badge in this
-- migration: "verified_experience" (FR "Expérience vérifiée").
--
-- Why this is a column on public.teachers and not a separate table:
--   * The badge is per-teacher, binary, and stamped with the actor who
--     toggled it. The teacher row already carries identity_verified /
--     diploma_verified / verification_level — adding the experience flag
--     here keeps every public trust signal projected through the same
--     read surface (`list_public_teachers()` / `teachers_public`).
--   * Forensic history of every toggle lives in
--     `public.admin_role_change_audit` (migration 079) with
--     `source = 'admin/users/teacher-badge'` — the same audit pattern
--     PR #194 (teacher-onboarding support) reuses.
--
-- Hard guardrails baked into this migration:
--   * The column is NOT NULL DEFAULT false, so the public surface never
--     ships a `null` boolean down to a card.
--   * The existing non-service-role write trigger
--     (migration 069 → `teachers_preserve_sensitive_client_fields`) is
--     extended below so a teacher CANNOT self-grant the badge by writing
--     to their own row from the browser. Only the admin API
--     (service-role) can flip the flag.
--   * Only the boolean `verified_experience_active` is projected publicly.
--     The audit metadata columns (`verified_experience_set_at` /
--     `verified_experience_set_by`) stay server-only — admins read them
--     through the service-role client; anon/authenticated never see them.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 1 — New columns on public.teachers.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS verified_experience_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_experience_set_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_experience_set_by uuid;

COMMENT ON COLUMN public.teachers.verified_experience_active IS
  'Admin-controlled "Expérience vérifiée" trust badge. Flipped only via the admin API (service-role) — see 081_admin_teacher_badges.sql. Diploma/CV uploads do NOT auto-toggle this.';

COMMENT ON COLUMN public.teachers.verified_experience_set_at IS
  'When the admin last toggled verified_experience_active. Never shown publicly; audit history lives in admin_role_change_audit.';

COMMENT ON COLUMN public.teachers.verified_experience_set_by IS
  'profiles.id of the admin who last toggled verified_experience_active. Never shown publicly.';

-- Helpful for the admin user list filters / counts if we add them later.
CREATE INDEX IF NOT EXISTS idx_teachers_verified_experience_active
  ON public.teachers (verified_experience_active)
  WHERE verified_experience_active = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 2 — Extend the non-service-role write guard (migration 069) so a
-- teacher cannot self-grant or self-revoke the badge from the browser.
--
-- CREATE OR REPLACE replaces the function body in place — the existing
-- trigger binding `teachers_preserve_sensitive_client_fields_trigger`
-- (still bound to public.teachers BEFORE INSERT OR UPDATE) keeps firing
-- the latest version. We preserve every protected column from 069 and
-- add the three new verified_experience_* columns.
-- ─────────────────────────────────────────────────────────────────────────────

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
    -- 081: admin-controlled trust badge — teacher cannot self-grant on insert.
    NEW.verified_experience_active := false;
    NEW.verified_experience_set_at := NULL;
    NEW.verified_experience_set_by := NULL;
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
    -- 081: admin-controlled trust badge — teacher cannot self-grant on update.
    NEW.verified_experience_active := OLD.verified_experience_active;
    NEW.verified_experience_set_at := OLD.verified_experience_set_at;
    NEW.verified_experience_set_by := OLD.verified_experience_set_by;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.teachers_preserve_sensitive_client_fields() IS
  '081: extends 069 to also pin verified_experience_active / _set_at / _set_by on non-service-role writes. The admin teacher badge is mutable only via the admin API (service-role).';

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 3 — Extend the public marketplace projection.
--
-- list_public_teachers() (migration 075) is the single safe-public read
-- surface for anon/authenticated. We add ONLY the boolean — never the
-- audit metadata — so:
--   * teacher cards / public profile can render the badge
--   * the admin id and toggle timestamp stay strictly server-side
--
-- We REPLACE the function (signature changes) and DROP+CREATE the
-- `teachers_public` view that selects FROM the function — same pattern as
-- migration 075. The view stays security_invoker=true and the function
-- stays SECURITY DEFINER with search_path locked to public.
-- ─────────────────────────────────────────────────────────────────────────────

-- 075 shipped as `CREATE OR REPLACE FUNCTION` returning a specific column
-- list. We need to DROP it because Postgres refuses to add a new column
-- to a SQL function's RETURNS TABLE list via CREATE OR REPLACE.
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
    -- Public trust booleans only. The set_at / set_by audit columns are
    -- intentionally NOT projected here so the admin actor stays private.
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
  WHERE COALESCE(t.is_public, true) = true
    AND t.deactivated_at IS NULL
    AND t.deleted_at IS NULL
    AND COALESCE(t.identity_status, 'none') <> 'failed'
    AND COALESCE(t.is_demo, false) = false
    AND t.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND t.user_id IS NOT NULL
    AND COALESCE(p.is_active, true) = true
    AND p.deactivated_at IS NULL
    AND p.deleted_at IS NULL
    AND p.anonymized_at IS NULL;
$$;

REVOKE ALL ON FUNCTION public.list_public_teachers() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_teachers() TO anon;
GRANT EXECUTE ON FUNCTION public.list_public_teachers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_teachers() TO service_role;

COMMENT ON FUNCTION public.list_public_teachers() IS
  '081: extends 075 projection with verified_experience_active (boolean only). The audit metadata (verified_experience_set_at, verified_experience_set_by) is intentionally NOT projected — admins read it through the service-role client, anon/authenticated never see who toggled the badge.';

CREATE VIEW public.teachers_public
WITH (security_invoker = true)
AS
SELECT * FROM public.list_public_teachers();

GRANT SELECT ON public.teachers_public TO anon;
GRANT SELECT ON public.teachers_public TO authenticated;
GRANT SELECT ON public.teachers_public TO service_role;

COMMENT ON VIEW public.teachers_public IS
  '081: security_invoker = true; projection comes from list_public_teachers(). Adds verified_experience_active boolean. The set_at/set_by audit columns stay off-projection by design.';
