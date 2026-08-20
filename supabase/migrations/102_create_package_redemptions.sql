-- 102: package session redemption booking (PR 10B)
--
-- Lets a learner reserve one future lesson using an active package
-- (forfait) entitlement session credit. No Stripe checkout is created.
--
-- Atomic redeem happens in public.redeem_package_session_booking().
-- Package credit reversal on cancellation is intentionally deferred until
-- cancellation lifecycle is centralized.
--
-- Product naming:
--   FR: Forfait / Utiliser une séance du forfait
--   EN: Package / Use a package session
--   ES: Paquete / Usar una sesión del paquete
--   Internal: package_redemptions

-- ── package_redemptions ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.package_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  package_entitlement_id uuid NOT NULL
    REFERENCES public.package_entitlements (id) ON DELETE CASCADE,
  booking_id uuid NOT NULL
    REFERENCES public.bookings (id) ON DELETE CASCADE,
  student_id uuid NOT NULL
    REFERENCES auth.users (id) ON DELETE CASCADE,
  teacher_id text NOT NULL
    REFERENCES public.teachers (id) ON DELETE CASCADE,

  session_number integer NOT NULL,
  status text NOT NULL DEFAULT 'reserved',

  client_request_id text NOT NULL,

  redeemed_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  reversed_at timestamptz,

  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT package_redemptions_session_number_chk
    CHECK (session_number >= 1),
  CONSTRAINT package_redemptions_status_chk
    CHECK (status IN ('reserved', 'completed', 'cancelled', 'reversed')),
  CONSTRAINT package_redemptions_client_request_id_chk
    CHECK (char_length(btrim(client_request_id)) BETWEEN 8 AND 128),
  CONSTRAINT package_redemptions_booking_unique UNIQUE (booking_id),
  CONSTRAINT package_redemptions_session_unique UNIQUE (package_entitlement_id, session_number),
  CONSTRAINT package_redemptions_student_request_unique UNIQUE (student_id, client_request_id)
);

COMMENT ON TABLE public.package_redemptions IS
  'Server-owned forfait session redemptions. One row per booking that consumes an entitlement session. Clients cannot insert/update.';

COMMENT ON COLUMN public.package_redemptions.session_number IS
  '1-based session index within the entitlement (used_sessions after this redemption).';

COMMENT ON COLUMN public.package_redemptions.client_request_id IS
  'Idempotency key from the learner client. Unique per student so double-clicks do not consume two sessions.';

CREATE INDEX IF NOT EXISTS package_redemptions_package_entitlement_id_idx
  ON public.package_redemptions (package_entitlement_id, created_at DESC);

CREATE INDEX IF NOT EXISTS package_redemptions_booking_id_idx
  ON public.package_redemptions (booking_id);

