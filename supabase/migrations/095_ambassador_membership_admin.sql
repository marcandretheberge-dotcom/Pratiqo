-- Ambassador membership admin layer.
--
-- Migration 090-094 created attribution, rewards and economics. This
-- forward migration adds the admin-managed membership object that decides
-- which existing teachers may issue new ambassador sessions.
--
-- Important:
-- - Do not rewrite historical attribution/reward migrations.
-- - Paused/revoked memberships block new /r/[code] tracking.
-- - Historical sessions, attributions, rewards and accounting stay auditable.
-- - All writes are server/admin-only through service-role RPCs.

CREATE TABLE IF NOT EXISTS public.ambassadors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id text NOT NULL UNIQUE REFERENCES public.teachers(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  selected_at timestamptz NOT NULL DEFAULT now(),
  selected_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  activated_at timestamptz,
  paused_at timestamptz,
  paused_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  internal_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ambassadors_status_check CHECK (status IN ('invited', 'active', 'paused', 'revoked'))
);

COMMENT ON TABLE public.ambassadors IS
  'Admin-managed ambassador memberships. Separate from Founding Teacher status and from referral/reward economics.';
COMMENT ON COLUMN public.ambassadors.teacher_id IS
  'Existing teacher profile promoted into the ambassador program; teachers are never recreated for ambassador activation.';
COMMENT ON COLUMN public.ambassadors.status IS
  'Program membership status. Only active memberships may issue new referral sessions.';

