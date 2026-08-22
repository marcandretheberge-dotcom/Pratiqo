-- 118: planned package admin ops / reconciliation metadata (read-heavy, no payout)
--
-- Safe webhook and fulfillment attempt fields for admin diagnostics.
-- Does NOT create transfers, entitlements, or public launch.

ALTER TABLE public.planned_package_pending_orders
  ADD COLUMN IF NOT EXISTS stripe_checkout_completed_at timestamptz;

ALTER TABLE public.planned_package_pending_orders
  ADD COLUMN IF NOT EXISTS stripe_checkout_expired_at timestamptz;

ALTER TABLE public.planned_package_pending_orders
  ADD COLUMN IF NOT EXISTS last_webhook_event_id text;

ALTER TABLE public.planned_package_pending_orders
  ADD COLUMN IF NOT EXISTS last_webhook_event_type text;

ALTER TABLE public.planned_package_pending_orders
  ADD COLUMN IF NOT EXISTS last_webhook_received_at timestamptz;

ALTER TABLE public.planned_package_pending_orders
  ADD COLUMN IF NOT EXISTS fulfillment_attempt_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.planned_package_pending_orders
  ADD COLUMN IF NOT EXISTS last_fulfillment_attempt_at timestamptz;

COMMENT ON COLUMN public.planned_package_pending_orders.stripe_checkout_completed_at IS
  'When Stripe checkout.session.completed was processed for this order.';

COMMENT ON COLUMN public.planned_package_pending_orders.stripe_checkout_expired_at IS
  'When Stripe checkout.session.expired was processed for this order.';

COMMENT ON COLUMN public.planned_package_pending_orders.last_webhook_event_id IS
  'Last Stripe webhook event id touching this order (safe id only, no payload).';

COMMENT ON COLUMN public.planned_package_pending_orders.last_webhook_event_type IS
  'Last Stripe webhook event type for this order.';

COMMENT ON COLUMN public.planned_package_pending_orders.last_webhook_received_at IS
  'When the last Stripe webhook for this order was received.';

COMMENT ON COLUMN public.planned_package_pending_orders.fulfillment_attempt_count IS
  'Number of fulfillment attempts (webhook + admin retry).';

COMMENT ON COLUMN public.planned_package_pending_orders.last_fulfillment_attempt_at IS
  'Timestamp of the most recent fulfillment attempt.';