CREATE INDEX IF NOT EXISTS package_redemptions_student_id_idx
  ON public.package_redemptions (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS package_redemptions_teacher_id_idx
  ON public.package_redemptions (teacher_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.package_redemptions_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_package_redemptions_set_updated_at ON public.package_redemptions;
CREATE TRIGGER trg_package_redemptions_set_updated_at
  BEFORE UPDATE ON public.package_redemptions
  FOR EACH ROW
  EXECUTE FUNCTION public.package_redemptions_set_updated_at();

ALTER TABLE IF EXISTS public.package_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "package_redemptions_select_student" ON public.package_redemptions;
CREATE POLICY "package_redemptions_select_student"
  ON public.package_redemptions FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "package_redemptions_select_teacher" ON public.package_redemptions;
CREATE POLICY "package_redemptions_select_teacher"
  ON public.package_redemptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.teachers t
      WHERE t.id = package_redemptions.teacher_id
        AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "package_redemptions_no_client_insert" ON public.package_redemptions;
CREATE POLICY "package_redemptions_no_client_insert"
  ON public.package_redemptions FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "package_redemptions_no_client_update" ON public.package_redemptions;
CREATE POLICY "package_redemptions_no_client_update"
  ON public.package_redemptions FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "package_redemptions_no_client_delete" ON public.package_redemptions;
CREATE POLICY "package_redemptions_no_client_delete"
  ON public.package_redemptions FOR DELETE
  TO authenticated
  USING (false);

REVOKE ALL ON TABLE public.package_redemptions FROM anon;
GRANT SELECT ON TABLE public.package_redemptions TO authenticated;
GRANT ALL ON TABLE public.package_redemptions TO service_role;

-- ── bookings link columns ───────────────────────────────────────────

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS package_entitlement_id uuid
    REFERENCES public.package_entitlements (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS package_redemption_id uuid
    REFERENCES public.package_redemptions (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS booking_payment_source text;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_booking_payment_source_chk;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_booking_payment_source_chk
  CHECK (
    booking_payment_source IS NULL
    OR booking_payment_source IN ('stripe_checkout', 'package_credit', 'manual', 'unknown')
  );

CREATE INDEX IF NOT EXISTS idx_bookings_package_entitlement_id
  ON public.bookings (package_entitlement_id)
  WHERE package_entitlement_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_package_redemption_id
  ON public.bookings (package_redemption_id)
  WHERE package_redemption_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_booking_payment_source
  ON public.bookings (booking_payment_source)
  WHERE booking_payment_source IS NOT NULL;

COMMENT ON COLUMN public.bookings.package_entitlement_id IS
  'Optional forfait entitlement consumed by this booking when booking_payment_source = package_credit.';

COMMENT ON COLUMN public.bookings.package_redemption_id IS
  'Optional package_redemptions.id for package-credit bookings. Null for Stripe/legacy bookings.';

COMMENT ON COLUMN public.bookings.booking_payment_source IS
  'How this booking was settled: stripe_checkout, package_credit, manual, or unknown. Null for legacy rows.';

-- Clients must not attach package credit fields. Service-role / SECURITY DEFINER only.
CREATE OR REPLACE FUNCTION public.bookings_preserve_package_credit_fields()
RETURNS TRIGGER
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
    NEW.package_entitlement_id := NULL;
    NEW.package_redemption_id := NULL;
    IF NEW.booking_payment_source IS NOT NULL AND NEW.booking_payment_source = 'package_credit' THEN
      NEW.booking_payment_source := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.package_entitlement_id := OLD.package_entitlement_id;
    NEW.package_redemption_id := OLD.package_redemption_id;
    NEW.booking_payment_source := OLD.booking_payment_source;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_preserve_package_credit_fields ON public.bookings;
CREATE TRIGGER trg_bookings_preserve_package_credit_fields
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.bookings_preserve_package_credit_fields();

-- ── atomic redeem RPC ───────────────────────────────────────────────
--
-- Locks the entitlement row, creates a confirmed package-credit booking,
-- inserts the redemption, decrements remaining_sessions, and returns JSON.
-- Idempotent on (student_id, client_request_id).
--
-- Package credit bookings are confirmed without Stripe. They are paid by
-- entitlement, not by a PaymentIntent — do not invent Stripe IDs.

CREATE OR REPLACE FUNCTION public.redeem_package_session_booking(
  p_entitlement_id uuid,
  p_student_id uuid,
  p_client_request_id text,
  p_slot_date text,
  p_time_slot text,
  p_teaching_mode text,
  p_student_level text,
  p_student_address text,
  p_learner_profile_id uuid,
  p_duration_minutes integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ent public.package_entitlements%ROWTYPE;
  v_existing public.package_redemptions%ROWTYPE;
  v_booking_id uuid;
  v_redemption_id uuid;
  v_session_number integer;
  v_duration integer;
  v_new_used integer;
  v_new_remaining integer;
  v_new_status text;
  v_request_id text;
BEGIN
  -- Ensure booking triggers allow server-owned snapshot/package fields.
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);

  IF p_entitlement_id IS NULL OR p_student_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_PAYLOAD' USING ERRCODE = 'P0001';
  END IF;

  v_request_id := nullif(btrim(coalesce(p_client_request_id, '')), '');
  IF v_request_id IS NULL OR char_length(v_request_id) < 8 OR char_length(v_request_id) > 128 THEN
    RAISE EXCEPTION 'INVALID_PAYLOAD' USING ERRCODE = 'P0001';
  END IF;

  IF p_slot_date IS NULL OR p_slot_date !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RAISE EXCEPTION 'INVALID_PAYLOAD' USING ERRCODE = 'P0001';
  END IF;
  IF p_time_slot IS NULL OR char_length(btrim(p_time_slot)) < 1 OR char_length(p_time_slot) > 32 THEN
    RAISE EXCEPTION 'INVALID_PAYLOAD' USING ERRCODE = 'P0001';
  END IF;
  IF p_teaching_mode IS NULL OR p_teaching_mode NOT IN ('person', 'online', 'domicile') THEN
    RAISE EXCEPTION 'INVALID_PAYLOAD' USING ERRCODE = 'P0001';
  END IF;
  IF p_teaching_mode = 'domicile' AND (p_student_address IS NULL OR btrim(p_student_address) = '') THEN
    RAISE EXCEPTION 'INVALID_PAYLOAD' USING ERRCODE = 'P0001';
  END IF;

  -- Idempotency: return existing redemption/booking for the same request.
  SELECT *
  INTO v_existing
  FROM public.package_redemptions
  WHERE student_id = p_student_id
    AND client_request_id = v_request_id;

  IF FOUND THEN
    SELECT *
    INTO v_ent
    FROM public.package_entitlements
    WHERE id = v_existing.package_entitlement_id;

    RETURN jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'booking_id', v_existing.booking_id,
      'redemption_id', v_existing.id,
      'entitlement_id', v_existing.package_entitlement_id,
      'session_number', v_existing.session_number,
      'remaining_sessions', coalesce(v_ent.remaining_sessions, 0),
      'used_sessions', coalesce(v_ent.used_sessions, 0),
      'entitlement_status', coalesce(v_ent.status, 'active')
    );
  END IF;

  SELECT *
  INTO v_ent
  FROM public.package_entitlements
  WHERE id = p_entitlement_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ENTITLEMENT_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  IF v_ent.student_id IS DISTINCT FROM p_student_id THEN
    -- Same opaque response as not found — do not leak other students' entitlements.
    RAISE EXCEPTION 'ENTITLEMENT_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  IF v_ent.status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'ENTITLEMENT_NOT_ACTIVE' USING ERRCODE = 'P0001';
  END IF;

  IF v_ent.remaining_sessions IS NULL OR v_ent.remaining_sessions <= 0 THEN
    RAISE EXCEPTION 'NO_REMAINING_SESSIONS' USING ERRCODE = 'P0001';
  END IF;

  IF p_learner_profile_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.learner_profiles lp
      WHERE lp.id = p_learner_profile_id
        AND lp.owner_user_id = p_student_id
        AND lp.archived_at IS NULL
    ) THEN
      RAISE EXCEPTION 'INVALID_LEARNER_PROFILE' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  v_duration := coalesce(
    p_duration_minutes,
    v_ent.offer_duration_minutes_snapshot,
    60
  );
  IF v_duration < 15 OR v_duration > 480 THEN
    RAISE EXCEPTION 'INVALID_PAYLOAD' USING ERRCODE = 'P0001';
  END IF;

  v_session_number := v_ent.used_sessions + 1;
  v_new_used := v_ent.used_sessions + 1;
  v_new_remaining := v_ent.remaining_sessions - 1;
  v_new_status := CASE WHEN v_new_remaining = 0 THEN 'fully_used' ELSE 'active' END;

  -- Package-credit booking: confirmed immediately, $0 price, no Stripe IDs.
  -- Snapshot fields are copied from the entitlement, never from live teacher_offers.
  INSERT INTO public.bookings (
    teacher_id,
    student_id,
    date,
    time,
    slot_date,
    time_slot,
    student_level,
    teaching_mode,
    status,
    lesson_type,
    price,
    duration_minutes,
    student_address,
    learner_profile_id,
    teacher_offer_id,
    teacher_offer_title_snapshot,
    teacher_offer_type_snapshot,
    teacher_offer_format_snapshot,
    teacher_offer_price_cents_snapshot,
    teacher_offer_currency_snapshot,
    teacher_offer_duration_minutes_snapshot,
    teacher_offer_session_count_snapshot,
    teacher_offer_discipline_id_snapshot,
    teacher_offer_specialite_snapshot,
    teacher_offer_short_description_snapshot,
    teacher_offer_snapshot_version,
    package_entitlement_id,
    booking_payment_source
  ) VALUES (
    v_ent.teacher_id,
    p_student_id,
    p_slot_date,
    btrim(p_time_slot),
    p_slot_date,
    btrim(p_time_slot),
    nullif(btrim(coalesce(p_student_level, '')), ''),
    p_teaching_mode,
    'confirmed',
    'regular',
    0,
    v_duration,
    CASE WHEN p_teaching_mode = 'domicile' THEN nullif(btrim(p_student_address), '') ELSE NULL END,
    p_learner_profile_id,
    v_ent.teacher_offer_id,
    v_ent.offer_title_snapshot,
    v_ent.offer_type_snapshot,
    v_ent.offer_format_snapshot,
    v_ent.offer_price_cents_snapshot,
    v_ent.offer_currency_snapshot,
    v_ent.offer_duration_minutes_snapshot,
    v_ent.offer_session_count_snapshot,
    v_ent.offer_discipline_id_snapshot,
    v_ent.offer_specialite_snapshot,
    v_ent.offer_short_description_snapshot,
    coalesce(v_ent.offer_snapshot_version, 1),
    v_ent.id,
    'package_credit'
  )
  RETURNING id INTO v_booking_id;

  INSERT INTO public.package_redemptions (
    package_entitlement_id,
    booking_id,
    student_id,
    teacher_id,
    session_number,
    status,
    client_request_id,
    created_by
  ) VALUES (
    v_ent.id,
    v_booking_id,
    p_student_id,
    v_ent.teacher_id,
    v_session_number,
    'reserved',
    v_request_id,
    p_student_id
  )
  RETURNING id INTO v_redemption_id;

  UPDATE public.bookings
  SET package_redemption_id = v_redemption_id
  WHERE id = v_booking_id;

  UPDATE public.package_entitlements
  SET
    used_sessions = v_new_used,
    remaining_sessions = v_new_remaining,
    status = v_new_status,
    completed_at = CASE
      WHEN v_new_status = 'fully_used' THEN coalesce(completed_at, now())
      ELSE completed_at
    END,
    updated_at = now()
  WHERE id = v_ent.id;

  RETURN jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'booking_id', v_booking_id,
    'redemption_id', v_redemption_id,
    'entitlement_id', v_ent.id,
    'session_number', v_session_number,
    'remaining_sessions', v_new_remaining,
    'used_sessions', v_new_used,
    'entitlement_status', v_new_status
  );

EXCEPTION
  WHEN unique_violation THEN
    -- Concurrent duplicate client_request_id or slot conflict.
    SELECT *
    INTO v_existing
    FROM public.package_redemptions
    WHERE student_id = p_student_id
      AND client_request_id = v_request_id;
    IF FOUND THEN
      SELECT *
      INTO v_ent
      FROM public.package_entitlements
      WHERE id = v_existing.package_entitlement_id;
      RETURN jsonb_build_object(
        'ok', true,
        'idempotent', true,
        'booking_id', v_existing.booking_id,
        'redemption_id', v_existing.id,
        'entitlement_id', v_existing.package_entitlement_id,
        'session_number', v_existing.session_number,
        'remaining_sessions', coalesce(v_ent.remaining_sessions, 0),
        'used_sessions', coalesce(v_ent.used_sessions, 0),
        'entitlement_status', coalesce(v_ent.status, 'active')
      );
    END IF;
    RAISE EXCEPTION 'SLOT_BOOKED' USING ERRCODE = 'P0001';
END;
$$;

COMMENT ON FUNCTION public.redeem_package_session_booking(
  uuid, uuid, text, text, text, text, text, text, uuid, integer
) IS
  'Atomically redeem one forfait session into a confirmed booking. Idempotent on (student_id, client_request_id). Service-role only.';

REVOKE ALL ON FUNCTION public.redeem_package_session_booking(
  uuid, uuid, text, text, text, text, text, text, uuid, integer
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.redeem_package_session_booking(
  uuid, uuid, text, text, text, text, text, text, uuid, integer
) TO service_role;
