-- 116: planned package fulfillment engine (no Stripe)
--
-- Converts a payment_confirmed pending order into confirmed session bookings
-- atomically and idempotently. Does NOT create Stripe Checkout, PaymentIntent,
-- transfers, refunds, entitlements, or redemptions.

-- ── Order status + fulfillment metadata ─────────────────────────────

ALTER TABLE public.planned_package_pending_orders
  DROP CONSTRAINT IF EXISTS planned_package_pending_orders_status_chk;

ALTER TABLE public.planned_package_pending_orders
  ADD CONSTRAINT planned_package_pending_orders_status_chk
  CHECK (status IN (
    'pending_payment',
    'expired',
    'cancelled',
    'paid',
    'payment_confirmed',
    'fulfilling',
    'fulfilled',
    'fulfillment_failed'
  ));

ALTER TABLE public.planned_package_pending_orders
  ADD COLUMN IF NOT EXISTS payment_reference text;

ALTER TABLE public.planned_package_pending_orders
  ADD COLUMN IF NOT EXISTS payment_confirmed_at timestamptz;

ALTER TABLE public.planned_package_pending_orders
  ADD COLUMN IF NOT EXISTS fulfilled_at timestamptz;

ALTER TABLE public.planned_package_pending_orders
  ADD COLUMN IF NOT EXISTS fulfillment_idempotency_key text;

ALTER TABLE public.planned_package_pending_orders
  ADD COLUMN IF NOT EXISTS fulfillment_error text;

COMMENT ON COLUMN public.planned_package_pending_orders.payment_reference IS
  'Trusted payment reference (simulated or future webhook id). Never set from public client.';

COMMENT ON COLUMN public.planned_package_pending_orders.fulfillment_idempotency_key IS
  'Idempotency key for the last successful or in-progress fulfillment attempt.';

