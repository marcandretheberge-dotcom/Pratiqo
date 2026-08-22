-- 117: planned package Stripe Checkout linkage (no transfer / no payout)
--
-- Stores Checkout Session / PaymentIntent references on pending orders.
-- Does NOT create entitlements, redemptions, or transfers.

ALTER TABLE public.planned_package_pending_orders
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text;

ALTER TABLE public.planned_package_pending_orders
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

ALTER TABLE public.planned_package_pending_orders
  ADD COLUMN IF NOT EXISTS stripe_checkout_status text;

ALTER TABLE public.planned_package_pending_orders
  ADD COLUMN IF NOT EXISTS checkout_expires_at timestamptz;

ALTER TABLE public.planned_package_pending_orders
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_planned_package_pending_orders_stripe_session
  ON public.planned_package_pending_orders (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

COMMENT ON COLUMN public.planned_package_pending_orders.stripe_checkout_session_id IS
  'Stripe Checkout Session id for this pending order. Server-owned.';

COMMENT ON COLUMN public.planned_package_pending_orders.stripe_payment_intent_id IS
  'Stripe PaymentIntent id after checkout completion. No transfer created in this migration.';

COMMENT ON COLUMN public.planned_package_pending_orders.stripe_checkout_status IS
  'open | complete | expired — mirrors Stripe Checkout Session status when known.';

COMMENT ON COLUMN public.planned_package_pending_orders.checkout_expires_at IS
  'When the Stripe Checkout Session expires (from Stripe expires_at).';

COMMENT ON COLUMN public.planned_package_pending_orders.paid_at IS
  'When Stripe reported payment success (checkout.session.completed).';
