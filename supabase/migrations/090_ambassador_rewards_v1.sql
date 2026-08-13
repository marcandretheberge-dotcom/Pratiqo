-- Ambassador rewards V1: margin-linked, manual-payout economics.
--
-- Principles:
-- - pay from realized Pratiqo platform fees, never from GMV or teacher gross revenue
-- - only completed + held + paid bookings qualify
-- - keep rewards pending for manual review/payout in V1
-- - keep the rule version immutable/auditable through ambassador_rewards.rule_version
-- - conservatively void/reverse rewards on refunds or disputes
--
-- V1 economics (CAD only):
-- Student referral:
--   50% of actual Pratiqo platform fee on up to the first 3 eligible completed bookings,
--   capped at $5 per booking and $10 total per referred learner.
-- Teacher referral:
--   $10 once the referred teacher has generated at least $20 of eligible completed
--   Pratiqo platform fees. This keeps the acquisition bounty <= 50% of realized margin.

CREATE TABLE IF NOT EXISTS public.ambassador_reward_rules (
  rule_version text PRIMARY KEY,
  active boolean NOT NULL DEFAULT false,
  currency text NOT NULL DEFAULT 'cad',
  student_platform_fee_share_bps smallint NOT NULL,
  student_booking_limit smallint NOT NULL,
  student_per_booking_cap_cents integer NOT NULL,
  student_total_cap_cents integer NOT NULL,
  teacher_activation_bonus_cents integer NOT NULL,
  teacher_min_completed_platform_fee_cents integer NOT NULL,
  effective_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ambassador_reward_rules_currency_check CHECK (
    currency = lower(currency) AND length(currency) = 3
  ),
  CONSTRAINT ambassador_reward_rules_share_check CHECK (
    student_platform_fee_share_bps BETWEEN 0 AND 10000
  ),
  CONSTRAINT ambassador_reward_rules_student_limit_check CHECK (
    student_booking_limit BETWEEN 1 AND 50
  ),
  CONSTRAINT ambassador_reward_rules_amounts_check CHECK (
    student_per_booking_cap_cents >= 0
    AND student_total_cap_cents >= 0
    AND teacher_activation_bonus_cents >= 0
    AND teacher_min_completed_platform_fee_cents >= 0
  ),
  CONSTRAINT ambassador_reward_rules_student_caps_check CHECK (
    student_per_booking_cap_cents <= student_total_cap_cents
  ),
  CONSTRAINT ambassador_reward_rules_teacher_margin_check CHECK (
    teacher_activation_bonus_cents * 2 <= teacher_min_completed_platform_fee_cents
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ambassador_reward_rules_one_active
  ON public.ambassador_reward_rules (active)
  WHERE active = true;

INSERT INTO public.ambassador_reward_rules (
  rule_version,
  active,
  currency,
  student_platform_fee_share_bps,
  student_booking_limit,
  student_per_booking_cap_cents,
  student_total_cap_cents,
  teacher_activation_bonus_cents,
  teacher_min_completed_platform_fee_cents,
  effective_at
) VALUES (
  '2026-08-v1',
  true,
  'cad',
  5000,
  3,
  500,
  1000,
  1000,
  2000,
  now()
)
ON CONFLICT (rule_version) DO NOTHING;

COMMENT ON TABLE public.ambassador_reward_rules IS
  'Versioned service-role-only ambassador economics. V1 rewards are margin-linked and remain pending for manual payout review.';

-- Create pending rewards after a booking becomes completed/held.
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

  -- Student-side acquisition reward: share actual realized Pratiqo fee, bounded per booking and learner.
  IF FOUND AND v_payment.platform_fee_cents > 0 THEN
    SELECT ra.*
      INTO v_student_attr
    FROM public.referral_attributions ra
    WHERE ra.referred_user_id = NEW.student_id
      AND ra.referral_type = 'student';

    IF FOUND THEN
      SELECT
        count(*)::integer,
        COALESCE(sum(ar.amount_cents), 0)::integer
        INTO v_student_reward_count, v_student_reward_total
      FROM public.ambassador_rewards ar
      WHERE ar.attribution_id = v_student_attr.id
        AND ar.reward_type = 'student_completed_booking_share'
        AND ar.rule_version = v_rule.rule_version
        AND ar.status NOT IN ('void', 'reversed');

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
            status
          ) VALUES (
            v_student_attr.ambassador_link_id,
            v_student_attr.id,
            NEW.id,
            'student_completed:' || v_student_attr.id::text || ':' || NEW.id::text || ':' || v_rule.rule_version,
            'student_completed_booking_share',
            v_student_reward_cents,
            v_rule.currency,
            v_rule.rule_version,
            'pending'
          )
          ON CONFLICT (reward_key) DO NOTHING;
        END IF;
      END IF;
    END IF;
  END IF;

  -- Teacher-side acquisition reward: only after the referred teacher has generated
  -- enough completed, paid, non-refunded platform fees to fund the bounty safely.
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
    AND ra.referral_type = 'teacher';

  IF NOT FOUND THEN
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
      status
    ) VALUES (
      v_teacher_attr.ambassador_link_id,
      v_teacher_attr.id,
      NEW.id,
      'teacher_activation:' || v_teacher_attr.id::text || ':' || v_rule.rule_version,
      'teacher_activation_margin_bonus',
      v_rule.teacher_activation_bonus_cents,
      v_rule.currency,
      v_rule.rule_version,
      'pending'
    )
    ON CONFLICT (reward_key) DO UPDATE
      SET booking_id = EXCLUDED.booking_id,
          amount_cents = EXCLUDED.amount_cents,
          status = 'pending',
          voided_at = NULL,
          updated_at = now()
      WHERE public.ambassador_rewards.status = 'void';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ambassador_rewards_v1_booking_completion ON public.bookings;
