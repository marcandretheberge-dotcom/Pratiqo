-- Public marketplace metadata table for teachers.
-- Decouples public display signals (plan tier, future: response rate, etc.)
-- from private billing data in `profiles`.
--
-- Only service_role / database triggers write here.
-- anon + authenticated can SELECT (public marketplace discovery).
-- No insert/update/delete policies for anon or authenticated.

-- ── Table ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.teacher_public_marketplace_metadata (
  teacher_id text PRIMARY KEY REFERENCES public.teachers (id) ON DELETE CASCADE,
  public_plan_tier text NOT NULL DEFAULT 'free'
    CHECK (public_plan_tier IN ('free', 'pro', 'enterprise')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.teacher_public_marketplace_metadata IS
  'Public-safe marketplace display signals for teachers. Maintained by DB triggers and server-side webhooks. Never written by client code.';

-- ── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.teacher_public_marketplace_metadata ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher_public_marketplace_metadata_select_public"
  ON public.teacher_public_marketplace_metadata;

CREATE POLICY "teacher_public_marketplace_metadata_select_public"
  ON public.teacher_public_marketplace_metadata
  FOR SELECT TO anon, authenticated
  USING (true);

-- Intentionally no INSERT / UPDATE / DELETE policies for anon or authenticated.
-- service_role bypasses RLS and is the only writer.

GRANT SELECT ON public.teacher_public_marketplace_metadata TO anon, authenticated, service_role;

-- ── Helper function ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.normalize_public_plan_tier(plan_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN lower(plan_value) = 'enterprise' THEN 'enterprise'
    WHEN lower(plan_value) = 'pro'        THEN 'pro'
    ELSE 'free'
  END;
$$;

-- ── Trigger: sync when profiles.plan changes ───────────────────────────────

CREATE OR REPLACE FUNCTION public.sync_teacher_plan_tier_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Update all teacher rows that belong to this profile user.
  INSERT INTO public.teacher_public_marketplace_metadata (teacher_id, public_plan_tier, updated_at)
  SELECT
    t.id,
    public.normalize_public_plan_tier(NEW.plan),
    now()
  FROM public.teachers t
  WHERE t.user_id = NEW.id
  ON CONFLICT (teacher_id) DO UPDATE
    SET public_plan_tier = EXCLUDED.public_plan_tier,
        updated_at       = EXCLUDED.updated_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_teacher_plan_tier_on_profile_update ON public.profiles;
CREATE TRIGGER trg_sync_teacher_plan_tier_on_profile_update
  AFTER INSERT OR UPDATE OF plan ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_teacher_plan_tier_from_profile();

-- ── Trigger: sync when a teacher row is inserted or user_id changes ────────

CREATE OR REPLACE FUNCTION public.sync_teacher_plan_tier_from_teacher()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_plan text;
BEGIN
  SELECT COALESCE(p.plan, 'free')
  INTO v_plan
  FROM public.profiles p
  WHERE p.id = NEW.user_id;

  INSERT INTO public.teacher_public_marketplace_metadata (teacher_id, public_plan_tier, updated_at)
  VALUES (NEW.id, public.normalize_public_plan_tier(v_plan), now())
  ON CONFLICT (teacher_id) DO UPDATE
    SET public_plan_tier = EXCLUDED.public_plan_tier,
        updated_at       = EXCLUDED.updated_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_teacher_plan_tier_on_teacher ON public.teachers;
CREATE TRIGGER trg_sync_teacher_plan_tier_on_teacher
  AFTER INSERT OR UPDATE OF user_id ON public.teachers
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_teacher_plan_tier_from_teacher();

-- ── Backfill existing teachers ─────────────────────────────────────────────

INSERT INTO public.teacher_public_marketplace_metadata (teacher_id, public_plan_tier, updated_at)
SELECT
  t.id,
  public.normalize_public_plan_tier(p.plan),
  now()
FROM public.teachers t
LEFT JOIN public.profiles p ON p.id = t.user_id
WHERE COALESCE(t.is_public, true) = true
  AND t.deactivated_at IS NULL
  AND t.deleted_at IS NULL
  AND t.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
ON CONFLICT (teacher_id) DO UPDATE
  SET public_plan_tier = EXCLUDED.public_plan_tier,
      updated_at       = EXCLUDED.updated_at;

-- ── Rebuild teachers_public with public_plan_tier ─────────────────────────

DROP VIEW IF EXISTS public.teachers_public;

CREATE VIEW public.teachers_public
WITH (security_invoker = true)
AS
SELECT
  t.id,
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
  (t.diploma_url IS NOT NULL AND COALESCE(t.diploma_verified, false) = false) AS diploma_pending,
  t.phone_verified,
  t.video_url,
  t.identity_status,
  t.stripe_identity_status,
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
  t.intro_session_discount_percent,
  t.user_id,
  COALESCE(m.public_plan_tier, 'free') AS public_plan_tier
FROM public.teachers t
LEFT JOIN public.teacher_public_marketplace_metadata m ON m.teacher_id = t.id
WHERE COALESCE(t.is_public, true) = true
  AND t.deactivated_at IS NULL
  AND t.deleted_at IS NULL
  AND t.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

COMMENT ON VIEW public.teachers_public IS
  'Public teacher profile rows. Private location, diploma URLs, and billing data are intentionally omitted. public_plan_tier is a safe marketplace display tier synced from profiles.plan.';

GRANT SELECT ON public.teachers_public TO anon;
GRANT SELECT ON public.teachers_public TO authenticated;
GRANT SELECT ON public.teachers_public TO service_role;
