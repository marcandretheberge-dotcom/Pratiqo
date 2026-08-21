-- =============================================================================
-- 113_harden_teacher_schedule_exceptions_grants.sql
--
-- Defense-in-depth for PR 17B exceptions:
-- - ensure RLS stays enabled
-- - revoke anon / PUBLIC privileges (learners never read raw rows)
-- - keep authenticated + service_role grants for owner policies / server
-- =============================================================================

ALTER TABLE IF EXISTS public.teacher_schedule_exceptions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.teacher_schedule_exceptions FROM anon;
REVOKE ALL ON TABLE public.teacher_schedule_exceptions FROM PUBLIC;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.teacher_schedule_exceptions TO authenticated;
GRANT ALL ON TABLE public.teacher_schedule_exceptions TO service_role;

COMMENT ON TABLE public.teacher_schedule_exceptions IS
  'PR 17B: teacher-controlled date exceptions. Local exception_date; private notes never exposed to learners.';
