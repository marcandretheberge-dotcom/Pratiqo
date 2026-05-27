-- =============================================================================
-- 075_fix_security_definer_views_and_spatial_ref_sys.sql
--
-- Clears the Supabase Security Advisor findings:
--
--   1. security_definer_view on:
--        public.teachers_public
--        public.teacher_revenue
--        public.revenue_daily
--
--   2. rls_disabled_in_public on:
--        public.spatial_ref_sys   (PostGIS extension-owned)
--
-- Design summary
-- --------------
-- public.teachers_public is the marketplace's single safe-public read surface.
-- Migration 070 intentionally made it SECURITY DEFINER (security_invoker=false)
-- so anon/authenticated could keep browsing after public.teachers was locked
-- down to owner-or-history reads. Supabase Security Advisor flags every
-- security_invoker=false view, so we restore the view to security_invoker=true
-- WITHOUT re-exposing the locked-down base tables, by routing all base reads
-- through a SECURITY DEFINER helper function `public.list_public_teachers()`.
-- The function returns only the marketplace-safe column projection (no
-- Stripe / Identity / diploma_url / location verification workflow fields),
-- with the same WHERE filters that migration 072 already enforced.
--
-- public.teacher_revenue and public.revenue_daily are not present in any of
-- the previous migrations in this repo — they are live-DB drift. We use
-- `ALTER VIEW IF EXISTS` so applying this migration is a no-op when they do
-- not exist, and revoke anon/authenticated access via DO/EXCEPTION blocks so
-- the migration still applies cleanly on a fresh dev database.
--
-- public.spatial_ref_sys is the PostGIS reference table. It is read-only
-- catalog data, but it must have RLS enabled to clear the advisor. We try to
-- enable RLS and gracefully fall back when the PostGIS extension owns the
-- table and Postgres refuses the ALTER as insufficient_privilege.
--
-- Audit queries (run before/after in Supabase Dashboard → SQL Editor):
--
--   SELECT schemaname, viewname, definition
--   FROM pg_views
--   WHERE schemaname = 'public'
--     AND viewname IN ('teachers_public', 'teacher_revenue', 'revenue_daily')
--   ORDER BY viewname;
--
--   SELECT n.nspname AS schema, c.relname AS view_name, c.reloptions
--   FROM pg_class c
--   JOIN pg_namespace n ON n.oid = c.relnamespace
--   WHERE n.nspname = 'public'
--     AND c.relname IN ('teachers_public', 'teacher_revenue', 'revenue_daily');
--
--   SELECT n.nspname AS schema, c.relname AS table_name,
--          e.extname AS extension_name,
--          pg_get_userbyid(c.relowner) AS owner
--   FROM pg_class c
--   JOIN pg_namespace n ON n.oid = c.relnamespace
--   LEFT JOIN pg_depend d ON d.objid = c.oid
--   LEFT JOIN pg_extension e ON e.oid = d.refobjid
--   WHERE n.nspname = 'public'
--     AND c.relname = 'spatial_ref_sys';
--
-- A persistent copy of these audit queries lives in
-- supabase/scripts/rls_audit.sql.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Step A — SECURITY DEFINER helper that powers public.teachers_public.
-- This is what lets the view be security_invoker = true safely: the function
-- runs with the definer's privileges (so it bypasses the locked-down RLS on
-- public.teachers and public.profiles), but only ever returns the safe public
-- marketplace projection. The caller still has zero direct access to either
-- base table.
-- ─────────────────────────────────────────────────────────────────────────────

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
    -- Strip the JSON sub-object holding the exact address / private coords.
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
    -- Public trust booleans only. Internal workflow enums (identity_status,
    -- stripe_identity_status, cv_verification_status) and phone_verified are
    -- intentionally excluded — same exclusion list as migration 070/072.
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
    -- Filter out failed Stripe Identity verifications at the row level so
    -- the raw `identity_status` enum does not need to be exposed publicly.
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
  'SECURITY DEFINER helper that powers public.teachers_public so the view '
  'can be security_invoker = true without granting anon/authenticated direct '
  'RLS access to the locked-down public.teachers and public.profiles base '
  'tables. Returns only the safe public marketplace projection (no Stripe / '
  'Identity / diploma_url / location-verification workflow columns). '
  'search_path is fixed to public to defeat search-path attacks against the '
  'SECURITY DEFINER privilege.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Step B — Rebuild public.teachers_public with security_invoker = true.
