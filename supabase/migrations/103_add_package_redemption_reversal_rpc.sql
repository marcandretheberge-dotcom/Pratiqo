-- 103: package credit reversal on booking cancellation (PR 10C)
--
-- Restores one forfait session when a package-credit booking is cancelled
-- or declined before the lesson is completed.
--
-- Atomic reverse happens in public.reverse_package_redemption_for_booking().
-- Optional: mark redemption completed on booking completion
-- via public.mark_package_redemption_completed_for_booking().
--
-- Future PR: teacher-configurable cancellation/rescheduling preferences for
-- offers/packages, within Pratiqo marketplace safety and fairness rules.
-- See docs/product/marketplace-independent-teacher-guardrails.md.
--
-- Legal TODO before public package launch:
-- Terms must clarify that the package service contract is between the learner
-- and the independent teacher. Pratiqo acts as a technology marketplace /
-- payment / booking facilitator. Pratiqo is not the teaching provider and
-- does not employ the teacher.

ALTER TABLE public.package_redemptions
  ADD COLUMN IF NOT EXISTS reversal_reason text,
  ADD COLUMN IF NOT EXISTS reversed_by uuid
    REFERENCES auth.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reversal_source text;

ALTER TABLE public.package_redemptions
  DROP CONSTRAINT IF EXISTS package_redemptions_reversal_source_chk;

ALTER TABLE public.package_redemptions
  ADD CONSTRAINT package_redemptions_reversal_source_chk
  CHECK (
    reversal_source IS NULL
    OR reversal_source IN (
      'student_cancelled',
      'teacher_cancelled',
      'teacher_rejected',
      'admin_cancelled',
      'system'
    )
  );

COMMENT ON COLUMN public.package_redemptions.reversal_source IS
  'Who/what triggered package credit restore: student_cancelled, teacher_cancelled, teacher_rejected, admin_cancelled, system.';

COMMENT ON COLUMN public.package_redemptions.reversal_reason IS
  'Optional free-text reason for credit restore. Not a monetary refund field.';

-- ── reverse RPC ─────────────────────────────────────────────────────
--
-- Locks redemption + entitlement, restores one session when status = reserved.
-- Idempotent when already reversed/cancelled. Blocks completed redemptions.
-- Does not touch Stripe, payouts, or monetary refunds.

