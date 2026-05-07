-- Stripe Billing state for Pratiqo Pro teacher memberships.
-- Lesson payments and Connect payouts remain separate from these fields.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text,
  ADD COLUMN IF NOT EXISTS pro_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS pro_current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS pro_cancel_at_period_end boolean DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan text DEFAULT 'free';

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
  ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_stripe_subscription_id
  ON public.profiles (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status
  ON public.profiles (subscription_status);

COMMENT ON COLUMN public.profiles.stripe_customer_id IS
  'Stripe Billing customer for Pratiqo Pro subscription. Not a Connect account id.';

COMMENT ON COLUMN public.profiles.stripe_subscription_id IS
  'Stripe Billing subscription for Pratiqo Pro membership.';

COMMENT ON COLUMN public.profiles.pro_current_period_end IS
  'Current period end reported by Stripe for the Pro subscription.';