-- We DROP + CREATE because Postgres rejects switching reloptions and
-- shrinking the column list of an existing view via CREATE OR REPLACE.
-- ─────────────────────────────────────────────────────────────────────────────

DROP VIEW IF EXISTS public.teachers_public;

CREATE VIEW public.teachers_public
WITH (security_invoker = true)
AS
SELECT * FROM public.list_public_teachers();

GRANT SELECT ON public.teachers_public TO anon;
GRANT SELECT ON public.teachers_public TO authenticated;
GRANT SELECT ON public.teachers_public TO service_role;

COMMENT ON VIEW public.teachers_public IS
  '075: security_invoker = true. All row reads are routed through '
  'public.list_public_teachers() (SECURITY DEFINER) so anon/authenticated do '
  'NOT need direct RLS access to public.teachers or public.profiles. The '
  'column projection matches migration 072 and explicitly excludes Stripe '
  'Connect/Identity internals, diploma_url, phone_verified, identity_status, '
  'stripe_identity_status, location_verification_*, cv_verification_status.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Step C — public.teacher_revenue and public.revenue_daily.
--
-- These views are not present in any migration in this repository. They are
-- live-database drift (created via the Dashboard or an unmerged branch). We
-- flip them to security_invoker = true if they exist, and revoke any anon /
-- authenticated access so revenue analytics never reaches a browser.
--
-- "Do NOT drop views without recreating them exactly" — we don't drop them.
-- We only re-flag and revoke. service_role retains access for admin server
-- routes that legitimately query revenue.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER VIEW IF EXISTS public.teacher_revenue SET (security_invoker = true);
ALTER VIEW IF EXISTS public.revenue_daily   SET (security_invoker = true);

DO $$
BEGIN
  EXECUTE 'REVOKE ALL ON public.teacher_revenue FROM anon';
  EXECUTE 'REVOKE ALL ON public.teacher_revenue FROM authenticated';
  EXECUTE 'REVOKE ALL ON public.teacher_revenue FROM PUBLIC';
  RAISE NOTICE '[075_security] revoked anon/authenticated/PUBLIC access on public.teacher_revenue';
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE '[075_security] public.teacher_revenue does not exist on this database; skipping REVOKE';
END $$;

DO $$
BEGIN
  EXECUTE 'REVOKE ALL ON public.revenue_daily FROM anon';
  EXECUTE 'REVOKE ALL ON public.revenue_daily FROM authenticated';
  EXECUTE 'REVOKE ALL ON public.revenue_daily FROM PUBLIC';
  RAISE NOTICE '[075_security] revoked anon/authenticated/PUBLIC access on public.revenue_daily';
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE '[075_security] public.revenue_daily does not exist on this database; skipping REVOKE';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step D — public.spatial_ref_sys (PostGIS).
--
-- Try to enable RLS. If PostGIS owns the table, Postgres refuses the ALTER
-- with insufficient_privilege; we surface the situation as a NOTICE and the
-- migration still completes successfully. The advisor warning for this table
-- is then a known PostGIS limitation, not a Pratiqo data leak (the table
-- contains only public EPSG/SRID reference data).
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER TABLE IF EXISTS public.spatial_ref_sys ENABLE ROW LEVEL SECURITY';
    RAISE NOTICE '[075_security] enabled RLS on public.spatial_ref_sys';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE '[075_security] could not enable RLS on public.spatial_ref_sys (PostGIS extension-owned). Mark the advisor warning as accepted in the Supabase Dashboard.';
    WHEN undefined_table THEN
      RAISE NOTICE '[075_security] public.spatial_ref_sys does not exist on this database';
  END;
END $$;
