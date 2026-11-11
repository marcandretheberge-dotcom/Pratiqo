-- Café PR3a hardening after adversarial review.
--
-- 1. Pin every Café SECURITY DEFINER search_path to the empty path.
-- 2. Shorten join-token lifetime to three minutes while preserving DB-time windows.
-- 3. Make admin cancellation return provider binding data for server-side room deletion.

ALTER FUNCTION cafe_private.require_active_profile(uuid) SET search_path = '';
ALTER FUNCTION cafe_private.require_admin(uuid) SET search_path = '';
ALTER FUNCTION cafe_private.host_is_eligible(uuid) SET search_path = '';
ALTER FUNCTION cafe_private.handle_profile_removal() SET search_path = '';
ALTER FUNCTION public.cafe_public_sessions(text) SET search_path = '';
ALTER FUNCTION public.cafe_my_reservations_server(uuid) SET search_path = '';
ALTER FUNCTION public.cafe_set_reservation_server(uuid,text,text,bigint,uuid) SET search_path = '';
ALTER FUNCTION public.cafe_admin_create_draft_server(uuid,text,text,text,text,text,timestamptz,integer,integer,uuid) SET search_path = '';
ALTER FUNCTION public.cafe_admin_publish_server(uuid,text) SET search_path = '';
ALTER FUNCTION public.cafe_admin_cancel_server(uuid,text) SET search_path = '';
ALTER FUNCTION public.cafe_admin_reassign_host_server(uuid,text,uuid) SET search_path = '';
ALTER FUNCTION cafe_private.current_rules_version() SET search_path = '';
ALTER FUNCTION public.cafe_bind_room_server(uuid,text,text) SET search_path = '';
ALTER FUNCTION public.cafe_record_removal_server(uuid,text,uuid,text) SET search_path = '';

