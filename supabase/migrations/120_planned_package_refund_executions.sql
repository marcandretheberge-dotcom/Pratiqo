-- 120: planned package manual refund executions (admin-only Stripe refund audit)
--
-- Records admin-triggered Stripe refunds for approved refund quotes.
-- Does NOT create transfer reversals or teacher payouts.

CREATE TABLE IF NOT EXISTS public.planned_package_refund_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  planned_package_order_id uuid NOT NULL
    REFERENCES public.planned_package_pending_orders (id) ON DELETE RESTRICT,

  cancellation_request_id uuid NOT NULL
    REFERENCES public.planned_package_cancellation_requests (id) ON DELETE RESTRICT,

  refund_quote_id uuid NOT NULL
    REFERENCES public.planned_package_refund_quotes (id) ON DELETE RESTRICT,

  executed_by uuid NOT NULL REFERENCES auth.users (id),

  status text NOT NULL DEFAULT 'pending',

  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'CAD',

  stripe_refund_id text,
  stripe_payment_intent_id text,
  stripe_charge_id text,

  idempotency_key text NOT NULL,

  failure_code text,
  failure_message text,

  executed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT planned_package_refund_executions_status_chk
    CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled')),

  CONSTRAINT planned_package_refund_executions_amount_positive_chk
    CHECK (amount_cents > 0),

  CONSTRAINT planned_package_refund_executions_idempotency_key_uq
    UNIQUE (idempotency_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_planned_package_refund_executions_quote_succeeded
  ON public.planned_package_refund_executions (refund_quote_id)
  WHERE status = 'succeeded';

CREATE INDEX IF NOT EXISTS idx_planned_package_refund_executions_order_id
  ON public.planned_package_refund_executions (planned_package_order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_planned_package_refund_executions_quote_id
  ON public.planned_package_refund_executions (refund_quote_id);

COMMENT ON TABLE public.planned_package_refund_executions IS
  'Admin-only Stripe refund execution audit for planned package approved refund quotes.';

ALTER TABLE public.planned_package_pending_orders
  ADD COLUMN IF NOT EXISTS refund_status text,
  ADD COLUMN IF NOT EXISTS refunded_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_refund_execution_id uuid
    REFERENCES public.planned_package_refund_executions (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

COMMENT ON COLUMN public.planned_package_pending_orders.refund_status IS
  'Package-level refund state: null, partial, refunded, refund_failed, etc.';

ALTER TABLE IF EXISTS public.planned_package_refund_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY planned_package_refund_executions_service_all
  ON public.planned_package_refund_executions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- No anon/authenticated direct access — admin routes use service role.
