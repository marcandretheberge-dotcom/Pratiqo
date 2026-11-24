-- Daily activity is read from the existing append-only ledger. No streaks,
-- client-supplied minutes, mutable rollups or teacher-facing access.
CREATE TABLE IF NOT EXISTS public.yo_daily_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  timezone text NOT NULL,
  goal integer CHECK (goal IS NULL OR goal BETWEEN 1 AND 50)
);
CREATE TABLE IF NOT EXISTS public.yo_daily_completions (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  kind text NOT NULL CHECK (kind IN ('mission', 'trivia')),
  item_id text NOT NULL,
  artifact_id text CHECK (artifact_id IS NULL OR (kind = 'mission' AND artifact_id ~ '^artifact-it-u(0[1-9]|1[0-2])$')),
  PRIMARY KEY (user_id, day, kind)
);
CREATE TABLE IF NOT EXISTS public.yo_daily_artifacts (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artifact_id text NOT NULL CHECK (artifact_id ~ '^artifact-it-u(0[1-9]|1[0-2])$'),
  PRIMARY KEY (user_id, artifact_id)
);
ALTER TABLE public.yo_daily_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yo_daily_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yo_daily_artifacts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.yo_daily_preferences, public.yo_daily_completions, public.yo_daily_artifacts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.yo_daily_preferences TO service_role;
GRANT SELECT, INSERT ON public.yo_daily_completions, public.yo_daily_artifacts TO service_role;

CREATE OR REPLACE FUNCTION public.yo_daily_zone(p_user_id uuid, p_timezone text)
RETURNS text LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT COALESCE(
    (SELECT timezone FROM public.yo_daily_preferences WHERE user_id = p_user_id),
    (SELECT name FROM pg_catalog.pg_timezone_names WHERE name = p_timezone),
    'America/Toronto'
  )
$$;

CREATE OR REPLACE FUNCTION public.yo_daily_read(p_user_id uuid, p_timezone text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  WITH zone AS (
    SELECT public.yo_daily_zone(p_user_id, p_timezone) AS tz
  ), calendar AS (
    SELECT (now() AT TIME ZONE tz)::date AS day, tz FROM zone
  ), activity AS (
    SELECT count(DISTINCT e.item_id) FILTER (WHERE e.event_type = 'srs_practice') AS exercises,
           COALESCE(sum(e.xp), 0) AS xp
    FROM public.yo_learning_events e CROSS JOIN calendar c
    WHERE e.user_id = p_user_id
      AND e.created_at >= (c.day::timestamp AT TIME ZONE c.tz)
      AND e.created_at < ((c.day + 1)::timestamp AT TIME ZONE c.tz)
  )
  SELECT jsonb_build_object(
    'today', c.day, 'exercises', a.exercises, 'xpToday', a.xp,
    'goal', (SELECT goal FROM public.yo_daily_preferences WHERE user_id = p_user_id),
    'completed', COALESCE((SELECT jsonb_object_agg(kind, item_id) FROM public.yo_daily_completions
      WHERE user_id = p_user_id AND day = c.day), '{}'::jsonb),
    'earned', COALESCE((SELECT jsonb_agg(artifact_id ORDER BY artifact_id)
      FROM public.yo_daily_artifacts WHERE user_id = p_user_id), '[]'::jsonb)
  ) FROM calendar c CROSS JOIN activity a
$$;

CREATE OR REPLACE FUNCTION public.yo_daily_set_goal(p_user_id uuid, p_timezone text, p_goal integer)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 93125));
  INSERT INTO public.yo_daily_preferences (user_id, timezone, goal)
  VALUES (p_user_id, public.yo_daily_zone(p_user_id, p_timezone), p_goal)
  ON CONFLICT (user_id) DO UPDATE SET goal = EXCLUDED.goal;
END
$$;

CREATE OR REPLACE FUNCTION public.yo_daily_award(
  p_user_id uuid, p_timezone text, p_day date, p_kind text, p_item_id text, p_artifact_id text
)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  zone text;
  xp integer;
BEGIN
  xp := CASE p_kind WHEN 'mission' THEN 30 WHEN 'trivia' THEN 20 END;
  IF xp IS NULL OR p_day IS NULL OR p_item_id IS NULL OR
    (p_kind = 'mission' AND (p_artifact_id IS NULL OR p_item_id <> replace(p_artifact_id, 'artifact-', 'daily-mission-'))) OR
    (p_kind = 'trivia' AND p_artifact_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Invalid daily reward';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 93125));
  zone := public.yo_daily_zone(p_user_id, p_timezone);
  IF p_day <> (now() AT TIME ZONE zone)::date THEN RETURN 'expired'; END IF;

  INSERT INTO public.yo_daily_preferences (user_id, timezone) VALUES (p_user_id, zone)
    ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.yo_daily_completions (user_id, day, kind, item_id, artifact_id)
    VALUES (p_user_id, p_day, p_kind, p_item_id, p_artifact_id)
    ON CONFLICT (user_id, day, kind) DO NOTHING;
  IF NOT FOUND THEN RETURN 'duplicate'; END IF;

  INSERT INTO public.yo_learning_events (user_id, attempt_id, event_type, xp, item_id)
    VALUES (p_user_id, pg_catalog.gen_random_uuid(), 'daily_' || p_kind, xp, p_item_id);
  IF p_artifact_id IS NOT NULL THEN
    INSERT INTO public.yo_daily_artifacts (user_id, artifact_id) VALUES (p_user_id, p_artifact_id)
      ON CONFLICT (user_id, artifact_id) DO NOTHING;
  END IF;
  RETURN 'awarded';
END
$$;

REVOKE ALL ON FUNCTION public.yo_daily_zone(uuid,text), public.yo_daily_read(uuid,text),
  public.yo_daily_set_goal(uuid,text,integer), public.yo_daily_award(uuid,text,date,text,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.yo_daily_zone(uuid,text), public.yo_daily_read(uuid,text),
  public.yo_daily_set_goal(uuid,text,integer), public.yo_daily_award(uuid,text,date,text,text,text)
  TO service_role;
