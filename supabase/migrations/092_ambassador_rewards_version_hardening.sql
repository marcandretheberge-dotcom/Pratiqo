-- Future-proof Ambassador rewards across rule-version changes.
-- This migration deliberately follows 090 instead of rewriting history.
-- It prevents learner caps from resetting when a future rule version becomes active,
-- keeps paid->reversed rewards counted as historical acquisition spend, prevents
-- duplicate teacher acquisition bounties across versions, and reconciles teacher
-- rewards against the exact rule version that created each reward.

CREATE OR REPLACE FUNCTION public.record_ambassador_rewards_v1_on_booking_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule public.ambassador_reward_rules%ROWTYPE;
  v_payment public.booking_payments%ROWTYPE;
  v_student_attr public.referral_attributions%ROWTYPE;
  v_teacher_attr public.referral_attributions%ROWTYPE;
  v_teacher_user_id uuid;
  v_student_reward_count integer := 0;
  v_student_reward_total integer := 0;
  v_student_reward_cents integer := 0;
  v_teacher_platform_fee_total integer := 0;
  v_teacher_reward_exists boolean := false;
BEGIN
  IF NEW.status IS DISTINCT FROM 'completed'
     OR OLD.status IS NOT DISTINCT FROM 'completed'
     OR NEW.completion_outcome IS DISTINCT FROM 'held' THEN
    RETURN NEW;
  END IF;

  SELECT r.*
    INTO v_rule
  FROM public.ambassador_reward_rules r
  WHERE r.active = true
    AND r.effective_at <= now()
  ORDER BY r.effective_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  SELECT bp.*
    INTO v_payment
  FROM public.booking_payments bp
  WHERE bp.booking_id = NEW.id
    AND bp.payment_status = 'paid'
    AND bp.refunded_cents = 0
    AND bp.currency = v_rule.currency;

  IF FOUND AND v_payment.platform_fee_cents > 0 THEN
    SELECT ra.*
      INTO v_student_attr
    FROM public.referral_attributions ra
    WHERE ra.referred_user_id = NEW.student_id
      AND ra.referral_type = 'student'
    FOR UPDATE;

    IF FOUND THEN
      -- Lifetime acquisition caps: do not reset count or spend at a V2/V3 transition.
      -- A pre-payout void releases capacity; paid->reversed remains historical spend.
      SELECT
        count(*)::integer,
        COALESCE(sum(ar.amount_cents), 0)::integer
        INTO v_student_reward_count, v_student_reward_total
      FROM public.ambassador_rewards ar
      WHERE ar.attribution_id = v_student_attr.id
        AND ar.reward_type = 'student_completed_booking_share'
        AND ar.status <> 'void';

      IF v_student_reward_count < v_rule.student_booking_limit
         AND v_student_reward_total < v_rule.student_total_cap_cents THEN
        v_student_reward_cents := LEAST(
          v_rule.student_per_booking_cap_cents,
          FLOOR((v_payment.platform_fee_cents::numeric * v_rule.student_platform_fee_share_bps) / 10000)::integer,
          v_rule.student_total_cap_cents - v_student_reward_total
        );

        IF v_student_reward_cents > 0 THEN
          INSERT INTO public.ambassador_rewards (
            ambassador_link_id,
            attribution_id,
            booking_id,
            reward_key,
            reward_type,
            amount_cents,
            currency,
            rule_version,
            status,
            metadata
          ) VALUES (
            v_student_attr.ambassador_link_id,
            v_student_attr.id,
            NEW.id,
            'student_completed:' || v_student_attr.id::text || ':' || NEW.id::text,
            'student_completed_booking_share',
            v_student_reward_cents,
            v_rule.currency,
            v_rule.rule_version,
            'pending',
            jsonb_build_object(
              'platform_fee_cents', v_payment.platform_fee_cents,
              'share_bps', v_rule.student_platform_fee_share_bps,
              'per_booking_cap_cents', v_rule.student_per_booking_cap_cents,
              'learner_total_cap_cents', v_rule.student_total_cap_cents
            )
          )
          ON CONFLICT (reward_key) DO NOTHING;
        END IF;
      END IF;
    END IF;
  END IF;

  SELECT t.user_id
    INTO v_teacher_user_id
  FROM public.teachers t
  WHERE t.id = NEW.teacher_id;

  IF v_teacher_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT ra.*
    INTO v_teacher_attr
  FROM public.referral_attributions ra
  WHERE ra.referred_user_id = v_teacher_user_id
    AND ra.referral_type = 'teacher'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Never pay a second teacher acquisition bounty after one is live, paid,
  -- or has already been paid then reversed. A voided pre-payment reward may
  -- become eligible again under the current rule after new realized margin.
  SELECT EXISTS (
    SELECT 1
    FROM public.ambassador_rewards ar
    WHERE ar.attribution_id = v_teacher_attr.id
      AND ar.reward_type = 'teacher_activation_margin_bonus'
      AND ar.status IN ('pending', 'earned', 'paid', 'reversed')
  ) INTO v_teacher_reward_exists;

  IF v_teacher_reward_exists THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(sum(bp.platform_fee_cents), 0)::integer
    INTO v_teacher_platform_fee_total
  FROM public.booking_payments bp
  JOIN public.bookings b ON b.id = bp.booking_id
  WHERE bp.teacher_id = NEW.teacher_id
    AND bp.payment_status = 'paid'
    AND bp.refunded_cents = 0
    AND bp.currency = v_rule.currency
    AND b.status = 'completed'
    AND b.completion_outcome = 'held';

  IF v_teacher_platform_fee_total >= v_rule.teacher_min_completed_platform_fee_cents
     AND v_rule.teacher_activation_bonus_cents > 0 THEN
    INSERT INTO public.ambassador_rewards (
      ambassador_link_id,
      attribution_id,
      booking_id,
      reward_key,
      reward_type,
      amount_cents,
      currency,
      rule_version,
      status,
      metadata
    ) VALUES (
      v_teacher_attr.ambassador_link_id,
      v_teacher_attr.id,
      NEW.id,
      'teacher_activation:' || v_teacher_attr.id::text,
      'teacher_activation_margin_bonus',
      v_rule.teacher_activation_bonus_cents,
      v_rule.currency,
      v_rule.rule_version,
      'pending',
      jsonb_build_object(
        'eligible_platform_fee_cents_at_creation', v_teacher_platform_fee_total,
        'minimum_platform_fee_cents', v_rule.teacher_min_completed_platform_fee_cents
      )
    )
    ON CONFLICT (reward_key) DO UPDATE
      SET booking_id = EXCLUDED.booking_id,
          status = 'pending',
          voided_at = NULL,
          metadata = COALESCE(public.ambassador_rewards.metadata, '{}'::jsonb)
            || EXCLUDED.metadata
            || jsonb_build_object(
              'reactivated_from_void', true,
              'reactivated_at', now()
            ),
          updated_at = now()
      WHERE public.ambassador_rewards.status = 'void'
        AND public.ambassador_rewards.metadata->>'status_reason' = 'teacher_margin_below_threshold';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.reconcile_ambassador_rewards_after_payment_adjustment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher_user_id uuid;
  v_teacher_attr public.referral_attributions%ROWTYPE;
