-- Loyalty + ristourne tracking (profiles)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS loyalty_tier text DEFAULT 'bronze';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS loyalty_annual_volume numeric DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS loyalty_cashback_earned numeric DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ristourne_months_active integer DEFAULT 0;
