-- 119: planned package cancellation requests + refund quotes (quote-only, no Stripe refund)
--
-- Audit trail for admin-reviewed refund estimates. Does NOT execute refunds or transfers.

CREATE TABLE IF NOT EXISTS public.planned_package_cancellation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  planned_package_order_id uuid NOT NULL
    REFERENCES public.planned_package_pending_orders (id) ON DELETE RESTRICT,

  student_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  teacher_id text NOT NULL REFERENCES public.teachers (id) ON DELETE RESTRICT,

  status text NOT NULL DEFAULT 'requested',

  requested_by text NOT NULL,
  reason_code text,
  reason_note text,

  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users (id),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT planned_package_cancellation_requests_status_chk
    CHECK (status IN (
      'requested',
      'quote_generated',
      'admin_review_required',
      'approved_for_manual_refund',
      'rejected',
      'cancelled'
    )),
  CONSTRAINT planned_package_cancellation_requests_requested_by_chk
    CHECK (requested_by IN ('admin', 'student'))
);

CREATE TABLE IF NOT EXISTS public.planned_package_refund_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  cancellation_request_id uuid NOT NULL
    REFERENCES public.planned_package_cancellation_requests (id) ON DELETE CASCADE,

  planned_package_order_id uuid NOT NULL
    REFERENCES public.planned_package_pending_orders (id) ON DELETE RESTRICT,

  policy_version text NOT NULL,
  quote_status text NOT NULL DEFAULT 'draft',

  package_total_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'CAD',

  completed_session_count integer NOT NULL,
  undelivered_session_count integer NOT NULL,
  total_session_count integer NOT NULL,

  completed_value_cents integer NOT NULL,
  undelivered_value_cents integer NOT NULL,
  penalty_cents integer NOT NULL,
  estimated_refund_cents integer NOT NULL,

  admin_adjustment_cents integer NOT NULL DEFAULT 0,
  admin_adjustment_reason text,

  legal_review_required boolean NOT NULL DEFAULT true,
  manual_review_required boolean NOT NULL DEFAULT true,

  calculation_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT planned_package_refund_quotes_status_chk
    CHECK (quote_status IN (
      'draft',
      'admin_review_required',
      'approved_for_manual_refund',
      'rejected',
      'superseded'
    )),
  CONSTRAINT planned_package_refund_quotes_currency_chk
    CHECK (currency = 'CAD'),
  CONSTRAINT planned_package_refund_quotes_amounts_chk
    CHECK (
      package_total_cents >= 0
      AND completed_value_cents >= 0
      AND undelivered_value_cents >= 0
      AND penalty_cents >= 0
      AND estimated_refund_cents >= 0
    )
);

CREATE INDEX IF NOT EXISTS idx_planned_package_cancellation_requests_order
  ON public.planned_package_cancellation_requests (planned_package_order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_planned_package_cancellation_requests_student
  ON public.planned_package_cancellation_requests (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_planned_package_refund_quotes_order
  ON public.planned_package_refund_quotes (planned_package_order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_planned_package_refund_quotes_request
  ON public.planned_package_refund_quotes (cancellation_request_id, created_at DESC);

COMMENT ON TABLE public.planned_package_cancellation_requests IS
  'Cancellation requests for planned package orders. Quote/review only — no Stripe refund.';

COMMENT ON TABLE public.planned_package_refund_quotes IS
  'Admin-reviewed refund estimates for planned packages. Does not move money.';

CREATE OR REPLACE FUNCTION public.planned_package_cancellation_requests_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_planned_package_cancellation_requests_updated_at
  ON public.planned_package_cancellation_requests;
CREATE TRIGGER trg_planned_package_cancellation_requests_updated_at
  BEFORE UPDATE ON public.planned_package_cancellation_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.planned_package_cancellation_requests_set_updated_at();

CREATE OR REPLACE FUNCTION public.planned_package_refund_quotes_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_planned_package_refund_quotes_updated_at
  ON public.planned_package_refund_quotes;
CREATE TRIGGER trg_planned_package_refund_quotes_updated_at
  BEFORE UPDATE ON public.planned_package_refund_quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.planned_package_refund_quotes_set_updated_at();

ALTER TABLE IF EXISTS public.planned_package_cancellation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.planned_package_refund_quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "planned_package_cancellation_requests_select_own"
  ON public.planned_package_cancellation_requests;
CREATE POLICY "planned_package_cancellation_requests_select_own"
  ON public.planned_package_cancellation_requests FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "planned_package_refund_quotes_select_via_request"
  ON public.planned_package_refund_quotes;
CREATE POLICY "planned_package_refund_quotes_select_via_request"
  ON public.planned_package_refund_quotes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.planned_package_cancellation_requests r
      WHERE r.id = planned_package_refund_quotes.cancellation_request_id
        AND r.student_id = auth.uid()
    )
  );

REVOKE ALL ON TABLE public.planned_package_cancellation_requests FROM PUBLIC;
REVOKE ALL ON TABLE public.planned_package_refund_quotes FROM PUBLIC;
GRANT SELECT ON TABLE public.planned_package_cancellation_requests TO authenticated;
GRANT SELECT ON TABLE public.planned_package_refund_quotes TO authenticated;
GRANT ALL ON TABLE public.planned_package_cancellation_requests TO service_role;
GRANT ALL ON TABLE public.planned_package_refund_quotes TO service_role;
