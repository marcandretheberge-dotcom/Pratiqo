-- Final PR #303 hardening: make ambassador rewards contribution-margin safe.
--
-- Migrations 089-092 are kept intact as PR history. This forward migration
-- makes the final executable reward functions use net platform contribution:
--   max(0, booking_payments.platform_fee_cents - conservative payment reserve)
--
-- The reserve is deliberately conservative and scoped to ambassador reward
-- safety. It is not Pratiqo's canonical Stripe fee accounting. If authoritative
-- per-payment Stripe balance_transaction fees are stored later, a new rule
-- version can replace these reserve fields while preserving reward audit trails.

ALTER TABLE public.ambassador_reward_rules
  ADD COLUMN IF NOT EXISTS payment_cost_reserve_bps smallint NOT NULL DEFAULT 420,
  ADD COLUMN IF NOT EXISTS payment_cost_reserve_fixed_cents integer NOT NULL DEFAULT 55,
  ADD COLUMN IF NOT EXISTS student_net_contribution_share_bps smallint NOT NULL DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS teacher_min_net_contribution_cents integer NOT NULL DEFAULT 4000;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ambassador_reward_rules_payment_reserve_check'
  ) THEN
    ALTER TABLE public.ambassador_reward_rules
      ADD CONSTRAINT ambassador_reward_rules_payment_reserve_check CHECK (
        payment_cost_reserve_bps BETWEEN 0 AND 10000
        AND payment_cost_reserve_fixed_cents >= 0
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ambassador_reward_rules_net_share_check'
  ) THEN
    ALTER TABLE public.ambassador_reward_rules
      ADD CONSTRAINT ambassador_reward_rules_net_share_check CHECK (
        student_net_contribution_share_bps BETWEEN 0 AND 10000
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ambassador_reward_rules_teacher_net_margin_check'
  ) THEN
    ALTER TABLE public.ambassador_reward_rules
      ADD CONSTRAINT ambassador_reward_rules_teacher_net_margin_check CHECK (
        teacher_min_net_contribution_cents >= 0
        AND teacher_activation_bonus_cents * 4 <= teacher_min_net_contribution_cents
      );
  END IF;
END;
$$;

-- PR #303 has not been deployed as live reward economics yet, so the safest
-- audit story is to keep the conceptual V1 rule_version and finish its fields
-- through this forward migration. rule_version remains metadata and never
-- resets acquisition caps.
UPDATE public.ambassador_reward_rules
SET payment_cost_reserve_bps = 420,
    payment_cost_reserve_fixed_cents = 55,
    student_net_contribution_share_bps = 5000,
    teacher_min_net_contribution_cents = 4000
WHERE rule_version = '2026-08-v1';

COMMENT ON COLUMN public.ambassador_reward_rules.payment_cost_reserve_bps IS
  'Conservative processor-cost reserve basis points for ambassador reward safety; not canonical Stripe fee accounting.';
COMMENT ON COLUMN public.ambassador_reward_rules.payment_cost_reserve_fixed_cents IS
  'Fixed conservative processor-cost reserve in cents for ambassador reward safety.';
COMMENT ON COLUMN public.ambassador_reward_rules.student_net_contribution_share_bps IS
  'Learner reward share applied to net platform contribution after conservative payment reserve.';
COMMENT ON COLUMN public.ambassador_reward_rules.teacher_min_net_contribution_cents IS
  'Minimum cumulative eligible net platform contribution required before teacher acquisition bounty.';
COMMENT ON COLUMN public.ambassador_reward_rules.student_platform_fee_share_bps IS
  'Legacy gross-platform-fee share field from draft migrations; final PR #303 execution uses student_net_contribution_share_bps.';
COMMENT ON COLUMN public.ambassador_reward_rules.teacher_min_completed_platform_fee_cents IS
  'Legacy gross-platform-fee threshold from draft migrations; final PR #303 execution uses teacher_min_net_contribution_cents.';

