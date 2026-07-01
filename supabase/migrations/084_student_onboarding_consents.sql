-- Versioned student onboarding consent gate.
--
-- The append-only table stores only the minimum legal/product attestation
-- needed before a learner enters the student experience. It deliberately
-- avoids date of birth, child age, parent name, ID documents, IP address,
-- and teacher-sharing consent.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS student_onboarding_consent_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS student_onboarding_consent_version text;

COMMENT ON COLUMN public.profiles.student_onboarding_consent_completed_at IS
  'Timestamp when the current student onboarding consent gate was completed.';

COMMENT ON COLUMN public.profiles.student_onboarding_consent_version IS
  'Version of the student onboarding consent gate accepted by the user.';

CREATE TABLE IF NOT EXISTS public.student_onboarding_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_version text NOT NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('self_14_plus', 'parent_guardian')),
  accepted_terms boolean NOT NULL,
  accepted_privacy boolean NOT NULL,
  accepted_learning_data boolean NOT NULL,
  acknowledged_minor_lessons boolean NOT NULL,
  locale text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.student_onboarding_consents IS
  'Append-only student onboarding consent records. Owner-only via RLS; not used for teacher progress sharing.';

COMMENT ON COLUMN public.student_onboarding_consents.actor_type IS
  'Who is legally confirming the student account: self_14_plus or parent_guardian. Under-14 self-declaration is blocked and not stored.';

ALTER TABLE public.student_onboarding_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_onboarding_consents_select_own" ON public.student_onboarding_consents;
CREATE POLICY "student_onboarding_consents_select_own"
  ON public.student_onboarding_consents FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "student_onboarding_consents_insert_own" ON public.student_onboarding_consents;
CREATE POLICY "student_onboarding_consents_insert_own"
  ON public.student_onboarding_consents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

REVOKE ALL ON public.student_onboarding_consents FROM anon;
GRANT SELECT, INSERT ON public.student_onboarding_consents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_onboarding_consents TO service_role;