CREATE INDEX IF NOT EXISTS idx_ambassadors_status
  ON public.ambassadors (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ambassadors_selected_by
  ON public.ambassadors (selected_by, selected_at DESC)
  WHERE selected_by IS NOT NULL;

CREATE OR REPLACE FUNCTION public.ambassadors_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ambassadors_set_updated_at ON public.ambassadors;
CREATE TRIGGER trg_ambassadors_set_updated_at
  BEFORE UPDATE ON public.ambassadors
  FOR EACH ROW EXECUTE FUNCTION public.ambassadors_set_updated_at();

ALTER TABLE public.ambassador_links
  ADD COLUMN IF NOT EXISTS ambassador_id uuid REFERENCES public.ambassadors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ambassador_links_ambassador
  ON public.ambassador_links (ambassador_id, active, created_at DESC)
  WHERE ambassador_id IS NOT NULL;

-- Backfill memberships for existing PR #303 links. Existing links remain
-- valid and are attached to the new membership object.
INSERT INTO public.ambassadors (
  teacher_id,
  status,
  selected_at,
  activated_at,
  internal_note,
  created_at,
  updated_at
)
SELECT
  al.teacher_id,
  'active',
  min(al.created_at),
  min(al.created_at),
  'Backfilled from existing ambassador links by migration 095.',
  min(al.created_at),
  now()
FROM public.ambassador_links al
GROUP BY al.teacher_id
ON CONFLICT (teacher_id) DO NOTHING;

UPDATE public.ambassador_links al
SET ambassador_id = a.id
FROM public.ambassadors a
WHERE al.teacher_id = a.teacher_id
  AND al.ambassador_id IS NULL;

CREATE OR REPLACE FUNCTION public.ambassador_admin_slugify(p_value text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v text;
BEGIN
  v := lower(coalesce(p_value, ''));
  v := replace(v, 'à', 'a');
  v := replace(v, 'á', 'a');
  v := replace(v, 'â', 'a');
  v := replace(v, 'ä', 'a');
  v := replace(v, 'ã', 'a');
  v := replace(v, 'å', 'a');
  v := replace(v, 'ç', 'c');
  v := replace(v, 'è', 'e');
  v := replace(v, 'é', 'e');
  v := replace(v, 'ê', 'e');
  v := replace(v, 'ë', 'e');
  v := replace(v, 'ì', 'i');
  v := replace(v, 'í', 'i');
  v := replace(v, 'î', 'i');
  v := replace(v, 'ï', 'i');
  v := replace(v, 'ñ', 'n');
  v := replace(v, 'ò', 'o');
  v := replace(v, 'ó', 'o');
  v := replace(v, 'ô', 'o');
  v := replace(v, 'ö', 'o');
  v := replace(v, 'õ', 'o');
  v := replace(v, 'ù', 'u');
  v := replace(v, 'ú', 'u');
  v := replace(v, 'û', 'u');
  v := replace(v, 'ü', 'u');
  v := replace(v, 'ý', 'y');
  v := replace(v, 'ÿ', 'y');
  v := regexp_replace(v, '[^a-z0-9]+', '-', 'g');
  v := trim(both '-' from v);
  RETURN nullif(v, '');
END;
$$;

CREATE OR REPLACE FUNCTION public.ambassador_admin_is_safe_destination(p_path text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT p_path IS NOT NULL
    AND p_path LIKE '/%'
    AND p_path NOT LIKE '//%'
    AND position(chr(92) in p_path) = 0
    AND lower(p_path) NOT LIKE '%5c%';
$$;

CREATE OR REPLACE FUNCTION public.ambassador_admin_unique_code(
  p_base text,
  p_teacher_id text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base text;
  v_candidate text;
  v_suffix integer := 2;
BEGIN
  v_base := public.ambassador_admin_slugify(p_base);

  IF v_base IS NULL THEN
    v_base := public.ambassador_admin_slugify('ambassador-' || coalesce(p_teacher_id, 'teacher'));
  END IF;

  IF length(v_base) < 3 THEN
    v_base := v_base || '-ambassador';
  END IF;

  v_base := left(v_base, 56);
  v_base := trim(both '-' from v_base);
  v_candidate := v_base;

  WHILE EXISTS (SELECT 1 FROM public.ambassador_links WHERE code = v_candidate) LOOP
    v_candidate := left(v_base, 56) || '-' || v_suffix::text;
    v_suffix := v_suffix + 1;

    IF v_suffix > 500 THEN
      RAISE EXCEPTION 'AMBASSADOR_CODE_UNAVAILABLE';
    END IF;
  END LOOP;

  RETURN v_candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_activate_ambassador(
  p_teacher_id text,
  p_preferred_code text DEFAULT NULL,
  p_internal_note text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_actor_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher record;
  v_ambassador public.ambassadors%ROWTYPE;
  v_link public.ambassador_links%ROWTYPE;
  v_code text;
  v_note text;
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'ADMIN_ACTOR_REQUIRED';
  END IF;

  IF p_teacher_id IS NULL OR btrim(p_teacher_id) = '' THEN
    RAISE EXCEPTION 'AMBASSADOR_TEACHER_REQUIRED';
  END IF;

  SELECT t.id, t.user_id, t.name, p.role, p.email
    INTO v_teacher
  FROM public.teachers t
  LEFT JOIN public.profiles p ON p.id = t.user_id
  WHERE t.id = p_teacher_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'AMBASSADOR_TEACHER_NOT_FOUND';
  END IF;

  IF v_teacher.user_id IS NULL OR v_teacher.role IS DISTINCT FROM 'teacher' THEN
    RAISE EXCEPTION 'AMBASSADOR_REQUIRES_EXISTING_TEACHER_ACCOUNT';
  END IF;

  v_note := nullif(btrim(coalesce(p_internal_note, '')), '');

  INSERT INTO public.ambassadors (
    teacher_id,
    status,
    selected_by,
    selected_at,
    activated_at,
    internal_note
  )
  VALUES (
    v_teacher.id,
    'active',
    p_actor_id,
    now(),
    now(),
    v_note
  )
  ON CONFLICT (teacher_id) DO UPDATE
  SET
    status = 'active',
    activated_at = now(),
    selected_by = coalesce(public.ambassadors.selected_by, EXCLUDED.selected_by),
    internal_note = coalesce(v_note, public.ambassadors.internal_note)
  RETURNING * INTO v_ambassador;

  SELECT al.*
    INTO v_link
  FROM public.ambassador_links al
  WHERE al.ambassador_id = v_ambassador.id
    AND al.active = true
  ORDER BY al.created_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    v_code := public.ambassador_admin_unique_code(
      coalesce(p_preferred_code, v_teacher.name, v_teacher.id),
      v_teacher.id
    );

    INSERT INTO public.ambassador_links (
      ambassador_id,
      teacher_id,
      code,
      destination_path,
      campaign,
      active
    )
    VALUES (
      v_ambassador.id,
      v_teacher.id,
      v_code,
      '/trouver-un-prof',
      'admin-created',
      true
    )
    RETURNING * INTO v_link;
  END IF;

  UPDATE public.ambassador_links
  SET ambassador_id = v_ambassador.id
  WHERE teacher_id = v_ambassador.teacher_id
    AND ambassador_id IS NULL;

  INSERT INTO public.admin_audit_log (
    actor_profile_id,
    action,
    target_type,
    target_id,
    metadata
  )
  VALUES (
    p_actor_id,
    'ambassador.activated',
    'ambassador',
    v_ambassador.id,
    jsonb_build_object(
      'teacher_id', v_teacher.id,
      'teacher_user_id', v_teacher.user_id,
      'primary_link_id', v_link.id,
      'primary_code', v_link.code,
      'actor_email', p_actor_email
    )
  );

  RETURN jsonb_build_object(
    'ambassador', to_jsonb(v_ambassador),
    'primary_link', to_jsonb(v_link)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_ambassador_status(
  p_ambassador_id uuid,
  p_status text,
  p_internal_note text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_actor_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before public.ambassadors%ROWTYPE;
  v_after public.ambassadors%ROWTYPE;
  v_action text;
  v_note text;
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'ADMIN_ACTOR_REQUIRED';
  END IF;

  IF p_ambassador_id IS NULL THEN
    RAISE EXCEPTION 'AMBASSADOR_ID_REQUIRED';
  END IF;

  IF p_status NOT IN ('active', 'paused', 'revoked') THEN
    RAISE EXCEPTION 'AMBASSADOR_STATUS_INVALID';
  END IF;

  SELECT *
    INTO v_before
  FROM public.ambassadors
  WHERE id = p_ambassador_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'AMBASSADOR_NOT_FOUND';
  END IF;

  v_note := nullif(btrim(coalesce(p_internal_note, '')), '');

  UPDATE public.ambassadors
  SET
    status = p_status,
    activated_at = CASE WHEN p_status = 'active' THEN now() ELSE activated_at END,
    paused_at = CASE WHEN p_status = 'paused' THEN now() ELSE paused_at END,
    paused_by = CASE WHEN p_status = 'paused' THEN p_actor_id ELSE paused_by END,
    revoked_at = CASE WHEN p_status = 'revoked' THEN now() ELSE revoked_at END,
    revoked_by = CASE WHEN p_status = 'revoked' THEN p_actor_id ELSE revoked_by END,
    internal_note = coalesce(v_note, internal_note)
  WHERE id = p_ambassador_id
  RETURNING * INTO v_after;

  v_action := CASE
    WHEN p_status = 'active' AND v_before.status = 'paused' THEN 'ambassador.reactivated'
    WHEN p_status = 'active' THEN 'ambassador.activated'
    WHEN p_status = 'paused' THEN 'ambassador.paused'
    ELSE 'ambassador.revoked'
  END;

  INSERT INTO public.admin_audit_log (
    actor_profile_id,
    action,
    target_type,
    target_id,
    metadata
  )
  VALUES (
    p_actor_id,
    v_action,
    'ambassador',
    v_after.id,
    jsonb_build_object(
      'teacher_id', v_after.teacher_id,
      'previous_status', v_before.status,
      'new_status', v_after.status,
      'actor_email', p_actor_email
    )
  );

  RETURN to_jsonb(v_after);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_ambassador_link(
  p_ambassador_id uuid,
  p_preferred_code text,
  p_destination_path text DEFAULT '/trouver-un-prof',
  p_campaign text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_actor_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ambassador public.ambassadors%ROWTYPE;
  v_link public.ambassador_links%ROWTYPE;
  v_code text;
  v_destination text;
  v_campaign text;
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'ADMIN_ACTOR_REQUIRED';
  END IF;

  SELECT *
    INTO v_ambassador
  FROM public.ambassadors
  WHERE id = p_ambassador_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'AMBASSADOR_NOT_FOUND';
  END IF;

  IF v_ambassador.status = 'revoked' THEN
    RAISE EXCEPTION 'AMBASSADOR_REVOKED';
  END IF;

  v_destination := coalesce(nullif(btrim(coalesce(p_destination_path, '')), ''), '/trouver-un-prof');
  IF NOT public.ambassador_admin_is_safe_destination(v_destination) THEN
    RAISE EXCEPTION 'AMBASSADOR_DESTINATION_INVALID';
  END IF;

  v_code := public.ambassador_admin_unique_code(
    coalesce(p_preferred_code, 'ambassador-' || v_ambassador.teacher_id),
    v_ambassador.teacher_id
  );
  v_campaign := nullif(btrim(coalesce(p_campaign, '')), '');

  INSERT INTO public.ambassador_links (
    ambassador_id,
    teacher_id,
    code,
    destination_path,
    campaign,
    active
  )
  VALUES (
    v_ambassador.id,
    v_ambassador.teacher_id,
    v_code,
    v_destination,
    v_campaign,
    v_ambassador.status = 'active'
  )
  RETURNING * INTO v_link;

  INSERT INTO public.admin_audit_log (
    actor_profile_id,
    action,
    target_type,
    target_id,
    metadata
  )
  VALUES (
    p_actor_id,
    'ambassador_link.created',
    'ambassador_link',
    v_link.id,
    jsonb_build_object(
      'ambassador_id', v_ambassador.id,
      'teacher_id', v_ambassador.teacher_id,
      'code', v_link.code,
      'destination_path', v_link.destination_path,
      'actor_email', p_actor_email
    )
  );

  RETURN to_jsonb(v_link);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_ambassador_link(
  p_link_id uuid,
  p_destination_path text DEFAULT NULL,
  p_campaign text DEFAULT NULL,
  p_active boolean DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_actor_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before public.ambassador_links%ROWTYPE;
  v_after public.ambassador_links%ROWTYPE;
  v_ambassador_status text;
  v_destination text;
  v_campaign text;
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'ADMIN_ACTOR_REQUIRED';
  END IF;

  SELECT al.*
    INTO v_before
  FROM public.ambassador_links al
  WHERE al.id = p_link_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'AMBASSADOR_LINK_NOT_FOUND';
  END IF;

  SELECT a.status
    INTO v_ambassador_status
  FROM public.ambassadors a
  WHERE a.id = v_before.ambassador_id;

  IF p_active IS TRUE AND v_ambassador_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'AMBASSADOR_NOT_ACTIVE';
  END IF;

  v_destination := coalesce(p_destination_path, v_before.destination_path);
  IF NOT public.ambassador_admin_is_safe_destination(v_destination) THEN
    RAISE EXCEPTION 'AMBASSADOR_DESTINATION_INVALID';
  END IF;

  v_campaign := nullif(btrim(coalesce(p_campaign, v_before.campaign, '')), '');

  UPDATE public.ambassador_links
  SET
    destination_path = v_destination,
    campaign = v_campaign,
    active = coalesce(p_active, active),
    updated_at = now()
  WHERE id = p_link_id
  RETURNING * INTO v_after;

  INSERT INTO public.admin_audit_log (
    actor_profile_id,
    action,
    target_type,
    target_id,
    metadata
  )
  VALUES (
    p_actor_id,
    'ambassador_link.updated',
    'ambassador_link',
    v_after.id,
    jsonb_build_object(
      'ambassador_id', v_after.ambassador_id,
      'teacher_id', v_after.teacher_id,
      'code', v_after.code,
      'previous_active', v_before.active,
      'new_active', v_after.active,
      'destination_path', v_after.destination_path,
      'actor_email', p_actor_email
    )
  );

  RETURN to_jsonb(v_after);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_mark_ambassador_reward_paid(
  p_reward_id uuid,
  p_payment_note text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_actor_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before public.ambassador_rewards%ROWTYPE;
  v_after public.ambassador_rewards%ROWTYPE;
  v_note text;
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'ADMIN_ACTOR_REQUIRED';
  END IF;

  SELECT *
    INTO v_before
  FROM public.ambassador_rewards
  WHERE id = p_reward_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'AMBASSADOR_REWARD_NOT_FOUND';
  END IF;

  IF v_before.status = 'paid' THEN
    RETURN to_jsonb(v_before) || jsonb_build_object('unchanged', true);
  END IF;

  IF v_before.status NOT IN ('pending', 'earned') THEN
    RAISE EXCEPTION 'AMBASSADOR_REWARD_NOT_PAYABLE';
  END IF;

  v_note := nullif(btrim(coalesce(p_payment_note, '')), '');

  UPDATE public.ambassador_rewards
  SET
    status = 'paid',
    paid_at = now(),
    updated_at = now(),
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'manual_paid_by', p_actor_id,
      'manual_paid_by_email', p_actor_email,
      'manual_paid_at', now(),
      'manual_payout_note', v_note
    )
  WHERE id = p_reward_id
  RETURNING * INTO v_after;

  INSERT INTO public.admin_audit_log (
    actor_profile_id,
    action,
    target_type,
    target_id,
    metadata
  )
  VALUES (
    p_actor_id,
    'ambassador_reward.marked_paid',
    'ambassador_reward',
    v_after.id,
    jsonb_build_object(
      'ambassador_link_id', v_after.ambassador_link_id,
      'reward_type', v_after.reward_type,
      'amount_cents', v_after.amount_cents,
      'currency', v_after.currency,
      'actor_email', p_actor_email
    )
  );

  RETURN to_jsonb(v_after);
END;
$$;

DROP VIEW IF EXISTS public.ambassador_admin_overview;
CREATE OR REPLACE VIEW public.ambassador_admin_overview AS
WITH link_rollup AS (
  SELECT
    al.ambassador_id,
    count(*)::bigint AS total_links_count,
    count(*) FILTER (WHERE al.active)::bigint AS active_links_count,
    (array_agg(al.id ORDER BY al.active DESC, al.created_at ASC))[1] AS primary_link_id,
    (array_agg(al.code ORDER BY al.active DESC, al.created_at ASC))[1] AS primary_code,
    (array_agg(al.destination_path ORDER BY al.active DESC, al.created_at ASC))[1] AS primary_destination_path
  FROM public.ambassador_links al
  WHERE al.ambassador_id IS NOT NULL
  GROUP BY al.ambassador_id
), click_rollup AS (
  SELECT
    al.ambassador_id,
    count(*) FILTER (WHERE re.event_type = 'click')::bigint AS referral_clicks
  FROM public.ambassador_links al
  LEFT JOIN public.referral_events re ON re.ambassador_link_id = al.id
  WHERE al.ambassador_id IS NOT NULL
  GROUP BY al.ambassador_id
), active_rule AS (
  SELECT r.*
  FROM public.ambassador_reward_rules r
  WHERE r.active = true
    AND r.effective_at <= now()
  ORDER BY r.effective_at DESC
  LIMIT 1
), membership_student_fee_rows AS (
  SELECT
    al.ambassador_id,
    bp.booking_id,
    bp.platform_fee_cents AS gross_platform_fee_cents,
    public.ambassador_net_platform_contribution_cents(
      bp.amount_cents,
      bp.platform_fee_cents,
      r.payment_cost_reserve_bps,
      r.payment_cost_reserve_fixed_cents
    ) AS net_platform_contribution_cents
  FROM public.referral_attributions ra
  JOIN public.ambassador_links al ON al.id = ra.ambassador_link_id
  JOIN public.booking_payments bp ON bp.student_id = ra.referred_user_id
  JOIN public.bookings b ON b.id = bp.booking_id
  CROSS JOIN active_rule r
  WHERE ra.referral_type = 'student'
    AND al.ambassador_id IS NOT NULL
    AND bp.payment_status = 'paid'
    AND bp.refunded_cents = 0
    AND bp.currency = r.currency
    AND b.status = 'completed'
    AND b.completion_outcome = 'held'
), membership_teacher_fee_rows AS (
  SELECT
    al.ambassador_id,
    bp.booking_id,
    bp.platform_fee_cents AS gross_platform_fee_cents,
    public.ambassador_net_platform_contribution_cents(
      bp.amount_cents,
      bp.platform_fee_cents,
      r.payment_cost_reserve_bps,
      r.payment_cost_reserve_fixed_cents
    ) AS net_platform_contribution_cents
  FROM public.referral_attributions ra
  JOIN public.ambassador_links al ON al.id = ra.ambassador_link_id
  JOIN public.teachers referred_teacher ON referred_teacher.user_id = ra.referred_user_id
  JOIN public.booking_payments bp ON bp.teacher_id = referred_teacher.id
  JOIN public.bookings b ON b.id = bp.booking_id
  CROSS JOIN active_rule r
  WHERE ra.referral_type = 'teacher'
    AND al.ambassador_id IS NOT NULL
    AND bp.payment_status = 'paid'
    AND bp.refunded_cents = 0
    AND bp.currency = r.currency
    AND b.status = 'completed'
    AND b.completion_outcome = 'held'
), membership_unique_fee_rollup AS (
  SELECT
    x.ambassador_id,
    count(*)::bigint AS unique_eligible_completed_bookings,
    COALESCE(sum(x.gross_platform_fee_cents), 0)::bigint AS unique_realized_platform_fee_cents,
    COALESCE(sum(x.net_platform_contribution_cents), 0)::bigint AS unique_realized_net_platform_contribution_cents
  FROM (
    SELECT ambassador_id, booking_id, gross_platform_fee_cents, net_platform_contribution_cents
    FROM membership_student_fee_rows
    UNION
    SELECT ambassador_id, booking_id, gross_platform_fee_cents, net_platform_contribution_cents
    FROM membership_teacher_fee_rows
  ) x
  GROUP BY x.ambassador_id
), economics_rollup AS (
  SELECT
    al.ambassador_id,
    COALESCE(sum(e.referred_learners), 0)::bigint AS referred_learners,
    COALESCE(sum(e.referred_teachers), 0)::bigint AS referred_teachers,
    COALESCE(sum(e.referred_student_eligible_bookings), 0)::bigint AS referred_student_eligible_bookings,
    COALESCE(sum(e.referred_teacher_eligible_bookings), 0)::bigint AS referred_teacher_eligible_bookings,
    COALESCE(sum(e.rewards_outstanding_cents), 0)::bigint AS rewards_outstanding_cents,
    COALESCE(sum(e.rewards_paid_cents), 0)::bigint AS rewards_paid_cents,
    COALESCE(sum(e.rewards_reversed_unrecovered_cents), 0)::bigint AS rewards_reversed_unrecovered_cents,
    COALESCE(sum(e.ambassador_total_economic_cost_cents), 0)::bigint AS ambassador_total_economic_cost_cents
  FROM public.ambassador_links al
  LEFT JOIN public.ambassador_reward_economics e ON e.ambassador_link_id = al.id
  WHERE al.ambassador_id IS NOT NULL
  GROUP BY al.ambassador_id
)
SELECT
  a.id AS ambassador_id,
  a.teacher_id,
  t.user_id AS ambassador_user_id,
  t.name AS teacher_name,
  p.email AS teacher_email,
  a.status,
  a.selected_at,
  a.activated_at,
  a.paused_at,
  a.revoked_at,
  a.internal_note,
  a.created_at,
  a.updated_at,
  lr.primary_link_id,
  lr.primary_code,
  lr.primary_destination_path,
  COALESCE(lr.active_links_count, 0) AS active_links_count,
  COALESCE(lr.total_links_count, 0) AS total_links_count,
  COALESCE(cr.referral_clicks, 0) AS referral_clicks,
  COALESCE(er.referred_learners, 0) AS referred_learners,
  COALESCE(er.referred_teachers, 0) AS referred_teachers,
  COALESCE(er.referred_student_eligible_bookings, 0) AS referred_student_eligible_bookings,
  COALESCE(er.referred_teacher_eligible_bookings, 0) AS referred_teacher_eligible_bookings,
  COALESCE(mufr.unique_eligible_completed_bookings, 0) AS unique_eligible_completed_bookings,
  COALESCE(mufr.unique_realized_platform_fee_cents, 0) AS unique_realized_platform_fee_cents,
  COALESCE(mufr.unique_realized_net_platform_contribution_cents, 0) AS unique_realized_net_platform_contribution_cents,
  COALESCE(er.rewards_outstanding_cents, 0) AS rewards_outstanding_cents,
  COALESCE(er.rewards_paid_cents, 0) AS rewards_paid_cents,
  COALESCE(er.rewards_reversed_unrecovered_cents, 0) AS rewards_reversed_unrecovered_cents,
  COALESCE(er.ambassador_total_economic_cost_cents, 0) AS ambassador_total_economic_cost_cents,
  (
    COALESCE(mufr.unique_realized_net_platform_contribution_cents, 0)
    - COALESCE(er.rewards_outstanding_cents, 0)
    - COALESCE(er.rewards_paid_cents, 0)
    - COALESCE(er.rewards_reversed_unrecovered_cents, 0)
  ) AS net_contribution_after_ambassador_cost_cents
FROM public.ambassadors a
JOIN public.teachers t ON t.id = a.teacher_id
LEFT JOIN public.profiles p ON p.id = t.user_id
LEFT JOIN link_rollup lr ON lr.ambassador_id = a.id
LEFT JOIN click_rollup cr ON cr.ambassador_id = a.id
LEFT JOIN membership_unique_fee_rollup mufr ON mufr.ambassador_id = a.id
LEFT JOIN economics_rollup er ON er.ambassador_id = a.id;

COMMENT ON VIEW public.ambassador_admin_overview IS
  'Admin-only ambassador program overview grouped by membership; never grant directly to browser roles.';

ALTER TABLE IF EXISTS public.ambassadors ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.ambassadors FROM anon, authenticated;
REVOKE ALL ON public.ambassador_admin_overview FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.ambassadors_set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ambassador_admin_slugify(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ambassador_admin_is_safe_destination(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ambassador_admin_unique_code(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_activate_ambassador(text, text, text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_set_ambassador_status(uuid, text, text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_create_ambassador_link(uuid, text, text, text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_update_ambassador_link(uuid, text, text, boolean, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_mark_ambassador_reward_paid(uuid, text, uuid, text) FROM PUBLIC, anon, authenticated;

GRANT ALL ON public.ambassadors TO service_role;
GRANT SELECT ON public.ambassador_admin_overview TO service_role;
GRANT EXECUTE ON FUNCTION public.ambassadors_set_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.ambassador_admin_slugify(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.ambassador_admin_is_safe_destination(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.ambassador_admin_unique_code(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_activate_ambassador(text, text, text, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_ambassador_status(uuid, text, text, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_create_ambassador_link(uuid, text, text, text, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_ambassador_link(uuid, text, text, boolean, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_mark_ambassador_reward_paid(uuid, text, uuid, text) TO service_role;
