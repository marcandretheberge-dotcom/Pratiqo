-- Progressive teacher verification (marketplace trust)
ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS verification_level integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS identity_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS diploma_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_notes text;

CREATE INDEX IF NOT EXISTS idx_teachers_verification_level ON public.teachers (verification_level);
