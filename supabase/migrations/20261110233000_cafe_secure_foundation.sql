-- Café des langues V1 secure storage/API foundation.
-- No public UI, room, roster, matching, attendance, payment, or teacher solicitation.
--
-- Security model:
--   * public tables are RLS-enabled and direct DML is revoked from anon,
--     authenticated, and service_role.
--   * public listing is exposed only through a whitelisted SECURITY DEFINER RPC.
--   * reservation/admin mutations are SECURITY DEFINER RPCs executable only by
--     service_role and must be reached through authenticated server routes.
--   * participant identity is never returned by the public listing RPC.

CREATE SCHEMA IF NOT EXISTS cafe_private;
REVOKE ALL ON SCHEMA cafe_private FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE public.cafe_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  primary_language text NOT NULL,
  practice_language text,
  level text,
  starts_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL,
  max_participants integer NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  host_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  published_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT cafe_sessions_slug_check
    CHECK (slug = lower(slug) AND slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT cafe_sessions_title_check
    CHECK (char_length(trim(title)) BETWEEN 1 AND 120),
  CONSTRAINT cafe_sessions_primary_language_check
    CHECK (char_length(trim(primary_language)) BETWEEN 1 AND 40),
  CONSTRAINT cafe_sessions_practice_language_check
    CHECK (practice_language IS NULL OR char_length(trim(practice_language)) BETWEEN 1 AND 40),
  CONSTRAINT cafe_sessions_level_check
    CHECK (level IS NULL OR char_length(trim(level)) BETWEEN 1 AND 40),
  CONSTRAINT cafe_sessions_starts_at_finite_check
    CHECK (isfinite(starts_at)),
  CONSTRAINT cafe_sessions_duration_check
    CHECK (duration_minutes BETWEEN 15 AND 180),
  CONSTRAINT cafe_sessions_capacity_check
    CHECK (max_participants BETWEEN 1 AND 12),
  CONSTRAINT cafe_sessions_status_check
    CHECK (status IN ('draft', 'published', 'cancelled'))
);

CREATE TABLE public.cafe_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.cafe_sessions(id) ON DELETE RESTRICT,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL,
  version bigint NOT NULL,
  reserved_at timestamptz,
  cancelled_at timestamptz,
  last_request_id uuid NOT NULL,
  last_action text NOT NULL,
  last_expected_version bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT cafe_reservations_pair_unique UNIQUE (session_id, profile_id),
  CONSTRAINT cafe_reservations_status_check CHECK (status IN ('confirmed', 'cancelled')),
  CONSTRAINT cafe_reservations_version_check CHECK (version > 0),
  CONSTRAINT cafe_reservations_expected_version_check CHECK (last_expected_version >= 0),
  CONSTRAINT cafe_reservations_last_action_check CHECK (last_action IN ('reserve', 'cancel')),
  CONSTRAINT cafe_reservations_timestamps_check CHECK (
    (status = 'confirmed' AND reserved_at IS NOT NULL AND cancelled_at IS NULL)
    OR
    (status = 'cancelled' AND cancelled_at IS NOT NULL)
  )
);

CREATE INDEX cafe_sessions_published_starts_idx
  ON public.cafe_sessions (starts_at, id)
  WHERE status = 'published';
CREATE INDEX cafe_sessions_host_idx ON public.cafe_sessions (host_profile_id);
CREATE INDEX cafe_sessions_creator_idx ON public.cafe_sessions (created_by_profile_id);
CREATE INDEX cafe_reservations_profile_session_idx
  ON public.cafe_reservations (profile_id, session_id);

ALTER TABLE public.cafe_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_reservations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.cafe_sessions, public.cafe_reservations
  FROM PUBLIC, anon, authenticated, service_role;

