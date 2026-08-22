-- 115: planned package pending orders + temporary session holds (no payment)
--
-- Converts a valid session draft into a pending order with short-lived holds.
-- Does NOT create Stripe checkout, confirmed bookings, entitlements, or redemptions.
-- Holds expire (default 15 minutes) and no longer block availability.

CREATE TABLE IF NOT EXISTS public.planned_package_pending_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  student_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  teacher_id text NOT NULL REFERENCES public.teachers (id) ON DELETE CASCADE,
  teacher_offer_id uuid NOT NULL REFERENCES public.teacher_offers (id) ON DELETE RESTRICT,
  draft_id uuid NOT NULL REFERENCES public.planned_package_session_drafts (id) ON DELETE RESTRICT,

  status text NOT NULL DEFAULT 'pending_payment',

  session_count integer NOT NULL,
  duration_minutes integer NOT NULL,

  price_cents_snapshot integer NOT NULL,
  currency_snapshot text NOT NULL DEFAULT 'CAD',
  title_snapshot text NOT NULL,

  hold_expires_at timestamptz NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT planned_package_pending_orders_status_chk
    CHECK (status IN ('pending_payment', 'expired', 'cancelled', 'paid')),
  CONSTRAINT planned_package_pending_orders_session_count_chk
    CHECK (session_count BETWEEN 2 AND 52),
  CONSTRAINT planned_package_pending_orders_duration_chk
    CHECK (duration_minutes BETWEEN 15 AND 480),
  CONSTRAINT planned_package_pending_orders_price_chk
    CHECK (price_cents_snapshot >= 0),
  CONSTRAINT planned_package_pending_orders_currency_chk
    CHECK (currency_snapshot = 'CAD'),
  CONSTRAINT planned_package_pending_orders_title_chk
    CHECK (char_length(btrim(title_snapshot)) >= 1)
);

CREATE TABLE IF NOT EXISTS public.planned_package_session_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  pending_order_id uuid NOT NULL
    REFERENCES public.planned_package_pending_orders (id) ON DELETE CASCADE,

  teacher_id text NOT NULL REFERENCES public.teachers (id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,

  session_index integer NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,

  status text NOT NULL DEFAULT 'active',

  expires_at timestamptz NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT planned_package_session_holds_index_chk
    CHECK (session_index >= 1),
  CONSTRAINT planned_package_session_holds_range_chk
    CHECK (starts_at < ends_at),
  CONSTRAINT planned_package_session_holds_status_chk
    CHECK (status IN ('active', 'expired', 'cancelled', 'converted')),
  CONSTRAINT planned_package_session_holds_unique_index
    UNIQUE (pending_order_id, session_index)
);

CREATE INDEX IF NOT EXISTS idx_planned_package_pending_orders_student
  ON public.planned_package_pending_orders (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_planned_package_pending_orders_draft
  ON public.planned_package_pending_orders (draft_id);

CREATE INDEX IF NOT EXISTS idx_planned_package_pending_orders_expires
  ON public.planned_package_pending_orders (status, hold_expires_at);

CREATE INDEX IF NOT EXISTS idx_planned_package_session_holds_teacher_time
  ON public.planned_package_session_holds (teacher_id, starts_at, ends_at);

CREATE INDEX IF NOT EXISTS idx_planned_package_session_holds_status_expires
  ON public.planned_package_session_holds (status, expires_at);

CREATE INDEX IF NOT EXISTS idx_planned_package_session_holds_student
  ON public.planned_package_session_holds (student_id);

CREATE INDEX IF NOT EXISTS idx_planned_package_session_holds_order
  ON public.planned_package_session_holds (pending_order_id);

COMMENT ON TABLE public.planned_package_pending_orders IS
  'Pending planned-package orders with temporary holds. Never paid in this migration. No bookings/entitlements.';

COMMENT ON TABLE public.planned_package_session_holds IS
  'Temporary session holds for pending package orders. Active unexpired holds block conflicting slots.';

CREATE OR REPLACE FUNCTION public.planned_package_pending_orders_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_planned_package_pending_orders_updated_at
  ON public.planned_package_pending_orders;
CREATE TRIGGER trg_planned_package_pending_orders_updated_at
  BEFORE UPDATE ON public.planned_package_pending_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.planned_package_pending_orders_set_updated_at();

CREATE OR REPLACE FUNCTION public.planned_package_session_holds_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_planned_package_session_holds_updated_at
  ON public.planned_package_session_holds;
CREATE TRIGGER trg_planned_package_session_holds_updated_at
  BEFORE UPDATE ON public.planned_package_session_holds
  FOR EACH ROW
  EXECUTE FUNCTION public.planned_package_session_holds_set_updated_at();

ALTER TABLE IF EXISTS public.planned_package_pending_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.planned_package_session_holds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "planned_package_pending_orders_select_own"
  ON public.planned_package_pending_orders;
CREATE POLICY "planned_package_pending_orders_select_own"
  ON public.planned_package_pending_orders FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "planned_package_pending_orders_select_teacher"
  ON public.planned_package_pending_orders;
CREATE POLICY "planned_package_pending_orders_select_teacher"
  ON public.planned_package_pending_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = planned_package_pending_orders.teacher_id
        AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "planned_package_session_holds_select_own"
  ON public.planned_package_session_holds;
CREATE POLICY "planned_package_session_holds_select_own"
  ON public.planned_package_session_holds FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "planned_package_session_holds_select_teacher"
  ON public.planned_package_session_holds;
CREATE POLICY "planned_package_session_holds_select_teacher"
  ON public.planned_package_session_holds FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = planned_package_session_holds.teacher_id
        AND t.user_id = auth.uid()
    )
  );

REVOKE ALL ON TABLE public.planned_package_pending_orders FROM PUBLIC;
REVOKE ALL ON TABLE public.planned_package_session_holds FROM PUBLIC;
GRANT SELECT ON TABLE public.planned_package_pending_orders TO authenticated;
GRANT SELECT ON TABLE public.planned_package_session_holds TO authenticated;
GRANT ALL ON TABLE public.planned_package_pending_orders TO service_role;
GRANT ALL ON TABLE public.planned_package_session_holds TO service_role;