CREATE OR REPLACE FUNCTION public.reverse_package_redemption_for_booking(
  p_booking_id uuid,
  p_actor_user_id uuid DEFAULT NULL,
  p_source text DEFAULT 'system',
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_red public.package_redemptions%ROWTYPE;
  v_ent public.package_entitlements%ROWTYPE;
  v_source text;
  v_reason text;
  v_new_used integer;
  v_new_remaining integer;
  v_new_status text;
BEGIN
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);

  IF p_booking_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_PAYLOAD' USING ERRCODE = 'P0001';
  END IF;

  v_source := nullif(btrim(coalesce(p_source, '')), '');
  IF v_source IS NULL OR v_source NOT IN (
    'student_cancelled',
    'teacher_cancelled',
    'teacher_rejected',
    'admin_cancelled',
    'system'
  ) THEN
    RAISE EXCEPTION 'INVALID_PAYLOAD' USING ERRCODE = 'P0001';
  END IF;

  v_reason := nullif(btrim(coalesce(p_reason, '')), '');
  IF v_reason IS NOT NULL AND char_length(v_reason) > 500 THEN
    v_reason := left(v_reason, 500);
  END IF;

  SELECT *
  INTO v_red
  FROM public.package_redemptions
  WHERE booking_id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'reversed', false,
      'idempotent', true,
      'reason', 'no_package_redemption'
    );
  END IF;

  -- Idempotent: already restored.
  IF v_red.status IN ('reversed', 'cancelled') THEN
    SELECT *
    INTO v_ent
    FROM public.package_entitlements
    WHERE id = v_red.package_entitlement_id;

    RETURN jsonb_build_object(
      'ok', true,
      'reversed', false,
      'idempotent', true,
      'booking_id', v_red.booking_id,
      'redemption_id', v_red.id,
      'entitlement_id', v_red.package_entitlement_id,
      'session_number', v_red.session_number,
      'redemption_status', v_red.status,
      'remaining_sessions', coalesce(v_ent.remaining_sessions, 0),
      'used_sessions', coalesce(v_ent.used_sessions, 0),
      'entitlement_status', coalesce(v_ent.status, 'active'),
      'reversal_source', v_red.reversal_source
    );
  END IF;

  IF v_red.status IS DISTINCT FROM 'reserved' THEN
    RAISE EXCEPTION 'REDEMPTION_NOT_REVERSIBLE' USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO v_ent
  FROM public.package_entitlements
  WHERE id = v_red.package_entitlement_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ENTITLEMENT_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  -- Keep student/teacher context aligned with the redemption row.
  IF v_ent.student_id IS DISTINCT FROM v_red.student_id
     OR v_ent.teacher_id IS DISTINCT FROM v_red.teacher_id THEN
    RAISE EXCEPTION 'REDEMPTION_NOT_REVERSIBLE' USING ERRCODE = 'P0001';
  END IF;

  v_new_used := GREATEST(coalesce(v_ent.used_sessions, 0) - 1, 0);
  v_new_remaining := LEAST(
    coalesce(v_ent.total_sessions, 0),
    GREATEST(coalesce(v_ent.remaining_sessions, 0) + 1, 0)
  );
  -- Prefer invariant remaining = total - used when total is known.
  IF coalesce(v_ent.total_sessions, 0) > 0 THEN
    v_new_remaining := GREATEST(v_ent.total_sessions - v_new_used, 0);
  END IF;

  v_new_status := CASE
    WHEN v_new_remaining > 0 THEN 'active'
    ELSE coalesce(v_ent.status, 'fully_used')
  END;

  UPDATE public.package_redemptions
  SET
    status = 'reversed',
    reversed_at = coalesce(reversed_at, now()),
    cancelled_at = coalesce(cancelled_at, now()),
    reversal_source = v_source,
    reversal_reason = v_reason,
    reversed_by = p_actor_user_id,
    updated_at = now()
  WHERE id = v_red.id;

  UPDATE public.package_entitlements
  SET
    used_sessions = v_new_used,
    remaining_sessions = v_new_remaining,
    status = v_new_status,
    completed_at = CASE
      WHEN v_new_status = 'active' THEN NULL
      ELSE completed_at
    END,
    updated_at = now()
  WHERE id = v_ent.id;

  RETURN jsonb_build_object(
    'ok', true,
    'reversed', true,
    'idempotent', false,
    'booking_id', v_red.booking_id,
    'redemption_id', v_red.id,
    'entitlement_id', v_ent.id,
    'session_number', v_red.session_number,
    'redemption_status', 'reversed',
    'remaining_sessions', v_new_remaining,
    'used_sessions', v_new_used,
    'entitlement_status', v_new_status,
    'reversal_source', v_source
  );
END;
$$;

COMMENT ON FUNCTION public.reverse_package_redemption_for_booking(uuid, uuid, text, text) IS
  'Atomically restore one forfait session for a cancelled/declined package-credit booking. Idempotent. Service-role only.';

REVOKE ALL ON FUNCTION public.reverse_package_redemption_for_booking(uuid, uuid, text, text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reverse_package_redemption_for_booking(uuid, uuid, text, text)
  TO service_role;

-- ── completion mark (no balance change) ─────────────────────────────

CREATE OR REPLACE FUNCTION public.mark_package_redemption_completed_for_booking(
  p_booking_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_red public.package_redemptions%ROWTYPE;
BEGIN
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);

  IF p_booking_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_PAYLOAD' USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO v_red
  FROM public.package_redemptions
  WHERE booking_id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'completed', false,
      'idempotent', true,
      'reason', 'no_package_redemption'
    );
  END IF;

  IF v_red.status = 'completed' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'completed', false,
      'idempotent', true,
      'redemption_id', v_red.id,
      'redemption_status', 'completed'
    );
  END IF;

  IF v_red.status IS DISTINCT FROM 'reserved' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'completed', false,
      'idempotent', true,
      'redemption_id', v_red.id,
      'redemption_status', v_red.status,
      'reason', 'not_reserved'
    );
  END IF;

  UPDATE public.package_redemptions
  SET
    status = 'completed',
    completed_at = coalesce(completed_at, now()),
    updated_at = now()
  WHERE id = v_red.id;

  RETURN jsonb_build_object(
    'ok', true,
    'completed', true,
    'idempotent', false,
    'redemption_id', v_red.id,
    'redemption_status', 'completed'
  );
END;
$$;

COMMENT ON FUNCTION public.mark_package_redemption_completed_for_booking(uuid) IS
  'Marks a reserved package redemption completed when the booking completes. No entitlement balance change. Service-role only.';

REVOKE ALL ON FUNCTION public.mark_package_redemption_completed_for_booking(uuid)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.mark_package_redemption_completed_for_booking(uuid)
  TO service_role;