CREATE OR REPLACE FUNCTION public.ambassador_payment_cost_reserve_cents(
  p_amount_cents integer,
  p_payment_cost_reserve_bps integer,
  p_payment_cost_reserve_fixed_cents integer
)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT (
    CEIL(
      (
        GREATEST(COALESCE(p_amount_cents, 0), 0)::numeric
        * GREATEST(COALESCE(p_payment_cost_reserve_bps, 0), 0)::numeric
      ) / 10000
    )::integer
    + GREATEST(COALESCE(p_payment_cost_reserve_fixed_cents, 0), 0)
  )::integer;
$$;

CREATE OR REPLACE FUNCTION public.ambassador_net_platform_contribution_cents(
  p_amount_cents integer,
  p_platform_fee_cents integer,
  p_payment_cost_reserve_bps integer,
  p_payment_cost_reserve_fixed_cents integer
)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT GREATEST(
    0,
    GREATEST(COALESCE(p_platform_fee_cents, 0), 0)
      - public.ambassador_payment_cost_reserve_cents(
          p_amount_cents,
          p_payment_cost_reserve_bps,
          p_payment_cost_reserve_fixed_cents
        )
  )::integer;
$$;

-- A session that was legitimately issued while its link was active remains
-- claimable until expiry. Deactivating an ambassador link stops new sessions
-- at /r/[code], but does not retroactively destroy valid first-touch sessions.
CREATE OR REPLACE FUNCTION public.claim_ambassador_referral(
  p_session_id uuid,
  p_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public.referral_sessions%ROWTYPE;
  v_link public.ambassador_links%ROWTYPE;
  v_ambassador_user_id uuid;
  v_role text;
  v_referral_type text;
  v_attribution_id uuid;
  v_teacher_complete boolean;
BEGIN
  IF p_session_id IS NULL OR p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT s.*
    INTO v_session
  FROM public.referral_sessions s
  WHERE s.id = p_session_id
  FOR UPDATE;

  IF NOT FOUND
     OR v_session.expires_at <= now()
     OR (v_session.attributed_user_id IS NOT NULL AND v_session.attributed_user_id <> p_user_id) THEN
    RETURN NULL;
  END IF;

  SELECT l.*
    INTO v_link
  FROM public.ambassador_links l
  WHERE l.id = v_session.ambassador_link_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT t.user_id
    INTO v_ambassador_user_id
  FROM public.teachers t
  WHERE t.id = v_link.teacher_id;

  IF v_ambassador_user_id IS NULL OR v_ambassador_user_id = p_user_id THEN
    RETURN NULL;
  END IF;

  SELECT p.role, COALESCE(p.teacher_onboarding_complete, false)
    INTO v_role, v_teacher_complete
  FROM public.profiles p
  WHERE p.id = p_user_id;

  IF NOT FOUND OR v_role = 'admin' THEN
    RETURN NULL;
  END IF;

  v_referral_type := CASE WHEN v_role = 'teacher' THEN 'teacher' ELSE 'student' END;

  SELECT ra.id
    INTO v_attribution_id
  FROM public.referral_attributions ra
  WHERE ra.referred_user_id = p_user_id
    AND ra.referral_type = v_referral_type;

  IF v_attribution_id IS NOT NULL THEN
    RETURN v_attribution_id;
  END IF;

  INSERT INTO public.referral_attributions (
    session_id,
    ambassador_link_id,
    ambassador_user_id,
    referred_user_id,
    referral_type,
    first_touch_at,
    attributed_at,
    expires_at
  ) VALUES (
    v_session.id,
    v_link.id,
    v_ambassador_user_id,
    p_user_id,
    v_referral_type,
    v_session.first_touch_at,
    now(),
    v_session.expires_at
  )
  ON CONFLICT (referred_user_id, referral_type) DO NOTHING
  RETURNING id INTO v_attribution_id;

  IF v_attribution_id IS NULL THEN
    SELECT ra.id
      INTO v_attribution_id
    FROM public.referral_attributions ra
    WHERE ra.referred_user_id = p_user_id
      AND ra.referral_type = v_referral_type;
    RETURN v_attribution_id;
  END IF;

  UPDATE public.referral_sessions
  SET attributed_user_id = p_user_id,
      attributed_at = now()
  WHERE id = v_session.id
    AND attributed_user_id IS NULL;

  INSERT INTO public.referral_events (
    ambassador_link_id,
    session_id,
    attribution_id,
    referred_user_id,
    event_type,
    event_key
  ) VALUES (
    v_link.id,
    v_session.id,
    v_attribution_id,
    p_user_id,
    CASE WHEN v_referral_type = 'teacher' THEN 'teacher_signup' ELSE 'student_signup' END,
    'signup:' || v_referral_type || ':' || p_user_id::text
  )
  ON CONFLICT (event_key) DO NOTHING;

  IF v_referral_type = 'teacher' AND v_teacher_complete THEN
    INSERT INTO public.referral_events (
      ambassador_link_id,
      session_id,
      attribution_id,
      referred_user_id,
      event_type,
      event_key
    ) VALUES (
      v_link.id,
      v_session.id,
      v_attribution_id,
      p_user_id,
      'teacher_activated',
      'teacher_activated:' || p_user_id::text
    )
    ON CONFLICT (event_key) DO NOTHING;
  END IF;

  RETURN v_attribution_id;
END;
$$;

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
  v_student_payment_cost_reserve_cents integer := 0;
  v_student_net_contribution_cents integer := 0;
  v_teacher_net_contribution_total integer := 0;
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
    v_student_payment_cost_reserve_cents := public.ambassador_payment_cost_reserve_cents(
      v_payment.amount_cents,
      v_rule.payment_cost_reserve_bps,
      v_rule.payment_cost_reserve_fixed_cents
    );
    v_student_net_contribution_cents := public.ambassador_net_platform_contribution_cents(
      v_payment.amount_cents,
      v_payment.platform_fee_cents,
      v_rule.payment_cost_reserve_bps,
      v_rule.payment_cost_reserve_fixed_cents
    );
  END IF;

  IF FOUND AND v_student_net_contribution_cents > 0 THEN
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
          FLOOR((v_student_net_contribution_cents::numeric * v_rule.student_net_contribution_share_bps) / 10000)::integer,
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
              'gross_platform_fee_cents', v_payment.platform_fee_cents,
              'payment_cost_reserve_cents', v_student_payment_cost_reserve_cents,
              'payment_cost_reserve_bps', v_rule.payment_cost_reserve_bps,
              'payment_cost_reserve_fixed_cents', v_rule.payment_cost_reserve_fixed_cents,
              'net_platform_contribution_cents', v_student_net_contribution_cents,
              'reward_share_bps', v_rule.student_net_contribution_share_bps,
              'per_booking_cap_cents', v_rule.student_per_booking_cap_cents,
              'learner_lifetime_cap_cents', v_rule.student_total_cap_cents,
              'processor_cost_source', 'conservative_reserve_v1'
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

  SELECT COALESCE(sum(public.ambassador_net_platform_contribution_cents(
    bp.amount_cents,
    bp.platform_fee_cents,
    v_rule.payment_cost_reserve_bps,
    v_rule.payment_cost_reserve_fixed_cents
  )), 0)::integer
    INTO v_teacher_net_contribution_total
  FROM public.booking_payments bp
  JOIN public.bookings b ON b.id = bp.booking_id
  WHERE bp.teacher_id = NEW.teacher_id
    AND bp.payment_status = 'paid'
    AND bp.refunded_cents = 0
    AND bp.currency = v_rule.currency
    AND b.status = 'completed'
    AND b.completion_outcome = 'held';

  IF v_teacher_net_contribution_total >= v_rule.teacher_min_net_contribution_cents
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
        'eligible_net_contribution_cents_at_creation', v_teacher_net_contribution_total,
        'minimum_net_contribution_cents', v_rule.teacher_min_net_contribution_cents,
        'payment_cost_reserve_bps', v_rule.payment_cost_reserve_bps,
        'payment_cost_reserve_fixed_cents', v_rule.payment_cost_reserve_fixed_cents,
        'processor_cost_source', 'conservative_reserve_v1'
      )
    )
    ON CONFLICT (reward_key) DO UPDATE
      SET booking_id = EXCLUDED.booking_id,
          amount_cents = EXCLUDED.amount_cents,
          currency = EXCLUDED.currency,
          rule_version = EXCLUDED.rule_version,
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

  -- Re-evaluate each teacher reward using the exact historical rule version
  -- that created it. Do not use whichever rule is active at refund time.
  UPDATE public.ambassador_rewards ar
  SET status = CASE WHEN ar.status = 'paid' THEN 'reversed' ELSE 'void' END,
      voided_at = COALESCE(ar.voided_at, now()),
      metadata = COALESCE(ar.metadata, '{}'::jsonb) || jsonb_build_object(
        'status_reason', 'teacher_margin_below_threshold',
        'eligible_net_contribution_cents_after_adjustment', COALESCE((
          SELECT sum(public.ambassador_net_platform_contribution_cents(
            bp.amount_cents,
            bp.platform_fee_cents,
            r.payment_cost_reserve_bps,
            r.payment_cost_reserve_fixed_cents
          ))
          FROM public.booking_payments bp
          JOIN public.bookings b ON b.id = bp.booking_id
          WHERE bp.teacher_id = NEW.teacher_id
            AND bp.payment_status = 'paid'
            AND bp.refunded_cents = 0
            AND bp.currency = r.currency
            AND b.status = 'completed'
            AND b.completion_outcome = 'held'
        ), 0),
        'minimum_net_contribution_cents', r.teacher_min_net_contribution_cents,
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
      SELECT sum(public.ambassador_net_platform_contribution_cents(
        bp.amount_cents,
        bp.platform_fee_cents,
        r.payment_cost_reserve_bps,
        r.payment_cost_reserve_fixed_cents
      ))
      FROM public.booking_payments bp
      JOIN public.bookings b ON b.id = bp.booking_id
      WHERE bp.teacher_id = NEW.teacher_id
        AND bp.payment_status = 'paid'
        AND bp.refunded_cents = 0
        AND bp.currency = r.currency
        AND b.status = 'completed'
        AND b.completion_outcome = 'held'
    ), 0) < r.teacher_min_net_contribution_cents;

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

