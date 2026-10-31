-- Decouple ambassador identity from teacher marketplace participation.
--
-- After this migration, every ambassador is anchored to an existing Pratiqo
-- profile (profiles.id). A teacher profile is optional. Existing teacher
-- ambassadors are backfilled without changing links, sessions, attributions,
-- reward history, or economics.
--
-- Production note: this migration is intentionally committed for review only.
-- Do not apply until the branch/PR has passed review and validation.

ALTER TABLE public.ambassadors
  ADD COLUMN IF NOT EXISTS user_id uuid;

UPDATE public.ambassadors a
SET user_id = t.user_id
FROM public.teachers t
WHERE t.id = a.teacher_id
  AND a.user_id IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.ambassadors WHERE user_id IS NULL) THEN
    RAISE EXCEPTION 'AMBASSADOR_USER_BACKFILL_INCOMPLETE';
  END IF;
END;
$$;

ALTER TABLE public.ambassadors
  DROP CONSTRAINT IF EXISTS ambassadors_user_id_fkey;
ALTER TABLE public.ambassadors
  ADD CONSTRAINT ambassadors_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;
ALTER TABLE public.ambassadors
  ALTER COLUMN user_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ambassadors_user_unique
  ON public.ambassadors (user_id);

ALTER TABLE public.ambassadors
  DROP CONSTRAINT IF EXISTS ambassadors_teacher_id_fkey;
ALTER TABLE public.ambassadors
  ALTER COLUMN teacher_id DROP NOT NULL;
ALTER TABLE public.ambassadors
  ADD CONSTRAINT ambassadors_teacher_id_fkey
  FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE SET NULL;

UPDATE public.ambassador_links al
SET ambassador_id = a.id
FROM public.ambassadors a
WHERE al.ambassador_id IS NULL
  AND al.teacher_id = a.teacher_id;

ALTER TABLE public.ambassador_links
  DROP CONSTRAINT IF EXISTS ambassador_links_teacher_id_fkey;
ALTER TABLE public.ambassador_links
  ALTER COLUMN teacher_id DROP NOT NULL;
ALTER TABLE public.ambassador_links
  ADD CONSTRAINT ambassador_links_teacher_id_fkey
  FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE SET NULL;

COMMENT ON TABLE public.ambassadors IS
  'Admin-managed ambassador memberships anchored to a Pratiqo user account. Teacher participation is optional.';
COMMENT ON COLUMN public.ambassadors.user_id IS
  'Source-of-truth Pratiqo account for the ambassador. Required for all ambassadors.';
COMMENT ON COLUMN public.ambassadors.teacher_id IS
  'Optional teacher profile when the ambassador also teaches on Pratiqo.';
COMMENT ON COLUMN public.ambassador_links.teacher_id IS
  'Optional teacher association retained for compatibility/reporting; ambassador_id is the program owner.';