-- ── Booking linkage ─────────────────────────────────────────────────

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS planned_package_order_id uuid
    REFERENCES public.planned_package_pending_orders (id) ON DELETE SET NULL;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS planned_package_session_index integer;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS booking_source text;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_planned_package_session_index_chk;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_planned_package_session_index_chk
  CHECK (
    planned_package_session_index IS NULL
    OR planned_package_session_index >= 1
  );

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_booking_source_chk;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_booking_source_chk
  CHECK (
    booking_source IS NULL
    OR booking_source IN ('standard_booking', 'planned_package')
  );

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_booking_payment_source_chk;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_booking_payment_source_chk
  CHECK (
    booking_payment_source IS NULL
    OR booking_payment_source IN (
      'stripe_checkout',
      'package_credit',
      'manual',
      'unknown',
      'planned_package'
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_planned_package_order_session
  ON public.bookings (planned_package_order_id, planned_package_session_index)
  WHERE planned_package_order_id IS NOT NULL
    AND planned_package_session_index IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_planned_package_order_id
  ON public.bookings (planned_package_order_id)
  WHERE planned_package_order_id IS NOT NULL;

COMMENT ON COLUMN public.bookings.planned_package_order_id IS
  'Planned package pending order this confirmed session booking belongs to.';

COMMENT ON COLUMN public.bookings.planned_package_session_index IS
  '1-based session index within the planned package order.';

COMMENT ON COLUMN public.bookings.booking_source IS
  'Origin of the booking (standard_booking | planned_package).';

COMMENT ON COLUMN public.bookings.booking_payment_source IS
  'Payment source. planned_package = package paid, teacher transfer pending per completed session.';

-- Preserve planned-package linkage from client updates (service-role JWT only).
CREATE OR REPLACE FUNCTION public.bookings_preserve_planned_package_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  jwt_role text;
BEGIN
  jwt_role := coalesce(
    auth.jwt() ->> 'role',
    current_setting('request.jwt.claim.role', true),
    ''
  );

  IF jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.planned_package_order_id := NULL;
    NEW.planned_package_session_index := NULL;
    IF NEW.booking_source IS NOT NULL AND NEW.booking_source = 'planned_package' THEN
      NEW.booking_source := NULL;
    END IF;
    IF NEW.booking_payment_source IS NOT NULL AND NEW.booking_payment_source = 'planned_package' THEN
      NEW.booking_payment_source := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.planned_package_order_id := OLD.planned_package_order_id;
    NEW.planned_package_session_index := OLD.planned_package_session_index;
    IF OLD.booking_source IS NOT NULL THEN
      NEW.booking_source := OLD.booking_source;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_preserve_planned_package_fields ON public.bookings;
CREATE TRIGGER trg_bookings_preserve_planned_package_fields
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.bookings_preserve_planned_package_fields();

-- ── Atomic fulfillment RPC ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fulfill_planned_package_order(
  p_order_id uuid,
  p_payment_reference text,
  p_idempotency_key text,
  p_sessions jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.planned_package_pending_orders%ROWTYPE;
  v_hold public.planned_package_session_holds%ROWTYPE;
  v_session jsonb;
  v_session_index integer;
  v_slot_date text;
  v_time_slot text;
  v_price_cents integer;
  v_duration integer;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_booking_id uuid;
  v_existing_count integer;
  v_hold_count integer;
  v_created integer := 0;
  v_reused integer := 0;
  v_booking_ids uuid[] := ARRAY[]::uuid[];
  v_idempotency text;
  v_payment_ref text;
BEGIN
  v_idempotency := nullif(btrim(coalesce(p_idempotency_key, '')), '');
  v_payment_ref := nullif(btrim(coalesce(p_payment_reference, '')), '');

  IF v_idempotency IS NULL OR char_length(v_idempotency) < 8 OR char_length(v_idempotency) > 128 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'invalid_idempotency_key',
      'order_id', p_order_id
    );
  END IF;

  IF p_sessions IS NULL OR jsonb_typeof(p_sessions) <> 'array' OR jsonb_array_length(p_sessions) < 1 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'invalid_sessions_payload',
      'order_id', p_order_id
    );
  END IF;

  SELECT *
  INTO v_order
  FROM public.planned_package_pending_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'order_not_found',
      'order_id', p_order_id
    );
  END IF;

  -- Idempotent success path
  IF v_order.status = 'fulfilled' THEN
    SELECT coalesce(array_agg(id ORDER BY planned_package_session_index), ARRAY[]::uuid[])
    INTO v_booking_ids
    FROM public.bookings
    WHERE planned_package_order_id = v_order.id;

    RETURN jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'order_id', v_order.id,
      'status', 'fulfilled',
      'bookings_created', 0,
      'existing_bookings_reused', coalesce(array_length(v_booking_ids, 1), 0),
      'booking_ids', to_jsonb(v_booking_ids)
    );
  END IF;

  IF v_order.status = 'fulfillment_failed' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'fulfillment_failed',
      'order_id', v_order.id,
      'status', v_order.status,
      'fulfillment_error', v_order.fulfillment_error
    );
  END IF;

  IF v_order.status NOT IN ('payment_confirmed', 'fulfilling') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'order_not_payment_confirmed',
      'order_id', v_order.id,
      'status', v_order.status
    );
  END IF;

  IF jsonb_array_length(p_sessions) <> v_order.session_count THEN
    UPDATE public.planned_package_pending_orders
    SET
      status = 'fulfillment_failed',
      fulfillment_error = 'session_count_mismatch',
      fulfillment_idempotency_key = v_idempotency,
      updated_at = now()
    WHERE id = v_order.id;

    RETURN jsonb_build_object(
      'ok', false,
      'error', 'session_count_mismatch',
      'order_id', v_order.id,
      'status', 'fulfillment_failed'
    );
  END IF;

  SELECT count(*)::integer
  INTO v_hold_count
  FROM public.planned_package_session_holds
  WHERE pending_order_id = v_order.id
    AND status IN ('active', 'converted');

  IF v_hold_count <> v_order.session_count THEN
    UPDATE public.planned_package_pending_orders
    SET
      status = 'fulfillment_failed',
      fulfillment_error = 'holds_missing_or_invalid',
      fulfillment_idempotency_key = v_idempotency,
      updated_at = now()
    WHERE id = v_order.id;

    RETURN jsonb_build_object(
      'ok', false,
      'error', 'holds_missing_or_invalid',
      'order_id', v_order.id,
      'status', 'fulfillment_failed'
    );
  END IF;

  -- Payment must have been confirmed before hold expiry (or holds still active).
  IF v_order.payment_confirmed_at IS NULL
     OR v_order.payment_confirmed_at > v_order.hold_expires_at THEN
    -- Still allow if every hold is still active and unexpired at confirmation time was set.
    IF v_order.payment_confirmed_at IS NULL THEN
      UPDATE public.planned_package_pending_orders
      SET
        status = 'fulfillment_failed',
        fulfillment_error = 'payment_confirmed_missing',
        fulfillment_idempotency_key = v_idempotency,
        updated_at = now()
      WHERE id = v_order.id;

      RETURN jsonb_build_object(
        'ok', false,
        'error', 'payment_confirmed_missing',
        'order_id', v_order.id,
        'status', 'fulfillment_failed'
      );
    END IF;
  END IF;

  SELECT count(*)::integer
  INTO v_existing_count
  FROM public.bookings
  WHERE planned_package_order_id = v_order.id;

  IF v_existing_count > 0 AND v_existing_count < v_order.session_count THEN
    UPDATE public.planned_package_pending_orders
    SET
      status = 'fulfillment_failed',
      fulfillment_error = 'partial_bookings_detected',
      fulfillment_idempotency_key = v_idempotency,
      updated_at = now()
    WHERE id = v_order.id;

    RETURN jsonb_build_object(
      'ok', false,
      'error', 'partial_bookings_detected',
      'order_id', v_order.id,
      'status', 'fulfillment_failed',
      'existing_bookings_reused', v_existing_count
    );
  END IF;

  IF v_existing_count = v_order.session_count THEN
    UPDATE public.planned_package_session_holds
    SET status = 'converted', updated_at = now()
    WHERE pending_order_id = v_order.id
      AND status = 'active';

    UPDATE public.planned_package_pending_orders
    SET
      status = 'fulfilled',
      fulfilled_at = coalesce(fulfilled_at, now()),
      fulfillment_idempotency_key = coalesce(fulfillment_idempotency_key, v_idempotency),
      payment_reference = coalesce(payment_reference, v_payment_ref),
      fulfillment_error = null,
      updated_at = now()
    WHERE id = v_order.id;

    SELECT coalesce(array_agg(id ORDER BY planned_package_session_index), ARRAY[]::uuid[])
    INTO v_booking_ids
    FROM public.bookings
    WHERE planned_package_order_id = v_order.id;

    RETURN jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'order_id', v_order.id,
      'status', 'fulfilled',
      'bookings_created', 0,
      'existing_bookings_reused', coalesce(array_length(v_booking_ids, 1), 0),
      'booking_ids', to_jsonb(v_booking_ids)
    );
  END IF;

  UPDATE public.planned_package_pending_orders
  SET
    status = 'fulfilling',
    fulfillment_idempotency_key = v_idempotency,
    payment_reference = coalesce(payment_reference, v_payment_ref),
    fulfillment_error = null,
    updated_at = now()
  WHERE id = v_order.id;

  FOR v_session IN SELECT * FROM jsonb_array_elements(p_sessions)
  LOOP
    v_session_index := (v_session->>'session_index')::integer;
    v_slot_date := btrim(coalesce(v_session->>'slot_date', ''));
    v_time_slot := btrim(coalesce(v_session->>'time_slot', ''));
    v_price_cents := (v_session->>'price_cents')::integer;
    v_duration := coalesce((v_session->>'duration_minutes')::integer, v_order.duration_minutes);
    v_starts_at := (v_session->>'starts_at')::timestamptz;
    v_ends_at := (v_session->>'ends_at')::timestamptz;

    IF v_session_index IS NULL OR v_session_index < 1 OR v_session_index > v_order.session_count THEN
      RAISE EXCEPTION 'invalid_session_index' USING ERRCODE = 'P0001';
    END IF;
    IF v_slot_date = '' OR v_time_slot = '' OR v_price_cents IS NULL OR v_price_cents < 0 THEN
      RAISE EXCEPTION 'invalid_session_payload' USING ERRCODE = 'P0001';
    END IF;

    SELECT *
    INTO v_hold
    FROM public.planned_package_session_holds
    WHERE pending_order_id = v_order.id
      AND session_index = v_session_index
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'hold_not_found' USING ERRCODE = 'P0001';
    END IF;

    IF v_hold.status NOT IN ('active', 'converted') THEN
      RAISE EXCEPTION 'hold_not_convertible' USING ERRCODE = 'P0001';
    END IF;

    -- Prefer hold wall times when payload times differ slightly.
    IF v_starts_at IS NULL THEN
      v_starts_at := v_hold.starts_at;
    END IF;
    IF v_ends_at IS NULL THEN
      v_ends_at := v_hold.ends_at;
    END IF;

    SELECT id
    INTO v_booking_id
    FROM public.bookings
    WHERE planned_package_order_id = v_order.id
      AND planned_package_session_index = v_session_index;

    IF FOUND THEN
      v_reused := v_reused + 1;
      v_booking_ids := array_append(v_booking_ids, v_booking_id);
      CONTINUE;
    END IF;

    INSERT INTO public.bookings (
      teacher_id,
      student_id,
      date,
      time,
      slot_date,
      time_slot,
      teaching_mode,
      status,
      lesson_type,
      price,
      duration_minutes,
      teacher_offer_id,
      teacher_offer_title_snapshot,
      teacher_offer_type_snapshot,
      teacher_offer_format_snapshot,
      teacher_offer_price_cents_snapshot,
      teacher_offer_currency_snapshot,
      teacher_offer_duration_minutes_snapshot,
      teacher_offer_session_count_snapshot,
      teacher_offer_snapshot_version,
      booking_payment_source,
      booking_source,
      planned_package_order_id,
      planned_package_session_index
    ) VALUES (
      v_order.teacher_id,
      v_order.student_id,
      v_slot_date,
      v_time_slot,
      v_slot_date,
      v_time_slot,
      'online',
      'confirmed',
      'regular',
      round(v_price_cents::numeric / 100.0, 2),
      v_duration,
      v_order.teacher_offer_id,
      v_order.title_snapshot,
      'package',
      'online',
      v_order.price_cents_snapshot,
      v_order.currency_snapshot,
      v_order.duration_minutes,
      v_order.session_count,
      2,
      'planned_package',
      'planned_package',
      v_order.id,
      v_session_index
    )
    RETURNING id INTO v_booking_id;

    v_created := v_created + 1;
    v_booking_ids := array_append(v_booking_ids, v_booking_id);
  END LOOP;

  UPDATE public.planned_package_session_holds
  SET status = 'converted', updated_at = now()
  WHERE pending_order_id = v_order.id
    AND status IN ('active', 'converted');

  UPDATE public.planned_package_pending_orders
  SET
    status = 'fulfilled',
    fulfilled_at = now(),
    fulfillment_idempotency_key = v_idempotency,
    payment_reference = coalesce(payment_reference, v_payment_ref),
    fulfillment_error = null,
    updated_at = now()
  WHERE id = v_order.id;

  RETURN jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'order_id', v_order.id,
    'status', 'fulfilled',
    'bookings_created', v_created,
    'existing_bookings_reused', v_reused,
    'booking_ids', to_jsonb(v_booking_ids)
  );

EXCEPTION
  WHEN OTHERS THEN
    UPDATE public.planned_package_pending_orders
    SET
      status = 'fulfillment_failed',
      fulfillment_error = left(SQLERRM, 500),
      fulfillment_idempotency_key = v_idempotency,
      updated_at = now()
    WHERE id = p_order_id
      AND status IN ('payment_confirmed', 'fulfilling');

    RETURN jsonb_build_object(
      'ok', false,
      'error', 'fulfillment_exception',
      'order_id', p_order_id,
      'status', 'fulfillment_failed',
      'detail', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION public.fulfill_planned_package_order(uuid, text, text, jsonb) IS
  'Atomically convert a payment_confirmed planned package order into confirmed session bookings. Idempotent. No Stripe.';

REVOKE ALL ON FUNCTION public.fulfill_planned_package_order(uuid, text, text, jsonb)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.fulfill_planned_package_order(uuid, text, text, jsonb)
  TO service_role;
