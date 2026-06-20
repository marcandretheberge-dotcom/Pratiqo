-- Harden student onboarding consent records after the consent table was
-- introduced in 084. This is a forward-only production migration because
-- 083/084 may already have been applied manually before launch validation.
--
-- Security contract:
--   * authenticated users can read only their own consent records;
--   * authenticated users can append only their own consent records;
--   * anon has no table privileges;
--   * service_role keeps the existing administrative bypass convention.

ALTER TABLE IF EXISTS public.student_onboarding_consents ENABLE ROW LEVEL SECURITY;

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
