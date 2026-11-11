-- Serialize a first Daily room binding with every session-state transition.
--
-- If cancellation owns the session row first, binding observes `cancelled` and
-- is rejected. If binding owns it first, cancellation waits, then receives the
-- newly persisted binding and deletes the provider room through the server path.
-- FOR NO KEY UPDATE also conflicts with ordinary status updates triggered by
-- account cleanup, unlike FOR KEY SHARE.

CREATE OR REPLACE FUNCTION public.cafe_bind_room_server(
  p_session_id uuid,
  p_provider text,
  p_provider_room_id text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $cafe_binding_serialized$
DECLARE
  session_row public.cafe_sessions%ROWTYPE;
  existing cafe_private.room_bindings%ROWTYPE;
  decision_time timestamptz := pg_catalog.clock_timestamp();
BEGIN
  IF p_session_id IS NULL
     OR p_provider IS NULL OR p_provider <> 'daily'
     OR p_provider_room_id IS NULL
     OR p_provider_room_id !~ '^cafe-[A-Za-z0-9_-]{20,40}$' THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'code', 'invalid_request');
  END IF;

  SELECT *
    INTO session_row
    FROM public.cafe_sessions session_candidate
   WHERE session_candidate.id = p_session_id
   FOR NO KEY UPDATE;

  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'code', 'session_not_found');
  END IF;

  IF session_row.status <> 'published'
     OR decision_time > (
       session_row.starts_at
       + session_row.duration_minutes * interval '1 minute'
       + interval '5 minutes'
     ) THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'code', 'session_unavailable');
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
    decision_time,
    decision_time
  )
  ON CONFLICT (session_id) DO NOTHING;

  SELECT *
    INTO existing
    FROM cafe_private.room_bindings binding
   WHERE binding.session_id = p_session_id;

  IF existing.provider IS DISTINCT FROM p_provider
     OR existing.provider_room_id IS DISTINCT FROM p_provider_room_id THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'code', 'binding_conflict');
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'ok', true,
    'provider', existing.provider,
    'providerRoomId', existing.provider_room_id
  );
EXCEPTION
  WHEN unique_violation THEN
    -- Concurrent identical binds can surface as unique_violation even with
    -- ON CONFLICT. Re-read and treat a matching row as idempotent success.
    SELECT *
      INTO existing
      FROM cafe_private.room_bindings binding
     WHERE binding.session_id = p_session_id;
    IF FOUND
       AND existing.provider IS NOT DISTINCT FROM p_provider
       AND existing.provider_room_id IS NOT DISTINCT FROM p_provider_room_id THEN
      RETURN pg_catalog.jsonb_build_object(
        'ok', true,
        'provider', existing.provider,
        'providerRoomId', existing.provider_room_id
      );
    END IF;
    RETURN pg_catalog.jsonb_build_object('ok', false, 'code', 'binding_conflict');
END
$cafe_binding_serialized$;

REVOKE ALL ON FUNCTION public.cafe_bind_room_server(uuid,text,text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cafe_bind_room_server(uuid,text,text)
  TO service_role;

NOTIFY pgrst, 'reload schema';
