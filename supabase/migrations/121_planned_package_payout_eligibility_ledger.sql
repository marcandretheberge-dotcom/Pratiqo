-- 121: planned package payout eligibility ledger (eligibility only, no Stripe transfer)
--
-- Tracks per-session payout eligibility after booking completion. Does NOT create transfers.

CREATE TABLE IF NOT EXISTS public.planned_package_payout_eligibility_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  planned_package_order_id uuid NOT NULL
    REFERENCES public.planned_package_pending_orders (id) ON DELETE RESTRICT,

  booking_id uuid NOT NULL
    REFERENCES public.bookings (id) ON DELETE RESTRICT,

  teacher_id text NOT NULL
    REFERENCES public.teachers (id) ON DELETE RESTRICT,

  student_id uuid NOT NULL
    REFERENCES auth.users (id) ON DELETE RESTRICT,

  teacher_offer_id uuid
    REFERENCES public.teacher_offers (id) ON DELETE SET NULL,

  package_session_index integer NOT NULL,
  total_session_count integer NOT NULL,

  status text NOT NULL DEFAULT 'not_eligible',

  gross_session_amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'CAD',

  platform_fee_cents integer,
  teacher_net_cents integer,

  eligibility_reason text,
  blocker_code text,
  blocker_details jsonb NOT NULL DEFAULT '{}'::jsonb,

  eligible_at timestamptz,
  blocked_at timestamptz,
  admin_review_required boolean NOT NULL DEFAULT false,

  stripe_transfer_id text,
  stripe_transfer_group text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT planned_package_payout_eligibility_status_chk
    CHECK (status IN (
      'not_eligible',
      'eligible',
      'blocked',
      'admin_review_required',
      'superseded'
    )),

  CONSTRAINT planned_package_payout_eligibility_gross_nonneg_chk
    CHECK (gross_session_amount_cents >= 0),

  CONSTRAINT planned_package_payout_eligibility_platform_fee_nonneg_chk
    CHECK (platform_fee_cents IS NULL OR platform_fee_cents >= 0),

  CONSTRAINT planned_package_payout_eligibility_teacher_net_nonneg_chk
    CHECK (teacher_net_cents IS NULL OR teacher_net_cents >= 0),

  CONSTRAINT planned_package_payout_eligibility_booking_uq
    UNIQUE (booking_id),

  CONSTRAINT planned_package_payout_eligibility_order_session_uq
    UNIQUE (planned_package_order_id, package_session_index)
);

CREATE INDEX IF NOT EXISTS idx_planned_package_payout_eligibility_teacher_status
  ON public.planned_package_payout_eligibility_entries (teacher_id, status);

CREATE INDEX IF NOT EXISTS idx_planned_package_payout_eligibility_order_id
  ON public.planned_package_payout_eligibility_entries (planned_package_order_id);

CREATE INDEX IF NOT EXISTS idx_planned_package_payout_eligibility_booking_id
  ON public.planned_package_payout_eligibility_entries (booking_id);

CREATE INDEX IF NOT EXISTS idx_planned_package_payout_eligibility_status_eligible_at
  ON public.planned_package_payout_eligibility_entries (status, eligible_at);

COMMENT ON TABLE public.planned_package_payout_eligibility_entries IS
  'Per-session planned package payout eligibility. No Stripe transfer in this layer.';

ALTER TABLE IF EXISTS public.planned_package_payout_eligibility_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY planned_package_payout_eligibility_service_all
  ON public.planned_package_payout_eligibility_entries
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
