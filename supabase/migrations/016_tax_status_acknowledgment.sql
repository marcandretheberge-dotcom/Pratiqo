-- Legal compliance: teacher self-employed contractor acknowledgment

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tax_status_acknowledged boolean DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tax_status_acknowledged_at timestamptz;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS no_exclusivity_acknowledged boolean DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS no_income_guarantee_acknowledged boolean DEFAULT false;