DROP VIEW IF EXISTS public.ambassador_reward_economics;

CREATE OR REPLACE VIEW public.ambassador_reward_economics
WITH (security_invoker = true)
AS
WITH active_rule AS (
  SELECT r.*
  FROM public.ambassador_reward_rules r
  WHERE r.active = true
    AND r.effective_at <= now()
  ORDER BY r.effective_at DESC
  LIMIT 1
), attribution_rollup AS (
  SELECT
    ra.ambassador_link_id,
    count(*) FILTER (WHERE ra.referral_type = 'student') AS referred_learners,
    count(*) FILTER (WHERE ra.referral_type = 'teacher') AS referred_teachers
  FROM public.referral_attributions ra
  GROUP BY ra.ambassador_link_id
), student_fee_rows AS (
  SELECT
    ra.ambassador_link_id,
    bp.booking_id,
    bp.platform_fee_cents AS gross_platform_fee_cents,
    public.ambassador_net_platform_contribution_cents(
      bp.amount_cents,
      bp.platform_fee_cents,
      r.payment_cost_reserve_bps,
      r.payment_cost_reserve_fixed_cents
    ) AS net_platform_contribution_cents
  FROM public.referral_attributions ra
  JOIN public.booking_payments bp ON bp.student_id = ra.referred_user_id
  JOIN public.bookings b ON b.id = bp.booking_id
  CROSS JOIN active_rule r
  WHERE ra.referral_type = 'student'
    AND bp.payment_status = 'paid'
    AND bp.refunded_cents = 0
    AND bp.currency = r.currency
    AND b.status = 'completed'
    AND b.completion_outcome = 'held'
), teacher_fee_rows AS (
  SELECT
    ra.ambassador_link_id,
    bp.booking_id,
    bp.platform_fee_cents AS gross_platform_fee_cents,
    public.ambassador_net_platform_contribution_cents(
      bp.amount_cents,
      bp.platform_fee_cents,
      r.payment_cost_reserve_bps,
      r.payment_cost_reserve_fixed_cents
    ) AS net_platform_contribution_cents
  FROM public.referral_attributions ra
  JOIN public.teachers referred_teacher ON referred_teacher.user_id = ra.referred_user_id
  JOIN public.booking_payments bp ON bp.teacher_id = referred_teacher.id
  JOIN public.bookings b ON b.id = bp.booking_id
  CROSS JOIN active_rule r
  WHERE ra.referral_type = 'teacher'
    AND bp.payment_status = 'paid'
    AND bp.refunded_cents = 0
    AND bp.currency = r.currency
    AND b.status = 'completed'
    AND b.completion_outcome = 'held'
), student_fee_rollup AS (
  SELECT
    ambassador_link_id,
    count(*)::bigint AS referred_student_eligible_bookings,
    COALESCE(sum(gross_platform_fee_cents), 0)::bigint AS student_platform_fee_cents,
    COALESCE(sum(net_platform_contribution_cents), 0)::bigint AS student_net_platform_contribution_cents
  FROM student_fee_rows
  GROUP BY ambassador_link_id
), teacher_fee_rollup AS (
  SELECT
    ambassador_link_id,
    count(*)::bigint AS referred_teacher_eligible_bookings,
    COALESCE(sum(gross_platform_fee_cents), 0)::bigint AS teacher_platform_fee_cents,
    COALESCE(sum(net_platform_contribution_cents), 0)::bigint AS teacher_net_platform_contribution_cents
  FROM teacher_fee_rows
  GROUP BY ambassador_link_id
), unique_fee_rollup AS (
  SELECT
    x.ambassador_link_id,
    count(*)::bigint AS unique_eligible_completed_bookings,
    COALESCE(sum(x.gross_platform_fee_cents), 0)::bigint AS unique_realized_platform_fee_cents,
    COALESCE(sum(x.net_platform_contribution_cents), 0)::bigint AS unique_realized_net_platform_contribution_cents
  FROM (
    SELECT ambassador_link_id, booking_id, gross_platform_fee_cents, net_platform_contribution_cents FROM student_fee_rows
    UNION
    SELECT ambassador_link_id, booking_id, gross_platform_fee_cents, net_platform_contribution_cents FROM teacher_fee_rows
  ) x
  GROUP BY x.ambassador_link_id
), reward_rollup AS (
  SELECT
    ar.ambassador_link_id,
    COALESCE(sum(ar.amount_cents) FILTER (
      WHERE ar.status IN ('pending', 'earned')
    ), 0)::bigint AS rewards_outstanding_cents,
    COALESCE(sum(ar.amount_cents) FILTER (
      WHERE ar.status = 'paid'
    ), 0)::bigint AS rewards_paid_cents,
    COALESCE(sum(ar.amount_cents) FILTER (
      WHERE ar.status = 'reversed'
    ), 0)::bigint AS rewards_reversed_unrecovered_cents,
    COALESCE(sum(ar.amount_cents) FILTER (
      WHERE ar.reward_type = 'student_completed_booking_share'
        AND ar.status IN ('pending', 'earned', 'paid', 'reversed')
    ), 0)::bigint AS student_rewards_active_cents,
    COALESCE(sum(ar.amount_cents) FILTER (
      WHERE ar.reward_type = 'teacher_activation_margin_bonus'
        AND ar.status IN ('pending', 'earned', 'paid', 'reversed')
    ), 0)::bigint AS teacher_rewards_active_cents
  FROM public.ambassador_rewards ar
  GROUP BY ar.ambassador_link_id
)
SELECT
  al.id AS ambassador_link_id,
  al.code,
  al.teacher_id,
  t.user_id AS ambassador_user_id,
  COALESCE(aroll.referred_learners, 0) AS referred_learners,
  COALESCE(aroll.referred_teachers, 0) AS referred_teachers,
  COALESCE(sfr.referred_student_eligible_bookings, 0) AS referred_student_eligible_bookings,
  COALESCE(tfr.referred_teacher_eligible_bookings, 0) AS referred_teacher_eligible_bookings,
  COALESCE(ufr.unique_eligible_completed_bookings, 0) AS unique_eligible_completed_bookings,
  COALESCE(sfr.student_platform_fee_cents, 0) AS referred_student_platform_fee_cents,
  COALESCE(tfr.teacher_platform_fee_cents, 0) AS referred_teacher_platform_fee_cents,
  COALESCE(ufr.unique_realized_platform_fee_cents, 0) AS unique_realized_platform_fee_cents,
  COALESCE(sfr.student_net_platform_contribution_cents, 0) AS referred_student_net_platform_contribution_cents,
  COALESCE(tfr.teacher_net_platform_contribution_cents, 0) AS referred_teacher_net_platform_contribution_cents,
  COALESCE(ufr.unique_realized_net_platform_contribution_cents, 0) AS unique_realized_net_platform_contribution_cents,
  COALESCE(rr.student_rewards_active_cents, 0) AS student_rewards_active_cents,
  COALESCE(rr.teacher_rewards_active_cents, 0) AS teacher_rewards_active_cents,
  COALESCE(rr.rewards_outstanding_cents, 0) AS rewards_outstanding_cents,
  COALESCE(rr.rewards_outstanding_cents, 0) AS rewards_due_cents,
  COALESCE(rr.rewards_paid_cents, 0) AS rewards_paid_cents,
  COALESCE(rr.rewards_reversed_unrecovered_cents, 0) AS rewards_reversed_unrecovered_cents,
  COALESCE(rr.rewards_reversed_unrecovered_cents, 0) AS rewards_reversed_cents,
  (
    COALESCE(rr.rewards_outstanding_cents, 0)
    + COALESCE(rr.rewards_paid_cents, 0)
    + COALESCE(rr.rewards_reversed_unrecovered_cents, 0)
  ) AS ambassador_total_economic_cost_cents,
  (
    COALESCE(ufr.unique_realized_net_platform_contribution_cents, 0)
    - COALESCE(rr.rewards_outstanding_cents, 0)
    - COALESCE(rr.rewards_paid_cents, 0)
    - COALESCE(rr.rewards_reversed_unrecovered_cents, 0)
  ) AS net_contribution_after_ambassador_cost_cents,
  (
    COALESCE(ufr.unique_realized_net_platform_contribution_cents, 0)
    - COALESCE(rr.rewards_outstanding_cents, 0)
    - COALESCE(rr.rewards_paid_cents, 0)
    - COALESCE(rr.rewards_reversed_unrecovered_cents, 0)
  ) AS realized_fee_after_active_rewards_cents
