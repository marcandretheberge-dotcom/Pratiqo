-- Credits system v2: checkout integration, lifecycle fields, milestone amounts

-- Track credits applied at checkout
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS credits_applied numeric NOT NULL DEFAULT 0;

-- Lifecycle fields on credit_transactions
ALTER TABLE public.credit_transactions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
  -- 'active' | 'used' | 'expired'

ALTER TABLE public.credit_transactions
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Allow 'credit_used' and 'referee_bonus' in addition to existing types (comment only — no CHECK constraint)

-- Insert policy so the webhook/server can write transactions via service role
-- (service role bypasses RLS anyway, but make explicit for anon client fallback)
CREATE POLICY IF NOT EXISTS "Service role writes credit transactions"
  ON public.credit_transactions FOR INSERT
  WITH CHECK (true);
