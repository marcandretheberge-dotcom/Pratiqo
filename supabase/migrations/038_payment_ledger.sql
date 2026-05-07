-- Payment ledger foundation for Stripe Connect marketplace payouts.
-- This does not change checkout behavior yet; it creates the durable records
-- future checkout, completion payout, and refund code will write to.

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS stripe_connect_onboarding_complete boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_connect_charges_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_connect_payouts_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_connect_requirements_due jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS stripe_connect_disabled_reason text,
  ADD COLUMN IF NOT EXISTS stripe_connect_last_synced_at timestamptz;

COMMENT ON COLUMN public.teachers.stripe_connect_onboarding_complete IS
  'True when Stripe reports details_submitted for the connected Express account.';
COMMENT ON COLUMN public.teachers.stripe_connect_charges_enabled IS
  'True when Stripe allows this connected account to accept charges.';
COMMENT ON COLUMN public.teachers.stripe_connect_payouts_enabled IS
  'True when Stripe allows this connected account to receive payouts.';
COMMENT ON COLUMN public.teachers.stripe_connect_requirements_due IS
  'Current Stripe Connect requirements currently_due/eventually_due, stored for dashboard/admin copy.';
COMMENT ON COLUMN public.teachers.stripe_connect_disabled_reason IS
  'Stripe Connect disabled reason when the account cannot receive money.';
COMMENT ON COLUMN public.teachers.stripe_connect_last_synced_at IS
  'Last time the teacher connected account status was synced from Stripe.';

CREATE TABLE IF NOT EXISTS public.booking_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings (id) ON DELETE CASCADE,
  teacher_id text NOT NULL REFERENCES public.teachers (id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,

  provider text NOT NULL DEFAULT 'stripe',
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  stripe_transfer_id text,
  stripe_refund_id text,
  stripe_transfer_reversal_id text,
  transfer_group text,

  amount_cents integer NOT NULL DEFAULT 0,
  platform_fee_cents integer NOT NULL DEFAULT 0,
  teacher_net_cents integer NOT NULL DEFAULT 0,
  refunded_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'cad',

  payment_status text NOT NULL DEFAULT 'unpaid',
  transfer_status text NOT NULL DEFAULT 'not_ready',
  refund_status text NOT NULL DEFAULT 'not_required',

  paid_at timestamptz,
  ready_for_transfer_at timestamptz,
  transfer_created_at timestamptz,
  refunded_at timestamptz,
  failed_at timestamptz,
  failure_reason text,

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT booking_payments_booking_unique UNIQUE (booking_id),
  CONSTRAINT booking_payments_provider_check CHECK (provider IN ('stripe')),
  CONSTRAINT booking_payments_currency_check CHECK (currency = lower(currency) AND length(currency) = 3),
  CONSTRAINT booking_payments_amounts_non_negative CHECK (
    amount_cents >= 0
    AND platform_fee_cents >= 0
    AND teacher_net_cents >= 0
    AND refunded_cents >= 0
  ),
  CONSTRAINT booking_payments_amount_split_check CHECK (
    platform_fee_cents + teacher_net_cents <= amount_cents
  ),
  CONSTRAINT booking_payments_refund_cap_check CHECK (refunded_cents <= amount_cents),
  CONSTRAINT booking_payments_payment_status_check CHECK (
    payment_status IN ('unpaid', 'requires_action', 'paid', 'failed', 'cancelled', 'refunded', 'partially_refunded', 'disputed')
  ),
  CONSTRAINT booking_payments_transfer_status_check CHECK (
    transfer_status IN ('not_ready', 'ready', 'transferred', 'failed', 'reversed', 'not_required')
  ),
  CONSTRAINT booking_payments_refund_status_check CHECK (
    refund_status IN ('not_required', 'pending', 'pending_review', 'refunded', 'partially_refunded', 'failed', 'rejected')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_payments_payment_intent
  ON public.booking_payments (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_payments_charge
  ON public.booking_payments (stripe_charge_id)
  WHERE stripe_charge_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_booking_payments_teacher_status
  ON public.booking_payments (teacher_id, payment_status, transfer_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_booking_payments_student_status
  ON public.booking_payments (student_id, payment_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_booking_payments_transfer_group
  ON public.booking_payments (transfer_group)
  WHERE transfer_group IS NOT NULL;

COMMENT ON TABLE public.booking_payments IS
  'Internal payment ledger for booking charges, platform fees, teacher transfers, refunds, and reversals.';
COMMENT ON COLUMN public.booking_payments.amount_cents IS
  'Actual Stripe charge amount after Pratiqo credits or discounts, in minor currency units.';
COMMENT ON COLUMN public.booking_payments.platform_fee_cents IS
  'Pratiqo platform fee retained from this payment, in minor currency units.';
COMMENT ON COLUMN public.booking_payments.teacher_net_cents IS
  'Amount intended for teacher transfer before refunds/reversals, in minor currency units.';
COMMENT ON COLUMN public.booking_payments.transfer_status IS
  'Teacher payout lifecycle: not_ready until post-class confirmation, then ready/transferred/failed.';

ALTER TABLE public.booking_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "booking_payments_select_student_or_teacher" ON public.booking_payments;
CREATE POLICY "booking_payments_select_student_or_teacher"
  ON public.booking_payments FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR teacher_id IN (
      SELECT t.id
      FROM public.teachers t
      WHERE t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "booking_payments_no_client_insert" ON public.booking_payments;
CREATE POLICY "booking_payments_no_client_insert"
  ON public.booking_payments FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "booking_payments_no_client_update" ON public.booking_payments;
CREATE POLICY "booking_payments_no_client_update"
  ON public.booking_payments FOR UPDATE TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "booking_payments_no_client_delete" ON public.booking_payments;
CREATE POLICY "booking_payments_no_client_delete"
  ON public.booking_payments FOR DELETE TO authenticated
  USING (false);
