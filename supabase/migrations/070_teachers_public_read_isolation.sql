-- D1 follow-up: harden teacher public-read access.
--
-- BEFORE this migration, public.teachers had a broad SELECT policy that let any
-- anon/authenticated browser read every column on every active public teacher row,
-- including private workflow fields:
--   stripe_account_id, stripe_connect_*, stripe_identity_*, stripe_identity_session_id,
--   stripe_identity_verified_at, phone_verified, identity_status,
--   diploma_url (path to private storage object), location_verification_status,
--   location_verified_at, location_verification_method, cv_verification_status,
--   admin/trust workflow fields, etc.
--
-- That made the per-column hardening from migration 069 incomplete for READS:
-- 069 prevented clients from WRITING those fields, but they could still SELECT them.
--
-- AFTER this migration:
--   1. Base public.teachers RLS only allows row reads for:
--        - the teacher's own auth.uid() (full row, dashboard/account flows)
--        - users with a real history (booking or group registration) with the teacher
--        - service_role (bypasses RLS automatically)
--      Anonymous browsers and unrelated authenticated users cannot directly
--      SELECT from public.teachers at all anymore.
--   2. public.teachers_public is the ONLY public-facing read surface and is the
--      single source of truth for what the marketplace exposes. It:
--        - runs in SECURITY DEFINER mode (security_invoker = false) so anon/
--          authenticated readers can keep reading via the view even though
--          base-table RLS no longer lets them through directly;
--        - exposes only fields that are intentionally public (no Stripe internals,
--          no diploma_url, no internal verification workflow enums);
--        - already filters out failed identity verifications inside the view's
--          WHERE clause so the raw `identity_status` enum does not need to leak
--          (preserves prior TeacherQuiz behavior of hiding failed teachers).
--
-- Important compatibility note about migration 057:
-- 057 raises an EXCEPTION if teachers_public is ever missing `stripe_identity_status`.
-- That column was kept for legacy public-listing fallbacks. With this migration we
-- intentionally remove `stripe_identity_status`, `identity_status`, `phone_verified`,
-- `diploma_url`, and the `location_verification_*` / `cv_verification_status` fields
-- from the public view, so 057's strict guard is now obsolete. The companion
-- patch to 057 (in the same PR) downgrades its check from RAISE EXCEPTION to
-- RAISE NOTICE so fresh dev databases applying migrations from scratch can
-- still progress past 057 → 070.

------------------------------------------------------------------------
-- 1. Tighten RLS on the base public.teachers table.
------------------------------------------------------------------------

-- Defensive: ensure RLS is enabled (idempotent if already on).
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teachers_select_public" ON public.teachers;

-- Owner-only / history-only SELECT. Public browsing now goes through
-- public.teachers_public (defined below as SECURITY DEFINER).
CREATE POLICY "teachers_select_owner_or_history"
  ON public.teachers FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.user_has_teacher_history(teachers.id, auth.uid())
  );

COMMENT ON POLICY "teachers_select_owner_or_history" ON public.teachers IS
  'Anon/unrelated authenticated readers cannot SELECT from public.teachers directly. Public marketplace surfaces must read public.teachers_public instead. Service_role bypasses RLS automatically.';

------------------------------------------------------------------------
-- 2. Rebuild public.teachers_public as a SECURITY DEFINER view with a
--    minimal, safe-public column list. DROP + recreate is required because
--    Postgres rejects shrinking a view via CREATE OR REPLACE, and because
--    flipping security_invoker AND changing the column list is cleanest as
--    a DROP/CREATE pair.
------------------------------------------------------------------------

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
  t.availability,
  -- Strip the JSON sub-object holding exact address / private coordinates.
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
  -- Public trust booleans only. Internal workflow enums (identity_status,
  -- stripe_identity_status) and phone_verified are intentionally excluded.
  t.identity_verified,
  t.diploma_verified,
  t.video_url,
  t.country_code,
  t.timezone,
  t.currency,
  t.city,
  t.region,
  -- Public CV blurb. cv_verification_status is admin workflow and stays private.
  t.cv_summary,
  t.intro_session_enabled,
  t.intro_session_duration_minutes,
  t.intro_session_price_cents,
  t.intro_session_discount_percent
FROM public.teachers t
WHERE COALESCE(t.is_public, true) = true
  AND t.deactivated_at IS NULL
  AND t.deleted_at IS NULL
  -- Filter out failed Stripe Identity verifications at the view level so the
  -- raw `identity_status` enum does not need to be exposed publicly.
  AND COALESCE(t.identity_status, 'none') <> 'failed'
  -- Demo / legacy rows with non-UUID ids must not appear in the marketplace
  -- (preserves the filter introduced by migration 054).
  AND t.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

COMMENT ON VIEW public.teachers_public IS
  'D1: single safe-public read surface for the marketplace. SECURITY DEFINER (security_invoker = false) so anon/authenticated can keep browsing even though base public.teachers RLS no longer allows them. Column list excludes Stripe Connect/Identity internals, diploma_url, phone_verified, identity_status, stripe_identity_status, location verification workflow, cv_verification_status. Failed identity verifications are filtered out at the view level.';

------------------------------------------------------------------------
-- 3. Re-grant SELECT to the public roles. Writes through the view are
--    not granted (the view is read-only by intent).
------------------------------------------------------------------------

GRANT SELECT ON public.teachers_public TO anon;
GRANT SELECT ON public.teachers_public TO authenticated;
GRANT SELECT ON public.teachers_public TO service_role;
