-- Ambassador referral tracking foundation.
--
-- Design goals:
-- - first-touch attribution using a short /r/[code] link and opaque session cookie
-- - durable user attribution separate from analytics events
-- - rewards kept in a dedicated ledger, not mixed into click/conversion events
-- - server/service-role writes only; no ambassador-facing dashboard in this MVP
-- - reuse Pratiqo's existing booking/payment lifecycle instead of duplicating Stripe logic

CREATE TABLE IF NOT EXISTS public.ambassador_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id text NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  destination_path text NOT NULL DEFAULT '/',
  campaign text,
  attribution_window_days smallint NOT NULL DEFAULT 30,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ambassador_links_code_format_check CHECK (
    code = lower(code)
    AND code ~ '^[a-z0-9][a-z0-9-]{2,63}$'
  ),
  CONSTRAINT ambassador_links_destination_check CHECK (
    destination_path LIKE '/%'
    AND destination_path NOT LIKE '//%'
  ),
  CONSTRAINT ambassador_links_window_check CHECK (
    attribution_window_days BETWEEN 1 AND 180
  )
);

CREATE INDEX IF NOT EXISTS idx_ambassador_links_teacher
  ON public.ambassador_links (teacher_id, active, created_at DESC);

CREATE TABLE IF NOT EXISTS public.referral_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambassador_link_id uuid NOT NULL REFERENCES public.ambassador_links(id) ON DELETE CASCADE,
  first_touch_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  attributed_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  attributed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT referral_sessions_expiry_check CHECK (expires_at > first_touch_at),
  CONSTRAINT referral_sessions_attribution_pair_check CHECK (
    (attributed_user_id IS NULL AND attributed_at IS NULL)
    OR (attributed_user_id IS NOT NULL AND attributed_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_referral_sessions_link
  ON public.referral_sessions (ambassador_link_id, first_touch_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_sessions_expiry
  ON public.referral_sessions (expires_at)
  WHERE attributed_user_id IS NULL;

CREATE TABLE IF NOT EXISTS public.referral_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.referral_sessions(id) ON DELETE RESTRICT,
  ambassador_link_id uuid NOT NULL REFERENCES public.ambassador_links(id) ON DELETE RESTRICT,
  ambassador_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  referred_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_type text NOT NULL,
  first_touch_at timestamptz NOT NULL,
  attributed_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,

  CONSTRAINT referral_attributions_type_check CHECK (referral_type IN ('student', 'teacher')),
  CONSTRAINT referral_attributions_not_self_check CHECK (ambassador_user_id <> referred_user_id),
  CONSTRAINT referral_attributions_one_per_session_type UNIQUE (session_id, referral_type),
  CONSTRAINT referral_attributions_one_per_user_type UNIQUE (referred_user_id, referral_type)
);

CREATE INDEX IF NOT EXISTS idx_referral_attributions_ambassador
  ON public.referral_attributions (ambassador_user_id, attributed_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_attributions_link
  ON public.referral_attributions (ambassador_link_id, attributed_at DESC);

CREATE TABLE IF NOT EXISTS public.referral_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambassador_link_id uuid NOT NULL REFERENCES public.ambassador_links(id) ON DELETE RESTRICT,
  session_id uuid REFERENCES public.referral_sessions(id) ON DELETE SET NULL,
  attribution_id uuid REFERENCES public.referral_attributions(id) ON DELETE SET NULL,
  referred_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  event_key text NOT NULL UNIQUE,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT referral_events_type_check CHECK (event_type IN (
    'click',
    'student_signup',
    'teacher_signup',
    'teacher_activated',
    'student_booking_paid',
    'student_booking_completed',
    'student_booking_adjusted',
    'teacher_first_booking_completed'
  ))
);

CREATE INDEX IF NOT EXISTS idx_referral_events_link_type
  ON public.referral_events (ambassador_link_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_events_user
  ON public.referral_events (referred_user_id, created_at DESC)
  WHERE referred_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_referral_events_booking
  ON public.referral_events (booking_id)
  WHERE booking_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.ambassador_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambassador_link_id uuid NOT NULL REFERENCES public.ambassador_links(id) ON DELETE RESTRICT,
  attribution_id uuid REFERENCES public.referral_attributions(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  source_event_id uuid REFERENCES public.referral_events(id) ON DELETE SET NULL,
  reward_key text NOT NULL UNIQUE,
  reward_type text NOT NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'cad',
  rule_version text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  earned_at timestamptz,
  paid_at timestamptz,
  voided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ambassador_rewards_amount_check CHECK (amount_cents >= 0),
  CONSTRAINT ambassador_rewards_currency_check CHECK (
    currency = lower(currency) AND length(currency) = 3
  ),
  CONSTRAINT ambassador_rewards_status_check CHECK (
    status IN ('pending', 'earned', 'paid', 'void', 'reversed')
  ),
  CONSTRAINT ambassador_rewards_type_check CHECK (
    reward_type IN ('student_completed_booking_share', 'teacher_activation_margin_bonus')
  )
);

CREATE INDEX IF NOT EXISTS idx_ambassador_rewards_link_status
  ON public.ambassador_rewards (ambassador_link_id, status, created_at DESC);

COMMENT ON TABLE public.ambassador_links IS
  'Admin-managed short links for Pratiqo ambassadors. One teacher may have multiple campaign links.';
COMMENT ON TABLE public.referral_sessions IS
  'Anonymous first-touch sessions referenced by an opaque HttpOnly cookie before signup.';
COMMENT ON TABLE public.referral_attributions IS
  'Durable, single-owner acquisition attribution once a referred visitor becomes a Pratiqo user.';
COMMENT ON TABLE public.referral_events IS
  'Immutable-ish analytics/business event journal. Financial rewards are intentionally stored separately.';
COMMENT ON TABLE public.ambassador_rewards IS
  'Manual-first reward ledger. Reward formulas are versioned and are not hard-coded into referral events.';

-- Claim a valid anonymous referral session after a brand-new profile exists.
-- The function derives the referred role from profiles and enforces first-touch,
-- one-user/one-attribution and self-referral protections atomically at the DB layer.
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
  WHERE l.id = v_session.ambassador_link_id
    AND l.active = true;

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

-- Record teacher activation regardless of which onboarding route flips the flag.
CREATE OR REPLACE FUNCTION public.record_ambassador_teacher_activation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attr public.referral_attributions%ROWTYPE;
BEGIN
  IF NEW.teacher_onboarding_complete IS DISTINCT FROM true THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.teacher_onboarding_complete IS NOT DISTINCT FROM true THEN
    RETURN NEW;
  END IF;

  SELECT ra.*
    INTO v_attr
  FROM public.referral_attributions ra
  WHERE ra.referred_user_id = NEW.id
    AND ra.referral_type = 'teacher';

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.referral_events (
    ambassador_link_id,
    session_id,
    attribution_id,
    referred_user_id,
    event_type,
    event_key
  ) VALUES (
    v_attr.ambassador_link_id,
    v_attr.session_id,
    v_attr.id,
    NEW.id,
    'teacher_activated',
    'teacher_activated:' || NEW.id::text
  )
  ON CONFLICT (event_key) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ambassador_teacher_activation ON public.profiles;
CREATE TRIGGER trg_ambassador_teacher_activation
AFTER INSERT OR UPDATE OF teacher_onboarding_complete ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.record_ambassador_teacher_activation();

-- Reuse the durable payment ledger as the source for paid/refunded/disputed booking events.
CREATE OR REPLACE FUNCTION public.record_ambassador_booking_payment_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attr public.referral_attributions%ROWTYPE;
  v_event_key text;
BEGIN
  SELECT ra.*
    INTO v_attr
  FROM public.referral_attributions ra
  WHERE ra.referred_user_id = NEW.student_id
    AND ra.referral_type = 'student';

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF NEW.payment_status = 'paid'
     AND (TG_OP = 'INSERT' OR OLD.payment_status IS DISTINCT FROM 'paid') THEN
    INSERT INTO public.referral_events (
      ambassador_link_id,
      session_id,
      attribution_id,
      referred_user_id,
      booking_id,
      event_type,
      event_key,
      metadata
    ) VALUES (
      v_attr.ambassador_link_id,
      v_attr.session_id,
      v_attr.id,
      NEW.student_id,
      NEW.booking_id,
      'student_booking_paid',
      'student_booking_paid:' || NEW.booking_id::text,
      jsonb_build_object(
        'amount_cents', NEW.amount_cents,
        'platform_fee_cents', NEW.platform_fee_cents,
        'currency', NEW.currency
      )
    )
    ON CONFLICT (event_key) DO NOTHING;
  END IF;

  IF NEW.payment_status IN ('refunded', 'partially_refunded', 'disputed')
     AND (
       TG_OP = 'INSERT'
       OR OLD.payment_status IS DISTINCT FROM NEW.payment_status
       OR OLD.refunded_cents IS DISTINCT FROM NEW.refunded_cents
     ) THEN
    v_event_key := 'student_booking_adjusted:' || NEW.booking_id::text || ':' || NEW.payment_status || ':' || NEW.refunded_cents::text;

    INSERT INTO public.referral_events (
      ambassador_link_id,
      session_id,
      attribution_id,
      referred_user_id,
      booking_id,
      event_type,
      event_key,
      metadata
    ) VALUES (
      v_attr.ambassador_link_id,
      v_attr.session_id,
      v_attr.id,
      NEW.student_id,
      NEW.booking_id,
      'student_booking_adjusted',
      v_event_key,
      jsonb_build_object(
        'payment_status', NEW.payment_status,
        'refund_status', NEW.refund_status,
        'amount_cents', NEW.amount_cents,
        'refunded_cents', NEW.refunded_cents,
        'platform_fee_cents', NEW.platform_fee_cents,
        'currency', NEW.currency
      )
    )
    ON CONFLICT (event_key) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ambassador_booking_payment ON public.booking_payments;
CREATE TRIGGER trg_ambassador_booking_payment
AFTER INSERT OR UPDATE OF payment_status, refund_status, refunded_cents ON public.booking_payments
FOR EACH ROW
EXECUTE FUNCTION public.record_ambassador_booking_payment_event();

-- Completion is the economic-quality signal used by the ambassador program.
CREATE OR REPLACE FUNCTION public.record_ambassador_booking_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_attr public.referral_attributions%ROWTYPE;
  v_teacher_attr public.referral_attributions%ROWTYPE;
  v_teacher_user_id uuid;
  v_payment public.booking_payments%ROWTYPE;
  v_has_prior_completed boolean;
BEGIN
  IF NEW.status IS DISTINCT FROM 'completed'
     OR OLD.status IS NOT DISTINCT FROM 'completed'
     OR NEW.completion_outcome IS DISTINCT FROM 'held' THEN
    RETURN NEW;
  END IF;

  SELECT bp.*
    INTO v_payment
  FROM public.booking_payments bp
  WHERE bp.booking_id = NEW.id;

  SELECT ra.*
    INTO v_student_attr
  FROM public.referral_attributions ra
  WHERE ra.referred_user_id = NEW.student_id
    AND ra.referral_type = 'student';

  IF FOUND THEN
    INSERT INTO public.referral_events (
      ambassador_link_id,
      session_id,
      attribution_id,
      referred_user_id,
      booking_id,
      event_type,
      event_key,
      metadata
    ) VALUES (
      v_student_attr.ambassador_link_id,
      v_student_attr.session_id,
      v_student_attr.id,
      NEW.student_id,
      NEW.id,
      'student_booking_completed',
      'student_booking_completed:' || NEW.id::text,
      jsonb_build_object(
        'amount_cents', COALESCE(v_payment.amount_cents, 0),
        'platform_fee_cents', COALESCE(v_payment.platform_fee_cents, 0),
        'currency', COALESCE(v_payment.currency, 'cad')
      )
    )
    ON CONFLICT (event_key) DO NOTHING;
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

  SELECT EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.teacher_id = NEW.teacher_id
      AND b.id <> NEW.id
      AND b.status = 'completed'
      AND b.completion_outcome = 'held'
  ) INTO v_has_prior_completed;

  IF NOT v_has_prior_completed THEN
    INSERT INTO public.referral_events (
      ambassador_link_id,
      session_id,
      attribution_id,
      referred_user_id,
      booking_id,
      event_type,
      event_key,
      metadata
    ) VALUES (
      v_teacher_attr.ambassador_link_id,
      v_teacher_attr.session_id,
      v_teacher_attr.id,
      v_teacher_user_id,
      NEW.id,
      'teacher_first_booking_completed',
      'teacher_first_booking_completed:' || v_teacher_user_id::text,
      jsonb_build_object('teacher_id', NEW.teacher_id)
    )
    ON CONFLICT (event_key) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ambassador_booking_completion ON public.bookings;
CREATE TRIGGER trg_ambassador_booking_completion
AFTER UPDATE OF status, completion_outcome ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.record_ambassador_booking_completion();

-- Admin/service-role reporting only. Keep event and reward aggregation separate to avoid cartesian inflation.
CREATE OR REPLACE VIEW public.ambassador_performance
WITH (security_invoker = true)
AS
WITH event_rollup AS (
  SELECT
    re.ambassador_link_id,
    count(*) FILTER (WHERE re.event_type = 'click') AS clicks,
    count(*) FILTER (WHERE re.event_type = 'student_signup') AS student_signups,
    count(*) FILTER (WHERE re.event_type = 'teacher_signup') AS teacher_signups,
    count(*) FILTER (WHERE re.event_type = 'teacher_activated') AS teachers_activated,
    count(*) FILTER (WHERE re.event_type = 'student_booking_paid') AS student_bookings_paid,
    count(*) FILTER (WHERE re.event_type = 'student_booking_completed') AS student_bookings_completed,
    count(*) FILTER (WHERE re.event_type = 'teacher_first_booking_completed') AS teachers_first_booking_completed,
    COALESCE(sum((re.metadata->>'amount_cents')::integer)
      FILTER (WHERE re.event_type = 'student_booking_completed'), 0) AS completed_gmv_cents,
    COALESCE(sum((re.metadata->>'platform_fee_cents')::integer)
      FILTER (WHERE re.event_type = 'student_booking_completed'), 0) AS completed_platform_fee_cents
  FROM public.referral_events re
  GROUP BY re.ambassador_link_id
), reward_rollup AS (
  SELECT
    ar.ambassador_link_id,
    COALESCE(sum(ar.amount_cents) FILTER (WHERE ar.status IN ('pending', 'earned')), 0) AS rewards_due_cents,
    COALESCE(sum(ar.amount_cents) FILTER (WHERE ar.status = 'paid'), 0) AS rewards_paid_cents
  FROM public.ambassador_rewards ar
  GROUP BY ar.ambassador_link_id
)
SELECT
  al.id AS ambassador_link_id,
  al.code,
  al.teacher_id,
  t.user_id AS ambassador_user_id,
  al.campaign,
  al.active,
  COALESCE(er.clicks, 0) AS clicks,
  COALESCE(er.student_signups, 0) AS student_signups,
  COALESCE(er.teacher_signups, 0) AS teacher_signups,
  COALESCE(er.teachers_activated, 0) AS teachers_activated,
  COALESCE(er.student_bookings_paid, 0) AS student_bookings_paid,
  COALESCE(er.student_bookings_completed, 0) AS student_bookings_completed,
  COALESCE(er.teachers_first_booking_completed, 0) AS teachers_first_booking_completed,
  COALESCE(er.completed_gmv_cents, 0) AS completed_gmv_cents,
  COALESCE(er.completed_platform_fee_cents, 0) AS completed_platform_fee_cents,
  COALESCE(rr.rewards_due_cents, 0) AS rewards_due_cents,
  COALESCE(rr.rewards_paid_cents, 0) AS rewards_paid_cents
FROM public.ambassador_links al
JOIN public.teachers t ON t.id = al.teacher_id
LEFT JOIN event_rollup er ON er.ambassador_link_id = al.id
LEFT JOIN reward_rollup rr ON rr.ambassador_link_id = al.id;

ALTER TABLE public.ambassador_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambassador_rewards ENABLE ROW LEVEL SECURITY;

-- No client policies in V1: all writes and detailed reads are server/admin only.
REVOKE ALL ON public.ambassador_links FROM anon, authenticated;
REVOKE ALL ON public.referral_sessions FROM anon, authenticated;
REVOKE ALL ON public.referral_attributions FROM anon, authenticated;
REVOKE ALL ON public.referral_events FROM anon, authenticated;
REVOKE ALL ON public.ambassador_rewards FROM anon, authenticated;
REVOKE ALL ON public.ambassador_performance FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_ambassador_referral(uuid, uuid) FROM PUBLIC, anon, authenticated;

GRANT ALL ON public.ambassador_links TO service_role;
GRANT ALL ON public.referral_sessions TO service_role;
GRANT ALL ON public.referral_attributions TO service_role;
GRANT ALL ON public.referral_events TO service_role;
GRANT ALL ON public.ambassador_rewards TO service_role;
GRANT SELECT ON public.ambassador_performance TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_ambassador_referral(uuid, uuid) TO service_role;
