-- Credit system: balance, referral codes, transaction history

-- Credit balance on profile (capped at 20 in application code)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS credit_balance numeric NOT NULL DEFAULT 0;

-- Unique referral code per user (lazy-generated on first GET /api/credits)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

-- Who referred this user (set once at signup, not overwritten)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Credit transaction log
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  type text NOT NULL, -- 'companion_evolution' | 'referral' | 'review'
  description text NOT NULL DEFAULT '',
  -- Optional idempotency key per (user_id, type, reference_id)
  reference_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, type, reference_id)
);

CREATE INDEX IF NOT EXISTS idx_credit_txn_user ON public.credit_transactions (user_id, created_at DESC);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own credit transactions"
  ON public.credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Prevent duplicate reviews per student/teacher pair
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_student_teacher_unique UNIQUE (student_id, teacher_id);