FROM public.ambassador_links al
JOIN public.teachers t ON t.id = al.teacher_id
LEFT JOIN attribution_rollup aroll ON aroll.ambassador_link_id = al.id
LEFT JOIN student_fee_rollup sfr ON sfr.ambassador_link_id = al.id
LEFT JOIN teacher_fee_rollup tfr ON tfr.ambassador_link_id = al.id
LEFT JOIN unique_fee_rollup ufr ON ufr.ambassador_link_id = al.id
LEFT JOIN reward_rollup rr ON rr.ambassador_link_id = al.id;

ALTER TABLE public.ambassador_links
  DROP CONSTRAINT IF EXISTS ambassador_links_destination_check;

UPDATE public.ambassador_links
SET destination_path = '/'
WHERE NOT (
  destination_path LIKE '/%'
  AND destination_path NOT LIKE '//%'
  AND position(chr(92) in destination_path) = 0
  AND lower(destination_path) NOT LIKE '%5c%'
);

ALTER TABLE public.ambassador_links
  ADD CONSTRAINT ambassador_links_destination_check CHECK (
    destination_path LIKE '/%'
    AND destination_path NOT LIKE '//%'
    AND position(chr(92) in destination_path) = 0
    AND lower(destination_path) NOT LIKE '%5c%'
  );

REVOKE ALL ON FUNCTION public.ambassador_payment_cost_reserve_cents(integer, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ambassador_net_platform_contribution_cents(integer, integer, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_ambassador_referral(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_ambassador_rewards_v1_on_booking_completion() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reconcile_ambassador_rewards_after_payment_adjustment() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.ambassador_reward_economics FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.ambassador_payment_cost_reserve_cents(integer, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.ambassador_net_platform_contribution_cents(integer, integer, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_ambassador_referral(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_ambassador_rewards_v1_on_booking_completion() TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_ambassador_rewards_after_payment_adjustment() TO service_role;
GRANT SELECT ON public.ambassador_reward_economics TO service_role;
