-- 122: planned package manual transfer executions (admin-only Stripe Connect transfer audit)
--
-- Records admin-triggered Stripe transfers for eligible payout ledger entries.
-- Does NOT create transfer reversals, refunds, or automatic payouts.

CREATE TABLE IF NOT EXISTS public.planned_package_transfer_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  planned_package_order_id uuid NOT NULL
    REFERENCES public.planned_package_pending_orders (id) ON DELETE RESTRICT,

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

  stripe_transfer_id text,
  stripe_transfer_group text,
  stripe_destination_account_id text,

  idempotency_key text NOT NULL,

  failure_code text,
  failure_message text,

  executed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT planned_package_transfer_executions_status_chk
    CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled')),

  CONSTRAINT planned_package_transfer_executions_amount_positive_chk
    CHECK (amount_cents > 0),

  CONSTRAINT planned_package_transfer_executions_idempotency_key_uq
    UNIQUE (idempotency_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_planned_package_transfer_executions_entry_succeeded
  ON public.planned_package_transfer_executions (payout_eligibility_entry_id)
  WHERE status = 'succeeded';

CREATE UNIQUE INDEX IF NOT EXISTS idx_planned_package_transfer_executions_stripe_transfer_id
  ON public.planned_package_transfer_executions (stripe_transfer_id)
  WHERE stripe_transfer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_planned_package_transfer_executions_order_id
  ON public.planned_package_transfer_executions (planned_package_order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_planned_package_transfer_executions_entry_id
  ON public.planned_package_transfer_executions (payout_eligibility_entry_id);

COMMENT ON TABLE public.planned_package_transfer_executions IS
  'Admin-only Stripe Connect transfer execution audit for eligible planned package payout entries.';

ALTER TABLE public.planned_package_payout_eligibility_entries
  ADD COLUMN IF NOT EXISTS transfer_status text,
  ADD COLUMN IF NOT EXISTS transferred_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_transfer_execution_id uuid
    REFERENCES public.planned_package_transfer_executions (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transferred_at timestamptz;

COMMENT ON COLUMN public.planned_package_payout_eligibility_entries.transfer_status IS
  'Package session transfer state: null, pending, transferred, failed — not automatic payout.';

ALTER TABLE IF EXISTS public.planned_package_transfer_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY planned_package_transfer_executions_service_all
  ON public.planned_package_transfer_executions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
