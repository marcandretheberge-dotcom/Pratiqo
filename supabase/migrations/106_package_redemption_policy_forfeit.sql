-- PR 16B: Policy evaluation audit fields + forfeit (no credit return) RPC
-- for package-credit cancellations outside the teacher's snapshotted window.
--
-- Does NOT touch Stripe, payouts, transfers, commissions, or monetary refunds.
-- Does NOT change package balance constraints.
-- No aggressive backfill.
--
-- Marketplace framing: conditions proposées par le professeur.
-- See docs/product/marketplace-independent-teacher-guardrails.md

-- Legal TODO before public package launch:
-- Terms must clarify that the package service contract is between the learner
-- and the independent teacher. Pratiqo acts as a technology marketplace /
-- payment / booking facilitator. Pratiqo is not the teaching provider and
-- does not employ the teacher.

ALTER TABLE public.package_redemptions
  ADD COLUMN IF NOT EXISTS policy_evaluation_result text,
  ADD COLUMN IF NOT EXISTS policy_evaluated_at timestamptz,
  ADD COLUMN IF NOT EXISTS credit_return_reason text,
  ADD COLUMN IF NOT EXISTS manual_review_required boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.package_redemptions.policy_evaluation_result IS
  'PR 16B: last package-credit cancellation policy reason (snapshot-based).';
COMMENT ON COLUMN public.package_redemptions.policy_evaluated_at IS
  'PR 16B: when policy_evaluation_result was recorded.';
COMMENT ON COLUMN public.package_redemptions.credit_return_reason IS
  'PR 16B: why credit was returned or not (e.g. within_notice_window, outside_notice_window).';
COMMENT ON COLUMN public.package_redemptions.manual_review_required IS
  'PR 16B: teacher manual_review preference or unresolved policy evaluation.';

-- Mark redemption cancelled without restoring entitlement balance.
-- Idempotent when already cancelled. Refuses completed. If already reversed,
-- returns idempotent without changing balances (credit already restored).
-- Service-role only.

CREATE OR REPLACE FUNCTION public.forfeit_package_redemption_for_booking(
  p_booking_id uuid,
  p_actor_user_id uuid DEFAULT NULL,
  p_source text DEFAULT 'system',
  p_reason text DEFAULT NULL,
  p_policy_evaluation_result text DEFAULT NULL,
  p_credit_return_reason text DEFAULT NULL,
  p_manual_review_required boolean DEFAULT false
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
  v_eval text;
  v_credit_reason text;
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

  v_eval := nullif(btrim(coalesce(p_policy_evaluation_result, '')), '');
  IF v_eval IS NOT NULL AND char_length(v_eval) > 80 THEN
    v_eval := left(v_eval, 80);
  END IF;

  v_credit_reason := nullif(btrim(coalesce(p_credit_return_reason, '')), '');
  IF v_credit_reason IS NOT NULL AND char_length(v_credit_reason) > 80 THEN
    v_credit_reason := left(v_credit_reason, 80);
  END IF;

  SELECT *
  INTO v_red
  FROM public.package_redemptions
  WHERE booking_id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'forfeited', false,
      'idempotent', true,
      'reason', 'no_package_redemption'
    );
  END IF;

  SELECT *
  INTO v_ent
  FROM public.package_entitlements
  WHERE id = v_red.package_entitlement_id;

  -- Already restored — do not forfeit or change balances.
  IF v_red.status = 'reversed' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'forfeited', false,
      'idempotent', true,
      'reason', 'already_reversed',
      'booking_id', v_red.booking_id,
      'redemption_id', v_red.id,
      'entitlement_id', v_red.package_entitlement_id,
      'session_number', v_red.session_number,
      'redemption_status', v_red.status,
      'remaining_sessions', coalesce(v_ent.remaining_sessions, 0),
      'used_sessions', coalesce(v_ent.used_sessions, 0),
      'entitlement_status', coalesce(v_ent.status, 'active'),
      'manual_review_required', coalesce(v_red.manual_review_required, false)
    );
  END IF;

  -- Already forfeited (no credit return).
  IF v_red.status = 'cancelled' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'forfeited', false,
      'idempotent', true,
      'reason', 'already_forfeited',
      'booking_id', v_red.booking_id,
      'redemption_id', v_red.id,
      'entitlement_id', v_red.package_entitlement_id,
      'session_number', v_red.session_number,
      'redemption_status', v_red.status,
      'remaining_sessions', coalesce(v_ent.remaining_sessions, 0),
      'used_sessions', coalesce(v_ent.used_sessions, 0),
      'entitlement_status', coalesce(v_ent.status, 'active'),
      'manual_review_required', coalesce(v_red.manual_review_required, false)
    );
  END IF;

  IF v_red.status IS DISTINCT FROM 'reserved' THEN
    RAISE EXCEPTION 'REDEMPTION_NOT_FORFEITABLE' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.package_redemptions
  SET
    status = 'cancelled',
    cancelled_at = coalesce(cancelled_at, now()),
    reversal_reason = coalesce(v_reason, reversal_reason),
    reversed_by = coalesce(p_actor_user_id, reversed_by),
    policy_evaluation_result = coalesce(v_eval, policy_evaluation_result),
    policy_evaluated_at = coalesce(now(), policy_evaluated_at),
    credit_return_reason = coalesce(v_credit_reason, credit_return_reason),
    manual_review_required = coalesce(p_manual_review_required, false),
    updated_at = now()
  WHERE id = v_red.id;

  RETURN jsonb_build_object(
    'ok', true,
    'forfeited', true,
    'idempotent', false,
    'booking_id', v_red.booking_id,
    'redemption_id', v_red.id,
    'entitlement_id', v_red.package_entitlement_id,
    'session_number', v_red.session_number,
    'redemption_status', 'cancelled',
    'remaining_sessions', coalesce(v_ent.remaining_sessions, 0),
    'used_sessions', coalesce(v_ent.used_sessions, 0),
    'entitlement_status', coalesce(v_ent.status, 'active'),
    'manual_review_required', coalesce(p_manual_review_required, false)
  );
END;
$$;

COMMENT ON FUNCTION public.forfeit_package_redemption_for_booking(uuid, uuid, text, text, text, text, boolean) IS
  'Mark package redemption cancelled without restoring forfait balance (policy outside window / manual). Idempotent. Service-role only. No Stripe/payout changes.';

REVOKE ALL ON FUNCTION public.forfeit_package_redemption_for_booking(uuid, uuid, text, text, text, text, boolean)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.forfeit_package_redemption_for_booking(uuid, uuid, text, text, text, text, boolean)
  TO service_role;
