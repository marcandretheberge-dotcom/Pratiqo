-- Teacher onboarding completion flag (profiles)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS teacher_onboarding_complete boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_teacher_onboarding
  ON public.profiles (teacher_onboarding_complete);