BEGIN
  IF NEW.payment_status NOT IN ('refunded', 'partially_refunded', 'disputed')
     AND NEW.refunded_cents <= 0 THEN
    RETURN NEW;
  END IF;

  UPDATE public.ambassador_rewards ar
  SET status = CASE WHEN ar.status = 'paid' THEN 'reversed' ELSE 'void' END,
      voided_at = COALESCE(ar.voided_at, now()),
      metadata = COALESCE(ar.metadata, '{}'::jsonb) || jsonb_build_object(
        'status_reason', 'booking_refund_or_dispute',
        'invalidated_by_booking_id', NEW.booking_id,
        'payment_status', NEW.payment_status,
        'refunded_cents', NEW.refunded_cents,
        'invalidated_at', now()
      ),
      updated_at = now()
  WHERE ar.booking_id = NEW.booking_id
    AND ar.reward_type = 'student_completed_booking_share'
    AND ar.status IN ('pending', 'earned', 'paid');

  SELECT t.user_id
    INTO v_teacher_user_id
  FROM public.teachers t
  WHERE t.id = NEW.teacher_id;

  IF v_teacher_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT ra.*
    INTO v_teacher_attr
  FROM public.referral_attributions ra
  WHERE ra.referred_user_id = v_teacher_user_id
    AND ra.referral_type = 'teacher'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Re-evaluate each reward using the exact historical rule that created it.
  UPDATE public.ambassador_rewards ar
  SET status = CASE WHEN ar.status = 'paid' THEN 'reversed' ELSE 'void' END,
      voided_at = COALESCE(ar.voided_at, now()),
      metadata = COALESCE(ar.metadata, '{}'::jsonb) || jsonb_build_object(
        'status_reason', 'teacher_margin_below_threshold',
        'invalidated_by_booking_id', NEW.booking_id,
        'invalidated_at', now()
      ),
      updated_at = now()
  FROM public.ambassador_reward_rules r
  WHERE ar.attribution_id = v_teacher_attr.id
    AND ar.reward_type = 'teacher_activation_margin_bonus'
    AND ar.rule_version = r.rule_version
    AND ar.status IN ('pending', 'earned', 'paid')
    AND COALESCE((
      SELECT sum(bp.platform_fee_cents)
      FROM public.booking_payments bp
      JOIN public.bookings b ON b.id = bp.booking_id
      WHERE bp.teacher_id = NEW.teacher_id
        AND bp.payment_status = 'paid'
        AND bp.refunded_cents = 0
        AND bp.currency = r.currency
        AND b.status = 'completed'
        AND b.completion_outcome = 'held'
    ), 0) < r.teacher_min_completed_platform_fee_cents;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ambassador_rewards_v1_payment_adjustment ON public.booking_payments;
CREATE TRIGGER trg_ambassador_rewards_v1_payment_adjustment
AFTER UPDATE OF payment_status, refunded_cents ON public.booking_payments
FOR EACH ROW
WHEN (
  NEW.payment_status IN ('refunded', 'partially_refunded', 'disputed')
  OR NEW.refunded_cents > 0
)
EXECUTE FUNCTION public.reconcile_ambassador_rewards_after_payment_adjustment();

DROP FUNCTION IF EXISTS public.reconcile_ambassador_rewards_v1_after_payment_adjustment();

REVOKE ALL ON FUNCTION public.reconcile_ambassador_rewards_after_payment_adjustment() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_ambassador_rewards_after_payment_adjustment() TO service_role;