CREATE TRIGGER trg_ambassador_rewards_v1_booking_completion
AFTER UPDATE OF status, completion_outcome ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.record_ambassador_rewards_v1_on_booking_completion();

-- Conservative refund/dispute reconciliation.
-- Any refund/dispute invalidates the reward attached to that student booking.
-- Teacher activation bonuses are re-checked against currently eligible realized fees.
CREATE OR REPLACE FUNCTION public.reconcile_ambassador_rewards_v1_after_payment_adjustment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule public.ambassador_reward_rules%ROWTYPE;
  v_teacher_user_id uuid;
  v_teacher_attr public.referral_attributions%ROWTYPE;
  v_teacher_platform_fee_total integer := 0;
BEGIN
  IF NEW.payment_status NOT IN ('refunded', 'partially_refunded', 'disputed')
     AND NEW.refunded_cents <= 0 THEN
    RETURN NEW;
  END IF;

  -- Student booking reward: a refunded or disputed booking no longer qualifies.
  UPDATE public.ambassador_rewards ar
  SET status = CASE WHEN ar.status = 'paid' THEN 'reversed' ELSE 'void' END,
      voided_at = COALESCE(ar.voided_at, now()),
      updated_at = now()
  WHERE ar.booking_id = NEW.booking_id
    AND ar.reward_type = 'student_completed_booking_share'
    AND ar.status IN ('pending', 'earned', 'paid');

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
    AND ra.referral_type = 'teacher';

  IF NOT FOUND THEN
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

  IF v_teacher_platform_fee_total < v_rule.teacher_min_completed_platform_fee_cents THEN
    UPDATE public.ambassador_rewards ar
    SET status = CASE WHEN ar.status = 'paid' THEN 'reversed' ELSE 'void' END,
        voided_at = COALESCE(ar.voided_at, now()),
        updated_at = now()
    WHERE ar.attribution_id = v_teacher_attr.id
      AND ar.reward_type = 'teacher_activation_margin_bonus'
      AND ar.rule_version = v_rule.rule_version
      AND ar.status IN ('pending', 'earned', 'paid');
  END IF;

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
EXECUTE FUNCTION public.reconcile_ambassador_rewards_v1_after_payment_adjustment();

-- Admin-only economics view: exposes how much realized fee remains after ambassador obligations.
CREATE OR REPLACE VIEW public.ambassador_reward_economics
WITH (security_invoker = true)
AS
SELECT
  al.id AS ambassador_link_id,
  al.code,
  al.teacher_id,
  t.user_id AS ambassador_user_id,
  COALESCE(ap.completed_platform_fee_cents, 0) AS referred_student_completed_platform_fee_cents,
  COALESCE(ap.rewards_due_cents, 0) AS rewards_due_cents,
  COALESCE(ap.rewards_paid_cents, 0) AS rewards_paid_cents,
  GREATEST(
    0,
    COALESCE(ap.completed_platform_fee_cents, 0)
      - COALESCE(ap.rewards_due_cents, 0)
      - COALESCE(ap.rewards_paid_cents, 0)
  ) AS referred_student_fee_after_rewards_cents
FROM public.ambassador_links al
JOIN public.teachers t ON t.id = al.teacher_id
LEFT JOIN public.ambassador_performance ap ON ap.ambassador_link_id = al.id;

ALTER TABLE public.ambassador_reward_rules ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ambassador_reward_rules FROM anon, authenticated;
REVOKE ALL ON public.ambassador_reward_economics FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.record_ambassador_rewards_v1_on_booking_completion() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reconcile_ambassador_rewards_v1_after_payment_adjustment() FROM PUBLIC, anon, authenticated;

GRANT ALL ON public.ambassador_reward_rules TO service_role;
GRANT SELECT ON public.ambassador_reward_economics TO service_role;
GRANT EXECUTE ON FUNCTION public.record_ambassador_rewards_v1_on_booking_completion() TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_ambassador_rewards_v1_after_payment_adjustment() TO service_role;
