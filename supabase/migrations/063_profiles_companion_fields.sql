ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS companion_type text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS companion_chosen boolean NOT NULL DEFAULT false;
