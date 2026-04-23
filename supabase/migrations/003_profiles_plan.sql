-- Monetization: teacher plans + limits
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan text DEFAULT 'free';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_student_count integer DEFAULT 0;

