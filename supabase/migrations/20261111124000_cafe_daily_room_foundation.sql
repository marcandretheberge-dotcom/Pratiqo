-- Café des langues PR3a: provider-neutral room authorization foundation.
--
-- This migration deliberately adds no video UI, public room URL, reservation
-- activation, attendance, report workflow, recording, or transcription.
-- Pratiqo remains the authorization source of truth; provider credentials are
-- issued only after the database returns an approved join decision.

CREATE SCHEMA IF NOT EXISTS cafe_private;
REVOKE ALL ON SCHEMA cafe_private FROM PUBLIC, anon, authenticated, service_role;

-- The pilot is capped at eight people including the host.
ALTER TABLE public.cafe_sessions
  ADD CONSTRAINT cafe_sessions_pilot_capacity_check
  CHECK (max_participants <= 8) NOT VALID;
ALTER TABLE public.cafe_sessions
  VALIDATE CONSTRAINT cafe_sessions_pilot_capacity_check;

CREATE TABLE cafe_private.room_bindings (
  session_id uuid PRIMARY KEY REFERENCES public.cafe_sessions(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_room_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT cafe_room_bindings_provider_check CHECK (provider IN ('daily')),
  CONSTRAINT cafe_room_bindings_room_id_check
    CHECK (provider_room_id ~ '^cafe-[A-Za-z0-9_-]{20,40}$'),
  CONSTRAINT cafe_room_bindings_provider_room_unique UNIQUE (provider, provider_room_id)
);

CREATE TABLE cafe_private.session_removals (
  session_id uuid NOT NULL REFERENCES public.cafe_sessions(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  removed_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  removed_at timestamptz NOT NULL DEFAULT now(),
  reason_code text,

  PRIMARY KEY (session_id, profile_id),
  CONSTRAINT cafe_session_removals_reason_check CHECK (
    reason_code IS NULL OR reason_code IN ('conduct', 'safety', 'spam', 'solicitation', 'other')
  )
);

-- Existing Pratiqo accounts do not contain a trustworthy date of birth.
-- The adults-only pilot therefore uses an explicit adult attestation plus the
-- exact Café rules version accepted by the account holder. PR3c will own the
-- consent UI; PR3a only enforces the server-side gate.
CREATE TABLE cafe_private.participant_agreements (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  adult_attested_at timestamptz NOT NULL,
  rules_version text NOT NULL,
  rules_accepted_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT cafe_participant_agreements_rules_version_check
    CHECK (rules_version ~ '^cafe-pilot-[a-z0-9-]+-v[0-9]+$')
);

ALTER TABLE cafe_private.room_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cafe_private.session_removals ENABLE ROW LEVEL SECURITY;
ALTER TABLE cafe_private.participant_agreements ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON cafe_private.room_bindings,
  cafe_private.session_removals,
  cafe_private.participant_agreements
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION cafe_private.current_rules_version()
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $cafe_rules$
  SELECT 'cafe-pilot-adults-v1'::text
$cafe_rules$;

REVOKE ALL ON FUNCTION cafe_private.current_rules_version()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.cafe_authorize_join_server(
  p_actor_id uuid,
  p_slug text,
  p_join_role text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $cafe_join$
DECLARE
  actor public.profiles%ROWTYPE;
  session_row public.cafe_sessions%ROWTYPE;
  binding cafe_private.room_bindings%ROWTYPE;
  decision_time timestamptz := clock_timestamp();
  ends_at timestamptz;
  opens_at timestamptz;
  closes_at timestamptz;
  token_expires_at timestamptz;
  safe_display_name text;
BEGIN
  IF p_actor_id IS NULL
     OR p_slug IS NULL OR trim(p_slug) = ''
     OR p_join_role IS NULL OR p_join_role NOT IN ('participant', 'host') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_request');
  END IF;

  -- Locks the account row FOR KEY SHARE and re-checks Auth/profile eligibility.
  actor := cafe_private.require_active_profile(p_actor_id);
  decision_time := clock_timestamp();

  SELECT *
    INTO session_row
    FROM public.cafe_sessions
   WHERE slug = lower(trim(p_slug));

  IF NOT FOUND OR session_row.status = 'draft' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'session_not_found');
  END IF;

  IF session_row.status = 'cancelled' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'session_cancelled');
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM cafe_private.participant_agreements agreement
     WHERE agreement.profile_id = p_actor_id
       AND agreement.adult_attested_at IS NOT NULL
       AND agreement.rules_accepted_at IS NOT NULL
       AND agreement.rules_version = cafe_private.current_rules_version()
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'adult_rules_required');
  END IF;

  IF EXISTS (
    SELECT 1
      FROM cafe_private.session_removals removal
     WHERE removal.session_id = session_row.id
       AND removal.profile_id = p_actor_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'access_denied');
  END IF;

  IF p_join_role = 'participant' THEN
    IF NOT EXISTS (
      SELECT 1
        FROM public.cafe_reservations reservation
       WHERE reservation.session_id = session_row.id
         AND reservation.profile_id = p_actor_id
         AND reservation.status = 'confirmed'
    ) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'not_reserved');
    END IF;
    opens_at := session_row.starts_at - interval '10 minutes';
  ELSE
    IF session_row.host_profile_id IS DISTINCT FROM p_actor_id THEN
      RETURN jsonb_build_object('ok', false, 'code', 'access_denied');
    END IF;
    opens_at := session_row.starts_at - interval '15 minutes';
  END IF;

  ends_at := session_row.starts_at + session_row.duration_minutes * interval '1 minute';
  closes_at := ends_at + interval '5 minutes';

  IF decision_time < opens_at THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'too_early',
      'opensAt', opens_at
    );
  END IF;

  IF decision_time > closes_at THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ended');
  END IF;

  token_expires_at := least(decision_time + interval '10 minutes', closes_at);
  safe_display_name := split_part(
    trim(coalesce(nullif(actor.display_name, ''), nullif(actor.name, ''), 'Participant')),
    ' ',
    1
  );

  SELECT *
    INTO binding
    FROM cafe_private.room_bindings room_binding
   WHERE room_binding.session_id = session_row.id;

  RETURN jsonb_build_object(
    'ok', true,
    'code', 'join_authorized',
    'sessionId', session_row.id,
    'role', p_join_role,
    'profileId', p_actor_id,
    'displayName', safe_display_name,
    'startsAt', session_row.starts_at,
    'endsAt', ends_at,
    'opensAt', opens_at,
    'closesAt', closes_at,
    'roomNbf', extract(epoch FROM (session_row.starts_at - interval '16 minutes'))::bigint,
    'roomExp', extract(epoch FROM (ends_at + interval '10 minutes'))::bigint,
    'tokenNbf', extract(epoch FROM (decision_time - interval '5 seconds'))::bigint,
    'tokenExp', extract(epoch FROM token_expires_at)::bigint,
    'maxParticipants', session_row.max_participants,
    'provider', binding.provider,
    'providerRoomId', binding.provider_room_id
  );
