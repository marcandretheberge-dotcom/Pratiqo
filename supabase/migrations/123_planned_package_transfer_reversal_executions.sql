-- 123: planned package manual transfer reversal executions (admin-only Stripe Connect reversal audit)
--
-- Records admin-triggered Stripe transfer reversals for succeeded planned package transfers.
-- Does NOT create refunds, new transfers, or automatic reversals.

CREATE TABLE IF NOT EXISTS public.planned_package_transfer_reversal_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  planned_package_order_id uuid NOT NULL
    REFERENCES public.planned_package_pending_orders (id) ON DELETE RESTRICT,

  transfer_execution_id uuid NOT NULL
    REFERENCES public.planned_package_transfer_executions (id) ON DELETE RESTRICT,

  payout_eligibility_entry_id uuid NOT NULL
    REFERENCES public.planned_package_payout_eligibility_entries (id) ON DELETE RESTRICT,

  booking_id uuid NOT NULL
    REFERENCES public.bookings (id) ON DELETE RESTRICT,

  teacher_id text NOT NULL
    REFERENCES public.teachers (id) ON DELETE RESTRICT,

  student_id uuid NOT NULL
    REFERENCES auth.users (id) ON DELETE RESTRICT,

  teacher_offer_id uuid
    REFERENCES public.teacher_offers (id) ON DELETE SET NULL,

  executed_by uuid NOT NULL REFERENCES auth.users (id),

  status text NOT NULL DEFAULT 'pending',

  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'CAD',

  stripe_transfer_id text NOT NULL,
  stripe_transfer_reversal_id text,
  stripe_balance_transaction_id text,

  idempotency_key text NOT NULL,

  reversal_reason text NOT NULL,
  admin_note text,

  failure_code text,
  failure_message text,

  executed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT planned_package_transfer_reversal_executions_status_chk
    CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled')),

  CONSTRAINT planned_package_transfer_reversal_executions_amount_positive_chk
    CHECK (amount_cents > 0),

  CONSTRAINT planned_package_transfer_reversal_executions_reason_chk
    CHECK (reversal_reason IN (
      'refund_required',
      'cancellation_after_transfer',
      'dispute',
      'admin_correction',
      'teacher_no_show',
      'duplicate_transfer',
      'other'
    )),

  CONSTRAINT planned_package_transfer_reversal_executions_idempotency_key_uq
    UNIQUE (idempotency_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_planned_package_transfer_reversal_stripe_id
  ON public.planned_package_transfer_reversal_executions (stripe_transfer_reversal_id)
  WHERE stripe_transfer_reversal_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_planned_package_transfer_reversal_transfer_execution
  ON public.planned_package_transfer_reversal_executions (transfer_execution_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_planned_package_transfer_reversal_order_id
  ON public.planned_package_transfer_reversal_executions (planned_package_order_id, created_at DESC);

COMMENT ON TABLE public.planned_package_transfer_reversal_executions IS
  'Admin-only Stripe Connect transfer reversal audit for succeeded planned package transfers.';

ALTER TABLE public.planned_package_transfer_executions
  ADD COLUMN IF NOT EXISTS reversed_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reversal_status text,
  ADD COLUMN IF NOT EXISTS last_reversal_execution_id uuid
    REFERENCES public.planned_package_transfer_reversal_executions (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reversed_at timestamptz;

ALTER TABLE public.planned_package_payout_eligibility_entries
  ADD COLUMN IF NOT EXISTS transfer_reversal_status text,
  ADD COLUMN IF NOT EXISTS reversed_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_transfer_reversal_execution_id uuid
    REFERENCES public.planned_package_transfer_reversal_executions (id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.planned_package_transfer_reversal_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY planned_package_transfer_reversal_executions_service_all
  ON public.planned_package_transfer_reversal_executions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