CREATE POLICY cafe_sessions_deny_direct_clients
  ON public.cafe_sessions
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY cafe_reservations_deny_direct_clients
  ON public.cafe_reservations
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION cafe_private.require_active_profile(p_profile_id uuid)
RETURNS public.profiles
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  p public.profiles%ROWTYPE;
BEGIN
  SELECT *
    INTO p
    FROM public.profiles
   WHERE id = p_profile_id
   FOR KEY SHARE;

  IF NOT FOUND
     OR COALESCE(p.is_active, true) IS NOT TRUE
     OR p.deletion_requested_at IS NOT NULL
     OR p.deleted_at IS NOT NULL
     OR NOT EXISTS (
       SELECT 1
         FROM auth.users au
        WHERE au.id = p_profile_id
          AND au.is_anonymous = false
          AND au.deleted_at IS NULL
          AND (au.banned_until IS NULL OR au.banned_until <= clock_timestamp())
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Cafe account unavailable';
  END IF;

  RETURN p;
END
$$;

CREATE OR REPLACE FUNCTION cafe_private.require_admin(p_profile_id uuid)
RETURNS public.profiles
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  p public.profiles%ROWTYPE;
BEGIN
  p := cafe_private.require_active_profile(p_profile_id);
  IF p.role::text <> 'admin' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Cafe admin required';
  END IF;
  RETURN p;
END
$$;

CREATE OR REPLACE FUNCTION cafe_private.host_is_eligible(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $cafe$
  SELECT EXISTS (
    SELECT 1
      FROM public.profiles p
      JOIN auth.users au ON au.id = p.id
     WHERE p.id = p_profile_id
       AND COALESCE(p.is_active, true) = true
       AND p.deletion_requested_at IS NULL
       AND p.deleted_at IS NULL
       AND au.is_anonymous = false
       AND au.deleted_at IS NULL
       AND (au.banned_until IS NULL OR au.banned_until <= clock_timestamp())
  )
$cafe$;

REVOKE ALL ON FUNCTION cafe_private.require_active_profile(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION cafe_private.require_admin(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION cafe_private.host_is_eligible(uuid) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION cafe_private.enforce_session_invariants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  decision_time timestamptz := clock_timestamp();
  old_ends_at timestamptz;
BEGIN
  NEW.slug := lower(trim(NEW.slug));
  NEW.title := trim(NEW.title);
  NEW.primary_language := trim(NEW.primary_language);
  NEW.practice_language := nullif(trim(NEW.practice_language), '');
  NEW.level := nullif(trim(NEW.level), '');
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
    IF NEW.host_profile_id IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Published Cafe requires host';
    END IF;
    IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published' THEN
      IF NEW.starts_at <= decision_time THEN
        RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Cafe must start in the future when published';
      END IF;
      NEW.published_at := COALESCE(NEW.published_at, decision_time);
    END IF;
  END IF;

  IF NEW.status = 'cancelled' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'cancelled') THEN
    NEW.cancelled_at := COALESCE(NEW.cancelled_at, decision_time);
  END IF;

  RETURN NEW;
END
$$;

CREATE TRIGGER cafe_sessions_invariants
BEFORE INSERT OR UPDATE ON public.cafe_sessions
FOR EACH ROW EXECUTE FUNCTION cafe_private.enforce_session_invariants();

REVOKE ALL ON FUNCTION cafe_private.enforce_session_invariants() FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.cafe_public_sessions(p_slug text DEFAULT NULL)
RETURNS TABLE (
  slug text,
  title text,
  primary_language text,
  practice_language text,
  level text,
  starts_at timestamptz,
  duration_minutes integer,
  max_participants integer,
  confirmed_count bigint,
  remaining_spots bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $cafe_public$
  SELECT
    s.slug,
    s.title,
    s.primary_language,
    s.practice_language,
    s.level,
    s.starts_at,
    s.duration_minutes,
    s.max_participants,
    c.confirmed_count,
    greatest(s.max_participants::bigint - c.confirmed_count, 0::bigint)
  FROM public.cafe_sessions s
  CROSS JOIN LATERAL (
    SELECT count(*)::bigint AS confirmed_count
      FROM public.cafe_reservations r
     WHERE r.session_id = s.id
       AND r.status = 'confirmed'
  ) c
  WHERE s.status = 'published'
    AND s.starts_at > statement_timestamp()
    AND (p_slug IS NULL OR s.slug = p_slug)
  ORDER BY s.starts_at, s.slug
  LIMIT 100
$cafe_public$;

REVOKE ALL ON FUNCTION public.cafe_public_sessions(text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cafe_public_sessions(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.cafe_my_reservations_server(p_actor_id uuid)
RETURNS TABLE (
  reservation_id uuid,
  slug text,
  title text,
  starts_at timestamptz,
  duration_minutes integer,
  reservation_status text,
  session_status text,
  phase text,
  effective_status text,
  version bigint
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  PERFORM cafe_private.require_active_profile(p_actor_id);

  RETURN QUERY
  SELECT
    r.id,
    s.slug,
    s.title,
    s.starts_at,
    s.duration_minutes,
    r.status,
    s.status,
    CASE
      WHEN statement_timestamp() < s.starts_at THEN 'upcoming'
      WHEN statement_timestamp() < s.starts_at + s.duration_minutes * interval '1 minute' THEN 'in_progress'
      ELSE 'ended'
    END,
    CASE
      WHEN s.status = 'cancelled' THEN 'session_cancelled'
      ELSE r.status
    END,
    r.version
  FROM public.cafe_reservations r
  JOIN public.cafe_sessions s ON s.id = r.session_id
  WHERE r.profile_id = p_actor_id
  ORDER BY s.starts_at, r.id;
END
$$;

REVOKE ALL ON FUNCTION public.cafe_my_reservations_server(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cafe_my_reservations_server(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.cafe_set_reservation_server(
  p_actor_id uuid,
  p_slug text,
  p_action text,
  p_expected_version bigint,
  p_request_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  p public.profiles%ROWTYPE;
  s public.cafe_sessions%ROWTYPE;
  r public.cafe_reservations%ROWTYPE;
  decision_time timestamptz;
  current_version bigint := 0;
  session_confirmed bigint := 0;
  upcoming_confirmed bigint := 0;
  next_version bigint;
BEGIN
  IF p_actor_id IS NULL
     OR p_action IS NULL
     OR p_action NOT IN ('reserve', 'cancel')
     OR p_expected_version IS NULL OR p_expected_version < 0
     OR p_request_id IS NULL
     OR p_slug IS NULL OR trim(p_slug) = '' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_request');
  END IF;

  PERFORM set_config('lock_timeout', '3s', true);
  -- Canonical lock order: profile row -> actor advisory lock -> session -> reservation.
  -- FOR KEY SHARE blocks hard delete/key changes without blocking unrelated profile updates.
  p := cafe_private.require_active_profile(p_actor_id);
  PERFORM pg_advisory_xact_lock(hashtextextended('cafe_quota:' || p_actor_id::text, 0));

  SELECT *
    INTO s
    FROM public.cafe_sessions
   WHERE slug = lower(trim(p_slug))
   FOR NO KEY UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'session_unavailable');
  END IF;

  SELECT *
    INTO r
    FROM public.cafe_reservations
   WHERE session_id = s.id
     AND profile_id = p_actor_id
   FOR UPDATE;

  IF FOUND THEN
    current_version := r.version;
    IF r.last_request_id = p_request_id THEN
      IF r.last_action = p_action AND r.last_expected_version = p_expected_version THEN
        RETURN jsonb_build_object(
          'ok', true,
          'replay', true,
          'status', r.status,
          'version', r.version,
          'session_status', s.status
        );
      END IF;
      RETURN jsonb_build_object('ok', false, 'code', 'request_id_reused', 'version', r.version);
    END IF;
  END IF;

  IF current_version <> p_expected_version THEN
    RETURN jsonb_build_object('ok', false, 'code', 'version_conflict', 'version', current_version);
  END IF;

  decision_time := clock_timestamp();
  next_version := current_version + 1;

  IF p_action = 'reserve' THEN
    IF s.status <> 'published' OR s.starts_at <= decision_time THEN
      RETURN jsonb_build_object('ok', false, 'code', 'session_unavailable', 'version', current_version);
    END IF;

    IF FOUND AND r.status = 'confirmed' THEN
      UPDATE public.cafe_reservations
         SET version = next_version,
             last_request_id = p_request_id,
             last_action = p_action,
             last_expected_version = p_expected_version,
             updated_at = decision_time
       WHERE id = r.id
       RETURNING * INTO r;

      RETURN jsonb_build_object('ok', true, 'status', r.status, 'version', r.version, 'replay', false);
    END IF;

    SELECT count(*)::bigint
      INTO session_confirmed
      FROM public.cafe_reservations cr
     WHERE cr.session_id = s.id
       AND cr.status = 'confirmed';

    IF session_confirmed >= s.max_participants THEN
      RETURN jsonb_build_object('ok', false, 'code', 'capacity_full', 'version', current_version);
    END IF;

    SELECT count(*)::bigint
      INTO upcoming_confirmed
      FROM public.cafe_reservations cr
      JOIN public.cafe_sessions cs ON cs.id = cr.session_id
     WHERE cr.profile_id = p_actor_id
       AND cr.status = 'confirmed'
       AND cs.status = 'published'
       AND cs.starts_at > decision_time;

    IF upcoming_confirmed >= 3 THEN
      RETURN jsonb_build_object('ok', false, 'code', 'reservation_limit', 'version', current_version);
    END IF;

    INSERT INTO public.cafe_reservations (
      session_id,
      profile_id,
      status,
      version,
      reserved_at,
      cancelled_at,
      last_request_id,
      last_action,
      last_expected_version,
      created_at,
      updated_at
    )
    VALUES (
      s.id,
      p_actor_id,
      'confirmed',
      next_version,
      decision_time,
      NULL,
      p_request_id,
      p_action,
      p_expected_version,
      decision_time,
      decision_time
    )
    ON CONFLICT (session_id, profile_id)
    DO UPDATE SET
      status = 'confirmed',
      version = EXCLUDED.version,
      reserved_at = EXCLUDED.reserved_at,
      cancelled_at = NULL,
      last_request_id = EXCLUDED.last_request_id,
      last_action = EXCLUDED.last_action,
      last_expected_version = EXCLUDED.last_expected_version,
      updated_at = EXCLUDED.updated_at
    RETURNING * INTO r;

    RETURN jsonb_build_object('ok', true, 'status', r.status, 'version', r.version, 'replay', false);
  END IF;

  -- cancel
  IF FOUND THEN
    IF r.status = 'cancelled' THEN
      UPDATE public.cafe_reservations
         SET version = next_version,
             last_request_id = p_request_id,
             last_action = p_action,
             last_expected_version = p_expected_version,
             updated_at = decision_time
       WHERE id = r.id
       RETURNING * INTO r;

      RETURN jsonb_build_object('ok', true, 'status', r.status, 'version', r.version, 'replay', false);
    END IF;

    IF s.status <> 'cancelled'
       AND (s.status <> 'published' OR decision_time >= s.starts_at) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'session_unavailable', 'version', current_version);
    END IF;

    UPDATE public.cafe_reservations
       SET status = 'cancelled',
           version = next_version,
           cancelled_at = decision_time,
           last_request_id = p_request_id,
           last_action = p_action,
           last_expected_version = p_expected_version,
           updated_at = decision_time
     WHERE id = r.id
     RETURNING * INTO r;

    RETURN jsonb_build_object('ok', true, 'status', r.status, 'version', r.version, 'replay', false);
  END IF;

  IF s.status <> 'published' OR decision_time >= s.starts_at THEN
    RETURN jsonb_build_object('ok', false, 'code', 'session_unavailable', 'version', 0);
  END IF;

  INSERT INTO public.cafe_reservations (
    session_id,
    profile_id,
    status,
    version,
    reserved_at,
    cancelled_at,
    last_request_id,
    last_action,
    last_expected_version,
    created_at,
    updated_at
  )
  VALUES (
    s.id,
    p_actor_id,
    'cancelled',
    1,
    NULL,
    decision_time,
    p_request_id,
    p_action,
    0,
    decision_time,
    decision_time
  )
  RETURNING * INTO r;

  RETURN jsonb_build_object('ok', true, 'status', r.status, 'version', r.version, 'replay', false);
END
$$;

REVOKE ALL ON FUNCTION public.cafe_set_reservation_server(uuid,text,text,bigint,uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cafe_set_reservation_server(uuid,text,text,bigint,uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.cafe_admin_create_draft_server(
  p_actor_id uuid,
  p_slug text,
  p_title text,
  p_primary_language text,
  p_practice_language text,
  p_level text,
  p_starts_at timestamptz,
  p_duration_minutes integer,
  p_max_participants integer,
  p_host_profile_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  s public.cafe_sessions%ROWTYPE;
BEGIN
  PERFORM cafe_private.require_admin(p_actor_id);

  IF p_host_profile_id IS NOT NULL
     AND NOT cafe_private.host_is_eligible(p_host_profile_id) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'host_unavailable');
  END IF;

  INSERT INTO public.cafe_sessions (
    slug, title, primary_language, practice_language, level,
    starts_at, duration_minutes, max_participants, status,
    host_profile_id, created_by_profile_id
  )
  VALUES (
    p_slug, p_title, p_primary_language, p_practice_language, p_level,
    p_starts_at, p_duration_minutes, p_max_participants, 'draft',
    p_host_profile_id, p_actor_id
  )
  RETURNING * INTO s;

  RETURN jsonb_build_object('ok', true, 'slug', s.slug, 'status', s.status);
END
$$;

CREATE OR REPLACE FUNCTION public.cafe_admin_publish_server(p_actor_id uuid, p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  s public.cafe_sessions%ROWTYPE;
BEGIN
  PERFORM cafe_private.require_admin(p_actor_id);

  SELECT * INTO s
    FROM public.cafe_sessions
   WHERE slug = lower(trim(p_slug))
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;
  IF s.status <> 'draft' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_state');
  END IF;

  UPDATE public.cafe_sessions
     SET status = 'published'
   WHERE id = s.id
   RETURNING * INTO s;

  RETURN jsonb_build_object('ok', true, 'slug', s.slug, 'status', s.status);
END
$$;

CREATE OR REPLACE FUNCTION public.cafe_admin_reassign_host_server(
  p_actor_id uuid,
  p_slug text,
  p_host_profile_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $cafe_host$
DECLARE
  s public.cafe_sessions%ROWTYPE;
BEGIN
  PERFORM cafe_private.require_admin(p_actor_id);

  IF p_host_profile_id IS NULL
     OR NOT cafe_private.host_is_eligible(p_host_profile_id) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'host_unavailable');
  END IF;

  SELECT * INTO s
    FROM public.cafe_sessions
   WHERE slug = lower(trim(p_slug))
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;
  IF s.status = 'cancelled'
     OR (s.status = 'published' AND s.starts_at + s.duration_minutes * interval '1 minute' <= clock_timestamp()) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_state');
  END IF;

  UPDATE public.cafe_sessions
     SET host_profile_id = p_host_profile_id
   WHERE id = s.id
   RETURNING * INTO s;

  RETURN jsonb_build_object('ok', true, 'slug', s.slug, 'status', s.status);
END
$cafe_host$;

CREATE OR REPLACE FUNCTION public.cafe_admin_cancel_server(p_actor_id uuid, p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  s public.cafe_sessions%ROWTYPE;
BEGIN
  PERFORM cafe_private.require_admin(p_actor_id);

  SELECT * INTO s
    FROM public.cafe_sessions
   WHERE slug = lower(trim(p_slug))
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;
  IF s.status = 'cancelled' THEN
    RETURN jsonb_build_object('ok', true, 'slug', s.slug, 'status', s.status, 'replay', true);
  END IF;

  UPDATE public.cafe_sessions
     SET status = 'cancelled'
   WHERE id = s.id
   RETURNING * INTO s;

  RETURN jsonb_build_object('ok', true, 'slug', s.slug, 'status', s.status, 'replay', false);
END
$$;

REVOKE ALL ON FUNCTION public.cafe_admin_create_draft_server(uuid,text,text,text,text,text,timestamptz,integer,integer,uuid)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.cafe_admin_publish_server(uuid,text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.cafe_admin_cancel_server(uuid,text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.cafe_admin_reassign_host_server(uuid,text,uuid)
  FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.cafe_admin_create_draft_server(uuid,text,text,text,text,text,timestamptz,integer,integer,uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.cafe_admin_publish_server(uuid,text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.cafe_admin_cancel_server(uuid,text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.cafe_admin_reassign_host_server(uuid,text,uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION cafe_private.handle_profile_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  target_id uuid;
  should_purge boolean := false;
  decision_time timestamptz;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_id := OLD.id;
    should_purge := true;
  ELSE
    target_id := NEW.id;
    should_purge :=
      (COALESCE(OLD.is_active, true) = true AND COALESCE(NEW.is_active, true) = false)
      OR (OLD.deletion_requested_at IS NULL AND NEW.deletion_requested_at IS NOT NULL)
      OR (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL);
  END IF;

  IF should_purge THEN
    PERFORM set_config('lock_timeout', '3s', true);
    PERFORM pg_advisory_xact_lock(hashtextextended('cafe_quota:' || target_id::text, 0));
    decision_time := clock_timestamp();

    UPDATE public.cafe_sessions
       SET status = 'cancelled',
           host_profile_id = NULL,
           cancelled_at = COALESCE(cancelled_at, decision_time),
           updated_at = decision_time
     WHERE host_profile_id = target_id
       AND status = 'published'
       AND starts_at + duration_minutes * interval '1 minute' > decision_time;

    UPDATE public.cafe_sessions
       SET host_profile_id = NULL,
           updated_at = decision_time
     WHERE host_profile_id = target_id;

    UPDATE public.cafe_sessions
       SET created_by_profile_id = NULL,
           updated_at = decision_time
     WHERE created_by_profile_id = target_id;

    DELETE FROM public.cafe_reservations
     WHERE profile_id = target_id;
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END
$$;

REVOKE ALL ON FUNCTION cafe_private.handle_profile_removal() FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER cafe_profiles_cleanup_on_update
AFTER UPDATE OF is_active, deletion_requested_at, deleted_at ON public.profiles
FOR EACH ROW EXECUTE FUNCTION cafe_private.handle_profile_removal();

CREATE TRIGGER cafe_profiles_cleanup_before_delete
BEFORE DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION cafe_private.handle_profile_removal();

NOTIFY pgrst, 'reload schema';