EXCEPTION
  WHEN insufficient_privilege THEN
    RETURN jsonb_build_object('ok', false, 'code', 'account_unavailable');
END
$cafe_join$;

REVOKE ALL ON FUNCTION public.cafe_authorize_join_server(uuid,text,text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cafe_authorize_join_server(uuid,text,text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.cafe_bind_room_server(
  p_session_id uuid,
  p_provider text,
  p_provider_room_id text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $cafe_binding$
DECLARE
  existing cafe_private.room_bindings%ROWTYPE;
BEGIN
  IF p_session_id IS NULL
     OR p_provider IS NULL OR p_provider <> 'daily'
     OR p_provider_room_id IS NULL
     OR p_provider_room_id !~ '^cafe-[A-Za-z0-9_-]{20,40}$' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_request');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.cafe_sessions s WHERE s.id = p_session_id) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'session_not_found');
  END IF;

  INSERT INTO cafe_private.room_bindings (
    session_id,
    provider,
    provider_room_id,
    created_at,
    updated_at
  ) VALUES (
    p_session_id,
    p_provider,
    p_provider_room_id,
    clock_timestamp(),
    clock_timestamp()
  )
  ON CONFLICT (session_id) DO NOTHING;

  SELECT *
    INTO existing
    FROM cafe_private.room_bindings binding
   WHERE binding.session_id = p_session_id;

  IF existing.provider IS DISTINCT FROM p_provider
     OR existing.provider_room_id IS DISTINCT FROM p_provider_room_id THEN
    RETURN jsonb_build_object('ok', false, 'code', 'binding_conflict');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'provider', existing.provider,
    'providerRoomId', existing.provider_room_id
  );
EXCEPTION
  WHEN unique_violation THEN
    SELECT *
      INTO existing
      FROM cafe_private.room_bindings binding
     WHERE binding.session_id = p_session_id;
    IF FOUND
       AND existing.provider IS NOT DISTINCT FROM p_provider
       AND existing.provider_room_id IS NOT DISTINCT FROM p_provider_room_id THEN
      RETURN jsonb_build_object(
        'ok', true,
        'provider', existing.provider,
        'providerRoomId', existing.provider_room_id
      );
    END IF;
    RETURN jsonb_build_object('ok', false, 'code', 'binding_conflict');
END
$cafe_binding$;

REVOKE ALL ON FUNCTION public.cafe_bind_room_server(uuid,text,text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cafe_bind_room_server(uuid,text,text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.cafe_record_removal_server(
  p_actor_id uuid,
  p_slug text,
  p_target_profile_id uuid,
  p_reason_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $cafe_removal$
DECLARE
  actor public.profiles%ROWTYPE;
  session_row public.cafe_sessions%ROWTYPE;
BEGIN
  IF p_actor_id IS NULL OR p_target_profile_id IS NULL
     OR p_slug IS NULL OR trim(p_slug) = ''
     OR (p_reason_code IS NOT NULL
         AND p_reason_code NOT IN ('conduct', 'safety', 'spam', 'solicitation', 'other')) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_request');
  END IF;

  actor := cafe_private.require_active_profile(p_actor_id);

  SELECT *
    INTO session_row
    FROM public.cafe_sessions
   WHERE slug = lower(trim(p_slug));

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'session_not_found');
  END IF;

  IF session_row.host_profile_id IS DISTINCT FROM p_actor_id
     AND actor.role::text <> 'admin' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'access_denied');
  END IF;

  IF p_target_profile_id = p_actor_id
     OR NOT EXISTS (
       SELECT 1
         FROM public.cafe_reservations reservation
        WHERE reservation.session_id = session_row.id
          AND reservation.profile_id = p_target_profile_id
          AND reservation.status = 'confirmed'
     ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_target');
  END IF;

  INSERT INTO cafe_private.session_removals (
    session_id,
    profile_id,
    removed_by_profile_id,
    removed_at,
    reason_code
  ) VALUES (
    session_row.id,
    p_target_profile_id,
    p_actor_id,
    clock_timestamp(),
    p_reason_code
  )
  ON CONFLICT (session_id, profile_id)
  DO UPDATE SET
    removed_by_profile_id = EXCLUDED.removed_by_profile_id,
    removed_at = EXCLUDED.removed_at,
    reason_code = EXCLUDED.reason_code;

  RETURN jsonb_build_object('ok', true, 'code', 'removed');
EXCEPTION
  WHEN foreign_key_violation THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_target');
END
$cafe_removal$;

REVOKE ALL ON FUNCTION public.cafe_record_removal_server(uuid,text,uuid,text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cafe_record_removal_server(uuid,text,uuid,text)
  TO service_role;

NOTIFY pgrst, 'reload schema';