CREATE OR REPLACE FUNCTION public.admin_activate_ambassador_user(
  p_user_identifier text,
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
  v_identifier text;
  v_profile record;
  v_teacher_id text;
  v_teacher_name text;
  v_ambassador public.ambassadors%ROWTYPE;
  v_link public.ambassador_links%ROWTYPE;
  v_code text;
  v_note text;
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'ADMIN_ACTOR_REQUIRED';
  END IF;

  v_identifier := nullif(btrim(coalesce(p_user_identifier, '')), '');
  IF v_identifier IS NULL THEN
    RAISE EXCEPTION 'AMBASSADOR_USER_REQUIRED';
  END IF;

  IF v_identifier ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    SELECT p.id, p.name, p.display_name, p.email, p.deleted_at, p.anonymized_at
      INTO v_profile
    FROM public.profiles p
    WHERE p.id = v_identifier::uuid;
  END IF;

  IF v_profile.id IS NULL THEN
    SELECT p.id, p.name, p.display_name, p.email, p.deleted_at, p.anonymized_at
      INTO v_profile
    FROM public.profiles p
    WHERE lower(p.email) = lower(v_identifier)
    ORDER BY p.created_at ASC
    LIMIT 1;
  END IF;

  IF v_profile.id IS NULL THEN
    SELECT p.id, p.name, p.display_name, p.email, p.deleted_at, p.anonymized_at
      INTO v_profile
    FROM public.teachers t
    JOIN public.profiles p ON p.id = t.user_id
    WHERE t.id = v_identifier
    LIMIT 1;
  END IF;

  IF v_profile.id IS NULL THEN
    RAISE EXCEPTION 'AMBASSADOR_USER_NOT_FOUND';
  END IF;

  IF v_profile.deleted_at IS NOT NULL OR v_profile.anonymized_at IS NOT NULL THEN
    RAISE EXCEPTION 'AMBASSADOR_USER_UNAVAILABLE';
  END IF;

  SELECT t.id, t.name
    INTO v_teacher_id, v_teacher_name
  FROM public.teachers t
  WHERE t.user_id = v_profile.id
  ORDER BY t.created_at ASC NULLS LAST, t.id ASC
  LIMIT 1;

  v_note := nullif(btrim(coalesce(p_internal_note, '')), '');

  INSERT INTO public.ambassadors (
    user_id,
    teacher_id,
    status,
    selected_by,
    selected_at,
    activated_at,
    internal_note
  )
  VALUES (
    v_profile.id,
    v_teacher_id,
    'active',
    p_actor_id,
    now(),
    now(),
    v_note
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    teacher_id = coalesce(EXCLUDED.teacher_id, public.ambassadors.teacher_id),
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
      coalesce(
        p_preferred_code,
        v_teacher_name,
        v_profile.display_name,
        v_profile.name,
        split_part(v_profile.email, '@', 1),
        'ambassador'
      ),
      v_profile.id::text
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
      v_ambassador.teacher_id,
      v_code,
      '/trouver-un-prof',
      'admin-created',
      true
    )
    RETURNING * INTO v_link;
  END IF;

  UPDATE public.ambassador_links
  SET
    ambassador_id = v_ambassador.id,
    teacher_id = coalesce(teacher_id, v_ambassador.teacher_id)
  WHERE ambassador_id = v_ambassador.id
     OR (
       v_ambassador.teacher_id IS NOT NULL
       AND teacher_id = v_ambassador.teacher_id
       AND ambassador_id IS NULL
     );

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
      'ambassador_user_id', v_profile.id,
      'teacher_id', v_ambassador.teacher_id,
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
    coalesce(p_preferred_code, 'ambassador-' || v_ambassador.user_id::text),
    v_ambassador.user_id::text
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
      'ambassador_user_id', v_ambassador.user_id,
      'teacher_id', v_ambassador.teacher_id,
      'code', v_link.code,
      'destination_path', v_link.destination_path,
      'actor_email', p_actor_email
    )
  );

  RETURN to_jsonb(v_link);
END;
$$;

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

  SELECT a.user_id
    INTO v_ambassador_user_id
  FROM public.ambassadors a
  WHERE a.id = v_link.ambassador_id;

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
  a.user_id AS ambassador_user_id,
  COALESCE(t.name, p.display_name, p.name) AS teacher_name,
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
LEFT JOIN public.teachers t ON t.id = a.teacher_id
LEFT JOIN public.profiles p ON p.id = a.user_id
LEFT JOIN link_rollup lr ON lr.ambassador_id = a.id
LEFT JOIN click_rollup cr ON cr.ambassador_id = a.id
LEFT JOIN membership_unique_fee_rollup mufr ON mufr.ambassador_id = a.id
LEFT JOIN economics_rollup er ON er.ambassador_id = a.id;

COMMENT ON VIEW public.ambassador_admin_overview IS
  'Admin-only ambassador program overview grouped by membership; never grant directly to browser roles.';



REVOKE ALL ON FUNCTION public.admin_activate_ambassador_user(text, text, text, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_activate_ambassador_user(text, text, text, uuid, text)
  TO service_role;

-- Re-assert the existing claim/link RPC boundaries after replacement.
REVOKE ALL ON FUNCTION public.claim_ambassador_referral(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_ambassador_referral(uuid, uuid)
  TO service_role;

REVOKE ALL ON FUNCTION public.admin_create_ambassador_link(uuid, text, text, text, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_ambassador_link(uuid, text, text, text, uuid, text)
  TO service_role;

REVOKE ALL ON public.ambassadors FROM anon, authenticated;
REVOKE ALL ON public.ambassador_admin_overview FROM anon, authenticated;
GRANT ALL ON public.ambassadors TO service_role;
GRANT SELECT ON public.ambassador_admin_overview TO service_role;
