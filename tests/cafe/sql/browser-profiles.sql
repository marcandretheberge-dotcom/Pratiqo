-- Minimal application boundary for the disposable LOCAL browser test stack.
-- Real Supabase Auth owns auth.users; no fabricated users, JWTs or auth schema.
-- This fixture is never a production migration.
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  display_name text,
  email text,
  role text NOT NULL DEFAULT 'student',
  is_active boolean NOT NULL DEFAULT true,
  deletion_requested_at timestamptz,
  deleted_at timestamptz,
  companion_chosen boolean NOT NULL DEFAULT true,
  companion_type text DEFAULT 'forest',
  teacher_onboarding_complete boolean NOT NULL DEFAULT true,
  student_onboarding_consent_completed_at timestamptz DEFAULT now(),
  student_onboarding_consent_version text DEFAULT 'student_onboarding_consent_v1_2026_06',
  dashboard jsonb NOT NULL DEFAULT '{}'
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
CREATE POLICY browser_fixture_own_profile ON public.profiles
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = id);

CREATE TABLE public.student_private_locations (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  location jsonb
);
ALTER TABLE public.student_private_locations ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.student_private_locations TO authenticated;
CREATE POLICY browser_fixture_own_location ON public.student_private_locations
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
