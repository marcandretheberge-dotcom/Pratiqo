-- Fix: RLS infinite recursion on public.bookings (Postgres 42P17)
--
-- Root cause (introduced in 043_learner_profiles_phase1.sql):
-- - bookings INSERT/UPDATE policies validate learner_profile_id by querying learner_profiles
-- - learner_profiles SELECT policy granted teachers access by querying bookings
-- This creates a circular RLS dependency:
--   bookings policy -> learner_profiles RLS -> bookings policy -> ... -> 42P17.
--
-- Approach:
-- - Keep the same access semantics.
-- - Remove the direct bookings subquery from the learner_profiles SELECT policy.
-- - Replace it with a SECURITY DEFINER helper that returns only a boolean and
--   runs with table-owner privileges (bypassing RLS), breaking the cycle.

-- -----------------------------------------------------------------------------
-- Helper: can the current user (auth.uid) read a learner profile as the teacher?
-- Use CREATE OR REPLACE without dropping first: remote databases may already have
-- a learner_profiles policy depending on the helper.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_teacher_read_learner_profile(p_learner_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.teachers t ON t.id = b.teacher_id
    WHERE b.learner_profile_id = p_learner_profile_id
      AND t.user_id = auth.uid()
      AND b.status IN ('confirmed', 'completed')
  );
$$;

REVOKE ALL ON FUNCTION public.can_teacher_read_learner_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_teacher_read_learner_profile(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- Learner profiles: rewrite SELECT policy to avoid direct bookings query
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "learner_profiles_owner_select" ON public.learner_profiles;

CREATE POLICY "learner_profiles_owner_select"
  ON public.learner_profiles FOR SELECT TO authenticated
  USING (
    owner_user_id = auth.uid()
    OR public.can_teacher_read_learner_profile(learner_profiles.id)
  );