CREATE OR REPLACE FUNCTION public.cafe_authorize_join_server(
  p_actor_id uuid,
  p_slug text,
  p_join_role text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $cafe_join_hardened$
DECLARE
  actor public.profiles%ROWTYPE;
  session_row public.cafe_sessions%ROWTYPE;
  binding cafe_private.room_bindings%ROWTYPE;
  decision_time timestamptz := pg_catalog.clock_timestamp();
  ends_at timestamptz;
  opens_at timestamptz;
  closes_at timestamptz;
  token_expires_at timestamptz;
  safe_display_name text;
BEGIN
  IF p_actor_id IS NULL
     OR p_slug IS NULL OR pg_catalog.btrim(p_slug) = ''
     OR p_join_role IS NULL OR p_join_role NOT IN ('participant', 'host') THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'code', 'invalid_request');
  END IF;

  actor := cafe_private.require_active_profile(p_actor_id);
  decision_time := pg_catalog.clock_timestamp();

  SELECT *
    INTO session_row
    FROM public.cafe_sessions
   WHERE slug = pg_catalog.lower(pg_catalog.btrim(p_slug));

  IF NOT FOUND OR session_row.status = 'draft' THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'code', 'session_not_found');
  END IF;

  IF session_row.status = 'cancelled' THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'code', 'session_cancelled');
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM cafe_private.participant_agreements agreement
     WHERE agreement.profile_id = p_actor_id
       AND agreement.adult_attested_at IS NOT NULL
       AND agreement.rules_accepted_at IS NOT NULL
       AND agreement.rules_version = cafe_private.current_rules_version()
  ) THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'code', 'adult_rules_required');
  END IF;

  IF EXISTS (
    SELECT 1
      FROM cafe_private.session_removals removal
     WHERE removal.session_id = session_row.id
       AND removal.profile_id = p_actor_id
  ) THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'code', 'access_denied');
  END IF;

  IF p_join_role = 'participant' THEN
    IF NOT EXISTS (
      SELECT 1
        FROM public.cafe_reservations reservation
       WHERE reservation.session_id = session_row.id
         AND reservation.profile_id = p_actor_id
         AND reservation.status = 'confirmed'
    ) THEN
      RETURN pg_catalog.jsonb_build_object('ok', false, 'code', 'not_reserved');
    END IF;
    opens_at := session_row.starts_at - interval '10 minutes';
  ELSE
    IF session_row.host_profile_id IS DISTINCT FROM p_actor_id THEN
      RETURN pg_catalog.jsonb_build_object('ok', false, 'code', 'access_denied');
    END IF;
    opens_at := session_row.starts_at - interval '15 minutes';
  END IF;

  ends_at := session_row.starts_at + session_row.duration_minutes * interval '1 minute';
  closes_at := ends_at + interval '5 minutes';

  IF decision_time < opens_at THEN
    RETURN pg_catalog.jsonb_build_object(
      'ok', false,
      'code', 'too_early',
      'opensAt', opens_at
    );
  END IF;

  IF decision_time > closes_at THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'code', 'ended');
  END IF;

  -- Short join credentials force every meaningful reconnect through Pratiqo's
  -- current reservation/removal/account checks. Token expiry never widens the
  -- database-authorized session window.
  token_expires_at := least(decision_time + interval '3 minutes', closes_at);
  safe_display_name := pg_catalog.split_part(
    pg_catalog.btrim(coalesce(
      nullif(actor.display_name, ''),
      nullif(actor.name, ''),
      'Participant'
    )),
    ' ',
    1
  );

  SELECT *
    INTO binding
    FROM cafe_private.room_bindings room_binding
   WHERE room_binding.session_id = session_row.id;

  RETURN pg_catalog.jsonb_build_object(
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
    RETURN pg_catalog.jsonb_build_object('ok', false, 'code', 'account_unavailable');
END
$cafe_join_hardened$;

REVOKE ALL ON FUNCTION public.cafe_authorize_join_server(uuid,text,text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cafe_authorize_join_server(uuid,text,text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.cafe_admin_cancel_room_server(
  p_actor_id uuid,
  p_slug text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $cafe_cancel_room$
DECLARE
  session_row public.cafe_sessions%ROWTYPE;
  binding cafe_private.room_bindings%ROWTYPE;
BEGIN
  PERFORM cafe_private.require_admin(p_actor_id);

  SELECT *
    INTO session_row
    FROM public.cafe_sessions
   WHERE slug = pg_catalog.lower(pg_catalog.btrim(p_slug))
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;

  IF session_row.status <> 'cancelled' THEN
    UPDATE public.cafe_sessions
       SET status = 'cancelled'
     WHERE id = session_row.id
     RETURNING * INTO session_row;
  END IF;

  SELECT *
    INTO binding
    FROM cafe_private.room_bindings room_binding
   WHERE room_binding.session_id = session_row.id;

  RETURN pg_catalog.jsonb_build_object(
    'ok', true,
    'code', 'cancelled',
    'slug', session_row.slug,
    'status', session_row.status,
    'sessionId', session_row.id,
    'provider', binding.provider,
    'providerRoomId', binding.provider_room_id
  );
END
$cafe_cancel_room$;

REVOKE ALL ON FUNCTION public.cafe_admin_cancel_room_server(uuid,text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cafe_admin_cancel_room_server(uuid,text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.cafe_clear_room_binding_server(
  p_actor_id uuid,
  p_session_id uuid,
  p_provider text,
  p_provider_room_id text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $cafe_clear_binding$
DECLARE
  existing cafe_private.room_bindings%ROWTYPE;
BEGIN
  PERFORM cafe_private.require_admin(p_actor_id);

  IF p_session_id IS NULL
     OR p_provider IS NULL OR p_provider <> 'daily'
     OR p_provider_room_id IS NULL
     OR p_provider_room_id !~ '^cafe-[A-Za-z0-9_-]{20,40}$' THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'code', 'invalid_request');
  END IF;

  SELECT *
    INTO existing
    FROM cafe_private.room_bindings binding
   WHERE binding.session_id = p_session_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object('ok', true, 'code', 'already_clear');
  END IF;

  IF existing.provider IS DISTINCT FROM p_provider
     OR existing.provider_room_id IS DISTINCT FROM p_provider_room_id THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'code', 'binding_conflict');
  END IF;

  DELETE FROM cafe_private.room_bindings
   WHERE session_id = p_session_id;

  RETURN pg_catalog.jsonb_build_object('ok', true, 'code', 'cleared');
END
$cafe_clear_binding$;

REVOKE ALL ON FUNCTION public.cafe_clear_room_binding_server(uuid,uuid,text,text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cafe_clear_room_binding_server(uuid,uuid,text,text)
  TO service_role;

-- Ended published sessions may lose their host reference during account
-- cleanup. Keep the active/future published host requirement, but do not
-- contradict that historical anonymization path.
CREATE OR REPLACE FUNCTION cafe_private.enforce_session_invariants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $cafe_session_invariants_hardened$
DECLARE
  decision_time timestamptz := pg_catalog.clock_timestamp();
  old_ends_at timestamptz;
BEGIN
  NEW.slug := pg_catalog.lower(pg_catalog.btrim(NEW.slug));
  NEW.title := pg_catalog.btrim(NEW.title);
  NEW.primary_language := pg_catalog.btrim(NEW.primary_language);
  NEW.practice_language := CASE
    WHEN NEW.practice_language IS NULL THEN NULL
    WHEN pg_catalog.btrim(NEW.practice_language) = '' THEN NULL
    ELSE pg_catalog.btrim(NEW.practice_language)
  END;
  NEW.level := CASE
    WHEN NEW.level IS NULL THEN NULL
    WHEN pg_catalog.btrim(NEW.level) = '' THEN NULL
    ELSE pg_catalog.btrim(NEW.level)
  END;
  NEW.updated_at := decision_time;

  IF TG_OP = 'UPDATE' THEN
    old_ends_at := OLD.starts_at + OLD.duration_minutes * interval '1 minute';

    IF NEW.slug IS DISTINCT FROM OLD.slug THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Cafe slug is immutable';
    END IF;
    IF NEW.created_by_profile_id IS DISTINCT FROM OLD.created_by_profile_id
       AND NOT (OLD.created_by_profile_id IS NOT NULL AND NEW.created_by_profile_id IS NULL) THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Cafe creator is immutable except privacy cleanup';
    END IF;

    IF OLD.status = 'cancelled' THEN
      IF NEW.status IS DISTINCT FROM OLD.status
         OR NEW.title IS DISTINCT FROM OLD.title
         OR NEW.primary_language IS DISTINCT FROM OLD.primary_language
         OR NEW.practice_language IS DISTINCT FROM OLD.practice_language
         OR NEW.level IS DISTINCT FROM OLD.level
         OR NEW.starts_at IS DISTINCT FROM OLD.starts_at
         OR NEW.duration_minutes IS DISTINCT FROM OLD.duration_minutes
         OR NEW.max_participants IS DISTINCT FROM OLD.max_participants
         OR NEW.published_at IS DISTINCT FROM OLD.published_at
         OR NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at THEN
        RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Cancelled Cafe session is terminal';
      END IF;
    END IF;

    IF OLD.status = 'published' THEN
      IF NEW.status NOT IN ('published', 'cancelled') THEN
        RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Published Cafe cannot return to draft';
      END IF;
      IF NEW.primary_language IS DISTINCT FROM OLD.primary_language
         OR NEW.practice_language IS DISTINCT FROM OLD.practice_language
         OR NEW.level IS DISTINCT FROM OLD.level
         OR NEW.starts_at IS DISTINCT FROM OLD.starts_at
         OR NEW.duration_minutes IS DISTINCT FROM OLD.duration_minutes
         OR NEW.max_participants IS DISTINCT FROM OLD.max_participants THEN
        RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Published Cafe material terms are frozen';
      END IF;
    END IF;

    -- An ended published session may lose its historical host reference.
    IF NEW.status = 'published'
       AND old_ends_at > decision_time
       AND NEW.host_profile_id IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Active/future published Cafe requires host';
    END IF;
  END IF;

  IF NEW.host_profile_id IS NOT NULL
     AND NOT cafe_private.host_is_eligible(NEW.host_profile_id) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Cafe host is unavailable';
  END IF;

  IF NEW.status = 'published' THEN
    IF NEW.host_profile_id IS NULL AND TG_OP = 'INSERT' THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Published Cafe requires host';
    END IF;
    IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published' THEN
      IF NEW.starts_at <= decision_time THEN
        RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Cafe must start in the future when published';
      END IF;
      IF NEW.host_profile_id IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Published Cafe requires host';
      END IF;
      NEW.published_at := COALESCE(NEW.published_at, decision_time);
    END IF;
  END IF;

  IF NEW.status = 'cancelled' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'cancelled') THEN
    NEW.cancelled_at := COALESCE(NEW.cancelled_at, decision_time);
  END IF;

  RETURN NEW;
END
$cafe_session_invariants_hardened$;

NOTIFY pgrst, 'reload schema';
